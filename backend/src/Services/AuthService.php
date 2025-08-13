<?php
declare(strict_types=1);

namespace UtiOpia\Services;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use PDO;
use Psr\Http\Message\ServerRequestInterface as Request;
use Respect\Validation\Validator as v;

final class AuthService
{
    public function __construct(
        private PDO $pdo,
        private array $settings,
        private AuditLogger $logger,
        private ACL $acl,
    ) {}

    public function register(array $data): array
    {
        $email = trim((string)($data['email'] ?? ''));
        $password = (string)($data['password'] ?? '');
        $nickname = trim((string)($data['nickname'] ?? ''));
        v::email()->assert($email);
        // 限制注册邮箱规则： /^[a-z]+\.[a-z]+20\d{2}@gdhfi\.com$/
        if (!preg_match('/^[a-z]+\.[a-z]+20\d{2}@gdhfi\.com$/', $email)) {
            return ['error' => '邮箱不符合规则'];
        }
        v::stringType()->length(6)->assert($password);
        v::stringType()->length(1, 50)->assert($nickname);

        $stmt = $this->pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            $this->logger->log('auth.register.conflict', null, ['email' => $email]);
            return ['error' => '邮箱已存在'];
        }

        $hash = password_hash($password, PASSWORD_BCRYPT);
        $this->pdo->prepare('INSERT INTO users(email, password_hash, nickname, role, banned, created_at) VALUES(?,?,?,?,?,NOW())')
            ->execute([$email, $hash, $nickname, 'user', 0]);
        $userId = (int)$this->pdo->lastInsertId();
        $this->logger->log('auth.register.success', $userId, ['email' => $email]);
        return ['ok' => true];
    }

    public function login(string $email, string $password): array
    {
        v::email()->assert($email);
        v::stringType()->length(1)->assert($password);
        $stmt = $this->pdo->prepare('SELECT id, email, password_hash, role, banned, nickname FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        if (!$user || !password_verify($password, $user['password_hash'])) {
            $this->logger->log('auth.login.failed', $user['id'] ?? null, ['email' => $email]);
            return ['error' => '邮箱或密码错误'];
        }
        if ((int)$user['banned'] === 1) {
            $this->logger->log('auth.login.banned', (int)$user['id'], []);
            return ['error' => '账号已被封禁'];
        }
        $token = $this->issueToken((int)$user['id'], $user['role']);
        $this->logger->log('auth.login.success', (int)$user['id']);
        return ['token' => $token, 'user' => [
            'id' => (int)$user['id'],
            'email' => $user['email'],
            'role' => $user['role'],
            'nickname' => $user['nickname'],
        ]];
    }

    public function mustUserFromRequest(Request $request): array
    {
        $auth = $request->getHeaderLine('Authorization');
        if (!str_starts_with($auth, 'Bearer ')) {
            throw new \RuntimeException('未授权');
        }
        $jwt = substr($auth, 7);
        $payload = JWT::decode($jwt, new Key($this->settings['jwt']['secret'], 'HS256'));
        return [
            'id' => (int)$payload->sub,
            'role' => (string)$payload->role,
        ];
    }

    private function issueToken(int $userId, string $role): string
    {
        $now = time();
        $payload = [
            'iss' => $this->settings['jwt']['issuer'],
            'iat' => $now,
            'exp' => $now + (int)$this->settings['jwt']['ttl'],
            'sub' => $userId,
            'role' => $role,
        ];
        return JWT::encode($payload, $this->settings['jwt']['secret'], 'HS256');
    }

    public function getUser(int $userId): array
    {
        $stmt = $this->pdo->prepare('SELECT id, email, nickname, role, banned, created_at FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        if (!$row) {
            throw new \RuntimeException('用户不存在');
        }
        return [
            'id' => (int)$row['id'],
            'email' => $row['email'],
            'nickname' => $row['nickname'],
            'role' => $row['role'],
            'banned' => (int)$row['banned'] === 1,
            'created_at' => $row['created_at'],
        ];
    }
}


