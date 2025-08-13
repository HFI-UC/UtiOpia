<?php
declare(strict_types=1);

final class MessageTest extends BaseWebTestCase
{
    public function testAnonymousCreateValidation(): void
    {
        $res = $this->requestJson('POST', '/api/messages', [
            'is_anonymous' => true,
            'content' => 'hello',
            'anon_email' => 'invalid@example.com',
            'anon_student_id' => 'GJ201234',
            'anon_passphrase' => 'p'
        ], ['Authorization' => 'Bearer invalid']);
        $data = $this->json($res);
        $this->assertNotEmpty($data);
        $this->assertArrayHasKey('error', $data);
    }

    public function testUpdateAndDeleteOwnAndAnonymous(): void
    {
        // create user and token
        $user = $this->createUser('alice.smith2023@gdhfi.com', 'Passw0rd!', 'Alice');
        $auth = $this->authHeaders($user['id']);
        // create note as user
        $r1 = $this->requestJson('POST', '/api/messages', [ 'content' => 'A', 'image_url' => '', 'turnstile_token' => 't', 'is_anonymous' => false ], $auth);
        $this->assertSame(200, $r1->getStatusCode());
        $id = (int)$this->json($r1)['id'];
        // update own
        $r2 = $this->requestJson('PUT', "/api/messages/{$id}", [ 'content' => 'B', 'turnstile_token' => 't' ], $auth);
        $this->assertSame(200, $r2->getStatusCode());
        // delete own
        $r3 = $this->requestJson('DELETE', "/api/messages/{$id}", [ 'turnstile_token' => 't' ], $auth);
        $this->assertSame(200, $r3->getStatusCode());

        // anonymous create
        $a1 = $this->requestJson('POST', '/api/messages', [
            'is_anonymous' => true,
            'content' => 'C',
            'anon_email' => 'bob.white2023@gdhfi.com',
            'anon_student_id' => 'GJ20120123',
            'anon_passphrase' => 'secret',
            'turnstile_token' => 't'
        ]);
        $this->assertSame(200, $a1->getStatusCode());
        $aid = (int)$this->json($a1)['id'];
        // anonymous update with wrong passphrase
        $a2 = $this->requestJson('PUT', "/api/messages/{$aid}", [ 'content' => 'D', 'anon_passphrase' => 'x', 'turnstile_token' => 't' ]);
        $this->assertSame(400, $a2->getStatusCode());
        $this->assertArrayHasKey('error', $this->json($a2));
        // anonymous update with correct passphrase
        $a3 = $this->requestJson('PUT', "/api/messages/{$aid}", [ 'content' => 'E', 'anon_passphrase' => 'secret', 'turnstile_token' => 't' ]);
        $this->assertSame(200, $a3->getStatusCode());
        // delete with correct passphrase
        $a4 = $this->requestJson('DELETE', "/api/messages/{$aid}", [ 'anon_passphrase' => 'secret', 'turnstile_token' => 't' ]);
        $this->assertSame(200, $a4->getStatusCode());
    }
}


