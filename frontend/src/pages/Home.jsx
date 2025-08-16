import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  PenTool, 
  Heart, 
  MessageCircle, 
  Edit, 
  Trash2, 
  MoreHorizontal,
  Clock,
  User,
  Star,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import useMessagesStore from '../stores/messagesStore';
import api from '../lib/api';
import useAuthStore from '../stores/authStore';
import Turnstile from '../components/Turnstile';

const Home = () => {
  const { 
    messages, 
    total, 
    isLoading, 
    isDone, 
    fetchMessages, 
    updateMessage, 
    deleteMessage, 
    toggleLike 
  } = useMessagesStore();
  const { user, token } = useAuthStore();
  
  const [editDialog, setEditDialog] = useState({ open: false, message: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, message: null });
  const [editContent, setEditContent] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  useEffect(() => {
    fetchMessages(true);
  }, [fetchMessages]);

  // 公共统计
  const [pubCounts, setPubCounts] = useState({ approved: 0, pending: 0, rejected: 0, total: 0 });
  useEffect(() => {
    const loadCounts = async () => {
      try {
        const r = await api.get('/stats/public-counts');
        setPubCounts(r?.data || { approved: 0, pending: 0, rejected: 0, total: 0 });
      } catch {}
    };
    loadCounts();
  }, []);

  // 无限滚动
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop
        >= document.documentElement.offsetHeight - 200
        && !isLoading && !isDone
      ) {
        fetchMessages();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [fetchMessages, isLoading, isDone]);

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'pending': { label: '待审核', variant: 'secondary' },
      'approved': { label: '已通过', variant: 'default' },
      'rejected': { label: '已拒绝', variant: 'destructive' },
      'draft': { label: '草稿', variant: 'outline' }
    };
    
    const config = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const canEdit = (message) => {
    if (user && message.user_id === user.id) return true;
    if (!message.user_id && message.is_anonymous) return true;
    return false;
  };

  const handleEdit = (message) => {
    setEditDialog({ open: true, message });
    setEditContent(message.content);
    setEditPassword('');
    setTurnstileToken('');
  };

  const handleDelete = (message) => {
    setDeleteDialog({ open: true, message });
    setDeletePassword('');
    setTurnstileToken('');
  };

  const submitEdit = async () => {
    if (!editDialog.message || !turnstileToken) return;
    
    try {
      setEditSubmitting(true);
      const updateData = {
        content: editContent,
        turnstile_token: turnstileToken
      };
      
      if (!editDialog.message.user_id && editDialog.message.is_anonymous) {
        updateData.anon_passphrase = editPassword;
      }
      
      await updateMessage(editDialog.message.id, updateData);
      setEditDialog({ open: false, message: null });
      toast.success('纸条更新成功！');
    } catch (error) {
      toast.error(error.message);
    } finally { setEditSubmitting(false); }
  };

  const submitDelete = async () => {
    if (!deleteDialog.message || !turnstileToken) return;
    
    try {
      setDeleteSubmitting(true);
      const deleteData = {
        turnstile_token: turnstileToken
      };
      
      if (!deleteDialog.message.user_id && deleteDialog.message.is_anonymous) {
        deleteData.anon_passphrase = deletePassword;
      }
      
      await deleteMessage(deleteDialog.message.id, deleteData);
      setDeleteDialog({ open: false, message: null });
      toast.success('纸条删除成功！');
    } catch (error) {
      toast.error(error.message);
    } finally { setDeleteSubmitting(false); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-6 py-12">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            分享你的想法
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            在这里写下你的小纸条，与大家分享你的心声，让每一个想法都能被听见
          </p>
        </div>
        <Button asChild size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
          <Link to="/write" className="flex items-center space-x-2">
            <PenTool className="w-5 h-5" />
            <span>写纸条</span>
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{pubCounts.approved}</div>
            <p className="text-sm text-muted-foreground">已通过</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">{pubCounts.pending}</div>
            <p className="text-sm text-muted-foreground">待审批</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-pink-600">{pubCounts.rejected}</div>
            <p className="text-sm text-muted-foreground">已拒绝</p>
          </CardContent>
        </Card>
      </div>

      {/* Messages Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">最新纸条</h2>
          <Badge variant="outline">{total} 条纸条</Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {messages.map((message, index) => (
            <Card 
              key={message.id}
              className={`group hover:shadow-lg transition-all duration-300 ${
                index < 3 ? 'ring-2 ring-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {formatTime(message.created_at)}
                    </span>
                    {index < 3 && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(message.status)}
                    {canEdit(message) && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEdit(message)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDelete(message)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
                
                {message.image_url && (
                  <div className="rounded-lg overflow-hidden">
                    <img 
                      src={message.image_url} 
                      alt="纸条图片" 
                      className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="pt-3">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs">
                        {message.user_email ? message.user_email.charAt(0).toUpperCase() : <User className="w-3 h-3" />}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">
                      {message.user_email || '匿名用户'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      className={`inline-flex items-center text-sm ${message.liked_by_me ? 'text-red-500' : 'text-muted-foreground'} hover:text-red-500 transition-colors`}
                      onClick={async ()=>{ try { await toggleLike(message.id); } catch (e) { toast.error(e.message); } }}
                      title={message.liked_by_me ? '取消点赞' : '点赞'}
                    >
                      <Heart className={`w-4 h-4 mr-1 ${message.liked_by_me ? 'fill-current' : ''}`} />
                      <span>{message.likes_count || 0}</span>
                    </button>
                    <Link to={`/messages/${message.id}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-blue-600 transition-colors">
                      <MessageCircle className="w-4 h-4 mr-1" />
                      <span>评论</span>
                    </Link>
                    <Badge variant="outline" className="text-xs">#{message.id}</Badge>
                  </div>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Loading & Status */}
        <div className="text-center py-8">
          {isLoading && (
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>正在加载更多纸条...</span>
            </div>
          )}
          
          {isDone && messages.length > 0 && (
            <div className="text-muted-foreground">
              🎉 已加载全部纸条
            </div>
          )}
          
          {!isLoading && messages.length === 0 && (
            <div className="space-y-4">
              <div className="text-6xl">📝</div>
              <div className="space-y-2">
                <p className="text-lg font-medium">还没有纸条</p>
                <p className="text-muted-foreground">快来写第一条纸条吧！</p>
              </div>
              <Button asChild>
                <Link to="/write">写纸条</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, message: null })}>
        <DialogContent className="relative">
          <DialogHeader>
            <DialogTitle>编辑纸条</DialogTitle>
            <DialogDescription>
              修改你的纸条内容
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-content">内容</Label>
              <Textarea
                id="edit-content"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={5}
                placeholder="写下你想说的话..."
              />
            </div>
            
            {editDialog.message && !editDialog.message.user_id && editDialog.message.is_anonymous && (
              <div>
                <Label htmlFor="edit-password">身份口令</Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="用于验证匿名身份"
                />
              </div>
            )}
            
            <div>
              <Label>安全验证</Label>
              <Turnstile onVerified={setTurnstileToken} />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, message: null })}>
              取消
            </Button>
            <Button onClick={submitEdit} disabled={!turnstileToken || editSubmitting}>
              {editSubmitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin"/>保存中...</>) : '保存修改'}
            </Button>
          </DialogFooter>
          {editSubmitting && (
            <div className="absolute inset-0 bg-white/60 dark:bg-black/40 rounded-lg flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, message: null })}>
        <DialogContent className="relative">
          <DialogHeader>
            <DialogTitle>删除纸条</DialogTitle>
            <DialogDescription>
              确定要删除这条纸条吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {deleteDialog.message && !deleteDialog.message.user_id && deleteDialog.message.is_anonymous && (
              <div>
                <Label htmlFor="delete-password">身份口令</Label>
                <Input
                  id="delete-password"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="用于验证匿名身份"
                />
              </div>
            )}
            
            <div>
              <Label>安全验证</Label>
              <Turnstile onVerified={setTurnstileToken} />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, message: null })}>
              取消
            </Button>
            <Button variant="destructive" onClick={submitDelete} disabled={!turnstileToken || deleteSubmitting}>
              {deleteSubmitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin"/>删除中...</>) : '确认删除'}
            </Button>
          </DialogFooter>
          {deleteSubmitting && (
            <div className="absolute inset-0 bg-white/60 dark:bg-black/40 rounded-lg flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Home;

