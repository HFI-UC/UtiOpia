<?php
declare(strict_types=1);

namespace UtiOpia\Services;

use PDO;

final class AnnouncementService
{
    private const PERM_READ = 'announcement:read';
    private const PERM_MANAGE = 'announcement:manage';
    public function __construct(
        private PDO $pdo,
        private ACL $acl,
        private AuditLogger $auditLogger,
    ) {}

    // Public: list visible announcements, optional limit
    public function listPublic(array $query): array
    {
        $now = date('Y-m-d H:i:s');
        $limit = max(1, min(50, (int)($query['limit'] ?? 5)));
        $stmt = $this->pdo->prepare(
            "SELECT id, title, content, type, priority, start_at, end_at, link_url, created_at, updated_at
             FROM announcements
             WHERE visible = 1 AND (start_at IS NULL OR start_at <= ?) AND (end_at IS NULL OR end_at >= ?)
             ORDER BY priority DESC, id DESC
             LIMIT {$limit}"
        );
        $stmt->execute([$now, $now]);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        return ['items' => $items];
    }

    // Admin: list all announcements
    public function listAll(array $user): array
    {
    $this->acl->ensure($user['role'] ?? 'user', self::PERM_READ);
        $stmt = $this->pdo->query("SELECT a.*, u.email AS created_by_email FROM announcements a LEFT JOIN users u ON a.created_by = u.id ORDER BY a.priority DESC, a.id DESC");
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        return ['items' => $items];
    }

    public function create(array $user, array $body): array
    {
    $this->acl->ensure($user['role'] ?? 'user', self::PERM_MANAGE);
        $title = trim((string)($body['title'] ?? ''));
        $content = trim((string)($body['content'] ?? ''));
        if ($title === '' || $content === '') {
            return ['error' => '标题与内容不能为空'];
        }
        $type = (string)($body['type'] ?? 'info');
        $priority = max(0, min(255, (int)($body['priority'] ?? 0)));
    $visible = (int)(bool)($body['visible'] ?? 1);
        $startAt = (string)($body['start_at'] ?? '');
        $endAt = (string)($body['end_at'] ?? '');
        $link = (string)($body['link_url'] ?? '');

    $stmt = $this->pdo->prepare('INSERT INTO announcements(title, content, type, priority, visible, start_at, end_at, link_url, created_by, created_at) VALUES(?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)');
        $stmt->execute([
            $title, $content, $type, $priority, $visible,
            $startAt !== '' ? $startAt : null,
            $endAt !== '' ? $endAt : null,
            $link !== '' ? $link : null,
            (int)($user['id'] ?? 0),
        ]);
        $id = (int)$this->pdo->lastInsertId();
        $this->auditLogger->log('announcement.create', (int)($user['id'] ?? 0), [ 'id' => $id, 'title' => $title ]);
        return ['id' => $id];
    }

    public function update(int $id, array $user, array $body): array
    {
        $this->acl->ensure($user['role'] ?? 'user', self::PERM_MANAGE);
        $stmt = $this->pdo->prepare('SELECT * FROM announcements WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return ['error' => '未找到公告'];
        }

        $fields = [];
        $params = [];
        $allowed = [
            'title' => 'string',
            'content' => 'string',
            'type' => 'string',
            'priority' => 'int',
            'visible' => 'bool',
            'start_at' => 'nullable',
            'end_at' => 'nullable',
            'link_url' => 'nullable',
        ];
        foreach ($allowed as $col => $type) {
            if (!array_key_exists($col, $body)) {
                continue;
            }
            $val = $body[$col];
            switch ($type) {
                case 'string':
                    $val = (string)$val;
                    break;
                case 'int':
                    $val = max(0, min(255, (int)$val));
                    break;
                case 'bool':
                    $val = (int)(bool)$val;
                    break;
                case 'nullable':
                    $val = ($val !== '' ? (string)$val : null);
                    break;
                default:
                    // no-op
                    break;
            }
            $fields[] = "$col = ?";
            $params[] = $val;
        }
        if (!$fields) {
            return ['ok' => true];
        }
        $params[] = date('Y-m-d H:i:s');
        $params[] = $id;
        $sql = 'UPDATE announcements SET ' . implode(',', $fields) . ', updated_at = ? WHERE id = ?';
        $st = $this->pdo->prepare($sql);
        $st->execute($params);
        $this->auditLogger->log('announcement.update', (int)($user['id'] ?? 0), [ 'id' => $id, 'fields' => array_keys($body) ]);
        return ['ok' => true];
    }

    public function delete(int $id, array $user): array
    {
        $this->acl->ensure($user['role'] ?? 'user', self::PERM_MANAGE);
        $st = $this->pdo->prepare('DELETE FROM announcements WHERE id = ?');
        $st->execute([$id]);
        $this->auditLogger->log('announcement.delete', (int)($user['id'] ?? 0), [ 'id' => $id ]);
        return ['ok' => true];
    }
}
