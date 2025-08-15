import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  AlertTriangle,
  User,
  Calendar,
  MessageSquare,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';

const Moderation = () => {
  const [pendingMessages, setPendingMessages] = useState([]);
  const [reviewedMessages, setReviewedMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  // 加载真实数据
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [pendingResp, approvedResp, rejectedResp] = await Promise.all([
          api.get('/messages', { params: { status: 'pending', pageSize: 50, page: 1 } }),
          api.get('/messages', { params: { status: 'approved', pageSize: 10, page: 1 } }),
          api.get('/messages', { params: { status: 'rejected', pageSize: 10, page: 1 } }),
        ]);
        setPendingMessages(pendingResp.data?.items || []);
        const approvedItems = approvedResp.data?.items || [];
        const rejectedItems = rejectedResp.data?.items || [];
        setReviewedMessages([
          ...approvedItems.map(it => ({ ...it, status: 'approved' })),
          ...rejectedItems.map(it => ({ ...it, status: 'rejected' })),
        ]);
      } catch (e) {
        toast.error('加载审核数据失败');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleApprove = async (messageId) => {
    setLoading(true);
    try {
      await api.post(`/messages/${messageId}/approve`);
      const message = pendingMessages.find(m => m.id === messageId);
      if (message) {
        const approvedMessage = {
          ...message,
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: '你'
        };
        setPendingMessages(prev => prev.filter(m => m.id !== messageId));
        setReviewedMessages(prev => [approvedMessage, ...prev]);
      }
      toast.success('内容已通过审核');
    } catch (error) {
      const msg = error.response?.data?.error || error.message || '操作失败';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (messageId, reason) => {
    const rejectReason = reason || window.prompt('请输入拒绝理由', '内容不当');
    if (!rejectReason) return;
    setLoading(true);
    try {
      await api.post(`/messages/${messageId}/reject`, { reason: rejectReason });
      const message = pendingMessages.find(m => m.id === messageId);
      if (message) {
        const rejectedMessage = {
          ...message,
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: '你',
          reject_reason: rejectReason
        };
        setPendingMessages(prev => prev.filter(m => m.id !== messageId));
        setReviewedMessages(prev => [rejectedMessage, ...prev]);
      }
      toast.success('内容已拒绝');
    } catch (error) {
      const msg = error.response?.data?.error || error.message || '操作失败';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const MessageCard = ({ message, showActions = false }) => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback>
                {message.user_email ? 
                  message.user_email.charAt(0).toUpperCase() : 
                  <User className="w-4 h-4" />
                }
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">
                {message.user_email || '匿名用户'}
              </p>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>{formatTime(message.created_at)}</span>
                <Badge variant="outline" className="text-xs">
                  #{message.id}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {message.status === 'pending' && (
              <Badge variant="secondary">
                <Clock className="w-3 h-3 mr-1" />
                待审核
              </Badge>
            )}
            {message.status === 'approved' && (
              <Badge variant="default">
                <CheckCircle className="w-3 h-3 mr-1" />
                已通过
              </Badge>
            )}
            {message.status === 'rejected' && (
              <Badge variant="destructive">
                <XCircle className="w-3 h-3 mr-1" />
                已拒绝
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>

        {/* 匿名发布者信息（仅当后端返回字段时展示）*/}
        {message.is_anonymous && (message.anon_email || message.anon_student_id) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {message.anon_email && (
              <div className="flex items-center space-x-2 p-2 rounded-md border bg-muted/30">
                <User className="w-3 h-3" />
                <span className="text-muted-foreground">匿名邮箱：</span>
                <span className="font-medium break-all">{message.anon_email}</span>
              </div>
            )}
            {message.anon_student_id && (
              <div className="flex items-center space-x-2 p-2 rounded-md border bg-muted/30">
                <User className="w-3 h-3" />
                <span className="text-muted-foreground">匿名学号：</span>
                <span className="font-medium break-all">{message.anon_student_id}</span>
              </div>
            )}
          </div>
        )}
        
        {message.image_url && (
          <div className="rounded-lg overflow-hidden border">
            <img 
              src={message.image_url} 
              alt="内容图片" 
              className="w-full h-48 object-cover"
            />
          </div>
        )}
        
        {message.status === 'rejected' && message.reject_reason && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg border border-red-200">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700">拒绝原因：{message.reject_reason}</span>
          </div>
        )}
        
        {message.reviewed_at && (
          <div className="text-xs text-muted-foreground">
            审核时间：{formatTime(message.reviewed_at)} | 审核人：{message.reviewed_by}
          </div>
        )}
        
        {showActions && (
          <div className="flex space-x-2 pt-2">
            <Button 
              size="sm" 
              onClick={() => handleApprove(message.id)}
              disabled={loading}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              通过
            </Button>
            <Button 
              size="sm" 
              variant="destructive"
              onClick={() => handleReject(message.id)}
              disabled={loading}
            >
              <XCircle className="w-4 h-4 mr-1" />
              拒绝
            </Button>
            <Button size="sm" variant="outline">
              <Eye className="w-4 h-4 mr-1" />
              详情
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">内容审核</h1>
        <p className="text-muted-foreground">
          审核用户提交的内容，确保社区环境健康有序
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">待审核</p>
                <p className="text-xl font-bold">{pendingMessages.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">已通过</p>
                <p className="text-xl font-bold">
                  {reviewedMessages.filter(m => m.status === 'approved').length}
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
                <p className="text-sm text-muted-foreground">已拒绝</p>
                <p className="text-xl font-bold">
                  {reviewedMessages.filter(m => m.status === 'rejected').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">总计</p>
                <p className="text-xl font-bold">
                  {pendingMessages.length + reviewedMessages.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="pending" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="pending" className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>待审核 ({pendingMessages.length})</span>
            </TabsTrigger>
            <TabsTrigger value="reviewed" className="flex items-center space-x-2">
              <Eye className="w-4 h-4" />
              <span>已审核 ({reviewedMessages.length})</span>
            </TabsTrigger>
          </TabsList>
          
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            筛选
          </Button>
        </div>

        <TabsContent value="pending" className="space-y-4">
          {pendingMessages.length > 0 ? (
            <div className="space-y-4">
              {pendingMessages.map(message => (
                <MessageCard 
                  key={message.id} 
                  message={message} 
                  showActions={true}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">暂无待审核内容</h3>
                <p className="text-muted-foreground">
                  所有提交的内容都已完成审核
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reviewed" className="space-y-4">
          {reviewedMessages.length > 0 ? (
            <div className="space-y-4">
              {reviewedMessages.map(message => (
                <MessageCard 
                  key={message.id} 
                  message={message} 
                  showActions={false}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">暂无审核记录</h3>
                <p className="text-muted-foreground">
                  还没有完成任何内容审核
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Moderation;

