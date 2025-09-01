<?php
declare(strict_types=1);

require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/tests/BaseWebTestCase.php';

use Dotenv\Dotenv;
use Slim\Factory\AppFactory;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use UtiOpia\Middleware\ErrorMiddleware as UErrorMiddleware;
use UtiOpia\Middleware\RequestLogMiddleware;

// Load env from phpunit.xml (env vars already set), no .env needed

$container = new \DI\Container();
AppFactory::setContainer($container);
$app = AppFactory::create();
$app->addBodyParsingMiddleware();
$app->addRoutingMiddleware();

// CORS minimal for test
$app->add(function (Request $request, \Psr\Http\Server\RequestHandlerInterface $handler): Response {
    return $handler->handle($request);
});

// Attach error/log middlewares like production
// 先延后注册中间件，待 PDO set 完成后再注册

// Dependencies
$container->set('settings', function () {
    return [
        'db' => [
            'dsn' => sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', getenv('DB_HOST'), getenv('DB_PORT') ?: '3306', getenv('DB_NAME')),
            'user' => getenv('DB_USER'),
            'pass' => getenv('DB_PASS'),
        ],
        'jwt' => [
            'secret' => getenv('JWT_SECRET') ?: 'test_secret',
            'issuer' => 'utiopia',
            'ttl' => 3600,
        ],
        'cos' => [
            'region' => getenv('COS_REGION') ?: '',
            'appId' => getenv('COS_APP_ID') ?: '',
            'secretId' => getenv('COS_SECRET_ID') ?: '',
            'secretKey' => getenv('COS_SECRET_KEY') ?: '',
            'bucket' => getenv('COS_BUCKET') ?: '',
        ],
        'turnstile' => [
            'secret' => getenv('TURNSTILE_SECRET') ?: '',
        ],
    ];
});

