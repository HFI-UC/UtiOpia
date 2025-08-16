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

    public function approveComment(int $commentId, array $actor): array
    {
        $this->acl->ensure($actor['role'], 'comment:approve');
        $this->pdo->prepare('UPDATE message_comments SET status = "approved", reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?')
            ->execute([$actor['id'], $commentId]);
        $this->logger->log('comment.approve', $actor['id'], ['comment_id' => $commentId]);
        // 通知评论作者
        $stmt = $this->pdo->prepare('SELECT c.message_id, c.content, u.email, u.nickname FROM message_comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?');
        $stmt->execute([$commentId]);
        if ($row = $stmt->fetch()) {
            if (!empty($row['email'])) {
                $this->mailer->sendCommentApproved((string)$row['email'], (string)$row['nickname'], (int)$row['message_id'], $commentId, (string)$row['content']);
            }
        }
        return ['ok' => true];
    }

    public function rejectComment(int $commentId, array $actor, string $reason): array
    {
        $this->acl->ensure($actor['role'], 'comment:reject');
        $this->pdo->prepare('UPDATE message_comments SET status = "rejected", reject_reason = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?')
            ->execute([$reason, $actor['id'], $commentId]);
        $this->logger->log('comment.reject', $actor['id'], ['comment_id' => $commentId, 'reason' => $reason]);
        // 通知评论作者
        $stmt = $this->pdo->prepare('SELECT c.message_id, c.content, u.email, u.nickname FROM message_comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?');
        $stmt->execute([$commentId]);
        if ($row = $stmt->fetch()) {
            if (!empty($row['email'])) {
                $this->mailer->sendCommentRejected((string)$row['email'], (string)$row['nickname'], (int)$row['message_id'], $commentId, (string)$row['content'], $reason);
            }
        }
        return ['ok' => true];
    }
}


