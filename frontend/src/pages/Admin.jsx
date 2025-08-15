import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Users, 
  Shield, 
  Database, 
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

const Admin = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalMessages: 0,
    pendingMessages: 0,
    approvedMessages: 0,
    rejectedMessages: 0,
    bannedUsers: 0
  });
  const [users, setUsers] = useState([]);
  const [updating, setUpdating] = useState(false);

  // 真实统计数据
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const resp = await api.get('/stats/overview');
        const data = resp?.data || {};
        setStats({
          totalUsers: data.totals?.users ?? data.users?.total ?? 0,
          totalMessages: data.totals?.messages ?? data.messages?.total ?? 0,
          pendingMessages: data.messages?.pending ?? 0,
          approvedMessages: data.messages?.approved ?? 0,
          rejectedMessages: data.messages?.rejected ?? 0,
          bannedUsers: data.users?.banned ?? 0
        });
      } catch (_) {
        // 静默失败
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const resp = await api.get('/users');
        setUsers(resp?.data?.items || []);
      } catch {}
    };
    fetchUsers();
  }, []);

  const updateUser = async (id, patch) => {
    setUpdating(true);
    try {
      await api.put(`/users/${id}`, patch);
      const resp = await api.get('/users');
      setUsers(resp?.data?.items || []);
    } catch {}
    setUpdating(false);
  };

  const StatCard = ({ title, value, icon: Icon, trend, trendValue, color = "blue" }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {trend && (
              <div className="flex items-center mt-1">
                {trend === 'up' ? (
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                )}
                <span className={`text-xs ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                  {trendValue}
                </span>
              </div>
            )}
          </div>
          <div className={`w-12 h-12 bg-${color}-100 rounded-full flex items-center justify-center`}>
            <Icon className={`w-6 h-6 text-${color}-600`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">系统管理</h1>
        <p className="text-muted-foreground">
          管理系统设置、用户权限和平台配置
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="总用户数"
          value={stats.totalUsers}
          icon={Users}
          trend="up"
          trendValue="+12 本周"
          color="blue"
        />
        <StatCard
          title="总纸条数"
          value={stats.totalMessages}
          icon={Database}
          trend="up"
          trendValue="+34 本周"
          color="green"
        />
        <StatCard
          title="待审核"
          value={stats.pendingMessages}
          icon={Clock}
          color="yellow"
        />
        <StatCard
          title="已通过"
          value={stats.approvedMessages}
          icon={CheckCircle}
          trend="up"
          trendValue="+28 本周"
          color="green"
        />
        <StatCard
          title="已拒绝"
          value={stats.rejectedMessages}
          icon={XCircle}
          trend="down"
          trendValue="-2 本周"
          color="red"
        />
        <StatCard
          title="封禁用户"
          value={stats.bannedUsers}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Management Tabs */}
      <Tabs defaultValue="system" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="system">系统设置</TabsTrigger>
          <TabsTrigger value="users">用户管理</TabsTrigger>
          <TabsTrigger value="security">安全设置</TabsTrigger>
          <TabsTrigger value="maintenance">维护工具</TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5" />
                  <span>基础设置</span>
                </CardTitle>
                <CardDescription>
                  配置系统的基本参数和功能开关
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">用户注册</p>
                    <p className="text-sm text-muted-foreground">允许新用户注册</p>
                  </div>
                  <Badge variant="default">已启用</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">匿名发布</p>
                    <p className="text-sm text-muted-foreground">允许匿名用户发布内容</p>
                  </div>
                  <Badge variant="default">已启用</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">内容审核</p>
                    <p className="text-sm text-muted-foreground">发布前需要审核</p>
                  </div>
                  <Badge variant="default">已启用</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">图片上传</p>
                    <p className="text-sm text-muted-foreground">允许上传图片附件</p>
                  </div>
                  <Badge variant="default">已启用</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5" />
                  <span>系统状态</span>
                </CardTitle>
                <CardDescription>
                  查看系统运行状态和性能指标
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">系统运行时间</span>
                  <Badge variant="outline">7天 12小时</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">数据库状态</span>
                  <Badge variant="default">正常</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">存储使用率</span>
                  <Badge variant="outline">23%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">API响应时间</span>
                  <Badge variant="outline">156ms</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>用户管理</CardTitle>
              <CardDescription>
                管理用户账户、角色和封禁状态
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3">ID</th>
                      <th className="text-left p-3">邮箱</th>
                      <th className="text-left p-3">昵称</th>
                      <th className="text-left p-3">角色</th>
                      <th className="text-left p-3">封禁</th>
                      <th className="text-left p-3">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-t">
                        <td className="p-3">{u.id}</td>
                        <td className="p-3 break-all">{u.email}</td>
                        <td className="p-3">
                          <Input
                            defaultValue={u.nickname}
                            onBlur={(e) => {
                              const v = e.target.value;
                              if (v !== u.nickname) updateUser(u.id, { nickname: v });
                            }}
                          />
                        </td>
                        <td className="p-3">
                          <Select defaultValue={u.role} onValueChange={(v) => updateUser(u.id, { role: v })}>
                            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">user</SelectItem>
                              <SelectItem value="moderator">moderator</SelectItem>
                              <SelectItem value="super_admin">super_admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3">
                          {u.banned ? (
                            <Badge variant="destructive">已封禁</Badge>
                          ) : (
                            <Badge variant="outline">正常</Badge>
                          )}
                        </td>
                        <td className="p-3 space-x-2">
                          {u.banned ? (
                            <Button size="sm" variant="outline" onClick={async ()=>{ setUpdating(true); await api.post(`/users/${u.id}/unban`); const r=await api.get('/users'); setUsers(r?.data?.items||[]); setUpdating(false); }}>解封</Button>
                          ) : (
                            <Button size="sm" variant="destructive" onClick={async ()=>{ setUpdating(true); await api.post(`/users/${u.id}/ban`); const r=await api.get('/users'); setUsers(r?.data?.items||[]); setUpdating(false); }}>封禁</Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {users.length === 0 && (
                <p className="text-sm text-muted-foreground mt-3">暂无数据</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>安全设置</span>
              </CardTitle>
              <CardDescription>
                配置系统安全策略和防护措施
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Turnstile验证</p>
                  <p className="text-sm text-muted-foreground">Cloudflare人机验证配置</p>
                </div>
                <Badge variant="default">已启用</Badge>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">IP限制</p>
                  <p className="text-sm text-muted-foreground">限制恶意IP访问</p>
                </div>
                <Badge variant="default">已启用</Badge>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">内容过滤</p>
                  <p className="text-sm text-muted-foreground">自动过滤敏感内容</p>
                </div>
                <Badge variant="default">已启用</Badge>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">访问日志</p>
                  <p className="text-sm text-muted-foreground">记录系统访问日志</p>
                </div>
                <Badge variant="default">已启用</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>数据维护</CardTitle>
                <CardDescription>
                  数据库清理和优化工具
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start">
                  清理过期数据
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  优化数据库
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  备份数据
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  导出统计报告
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>系统维护</CardTitle>
                <CardDescription>
                  系统维护和故障排除工具
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start">
                  清理缓存
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  重启服务
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  检查系统健康
                </Button>
                <Button variant="destructive" className="w-full justify-start">
                  维护模式
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;

