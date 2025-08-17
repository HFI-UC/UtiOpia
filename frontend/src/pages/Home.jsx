import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
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
  Loader2,
  Reply,
  X,
  Send,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import useMessagesStore from '../stores/messagesStore';
import api from '../lib/api';
import useAuthStore from '../stores/authStore';
import Turnstile from '../components/Turnstile';

const Home = () => {
  const navigate = useNavigate();
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
  const isAuthed = !!token;
  
  const [editDialog, setEditDialog] = useState({ open: false, message: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, message: null });
  const [editContent, setEditContent] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Embedded comments state per message
  const [expandedComments, setExpandedComments] = useState({}); // messageId -> bool
  const [commentsByMsg, setCommentsByMsg] = useState({}); // messageId -> { loading, items, total }
  const [commentInput, setCommentInput] = useState({}); // messageId -> text
  const [replyTo, setReplyTo] = useState({}); // messageId -> { id, content } | null
  const [commentAnon, setCommentAnon] = useState({}); // messageId -> bool
  const [focusedInput, setFocusedInput] = useState({}); // messageId -> bool
  const [submittingComment, setSubmittingComment] = useState({}); // messageId -> bool
  const commentInputRefs = useRef({}); // messageId -> ref

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

  // 为每个消息预加载评论
  useEffect(() => {
    messages.forEach(msg => {
      if (!commentsByMsg[msg.id] && !commentsByMsg[msg.id]?.loading) {
        loadCommentsFor(msg.id);
      }
    });
  }, [messages]);

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

  const toggleCommentsFor = async (messageId) => {
    setExpandedComments(prev => ({ ...prev, [messageId]: !prev[messageId] }));
  };

  const loadCommentsFor = async (messageId) => {
    if (commentsByMsg[messageId]?.loading) return;
    
    setCommentsByMsg(prev => ({ ...prev, [messageId]: { loading: true, items: [], total: 0 } }));
    try {
      const r = await api.get(`/messages/${messageId}/comments`, { params: { page: 1, pageSize: 100 } });
      const items = r?.data?.items || [];
      const total = r?.data?.total || items.length;
      setCommentsByMsg(prev => ({ ...prev, [messageId]: { loading: false, items, total } }));
    } catch {
      setCommentsByMsg(prev => ({ ...prev, [messageId]: { loading: false, items: [], total: 0 } }));
    }
  };

  const submitCommentFor = async (messageId) => {
    if (!isAuthed) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }
    const text = (commentInput[messageId] || '').trim();
    if (!text) { toast.error('请输入评论内容'); return; }
    
    setSubmittingComment(prev => ({ ...prev, [messageId]: true }));
    try {
      const payload = replyTo[messageId]
        ? { content: text, parent_id: replyTo[messageId].id, is_anonymous: !!commentAnon[messageId] }
        : { content: text, is_anonymous: !!commentAnon[messageId] };
      const r = await api.post(`/messages/${messageId}/comments`, payload);
      if (r?.data?.id) {
        setCommentInput(prev => ({ ...prev, [messageId]: '' }));
        setReplyTo(prev => ({ ...prev, [messageId]: null }));
        setCommentAnon(prev => ({ ...prev, [messageId]: false }));
        setFocusedInput(prev => ({ ...prev, [messageId]: false }));
        await loadCommentsFor(messageId);
        toast.success('评论已发布');
      }
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || '评论失败');
    } finally {
      setSubmittingComment(prev => ({ ...prev, [messageId]: false }));
    }
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
          {messages.map((message, index) => {
            const comments = commentsByMsg[message.id]?.items || [];
            const hasComments = comments.length > 0;
            const showAllComments = expandedComments[message.id];
            const displayComments = showAllComments ? comments : comments.slice(0, 2);
            
            return (
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
              
                  {/* 作者信息和操作按钮 */}
                  <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center space-x-2">
                      <Tooltip delayDuration={150}>
                        <TooltipTrigger asChild>
                          <Avatar className="w-6 h-6 cursor-default">
                            <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                        {message.user_email ? message.user_email.charAt(0).toUpperCase() : <User className="w-3 h-3" />}
                      </AvatarFallback>
                    </Avatar>
                        </TooltipTrigger>
                        {(message.user_email || message.user_nickname) && (
                          <TooltipContent side="top" sideOffset={6}>
                            {(message.user_nickname || '') + (message.user_nickname && message.user_email ? ' · ' : '') + (message.user_email || '')}
                          </TooltipContent>
                        )}
                      </Tooltip>
                      {message.is_anonymous ? (<Badge variant="secondary" className="text-[10px]">匿名</Badge>) : null}
                      <Badge variant="outline" className="text-xs">#{message.id}</Badge>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 px-2 ${message.liked_by_me ? 'text-red-500' : 'text-muted-foreground'} hover:text-red-500`}
                        onClick={() => toggleLike(message.id)}
                        disabled={!isAuthed}
                      >
                        <Heart className={`w-4 h-4 ${message.liked_by_me ? 'fill-current' : ''}`} />
                        <span className="ml-1 text-sm">{message.likes_count || 0}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-muted-foreground"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span className="ml-1 text-sm">{commentsByMsg[message.id]?.total || 0}</span>
                      </Button>
                    </div>
                  </div>

                  {/* 评论区 */}
                  <div className="space-y-3">
                    {/* 评论列表 */}
                    {commentsByMsg[message.id]?.loading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-4 h-4 animate-spin mr-2 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">加载评论中...</span>
                      </div>
                    ) : (
                      <>
                        {displayComments.map((comment) => {
                          const isReply = !!comment.parent_id;
                          const isOwner = !!(user && message.user_id && comment.user_id && Number(message.user_id) === Number(comment.user_id));
                          const showIdentity = !(comment.is_anonymous && (!user || Number(user.id) !== Number(comment.user_id)));
                          
                          return (
                            <div key={comment.id} className={`group ${isReply ? 'ml-6' : ''}`}>
                              <div className="flex items-start space-x-2">
                                <Tooltip delayDuration={150}>
                                  <TooltipTrigger asChild>
                                    <Avatar className="w-6 h-6 mt-0.5 flex-shrink-0 cursor-default">
                                      <AvatarFallback className="text-[10px] bg-muted">
                                        {showIdentity && comment.user_email ? comment.user_email.charAt(0).toUpperCase() : 'U'}
                                      </AvatarFallback>
                                    </Avatar>
                                  </TooltipTrigger>
                                  {showIdentity && (comment.user_email || comment.user_nickname) && (
                                    <TooltipContent side="top" sideOffset={6}>
                                      {(comment.user_nickname || '') + (comment.user_nickname && comment.user_email ? ' · ' : '') + (comment.user_email || '')}
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-0.5">
                                    <span className="text-sm font-medium truncate">
                                      {showIdentity ? (comment.user_nickname || comment.user_email || '用户') : '匿名'}
                                    </span>
                                    {isOwner && (
                                      <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">作者</Badge>
                                    )}
                                    {isReply && (
                                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">回复</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-700 break-words whitespace-pre-wrap">
                                    {comment.content}
                                  </p>
                                  <div className="flex items-center mt-1">
                                    <span className="text-xs text-muted-foreground">
                                      {formatTime(comment.created_at)}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="ml-2 h-5 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => {
                                        if (!isAuthed) {
                                          navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
                                          return;
                                        }
                                        setReplyTo(prev => ({ 
                                          ...prev, 
                                          [message.id]: { 
                                            id: comment.id, 
                                            content: comment.content,
                                            nickname: showIdentity ? (comment.user_nickname || comment.user_email || '用户') : '匿名'
                                          } 
                                        }));
                                        setFocusedInput(prev => ({ ...prev, [message.id]: true }));
                                        // Focus input after state update
                                        setTimeout(() => {
                                          commentInputRefs.current[message.id]?.focus();
                                        }, 100);
                                      }}
                                    >
                                      回复
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* 查看更多/收起 */}
                        {comments.length > 2 && (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs text-muted-foreground hover:text-primary"
                            onClick={() => toggleCommentsFor(message.id)}
                          >
                            {showAllComments ? (
                              <>
                                <ChevronUp className="w-3 h-3 mr-1" />
                                收起
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3 mr-1" />
                                查看全部 {comments.length} 条评论
                              </>
                            )}
                          </Button>
                        )}
                      </>
                    )}

                    {/* 评论输入区 */}
                    <div className="pt-2">
                      {replyTo[message.id] && (
                        <div className="flex items-center justify-between mb-2 p-2 bg-blue-50 rounded-md text-xs">
                          <span className="text-blue-700">
                            回复 @{replyTo[message.id].nickname}：{replyTo[message.id].content.slice(0, 30)}...
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 hover:bg-blue-100"
                            onClick={() => setReplyTo(prev => ({ ...prev, [message.id]: null }))}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                      
                      <div className="flex items-start space-x-2">
                        {isAuthed && (
                          <Avatar className="w-6 h-6 mt-1 flex-shrink-0">
                            <AvatarFallback className="text-[10px] bg-gradient-to-br from-green-500 to-blue-500 text-white">
                              {user?.email ? user.email.charAt(0).toUpperCase() : <User className="w-3 h-3" />}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className="flex-1">
                          {focusedInput[message.id] ? (
                            <div className="space-y-2">
                              <Textarea
                                ref={(el) => commentInputRefs.current[message.id] = el}
                                placeholder={isAuthed ? '写下你的评论...' : '登录后参与评论'}
                                value={commentInput[message.id] || ''}
                                onChange={(e) => setCommentInput(prev => ({ ...prev, [message.id]: e.target.value }))}
                                disabled={!isAuthed || submittingComment[message.id]}
                                className="min-h-[60px] text-sm resize-none"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                    e.preventDefault();
                                    submitCommentFor(message.id);
                                  }
                                }}
                              />
                              <div className="flex items-center justify-between">
                                <div className="text-xs text-muted-foreground flex items-center space-x-3">
                                  <label className="inline-flex items-center space-x-2">
                                    <Checkbox id={`anon-${message.id}`} checked={!!commentAnon[message.id]} onCheckedChange={(v) => setCommentAnon(prev => ({ ...prev, [message.id]: !!v }))} />
                                    <span>匿名评论</span>
                                  </label>
                                  {isAuthed ? 'Ctrl + Enter 发送' : (
                                    <span>
                                      <Link to={`/login?redirect=${encodeURIComponent(location.pathname)}`} className="text-blue-600 hover:underline">登录</Link>
                                      <span className="mx-1">或</span>
                                      <Link to={`/register?redirect=${encodeURIComponent(location.pathname)}`} className="text-blue-600 hover:underline">注册</Link>
                                      <span className="ml-1">后参与讨论</span>
                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setFocusedInput(prev => ({ ...prev, [message.id]: false }));
                                      setCommentInput(prev => ({ ...prev, [message.id]: '' }));
                                      setReplyTo(prev => ({ ...prev, [message.id]: null }));
                                    }}
                                    disabled={submittingComment[message.id]}
                                  >
                                    取消
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => submitCommentFor(message.id)}
                                    disabled={!isAuthed || !(commentInput[message.id] || '').trim() || submittingComment[message.id]}
                                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                                  >
                                    {submittingComment[message.id] ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <>
                                        <Send className="w-3 h-3 mr-1" />
                                        发送
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <button
                              className="w-full text-left px-3 py-2 text-sm text-muted-foreground bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                              onClick={() => {
                                if (!isAuthed) {
                                  navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
                                  return;
                                }
                                setFocusedInput(prev => ({ ...prev, [message.id]: true }));
                                setTimeout(() => {
                                  commentInputRefs.current[message.id]?.focus();
                                }, 100);
                              }}
                            >
                              {isAuthed ? '写下你的评论...' : '登录后参与讨论'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
            </Card>
            );
          })}
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