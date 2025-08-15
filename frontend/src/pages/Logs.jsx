import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Search, 
  Filter, 
  Download, 
  Calendar,
  User,
  Activity,
  Shield,
  Settings,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';

// Helpers (module scope)
const safeParse = (s) => {
  try { return JSON.parse(s); } catch { return {}; }
};

const safeDecode = (val) => {
  // 更强力的解析：尝试 JSON.parse；若失败，尝试 URLSearchParams；若仍失败，返回原字符串
  if (val == null) return val;
  if (typeof val === 'object') return val;
  const s = String(val);
  try { return JSON.parse(s); } catch {}
  try {
    if (s.includes('=') && (s.includes('&') || s.includes('%'))) {
      const params = new URLSearchParams(s);
      const obj = {};
      for (const [k, v] of params.entries()) obj[k] = v;
      if (Object.keys(obj).length > 0) return obj;
    }
  } catch {}
  return s;
};

const metaToReadable = (meta) => {
  const m = safeDecode(meta);
  if (!m || typeof m !== 'object') return typeof m === 'string' ? m : '';
  const keys = Object.keys(m);
  if (keys.length === 0) return '';
  return keys.map(k => `${k}: ${typeof m[k] === 'object' ? JSON.stringify(m[k]) : String(m[k])}`).join(' | ');
};

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const getLevelBadge = (level) => {
  const levelConfig = {
    info: { variant: 'default', icon: CheckCircle },
    warning: { variant: 'secondary', icon: AlertTriangle },
    error: { variant: 'destructive', icon: XCircle }
  };
  const config = levelConfig[level] || levelConfig.info;
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="flex items-center space-x-1">
      <Icon className="w-3 h-3" />
      <span>{level.toUpperCase()}</span>
    </Badge>
  );
};

const getCategoryIcon = (category) => {
  const icons = {
    auth: Shield,
    message: MessageSquare,
    user: User,
    ban: AlertTriangle,
    system: Settings,
  };
  const Icon = icons[category] || Activity;
  return <Icon className="w-4 h-4" />;
};

