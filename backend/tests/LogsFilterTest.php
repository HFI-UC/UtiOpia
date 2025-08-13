<?php
declare(strict_types=1);

final class LogsFilterTest extends BaseWebTestCase
{
    public function testOnlyErrorFilter(): void
    {
        // 触发一次未授权错误，便于产生日志 action=error
        $res0 = $this->requestJson('GET', '/api/users');
        $this->assertSame(401, $res0->getStatusCode());

        // 以版主身份读取 error 日志
        $mod = $this->createUser('logan.lee2023@gdhfi.com', 'Passw0rd!', 'Logan', 'moderator');
        $auth = $this->authHeaders($mod['id'], 'moderator');
        $res = $this->requestJson('GET', '/api/logs', null, $auth);
        $this->assertSame(200, $res->getStatusCode());
        $items = $this->json($res)['items'] ?? [];
        $this->assertIsArray($items);

        // only_error=1 过滤
        $res2 = $this->requestJson('GET', '/api/logs?only_error=1', null, $auth);
        $this->assertSame(200, $res2->getStatusCode());
        $items2 = $this->json($res2)['items'] ?? [];
        $this->assertIsArray($items2);
    }
}


