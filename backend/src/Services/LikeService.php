<?php
declare(strict_types=1);

namespace UtiOpia\Services;

use PDO;

final class LikeService
{
    public function __construct(private PDO $pdo, private AuditLogger $logger, private ACL $acl)
    {
    }

    public function toggle(int $messageId, array $actor): array
    {
        $this->acl->ensure($actor['role'] ?? 'user', 'like:toggle');
        $userId = (int)($actor['id'] ?? 0);
        if ($userId <= 0) return ['error' => '请先登录'];
        // 确保消息存在且可见
        $stmt = $this->pdo->prepare('SELECT id FROM messages WHERE id = ? AND deleted_at IS NULL');
        $stmt->execute([$messageId]);
        if (!$stmt->fetch()) return ['error' => '纸条不存在'];

        $stmt = $this->pdo->prepare('SELECT id, deleted_at FROM message_likes WHERE message_id = ? AND user_id = ?');
        $stmt->execute([$messageId, $userId]);
        $row = $stmt->fetch();
        if ($row && $row['deleted_at'] === null) {
            // 取消点赞
            $this->pdo->prepare('UPDATE message_likes SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?')->execute([$row['id']]);
            $this->logger->log('like.remove', $userId, ['message_id' => $messageId]);
            return ['ok' => true, 'liked' => false];
        }
        if ($row && $row['deleted_at'] !== null) {
            // 恢复点赞
            $this->pdo->prepare('UPDATE message_likes SET deleted_at = NULL WHERE id = ?')->execute([$row['id']]);
        } else {
            $this->pdo->prepare('INSERT INTO message_likes(message_id, user_id, created_at) VALUES(?,?,CURRENT_TIMESTAMP)')
                ->execute([$messageId, $userId]);
        }
        $this->logger->log('like.add', $userId, ['message_id' => $messageId]);
        return ['ok' => true, 'liked' => true];
    }
}



