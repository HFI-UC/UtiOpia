import { useEffect, useState, useRef, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import LiquidGlassEffect from '@/components/effects/LiquidGlassEffect';
import { useTheme } from '../contexts/ThemeContext';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
  Clock,
  User,
  Star,
  Loader2,
  X,
  Send,
  ChevronDown,
  ChevronUp,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import useMessagesStore from '../stores/messagesStore';
import api from '../lib/api';
import useAuthStore from '../stores/authStore';
import Turnstile from '../components/Turnstile';
import AnnouncementDialog from '@/components/AnnouncementDialog';

// Masonry（CSS Grid 行优先）+ 轻微随机旋转：横向加载顺序，尽量紧密填充
const masonryStyles = `
  /* 使用 CSS Grid 实现行优先 Masonry。通过 JS 计算行跨度实现紧密排列 */
  .messages-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    grid-auto-rows: 8px;     /* 基准行高（配合 span 计算）*/
    gap: 0.9rem;            /* 行/列间距 */
    align-items: start;
    grid-auto-flow: row dense; /* 紧密填充 */
    width: 100%;
  }

  .messages-container .message-card {
    width: 100%;
    transform-origin: center top;
    transition: transform 200ms ease, box-shadow 200ms ease;
  }

  /* 轻微的“随意”排版效果（很小的旋转/位移） */
  .messages-container .message-card:nth-child(6n+1) { transform: rotate(-0.4deg); }
  .messages-container .message-card:nth-child(6n+2) { transform: rotate(0.35deg); }
  .messages-container .message-card:nth-child(6n+3) { transform: rotate(-0.25deg); }
  .messages-container .message-card:nth-child(6n+4) { transform: rotate(0.15deg); }
  .messages-container .message-card:nth-child(6n+5) { transform: rotate(-0.15deg); }
  .messages-container .message-card:nth-child(6n+6) { transform: rotate(0.25deg); }
  .messages-container .message-card:hover { transform: rotate(0deg) translateY(-2px); }

  /* 液态玻璃模式下禁用轻微旋转，确保边框与内容严格对齐 */
  .messages-container .message-card.no-tilt { transform: none !important; }
  
  /* 液态玻璃卡片容器样式修正 */
  .liquid-card-container {
    width: 100%;
    height: auto;
    display: block;
  }
  
  .liquid-card-container .glass-wrapper {
    width: 100% !important;
    height: auto !important;
    display: block !important;
  }
  
  /* 确保液态玻璃内部卡片不产生额外偏移 */
  .liquid-card-container .glass-wrapper > * {
    width: 100%;
    margin: 0;
    transform: none;
  }

  /* 内部内容保护与换行 */
  .messages-container .message-card .group { display: flex; flex-direction: column; }
  .messages-container img { max-width: 100%; height: auto; }
  .messages-container .message-card * { max-width: 100%; box-sizing: border-box; }
  .messages-container .message-card p,
  .messages-container .message-card .text-sm {
    word-break: break-word;
    overflow-wrap: break-word;
    hyphens: auto;
    line-height: 1.6;
  }

  @media (max-width: 480px) {
    .messages-container { gap: 1rem; grid-template-columns: 1fr; }
  }

  /* 评论展开动画：淡入 + 轻微下滑 */
  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .fade-in-down { animation: fadeSlideIn 240ms ease both; }

  /* 触屏设备（无 hover）下，始终显示操作按钮，避免“盲点可点击” */
  @media (hover: none) {
    .messages-container .actions-on-hover { opacity: 1 !important; pointer-events: auto !important; }
  }
`;

const ThemedCard = forwardRef(({ children, className, isInsideGlass, ...props }, ref) => {
  const { isLiquidGlass } = useTheme();
  const finalClassName = cn(
    'transition-all duration-500 ease-out h-fit rounded-2xl w-full',
    isLiquidGlass && isInsideGlass
      ? 'bg-transparent border-transparent shadow-none'
      : 'hover:shadow-lg border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/40',
    className
  );

  return (
    <div ref={ref} className={finalClassName} {...props}>
      {children}
    </div>
  );
});
ThemedCard.displayName = 'ThemedCard';

const Home = () => {
  const navigate = useNavigate();
  const [urlSearchParams] = useSearchParams();
  const {
    messages,
    isLoading,
    isDone,
    fetchMessages,
    updateMessage,
    deleteMessage,
    toggleLike
  } = useMessagesStore();
  const { isLiquidGlass, resolvedTheme } = useTheme();
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
  const [commentInput, setCommentInput] = useState({}); // messageId -> text
  const [replyTo, setReplyTo] = useState({}); // messageId -> { id, content } | null
  const [commentAnon, setCommentAnon] = useState({}); // messageId -> bool
  const [focusedInput, setFocusedInput] = useState({}); // messageId -> bool
  const [submittingComment, setSubmittingComment] = useState({}); // messageId -> bool
  const commentInputRefs = useRef({}); // messageId -> ref
  // Masonry: 行跨度计算用
  const [rowSpans, setRowSpans] = useState({}); // messageId -> rows
  const cardRefs = useRef({}); // messageId -> element
  const [highlightedId, setHighlightedId] = useState(null);

  useEffect(() => {
    fetchMessages(true);
  }, [fetchMessages]);

  // 公共统计（用于首页顶部展示）
  const [pubCounts, setPubCounts] = useState({ approved: 0, rejected: 0, total: 0 });
  useEffect(() => {
    const loadCounts = async () => {
      try {
        const r = await api.get('/stats/public-counts');
        const d = r?.data || { approved: 0, total: 0 };
        // Backend now returns { approved, hidden, total }. Map hidden -> rejected for UI wording.
        setPubCounts({
          approved: d.approved || 0,
          rejected: (d.rejected ?? d.hidden) || 0,
          total: d.total || 0,
        });
      } catch (err) {
        console.error(err);
      }
    };
    loadCounts();
  }, []);

  // 无限滚动
  useEffect(() => {
    const handleScroll = () => {
      const scrollBottom = window.innerHeight + (window.pageYOffset || document.documentElement.scrollTop);
      const docHeight = document.documentElement.offsetHeight;
      if (scrollBottom >= docHeight - 100 && !isLoading && !isDone) {
        fetchMessages();
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    const maybeFill = () => {
      if (!isLoading && !isDone && document.documentElement.offsetHeight <= window.innerHeight + 40) {
        fetchMessages();
      }
    };
    const fillTimer = setInterval(maybeFill, 200);
    return () => {
      clearInterval(fillTimer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isLoading, isDone]);

  // Deep-link: focus and highlight a specific message by id from ?message=ID
  useEffect(() => {
    const idParam = urlSearchParams.get('message');
    if (!idParam) return;

    const targetId = Number(idParam);
    if (!targetId) return;

    let cancelled = false;

    const tryFocus = () => {
      const el = cardRefs.current[targetId];
      if (el && !cancelled) {
        try {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (_) {}
        setHighlightedId(targetId);
        // Remove highlight after a few seconds
        setTimeout(() => {
          if (!cancelled) setHighlightedId(null);
        }, 4500);
        return true;
      }
      return false;
    };

    const ensureVisible = async () => {
      // Try immediate
      if (tryFocus()) return;
      // Progressive load if not found yet
      let guard = 0;
      while (!cancelled && !isDone && guard < 24) { // cap to avoid endless loop
        guard++;
        try { await fetchMessages(); } catch (_) {}
        await new Promise(r => setTimeout(r, 200));
        if (tryFocus()) return;
      }
      // Final attempt in case it loaded between loops
      if (tryFocus()) return;
      if (!cancelled) {
        // 可能该纸条不在公开列表或已被隐藏
        try { const { toast } = await import('sonner'); toast?.info?.('未找到指定纸条，可能已隐藏或删除'); } catch (_) {}
      }
    };

    ensureVisible();
    return () => { cancelled = true; };
  }, [urlSearchParams, fetchMessages, isDone]);

  // 计算每张卡片的行跨度
  useEffect(() => {
    const ROW_HEIGHT = 8;   // 与 CSS grid-auto-rows 一致
    const GAP = 14.4;       // 与 CSS gap 一致 (0.9rem = 14.4px)

    const resizeObservers = [];
    const calc = (id, el) => {
      if (!el) return;
      const h = el.getBoundingClientRect().height;
      const rows = Math.max(1, Math.ceil((h + GAP) / (ROW_HEIGHT + GAP)));
      setRowSpans((prev) => (prev[id] === rows ? prev : { ...prev, [id]: rows }));
    };

    Object.entries(cardRefs.current).forEach(([id, el]) => {
      if (!el) return;
      calc(id, el);
      const ro = new ResizeObserver(() => calc(id, el));
      ro.observe(el);
      resizeObservers.push(ro);
    });

    const onResize = () => {
      Object.entries(cardRefs.current).forEach(([id, el]) => calc(id, el));
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      resizeObservers.forEach((ro) => ro.disconnect());
    };
  }, [messages]);

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

  const toggleCommentsFor = (messageId) => {
    try {
      setExpandedComments(prev => ({ ...prev, [messageId]: !prev[messageId] }));
    } catch (error) {
      console.error('Error toggling comments for message:', messageId, error);
      toast.error('切换评论显示时出现错误');
    }
  };

  const submitCommentFor = async (messageId) => {
    try {
      if (!isAuthed) {
        navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
        return;
      }
      const text = (commentInput[messageId] || '').trim();
      if (!text) { toast.error('请输入评论内容'); return; }
      
      setSubmittingComment(prev => ({ ...prev, [messageId]: true }));
      
      const payload = replyTo[messageId]
        ? { content: text, parent_id: replyTo[messageId].id, is_anonymous: !!commentAnon[messageId] }
        : { content: text, is_anonymous: !!commentAnon[messageId] };
      
      const r = await api.post(`/messages/${messageId}/comments`, payload);
      if (r?.data?.id) {
        setCommentInput(prev => ({ ...prev, [messageId]: '' }));
        setReplyTo(prev => ({ ...prev, [messageId]: null }));
        setCommentAnon(prev => ({ ...prev, [messageId]: false }));
        setFocusedInput(prev => ({ ...prev, [messageId]: false }));
        await fetchMessages(true);
        toast.success('评论已发布');
      }
    } catch (e) {
      console.error('Error submitting comment:', e);
      toast.error(e.response?.data?.error || e.message || '评论失败');
    } finally {
      setSubmittingComment(prev => ({ ...prev, [messageId]: false }));
    }
  };

  return (
    <div className={cn("max-w-6xl mx-auto space-y-8", isLiquidGlass && "glass-wrapper")}> 
      {/* 瀑布流布局样式 */}
      <style dangerouslySetInnerHTML={{ __html: masonryStyles }} />
      
  {/* Announcement as Dialog */}
  <AnnouncementDialog />

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
        <div className="flex items-center justify-center space-x-4">
          <Button asChild size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
            <Link to="/write" className="flex items-center space-x-2">
              <PenTool className="w-5 h-5" />
              <span>写纸条</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/search" className="flex items-center space-x-2">
              <Search className="w-5 h-5" />
              <span>搜索</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats（移除“待审批”） */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={cn("relative text-center", isLiquidGlass && "rounded-2xl overflow-hidden")}> 
          <LiquidGlassEffect />
          <Card className="bg-transparent">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{pubCounts.approved}</div>
              <p className="text-sm text-muted-foreground">已展示</p>
            </CardContent>
          </Card>
        </div>
        <div className={cn("relative text-center", isLiquidGlass && "rounded-2xl overflow-hidden")}>
          <LiquidGlassEffect />
          <Card className="bg-transparent">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-pink-600">{pubCounts.rejected}</div>
              <p className="text-sm text-muted-foreground">已隐藏</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Messages Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">最新纸条</h2>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">{pubCounts.approved} 条纸条</Badge>
          </div>
        </div>

        <div className="messages-container">
          {messages.map((message, index) => {
            try {
              // 安全地处理评论数据，防止白屏
              const mergedComments = message.comments?.items || [];
              const totalCount = message.comments?.total ?? mergedComments.length;
              const showAllComments = expandedComments[message.id];
              const displayComments = showAllComments ? mergedComments : mergedComments.slice(0, 2);
              // 暗色模式下为前三条卡片使用深灰背景与暗色描边
              const highlightClass = index < 3
                ? (resolvedTheme === 'dark'
                    ? 'ring-2 ring-zinc-700 bg-zinc-900'
                    : 'ring-2 ring-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50')
                : '';
              
              // 确保评论数据是数组
              if (!Array.isArray(mergedComments)) {
                console.warn(`Message ${message.id} has invalid comments data:`, message.comments);
                return null; // 跳过无效的消息
              }
              
              const cardContent = (
                <ThemedCard
                  isInsideGlass={isLiquidGlass}
                  className={index < 3 && !isLiquidGlass ? highlightClass : ''}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {formatTime(message.created_at)}
                        </span>
                        {index < 3 && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                      </div>
                      <div className="flex items-center space-x-2">
                        {canEdit(message) && (
                          <div className="opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity actions-on-hover">
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
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
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
                          onClick={() => {
                            try {
                              if (!isAuthed) {
                                navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
                                return;
                              }
                              // 点击评论按钮时：展开评论区并打开输入框
                              setExpandedComments(prev => ({ ...prev, [message.id]: true }));
                              setFocusedInput(prev => ({ ...prev, [message.id]: true }));
                              setTimeout(() => {
                                if (commentInputRefs.current[message.id]) {
                                  commentInputRefs.current[message.id].focus();
                                }
                              }, 100);
                            } catch (error) {
                              console.error('Error opening comment input:', error);
                              toast.error('打开评论框时出现错误');
                            }
                          }}
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span className="ml-1 text-sm">{message.comments?.total || 0}</span>
                        </Button>
                      </div>
                    </div>
                    {/* 评论区 */}
                    <div className="space-y-3">
                      {/* 评论列表 */}
                      {displayComments && displayComments.length > 0 ? (
                        displayComments.map((comment) => {
                          const initial = (comment.user_email || comment.user_nickname || 'U').toString().slice(0,1).toUpperCase();
                          const isReply = !!comment.parent_id;
                          return (
                            <div key={comment.id} className="fade-in-down p-2 rounded-md border bg-muted/20">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-2">
                                  <Avatar className="w-6 h-6 mt-0.5">
                                    <AvatarFallback className="text-[10px] bg-muted">{initial}</AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <div className="flex items-center flex-wrap gap-1 text-xs text-muted-foreground">
                                      <span className="font-medium text-foreground">{comment.user_nickname || comment.user_email || (comment.is_anonymous ? '匿名用户' : '用户')}</span>
                                      {comment.user_student_id && (<Badge variant="outline" className="text-[10px]">{comment.user_student_id}</Badge>)}
                                      {comment.is_anonymous && (<Badge variant="secondary" className="text-[10px]">匿名</Badge>)}
                                      <span className="ml-1">{formatTime(comment.created_at)}</span>
                                      <Badge variant="outline" className="text-[10px]">#{comment.id}</Badge>
                                      {isReply && (<Badge variant="outline" className="text-[10px]">回复</Badge>)}
                                    </div>
                                    {isReply && comment.parent && (
                                      <div className="mt-1 text-[11px] text-muted-foreground">
                                        回复 <span className="font-medium">{comment.parent.user_nickname || comment.parent.user_email || '用户'}</span>
                                      </div>
                                    )}
                                    <div className="mt-1 text-sm break-words whitespace-pre-wrap">{comment.content}</div>
                                  </div>
                                </div>
                                <div className="shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => {
                                      try {
                                        if (!isAuthed) {
                                          navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
                                          return;
                                        }
                                        setReplyTo(prev => ({ ...prev, [message.id]: { id: comment.id, content: comment.content } }));
                                        setFocusedInput(prev => ({ ...prev, [message.id]: true }));
                                        setTimeout(() => {
                                          if (commentInputRefs.current[message.id]) {
                                            commentInputRefs.current[message.id].focus();
                                          }
                                        }, 100);
                                      } catch (err) {
                                        console.error('Error preparing reply:', err);
                                        toast.error('回复时出现错误');
                                      }
                                    }}
                                  >回复</Button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-xs text-muted-foreground">暂无评论</div>
                      )}
                      
                      {/* 查看更多/收起 */}
                      {mergedComments && mergedComments.length > 2 && (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs text-muted-foreground hover:text-primary"
                          onClick={() => toggleCommentsFor(message.id)}
                        >
                          {showAllComments ? (
                            <><ChevronUp className="w-3 h-3 mr-1" />收起</>
                          ) : (
                            <><ChevronDown className="w-3 h-3 mr-1" />查看全部 {totalCount} 条评论</>
                          )}
                        </Button>
                      )}

                      {/* 评论输入区 */}
                      {focusedInput && focusedInput[message.id] && (
                        <div className="mt-3 space-y-2">
                          {replyTo && replyTo[message.id] && (
                            <div className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/30">
                              <div className="truncate">
                                回复 评论 #{replyTo[message.id].id}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2"
                                onClick={() => setReplyTo(prev => ({ ...prev, [message.id]: null }))}
                              >
                                <X className="w-3 h-3 mr-1" /> 取消
                              </Button>
                            </div>
                          )}
                          <div className="flex items-start space-x-2">
                            <Textarea
                              ref={(el) => { commentInputRefs.current[message.id] = el; }}
                              value={commentInput[message.id] || ''}
                              onChange={(e) => setCommentInput(prev => ({ ...prev, [message.id]: e.target.value }))}
                              placeholder="写下你的评论..."
                              rows={3}
                              className="flex-1"
                            />
                            <div className="flex flex-col items-stretch gap-2">
                              <Button
                                onClick={() => submitCommentFor(message.id)}
                                disabled={!!submittingComment[message.id]}
                              >
                                {submittingComment[message.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : (<><Send className="w-4 h-4 mr-1" />发布</>)}
                              </Button>
                              <label className="flex items-center space-x-2 text-xs text-muted-foreground px-2">
                                <Checkbox
                                  checked={!!commentAnon[message.id]}
                                  onCheckedChange={(v) => setCommentAnon(prev => ({ ...prev, [message.id]: !!v }))}
                                  id={`anon-${message.id}`}
                                />
                                <span>匿名</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </ThemedCard>
              );
              
              return (
                <div
                  key={message.id}
                  ref={(el) => (cardRefs.current[message.id] = el)}
                  style={{ gridRowEnd: `span ${rowSpans[message.id] || 1}` }}
                  className={cn(
                    'message-card group relative',
                    isLiquidGlass && 'no-tilt rounded-2xl overflow-hidden',
                    highlightedId === message.id && (isLiquidGlass ? 'message-highlight-glass' : 'message-highlight-default')
                  )}
                >
                  <LiquidGlassEffect />
                  {cardContent}
                </div>
            );
          } catch (error) {
            console.error('Error rendering message:', message?.id, error);
            // 返回一个错误占位符，而不是完全跳过
            return (
              <div key={`error-${message?.id || index}`} className="message-card">
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-4 text-center">
                  <p className="text-red-600 text-sm">加载纸条时出现错误</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => window.location.reload()}
                  >
                    重新加载
                  </Button>
                  </CardContent>
                </Card>
              </div>
            );
          }
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