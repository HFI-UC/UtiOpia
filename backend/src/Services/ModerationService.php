<?php
declare(strict_types=1);

namespace UtiOpia\Services;

use PDO;

final class ModerationService
{
    public function __construct(private PDO $pdo, private AuditLogger $logger, private ACL $acl, private Mailer $mailer)
    {
    }

    public function approve(int $messageId, array $actor): array
    {
        $this->acl->ensure($actor['role'], 'message:approve');
        $this->pdo->prepare('UPDATE messages SET status = "approved", reviewed_by = ?, reviewed_at = NOW() WHERE id = ?')
            ->execute([$actor['id'], $messageId]);
        $this->logger->log('message.approve', $actor['id'], ['message_id' => $messageId]);
        // 通知作者
        $stmt = $this->pdo->prepare('SELECT u.email, u.nickname FROM messages m JOIN users u ON m.user_id = u.id WHERE m.id = ?');
        $stmt->execute([$messageId]);
        if ($u = $stmt->fetch()) {
            $this->mailer->sendMessageStatusChange($u['email'], $u['nickname'], $messageId, 'approved');
        }
        return ['ok' => true];
    }

    public function reject(int $messageId, array $actor, string $reason): array
    {
        $this->acl->ensure($actor['role'], 'message:reject');
        $this->pdo->prepare('UPDATE messages SET status = "rejected", reject_reason = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?')
            ->execute([$reason, $actor['id'], $messageId]);
        $this->logger->log('message.reject', $actor['id'], ['message_id' => $messageId, 'reason' => $reason]);
        // 通知作者
        $stmt = $this->pdo->prepare('SELECT u.email, u.nickname FROM messages m JOIN users u ON m.user_id = u.id WHERE m.id = ?');
        $stmt->execute([$messageId]);
        if ($u = $stmt->fetch()) {
            $this->mailer->sendMessageStatusChange($u['email'], $u['nickname'], $messageId, 'rejected', $reason);
        }
        return ['ok' => true];
    }
}


