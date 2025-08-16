<?php
declare(strict_types=1);

namespace UtiOpia\Services;

final class ACL
{
    /**
     * role: super_admin, moderator, user
     */
    public function ensure(string $role, string $permission): void
    {
        $map = [
            'super_admin' => ['*'],
            'moderator' => [
                'message:read', 'message:update', 'message:delete', 'message:approve', 'message:reject',
                'like:toggle', 'comment:approve', 'comment:reject',
                'user:read', 'user:update', 'user:ban', 'user:unban',
                'audit:read', 'ban:manage',
            ],
            'user' => [
                'message:read', 'message:create', 'message:update:own', 'message:delete:own',
                'like:toggle', 'comment:create', 'comment:delete:own',
            ],
        ];
        if (in_array('*', $map[$role] ?? [], true)) {
            return;
        }
        if (!in_array($permission, $map[$role] ?? [], true)) {
            throw new \RuntimeException('权限不足');
        }
    }
}


