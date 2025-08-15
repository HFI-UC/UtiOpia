import { useState, useEffect } from 'react';
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
  Trash2
} from 'lucide-react';

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');

  // 模拟日志数据
  useEffect(() => {
    const mockLogs = [
      {
        id: 1,
        timestamp: '2024-01-15T10:30:00Z',
        level: 'info',
        type: 'moderation',
        action: 'approve_message',
        user: 'admin',
        target: '纸条 #123',
        details: '审核通过用户提交的纸条内容',
        ip: '192.168.1.100'
      },
      {
        id: 2,
        timestamp: '2024-01-15T10:25:00Z',
        level: 'warning',
        type: 'moderation',
        action: 'reject_message',
        user: 'admin',
        target: '纸条 #122',
        details: '拒绝不当内容，原因：违反社区规范',
        ip: '192.168.1.100'
      },
      {
        id: 3,
        timestamp: '2024-01-15T10:20:00Z',
        level: 'info',
        type: 'user',
        action: 'user_register',
        user: 'system',
        target: 'zhang.san2024@gdhfi.com',
        details: '新用户注册成功',
        ip: '192.168.1.101'
      },
      {
        id: 4,
        timestamp: '2024-01-15T10:15:00Z',
        level: 'info',
        type: 'user',
        action: 'user_login',
        user: 'system',
        target: 'li.mei2023@gdhfi.com',
        details: '用户登录成功',
        ip: '192.168.1.102'
      },
      {
        id: 5,
        timestamp: '2024-01-15T10:10:00Z',
        level: 'error',
        type: 'system',
        action: 'api_error',
        user: 'system',
        target: '/api/messages',
        details: '数据库连接超时',
        ip: '192.168.1.1'
      },
      {
        id: 6,
        timestamp: '2024-01-15T10:05:00Z',
        level: 'info',
        type: 'admin',
        action: 'system_config',
        user: 'super_admin',
        target: '系统设置',
        details: '更新了内容审核规则',
        ip: '192.168.1.100'
      },
      {
        id: 7,
        timestamp: '2024-01-15T10:00:00Z',
        level: 'warning',
        type: 'security',
        action: 'failed_login',
        user: 'system',
        target: 'unknown@example.com',
        details: '登录失败，密码错误（连续3次）',
        ip: '192.168.1.200'
      },
      {
        id: 8,
        timestamp: '2024-01-15T09:55:00Z',
        level: 'info',
        type: 'content',
        action: 'message_create',
        user: 'system',
        target: '纸条 #124',
        details: '用户提交新的纸条内容',
        ip: '192.168.1.103'
      }
    ];

    setLogs(mockLogs);
    setFilteredLogs(mockLogs);
  }, []);

  // 过滤日志
  useEffect(() => {
    let filtered = logs;

    // 搜索过滤
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 类型过滤
    if (filterType !== 'all') {
      filtered = filtered.filter(log => log.type === filterType);
    }

    // 级别过滤
    if (filterLevel !== 'all') {
      filtered = filtered.filter(log => log.level === filterLevel);
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, filterType, filterLevel]);

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

  const getTypeIcon = (type) => {
    const typeIcons = {
      moderation: Shield,
      user: User,
      system: Settings,
      admin: Settings,
      security: Shield,
      content: MessageSquare
    };
    
    const Icon = typeIcons[type] || Activity;
    return <Icon className="w-4 h-4" />;
  };

  const getActionIcon = (action) => {
    const actionIcons = {
      approve_message: CheckCircle,
      reject_message: XCircle,
      user_register: User,
      user_login: User,
      api_error: AlertTriangle,
      system_config: Settings,
      failed_login: Shield,
      message_create: MessageSquare,
      view: Eye,
      edit: Edit,
      delete: Trash2
    };
    
    const Icon = actionIcons[action] || Activity;
    return <Icon className="w-4 h-4" />;
  };

  const exportLogs = () => {
    const csvContent = [
      ['时间', '级别', '类型', '操作', '用户', '目标', '详情', 'IP地址'].join(','),
      ...filteredLogs.map(log => [
        formatTime(log.timestamp),
        log.level,
        log.type,
        log.action,
        log.user,
        log.target,
        `"${log.details}"`,
        log.ip
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
            <Button onClick={exportLogs} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              导出日志
            </Button>
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
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="选择类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有类型</SelectItem>
                <SelectItem value="moderation">内容审核</SelectItem>
                <SelectItem value="user">用户操作</SelectItem>
                <SelectItem value="system">系统事件</SelectItem>
                <SelectItem value="admin">管理操作</SelectItem>
                <SelectItem value="security">安全事件</SelectItem>
                <SelectItem value="content">内容操作</SelectItem>
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
              <div key={log.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="flex items-center space-x-2 mt-1">
                      {getTypeIcon(log.type)}
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-sm">{log.action.replace('_', ' ')}</span>
                        {getLevelBadge(log.level)}
                        <Badge variant="outline" className="text-xs">
                          {log.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {log.details}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatTime(log.timestamp)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span>{log.user}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>目标: {log.target}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>IP: {log.ip}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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

export default Logs;

