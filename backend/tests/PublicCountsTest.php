<?php
declare(strict_types=1);

final class PublicCountsTest extends BaseWebTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $pdo = $this->db();
        if ($pdo) {
            // 清理并插入测试数据
            try { $pdo->exec('DELETE FROM messages'); } catch (\Throwable) {}
            $now = date('Y-m-d H:i:s');
            // 3 条 approved，2 条 rejected，1 条 pending
            $ins = $pdo->prepare('INSERT INTO messages(user_id, is_anonymous, content, image_url, status, created_at) VALUES(NULL,1,?,?,?,?)');
            $ins->execute(['a1', null, 'approved', $now]);
            $ins->execute(['a2', null, 'approved', $now]);
            $ins->execute(['a3', null, 'approved', $now]);
            $ins->execute(['r1', null, 'rejected', $now]);
            $ins->execute(['r2', null, 'rejected', $now]);
            $ins->execute(['p1', null, 'pending',  $now]);
        }
    }

    public function testPublicCountsStructureAndValues(): void
    {
        $res = $this->requestJson('GET', '/api/stats/public-counts');
        $this->assertSame(200, $res->getStatusCode());
        $data = $this->json($res);

        // 结构：必须包含 approved/hidden/total，不应包含 pending
        $this->assertArrayHasKey('approved', $data);
        $this->assertArrayHasKey('hidden', $data);
        $this->assertArrayHasKey('total', $data);
        $this->assertArrayNotHasKey('pending', $data);

        // 数值：approved=3, hidden(=rejected)=2, total=6（未删除）
        $this->assertSame(3, (int)$data['approved']);
        $this->assertSame(2, (int)$data['hidden']);
        $this->assertSame(6, (int)$data['total']);
    }
}
