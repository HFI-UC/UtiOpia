<?php
declare(strict_types=1);

namespace UtiOpia\Services;

use PDO;
use Respect\Validation\Validator as v;

final class MessageService
{
    public function __construct(private PDO $pdo, private AuditLogger $logger, private ACL $acl)
    {
    }

    public function list(array $query, array $user): array
    {
        $page = max(1, (int)($query['page'] ?? 1));
        $pageSize = min(50, max(1, (int)($query['pageSize'] ?? 10)));
        $offset = ($page - 1) * $pageSize;
        $requestedStatus = (string)($query['status'] ?? 'approved');
        $forcePublic = ((int)($query['public'] ?? 0) === 1);
        $canModerate = false;
        try {
            $this->acl->ensure($user['role'], 'message:approve');
            $canModerate = true;
        } catch (\Throwable) {}
        if ($forcePublic) {
            // 即使有审核权限，也强制走公开视角
            $canModerate = false;
            $requestedStatus = 'approved';
        }
        $status = $canModerate ? $requestedStatus : 'approved';
        // 基础字段对所有访问者开放；敏感字段仅对具有审核权限的角色开放
        $viewerId = (int)($user['id'] ?? 0);
        if ($canModerate) {
            $cols = 'm.id, m.user_id, m.is_anonymous, m.content, m.image_url, m.status, m.created_at';
        } else {
            // 非审核视图：匿名且非本人 → 隐去 user_id；实名可显示邮箱（公开身份）
            $cols = 'm.id, '
                  . 'CASE WHEN m.is_anonymous = 1 AND (m.user_id IS NULL OR m.user_id <> :viewer_id) '
                  . 'THEN NULL ELSE m.user_id END AS user_id, '
                  . 'm.is_anonymous, m.content, m.image_url, m.status, m.created_at, '
                  . 'CASE WHEN m.is_anonymous = 0 AND m.user_id IS NOT NULL AND m.user_id > 0 '
                  . 'THEN u.email ELSE NULL END AS user_email, '
                  . 'CASE WHEN m.is_anonymous = 0 AND m.user_id IS NOT NULL AND m.user_id > 0 '
                  . 'THEN u.nickname ELSE NULL END AS user_nickname';
        }
        if ($canModerate) {
            $cols .= ', m.reject_reason, m.reviewed_at, m.reviewed_by';
            // 审核视图可查看匿名线索与实名邮箱
            $cols .= ', m.anon_email, m.anon_student_id, '
                  . 'CASE WHEN m.user_id IS NOT NULL AND m.user_id > 0 THEN u.email ELSE NULL END AS user_email, '
                  . 'CASE WHEN m.user_id IS NOT NULL AND m.user_id > 0 THEN u.nickname ELSE NULL END AS user_nickname';
        }
        // 点赞统计与当前用户是否点赞
        $cols .= ', (SELECT COUNT(*) FROM message_likes ml WHERE ml.message_id = m.id AND ml.deleted_at IS NULL) AS likes_count';
        if ($viewerId > 0) {
            $cols .= ', EXISTS(SELECT 1 FROM message_likes ml2 WHERE ml2.message_id = m.id AND ml2.user_id = :viewer_like_user AND ml2.deleted_at IS NULL) AS liked_by_me';
        }
        $where = '';
        if ($status !== 'all') {
            $where = 'WHERE m.status = :status';
        }
        // 普通用户（或强制公开视图）不显示软删除
        if (!$canModerate) {
            $where = $where === '' ? 'WHERE m.deleted_at IS NULL' : ($where . ' AND m.deleted_at IS NULL');
        }
        $stmt = $this->pdo->prepare("SELECT SQL_CALC_FOUND_ROWS $cols FROM messages m LEFT JOIN users u ON m.user_id = u.id $where ORDER BY m.id DESC LIMIT :limit OFFSET :offset");
        if ($status !== 'all') {
            $stmt->bindValue(':status', $status);
        }
        if (!$canModerate) {
            $stmt->bindValue(':viewer_id', $viewerId, PDO::PARAM_INT);
        }
        if ($viewerId > 0) {
            $stmt->bindValue(':viewer_like_user', $viewerId, PDO::PARAM_INT);
        }
        $stmt->bindValue(':limit', $pageSize, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $items = $stmt->fetchAll();
        $total = (int)$this->pdo->query('SELECT FOUND_ROWS()')->fetchColumn();

        // 将 image_url 替换为短期 GET 预签名，便于前端直接展示
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
                unset($item);
            }
        } catch (\Throwable) {}
        // 可选：联动返回评论，减少前端额外请求
        $withComments = (int)($query['with_comments'] ?? 1) === 1;
        if ($withComments && !empty($items)) {
            $messageIds = array_map(static fn($it) => (int)$it['id'], $items);
            $placeholders = implode(',', array_fill(0, count($messageIds), '?'));
            // 管理视图总是可见实名；普通视图对匿名做脱敏
            $viewerIdInt = (int)$viewerId;
            $canModerateInt = $canModerate ? 1 : 0;
            $sqlComments = 'SELECT c.id, c.message_id, c.user_id, c.is_anonymous, c.content, c.parent_id, c.root_id, '
                . 'c.status, c.created_at, c.reviewed_at, c.reviewed_by, '
                . 'CASE WHEN c.is_anonymous = 1 AND ' . $canModerateInt . ' = 0 AND (c.user_id IS NULL OR c.user_id <> ' . $viewerIdInt . ') THEN NULL ELSE u.email END AS user_email, '
                . 'CASE WHEN c.is_anonymous = 1 AND ' . $canModerateInt . ' = 0 AND (c.user_id IS NULL OR c.user_id <> ' . $viewerIdInt . ') THEN NULL ELSE u.nickname END AS user_nickname '
                . 'FROM message_comments c '
                . 'LEFT JOIN users u ON u.id = c.user_id '
                . 'WHERE c.message_id IN (' . $placeholders . ') AND c.deleted_at IS NULL ' . (!$canModerate ? 'AND c.status = "approved" ' : '')
                . 'ORDER BY COALESCE(c.root_id, c.id) ASC, c.id ASC';
            $stc = $this->pdo->prepare($sqlComments);
            foreach ($messageIds as $idx => $mid) {
                $stc->bindValue($idx + 1, $mid, PDO::PARAM_INT);
            }
            $stc->execute();
            $rows = $stc->fetchAll();
            $midToComments = [];
            foreach ($rows as $row) {
                $mid = (int)$row['message_id'];
                if (!isset($midToComments[$mid])) $midToComments[$mid] = [];
                $midToComments[$mid][] = $row;
            }
            foreach ($items as &$it) {
                $mid = (int)$it['id'];
                $list = $midToComments[$mid] ?? [];
                $it['comments'] = [ 'items' => $list, 'total' => count($list) ];
            }
            unset($it);
        }

