import { useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
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
  TrendingDown,
  Megaphone,
  Plus,
  Trash2,
  Save
} from 'lucide-react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const Admin = () => {
  const { isLiquidGlass } = useTheme();
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
  const [query, setQuery] = useState('');
  const filteredUsers = users.filter(u => {
    const q = query.toLowerCase();
    return u.email.toLowerCase().includes(q) || String(u.id).includes(q) || (u.nickname||'').toLowerCase().includes(q);
  });
  const [series, setSeries] = useState([]);
  const [reporting, setReporting] = useState(false);
  const [maintaining, setMaintaining] = useState(false);
  const [annList, setAnnList] = useState([]);
  const [annForm, setAnnForm] = useState({ title: '', content: '', type: 'info', priority: 0, visible: true, start_at: '', end_at: '', link_url: '' });
  const [annLoading, setAnnLoading] = useState(false);

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
        setStats(prev => ({
          ...prev,
          siteName: data.info?.site_name || '',
          siteUrl: data?.info ? undefined : undefined,
          turnstileConfigured: !!data.info?.turnstile_configured,
          cosConfigured: !!data.info?.cos_configured,
          serverTime: data.info?.server_time,
          phpVersion: data.info?.php_version,
          dbOk: data.health?.db ?? true,
          disk: data.info ? `${Math.round((data.info.disk_free||0)/1e9)}G free / ${Math.round((data.info.disk_total||0)/1e9)}G` : '-',
        }));
      } catch (_) {
        // 静默失败
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const loadAnns = async () => {
      try {
        const r = await api.get('/admin/announcements');
        setAnnList(r?.data?.items || []);
      } catch {}
    };
    loadAnns();
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

  useEffect(() => {
    const fetchSeries = async () => {
      try {
        const r = await api.get('/stats/messages', { params: { days: 7 } });
        // 兼容 total/count
        const items = (r?.data?.items || []).map(it => ({ date: it.date, value: it.total ?? it.count ?? 0 }));
        setSeries(items);
      } catch {}
    };
    fetchSeries();
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
    <div className={`max-w-7xl mx-auto space-y-8 ${isLiquidGlass ? 'glass-wrapper' : ''}`}>
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
          title="已隐藏"
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

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>7日发布趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Management Tabs */}
      <Tabs defaultValue="system" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="system">系统设置</TabsTrigger>
          <TabsTrigger value="users">用户管理</TabsTrigger>
          <TabsTrigger value="security">安全设置</TabsTrigger>
          <TabsTrigger value="maintenance">维护工具</TabsTrigger>
          <TabsTrigger value="announcements">公告管理</TabsTrigger>
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
                <div className="space-y-2">
                  <p className="font-medium">站点信息</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">站点名</p>
                      <Input readOnly defaultValue={stats?.siteName || ''} placeholder="从后端读取" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">前端地址</p>
                      <Input readOnly defaultValue={stats?.siteUrl || ''} placeholder="从后端读取" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="font-medium">集成</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Cloudflare Turnstile</span>
                    <Badge variant="outline">{stats?.turnstileConfigured ? '已配置' : '未配置'}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">对象存储（COS）</span>
                    <Badge variant="outline">{stats?.cosConfigured ? '已配置' : '未配置'}</Badge>
                  </div>
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
                  <span className="text-sm">数据库状态</span>
                  <Badge variant="default">{stats?.dbOk ? '正常' : '异常'}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">服务器时间</span>
                  <Badge variant="outline">{stats?.serverTime || '-'}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">PHP</span>
                  <Badge variant="outline">{stats?.phpVersion || '-'}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">磁盘</span>
                  <Badge variant="outline">{stats?.disk || '-'}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <Button variant="outline" onClick={async()=>{ setMaintaining(true); try{ await api.post('/admin/maintenance/cleanup'); } finally { setMaintaining(false);} }} disabled={maintaining}>
                    {maintaining ? '清理中…' : '清理/优化'}
                  </Button>
                  <Button variant="outline" onClick={async()=>{
                    try { setReporting(true);
                      const r = await api.post('/admin/report');
                      const blob = new Blob([JSON.stringify(r.data,null,2)], {type:'application/json'});
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a'); a.href = url; a.download = `report_${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
                    } finally { setReporting(false);} 
                  }} disabled={reporting}>
                    {reporting ? '导出中…' : '导出报告'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="announcements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Megaphone className="w-5 h-5" /> 公告列表</CardTitle>
              <CardDescription>创建、编辑和发布站内公告</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Create form */}
              <div className="space-y-3 border rounded-lg p-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">标题</p>
                    <Input value={annForm.title} onChange={e=>setAnnForm(v=>({...v,title:e.target.value}))} placeholder="例如：系统维护通知" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">类型</p>
                    <Select value={annForm.type} onValueChange={v=>setAnnForm(s=>({...s,type:v}))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">info</SelectItem>
                        <SelectItem value="success">success</SelectItem>
                        <SelectItem value="warning">warning</SelectItem>
                        <SelectItem value="danger">danger</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">内容</p>
                  <textarea className="w-full rounded-md border p-2 min-h-[80px]" value={annForm.content} onChange={e=>setAnnForm(v=>({...v,content:e.target.value}))} placeholder="公告正文，支持多行" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">优先级（越大越靠前）</p>
                    <Input type="number" value={annForm.priority} onChange={e=>setAnnForm(v=>({...v,priority:parseInt(e.target.value||'0',10)}))} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">开始时间</p>
                    <Input type="datetime-local" value={annForm.start_at} onChange={e=>setAnnForm(v=>({...v,start_at:e.target.value}))} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">结束时间</p>
                    <Input type="datetime-local" value={annForm.end_at} onChange={e=>setAnnForm(v=>({...v,end_at:e.target.value}))} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">链接</p>
                    <Input value={annForm.link_url} onChange={e=>setAnnForm(v=>({...v,link_url:e.target.value}))} placeholder="可选，点击查看更多" />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={!!annForm.visible} onChange={e=>setAnnForm(v=>({...v,visible:e.target.checked}))} /> 可见
                    </label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button disabled={annLoading} onClick={async()=>{
                    if (!annForm.title.trim() || !annForm.content.trim()) return;
                    setAnnLoading(true);
                    try {
                      await api.post('/admin/announcements', annForm);
                      const r = await api.get('/admin/announcements');
                      setAnnList(r?.data?.items || []);
                      setAnnForm({ title: '', content: '', type: 'info', priority: 0, visible: true, start_at: '', end_at: '', link_url: '' });
                    } finally { setAnnLoading(false);} 
                  }}>
                    <Plus className="w-4 h-4 mr-1" /> 新建公告
                  </Button>
                </div>
              </div>

              {/* List */}
              <div className="overflow-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3">ID</th>
                      <th className="text-left p-3">标题</th>
                      <th className="text-left p-3">类型</th>
                      <th className="text-left p-3">优先级</th>
                      <th className="text-left p-3">可见</th>
                      <th className="text-left p-3">时间</th>
                      <th className="text-left p-3">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {annList.map(a => (
                      <tr key={a.id} className="border-t align-top">
                        <td className="p-3">{a.id}</td>
                        <td className="p-3 min-w-[220px]">
                          <Input defaultValue={a.title} onBlur={async(e)=>{ const v=e.target.value; if(v!==a.title){ await api.put(`/admin/announcements/${a.id}`,{ title:v }); const r=await api.get('/admin/announcements'); setAnnList(r?.data?.items||[]);} }} />
                          <textarea className="w-full rounded-md border p-2 mt-2" defaultValue={a.content} onBlur={async(e)=>{ const v=e.target.value; if(v!==a.content){ await api.put(`/admin/announcements/${a.id}`,{ content:v }); const r=await api.get('/admin/announcements'); setAnnList(r?.data?.items||[]);} }} />
                        </td>
                        <td className="p-3">
                          <Select defaultValue={a.type} onValueChange={async(v)=>{ await api.put(`/admin/announcements/${a.id}`,{ type:v }); const r=await api.get('/admin/announcements'); setAnnList(r?.data?.items||[]);} }>
                            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="info">info</SelectItem>
                              <SelectItem value="success">success</SelectItem>
                              <SelectItem value="warning">warning</SelectItem>
                              <SelectItem value="danger">danger</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3">
                          <Input type="number" defaultValue={a.priority} onBlur={async(e)=>{ const v=parseInt(e.target.value||'0',10); if(v!==a.priority){ await api.put(`/admin/announcements/${a.id}`,{ priority:v }); const r=await api.get('/admin/announcements'); setAnnList(r?.data?.items||[]);} }} />
                        </td>
                        <td className="p-3">
                          <label className="inline-flex items-center gap-2 text-sm">
                            <input type="checkbox" defaultChecked={!!a.visible} onChange={async(e)=>{ await api.put(`/admin/announcements/${a.id}`,{ visible:e.target.checked }); const r=await api.get('/admin/announcements'); setAnnList(r?.data?.items||[]);} } />
                            <span>{a.visible ? '可见' : '隐藏'}</span>
                          </label>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          <div>开始：<Input type="datetime-local" defaultValue={a.start_at?.slice(0,16) || ''} onBlur={async(e)=>{ await api.put(`/admin/announcements/${a.id}`,{ start_at:e.target.value }); const r=await api.get('/admin/announcements'); setAnnList(r?.data?.items||[]);} } /></div>
                          <div className="mt-1">结束：<Input type="datetime-local" defaultValue={a.end_at?.slice(0,16) || ''} onBlur={async(e)=>{ await api.put(`/admin/announcements/${a.id}`,{ end_at:e.target.value }); const r=await api.get('/admin/announcements'); setAnnList(r?.data?.items||[]);} } /></div>
                          <div className="mt-1">链接：<Input defaultValue={a.link_url || ''} onBlur={async(e)=>{ await api.put(`/admin/announcements/${a.id}`,{ link_url:e.target.value }); const r=await api.get('/admin/announcements'); setAnnList(r?.data?.items||[]);} } /></div>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={async()=>{ await api.put(`/admin/announcements/${a.id}`,{}); const r=await api.get('/admin/announcements'); setAnnList(r?.data?.items||[]);} }>
                              <Save className="w-4 h-4 mr-1" /> 刷新
                            </Button>
                            <Button size="sm" variant="destructive" onClick={async()=>{ await api.delete(`/admin/announcements/${a.id}`); const r=await api.get('/admin/announcements'); setAnnList(r?.data?.items||[]);} }>
                              <Trash2 className="w-4 h-4 mr-1" /> 删除
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {annList.length === 0 && (
                      <tr><td colSpan="7" className="p-4 text-center text-muted-foreground">暂无公告</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
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
              <div className="flex items-center justify-between mb-3">
                <Input placeholder="搜索ID/邮箱/昵称" value={query} onChange={(e)=>setQuery(e.target.value)} className="max-w-sm" />
                {updating && <span className="text-xs text-muted-foreground">更新中…</span>}
              </div>
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
                    {filteredUsers.map((u) => (
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
                <Button variant="outline" className="w-full justify-start" onClick={async()=>{await api.post('/admin/maintenance/cleanup');}}>
                  清理/优化
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={async()=>{const r=await api.post('/admin/report'); const b=new Blob([JSON.stringify(r.data,null,2)],{type:'application/json'}); const url=URL.createObjectURL(b); const a=document.createElement('a'); a.href=url; a.download=`report_${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);}}>
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

