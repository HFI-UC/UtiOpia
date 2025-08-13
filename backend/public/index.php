<?php
declare(strict_types=1);

use Dotenv\Dotenv;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Factory\AppFactory;
use UtiOpia\Middleware\ErrorMiddleware as UErrorMiddleware;
use UtiOpia\Middleware\RequestLogMiddleware;

require __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->safeLoad();

// Container
$container = new \DI\Container();
AppFactory::setContainer($container);
$app = AppFactory::create();
$app->addBodyParsingMiddleware();
$app->addRoutingMiddleware();

// CORS
$app->add(function (Request $request, Response $response, callable $next) {
    $response = $response
        ->withHeader('Access-Control-Allow-Origin', $_ENV['CORS_ORIGIN'] ?? '*')
        ->withHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    if ($request->getMethod() === 'OPTIONS') {
        return $response;
    }
    return $next($request, $response);
});

// Dependencies
$container->set('settings', function () {
    return [
        'db' => [
            'dsn' => sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $_ENV['DB_HOST'] ?? '127.0.0.1', $_ENV['DB_PORT'] ?? '3306', $_ENV['DB_NAME'] ?? 'utiopia'),
            'user' => $_ENV['DB_USER'] ?? 'root',
            'pass' => $_ENV['DB_PASS'] ?? '',
        ],
        'jwt' => [
            'secret' => $_ENV['JWT_SECRET'] ?? 'devsecret',
            'issuer' => 'utiopia',
            'ttl' => 3600 * 24 * 7,
        ],
        'cos' => [
            'region' => $_ENV['COS_REGION'] ?? '',
            'appId' => $_ENV['COS_APP_ID'] ?? '',
            'secretId' => $_ENV['COS_SECRET_ID'] ?? '',
            'secretKey' => $_ENV['COS_SECRET_KEY'] ?? '',
            'bucket' => $_ENV['COS_BUCKET'] ?? '',
        ],
        'turnstile' => [
            'secret' => $_ENV['TURNSTILE_SECRET'] ?? '',
        ],
        'smtp' => [
            'host' => $_ENV['SMTP_HOST'] ?? '',
            'port' => (int)($_ENV['SMTP_PORT'] ?? 587),
            'secure' => $_ENV['SMTP_SECURE'] ?? 'tls',
            'username' => $_ENV['SMTP_USERNAME'] ?? '',
            'password' => $_ENV['SMTP_PASSWORD'] ?? '',
            'from_email' => $_ENV['SMTP_FROM_EMAIL'] ?? 'no-reply@example.com',
            'from_name' => $_ENV['SMTP_FROM_NAME'] ?? 'UtiOpia',
        ],
        'site' => [
            'name' => $_ENV['SITE_NAME'] ?? 'UtiOpia',
            'url' => $_ENV['SITE_URL'] ?? 'http://localhost:5173',
        ],
    ];
});

$container->set(PDO::class, function ($c) {
    $settings = $c->get('settings')['db'];
    $pdo = new PDO($settings['dsn'], $settings['user'], $settings['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    return $pdo;
});

// Domain services
$container->set(\UtiOpia\Services\AuditLogger::class, fn($c) => new \UtiOpia\Services\AuditLogger($c->get(PDO::class)));
$container->set(\UtiOpia\Services\ACL::class, fn() => new \UtiOpia\Services\ACL());
$container->set(\UtiOpia\Services\TurnstileService::class, fn($c) => new \UtiOpia\Services\TurnstileService($c->get('settings')));
$container->set(\UtiOpia\Services\COSService::class, fn($c) => new \UtiOpia\Services\COSService($c->get('settings')));
$container->set(\UtiOpia\Services\AuthService::class, function ($c) {
    return new \UtiOpia\Services\AuthService($c->get(PDO::class), $c->get('settings'), $c->get(\UtiOpia\Services\AuditLogger::class), $c->get(\UtiOpia\Services\ACL::class));
});
$container->set(\UtiOpia\Services\MessageService::class, function ($c) {
    return new \UtiOpia\Services\MessageService($c->get(PDO::class), $c->get(\UtiOpia\Services\AuditLogger::class), $c->get(\UtiOpia\Services\ACL::class));
});
$container->set(\UtiOpia\Services\UserService::class, function ($c) {
    return new \UtiOpia\Services\UserService($c->get(PDO::class), $c->get(\UtiOpia\Services\AuditLogger::class), $c->get(\UtiOpia\Services\ACL::class), $c->get(\UtiOpia\Services\Mailer::class));
});
$container->set(\UtiOpia\Services\ModerationService::class, function ($c) {
    return new \UtiOpia\Services\ModerationService(
        $c->get(PDO::class),
        $c->get(\UtiOpia\Services\AuditLogger::class),
        $c->get(\UtiOpia\Services\ACL::class),
        $c->get(\UtiOpia\Services\Mailer::class)
    );
});
$container->set(\UtiOpia\Services\LogService::class, function ($c) {
    return new \UtiOpia\Services\LogService($c->get(PDO::class), $c->get(\UtiOpia\Services\ACL::class));
});
$container->set(\UtiOpia\Services\Mailer::class, function ($c) {
    return new \UtiOpia\Services\Mailer($c->get('settings'), $c->get(\UtiOpia\Services\AuditLogger::class));
});

// Error middleware (after services are available)
$app->add(new UErrorMiddleware($container->get(\UtiOpia\Services\AuditLogger::class)));
// Request logging middleware
$app->add(new RequestLogMiddleware($container->get(\UtiOpia\Services\AuditLogger::class)));

// Register routes
\UtiOpia\Routes::register($app);

$errorMiddleware = $app->addErrorMiddleware(true, true, true);

$app->run();


