import { useState, useEffect } from 'react';
import api from '../lib/api';
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

  const [quickStats, setQuickStats] = useState({
    // 审核效率
    avgReviewTime: 0,
    approvalRate: 0,
    todayReviewed: 0,
    // 用户活跃度
    dailyActiveUsers: 0,
    weeklyActiveUsers: 0,
    monthlyActiveUsers: 0,
    // 内容质量
    avgWordCount: 0,
    imagePercentage: 0,
    anonymousPercentage: 0
  });

  const [selectedWeek, setSelectedWeek] = useState(0); // 0 = 当前周, 1 = 上周, 2 = 上上周...

  const [chartData, setChartData] = useState({
    daily: [],
    weekly: [],
    status: []
  });

  // 真实数据加载
  useEffect(() => {
    const load = async () => {
      try {
        const overview = await api.get('/stats/overview');
        const sv = overview?.data || {};
        const today = sv.messages?.last24h ?? 0;
        setStats({
          totalUsers: sv.users?.total ?? sv.totals?.users ?? 0,
          totalMessages: sv.totals?.messages ?? 0,
          pendingMessages: sv.messages?.pending ?? 0,
          approvedMessages: sv.messages?.approved ?? 0,
          rejectedMessages: sv.messages?.hidden ?? sv.messages?.rejected ?? 0, // 兼容 hidden 和 rejected
          todayMessages: today,
          weeklyGrowth: 0
        });

        const msgSeriesResp = await api.get('/stats/messages', { params: { days: 7 } });
        const userSeriesResp = await api.get('/stats/users', { params: { days: 7 } });
        const daily = (msgSeriesResp?.data?.items || []).map((it, idx) => ({
          date: it.date?.slice(5) || String(idx + 1),
          messages: it.total ?? it.count ?? 0,
          users: (userSeriesResp?.data?.items || [])[idx]?.total ?? 0,
        }));
        
        // 加载周度趋势数据
        const weeklyData = await loadWeeklyData(selectedWeek);
        
        const weekly = weeklyData.map((d, i) => ({ 
          date: d.date, 
          messages: d.messages, 
          approved: d.approved, 
          hidden: d.hidden 
        }));
        const status = [
          { name: '已通过', value: sv.messages?.approved ?? 0, color: '#10b981' },
          { name: '已隐藏', value: sv.messages?.hidden ?? sv.messages?.rejected ?? 0, color: '#ef4444' },
          { name: '待审核', value: sv.messages?.pending ?? 0, color: '#f59e0b' },
        ];
        setChartData({ daily, weekly, status });

        // 加载快速统计数据
        const quickStatsResp = await api.get('/stats/quick');
        const qs = quickStatsResp?.data || {};
        setQuickStats({
          // 审核效率
          avgReviewTime: qs.review?.avgTime ?? 0,
          approvalRate: qs.review?.approvalRate ?? 0,
          todayReviewed: qs.review?.todayReviewed ?? 0,
          // 用户活跃度
          dailyActiveUsers: qs.activity?.dailyActive ?? 0,
          weeklyActiveUsers: qs.activity?.weeklyActive ?? 0,
          monthlyActiveUsers: qs.activity?.monthlyActive ?? 0,
          // 内容质量
          avgWordCount: qs.quality?.avgWordCount ?? 0,
          imagePercentage: qs.quality?.imagePercentage ?? 0,
          anonymousPercentage: qs.quality?.anonymousPercentage ?? 0
        });
      } catch (_) {}
    };
    load();
  }, [selectedWeek]);

  // 加载周度趋势数据
  const loadWeeklyData = async (weekOffset) => {
    try {
      const response = await api.get('/stats/weekly', { params: { week: weekOffset } });
      return response?.data?.items || [];
    } catch (error) {
      console.error('加载周度数据失败:', error);
      return [];
    }
  };

  // 切换周数
  const handleWeekChange = async (newWeekOffset) => {
    setSelectedWeek(newWeekOffset);
    try {
      const weeklyData = await loadWeeklyData(newWeekOffset);
      setChartData(prev => ({
        ...prev,
        weekly: weeklyData.map((d, i) => ({ 
          date: d.date, 
          messages: d.messages, 
          approved: d.approved, 
          hidden: d.hidden 
        }))
      }));
    } catch (error) {
      console.error('切换周数失败:', error);
    }
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
        <StatCard
          title="已隐藏"
          value={stats.rejectedMessages}
          icon={XCircle}
          color="red"
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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>周度趋势</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={selectedWeek === 0 ? "default" : "outline"}
                size="sm"
                onClick={() => handleWeekChange(0)}
              >
                本周
              </Button>
              <Button
                variant={selectedWeek === 1 ? "default" : "outline"}
                size="sm"
                onClick={() => handleWeekChange(1)}
              >
                上周
              </Button>
              <Button
                variant={selectedWeek === 2 ? "default" : "outline"}
                size="sm"
                onClick={() => handleWeekChange(2)}
              >
                上上周
              </Button>
            </div>
          </div>
          <CardDescription>
            {selectedWeek === 0 ? '本周' : selectedWeek === 1 ? '上周' : '上上周'}的纸条发布和审核趋势
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData.weekly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
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
                dataKey="hidden" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="已隐藏"
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
              <Badge variant="outline">{quickStats.avgReviewTime > 0 ? `${quickStats.avgReviewTime}小时` : '暂无数据'}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">通过率</span>
              <Badge variant="default">{quickStats.approvalRate > 0 ? `${quickStats.approvalRate}%` : '暂无数据'}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">今日已审核</span>
              <Badge variant="outline">{quickStats.todayReviewed}条</Badge>
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
              <Badge variant="default">{quickStats.dailyActiveUsers}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">周活跃用户</span>
              <Badge variant="default">{quickStats.weeklyActiveUsers}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">月活跃用户</span>
              <Badge variant="default">{quickStats.monthlyActiveUsers}</Badge>
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
              <Badge variant="outline">{quickStats.avgWordCount > 0 ? `${quickStats.avgWordCount}字` : '暂无数据'}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">包含图片</span>
              <Badge variant="outline">{quickStats.imagePercentage > 0 ? `${quickStats.imagePercentage}%` : '暂无数据'}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">匿名发布</span>
              <Badge variant="outline">{quickStats.anonymousPercentage > 0 ? `${quickStats.anonymousPercentage}%` : '暂无数据'}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;

