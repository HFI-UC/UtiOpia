<?php
declare(strict_types=1);

namespace UtiOpia\Services;

use Qcloud\Cos\Client as CosClient;

final class COSService
{
    private CosClient $client;

    public function __construct(private array $settings)
    {
        $cos = $settings['cos'];
        $this->client = new CosClient([
            'region' => $cos['region'],
            'schema' => 'https',
            'credentials' => [
                'secretId' => $cos['secretId'],
                'secretKey' => $cos['secretKey'],
            ],
        ]);
    }

    public function generatePresignedPutUrl(int $userId, string $filename, int $expiresSeconds = 30): array
    {
        if ($filename === '') {
            throw new \InvalidArgumentException('缺少文件名');
        }
        $key = 'uploads/' . $userId . '/' . date('Ymd') . '/' . bin2hex(random_bytes(8)) . '-' . basename($filename);
        $bucket = $this->settings['cos']['bucket'];
        $cmd = $this->client->getCommand('putObject', [
            'Bucket' => $bucket,
            'Key' => $key,
            'ACL' => 'public-read',
            'ContentType' => 'image/*',
        ]);
        $request = $this->client->createPresignedRequest($cmd, "+{$expiresSeconds} seconds");
        $url = (string)$request->getUri();
        $cosRegion = $this->settings['cos']['region'];
        $appId = $this->settings['cos']['appId'] ?? '';
        $bucket = $this->settings['cos']['bucket'];
        $publicUrl = sprintf('https://%s.cos.%s.myqcloud.com/%s', $bucket, $cosRegion, $key);
        if (!empty($appId) && !str_contains($bucket, $appId)) {
            $publicUrl = sprintf('https://%s-%s.cos.%s.myqcloud.com/%s', $bucket, $appId, $cosRegion, $key);
        }
        return [
            'upload_url' => $url,
            'key' => $key,
            'expires_in' => $expiresSeconds,
            'public_url' => $publicUrl,
            'headers' => [
                'Content-Type' => 'image/*'
            ]
        ];
    }
}


