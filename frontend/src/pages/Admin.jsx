import { useState, useEffect } from 'react';
import api from '../lib/api';
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
                管理用户账户、权限和状态
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">用户权限管理</p>
                    <p className="text-sm text-muted-foreground">设置用户角色和权限</p>
                  </div>
                  <Button variant="outline">管理权限</Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">批量操作</p>
                    <p className="text-sm text-muted-foreground">批量处理用户账户</p>
                  </div>
                  <Button variant="outline">批量操作</Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">用户统计</p>
                    <p className="text-sm text-muted-foreground">查看详细的用户统计数据</p>
                  </div>
                  <Button variant="outline">查看统计</Button>
                </div>
              </div>
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

