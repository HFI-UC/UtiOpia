<?php
declare(strict_types=1);

use UtiOpia\Services\LogService;
use UtiOpia\Services\COSService;

final class BanAndLogAndCOSMockTest extends BaseWebTestCase
{
    public function testBanCreateRemoveAndEffect(): void
    {
        $mod = $this->createUser('jack.brown2023@gdhfi.com', 'Passw0rd!', 'Jack', 'moderator');
        $auth = $this->authHeaders($mod['id'], 'moderator');
        // create ban by email
        $b1 = $this->requestJson('POST', '/api/bans', [ 'type' => 'email', 'value' => 'foo.bar2023@gdhfi.com', 'stage' => 1, 'turnstile_token' => 't' ], $auth);
        $this->assertSame(200, $b1->getStatusCode());
        // list bans
        $lb = $this->requestJson('GET', '/api/bans', null, $auth);
        $this->assertSame(200, $lb->getStatusCode());
        $this->assertNotEmpty($this->json($lb)['items'] ?? []);
        // remove ban
        $rb = $this->requestJson('DELETE', '/api/bans', [ 'type' => 'email', 'value' => 'foo.bar2023@gdhfi.com', 'turnstile_token' => 't' ], $auth);
        $this->assertSame(200, $rb->getStatusCode());
    }

    public function testLogListPermission(): void
    {
        $user = $this->createUser('tom.hanks2023@gdhfi.com', 'Passw0rd!', 'Tom');
        $authUser = $this->authHeaders($user['id']);
        $res = $this->requestJson('GET', '/api/logs', null, $authUser);
        $this->assertSame(403, $res->getStatusCode());
    }

    public function testCOSPresignParamValidation(): void
    {
        // 直接实例化服务并调用方法级校验（不触发网络请求）
        $settings = ['cos' => ['region'=>'ap-test','appId'=>'','secretId'=>'id','secretKey'=>'key','bucket'=>'bucket-test']];
        $cos = new COSService($settings);
        $this->expectException(InvalidArgumentException::class);
        $cos->generatePresignedPutUrl(0, '');
    }
}


