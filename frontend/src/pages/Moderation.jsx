import { useState, useEffect } from 'react';
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

  // 模拟数据
  useEffect(() => {
    const mockPendingMessages = [
      {
        id: 1,
        content: "今天天气真好，心情也很棒！希望大家都能有美好的一天。",
        image_url: null,
        user_email: "zhang.san2023@gdhfi.com",
        user_id: 123,
        is_anonymous: false,
        created_at: "2024-01-15T10:30:00Z",
        status: "pending"
      },
      {
        id: 2,
        content: "匿名分享一个小秘密：其实我很喜欢这个平台的设计，简洁而温馨。",
        image_url: null,
        user_email: null,
        user_id: null,
        is_anonymous: true,
        created_at: "2024-01-15T09:15:00Z",
        status: "pending"
      },
      {
        id: 3,
        content: "刚刚在图书馆学习，发现了一本很有趣的书，推荐给大家！",
        image_url: "https://example.com/book.jpg",
        user_email: "li.mei2023@gdhfi.com",
        user_id: 124,
        is_anonymous: false,
        created_at: "2024-01-15T08:45:00Z",
        status: "pending"
      }
    ];

    const mockReviewedMessages = [
      {
        id: 4,
        content: "分享一首喜欢的歌曲，希望能给大家带来好心情。",
        user_email: "wang.lei2023@gdhfi.com",
        user_id: 125,
        is_anonymous: false,
        created_at: "2024-01-14T16:20:00Z",
        status: "approved",
        reviewed_at: "2024-01-14T16:25:00Z",
        reviewed_by: "admin"
      },
      {
        id: 5,
        content: "这是一条不当内容示例",
        user_email: null,
        user_id: null,
        is_anonymous: true,
        created_at: "2024-01-14T15:10:00Z",
        status: "rejected",
        reviewed_at: "2024-01-14T15:15:00Z",
        reviewed_by: "admin",
        reject_reason: "内容不当"
      }
    ];

    setPendingMessages(mockPendingMessages);
    setReviewedMessages(mockReviewedMessages);
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
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const message = pendingMessages.find(m => m.id === messageId);
      if (message) {
        const approvedMessage = {
          ...message,
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'admin'
        };
        
        setPendingMessages(prev => prev.filter(m => m.id !== messageId));
        setReviewedMessages(prev => [approvedMessage, ...prev]);
        
        toast.success('内容已通过审核');
      }
    } catch (error) {
      toast.error('操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (messageId, reason = '内容不当') => {
    setLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const message = pendingMessages.find(m => m.id === messageId);
      if (message) {
        const rejectedMessage = {
          ...message,
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'admin',
          reject_reason: reason
        };
        
        setPendingMessages(prev => prev.filter(m => m.id !== messageId));
        setReviewedMessages(prev => [rejectedMessage, ...prev]);
        
        toast.success('内容已拒绝');
      }
    } catch (error) {
      toast.error('操作失败');
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

