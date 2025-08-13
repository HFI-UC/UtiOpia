<?php
declare(strict_types=1);

namespace UtiOpia\Services;

use GuzzleHttp\Client;

final class TurnstileService
{
    public function __construct(private array $settings)
    {
    }

    public function assert(string $token): void
    {
        if ($this->settings['turnstile']['secret'] === '') {
            // In dev, allow pass but log
            return;
        }
        $client = new Client();
        $resp = $client->post('https://challenges.cloudflare.com/turnstile/v0/siteverify', [
            'form_params' => [
                'secret' => $this->settings['turnstile']['secret'],
                'response' => $token,
            ]
        ]);
        $data = json_decode((string)$resp->getBody(), true);
        if (($data['success'] ?? false) !== true) {
            throw new \RuntimeException('Turnstile 验证失败');
        }
    }
}


