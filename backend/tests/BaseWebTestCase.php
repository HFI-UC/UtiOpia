<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use Firebase\JWT\JWT;
use Slim\App;
use Slim\Psr7\Factory\ServerRequestFactory;
use Psr\Http\Message\ResponseInterface as Response;

abstract class BaseWebTestCase extends TestCase
{
    protected App $app;
    protected ?PDO $pdo = null;

    protected function setUp(): void
    {
        $this->app = require __DIR__ . '/../tests_bootstrap.php';
        // 避免在不需要 DB 的用例中强制连接远程数据库
        $this->pdo = null;
    }

    protected function requestJson(string $method, string $uri, ?array $body = null, array $headers = []): Response
    {
        $factory = new ServerRequestFactory();
        $req = $factory->createServerRequest($method, $uri);
        if ($body !== null) {
            $req = $req->withParsedBody($body)->withHeader('Content-Type', 'application/json');
        }
        foreach ($headers as $k => $v) {
            $req = $req->withHeader($k, $v);
        }
        return $this->app->handle($req);
    }

    protected function json(Response $res): array
    {
        return json_decode((string)$res->getBody(), true) ?: [];
    }

    protected function db(): ?PDO
    {
        if ($this->pdo === null) {
            try { $this->pdo = $this->app->getContainer()->get(PDO::class); } catch (Throwable) { return null; }
        }
        return $this->pdo;
    }

    protected function createUser(string $email, string $password, string $nickname = 'U', string $role = 'user'): array
    {
        $pdo = $this->db();
        $hash = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $pdo->prepare('INSERT INTO users(email, password_hash, nickname, student_id, role, banned, created_at) VALUES(?,?,?,?,?,0,?)');
        $stmt->execute([$email, $hash, $nickname, null, $role, date('Y-m-d H:i:s')]);
        $id = (int)$pdo->lastInsertId();
        return ['id' => $id, 'email' => $email, 'password' => $password, 'role' => $role];
    }

    protected function makeToken(int $userId, string $role = 'user'): string
    {
        $now = time();
        $payload = [
            'iss' => 'utiopia',
            'iat' => $now,
            'exp' => $now + 3600,
            'sub' => $userId,
            'role' => $role,
        ];
        $secret = getenv('JWT_SECRET') ?: 'test_secret';
        return JWT::encode($payload, $secret, 'HS256');
    }

    protected function authHeaders(int $userId, string $role = 'user'): array
    {
        return ['Authorization' => 'Bearer ' . $this->makeToken($userId, $role)];
    }
}


