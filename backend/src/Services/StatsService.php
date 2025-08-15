<?php
declare(strict_types=1);

namespace UtiOpia\Services;

use PDO;

final class StatsService
{
    public function __construct(private PDO $pdo, private ACL $acl, private array $settings)
    {
    }

    public function overview(array $user): array
    {
        // Permission: require ability to read audits/stats
        $this->acl->ensure($user['role'] ?? 'user', 'audit:read');

        $since24h = date('Y-m-d H:i:s', time() - 24 * 3600);

        // Totals
        $totalUsers = (int)$this->pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
        $bannedUsers = (int)$this->pdo->query('SELECT COUNT(*) FROM users WHERE banned = 1')->fetchColumn();
        $totalMessages = (int)$this->pdo->query('SELECT COUNT(*) FROM messages WHERE deleted_at IS NULL OR deleted_at IS NULL')->fetchColumn();
        $totalBans = (int)$this->pdo->query('SELECT COUNT(*) FROM bans')->fetchColumn();
        $activeBans = (int)$this->pdo->query('SELECT COUNT(*) FROM bans WHERE active = 1')->fetchColumn();

        // Messages by status
        $statusCounts = [ 'pending' => 0, 'approved' => 0, 'rejected' => 0 ];
        $stmt = $this->pdo->query('SELECT status, COUNT(*) c FROM messages WHERE deleted_at IS NULL OR deleted_at IS NULL GROUP BY status');
        foreach ($stmt->fetchAll() as $row) {
            $status = (string)$row['status'];
            $statusCounts[$status] = (int)$row['c'];
        }

        // Recent counts
        $stmt = $this->pdo->prepare('SELECT COUNT(*) FROM messages WHERE created_at >= ?');
        $stmt->execute([$since24h]);
        $messages24h = (int)$stmt->fetchColumn();

        $stmt = $this->pdo->prepare('SELECT COUNT(*) FROM audit_logs WHERE created_at >= ?');
        $stmt->execute([$since24h]);
        $logs24h = (int)$stmt->fetchColumn();

        // DB info
        $driver = (string)$this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        $dbVersion = $this->getDbVersion($driver);

        // System info
        $root = dirname(__DIR__, 2);
        $diskTotal = @disk_total_space($root) ?: 0;
        $diskFree = @disk_free_space($root) ?: 0;

        $info = [
            'server_time' => date('c'),
            'php_version' => PHP_VERSION,
            'sapi' => php_sapi_name(),
            'os' => PHP_OS_FAMILY . ' ' . php_uname('r'),
            'memory_usage' => memory_get_usage(true),
            'memory_peak' => memory_get_peak_usage(true),
            'memory_limit' => (string)ini_get('memory_limit'),
            'disk_total' => $diskTotal,
            'disk_free' => $diskFree,
            'db_driver' => $driver,
            'db_version' => $dbVersion,
            'turnstile_configured' => !empty(($this->settings['turnstile']['secret'] ?? '')),
            'cos_configured' => !empty(($this->settings['cos']['bucket'] ?? '')),
        ];

        return [
            'info' => $info,
            // Compatibility: keep totals for older clients
            'totals' => [
                'users' => $totalUsers,
                'messages' => $totalMessages,
            ],
            // OpenAPI-style grouped fields
            'users' => [
                'total' => $totalUsers,
                'banned' => $bannedUsers,
            ],
            'bans' => [
                'total' => $totalBans,
                'active' => $activeBans,
            ],
            'messages' => [
                'pending' => $statusCounts['pending'] ?? 0,
                'approved' => $statusCounts['approved'] ?? 0,
                'rejected' => $statusCounts['rejected'] ?? 0,
                'last24h' => $messages24h,
            ],
            'logs' => [
                'last24h' => $logs24h,
            ],
            'health' => $this->health(),
        ];
    }

