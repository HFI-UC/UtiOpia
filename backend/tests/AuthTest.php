<?php
declare(strict_types=1);

final class AuthTest extends BaseWebTestCase
{
    public function testRegisterRejectsInvalidEmail(): void
    {
        $res = $this->requestJson('POST', '/api/register', [
            'email' => 'foo@bar.com',
            'password' => 'secret123',
            'nickname' => 'Foo',
            'turnstile_token' => 'test'
        ]);
        $this->assertSame(400, $res->getStatusCode());
        $data = $this->json($res);
        $this->assertArrayHasKey('error', $data);
    }

    public function testLoginSuccessAndFail(): void
    {
        $user = $this->createUser('john.doe2023@gdhfi.com', 'Passw0rd!', 'John');
        // fail
        $r1 = $this->requestJson('POST', '/api/login', [ 'email' => $user['email'], 'password' => 'wrong', 'turnstile_token' => 't' ]);
        $this->assertSame(400, $r1->getStatusCode());
        // success
        $r2 = $this->requestJson('POST', '/api/login', [ 'email' => $user['email'], 'password' => 'Passw0rd!', 'turnstile_token' => 't' ]);
        $this->assertSame(200, $r2->getStatusCode());
        $data = $this->json($r2);
        $this->assertArrayHasKey('token', $data);
    }
}


