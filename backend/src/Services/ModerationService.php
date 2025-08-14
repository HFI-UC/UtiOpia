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
        $this->pdo->prepare('UPDATE messages SET status = "approved", reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?')
            ->execute([$actor['id'], $messageId]);
        $this->logger->log('message.approve', $actor['id'], ['message_id' => $messageId]);
        // 通知作者（模板：已通过）。若为游客匿名，发送至匿名邮箱
        $stmt = $this->pdo->prepare('SELECT m.is_anonymous, m.anon_email, m.content, u.email, u.nickname FROM messages m LEFT JOIN users u ON m.user_id = u.id WHERE m.id = ?');
        $stmt->execute([$messageId]);
        if ($row = $stmt->fetch()) {
            if ((int)$row['is_anonymous'] === 1 && !empty($row['anon_email'])) {
                $this->mailer->sendMessageApproved((string)$row['anon_email'], '同学', $messageId, (string)$row['content']);
            } else if (!empty($row['email'])) {
                $this->mailer->sendMessageApproved((string)$row['email'], (string)$row['nickname'], $messageId, (string)$row['content']);
            }
        }
        return ['ok' => true];
    }

    public function reject(int $messageId, array $actor, string $reason): array
    {
        $this->acl->ensure($actor['role'], 'message:reject');
        $this->pdo->prepare('UPDATE messages SET status = "rejected", reject_reason = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?')
            ->execute([$reason, $actor['id'], $messageId]);
        $this->logger->log('message.reject', $actor['id'], ['message_id' => $messageId, 'reason' => $reason]);
        // 通知作者（模板：未通过）。若为游客匿名，发送至匿名邮箱
        $stmt = $this->pdo->prepare('SELECT m.is_anonymous, m.anon_email, m.content, u.email, u.nickname FROM messages m LEFT JOIN users u ON m.user_id = u.id WHERE m.id = ?');
        $stmt->execute([$messageId]);
        if ($row = $stmt->fetch()) {
            if ((int)$row['is_anonymous'] === 1 && !empty($row['anon_email'])) {
                $this->mailer->sendMessageRejected((string)$row['anon_email'], '同学', $messageId, (string)$row['content'], $reason);
            } else if (!empty($row['email'])) {
                $this->mailer->sendMessageRejected((string)$row['email'], (string)$row['nickname'], $messageId, (string)$row['content'], $reason);
            }
        }
        return ['ok' => true];
    }
}


