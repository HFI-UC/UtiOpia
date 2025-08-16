<?php
declare(strict_types=1);

namespace UtiOpia\Services;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as MailException;

final class Mailer
{
	public function __construct(private array $settings, private AuditLogger $logger)
	{
	}

	private function newMailer(): PHPMailer
	{
		$smtp = $this->settings['smtp'] ?? [];
		$mail = new PHPMailer(true);
		$mail->isSMTP();
		$mail->Host = (string)($smtp['host'] ?? '');
		$mail->SMTPAuth = true;
		$mail->Username = (string)($smtp['username'] ?? '');
		$mail->Password = (string)($smtp['password'] ?? '');
		$secure = (string)($smtp['secure'] ?? 'tls');
		if ($secure === 'ssl') {
			$mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
		} else {
			$mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
		}
		$mail->Port = (int)($smtp['port'] ?? 587);
		$mail->CharSet = 'UTF-8';
		$mail->setFrom((string)($smtp['from_email'] ?? 'no-reply@example.com'), (string)($smtp['from_name'] ?? 'UtiOpia'));
		return $mail;
	}

	public function send(string|array $to, string $subject, string $htmlBody, bool $isHtml = true): bool
	{
		$mail = $this->newMailer();
		try {
			$recipients = is_array($to) ? $to : [$to];
			foreach ($recipients as $addr) {
				if (is_string($addr) && filter_var($addr, FILTER_VALIDATE_EMAIL)) {
					$mail->addAddress($addr);
				}
			}
			if (count($mail->getToAddresses()) === 0) {
				$this->logger->log('mail.skip', null, ['subject' => $subject, 'reason' => 'no_valid_recipient']);
				return false;
			}
			$mail->isHTML($isHtml);
			$mail->Subject = $subject;
			$mail->Body = $htmlBody;
			if ($isHtml) $mail->AltBody = strip_tags($htmlBody);
			$mail->send();
			$this->logger->log('mail.sent', null, ['subject' => $subject, 'to' => $recipients]);
			return true;
		} catch (MailException $e) {
			$this->logger->log('mail.failed', null, ['subject' => $subject, 'error' => $e->getMessage()]);
			return false;
		}
	}

	private function baseTemplate(string $title, string $contentHtml, array $buttons = []): string
	{
		$site = $this->settings['site'] ?? ['name' => 'UtiOpia'];
		$year = date('Y');
		$btns = '';
		foreach ($buttons as $b) {
			$text = (string)($b['text'] ?? '查看');
			$url = (string)($b['url'] ?? '#');
			$color = (string)($b['color'] ?? '#2f54eb');
			$btns .= '<a href="' . htmlspecialchars($url) . '" style="display:inline-block;background:' . htmlspecialchars($color) . ';color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;margin:4px 6px;">' . htmlspecialchars($text) . '</a>';
		}
		return <<<HTML
<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>{$title}</title>
</head>
<body style="background:#f6f7fb;margin:0;padding:0;font-family:Segoe UI,Arial,Helvetica,sans-serif;color:#2a2a2a;">
  <div style="max-width:640px;margin:24px auto;background:#ffffff;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,0.06);overflow:hidden;">
    <div style="background:linear-gradient(135deg,#2f54eb,#9254de);padding:18px 22px;color:#fff;">
      <h2 style="margin:0;font-weight:600;">{$title}</h2>
    </div>
    <div style="padding:22px;line-height:1.7;">
      {$contentHtml}
      <div style="margin-top:16px;">{$btns}</div>
    </div>
    <div style="padding:14px 22px;background:#fafafa;color:#888;font-size:12px;border-top:1px solid #f0f0f0;">
      © {$year} {$site['name']} · 自动通知邮件，请勿直接回复
    </div>
  </div>
</body></html>
HTML;
	}

	public function sendMessageStatusChange(string $to, string $nickname, int $messageId, string $status, string $reason = ''): bool
	{
		$site = $this->settings['site'] ?? ['url' => ''];
		$statusText = match ($status) {
			'approved' => '已通过审核',
			'rejected' => '未通过审核',
			'pending' => '待审核',
			default => $status,
		};
		$title = '留言状态变更通知';
		$reasonHtml = $reason !== '' ? '<p><strong>原因：</strong>' . htmlspecialchars($reason) . '</p>' : '';
		$content = '<p>亲爱的 <strong>' . htmlspecialchars($nickname) . '</strong>，您的留言状态更新为：<strong>' . htmlspecialchars($statusText) . '</strong>。</p>' . $reasonHtml;
		$buttons = [ ['text' => '查看留言墙', 'url' => (string)($site['url'] ?? '')] ];
		return $this->send($to, $title, $this->baseTemplate($title, $content, $buttons));
	}

	/**
	 * 更精细的模版：提交/通过/拒绝
	 */
	private function excerpt(string $text, int $len = 80): string
	{
		$text = trim(strip_tags($text));
		if (function_exists('mb_strlen') && function_exists('mb_substr')) {
			return mb_strlen($text) > $len ? mb_substr($text, 0, $len) . '…' : $text;
		}
		return strlen($text) > $len ? substr($text, 0, $len) . '…' : $text;
	}

