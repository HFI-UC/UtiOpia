<?php
declare(strict_types=1);

namespace UtiOpia\Services;

use PDO;

final class LogService
{
    public function __construct(private PDO $pdo, private ACL $acl)
    {
    }

    public function list(array $query, array $actor): array
    {
        $this->acl->ensure($actor['role'], 'audit:read');
        $page = max(1, (int)($query['page'] ?? 1));
        $pageSize = min(100, max(1, (int)($query['pageSize'] ?? 20)));
        $offset = ($page - 1) * $pageSize;
        $action = trim((string)($query['action'] ?? ''));
        $onlyError = (int)($query['only_error'] ?? 0) === 1;

        $where = [];
        $params = [];
        if ($action !== '') {
            $where[] = 'action = :action';
            $params[':action'] = $action;
        }
        if ($onlyError) {
            $where[] = 'action = "error"';
        }
        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $sql = 'SELECT SQL_CALC_FOUND_ROWS id, action, user_id, meta, created_at FROM audit_logs ' . $whereSql . ' ORDER BY id DESC LIMIT :limit OFFSET :offset';
        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $k => $v) { $stmt->bindValue($k, $v); }
        $stmt->bindValue(':limit', $pageSize, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $items = $stmt->fetchAll();
        foreach ($items as &$it) {
            if (isset($it['meta']) && is_string($it['meta'])) {
                $decoded = json_decode($it['meta'], true);
                $it['meta'] = $decoded === null ? $it['meta'] : $decoded;
            }
        }
        $total = (int)$this->pdo->query('SELECT FOUND_ROWS()')->fetchColumn();
        return ['items' => $items, 'total' => $total, 'page' => $page, 'pageSize' => $pageSize];
    }
}


