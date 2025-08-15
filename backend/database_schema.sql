-- phpMyAdmin SQL Dump
-- version 5.0.2
-- https://www.phpmyadmin.net/
--
-- 主机： localhost:3306
-- 生成日期： 2025-08-15 19:28:09
-- 服务器版本： 5.6.51-log
-- PHP 版本： 7.3.33

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

--
-- 数据库： `hi_hfiuc_org`
--

-- --------------------------------------------------------

--
-- 表的结构 `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `action` varchar(100) NOT NULL,
  `user_id` int(10) UNSIGNED DEFAULT NULL,
  `meta` longtext,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- 表的结构 `bans`
--

CREATE TABLE `bans` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `type` enum('email','student_id') NOT NULL,
  `value` varchar(191) NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `stage` tinyint(3) UNSIGNED DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- 表的结构 `messages`
--

CREATE TABLE `messages` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED DEFAULT NULL,
  `is_anonymous` tinyint(1) NOT NULL DEFAULT '0',
  `anon_email` varchar(191) DEFAULT NULL,
  `anon_student_id` varchar(32) DEFAULT NULL,
  `anon_passphrase_hash` varchar(255) DEFAULT NULL,
  `content` varchar(500) NOT NULL,
  `image_url` varchar(1024) DEFAULT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `reject_reason` varchar(255) DEFAULT NULL,
  `reviewed_by` int(10) UNSIGNED DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- 表的结构 `users`
--

CREATE TABLE `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `email` varchar(191) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `nickname` varchar(50) NOT NULL,
  `student_id` varchar(20) DEFAULT NULL,
  `role` enum('super_admin','moderator','user') NOT NULL DEFAULT 'user',
  `banned` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- 转储表的索引
--

--
-- 表的索引 `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_action` (`action`),
  ADD KEY `idx_user_id` (`user_id`);

--
-- 表的索引 `bans`
--
ALTER TABLE `bans`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_type_value_active` (`type`,`value`,`active`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_expires_at` (`expires_at`);

--
-- 表的索引 `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_anon_email` (`anon_email`),
  ADD KEY `idx_anon_student` (`anon_student_id`),
  ADD KEY `idx_deleted_at` (`deleted_at`);

--
-- 表的索引 `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_student_id` (`student_id`);

--
-- 在导出的表使用AUTO_INCREMENT
--

--
-- 使用表AUTO_INCREMENT `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `bans`
--
ALTER TABLE `bans`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `messages`
--
ALTER TABLE `messages`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- 限制导出的表
--

--
-- 限制表 `bans`
--
ALTER TABLE `bans`
  ADD CONSTRAINT `fk_bans_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- 限制表 `messages`
--
ALTER TABLE `messages`
  ADD CONSTRAINT `fk_messages_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;
COMMIT;