$container->set(PDO::class, function ($c) {
    $s = $c->get('settings')['db'];
    try {
        return new PDO($s['dsn'], $s['user'], $s['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    } catch (Throwable $e) {
        if (extension_loaded('pdo_sqlite')) {
            $pdo = new PDO('sqlite::memory:');
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            // minimal schema for tests
            $pdo->exec('CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, password_hash TEXT, nickname TEXT, student_id TEXT, role TEXT, banned INTEGER, created_at TEXT)');
            $pdo->exec('CREATE TABLE messages (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NULL, is_anonymous INTEGER, anon_email TEXT, anon_student_id TEXT, anon_passphrase_hash TEXT, content TEXT, image_url TEXT, status TEXT, reject_reason TEXT, reviewed_by INTEGER, reviewed_at TEXT, created_at TEXT, deleted_at TEXT)');
            $pdo->exec('CREATE TABLE audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT, user_id INTEGER, meta TEXT, created_at TEXT)');
            // 与生产一致：包含 slot 列，并以 (type,value,active,slot) 建唯一约束，便于保留历史
            $pdo->exec('CREATE TABLE bans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT,
                value TEXT,
                reason TEXT,
                created_by INTEGER,
                created_at TEXT,
                updated_at TEXT,
                active INTEGER,
                stage INTEGER,
                expires_at TEXT,
                slot INTEGER NOT NULL DEFAULT 0,
                UNIQUE(type, value, active, slot)
            )');
            $pdo->exec('CREATE TABLE message_likes (id INTEGER PRIMARY KEY AUTOINCREMENT, message_id INTEGER, user_id INTEGER, deleted_at TEXT, created_at TEXT)');
            $pdo->exec('CREATE UNIQUE INDEX uniq_message_user ON message_likes(message_id, user_id)');
            $pdo->exec('CREATE TABLE message_comments (id INTEGER PRIMARY KEY AUTOINCREMENT, message_id INTEGER, user_id INTEGER, is_anonymous INTEGER DEFAULT 0, content TEXT, parent_id INTEGER NULL, root_id INTEGER NULL, status TEXT, reject_reason TEXT, reviewed_by INTEGER, reviewed_at TEXT, deleted_at TEXT, created_at TEXT)');
            // announcements 表（与生产字段一致，移除外键）
            $pdo->exec('CREATE TABLE announcements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                type TEXT NOT NULL DEFAULT "info",
                priority INTEGER NOT NULL DEFAULT 0,
                visible INTEGER NOT NULL DEFAULT 1,
                start_at TEXT NULL,
                end_at TEXT NULL,
                link_url TEXT NULL,
                created_by INTEGER NULL,
                created_at TEXT,
                updated_at TEXT
            )');
            return $pdo;
        }
        throw $e;
    }
});

// Domain services minimal (only what routes need)
$container->set(\UtiOpia\Services\AuditLogger::class, fn($c) => new \UtiOpia\Services\AuditLogger($c->get(PDO::class)));
$container->set(\UtiOpia\Services\ACL::class, fn() => new \UtiOpia\Services\ACL());
$container->set(\UtiOpia\Services\TurnstileService::class, fn($c) => new \UtiOpia\Services\TurnstileService($c->get('settings')));
$container->set(\UtiOpia\Services\COSService::class, fn($c) => new \UtiOpia\Services\COSService($c->get('settings')));
$container->set(\UtiOpia\Services\AuthService::class, function ($c) {
    return new \UtiOpia\Services\AuthService($c->get(PDO::class), $c->get('settings'), $c->get(\UtiOpia\Services\AuditLogger::class), $c->get(\UtiOpia\Services\ACL::class));
});
$container->set(\UtiOpia\Services\MessageService::class, function ($c) {
    return new \UtiOpia\Services\MessageService($c->get(PDO::class), $c->get(\UtiOpia\Services\AuditLogger::class), $c->get(\UtiOpia\Services\ACL::class));
});
// Dummy mailer to avoid network/SMTP in tests
if (!class_exists('DummyMailer')) {
class DummyMailer {
    // 测试桩：忽略所有参数，仅返回 true，避免发真实邮件
    public function __construct() { /* noop in tests */ }
    public function send(): bool { return true; }
    public function sendMessageStatusChange(): bool { return true; }
    public function sendUserRoleChanged(): bool { return true; }
    public function sendUserBanStatus(): bool { return true; }
}
}
$container->set(\UtiOpia\Services\Mailer::class, function ($c) {
    return new \UtiOpia\Services\Mailer($c->get('settings'), $c->get(\UtiOpia\Services\AuditLogger::class));
});
$container->set(\UtiOpia\Services\UserService::class, function ($c) {
    return new \UtiOpia\Services\UserService(
        $c->get(PDO::class),
        $c->get(\UtiOpia\Services\AuditLogger::class),
        $c->get(\UtiOpia\Services\ACL::class),
        $c->get(\UtiOpia\Services\Mailer::class)
    );
});
$container->set(\UtiOpia\Services\ModerationService::class, function ($c) {
    return new \UtiOpia\Services\ModerationService(
        $c->get(PDO::class),
        $c->get(\UtiOpia\Services\AuditLogger::class),
        $c->get(\UtiOpia\Services\ACL::class),
        $c->get(\UtiOpia\Services\Mailer::class)
    );
});
$container->set(\UtiOpia\Services\LogService::class, function ($c) {
    return new \UtiOpia\Services\LogService($c->get(PDO::class), $c->get(\UtiOpia\Services\ACL::class));
});
$container->set(\UtiOpia\Services\StatsService::class, function ($c) {
    return new \UtiOpia\Services\StatsService($c->get(PDO::class), $c->get(\UtiOpia\Services\ACL::class), $c->get('settings'));
});

$container->set(\UtiOpia\Services\LikeService::class, function ($c) {
    return new \UtiOpia\Services\LikeService($c->get(PDO::class), $c->get(\UtiOpia\Services\AuditLogger::class), $c->get(\UtiOpia\Services\ACL::class));
});
$container->set(\UtiOpia\Services\CommentService::class, function ($c) {
    return new \UtiOpia\Services\CommentService($c->get(PDO::class), $c->get(\UtiOpia\Services\AuditLogger::class), $c->get(\UtiOpia\Services\ACL::class));
});
// Announcements
$container->set(\UtiOpia\Services\AnnouncementService::class, function ($c) {
    return new \UtiOpia\Services\AnnouncementService(
        $c->get(PDO::class),
        $c->get(\UtiOpia\Services\ACL::class),
        $c->get(\UtiOpia\Services\AuditLogger::class)
    );
});

\UtiOpia\Routes::register($app);

// After services ready, attach error middleware（测试环境不启用请求日志，减少干扰）
$app->add(new UErrorMiddleware($container->get(\UtiOpia\Services\AuditLogger::class)));

return $app;


