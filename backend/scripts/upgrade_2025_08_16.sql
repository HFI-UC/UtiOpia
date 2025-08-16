-- 升级脚本：默认展示纸条 + 点赞与评论

-- 1) 消息默认状态从 pending 改为 approved
ALTER TABLE messages MODIFY status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved';

-- 2) 新增点赞表
CREATE TABLE IF NOT EXISTS message_likes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  message_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uniq_message_user (message_id, user_id),
  INDEX idx_user_id (user_id),
  INDEX idx_deleted_at (deleted_at),
  CONSTRAINT fk_message_likes_message FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  CONSTRAINT fk_message_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3) 新增评论表（评论默认展示；可由管理员/版主改为拒绝）
-- 若已存在 message_comments 表，请补充 is_anonymous 字段
ALTER TABLE message_comments ADD COLUMN is_anonymous TINYINT(1) NOT NULL DEFAULT 0 AFTER user_id;
CREATE TABLE IF NOT EXISTS message_comments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  message_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  is_anonymous TINYINT(1) NOT NULL DEFAULT 0,
  content VARCHAR(1000) NOT NULL,
  parent_id BIGINT UNSIGNED NULL,
  root_id BIGINT UNSIGNED NULL,
  status ENUM('approved','rejected','pending') NOT NULL DEFAULT 'approved',
  reject_reason VARCHAR(255) NULL,
  reviewed_by INT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_message_id (message_id),
  INDEX idx_user_id (user_id),
  INDEX idx_parent_id (parent_id),
  INDEX idx_root_id (root_id),
  INDEX idx_status (status),
  INDEX idx_deleted_at (deleted_at),
  CONSTRAINT fk_message_comments_message FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  CONSTRAINT fk_message_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_message_comments_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_message_comments_parent FOREIGN KEY (parent_id) REFERENCES message_comments(id) ON DELETE CASCADE,
  CONSTRAINT fk_message_comments_root FOREIGN KEY (root_id) REFERENCES message_comments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4) 可选：将历史 pending 的消息批量置为 approved（如你需要）
-- UPDATE messages SET status = 'approved' WHERE status = 'pending';


