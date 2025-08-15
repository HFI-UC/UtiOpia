import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Clock, 
  CheckCircle,
  XCircle,
  Activity,
  Calendar
} from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalMessages: 0,
    pendingMessages: 0,
    approvedMessages: 0,
    rejectedMessages: 0,
    todayMessages: 0,
    weeklyGrowth: 0
  });

  const [chartData, setChartData] = useState({
    daily: [],
    weekly: [],
    status: []
  });

  // 模拟数据加载
  useEffect(() => {
    // 统计数据
    setStats({
      totalUsers: 156,
      totalMessages: 423,
      pendingMessages: 12,
      approvedMessages: 389,
      rejectedMessages: 22,
      todayMessages: 8,
      weeklyGrowth: 15.2
    });

    // 图表数据
    setChartData({
      daily: [
        { date: '1/9', messages: 12, users: 3 },
        { date: '1/10', messages: 19, users: 5 },
        { date: '1/11', messages: 8, users: 2 },
        { date: '1/12', messages: 15, users: 4 },
        { date: '1/13', messages: 22, users: 7 },
        { date: '1/14', messages: 18, users: 6 },
        { date: '1/15', messages: 25, users: 8 }
      ],
      weekly: [
        { week: '第1周', messages: 45, approved: 42, rejected: 3 },
        { week: '第2周', messages: 62, approved: 58, rejected: 4 },
        { week: '第3周', messages: 78, approved: 71, rejected: 7 },
        { week: '第4周', messages: 89, approved: 82, rejected: 7 },
        { week: '第5周', messages: 95, approved: 88, rejected: 7 },
        { week: '第6周', messages: 102, approved: 94, rejected: 8 }
      ],
      status: [
        { name: '已通过', value: 389, color: '#10b981' },
        { name: '已拒绝', value: 22, color: '#ef4444' },
        { name: '待审核', value: 12, color: '#f59e0b' }
      ]
    });
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
                <TrendingUp className={`w-4 h-4 mr-1 ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`} />
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
        <h1 className="text-3xl font-bold">仪表板</h1>
        <p className="text-muted-foreground">
          查看平台运营数据和关键指标
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          icon={MessageSquare}
          trend="up"
          trendValue="+34 本周"
          color="green"
        />
        <StatCard
          title="今日新增"
          value={stats.todayMessages}
          icon={Calendar}
          trend="up"
          trendValue="+2 较昨日"
          color="purple"
        />
        <StatCard
          title="待审核"
          value={stats.pendingMessages}
          icon={Clock}
          color="yellow"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>每日活动</span>
            </CardTitle>
            <CardDescription>
              过去7天的纸条发布和用户注册情况
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="messages" fill="#3b82f6" name="纸条数" />
                <Bar dataKey="users" fill="#10b981" name="新用户" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5" />
              <span>审核状态分布</span>
            </CardTitle>
            <CardDescription>
              所有纸条的审核状态分布情况
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.status}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.status.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>周度趋势</span>
          </CardTitle>
          <CardDescription>
            过去6周的纸条发布和审核趋势
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData.weekly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="messages" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="总纸条数"
              />
              <Line 
                type="monotone" 
                dataKey="approved" 
                stroke="#10b981" 
                strokeWidth={2}
                name="已通过"
              />
              <Line 
                type="monotone" 
                dataKey="rejected" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="已拒绝"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">审核效率</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">平均审核时间</span>
              <Badge variant="outline">2.3小时</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">通过率</span>
              <Badge variant="default">92%</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">今日已审核</span>
              <Badge variant="outline">15条</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">用户活跃度</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">日活跃用户</span>
              <Badge variant="default">45</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">周活跃用户</span>
              <Badge variant="default">128</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">月活跃用户</span>
              <Badge variant="default">156</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">内容质量</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">平均字数</span>
              <Badge variant="outline">85字</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">包含图片</span>
              <Badge variant="outline">23%</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">匿名发布</span>
              <Badge variant="outline">67%</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;

