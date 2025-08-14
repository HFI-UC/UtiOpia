<?php
declare(strict_types=1);

namespace UtiOpia\Services;

use Qcloud\Cos\Client as CosClient;
use QCloud\COSSTS\Sts;

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
        // 使用 COS SDK 的 getObjectUrl 生成预签名 URL（支持指定 HTTP 方法）
        // 使用 getObjectUrl 生成预签名，HTTP 方法通过 args 指定
        $url = $this->client->getObjectUrl(
            $bucket,
            $key,
            "+{$expiresSeconds} seconds",
            ['Method' => 'PUT']
        );
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

    /**
     * 生成用于前端直传的 STS 临时凭证（限制仅能上传到生成的 key，且仅允许 PutObject 等动作）
     */
    public function issueTempCredentials(int $userId, string $filename, int $maxBytes = 5242880): array
    {
        if ($filename === '') {
            throw new \InvalidArgumentException('缺少文件名');
        }
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        if (!in_array($ext, ['jpg','jpeg','png','gif','webp'])) {
            return ['error' => '不允许的文件类型'];
        }
        $ymd = date('Ymd');
        $uniq = bin2hex(random_bytes(8));
        $key = 'uploads/' . ($userId ?: 'guest') . '/' . $ymd . '/' . $uniq . '.' . $ext;

        $cos = $this->settings['cos'];
        $bucket = $cos['bucket'];
        $region = $cos['region'];
        $config = [
            'url' => 'https://sts.tencentcloudapi.com/',
            'domain' => 'sts.tencentcloudapi.com',
            'proxy' => '',
            'secretId' => $cos['secretId'],
            'secretKey' => $cos['secretKey'],
            'bucket' => $bucket,
            'region' => $region,
            'durationSeconds' => 60,
            'allowPrefix' => [$key],
            'allowActions' => [
                'name/cos:PutObject',
                'name/cos:InitiateMultipartUpload',
                'name/cos:ListMultipartUploads',
                'name/cos:ListParts',
                'name/cos:UploadPart',
                'name/cos:CompleteMultipartUpload',
            ],
            'condition' => [
                'string_like' => ['cos:content-type' => 'image/*'],
                'numeric_less_than_equal' => ['cos:content-length' => $maxBytes],
            ],
        ];
        $sts = new Sts();
        $tempKeys = $sts->getTempKeys($config);
        $publicUrl = sprintf('https://%s.cos.%s.myqcloud.com/%s', $bucket, $region, $key);
        $appId = $cos['appId'] ?? '';
        if (!empty($appId) && !str_contains($bucket, $appId)) {
            $publicUrl = sprintf('https://%s-%s.cos.%s.myqcloud.com/%s', $bucket, $appId, $region, $key);
        }
        return [
            'credentials' => $tempKeys['credentials'] ?? [],
            'startTime' => time(),
            'expiredTime' => $tempKeys['expiredTime'] ?? 0,
            'bucket' => $bucket,
            'region' => $region,
            'key' => $key,
            'public_url' => $publicUrl,
        ];
    }
}


