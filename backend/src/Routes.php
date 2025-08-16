<?php
declare(strict_types=1);

namespace UtiOpia;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;
use Psr\Container\ContainerInterface;
use UtiOpia\Services\AuthService;
use UtiOpia\Services\TurnstileService;
use UtiOpia\Services\COSService;
use UtiOpia\Services\ACL;
use UtiOpia\Services\AuditLogger;

final class Routes
{
    private static ContainerInterface $container;
    public static function register(App $app): void
    {
        self::$container = $app->getContainer();
        $app->get('/health', function (Request $request, Response $response) {
            $response->getBody()->write(json_encode(['ok' => true, 'ts' => time()]));
            return $response->withHeader('Content-Type', 'application/json');
        });

        $app->group('/api', function (RouteCollectorProxy $group) {
            // Auth
            $group->post('/register', [self::class, 'registerUser']);
            $group->post('/login', [self::class, 'login']);
            $group->get('/me', [self::class, 'me']);

            // Presigned URL
            $group->post('/upload/presign', [self::class, 'presignUpload']) ;
            $group->post('/upload/sts', [self::class, 'stsUpload']) ;

            // Messages
            $group->get('/messages', [self::class, 'listMessages']);
            $group->post('/messages', [self::class, 'createMessage']);
            $group->put('/messages/{id}', [self::class, 'updateMessage']);
            $group->delete('/messages/{id}', [self::class, 'deleteMessage']);

            // Likes
            $group->post('/messages/{id}/like', [self::class, 'toggleLike']);

            // Comments
            $group->get('/messages/{id}/comments', [self::class, 'listComments']);
            $group->post('/messages/{id}/comments', [self::class, 'createComment']);
            $group->delete('/comments/{id}', [self::class, 'deleteComment']);

            // Admin: users
            $group->get('/users', [self::class, 'listUsers']);
            $group->put('/users/{id}', [self::class, 'updateUser']);
            $group->post('/users/{id}/ban', [self::class, 'banUser']);
            $group->post('/users/{id}/unban', [self::class, 'unbanUser']);

            // Admin: anonymous bans by email/student_id
            $group->post('/bans', [self::class, 'createBan']);
            $group->delete('/bans', [self::class, 'removeBan']);
            $group->get('/bans', [self::class, 'listBans']);

            // Moderation
            $group->post('/messages/{id}/approve', [self::class, 'approveMessage']);
            $group->post('/messages/{id}/reject', [self::class, 'rejectMessage']);
            $group->post('/comments/{id}/approve', [self::class, 'approveComment']);
            $group->post('/comments/{id}/reject', [self::class, 'rejectComment']);

            // Audit logs
            $group->get('/logs', [self::class, 'listLogs']);
            // Stats
            $group->get('/stats/overview', [self::class, 'statsOverview']);
            $group->get('/stats/messages', [self::class, 'statsMessagesSeries']);
            $group->get('/stats/audit', [self::class, 'statsAuditSeries']);
            $group->get('/stats/users', [self::class, 'statsUsersSeries']);
            // Public counts (no auth)
            $group->get('/stats/public-counts', [self::class, 'publicCounts']);

            // Admin utilities (read-oriented; guarded by audit:read)
            $group->get('/admin/settings', [self::class, 'adminSettings']);
            $group->post('/admin/report', [self::class, 'adminExportReport']);
            $group->post('/admin/maintenance/cleanup', [self::class, 'adminMaintenanceCleanup']);
        });
    }

    // Handlers (thin). Business logic in services
    public static function registerUser(Request $request, Response $response): Response
    {
        [$body, $container] = self::ctx($request);
        /** @var TurnstileService $turnstile */
        $turnstile = $container->get(TurnstileService::class);
        $turnstile->assert($body['turnstile_token'] ?? '');

        /** @var AuthService $auth */
        $auth = $container->get(AuthService::class);
        $result = $auth->register($body);
        return self::json($response, $result);
    }

    public static function login(Request $request, Response $response): Response
    {
        [$body, $container] = self::ctx($request);
        /** @var TurnstileService $turnstile */
        $turnstile = $container->get(TurnstileService::class);
        $turnstile->assert($body['turnstile_token'] ?? '');

        /** @var AuthService $auth */
        $auth = $container->get(AuthService::class);
        $result = $auth->login($body['email'] ?? '', $body['password'] ?? '');
        return self::json($response, $result);
    }

    public static function me(Request $request, Response $response): Response
    {
        [, $container, $user] = self::ctxAuth($request);
        /** @var AuthService $auth */
        $auth = $container->get(AuthService::class);
        $detail = $auth->getUser((int)$user['id']);
        return self::json($response, ['user' => $detail]);
    }

