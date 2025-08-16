<?php
declare(strict_types=1);

namespace UtiOpia\Services;

use PDO;
use Respect\Validation\Validator as v;

final class CommentService
{
    public function __construct(private PDO $pdo, private AuditLogger $logger, private ACL $acl)
    {
    }

    public function listForMessage(int $messageId, array $viewer, array $query): array
    {
        $page = max(1, (int)($query['page'] ?? 1));
        $pageSize = min(100, max(1, (int)($query['pageSize'] ?? 20)));
        $offset = ($page - 1) * $pageSize;
        $canModerate = false;
        try { $this->acl->ensure($viewer['role'] ?? 'user', 'comment:approve'); $canModerate = true; } catch (\Throwable) {}
        $where = 'c.message_id = :mid AND c.deleted_at IS NULL';
        if (!$canModerate) {
            $where .= ' AND c.status = "approved"';
        }
        $sql = 'SELECT SQL_CALC_FOUND_ROWS c.id, c.message_id, c.user_id, c.content, c.parent_id, c.root_id, c.status, c.created_at, c.reviewed_at, c.reviewed_by FROM message_comments c WHERE ' . $where . ' ORDER BY COALESCE(c.root_id, c.id) ASC, c.id ASC LIMIT :limit OFFSET :offset';
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':mid', $messageId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $pageSize, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $items = $stmt->fetchAll();
        $total = (int)$this->pdo->query('SELECT FOUND_ROWS()')->fetchColumn();
        return ['items' => $items, 'total' => $total, 'page' => $page, 'pageSize' => $pageSize];
    }

    public function create(int $messageId, int $userId, array $data): array
    {
        $this->acl->ensure('user', 'comment:create');
        $stmt = $this->pdo->prepare('SELECT id, status, deleted_at FROM messages WHERE id = ?');
        $stmt->execute([$messageId]);
        $msg = $stmt->fetch();
        if (!$msg || $msg['deleted_at'] !== null) return ['error' => '纸条不存在'];
        $content = trim((string)($data['content'] ?? ''));
        v::stringType()->length(1, 1000)->assert($content);
        $parentId = (int)($data['parent_id'] ?? 0);
        $rootId = null;
        if ($parentId > 0) {
            $ps = $this->pdo->prepare('SELECT id, root_id FROM message_comments WHERE id = ? AND message_id = ? AND deleted_at IS NULL');
            $ps->execute([$parentId, $messageId]);
            $parent = $ps->fetch();
            if (!$parent) return ['error' => '父评论不存在'];
            $rootId = (int)($parent['root_id'] ?? 0);
            if ($rootId <= 0) { $rootId = $parentId; }
        }
        // 评论默认直接展示（approved）
        $stmt = $this->pdo->prepare('INSERT INTO message_comments(message_id, user_id, content, parent_id, root_id, status, created_at) VALUES(?,?,?,?,?,"approved",CURRENT_TIMESTAMP)');
        $stmt->execute([$messageId, $userId, $content, $parentId > 0 ? $parentId : null, $rootId]);
        $id = (int)$this->pdo->lastInsertId();
        $this->logger->log('comment.create', $userId, ['message_id' => $messageId, 'comment_id' => $id]);
        return ['ok' => true, 'id' => $id];
    }

    public function delete(int $commentId, array $actor): array
    {
        $this->acl->ensure($actor['role'], 'comment:delete:own');
        $stmt = $this->pdo->prepare('SELECT id, user_id FROM message_comments WHERE id = ?');
        $stmt->execute([$commentId]);
        $row = $stmt->fetch();
        if (!$row) return ['error' => '评论不存在'];
        if ((int)$row['user_id'] !== (int)$actor['id']) return ['error' => '只能删除自己的评论'];
        $this->pdo->prepare('UPDATE message_comments SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?')->execute([$commentId]);
        $this->logger->log('comment.delete', (int)$actor['id'], ['comment_id' => $commentId]);
        return ['ok' => true];
    }
}



