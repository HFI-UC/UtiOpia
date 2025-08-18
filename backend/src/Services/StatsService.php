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
                // 语义统一：rejected == hidden
                'hidden' => $statusCounts['rejected'] ?? 0,
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

    public function weeklySeries(array $user, int $weekOffset = 0): array
    {
        $this->acl->ensure($user['role'] ?? 'user', 'audit:read');
        
        // 计算指定周的开始和结束日期
        $currentWeekStart = date('Y-m-d', strtotime('monday this week'));
        $targetWeekStart = date('Y-m-d', strtotime("monday this week -{$weekOffset} weeks"));
        $targetWeekEnd = date('Y-m-d', strtotime("sunday this week -{$weekOffset} weeks"));
        
        // 生成一周的日期数组
        $dates = [];
        $currentDate = strtotime($targetWeekStart);
        $endDate = strtotime($targetWeekEnd);
        
        while ($currentDate <= $endDate) {
            $dates[] = date('Y-m-d', $currentDate);
            $currentDate = strtotime('+1 day', $currentDate);
        }
        
        // 查询每天的纸条数据
        $stmt = $this->pdo->prepare('
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as total,
                COUNT(CASE WHEN status = "approved" THEN 1 END) as approved,
                COUNT(CASE WHEN status = "rejected" THEN 1 END) as hidden
            FROM messages 
            WHERE DATE(created_at) BETWEEN ? AND ?
            AND (deleted_at IS NULL OR deleted_at IS NULL)
            GROUP BY DATE(created_at)
            ORDER BY date
        ');
        $stmt->execute([$targetWeekStart, $targetWeekEnd]);
        $rows = $stmt->fetchAll();
        
        // 构建结果数组，确保每天都有数据
        $result = [];
        foreach ($dates as $date) {
            $dayData = null;
            foreach ($rows as $row) {
                if ($row['date'] === $date) {
                    $dayData = $row;
                    break;
                }
            }
            
            if ($dayData) {
                $result[] = [
                    'date' => date('m-d', strtotime($date)), // 只显示月-日
                    'messages' => (int)$dayData['total'],
                    'approved' => (int)$dayData['approved'],
                    'hidden' => (int)$dayData['hidden']
                ];
            } else {
                $result[] = [
                    'date' => date('m-d', strtotime($date)), // 只显示月-日
                    'messages' => 0,
                    'approved' => 0,
                    'hidden' => 0
                ];
            }
        }
        
        return $result;
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
     * Quick stats for dashboard
     */
    public function quickStats(array $user): array
    {
        $this->acl->ensure($user['role'] ?? 'user', 'audit:read');
        
        // 审核效率统计
        $review = $this->getReviewStats();
        
        // 用户活跃度统计
        $activity = $this->getActivityStats();
        
        // 内容质量统计
        $quality = $this->getQualityStats();
        
        return [
            'review' => $review,
            'activity' => $activity,
            'quality' => $quality
        ];
    }

    /**
     * Public counts for homepage (no auth required)
     */
    public function publicCounts(): array
    {
        // Aggregate by status; treat rejected as "hidden" for public semantics
        $stmt = $this->pdo->query('SELECT status, COUNT(*) AS c FROM messages WHERE deleted_at IS NULL GROUP BY status');
        $approved = 0;
        $hidden = 0; // mapped from rejected
        foreach ($stmt->fetchAll() as $row) {
            $status = (string)$row['status'];
            $c = (int)$row['c'];
            if ($status === 'approved') $approved = $c;
            if ($status === 'rejected') $hidden = $c;
        }
        // Total should include all non-deleted messages regardless of status
        $total = (int)$this->pdo->query('SELECT COUNT(*) FROM messages WHERE deleted_at IS NULL')->fetchColumn();
        return [
            'approved' => $approved,
            'hidden' => $hidden,
            'total' => $total,
        ];
    }

    /**
     * 获取审核效率统计
     */
    private function getReviewStats(): array
    {
        // 平均审核时间（小时）
        $stmt = $this->pdo->query('
            SELECT AVG(TIMESTAMPDIFF(HOUR, m.created_at, m.reviewed_at)) as avg_time
            FROM messages m 
            WHERE m.reviewed_at IS NOT NULL 
            AND m.status IN ("approved", "rejected")
        ');
        $avgTime = (float)$stmt->fetchColumn() ?: 0;
        
        // 通过率
        $stmt = $this->pdo->query('
            SELECT 
                COUNT(CASE WHEN status = "approved" THEN 1 END) as approved_count,
                COUNT(CASE WHEN status IN ("approved", "rejected") THEN 1 END) as total_reviewed
            FROM messages 
            WHERE reviewed_at IS NOT NULL
        ');
        $row = $stmt->fetch();
        $approvedCount = (int)$row['approved_count'];
        $totalReviewed = (int)$row['total_reviewed'];
        $approvalRate = $totalReviewed > 0 ? round(($approvedCount / $totalReviewed) * 100) : 0;
        
        // 今日已审核
        $stmt = $this->pdo->query('
            SELECT COUNT(*) as count
            FROM messages 
            WHERE reviewed_at >= CURDATE()
        ');
        $todayReviewed = (int)$stmt->fetchColumn();
        
        return [
            'avgTime' => round($avgTime, 1),
            'approvalRate' => $approvalRate,
            'todayReviewed' => $todayReviewed
        ];
    }
    
    /**
     * 获取用户活跃度统计
     */
    private function getActivityStats(): array
    {
        // 日活跃用户（今日有操作的用户）
        $stmt = $this->pdo->query('
            SELECT COUNT(DISTINCT user_id) as count
            FROM audit_logs 
            WHERE user_id IS NOT NULL 
            AND created_at >= CURDATE()
        ');
        $dailyActive = (int)$stmt->fetchColumn();
        
        // 周活跃用户（本周有操作的用户）
        $stmt = $this->pdo->query('
            SELECT COUNT(DISTINCT user_id) as count
            FROM audit_logs 
            WHERE user_id IS NOT NULL 
            AND created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
        ');
        $weeklyActive = (int)$stmt->fetchColumn();
        
        // 月活跃用户（本月有操作的用户）
        $stmt = $this->pdo->query('
            SELECT COUNT(DISTINCT user_id) as count
            FROM audit_logs 
            WHERE user_id IS NOT NULL 
            AND created_at >= DATE_FORMAT(CURDATE(), "%Y-%m-01")
        ');
        $monthlyActive = (int)$stmt->fetchColumn();
        
        return [
            'dailyActive' => $dailyActive,
            'weeklyActive' => $weeklyActive,
            'monthlyActive' => $monthlyActive
        ];
    }
    
    /**
     * 获取内容质量统计
     */
    private function getQualityStats(): array
    {
        // 平均字数
        $stmt = $this->pdo->query('
            SELECT AVG(CHAR_LENGTH(content)) as avg_length
            FROM messages 
            WHERE deleted_at IS NULL
        ');
        $avgWordCount = (int)$stmt->fetchColumn() ?: 0;
        
        // 包含图片的百分比
        $stmt = $this->pdo->query('
            SELECT 
                COUNT(CASE WHEN image_url IS NOT NULL AND image_url != "" THEN 1 END) as with_image,
                COUNT(*) as total
            FROM messages 
            WHERE deleted_at IS NULL
        ');
        $row = $stmt->fetch();
        $withImage = (int)$row['with_image'];
        $total = (int)$row['total'];
        $imagePercentage = $total > 0 ? round(($withImage / $total) * 100) : 0;
        
        // 匿名发布的百分比
        $stmt = $this->pdo->query('
            SELECT 
                COUNT(CASE WHEN is_anonymous = 1 THEN 1 END) as anonymous,
                COUNT(*) as total
            FROM messages 
            WHERE deleted_at IS NULL
        ');
        $row = $stmt->fetch();
        $anonymous = (int)$row['anonymous'];
        $total = (int)$row['total'];
        $anonymousPercentage = $total > 0 ? round(($anonymous / $total) * 100) : 0;
        
        return [
            'avgWordCount' => $avgWordCount,
            'imagePercentage' => $imagePercentage,
            'anonymousPercentage' => $anonymousPercentage
        ];
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

 


