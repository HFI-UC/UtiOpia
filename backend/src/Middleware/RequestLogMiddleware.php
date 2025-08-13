<?php
declare(strict_types=1);

namespace UtiOpia\Middleware;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface as Handler;
use UtiOpia\Services\AuditLogger;

final class RequestLogMiddleware implements MiddlewareInterface
{
    public function __construct(private AuditLogger $logger)
    {
    }

    public function process(Request $request, Handler $handler): Response
    {
        $start = microtime(true);
        $body = $request->getParsedBody();
        $bodySafe = $this->sanitize($body);
        $headers = [];
        foreach ($request->getHeaders() as $k => $v) {
            $headers[$k] = implode(';', $v);
        }
        $meta = [
            'path' => (string)$request->getUri(),
            'method' => $request->getMethod(),
            'ip' => function_exists('getClientIP') ? getClientIP() : ($_SERVER['REMOTE_ADDR'] ?? ''),
            'get' => $_GET ?? [],
            'post' => $bodySafe,
            'server' => $this->sanitize($_SERVER ?? []),
            'headers' => $this->sanitize($headers),
        ];
        $this->logger->log('request.in', null, $meta);
        $response = $handler->handle($request);
        $durationMs = (int)((microtime(true) - $start) * 1000);
        $this->logger->log('request.out', null, [
            'path' => $meta['path'],
            'method' => $meta['method'],
            'status' => $response->getStatusCode(),
            'duration_ms' => $durationMs,
        ]);
        return $response;
    }

    private function sanitize($data)
    {
        if (is_array($data)) {
            $out = [];
            foreach ($data as $k => $v) {
                if (is_string($k) && preg_match('/password|passwd|secret|token|authorization/i', $k)) {
                    $out[$k] = '***';
                } else {
                    $out[$k] = $this->sanitize($v);
                }
            }
            return $out;
        }
        if (is_string($data)) {
            if (strlen($data) > 2048) return substr($data, 0, 2048) . '…';
            return $data;
        }
        return $data;
    }
}


