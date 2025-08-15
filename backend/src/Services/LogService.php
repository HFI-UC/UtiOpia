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
        $onlyError = ((int)($query['only_error'] ?? 0) === 1) || ((int)($query['errorOnly'] ?? 0) === 1);
        $q = trim((string)($query['q'] ?? ''));
        $category = trim((string)($query['category'] ?? ''));
        $level = trim((string)($query['level'] ?? ''));
        $userFilter = trim((string)($query['user'] ?? ''));
        $from = trim((string)($query['from'] ?? ''));
        $to = trim((string)($query['to'] ?? ''));

        $where = [];
        $params = [];
        if ($action !== '') {
            $where[] = 'action = :action';
            $params[':action'] = $action;
        }
        if ($onlyError) {
            $where[] = '(action = "error" OR action LIKE "%.failed")';
        }
        if ($q !== '') {
            $where[] = '(action LIKE :likeq OR CAST(user_id AS CHAR) = :q OR meta LIKE :likeq)';
            $params[':likeq'] = '%' . $q . '%';
            $params[':q'] = $q;
        }
        if ($category !== '') {
            if ($category === 'system') {
                $where[] = '(action NOT LIKE "auth.%" AND action NOT LIKE "message.%" AND action NOT LIKE "user.%" AND action NOT LIKE "ban.%")';
            } else {
                $where[] = 'action LIKE :categoryPrefix';
                $params[':categoryPrefix'] = $category . '.%';
            }
        }
        if ($level !== '') {
            if ($level === 'error') {
                $where[] = '(action = "error" OR action LIKE "%.failed")';
            } elseif ($level === 'warning') {
                $where[] = '(action LIKE "%.conflict" OR action LIKE "%.banned")';
            } elseif ($level === 'info') {
                $where[] = '(action <> "error" AND action NOT LIKE "%.failed" AND action NOT LIKE "%.conflict" AND action NOT LIKE "%.banned")';
            }
        }
        if ($userFilter !== '') {
            if (ctype_digit($userFilter)) {
                $where[] = 'user_id = :uid';
                $params[':uid'] = (int)$userFilter;
            } else {
                $where[] = '(meta LIKE :likeUser)';
                $params[':likeUser'] = '%' . $userFilter . '%';
            }
        }
        if ($from !== '') {
            $where[] = 'created_at >= :from';
            $params[':from'] = $from;
        }
        if ($to !== '') {
            $where[] = 'created_at <= :to';
            $params[':to'] = $to;
        }
        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        // Query items (compatible with SQLite and MySQL)
        $sqlList = 'SELECT id, action, user_id, meta, created_at FROM audit_logs ' . $whereSql . ' ORDER BY id DESC LIMIT :limit OFFSET :offset';
        $stmt = $this->pdo->prepare($sqlList);
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
        // Query total count separately to support SQLite
        $sqlCount = 'SELECT COUNT(*) FROM audit_logs ' . $whereSql;
        $stmtCount = $this->pdo->prepare($sqlCount);
        foreach ($params as $k => $v) { $stmtCount->bindValue($k, $v); }
        $stmtCount->execute();
        $total = (int)$stmtCount->fetchColumn();
        return ['items' => $items, 'total' => $total, 'page' => $page, 'pageSize' => $pageSize];
    }
}