    public function messagesSeries(array $user, int $days = 7): array
    {
        $this->acl->ensure($user['role'] ?? 'user', 'audit:read');
        $days = max(1, min(30, $days));
        $since = time() - ($days - 1) * 86400;
        $sinceStr = date('Y-m-d 00:00:00', $since);
        $stmt = $this->pdo->prepare('SELECT created_at, status FROM messages WHERE (deleted_at IS NULL OR deleted_at IS NULL) AND created_at >= ?');
        $stmt->execute([$sinceStr]);
        $rows = $stmt->fetchAll();
        $series = [];
        for ($i = 0; $i < $days; $i++) {
            $d = date('Y-m-d', $since + $i * 86400);
            $series[$d] = ['date' => $d, 'approved' => 0, 'pending' => 0, 'rejected' => 0, 'total' => 0];
        }
        foreach ($rows as $row) {
            $d = substr((string)$row['created_at'], 0, 10);
            if (!isset($series[$d])) continue;
            $status = (string)$row['status'];
            $series[$d]['total'] += 1;
            if (isset($series[$d][$status])) $series[$d][$status] += 1;
        }
        return array_values($series);
    }

    public function auditSeries(array $user, int $days = 7): array
    {
        $this->acl->ensure($user['role'] ?? 'user', 'audit:read');
        $days = max(1, min(30, $days));
        $since = time() - ($days - 1) * 86400;
        $sinceStr = date('Y-m-d 00:00:00', $since);
        $stmt = $this->pdo->prepare('SELECT created_at, action FROM audit_logs WHERE created_at >= ?');
        $stmt->execute([$sinceStr]);
        $rows = $stmt->fetchAll();
        $series = [];
        for ($i = 0; $i < $days; $i++) {
            $d = date('Y-m-d', $since + $i * 86400);
            $series[$d] = ['date' => $d, 'total' => 0];
        }
        foreach ($rows as $row) {
            $d = substr((string)$row['created_at'], 0, 10);
            if (!isset($series[$d])) continue;
            $series[$d]['total'] += 1;
        }
        return array_values($series);
    }

    public function usersSeries(array $user, int $days = 7): array
    {
        $this->acl->ensure($user['role'] ?? 'user', 'audit:read');
        $days = max(1, min(30, $days));
        $since = time() - ($days - 1) * 86400;
        $sinceStr = date('Y-m-d 00:00:00', $since);
        $stmt = $this->pdo->prepare('SELECT created_at FROM users WHERE created_at >= ?');
        $stmt->execute([$sinceStr]);
        $rows = $stmt->fetchAll();
        $series = [];
        for ($i = 0; $i < $days; $i++) {
            $d = date('Y-m-d', $since + $i * 86400);
            $series[$d] = ['date' => $d, 'total' => 0];
        }
        foreach ($rows as $row) {
            $d = substr((string)$row['created_at'], 0, 10);
            if (!isset($series[$d])) continue;
            $series[$d]['total'] += 1;
        }
        return array_values($series);
    }

    private function health(): array
    {
        try {
            $ok = (bool)$this->pdo->query('SELECT 1')->fetchColumn();
            return ['db' => $ok];
        } catch (\Throwable) {
            return ['db' => false];
        }
    }

    /**
     * Public counts for homepage (no auth required)
     */
    public function publicCounts(): array
    {
        $stmt = $this->pdo->query('SELECT status, COUNT(*) c FROM messages WHERE deleted_at IS NULL OR deleted_at IS NULL GROUP BY status');
        $counts = ['approved' => 0, 'pending' => 0, 'rejected' => 0];
        foreach ($stmt->fetchAll() as $row) {
            $status = (string)$row['status'];
            if (isset($counts[$status])) {
                $counts[$status] = (int)$row['c'];
            }
        }
        $counts['total'] = $counts['approved'] + $counts['pending'] + $counts['rejected'];
        return $counts;
    }

    private function getDbVersion(string $driver): string
    {
        try {
            if ($driver === 'mysql') {
                return (string)$this->pdo->query('SELECT VERSION()')->fetchColumn();
            }
            if ($driver === 'sqlite') {
                return 'SQLite ' . (string)$this->pdo->query('select sqlite_version()')->fetchColumn();
            }
        } catch (\Throwable) {}
        return $driver;
    }
}

 