    public static function presignUpload(Request $request, Response $response): Response
    {
        [$body, $container, $user] = self::ctxAuthOptional($request);

        /** @var COSService $cos */
        $cos = $container->get(COSService::class);
        $size = (int)($body['size'] ?? 0);
        $max = 5 * 1024 * 1024; // 5MB
        if ($size <= 0) {
            return self::json($response, ['error' => '缺少文件大小']);
        }
        if ($size > $max) {
            return self::json($response, ['error' => '文件过大，最大 5MB']);
        }
        $result = $cos->generatePresignedPutUrl((int)($user['id'] ?? 0), $body['filename'] ?? '', 30);
        $result['max_bytes'] = $max;
        return self::json($response, $result);
    }

    public static function stsUpload(Request $request, Response $response): Response
    {
        [$body, $container, $user] = self::ctxAuthOptional($request);
        $filename = (string)($body['filename'] ?? '');
        $size = (int)($body['size'] ?? 0);
        $max = 5 * 1024 * 1024;
        if ($filename === '') return self::json($response, ['error' => '缺少文件名']);
        if ($size <= 0 || $size > $max) return self::json($response, ['error' => '文件大小不合法']);
        /** @var COSService $cos */
        $cos = $container->get(COSService::class);
        $res = $cos->issueTempCredentials((int)($user['id'] ?? 0), $filename, $max);
        return self::json($response, $res);
    }

    public static function listMessages(Request $request, Response $response): Response
    {
        [$query, $container, $user] = self::ctxAuthOptional($request, true);
        $svc = $container->get(\UtiOpia\Services\MessageService::class);
        $result = $svc->list($query, $user);
        return self::json($response, $result);
    }

    public static function createMessage(Request $request, Response $response): Response
    {
        [$body, $container, $user] = self::ctxAuthOptional($request);
        /** @var TurnstileService $turnstile */
        $turnstile = $container->get(TurnstileService::class);
        $turnstile->assert($body['turnstile_token'] ?? '');

        $svc = $container->get(\UtiOpia\Services\MessageService::class);
        $result = $svc->create((int)($user['id'] ?? 0), $body);
        return self::json($response, $result);
    }

    public static function updateMessage(Request $request, Response $response, array $args): Response
    {
        [$body, $container, $user] = self::ctxAuthOptional($request);
        /** @var TurnstileService $turnstile */
        $turnstile = $container->get(TurnstileService::class);
        $turnstile->assert($body['turnstile_token'] ?? '');
        $svc = $container->get(\UtiOpia\Services\MessageService::class);
        try {
            $result = $svc->update((int)$args['id'], $user, $body);
            return self::json($response, $result);
        } catch (\Throwable $e) {
            return self::json($response, ['error' => $e->getMessage()], 403);
        }
    }

    public static function deleteMessage(Request $request, Response $response, array $args): Response
    {
        [$body, $container, $user] = self::ctxAuthOptional($request);
        /** @var TurnstileService $turnstile */
        $turnstile = $container->get(TurnstileService::class);
        $turnstile->assert($body['turnstile_token'] ?? '');
        $svc = $container->get(\UtiOpia\Services\MessageService::class);
        try {
            $result = $svc->delete((int)$args['id'], $user, $body);
            return self::json($response, $result);
        } catch (\Throwable $e) {
            return self::json($response, ['error' => $e->getMessage()], 403);
        }
    }

    public static function toggleLike(Request $request, Response $response, array $args): Response
    {
        [, $container, $user] = self::ctxAuth($request);
        $svc = $container->get(\UtiOpia\Services\LikeService::class);
        $result = $svc->toggle((int)$args['id'], $user);
        return self::json($response, $result);
    }

    public static function listComments(Request $request, Response $response, array $args): Response
    {
        [$query, $container, $user] = self::ctxAuthOptional($request, true);
        $svc = $container->get(\UtiOpia\Services\CommentService::class);
        $result = $svc->listForMessage((int)$args['id'], $user, $query);
        return self::json($response, $result);
    }

    public static function createComment(Request $request, Response $response, array $args): Response
    {
        [$body, $container, $user] = self::ctxAuth($request);
        $svc = $container->get(\UtiOpia\Services\CommentService::class);
        $result = $svc->create((int)$args['id'], (int)$user['id'], $body);
        return self::json($response, $result);
    }

    public static function deleteComment(Request $request, Response $response, array $args): Response
    {
        [, $container, $user] = self::ctxAuth($request);
        $svc = $container->get(\UtiOpia\Services\CommentService::class);
        $result = $svc->delete((int)$args['id'], $user);
        return self::json($response, $result);
    }

    public static function listUsers(Request $request, Response $response): Response
    {
        [, $container, $user] = self::ctxAuth($request);
        try {
            $svc = $container->get(\UtiOpia\Services\UserService::class);
            $result = $svc->list($user);
            return self::json($response, $result);
        } catch (\Throwable $e) {
            $msg = $e->getMessage();
            $code = $msg === '权限不足' ? 403 : 400;
            return self::json($response, ['error' => $msg], $code);
        }
    }