const getActionIcon = (action) => {
  if (!action) return <Activity className="w-4 h-4" />;
  if (action.endsWith('.failed') || action === 'error') return <XCircle className="w-4 h-4" />;
  if (action.includes('approve')) return <CheckCircle className="w-4 h-4" />;
  if (action.includes('reject')) return <XCircle className="w-4 h-4" />;
  if (action.includes('ban')) return <AlertTriangle className="w-4 h-4" />;
  if (action.includes('login') || action.includes('register')) return <User className="w-4 h-4" />;
  return <Activity className="w-4 h-4" />;
};

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');

  // 加载真实日志数据
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const resp = await api.get('/logs', { params: { page: 1, pageSize: 50 } });
        const items = resp?.data?.items || [];
        const normalized = items.map(it => {
          const action = String(it.action || '');
          const prefix = action.includes('.') ? action.split('.')[0] : action;
          const category = ['auth','message','user','ban'].includes(prefix) ? prefix : 'system';
          let level = 'info';
          if (action === 'error' || action.endsWith('.failed')) level = 'error';
          else if (action.endsWith('.conflict') || action.endsWith('.banned')) level = 'warning';
          const metaObj = typeof it.meta === 'string' ? safeParse(it.meta) : (it.meta || {});
          return {
            id: it.id,
            timestamp: it.created_at,
            level,
            category,
            action,
            user: String(it.user_id ?? 'system'),
            details: metaToReadable(metaObj),
            meta: metaObj,
          };
        });
        setLogs(normalized);
        setFilteredLogs(normalized);
      } catch (e) {
        // 静默失败
      }
    };
    fetchLogs();
  }, []);

  // 过滤日志
  useEffect(() => {
    let filtered = logs;

    // 搜索过滤
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(log =>
        (log.details || '').toLowerCase().includes(q) ||
        (log.action || '').toLowerCase().includes(q) ||
        (log.user || '').toLowerCase().includes(q)
      );
    }

    // 分类过滤（基于 action 前缀：auth/message/user/ban/system）
    if (filterCategory !== 'all') {
      filtered = filtered.filter(log => log.category === filterCategory);
    }

    // 级别过滤
    if (filterLevel !== 'all') {
      filtered = filtered.filter(log => log.level === filterLevel);
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, filterCategory, filterLevel]);


  const exportLogs = () => {
    const csvContent = [
      ['时间', '级别', '分类', '操作', '用户', '详情JSON'].join(','),
      ...filteredLogs.map(log => [
        formatTime(log.timestamp),
        log.level,
        log.category,
        log.action,
        log.user,
        `"${JSON.stringify(log.meta || {}, null, 0).replaceAll('"', '"')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">操作日志</h1>
        <p className="text-muted-foreground">
          查看系统操作记录和审计日志
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">总日志数</p>
                <p className="text-xl font-bold">{logs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">信息日志</p>
                <p className="text-xl font-bold">
                  {logs.filter(log => log.level === 'info').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">警告日志</p>
                <p className="text-xl font-bold">
                  {logs.filter(log => log.level === 'warning').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">错误日志</p>
                <p className="text-xl font-bold">
                  {logs.filter(log => log.level === 'error').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>日志记录</span>
            <div className="flex items-center gap-2">
              <Button onClick={exportLogs} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                导出日志
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            系统操作和事件的详细记录
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索日志内容..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="选择类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有分类</SelectItem>
                <SelectItem value="auth">认证</SelectItem>
                <SelectItem value="message">留言/审核</SelectItem>
                <SelectItem value="user">用户</SelectItem>
                <SelectItem value="ban">封禁</SelectItem>
                <SelectItem value="system">系统</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="选择级别" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有级别</SelectItem>
                <SelectItem value="info">信息</SelectItem>
                <SelectItem value="warning">警告</SelectItem>
                <SelectItem value="error">错误</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Logs List */}
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <LogItem key={log.id} log={log} />
            ))}

            {filteredLogs.length === 0 && (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">没有找到日志</h3>
                <p className="text-muted-foreground">
                  尝试调整搜索条件或过滤器
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const LogItem = ({ log }) => {
  const [open, setOpen] = useState(false);

  const copyJson = async () => {
    try {
      const text = JSON.stringify(log.meta || {}, null, 2);
      await navigator.clipboard.writeText(text);
      toast.success('已复制JSON');
    } catch {
      toast.error('复制失败');
    }
  };

  return (
    <div className="border rounded-lg hover:bg-muted/50 transition-colors">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="flex items-center space-x-2 mt-1">
              {getCategoryIcon(log.category)}
              {getActionIcon(log.action)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-medium text-sm break-all">{log.action}</span>
                {getLevelBadge(log.level)}
                <Badge variant="outline" className="text-xs">
                  {log.category}
                </Badge>
              </div>
              {log.details && (
                <div className="text-sm text-muted-foreground line-clamp-2 break-words whitespace-normal">
                  {log.details}
                </div>
              )}
              <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-2">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatTime(log.timestamp)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <User className="w-3 h-3" />
                  <span>{log.user}</span>
                </div>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setOpen(v => !v)} className="ml-2">
            {open ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
            {open ? '收起' : '详情'}
          </Button>
        </div>
      </div>

      {/* Body */}
      {open && (
        <div className="px-4 pb-4">
          <div className="rounded-md border bg-muted/30 p-3 overflow-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">meta</span>
              <Button variant="outline" size="sm" onClick={copyJson}>
                <Copy className="w-4 h-4 mr-1" /> 复制JSON
              </Button>
            </div>
            {(() => {
              const data = safeDecode(log.meta);
              if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
                return <p className="text-xs text-muted-foreground">(无详情)</p>;
              }
              return (
                <pre className="whitespace-pre-wrap break-words text-xs font-mono leading-relaxed max-h-80">
{typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
                </pre>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default Logs;

