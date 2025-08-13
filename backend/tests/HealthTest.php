<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use Slim\Factory\AppFactory;

final class HealthTest extends TestCase
{
    public function testHealthRoute(): void
    {
        $app = require __DIR__ . '/../tests_bootstrap.php';

        $request = (new Slim\Psr7\Factory\ServerRequestFactory())->createServerRequest('GET', '/health');
        $response = $app->handle($request);
        $this->assertSame(200, $response->getStatusCode());
        $json = json_decode((string)$response->getBody(), true);
        $this->assertTrue($json['ok']);
    }
}


