<?php
declare(strict_types=1);

final class AdminTest extends BaseWebTestCase
{
    public function testListUsersPermission(): void
    {
        // seed users
        $u1 = $this->createUser('admin.moderator2023@gdhfi.com', 'Passw0rd!', 'Admin', 'moderator');
        $u2 = $this->createUser('common.user2023@gdhfi.com', 'Passw0rd!', 'User');

        // moderator can list
        $resOk = $this->requestJson('GET', '/api/users', null, $this->authHeaders($u1['id'], 'moderator'));
        $this->assertSame(200, $resOk->getStatusCode());
        $items = $this->json($resOk)['items'] ?? [];
        $this->assertIsArray($items);

        // normal user forbidden
        $resNo = $this->requestJson('GET', '/api/users', null, $this->authHeaders($u2['id'], 'user'));
        $this->assertSame(403, $resNo->getStatusCode());
    }

    public function testUpdateUserAndBanUnban(): void
    {
        $mod = $this->createUser('boss.moderator2023@gdhfi.com', 'Passw0rd!', 'Boss', 'moderator');
        $target = $this->createUser('target.user2023@gdhfi.com', 'Passw0rd!', 'Target');
        $auth = $this->authHeaders($mod['id'], 'moderator');

        // update role to moderator
        $r1 = $this->requestJson('PUT', "/api/users/{$target['id']}", [ 'role' => 'moderator', 'turnstile_token' => 't' ], $auth);
        $this->assertSame(200, $r1->getStatusCode());

        // invalid role -> 400
        $rBad = $this->requestJson('PUT', "/api/users/{$target['id']}", [ 'role' => 'hacker', 'turnstile_token' => 't' ], $auth);
        $this->assertSame(400, $rBad->getStatusCode());

        // ban
        $banRes = $this->requestJson('POST', "/api/users/{$target['id']}/ban", [ 'turnstile_token' => 't' ], $auth);
        $this->assertSame(200, $banRes->getStatusCode());
        $row = $this->db()->query('SELECT banned FROM users WHERE id = '.$target['id'])->fetch();
        $this->assertEquals(1, (int)($row['banned'] ?? 0));

        // unban
        $unbanRes = $this->requestJson('POST', "/api/users/{$target['id']}/unban", [ 'turnstile_token' => 't' ], $auth);
        $this->assertSame(200, $unbanRes->getStatusCode());
        $row2 = $this->db()->query('SELECT banned FROM users WHERE id = '.$target['id'])->fetch();
        $this->assertEquals(0, (int)($row2['banned'] ?? 1));
    }
}