        return ['items' => $items, 'total' => $total, 'page' => $page, 'pageSize' => $pageSize];
    }

    public function create(int $userId, array $data): array
    {
        $content = trim((string)($data['content'] ?? ''));
        $imageUrl = trim((string)($data['image_url'] ?? ''));
        $isAnonymous = (bool)($data['is_anonymous'] ?? false);
        $anonEmail = trim((string)($data['anon_email'] ?? ''));
        $anonStudentId = trim((string)($data['anon_student_id'] ?? ''));
        $anonPassphrase = (string)($data['anon_passphrase'] ?? '');
        v::stringType()->length(1, 500)->assert($content);
        if ($imageUrl !== '') {
            v::url()->assert($imageUrl);
        }
        if ($isAnonymous) {
            if ($userId > 0) {
                // 登录用户匿名发布：无需填写匿名字段
                $stmt = $this->pdo->prepare('SELECT banned FROM users WHERE id = ?');
                $stmt->execute([$userId]);
                if (($stmt->fetch()['banned'] ?? 0) == 1) return ['error' => '账号已被封禁'];
                $this->pdo->prepare('INSERT INTO messages(user_id, is_anonymous, content, image_url, status, created_at) VALUES(?,1,?,?,"approved",CURRENT_TIMESTAMP)')
                    ->execute([$userId, $content, $imageUrl]);
            } else {
                // 游客匿名：仍需校验匿名信息
                if (!preg_match('/^[a-z]+\.[a-z]+20\d{2}@gdhfi\.com$/', $anonEmail)) {
                    return ['error' => '邮箱格式不符合要求'];
                }
                if (!preg_match('/^GJ20\d{2}\d{4}$/', $anonStudentId)) {
                    return ['error' => '学生号格式不正确'];
                }
                if ($anonPassphrase === '') {
                    return ['error' => '匿名口令必填'];
                }
                if ($this->isBanned('email', $anonEmail) || $this->isBanned('student_id', $anonStudentId)) {
                    return ['error' => '当前身份已被封禁'];
                }
                $passHash = password_hash($anonPassphrase, PASSWORD_BCRYPT);
                $stmt = $this->pdo->prepare('INSERT INTO messages(user_id, is_anonymous, anon_email, anon_student_id, anon_passphrase_hash, content, image_url, status, created_at) VALUES(NULL,1,?,?,?,?,?,"approved",CURRENT_TIMESTAMP)');
                $stmt->execute([$anonEmail, $anonStudentId, $passHash, $content, $imageUrl]);
            }
        } else {
            // 非匿名，仍可检查用户封禁
            $stmt = $this->pdo->prepare('SELECT banned FROM users WHERE id = ?');
            $stmt->execute([$userId]);
            if (($stmt->fetch()['banned'] ?? 0) == 1) return ['error' => '账号已被封禁'];
            $this->pdo->prepare('INSERT INTO messages(user_id, is_anonymous, content, image_url, status, created_at) VALUES(?,0,?,?,"approved",CURRENT_TIMESTAMP)')
                ->execute([$userId, $content, $imageUrl]);
        }
        $id = (int)$this->pdo->lastInsertId();
        $this->logger->log('message.create', $userId, ['message_id' => $id]);
        // 发送“已公开展示但可能被隐藏”的提示邮件
        try {
            if (function_exists('app_container_get')) {
                /** @var Mailer $mailer */
                $mailer = app_container_get(Mailer::class);
                if ($userId > 0) {
                    $stmt = $this->pdo->prepare('SELECT email, nickname FROM users WHERE id = ?');
                    $stmt->execute([$userId]);
                    if ($u = $stmt->fetch()) {
                        $mailer->sendMessagePublishedNotice((string)$u['email'], (string)$u['nickname'], $id, $content);
                    }
                } else if ($isAnonymous && $anonEmail !== '') {
                    $mailer->sendMessagePublishedNotice($anonEmail, '同学', $id, $content);
                }
            }
        } catch (\Throwable) {}
        return ['ok' => true, 'id' => $id];
    }

    public function update(int $id, array $user, array $data): array
    {
        $stmt = $this->pdo->prepare('SELECT id, user_id, is_anonymous, anon_passphrase_hash, status FROM messages WHERE id = ?');
        $stmt->execute([$id]);
        $msg = $stmt->fetch();
        if (!$msg) return ['error' => '留言不存在'];
        $userIdOfMsg = $msg['user_id'] ?? null;
        $isOwner = ($userIdOfMsg !== null && (int)$userIdOfMsg > 0 && (int)$userIdOfMsg === (int)$user['id']);
        $isAnonymous = ((int)($msg['is_anonymous'] ?? 0) === 1);
        if ($isAnonymous && !$isOwner) {
            // 匿名留言（无归属用户），允许凭匿名口令编辑
            $pass = (string)($data['anon_passphrase'] ?? '');
            if ($pass === '' || !password_verify($pass, (string)$msg['anon_passphrase_hash'])) {
                return ['error' => '匿名口令错误'];
            }
        } else if ($isOwner) {
            $this->acl->ensure($user['role'], 'message:update:own');
        } else {
            $this->acl->ensure($user['role'], 'message:update');
        }
        $content = trim((string)($data['content'] ?? ''));
        v::optional(v::stringType()->length(1, 500))->assert($content === '' ? null : $content);
        $this->pdo->prepare('UPDATE messages SET content = ? WHERE id = ?')
            ->execute([$content, $id]);
        $this->logger->log('message.update', (int)$user['id'], ['message_id' => $id]);
        return ['ok' => true];
    }

    public function delete(int $id, array $user, array $data): array
    {
        $stmt = $this->pdo->prepare('SELECT id, user_id, is_anonymous, anon_passphrase_hash FROM messages WHERE id = ?');
        $stmt->execute([$id]);
        $msg = $stmt->fetch();
        if (!$msg) return ['error' => '留言不存在'];
        $userIdOfMsg = $msg['user_id'] ?? null;
        $isOwner = ($userIdOfMsg !== null && (int)$userIdOfMsg > 0 && (int)$userIdOfMsg === (int)$user['id']);
        $isAnonymous = ((int)($msg['is_anonymous'] ?? 0) === 1);
        if ($isAnonymous && !$isOwner) {
            $pass = (string)($data['anon_passphrase'] ?? '');
            if ($pass === '' || !password_verify($pass, (string)$msg['anon_passphrase_hash'])) {
                return ['error' => '匿名口令错误'];
            }
        } else if ($isOwner) {
            $this->acl->ensure($user['role'], 'message:delete:own');
        } else {
            $this->acl->ensure($user['role'], 'message:delete');
        }
        $this->pdo->prepare('UPDATE messages SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?')->execute([$id]);
        $this->logger->log('message.delete', (int)$user['id'], ['message_id' => $id, 'soft' => true]);
        return ['ok' => true];
    }

    private function isBanned(string $type, string $value): bool
    {
        $stmt = $this->pdo->prepare('SELECT 1 FROM bans WHERE type = ? AND value = ? AND active = 1 AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP) LIMIT 1');
        $stmt->execute([$type, $value]);
        return (bool)$stmt->fetchColumn();
    }

    public function getById(int $id, array $user): array
    {
        $requestedStatus = 'all';
        $canModerate = false;
        try {
            $this->acl->ensure($user['role'], 'message:approve');
            $canModerate = true;
        } catch (\Throwable) {}
        $viewerId = (int)($user['id'] ?? 0);
        if ($canModerate) {
            $cols = 'm.id, m.user_id, m.is_anonymous, m.content, m.image_url, m.status, m.created_at';
        } else {
            $cols = 'm.id, '
                . 'CASE WHEN m.is_anonymous = 1 AND (m.user_id IS NULL OR m.user_id <> :viewer_id) THEN NULL ELSE m.user_id END AS user_id, '
                . 'm.is_anonymous, m.content, m.image_url, m.status, m.created_at, '
                . 'CASE WHEN m.is_anonymous = 0 AND m.user_id IS NOT NULL AND m.user_id > 0 THEN u.email ELSE NULL END AS user_email, '
                . 'CASE WHEN m.is_anonymous = 0 AND m.user_id IS NOT NULL AND m.user_id > 0 THEN u.nickname ELSE NULL END AS user_nickname';
        }
        if ($canModerate) {
            $cols .= ', m.reject_reason, m.reviewed_at, m.reviewed_by';
            $cols .= ', m.anon_email, m.anon_student_id, CASE WHEN m.user_id IS NOT NULL AND m.user_id > 0 THEN u.email ELSE NULL END AS user_email, CASE WHEN m.user_id IS NOT NULL AND m.user_id > 0 THEN u.nickname ELSE NULL END AS user_nickname';
        }
        $cols .= ', (SELECT COUNT(*) FROM message_likes ml WHERE ml.message_id = m.id AND ml.deleted_at IS NULL) AS likes_count';
        if ($viewerId > 0) {
            $cols .= ', EXISTS(SELECT 1 FROM message_likes ml2 WHERE ml2.message_id = m.id AND ml2.user_id = :viewer_like_user AND ml2.deleted_at IS NULL) AS liked_by_me';
        }
        $where = 'WHERE m.id = :id';
        if (!$canModerate) {
            $where .= ' AND m.status = "approved" AND m.deleted_at IS NULL';
        }
        $sql = "SELECT $cols FROM messages m LEFT JOIN users u ON m.user_id = u.id $where LIMIT 1";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        if (!$canModerate) {
            $stmt->bindValue(':viewer_id', $viewerId, PDO::PARAM_INT);
        }
        if ($viewerId > 0) {
            $stmt->bindValue(':viewer_like_user', $viewerId, PDO::PARAM_INT);
        }
        $stmt->execute();
        $item = $stmt->fetch();
        if (!$item) return ['error' => '不存在或不可见'];
        try {
            if (function_exists('app_container_get')) {
                /** @var COSService $cos */
                $cos = app_container_get(COSService::class);
                $url = (string)($item['image_url'] ?? '');
                if ($url !== '') {
                    $item['image_url'] = $cos->generatePresignedGetUrl($url, 30);
                }
            }
        } catch (\Throwable) {}
        return ['item' => $item];
    }
}


