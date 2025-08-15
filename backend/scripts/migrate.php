<?php
declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->safeLoad();

$dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $_ENV['DB_HOST'] ?? '127.0.0.1', $_ENV['DB_PORT'] ?? '3306', $_ENV['DB_NAME'] ?? 'utiopia');
$pdo = new PDO($dsn, $_ENV['DB_USER'] ?? 'root', $_ENV['DB_PASS'] ?? '', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

$sql = [];

$sql[] = <<<SQL
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(50) NOT NULL,
  student_id VARCHAR(20) NULL,
  role ENUM('super_admin','moderator','user') NOT NULL DEFAULT 'user',
  banned TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  INDEX idx_student_id(student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
SQL;

$sql[] = <<<SQL
CREATE TABLE IF NOT EXISTS messages (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  is_anonymous TINYINT(1) NOT NULL DEFAULT 0,
  anon_email VARCHAR(255) NULL,
  anon_student_id VARCHAR(32) NULL,
  anon_passphrase_hash VARCHAR(255) NULL,
  content VARCHAR(500) NOT NULL,
  image_url VARCHAR(1024) NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  reject_reason VARCHAR(255) NULL,
  reviewed_by INT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_user_id(user_id),
  INDEX idx_anon_email(anon_email),
  INDEX idx_anon_student(anon_student_id),
  INDEX idx_deleted_at(deleted_at),
  CONSTRAINT fk_messages_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
SQL;

$sql[] = <<<SQL
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  action VARCHAR(100) NOT NULL,
  user_id INT UNSIGNED NULL,
  meta JSON NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_action(action),
  INDEX idx_user_id(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
SQL;

$sql[] = "";

$sql[] = <<<SQL
CREATE TABLE IF NOT EXISTS bans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  type ENUM('email','student_id') NOT NULL,
  value VARCHAR(255) NOT NULL,
  reason VARCHAR(255) NULL,
  created_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  stage TINYINT UNSIGNED NULL,
  expires_at DATETIME NULL,
  UNIQUE KEY uniq_type_value_active (type, value, active),
  INDEX idx_created_by(created_by),
  INDEX idx_expires_at(expires_at),
  CONSTRAINT fk_bans_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
SQL;

foreach ($sql as $q) {
    $pdo->exec($q);
}

// Online migration: add slot column and switch unique index to (type,value,active,slot) to preserve history
try { $pdo->exec("ALTER TABLE bans ADD COLUMN slot BIGINT UNSIGNED NOT NULL DEFAULT 0"); } catch (\Throwable $e) {}
try { $pdo->exec("ALTER TABLE bans DROP INDEX uniq_type_value_active"); } catch (\Throwable $e) {}
try { $pdo->exec("ALTER TABLE bans ADD UNIQUE KEY uniq_type_value_active_slot (type, value, active, slot)"); } catch (\Throwable $e) {}
// Backfill: ensure inactive rows have distinct slot to avoid future conflicts
try { $pdo->exec("UPDATE bans SET slot = id WHERE active = 0 AND slot = 0"); } catch (\Throwable $e) {}

// Seed super admin if not exists
$adminEmail = $_ENV['ADMIN_EMAIL'] ?? '';
$adminPass = $_ENV['ADMIN_PASSWORD'] ?? '';
if ($adminEmail && $adminPass) {
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$adminEmail]);
    if (!$stmt->fetch()) {
        $hash = password_hash($adminPass, PASSWORD_BCRYPT);
        $stmt = $pdo->prepare('INSERT INTO users(email, password_hash, nickname, role, banned, created_at) VALUES(?,?,?,?,?,NOW())');
        $stmt->execute([$adminEmail, $hash, 'SuperAdmin', 'super_admin', 0]);
        echo "Seeded super admin: {$adminEmail}\n";
    }
}

echo "Migrations applied.\n";


