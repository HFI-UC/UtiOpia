<?php
declare(strict_types=1);

namespace UtiOpia\Services;

use PDO;

final class AuditLogger
{
    public function __construct(private PDO $pdo)
    {
    }

    public function log(string $action, ?int $userId = null, array $meta = []): void
    {
        $stmt = $this->pdo->prepare('INSERT INTO audit_logs(action, user_id, meta, created_at) VALUES(?,?,?,CURRENT_TIMESTAMP)');
        $stmt->execute([$action, $userId, json_encode($meta, JSON_UNESCAPED_UNICODE)]);
    }
}


