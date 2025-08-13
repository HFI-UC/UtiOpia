<?php
declare(strict_types=1);

final class ModerationTest extends BaseWebTestCase
{
    public function testApproveRejectFlow(): void
    {
        $user = $this->createUser('mod.user2023@gdhfi.com', 'Passw0rd!', 'Mod', 'moderator');
        $auth = $this->authHeaders($user['id'], 'moderator');
        // create anonymous note
        $a1 = $this->requestJson('POST', '/api/messages', [
            'is_anonymous' => true,
            'content' => '待审核',
            'anon_email' => 'eva.green2023@gdhfi.com',
            'anon_student_id' => 'GJ20120124',
            'anon_passphrase' => 'secret',
            'turnstile_token' => 't'
        ]);
        $id = (int)$this->json($a1)['id'];
        // approve
        $ok1 = $this->requestJson('POST', "/api/messages/{$id}/approve", [ 'turnstile_token' => 't' ], $auth);
        $this->assertSame(200, $ok1->getStatusCode());
        // reject
        $ok2 = $this->requestJson('POST', "/api/messages/{$id}/reject", [ 'reason' => 'bad', 'turnstile_token' => 't' ], $auth);
        $this->assertSame(200, $ok2->getStatusCode());
    }
}


