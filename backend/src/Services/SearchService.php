<?php
declare(strict_types=1);

namespace UtiOpia\Services;

use PDO;

final class SearchService
{
    public function __construct(private PDO $pdo, private ACL $acl)
    {
    }

    public function search(array $query, array $user): array
    {
        $searchTerm = trim((string)($query['q'] ?? ''));
        if ($searchTerm === '') {
            return ['items' => [], 'total' => 0, 'page' => 1, 'pageSize' => 10];
        }

        $page = max(1, (int)($query['page'] ?? 1));
        $pageSize = min(50, max(1, (int)($query['pageSize'] ?? 10)));
        $offset = ($page - 1) * $pageSize;

        // 检查用户权限
        $canModerate = false;
        try {
            $this->acl->ensure($user['role'], 'message:approve');
            $canModerate = true;
        } catch (\Throwable) {}

        $viewerId = (int)($user['id'] ?? 0);

        // 根据权限决定搜索范围
        if ($canModerate) {
            // 管理员可以搜索所有字段
            $searchResults = $this->searchForAdmin($searchTerm, $page, $pageSize, $offset, $viewerId);
        } else {
            // 普通用户只能搜索允许的内容
            $searchResults = $this->searchForUser($searchTerm, $page, $pageSize, $offset, $viewerId);
        }

        return $searchResults;
    }