	public function sendMessageSubmitted(string $to, string $nickname, int $messageId, string $contentText): bool
	{
		$site = $this->settings['site'] ?? ['url' => ''];
		$title = '已提交：留言等待审核';
		$excerpt = $this->excerpt($contentText);
		$content = '<p>亲爱的 <strong>' . htmlspecialchars($nickname) . '</strong>，您刚刚提交了一条留言，已进入审核队列。</p>'
			. '<p><strong>内容摘要：</strong>' . htmlspecialchars($excerpt) . '</p>';
		$buttons = [ ['text' => '查看留言墙', 'url' => (string)($site['url'] ?? '')] ];
		return $this->send($to, $title, $this->baseTemplate($title, $content, $buttons));
	}

	public function sendMessageApproved(string $to, string $nickname, int $messageId, string $contentText): bool
	{
		$site = $this->settings['site'] ?? ['url' => ''];
		$title = '已通过：留言审核通过';
		$excerpt = $this->excerpt($contentText);
		$content = '<p>亲爱的 <strong>' . htmlspecialchars($nickname) . '</strong>，您的留言已通过审核，现已对外展示。</p>'
			. '<p><strong>内容摘要：</strong>' . htmlspecialchars($excerpt) . '</p>';
		$buttons = [ ['text' => '查看留言', 'url' => (string)($site['url'] ?? '')] ];
		return $this->send($to, $title, $this->baseTemplate($title, $content, $buttons));
	}

	public function sendMessageRejected(string $to, string $nickname, int $messageId, string $contentText, string $reason = ''): bool
	{
		$site = $this->settings['site'] ?? ['url' => ''];
		$title = '未通过：留言审核结果';
		$excerpt = $this->excerpt($contentText);
		$reasonHtml = $reason !== '' ? '<p><strong>原因：</strong>' . htmlspecialchars($reason) . '</p>' : '';
		$content = '<p>亲爱的 <strong>' . htmlspecialchars($nickname) . '</strong>，很抱歉，您的留言未通过审核。</p>'
			. $reasonHtml
			. '<p><strong>内容摘要：</strong>' . htmlspecialchars($excerpt) . '</p>';
		$buttons = [ ['text' => '返回留言墙', 'url' => (string)($site['url'] ?? '')] ];
		return $this->send($to, $title, $this->baseTemplate($title, $content, $buttons));
	}

	public function sendUserRoleChanged(string $to, string $nickname, string $newRole): bool
	{
		$title = '账户角色变更通知';
		$content = '<p>亲爱的 <strong>' . htmlspecialchars($nickname) . '</strong>，您的账户角色已变更为 <strong>' . htmlspecialchars($newRole) . '</strong>。</p>';
		return $this->send($to, $title, $this->baseTemplate($title, $content));
	}

	public function sendUserBanStatus(string $to, string $nickname, bool $banned): bool
	{
		$title = $banned ? '账户封禁通知' : '账户解封通知';
		$content = $banned
			? '<p>亲爱的 <strong>' . htmlspecialchars($nickname) . '</strong>，您的账户已被封禁。如有疑问请联系管理员。</p>'
			: '<p>亲爱的 <strong>' . htmlspecialchars($nickname) . '</strong>，您的账户已解除封禁，可以继续使用平台功能。</p>';
		return $this->send($to, $title, $this->baseTemplate($title, $content));
	}

	public function sendMessagePublishedNotice(string $to, string $nickname, int $messageId, string $contentText): bool
	{
		$site = $this->settings['site'] ?? ['url' => ''];
		$title = '已发布：内容已公开展示';
		$excerpt = $this->excerpt($contentText);
		$content = '<p>亲爱的 <strong>' . htmlspecialchars($nickname) . '</strong>，你的纸条已公开展示。</p>'
			. '<p class="text-muted">请遵守社区规范。如被判定违反规则，管理员可能会将其隐藏。</p>'
			. '<p><strong>内容摘要：</strong>' . htmlspecialchars($excerpt) . '</p>';
		$buttons = [ ['text' => '查看留言墙', 'url' => (string)($site['url'] ?? '')] ];
		return $this->send($to, $title, $this->baseTemplate($title, $content, $buttons));
	}

	public function sendCommentApproved(string $to, string $nickname, int $messageId, int $commentId, string $contentText): bool
	{
		$site = $this->settings['site'] ?? ['url' => ''];
		$title = '评论已通过展示';
		$excerpt = $this->excerpt($contentText);
		$content = '<p>亲爱的 <strong>' . htmlspecialchars($nickname) . '</strong>，您的评论已通过审核并对外展示。</p>'
			. '<p><strong>评论摘要：</strong>' . htmlspecialchars($excerpt) . '</p>';
		$buttons = [ ['text' => '查看评论', 'url' => (string)($site['url'] ?? '')] ];
		return $this->send($to, $title, $this->baseTemplate($title, $content, $buttons));
	}

	public function sendCommentRejected(string $to, string $nickname, int $messageId, int $commentId, string $contentText, string $reason = ''): bool
	{
		$site = $this->settings['site'] ?? ['url' => ''];
		$title = '评论已被隐藏';
		$excerpt = $this->excerpt($contentText);
		$reasonHtml = $reason !== '' ? '<p><strong>原因：</strong>' . htmlspecialchars($reason) . '</p>' : '';
		$content = '<p>亲爱的 <strong>' . htmlspecialchars($nickname) . '</strong>，很抱歉，您的评论未通过审核，已被隐藏。</p>'
			. $reasonHtml
			. '<p><strong>评论摘要：</strong>' . htmlspecialchars($excerpt) . '</p>';
		$buttons = [ ['text' => '返回留言墙', 'url' => (string)($site['url'] ?? '')] ];
		return $this->send($to, $title, $this->baseTemplate($title, $content, $buttons));
	}
}


