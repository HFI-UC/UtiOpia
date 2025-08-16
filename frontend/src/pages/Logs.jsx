import { useState, useEffect, useRef } from 'react';
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
  Copy,
  Clock,
  Globe,
  Key,
  RefreshCw,
  Hash
} from 'lucide-react';
import { toast } from 'sonner';
import JsonViewer from '../components/JsonViewer';
import EnhancedLogViewer from '../components/EnhancedLogViewer';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, subDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';

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
  const [filterUser, setFilterUser] = useState('');
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandAll, setExpandAll] = useState(false);
  const [jsonSearchTerm, setJsonSearchTerm] = useState('');
  const requestSeqRef = useRef(0);
  const loadMoreRef = useRef(null);

  // 加载真实日志数据（处理竞态，仅使用最后一次请求结果）
  useEffect(() => {
    const seq = ++requestSeqRef.current;
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const params = { page, pageSize: 100 };
        if (searchTerm) params.q = searchTerm;
        if (filterCategory !== 'all') params.category = filterCategory;
        if (filterLevel !== 'all') params.level = filterLevel;
        if (filterUser) params.user = filterUser;
        if (dateRange.from) params.from = dateRange.from.toISOString().slice(0,19).replace('T',' ');
        if (dateRange.to) params.to = dateRange.to.toISOString().slice(0,19).replace('T',' ');
        const resp = await api.get('/logs', { params });
        if (seq !== requestSeqRef.current) return; // 过期请求，丢弃
        const items = resp?.data?.items || [];
        const total = resp?.data?.total || 0;
        setTotalPages(Math.ceil(total / 100));
        const normalized = items.map(it => {
          const action = String(it.action || '');
          const prefix = action.includes('.') ? action.split('.')[0] : action;
          const category = ['auth','message','user','ban'].includes(prefix) ? prefix : 'system';
          let level = 'info';
          if (action === 'error' || action.endsWith('.failed')) level = 'error';
          else if (action.endsWith('.conflict') || action.endsWith('.banned')) level = 'warning';
          
          // 强化的 meta 解析
          let metaObj = {};
          if (typeof it.meta === 'string') {
            metaObj = safeDecode(it.meta);
          } else if (it.meta) {
            metaObj = it.meta;
          }
          
          // 提取关键信息
          const extractedInfo = extractKeyInfo(metaObj);
          
          return {
            id: it.id,
            timestamp: it.created_at,
            level,
            category,
            action,
            user: String(it.user_id ?? 'system'),
            details: metaToReadable(metaObj),
            meta: metaObj,
            ...extractedInfo
          };
        });
        if (page === 1) {
          setLogs(normalized);
        } else {
          setLogs(prev => [...prev, ...normalized]);
        }
      } catch (e) {
        if (seq !== requestSeqRef.current) return;
        toast.error('加载日志失败');
      } finally {
        if (seq === requestSeqRef.current) setLoading(false);
      }
    };
    fetchLogs();
  }, [page, searchTerm, filterCategory, filterLevel, filterUser, dateRange]);

  // 筛选条件变化时重置到第 1 页
  useEffect(() => {
    setLogs([]);
    setFilteredLogs([]);
    setTotalPages(1);
    setPage(1);
  }, [searchTerm, filterCategory, filterLevel, filterUser, dateRange]);

  // 无限滚动：当底部哨兵进入视口时加载下一页
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && !loading && page < totalPages) {
        setPage(p => p + 1);
      }
    }, { root: null, rootMargin: '0px', threshold: 1.0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loading, page, totalPages]);
  
  // 提取关键信息
  const extractKeyInfo = (meta) => {
    const info = {};
    if (typeof meta === 'object' && meta !== null) {
      // 提取 IP 地址
      info.ip = meta.ip || meta.IP || meta.client_ip || meta.user_ip || null;
      // 提取请求方法
      info.method = meta.method || meta.http_method || null;
      // 提取路径
      info.path = meta.path || meta.url || meta.endpoint || null;
      // 提取邮箱
      info.email = meta.email || meta.user_email || null;
      // 提取用户名
      info.username = meta.username || meta.user_name || meta.name || null;
      // 提取留言ID
      info.messageId = meta.message_id || meta.messageId || meta.id || null;
      // 提取错误信息
      info.error = meta.error || meta.message || meta.reason || null;
    }
    return info;
  };

  // 本地仅做 JSON 内容搜索（其余筛选交给后端）
  useEffect(() => {
    let filtered = logs;
    if (jsonSearchTerm) {
      const jsonQuery = jsonSearchTerm.toLowerCase();
      filtered = filtered.filter(log => JSON.stringify(log.meta).toLowerCase().includes(jsonQuery));
    }
    setFilteredLogs(filtered);
  }, [logs, jsonSearchTerm]);


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

          {/* 高级过滤器 */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="按用户过滤..."
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="pl-10"
                />
                    </div>
                      </div>
            <div className="flex-1">
              <div className="relative">
                <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="在JSON中搜索..."
                  value={jsonSearchTerm}
                  onChange={(e) => setJsonSearchTerm(e.target.value)}
                  className="pl-10"
                />
                        </div>
                      </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full md:w-[240px]">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "MM/dd", { locale: zhCN })} -{" "}
                        {format(dateRange.to, "MM/dd", { locale: zhCN })}
                      </>
                    ) : (
                      format(dateRange.from, "MM/dd", { locale: zhCN })
                    )
                  ) : (
                    "选择日期范围"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-3 space-y-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange({ from: new Date(), to: new Date() })}
                    >
                      今天
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}
                    >
                      最近7天
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}
                    >
                      最近30天
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange({ from: null, to: null })}
                    >
                      清除
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* 工具栏 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                显示 {filteredLogs.length} / {logs.length} 条
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandAll(!expandAll)}
              >
                {expandAll ? '全部收起' : '全部展开'}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {page > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={loading}
                >
                  上一页
                </Button>
              )}
              <span className="text-sm text-muted-foreground">
                第 {page} / {totalPages} 页
              </span>
              {page < totalPages && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={loading}
                >
                  下一页
                </Button>
              )}
            </div>
          </div>

          {/* Logs List */}
          <div className="space-y-3">
            {loading && logs.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">加载中...</span>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <LogItem key={log.id} log={log} expandAll={expandAll} jsonSearchTerm={jsonSearchTerm} />
              ))
            )}

            {filteredLogs.length === 0 && (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">没有找到日志</h3>
                <p className="text-muted-foreground">
                  尝试调整搜索条件或过滤器
                </p>
              </div>
            )}
            {/* 无限滚动哨兵 */}
            <div ref={loadMoreRef} className="py-4 text-center text-xs text-muted-foreground">
              {page < totalPages ? (
                loading && logs.length > 0 ? (
                  <div className="flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    加载中...
                  </div>
                ) : (
                  '下拉加载更多'
                )
              ) : (
                logs.length > 0 ? '没有更多了' : null
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const LogItem = ({ log, expandAll = false, jsonSearchTerm = '' }) => {
  const [open, setOpen] = useState(expandAll);
  
  useEffect(() => {
    setOpen(expandAll);
  }, [expandAll]);

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
    <div className="border rounded-lg hover:bg-muted/50 transition-colors overflow-hidden">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="flex items-center space-x-2 mt-1">
              {getCategoryIcon(log.category)}
              {getActionIcon(log.action)}
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex items-center space-x-2 mb-1 flex-wrap">
                <span className="font-medium text-sm break-all">{log.action}</span>
                {getLevelBadge(log.level)}
                <Badge variant="outline" className="text-xs">
                  {log.category}
                </Badge>
              </div>
              
              {/* 简化卡片：移除详情与标签，仅保留下方的时间/IP/用户/路径 */}
              <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-2">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatTime(log.timestamp)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <User className="w-3 h-3" />
                  <span>{log.user}</span>
                </div>
                {log.ip && (
                  <div className="flex items-center space-x-1">
                    <Globe className="w-3 h-3" />
                    <span className="truncate max-w-[160px]">{log.ip}</span>
                  </div>
                )}
                {log.path && (
                  <div className="flex items-center space-x-1">
                    <Globe className="w-3 h-3" />
                    <span className="truncate max-w-[200px]">{log.path}</span>
                  </div>
                )}
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
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">详细数据</span>
                <Badge variant="secondary" className="text-xs">
                  {typeof log.meta === 'object' ? Object.keys(log.meta).length : 0} 个字段
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={copyJson}>
                  <Copy className="w-4 h-4 mr-1" /> 复制JSON
                </Button>
              </div>
            </div>
            {(() => {
              const data = safeDecode(log.meta);
              if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
                return <p className="text-xs text-muted-foreground">(无详情)</p>;
              }
              
              // 使用 EnhancedLogViewer 组件
              if (typeof data === 'object') {
                return (
                  <EnhancedLogViewer 
                    data={data}
                  />
                );
              }
              
              // 如果是字符串，显示为原始文本
              return (
                <div className="overflow-auto max-h-80">
                  <pre className="whitespace-pre-wrap break-words text-xs font-mono leading-relaxed">
                    {data}
                  </pre>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default Logs;

