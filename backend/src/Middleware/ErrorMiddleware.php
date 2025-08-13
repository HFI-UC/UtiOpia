<?php
declare(strict_types=1);

namespace UtiOpia\Middleware;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface as Handler;
use Slim\Psr7\Response as SlimResponse;
use UtiOpia\Services\AuditLogger;

final class ErrorMiddleware implements MiddlewareInterface
{
    public function __construct(private AuditLogger $logger)
    {
    }

    public function process(Request $request, Handler $handler): Response
    {
        try {
            return $handler->handle($request);
        } catch (\Throwable $e) {
            $status = 500;
            $message = '服务器错误';
            $msg = $e->getMessage();
            if ($msg === '未授权') { $status = 401; $message = $msg; }
            if ($msg === '权限不足') { $status = 403; $message = $msg; }
            if ($e instanceof \Respect\Validation\Exceptions\ValidationException) { $status = 400; $message = '参数不合法'; }
            $this->logger->log('error', null, [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'path' => (string)$request->getUri(),
            ]);
            $res = new SlimResponse($status);
            $res->getBody()->write(json_encode(['error' => $message], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type', 'application/json');
        }
    }
}


