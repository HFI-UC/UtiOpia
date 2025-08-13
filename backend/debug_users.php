<?php
declare(strict_types=1);

require __DIR__ . '/vendor/autoload.php';

$app = require __DIR__ . '/tests_bootstrap.php';

use Slim\Psr7\Factory\ServerRequestFactory;
use Firebase\JWT\JWT;

$now = time();
$payload = [
    'iss' => 'utiopia',
    'iat' => $now,
    'exp' => $now + 3600,
    'sub' => 1,
    'role' => 'moderator',
];
$jwt = JWT::encode($payload, 'test_secret', 'HS256');

$factory = new ServerRequestFactory();
$req = $factory->createServerRequest('GET', '/api/users');
$req = $req->withHeader('Authorization', 'Bearer ' . $jwt);

$res = $app->handle($req);

echo "Status: " . $res->getStatusCode() . "\n";
echo (string)$res->getBody() . "\n";


