<?php
declare(strict_types=1);

final class AnnouncementsTest extends BaseWebTestCase
{
    public function testPublicLatestAndVisibilityWindow(): void
    {
        // 插入两条公告：一条不可见，一条在时间窗内可见
        $pdo = $this->db();
        $now = date('Y-m-d H:i:s');
        $past = (new DateTimeImmutable('-1 hour'))->format('Y-m-d H:i:s');
        $future = (new DateTimeImmutable('+1 hour'))->format('Y-m-d H:i:s');
        // 不可见
        $pdo->exec("INSERT INTO announcements(title, content, type, priority, visible, start_at, end_at, link_url, created_by, created_at) VALUES('Hidden','H','info',10,0,NULL,NULL,NULL,NULL,'$now')");
        // 可见且时间窗有效，priority 更高
        $pdo->exec("INSERT INTO announcements(title, content, type, priority, visible, start_at, end_at, link_url, created_by, created_at) VALUES('Shown','S','info',99,1,'$past','$future',NULL,NULL,'$now')");

        // latest 应返回 Shown
        $res = $this->requestJson('GET', '/api/announcements/latest');
        $this->assertSame(200, $res->getStatusCode());
        $data = $this->json($res);
        $this->assertArrayHasKey('item', $data);
        $this->assertNotNull($data['item']);
        $this->assertSame('Shown', $data['item']['title']);

        // listPublic limit=1 也应只返回这条
        $res2 = $this->requestJson('GET', '/api/announcements', null, []);
        $this->assertSame(200, $res2->getStatusCode());
        $list = $this->json($res2);
        $this->assertNotEmpty($list['items'] ?? []);
        $this->assertSame('Shown', $list['items'][0]['title']);
    }

    public function testAdminCrud(): void
    {
        // 创建一个管理员
        $admin = $this->createUser('admin.tester2023@gdhfi.com', 'Passw0rd!', 'Admin', 'moderator');
        $auth = $this->authHeaders($admin['id'], 'moderator');
        // Create
        $create = $this->requestJson('POST', '/api/admin/announcements', [
            'title' => 'New Ann',
            'content' => 'Body',
            'type' => 'warn',
            'priority' => 5,
            'visible' => 1,
        ], $auth);
        $this->assertSame(200, $create->getStatusCode());
        $id = (int)($this->json($create)['id'] ?? 0);
        $this->assertGreaterThan(0, $id);

        // List (admin)
        $list = $this->requestJson('GET', '/api/admin/announcements', null, $auth);
        $this->assertSame(200, $list->getStatusCode());
        $items = $this->json($list)['items'] ?? [];
        $this->assertNotEmpty($items);

        // Update
        $upd = $this->requestJson('PUT', "/api/admin/announcements/{$id}", [ 'priority' => 42, 'visible' => 0 ], $auth);
        $this->assertSame(200, $upd->getStatusCode());

        // Delete
        $del = $this->requestJson('DELETE', "/api/admin/announcements/{$id}", null, $auth);
        $this->assertSame(200, $del->getStatusCode());
    }
}
