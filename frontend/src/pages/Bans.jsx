import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Ban, 
  Search, 
  Plus, 
  Calendar,
  User,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';

const Bans = () => {
  const [bans, setBans] = useState([]);
  const [filteredBans, setFilteredBans] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newBan, setNewBan] = useState({
    userEmail: '',
    reason: '',
    duration: '7', // days
    type: 'temporary'
  });

  // 加载真实封禁数据
  useEffect(() => {
    const fetchBans = async () => {
      try {
        const resp = await api.get('/bans');
        const items = resp?.data?.items || [];
        // 适配后端字段到前端展示结构
        const normalized = items.map(it => ({
          id: it.id,
          userEmail: it.type === 'email' ? it.value : it.value, // 仅作展示
          userId: it.created_by || null,
          reason: it.reason || '',
          type: it.expires_at ? 'temporary' : 'permanent',
          duration: null,
          createdAt: it.created_at,
          expiresAt: it.expires_at,
          status: it.active ? 'active' : 'lifted',
          createdBy: String(it.created_by || 'system'),
          appealStatus: null,
        }));
        setBans(normalized);
        setFilteredBans(normalized);
      } catch (e) {
        // 静默失败，页面仍可操作
      }
    };
    fetchBans();
  }, []);

  // 过滤封禁记录
  useEffect(() => {
    let filtered = bans;

    // 搜索过滤
    if (searchTerm) {
      filtered = filtered.filter(ban => 
        ban.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ban.reason.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 状态过滤
    if (filterStatus !== 'all') {
      filtered = filtered.filter(ban => ban.status === filterStatus);
    }

    setFilteredBans(filtered);
  }, [bans, searchTerm, filterStatus]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { variant: 'destructive', icon: Ban, label: '生效中' },
      expired: { variant: 'secondary', icon: Clock, label: '已过期' },
      lifted: { variant: 'default', icon: CheckCircle, label: '已解除' }
    };
    
    const config = statusConfig[status] || statusConfig.active;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center space-x-1">
        <Icon className="w-3 h-3" />
        <span>{config.label}</span>
      </Badge>
    );
  };

  const getTypeBadge = (type) => {
    return (
      <Badge variant={type === 'permanent' ? 'destructive' : 'outline'}>
        {type === 'permanent' ? '永久' : '临时'}
      </Badge>
    );
  };

  const getAppealBadge = (appealStatus) => {
    if (!appealStatus) return null;
    
    const appealConfig = {
      pending: { variant: 'secondary', label: '申诉中' },
      approved: { variant: 'default', label: '申诉通过' },
      rejected: { variant: 'destructive', label: '申诉被拒' }
    };
    
    const config = appealConfig[appealStatus];
    return config ? <Badge variant={config.variant}>{config.label}</Badge> : null;
  };

  const getDaysRemaining = (expiresAt) => {
    if (!expiresAt) return null;
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffTime = expires - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const handleAddBan = async () => {
    if (!newBan.userEmail || !newBan.reason) {
      toast.error('请填写完整信息');
      return;
    }

    try {
      // 后端仅支持类型 email 或 student_id，值为具体邮箱或学号
      const type = newBan.userEmail.includes('@') ? 'email' : 'student_id';
      await api.post('/bans', { type, value: newBan.userEmail, reason: newBan.reason });
      // 重新拉取
      const resp = await api.get('/bans');
      const items = resp?.data?.items || [];
      const normalized = items.map(it => ({
        id: it.id,
        userEmail: it.value,
        userId: it.created_by || null,
        reason: it.reason || '',
        type: it.expires_at ? 'temporary' : 'permanent',
        duration: null,
        createdAt: it.created_at,
        expiresAt: it.expires_at,
        status: it.active ? 'active' : 'lifted',
        createdBy: String(it.created_by || 'system'),
        appealStatus: null,
      }));
      setBans(normalized);
      setShowAddDialog(false);
      setNewBan({ userEmail: '', reason: '', duration: '7', type: 'temporary' });
      toast.success('封禁记录已添加');
    } catch (error) {
      const msg = error.response?.data?.error || error.message || '操作失败';
      toast.error(msg);
    }
  };

  const handleLiftBan = async (banId) => {
    try {
      const ban = bans.find(b => b.id === banId);
      if (!ban) return;
      const type = ban.userEmail.includes('@') ? 'email' : 'student_id';
      await api.delete('/bans', { data: { type, value: ban.userEmail } });
      setBans(prev => prev.map(b => 
        b.id === banId ? { ...b, status: 'lifted' } : b
      ));
      toast.success('封禁已解除');
    } catch (error) {
      const msg = error.response?.data?.error || error.message || '操作失败';
      toast.error(msg);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">封禁管理</h1>
        <p className="text-muted-foreground">
          管理用户封禁记录和申诉处理
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Ban className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">总封禁数</p>
                <p className="text-xl font-bold">{bans.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">生效中</p>
                <p className="text-xl font-bold">
                  {bans.filter(ban => ban.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-muted-foreground">已过期</p>
                <p className="text-xl font-bold">
                  {bans.filter(ban => ban.status === 'expired').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">已解除</p>
                <p className="text-xl font-bold">
                  {bans.filter(ban => ban.status === 'lifted').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>封禁记录</CardTitle>
              <CardDescription>
                管理用户封禁状态和处理申诉
              </CardDescription>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  添加封禁
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>添加封禁记录</DialogTitle>
                  <DialogDescription>
                    对违规用户进行封禁处理
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="userEmail">用户邮箱</Label>
                    <Input
                      id="userEmail"
                      placeholder="user.name2023@gdhfi.com"
                      value={newBan.userEmail}
                      onChange={(e) => setNewBan(prev => ({ ...prev, userEmail: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reason">封禁原因</Label>
                    <Textarea
                      id="reason"
                      placeholder="请详细说明封禁原因..."
                      value={newBan.reason}
                      onChange={(e) => setNewBan(prev => ({ ...prev, reason: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">封禁类型</Label>
                      <Select value={newBan.type} onValueChange={(value) => setNewBan(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="temporary">临时封禁</SelectItem>
                          <SelectItem value="permanent">永久封禁</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {newBan.type === 'temporary' && (
                      <div className="space-y-2">
                        <Label htmlFor="duration">封禁天数</Label>
                        <Select value={newBan.duration} onValueChange={(value) => setNewBan(prev => ({ ...prev, duration: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1天</SelectItem>
                            <SelectItem value="3">3天</SelectItem>
                            <SelectItem value="7">7天</SelectItem>
                            <SelectItem value="14">14天</SelectItem>
                            <SelectItem value="30">30天</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    取消
                  </Button>
                  <Button onClick={handleAddBan}>
                    确认封禁
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索用户邮箱或封禁原因..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有状态</SelectItem>
                <SelectItem value="active">生效中</SelectItem>
                <SelectItem value="expired">已过期</SelectItem>
                <SelectItem value="lifted">已解除</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bans List */}
          <div className="space-y-3">
            {filteredBans.map((ban) => (
              <div key={ban.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <Avatar className="w-10 h-10 mt-1">
                      <AvatarFallback>
                        {ban.userEmail.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-medium">{ban.userEmail}</span>
                        {getStatusBadge(ban.status)}
                        {getTypeBadge(ban.type)}
                        {getAppealBadge(ban.appealStatus)}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {ban.reason}
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>创建: {formatTime(ban.createdAt)}</span>
                        </div>
                        {ban.expiresAt && (
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>到期: {formatTime(ban.expiresAt)}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span>操作人: {ban.createdBy}</span>
                        </div>
                        {ban.status === 'active' && ban.expiresAt && (
                          <div className="flex items-center space-x-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>剩余: {getDaysRemaining(ban.expiresAt)}天</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {ban.status === 'active' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleLiftBan(ban.id)}
                      >
                        <Shield className="w-4 h-4 mr-1" />
                        解除封禁
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4 mr-1" />
                      编辑
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {filteredBans.length === 0 && (
              <div className="text-center py-8">
                <Ban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">没有找到封禁记录</h3>
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

export default Bans;