    private function searchForAdmin(string $searchTerm, int $page, int $pageSize, int $offset, int $viewerId): array
    {
        // 管理员可以搜索所有字段：纸条内容、评论内容、用户信息、匿名信息等
        $searchPattern = '%' . $searchTerm . '%';
        
        // 搜索纸条
        $messageCols = 'm.id, m.user_id, m.is_anonymous, m.content, m.image_url, m.status, m.created_at, '
                    . 'm.reject_reason, m.reviewed_at, m.reviewed_by, m.anon_email, m.anon_student_id, '
                    . 'CASE WHEN m.user_id IS NOT NULL AND m.user_id > 0 THEN u.email ELSE NULL END AS user_email, '
                    . 'CASE WHEN m.user_id IS NOT NULL AND m.user_id > 0 THEN u.nickname ELSE NULL END AS user_nickname, '
                    . '(SELECT COUNT(*) FROM message_likes ml WHERE ml.message_id = m.id AND ml.deleted_at IS NULL) AS likes_count';
        
        if ($viewerId > 0) {
            $messageCols .= ', EXISTS(SELECT 1 FROM message_likes ml2 WHERE ml2.message_id = m.id AND ml2.user_id = ? AND ml2.deleted_at IS NULL) AS liked_by_me';
        }

        $messageSearchSql = "
            SELECT SQL_CALC_FOUND_ROWS $messageCols, 'message' as result_type, m.id as result_id
            FROM messages m 
            LEFT JOIN users u ON m.user_id = u.id 
            WHERE (
                m.content LIKE ? OR 
                m.anon_email LIKE ? OR 
                m.anon_student_id LIKE ? OR 
                u.email LIKE ? OR 
                u.nickname LIKE ?
            )
            ORDER BY m.id DESC 
            LIMIT ? OFFSET ?
        ";

        $stmt = $this->pdo->prepare($messageSearchSql);
        
        // 构建参数数组，注意顺序必须与SQL中的占位符顺序一致
        $params = [];
        
        // 第一个占位符：messageCols中的liked_by_me查询（如果存在）
        if ($viewerId > 0) {
            $params[] = $viewerId;
        }
        
        // 添加搜索模式的参数
        $params[] = $searchPattern; // m.content LIKE ?
        $params[] = $searchPattern; // m.anon_email LIKE ?
        $params[] = $searchPattern; // m.anon_student_id LIKE ?
        $params[] = $searchPattern; // u.email LIKE ?
        $params[] = $searchPattern; // u.nickname LIKE ?
        
        // 添加分页参数
        $params[] = $pageSize;
        $params[] = $offset;
        
        $stmt->execute($params);
        $messageResults = $stmt->fetchAll();
        $messageTotal = (int)$this->pdo->query('SELECT FOUND_ROWS()')->fetchColumn();

        // 搜索评论（单独查询）
        $commentSearchSql = "
            SELECT c.id, c.message_id, c.user_id, c.is_anonymous, c.content, c.parent_id, c.root_id, 
                   c.status, c.created_at, c.reviewed_at, c.reviewed_by,
                   u.email as user_email, u.nickname as user_nickname,
                   'comment' as result_type, c.id as result_id
            FROM message_comments c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.content LIKE ? OR u.email LIKE ? OR u.nickname LIKE ?
            ORDER BY c.id DESC
            LIMIT ? OFFSET ?
        ";

        $commentStmt = $this->pdo->prepare($commentSearchSql);
        $commentStmt->execute([$searchPattern, $searchPattern, $searchPattern, $pageSize, $offset]);
        $commentResults = $commentStmt->fetchAll();

        // 为搜索到的纸条添加评论
        if (!empty($messageResults)) {
            $messageIds = array_map(fn($m) => (int)$m['id'], $messageResults);
            $this->addCommentsToMessages($messageResults, $messageIds, true, $viewerId);
        }

        // 为搜索到的评论添加关联的纸条信息
        foreach ($commentResults as &$comment) {
            $messageStmt = $this->pdo->prepare("
                SELECT m.id, m.content, m.created_at, m.is_anonymous,
                       CASE WHEN m.user_id IS NOT NULL THEN u.nickname ELSE NULL END as user_nickname
                FROM messages m 
                LEFT JOIN users u ON m.user_id = u.id 
                WHERE m.id = ?
            ");
            $messageStmt->execute([$comment['message_id']]);
            $comment['related_message'] = $messageStmt->fetch() ?: null;
        }

        // 处理图片URL
        $this->processImageUrls(array_merge($messageResults, $commentResults));

        // 合并结果
        $allResults = array_merge($messageResults, $commentResults);
        
        return [
            'items' => $allResults,
            'total' => $messageTotal + count($commentResults),
            'page' => $page,
            'pageSize' => $pageSize,
            'search_term' => $searchTerm
        ];
    }

    private function searchForUser(string $searchTerm, int $page, int $pageSize, int $offset, int $viewerId): array
    {
        // 普通用户只能搜索：
        // 1. 匿名纸条和评论的内容
        // 2. 实名纸条和评论的内容以及用户名
        $searchPattern = '%' . $searchTerm . '%';
        
        // 搜索纸条 - 只搜索已通过的纸条
        $messageCols = 'm.id, '
                    . 'CASE WHEN m.is_anonymous = 1 AND (m.user_id IS NULL OR m.user_id <> ?) THEN NULL ELSE m.user_id END AS user_id, '
                    . 'm.is_anonymous, m.content, m.image_url, m.status, m.created_at, '
                    . 'CASE WHEN m.is_anonymous = 0 AND m.user_id IS NOT NULL AND m.user_id > 0 THEN u.email ELSE NULL END AS user_email, '
                    . 'CASE WHEN m.is_anonymous = 0 AND m.user_id IS NOT NULL AND m.user_id > 0 THEN u.nickname ELSE NULL END AS user_nickname, '
                    . '(SELECT COUNT(*) FROM message_likes ml WHERE ml.message_id = m.id AND ml.deleted_at IS NULL) AS likes_count';
        
        if ($viewerId > 0) {
            $messageCols .= ', EXISTS(SELECT 1 FROM message_likes ml2 WHERE ml2.message_id = m.id AND ml2.user_id = ? AND ml2.deleted_at IS NULL) AS liked_by_me';
        }

        $messageSearchSql = "
            SELECT SQL_CALC_FOUND_ROWS $messageCols, 'message' as result_type, m.id as result_id
            FROM messages m 
            LEFT JOIN users u ON m.user_id = u.id 
            WHERE m.status = 'approved' AND m.deleted_at IS NULL 
            AND (
                m.content LIKE ? OR 
                (m.is_anonymous = 0 AND m.user_id IS NOT NULL AND (u.email LIKE ? OR u.nickname LIKE ?))
            )
            ORDER BY m.id DESC 
            LIMIT ? OFFSET ?
        ";

        // 构建参数数组，注意顺序必须与SQL中的占位符顺序一致
        $params = [];
        
        // 第一个占位符：CASE WHEN m.is_anonymous = 1 AND (m.user_id IS NULL OR m.user_id <> ?) THEN NULL ELSE m.user_id END AS user_id
        $params[] = $viewerId;
        
        // 如果有viewerId，添加liked_by_me的占位符参数
        if ($viewerId > 0) {
            $params[] = $viewerId;
        }
        
        // 添加搜索模式的参数
        $params[] = $searchPattern; // m.content LIKE ?
        $params[] = $searchPattern; // u.email LIKE ?
        $params[] = $searchPattern; // u.nickname LIKE ?
        
        // 添加分页参数
        $params[] = $pageSize;
        $params[] = $offset;
        
        $stmt = $this->pdo->prepare($messageSearchSql);
        $stmt->execute($params);
        $messageResults = $stmt->fetchAll();
        $messageTotal = (int)$this->pdo->query('SELECT FOUND_ROWS()')->fetchColumn();

        // 搜索评论 - 只搜索已通过的评论
        $commentSearchSql = "
            SELECT c.id, c.message_id, c.user_id, c.is_anonymous, c.content, c.parent_id, c.root_id, 
                   c.status, c.created_at, c.reviewed_at, c.reviewed_by,
                   CASE WHEN c.is_anonymous = 1 AND ? = 0 AND (c.user_id IS NULL OR c.user_id <> ?) THEN NULL ELSE u.email END AS user_email,
                   CASE WHEN c.is_anonymous = 1 AND ? = 0 AND (c.user_id IS NULL OR c.user_id <> ?) THEN NULL ELSE u.nickname END AS user_nickname,
                   'comment' as result_type, c.id as result_id
            FROM message_comments c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.status = 'approved' AND c.deleted_at IS NULL
            AND (
                c.content LIKE ? OR 
                (c.is_anonymous = 0 AND (u.email LIKE ? OR u.nickname LIKE ?))
            )
            ORDER BY c.id DESC
            LIMIT ? OFFSET ?
        ";

        $canModerateInt = 0; // 普通用户
        $commentStmt = $this->pdo->prepare($commentSearchSql);
        $commentStmt->execute([
            $canModerateInt, $viewerId, $canModerateInt, $viewerId,
            $searchPattern, $searchPattern, $searchPattern, 
            $pageSize, $offset
        ]);
        $commentResults = $commentStmt->fetchAll();

        // 为搜索到的纸条添加评论
        if (!empty($messageResults)) {
            $messageIds = array_map(fn($m) => (int)$m['id'], $messageResults);
            $this->addCommentsToMessages($messageResults, $messageIds, false, $viewerId);
        }

        // 为搜索到的评论添加关联的纸条信息
        foreach ($commentResults as &$comment) {
            $messageStmt = $this->pdo->prepare("
                SELECT m.id, m.content, m.created_at, m.is_anonymous,
                       CASE WHEN m.is_anonymous = 0 AND m.user_id IS NOT NULL THEN u.nickname ELSE NULL END as user_nickname
                FROM messages m 
                LEFT JOIN users u ON m.user_id = u.id 
                WHERE m.id = ? AND m.status = 'approved' AND m.deleted_at IS NULL
            ");
            $messageStmt->execute([$comment['message_id']]);
            $comment['related_message'] = $messageStmt->fetch() ?: null;
        }

        // 处理图片URL
        $this->processImageUrls(array_merge($messageResults, $commentResults));

        // 合并结果
        $allResults = array_merge($messageResults, $commentResults);
        
        return [
            'items' => $allResults,
            'total' => $messageTotal + count($commentResults),
            'page' => $page,
            'pageSize' => $pageSize,
            'search_term' => $searchTerm
        ];
    }

    private function addCommentsToMessages(array &$messages, array $messageIds, bool $canModerate, int $viewerId): void
    {
        if (empty($messageIds)) return;

        $placeholders = implode(',', array_fill(0, count($messageIds), '?'));
        $canModerateInt = $canModerate ? 1 : 0;
        
        $sqlComments = 'SELECT c.id, c.message_id, c.user_id, c.is_anonymous, c.content, c.parent_id, c.root_id, '
            . 'c.status, c.created_at, c.reviewed_at, c.reviewed_by, '
            . 'CASE WHEN c.is_anonymous = 1 AND ? = 0 AND (c.user_id IS NULL OR c.user_id <> ?) THEN NULL ELSE u.email END AS user_email, '
            . 'CASE WHEN c.is_anonymous = 1 AND ? = 0 AND (c.user_id IS NULL OR c.user_id <> ?) THEN NULL ELSE u.nickname END AS user_nickname '
            . 'FROM message_comments c '
            . 'LEFT JOIN users u ON u.id = c.user_id '
            . 'WHERE c.message_id IN (' . $placeholders . ') AND c.deleted_at IS NULL ' . (!$canModerate ? 'AND c.status = "approved" ' : '')
            . 'ORDER BY COALESCE(c.root_id, c.id) ASC, c.id ASC';
        
        $stmt = $this->pdo->prepare($sqlComments);
        
        // 构建参数数组：canModerateInt, viewerId, canModerateInt, viewerId, 然后是messageIds
        $params = [$canModerateInt, $viewerId, $canModerateInt, $viewerId];
        $params = array_merge($params, $messageIds);
        
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        $midToComments = [];
        foreach ($rows as $row) {
            $mid = (int)$row['message_id'];
            if (!isset($midToComments[$mid])) $midToComments[$mid] = [];
            $midToComments[$mid][] = $row;
        }

        foreach ($messages as &$message) {
            $mid = (int)$message['id'];
            $list = $midToComments[$mid] ?? [];
            $message['comments'] = ['items' => $list, 'total' => count($list)];
        }
    }

    private function processImageUrls(array &$items): void
    {
        try {
            if (function_exists('app_container_get')) {
                /** @var COSService $cos */
                $cos = app_container_get(COSService::class);
                foreach ($items as &$item) {
                    $url = (string)($item['image_url'] ?? '');
                    if ($url !== '') {
                        $item['image_url'] = $cos->generatePresignedGetUrl($url, 30);
                    }
                }
            }
        } catch (\Throwable) {}
    }
}
