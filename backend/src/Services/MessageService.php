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
        $status = (string)($query['status'] ?? 'approved');
        $canSeeSensitive = false;
        if ($status !== 'approved') {
            try {
                $this->acl->ensure($user['role'], 'message:approve');
                $canSeeSensitive = true;
            } catch (\Throwable) {
                $status = 'approved';
            }
        }
        // Always include is_anonymous for client rendering; only privileged views can read anon_*
        $cols = 'm.id, m.user_id, m.is_anonymous, m.content, m.image_url, m.status, m.created_at, '
              . 'CASE WHEN m.user_id IS NOT NULL AND m.user_id > 0 THEN u.email ELSE NULL END AS user_email';
        if ($canSeeSensitive) { $cols .= ', m.anon_email, m.anon_student_id'; }
        $where = '';
        if ($status !== 'all') {
            $where = 'WHERE m.status = :status';
        }
        // 普通用户不显示软删除
        if (!$canSeeSensitive) {
            $where = $where === '' ? 'WHERE m.deleted_at IS NULL' : ($where . ' AND m.deleted_at IS NULL');
        }
        $stmt = $this->pdo->prepare("SELECT SQL_CALC_FOUND_ROWS $cols FROM messages m LEFT JOIN users u ON m.user_id = u.id $where ORDER BY m.id DESC LIMIT :limit OFFSET :offset");
        if ($status !== 'all') {
            $stmt->bindValue(':status', $status);
        }
        $stmt->bindValue(':limit', $pageSize, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $items = $stmt->fetchAll();
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
        $total = (int)$this->pdo->query('SELECT FOUND_ROWS()')->fetchColumn();
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
                $this->pdo->prepare('INSERT INTO messages(user_id, is_anonymous, content, image_url, status, created_at) VALUES(?,1,?,?,"pending",CURRENT_TIMESTAMP)')
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
                $stmt = $this->pdo->prepare('INSERT INTO messages(user_id, is_anonymous, anon_email, anon_student_id, anon_passphrase_hash, content, image_url, status, created_at) VALUES(NULL,1,?,?,?,?,?,"pending",CURRENT_TIMESTAMP)');
                $stmt->execute([$anonEmail, $anonStudentId, $passHash, $content, $imageUrl]);
            }
        } else {
            // 非匿名，仍可检查用户封禁
            $stmt = $this->pdo->prepare('SELECT banned FROM users WHERE id = ?');
            $stmt->execute([$userId]);
            if (($stmt->fetch()['banned'] ?? 0) == 1) return ['error' => '账号已被封禁'];
            $this->pdo->prepare('INSERT INTO messages(user_id, is_anonymous, content, image_url, status, created_at) VALUES(?,0,?,?,"pending",CURRENT_TIMESTAMP)')
                ->execute([$userId, $content, $imageUrl]);
        }
        $id = (int)$this->pdo->lastInsertId();
        $this->logger->log('message.create', $userId, ['message_id' => $id]);
        // 邮件通知：提交后待审核
        try {
            if (function_exists('app_container_get')) {
                /** @var Mailer $mailer */
                $mailer = app_container_get(Mailer::class);
                if ($userId > 0) {
                    $stmt = $this->pdo->prepare('SELECT email, nickname FROM users WHERE id = ?');
                    $stmt->execute([$userId]);
                    if ($u = $stmt->fetch()) {
                        $mailer->sendMessageSubmitted((string)$u['email'], (string)$u['nickname'], $id, $content);
                    }
                } else if ($isAnonymous && $anonEmail !== '') {
                    // 游客匿名：发送到匿名邮箱
                    $mailer->sendMessageSubmitted($anonEmail, '同学', $id, $content);
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
        $this->pdo->prepare('UPDATE messages SET content = ?, status = "pending" WHERE id = ?')
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
}


