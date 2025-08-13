<?php
declare(strict_types=1);

namespace UtiOpia\Services;

use PDO;
use Respect\Validation\Validator as v;

final class UserService
{
    public function __construct(private PDO $pdo, private AuditLogger $logger, private ACL $acl, private Mailer $mailer)
    {
    }

    public function list(array $actor): array
    {
        $this->acl->ensure($actor['role'], 'user:read');
        $stmt = $this->pdo->query('SELECT id, email, nickname, student_id, role, banned, created_at FROM users ORDER BY id DESC LIMIT 200');
        return ['items' => $stmt->fetchAll()];
    }

    public function update(int $id, array $actor, array $data): array
    {
        $this->acl->ensure($actor['role'], 'user:update');
        $role = (string)($data['role'] ?? 'user');
        v::in(['super_admin', 'moderator', 'user'])->assert($role);
        $nickname = trim((string)($data['nickname'] ?? ''));
        v::optional(v::stringType()->length(1, 50))->assert($nickname === '' ? null : $nickname);
        $studentId = trim((string)($data['student_id'] ?? ''));
        if ($studentId !== '' && !preg_match('/^GJ20\d{2}\d{4}$/', $studentId)) {
            return ['error' => '学生号格式不正确'];
        }
        $this->pdo->prepare('UPDATE users SET role = ?, nickname = COALESCE(NULLIF(?,\'\'), nickname), student_id = COALESCE(NULLIF(?,\'\'), student_id) WHERE id = ?')
            ->execute([$role, $nickname, $studentId, $id]);
        $this->logger->log('user.update', $actor['id'], ['target_user_id' => $id, 'role' => $role]);
        // notify target user
        $stmt = $this->pdo->prepare('SELECT email, nickname FROM users WHERE id = ?');
        $stmt->execute([$id]);
        if ($u = $stmt->fetch()) {
            $this->mailer->sendUserRoleChanged($u['email'], $u['nickname'], $role);
        }
        return ['ok' => true];
    }

    public function ban(int $id, array $actor): array
    {
        $this->acl->ensure($actor['role'], 'user:ban');
        $this->pdo->prepare('UPDATE users SET banned = 1 WHERE id = ?')->execute([$id]);
        $this->logger->log('user.ban', $actor['id'], ['target_user_id' => $id]);
        $stmt = $this->pdo->prepare('SELECT email, nickname FROM users WHERE id = ?');
        $stmt->execute([$id]);
        if ($u = $stmt->fetch()) {
            $this->mailer->sendUserBanStatus($u['email'], $u['nickname'], true);
        }
        return ['ok' => true];
    }

    public function unban(int $id, array $actor): array
    {
        $this->acl->ensure($actor['role'], 'user:unban');
        $this->pdo->prepare('UPDATE users SET banned = 0 WHERE id = ?')->execute([$id]);
        $this->logger->log('user.unban', $actor['id'], ['target_user_id' => $id]);
        $stmt = $this->pdo->prepare('SELECT email, nickname FROM users WHERE id = ?');
        $stmt->execute([$id]);
        if ($u = $stmt->fetch()) {
            $this->mailer->sendUserBanStatus($u['email'], $u['nickname'], false);
        }
        return ['ok' => true];
    }

    public function createBan(array $actor, string $type, string $value, string $reason = ''): array
    {
        $this->acl->ensure($actor['role'], 'ban:manage');
        if (!in_array($type, ['email', 'student_id'], true)) return ['error' => '类型不正确'];
        if ($type === 'email' && !preg_match('/^[a-z]+\.[a-z]+20\d{2}@gdhfi\.com$/', $value)) return ['error' => '邮箱格式不正确'];
        if ($type === 'student_id' && !preg_match('/^GJ20\d{2}\d{4}$/', $value)) return ['error' => '学生号格式不正确'];
        // 阶梯封禁 (1..5) 最长 90 天
        $stage = (int)($_REQUEST['stage'] ?? 1);
        if ($stage < 1 || $stage > 5) $stage = 1;
        // 按阶段计算时长（示例：7/14/30/60/90 天）
        $days = [1 => 1, 2 => 3, 3 => 7, 4 => 30, 5 => 90][$stage];
        $expiresAt = (new \DateTimeImmutable("+{$days} days"))->format('Y-m-d H:i:s');
        // SQLite 兼容：UPSERT 语法
        $stmt = $this->pdo->prepare('INSERT INTO bans(type, value, reason, created_by, created_at, updated_at, active, stage, expires_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,1,?,?) ON CONFLICT(type,value,active) DO UPDATE SET reason=excluded.reason, updated_at=CURRENT_TIMESTAMP, active=1, stage=excluded.stage, expires_at=excluded.expires_at');
        $stmt->execute([$type, $value, $reason, $actor['id'], $stage, $expiresAt]);
        $this->logger->log('ban.create', $actor['id'], ['type' => $type, 'value' => $value, 'reason' => $reason]);
        return ['ok' => true];
    }

    public function removeBan(array $actor, string $type, string $value): array
    {
        $this->acl->ensure($actor['role'], 'ban:manage');
        $stmt = $this->pdo->prepare('UPDATE bans SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE type = ? AND value = ? AND active = 1');
        $stmt->execute([$type, $value]);
        $this->logger->log('ban.remove', $actor['id'], ['type' => $type, 'value' => $value]);
        return ['ok' => true];
    }

    public function listBans(array $actor): array
    {
        $this->acl->ensure($actor['role'], 'ban:manage');
        $stmt = $this->pdo->query('SELECT id, type, value, reason, active, stage, expires_at, created_by, created_at, updated_at FROM bans ORDER BY id DESC LIMIT 200');
        return ['items' => $stmt->fetchAll()];
    }
}