    public static function updateUser(Request $request, Response $response, array $args): Response
    {
        [$body, $container, $user] = self::ctxAuthOptional($request);
        try {
            $svc = $container->get(\UtiOpia\Services\UserService::class);
            $result = $svc->update((int)$args['id'], $user, $body);
            return self::json($response, $result);
        } catch (\Throwable $e) {
            $msg = $e->getMessage();
            $code = $msg === '权限不足' ? 403 : 400;
            return self::json($response, ['error' => $msg], $code);
        }
    }

    public static function banUser(Request $request, Response $response, array $args): Response
    {
        [$body, $container, $user] = self::ctxAuthOptional($request);
        try {
            $svc = $container->get(\UtiOpia\Services\UserService::class);
            $result = $svc->ban((int)$args['id'], $user);
            return self::json($response, $result);
        } catch (\Throwable $e) {
            $msg = $e->getMessage();
            $code = $msg === '权限不足' ? 403 : 400;
            return self::json($response, ['error' => $msg], $code);
        }
    }

    public static function unbanUser(Request $request, Response $response, array $args): Response
    {
        [$body, $container, $user] = self::ctxAuthOptional($request);
        try {
            $svc = $container->get(\UtiOpia\Services\UserService::class);
            $result = $svc->unban((int)$args['id'], $user);
            return self::json($response, $result);
        } catch (\Throwable $e) {
            $msg = $e->getMessage();
            $code = $msg === '权限不足' ? 403 : 400;
            return self::json($response, ['error' => $msg], $code);
        }
    }

    public static function createBan(Request $request, Response $response): Response
    {
        [$body, $container, $user] = self::ctxAuth($request);
        $svc = $container->get(\UtiOpia\Services\UserService::class);
        $result = $svc->createBan($user, (string)($body['type'] ?? ''), (string)($body['value'] ?? ''), (string)($body['reason'] ?? ''));
        return self::json($response, $result);
    }

    public static function removeBan(Request $request, Response $response): Response
    {
        [$body, $container, $user] = self::ctxAuth($request);
        $svc = $container->get(\UtiOpia\Services\UserService::class);
        $result = $svc->removeBan($user, (string)($body['type'] ?? ''), (string)($body['value'] ?? ''));
        return self::json($response, $result);
    }

    public static function listBans(Request $request, Response $response): Response
    {
        [, $container, $user] = self::ctxAuth($request);
        $svc = $container->get(\UtiOpia\Services\UserService::class);
        $result = $svc->listBans($user);
        return self::json($response, $result);
    }

    public static function approveMessage(Request $request, Response $response, array $args): Response
    {
        [$body, $container, $user] = self::ctxAuth($request);
        $svc = $container->get(\UtiOpia\Services\ModerationService::class);
        $result = $svc->approve((int)$args['id'], $user);
        return self::json($response, $result);
    }

    public static function rejectMessage(Request $request, Response $response, array $args): Response
    {
        [$body, $container, $user] = self::ctxAuth($request);
        $svc = $container->get(\UtiOpia\Services\ModerationService::class);
        $result = $svc->reject((int)$args['id'], $user, $body['reason'] ?? '');
        return self::json($response, $result);
    }

    public static function approveComment(Request $request, Response $response, array $args): Response
    {
        [, $container, $user] = self::ctxAuth($request);
        $svc = $container->get(\UtiOpia\Services\ModerationService::class);
        $result = $svc->approveComment((int)$args['id'], $user);
        return self::json($response, $result);
    }

    public static function rejectComment(Request $request, Response $response, array $args): Response
    {
        [$body, $container, $user] = self::ctxAuth($request);
        $svc = $container->get(\UtiOpia\Services\ModerationService::class);
        $result = $svc->rejectComment((int)$args['id'], $user, (string)($body['reason'] ?? ''));
        return self::json($response, $result);
    }

    public static function listLogs(Request $request, Response $response): Response
    {
        [$query, $container, $user] = self::ctxAuth($request, true);
        $svc = $container->get(\UtiOpia\Services\LogService::class);
        try {
            $result = $svc->list($query, $user);
            return self::json($response, $result);
        } catch (\Throwable $e) {
            return self::json($response, ['error' => '权限不足'], 403);
        }
    }

    public static function statsOverview(Request $request, Response $response): Response
    {
        [, $container, $user] = self::ctxAuth($request);
        $svc = $container->get(\UtiOpia\Services\StatsService::class);
        $result = $svc->overview($user);
        return self::json($response, $result);
    }

    public static function statsMessagesSeries(Request $request, Response $response): Response
    {
        [$query, $container, $user] = self::ctxAuth($request, true);
        $days = (int)($query['days'] ?? 7);
        $svc = $container->get(\UtiOpia\Services\StatsService::class);
        $result = $svc->messagesSeries($user, $days);
        return self::json($response, ['items' => $result]);
    }

    public static function statsAuditSeries(Request $request, Response $response): Response
    {
        [$query, $container, $user] = self::ctxAuth($request, true);
        $days = (int)($query['days'] ?? 7);
        $svc = $container->get(\UtiOpia\Services\StatsService::class);
        $result = $svc->auditSeries($user, $days);
        return self::json($response, ['items' => $result]);
    }

    public static function statsUsersSeries(Request $request, Response $response): Response
    {
        [$query, $container, $user] = self::ctxAuth($request, true);
        $days = (int)($query['days'] ?? 7);
        $svc = $container->get(\UtiOpia\Services\StatsService::class);
        $result = $svc->usersSeries($user, $days);
        return self::json($response, ['items' => $result]);
    }

    public static function publicCounts(Request $request, Response $response): Response
    {
        $container = self::$container;
        $svc = $container->get(\UtiOpia\Services\StatsService::class);
        $result = $svc->publicCounts();
        return self::json($response, $result);
    }

    public static function adminSettings(Request $request, Response $response): Response
    {
        [, $container, $user] = self::ctxAuth($request);
        /** @var \UtiOpia\Services\StatsService $stats */
        $stats = $container->get(\UtiOpia\Services\StatsService::class);
        $overview = $stats->overview($user);
        $settings = $container->get('settings');
        // sanitize
        $safe = [
            'site' => $settings['site'] ?? [],
            'smtp' => [
                'host' => $settings['smtp']['host'] ?? '',
                'port' => $settings['smtp']['port'] ?? 0,
                'secure' => $settings['smtp']['secure'] ?? '',
                'from_email' => $settings['smtp']['from_email'] ?? '',
                'from_name' => $settings['smtp']['from_name'] ?? '',
            ],
            'turnstile_configured' => (bool)($overview['info']['turnstile_configured'] ?? false),
            'cos_configured' => (bool)($overview['info']['cos_configured'] ?? false),
        ];
        return self::json($response, ['settings' => $safe, 'overview' => $overview]);
    }

    public static function adminExportReport(Request $request, Response $response): Response
    {
        [, $container, $user] = self::ctxAuth($request);
        /** @var \UtiOpia\Services\StatsService $stats */
        $stats = $container->get(\UtiOpia\Services\StatsService::class);
        $overview = $stats->overview($user);
        $series = $stats->messagesSeries($user, 7);
        $pdo = $container->get(\PDO::class);
        $totalLogs = (int)$pdo->query('SELECT COUNT(*) FROM audit_logs')->fetchColumn();
        $payload = [
            'generated_at' => date('c'),
            'overview' => $overview,
            'messages_series_7d' => $series,
            'logs' => [ 'total' => $totalLogs ],
        ];
        return self::json($response, $payload);
    }

    public static function adminMaintenanceCleanup(Request $request, Response $response): Response
    {
        [, $container, $user] = self::ctxAuth($request);
        // Require audit:read at minimum
        $ok = true;
        try {
            clearstatcache();
            // Vacuum/Optimize lightweight attempt
            /** @var \PDO $pdo */
            $pdo = $container->get(\PDO::class);
            $driver = (string)$pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
            if ($driver === 'sqlite') {
                @$pdo->exec('VACUUM');
            } else if ($driver === 'mysql') {
                // noop; real optimize would need table list and privileges
            }
        } catch (\Throwable) { $ok = false; }
        return self::json($response, ['ok' => $ok]);
    }

    private static function ctx(Request $request, bool $useQuery = false): array
    {
        $container = self::$container;
        $data = $useQuery ? $request->getQueryParams() : (array)($request->getParsedBody() ?? []);
        return [$data, $container];
    }

    private static function ctxAuth(Request $request, bool $useQuery = false): array
    {
        [$data, $container] = self::ctx($request, $useQuery);
        /** @var AuthService $auth */
        $auth = $container->get(AuthService::class);
        $user = $auth->mustUserFromRequest($request);
        return [$data, $container, $user];
    }

    private static function ctxAuthOptional(Request $request, bool $useQuery = false): array
    {
        [$data, $container] = self::ctx($request, $useQuery);
        $user = ['id' => 0, 'role' => 'user'];
        try {
            /** @var AuthService $auth */
            $auth = $container->get(AuthService::class);
            $user = $auth->mustUserFromRequest($request);
        } catch (\Throwable) {
            // guest
        }
        return [$data, $container, $user];
    }

    private static function json(Response $response, array $data, int $code = 200): Response
    {
        $status = $code;
        if (isset($data['error']) && $code === 200) {
            $status = 400;
        }
        $response->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE));
        return $response->withHeader('Content-Type', 'application/json')->withStatus($status);
    }
}


