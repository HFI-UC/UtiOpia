import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  EyeOff,
  AlertTriangle,
  User,
  Calendar,
  MessageSquare,
  Filter,
  Ban,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const Moderation = () => {
  const [allMessages, setAllMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [trail, setTrail] = useState([]);
  const [rejectDialog, setRejectDialog] = useState({ open: false, id: null, text: '' });
  const [banDialog, setBanDialog] = useState({ open: false, selected: {}, options: [], reason: '' });
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [banSubmitting, setBanSubmitting] = useState(false);
  const [expanded, setExpanded] = useState({}); // messageId -> boolean
  const [commentsByMsg, setCommentsByMsg] = useState({}); // messageId -> { loading, items, total }
  const [activeTab, setActiveTab] = useState('displayed'); // 'displayed' or 'hidden'
  const PREVIEW_LIMIT = 2;

  // 加载真实数据
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const resp = await api.get('/messages', { params: { page: 1, pageSize: 100, order: 'desc', status: 'all' } });
        const items = resp.data?.items || [];
        items.sort((a,b)=> new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setAllMessages(items);
        // 预加载每条的评论预览
        items.forEach(m => preloadComments(m.id));
      } catch (e) {
        toast.error('加载审核数据失败');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Load audit trail when opening detail
  useEffect(() => {
    const loadTrail = async () => {
      if (!detail) return;
      try {
        const r = await api.get('/logs', { params: { page: 1, pageSize: 50 } });
        const items = r?.data?.items || [];
        const related = items.filter(it => {
          try {
            const meta = typeof it.meta === 'string' ? JSON.parse(it.meta) : it.meta;
            return meta && Number(meta.message_id) === Number(detail.id);
          } catch { return false; }
        });
        setTrail(related);
      } catch { setTrail([]); }
    };
    loadTrail();
  }, [detail]);

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
  
  const handleQuickBan = async (message) => {
    const email = message.user_email || message.anon_email || '';
    const studentId = message.anon_student_id || '';
    const options = [];
    if (email) options.push({ label: `邮箱 ${email}`, type: 'email', value: email });
    if (studentId) options.push({ label: `学号 ${studentId}`, type: 'student_id', value: studentId });
    if (options.length === 0) {
      toast.error('无可封禁的标识');
      return;
    }
    const selected = Object.fromEntries(options.map(o => [o.value, true]));
    setBanDialog({ open: true, selected, options, reason: '' });
  };

  const handleApprove = async (messageId) => {
    setLoading(true);
    try {
      await api.post(`/messages/${messageId}/approve`);
      updateMessageStatusInState(messageId, 'approved');
      toast.success('内容已展示');
    } catch (error) {
      const msg = error.response?.data?.error || error.message || '操作失败';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (messageId, reason) => {
    const rejectReason = reason;
    if (!rejectReason) { setRejectDialog({ open: true, id: messageId, text: '' }); return; }
    setLoading(true);
    try {
      await api.post(`/messages/${messageId}/reject`, { reason: rejectReason });
      updateMessageStatusInState(messageId, 'rejected', rejectReason);
      toast.success('内容已隐藏');
    } catch (error) {
      const msg = error.response?.data?.error || error.message || '操作失败';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const updateMessageStatusInState = (messageId, status, rejectReason = '') => {
    setAllMessages(prev => prev.map(m => m.id === messageId ? { ...m, status, reviewed_at: new Date().toISOString(), reject_reason: status==='rejected'?rejectReason:undefined } : m));
  };

  const preloadComments = async (messageId) => {
    if (commentsByMsg[messageId]) return;
    setCommentsByMsg(prev => ({ ...prev, [messageId]: { loading: true, items: [], total: 0 } }));
    try {
      const r = await api.get(`/messages/${messageId}/comments`, { params: { page: 1, pageSize: 10 } });
      const items = r?.data?.items || [];
      const total = r?.data?.total || items.length;
      setCommentsByMsg(prev => ({ ...prev, [messageId]: { loading: false, items, total } }));
    } catch {
      setCommentsByMsg(prev => ({ ...prev, [messageId]: { loading: false, items: [], total: 0 } }));
    }
  };

  const toggleExpandComments = async (messageId) => {
    setExpanded(prev => ({ ...prev, [messageId]: !prev[messageId] }));
    const opened = !expanded[messageId];
    if (opened) {
      setCommentsByMsg(prev => ({ ...prev, [messageId]: { ...(prev[messageId]||{}), loading: true } }));
      try {
        const r = await api.get(`/messages/${messageId}/comments`, { params: { page: 1, pageSize: 100 } });
        const items = r?.data?.items || [];
        const total = r?.data?.total || items.length;
        setCommentsByMsg(prev => ({ ...prev, [messageId]: { loading: false, items, total } }));
      } catch {
        setCommentsByMsg(prev => ({ ...prev, [messageId]: { loading: false, items: [], total: 0 } }));
      }
    }
  };

  const showCommentsFor = (messageId) => {
    if (!commentsByMsg[messageId]) { preloadComments(messageId); }
    setExpanded(prev => ({ ...prev, [messageId]: true }));
  };
  const hideCommentsFor = (messageId) => {
    setExpanded(prev => ({ ...prev, [messageId]: false }));
  };

  const approveComment = async (commentId, messageId) => {
    try {
      await api.post(`/comments/${commentId}/approve`);
      setCommentsByMsg(prev => ({
        ...prev,
        [messageId]: {
          ...(prev[messageId]||{ loading:false, items:[] }),
          items: (prev[messageId]?.items||[]).map(c => c.id === commentId ? { ...c, status: 'approved' } : c)
        }
      }));
      toast.success('评论已展示');
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || '操作失败');
    }
  };

  const rejectComment = async (commentId, messageId) => {
    const reason = window.prompt('请输入隐藏原因（可留空）', '');
    try {
      await api.post(`/comments/${commentId}/reject`, { reason });
      setCommentsByMsg(prev => ({
        ...prev,
        [messageId]: {
          ...(prev[messageId]||{ loading:false, items:[] }),
          items: (prev[messageId]?.items||[]).map(c => c.id === commentId ? { ...c, status: 'rejected', reject_reason: reason } : c)
        }
      }));
      toast.success('评论已隐藏');
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || '操作失败');
    }
  };

  const MessageCard = ({ message }) => (
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
                已展示
              </Badge>
            )}
            {message.status === 'rejected' && (
              <Badge variant="destructive">
                <EyeOff className="w-3 h-3 mr-1" />
                已隐藏
              </Badge>
            )}
            {/* 统一到下方，仅保留隐藏按钮，这里移除顶部操作 */}
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
            <span className="text-sm text-red-700">隐藏原因：{message.reject_reason}</span>
          </div>
        )}
        
        {message.reviewed_at && (
          <div className="text-xs text-muted-foreground">
            审核时间：{formatTime(message.reviewed_at)} | 审核人：{message.reviewed_by ?? '未检查'}
          </div>
        )}

        {/* 评论区域：默认展示前几条；卡片 hover 自动展开更多，移出收起 */}
        <div className="pt-2" onMouseEnter={()=> showCommentsFor(message.id)} onMouseLeave={()=> hideCommentsFor(message.id)}>
          {!expanded[message.id] && (
            <div className="text-xs text-muted-foreground mb-2">鼠标移入查看更多评论</div>
          )}
          {expanded[message.id] && (
            <div className="mt-3 space-y-2">
              {commentsByMsg[message.id]?.loading && (
                <div className="text-xs text-muted-foreground">加载评论中…</div>
              )}
              {(commentsByMsg[message.id]?.items || []).length === 0 && !commentsByMsg[message.id]?.loading && (
                <div className="text-xs text-muted-foreground">暂无评论</div>
              )}
              {(() => {
                const items = (commentsByMsg[message.id]?.items || []);
                const total = commentsByMsg[message.id]?.total || items.length;
                const display = expanded[message.id] ? items : items.slice(0, PREVIEW_LIMIT);
                const hasMore = items.length > PREVIEW_LIMIT || total > PREVIEW_LIMIT;
                return display.map((c) => (
                <div key={c.id} className="p-2 border rounded-md">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-2">
                      <Avatar className="w-6 h-6 mt-0.5">
                        <AvatarFallback className="text-[10px] bg-muted">
                          {(c.user_email || '').slice(0,1).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <span className="font-medium text-sm text-foreground">{c.user_nickname || c.user_email || '用户'}</span>
                          {c.user_student_id && <Badge variant="outline">{c.user_student_id}</Badge>}
                          {c.is_anonymous ? (<Badge variant="secondary">匿名</Badge>) : null}
                        </div>
                        <Tooltip delayDuration={150}>
                          <TooltipTrigger asChild>
                            <div className="text-sm break-words line-clamp-2 cursor-default">{c.content}</div>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={6}>
                            <div className="max-w-[60ch] whitespace-pre-wrap text-sm">{c.content}</div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {c.status === 'approved' && (<Badge variant="outline">已展示</Badge>)}
                      {c.status === 'rejected' && (<Badge variant="destructive">已隐藏</Badge>)}
                      {c.status === 'pending' && (<Badge variant="secondary">待审核</Badge>)}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center space-x-2">
                    <Button size="sm" variant={c.status==='approved'?'outline':'default'} onClick={()=>approveComment(c.id, message.id)}>
                      <Eye className="w-3 h-3 mr-1" />展示
                    </Button>
                    <Button size="sm" variant="destructive" onClick={()=>rejectComment(c.id, message.id)}>
                      <EyeOff className="w-3 h-3 mr-1" />隐藏
                    </Button>
                    {(c.user_email || c.user_student_id) && (
                      <Button size="sm" variant="outline" onClick={()=> handleQuickBan({ user_email: c.user_email, anon_student_id: c.user_student_id })}>
                        <Ban className="w-3 h-3 mr-1" />封禁
                      </Button>
                    )}
                  </div>
                </div>
              )); })()}
              {(() => {
                const items = (commentsByMsg[message.id]?.items || []);
                const total = commentsByMsg[message.id]?.total || items.length;
                const hasMore = (items.length > PREVIEW_LIMIT || total > PREVIEW_LIMIT) && !expanded[message.id];
                if (!hasMore) return null;
                return (
                  <Button size="sm" variant="link" className="h-auto p-0 text-xs" onClick={()=> toggleExpandComments(message.id)}>
                    查看全部 {total} 条评论
                  </Button>
                );
              })()}
            </div>
          )}
        </div>
        
        {
          <div className="flex space-x-2 pt-2">
            <Button 
              size="sm" 
              variant="destructive"
              onClick={() => handleReject(message.id)}
              disabled={loading}
            >
              <EyeOff className="w-4 h-4 mr-1" />
              隐藏
            </Button>
            {(message.user_email || message.anon_email || message.anon_student_id) && (
              <Button size="sm" variant="outline" onClick={() => handleQuickBan(message)} disabled={loading}>
                <Ban className="w-4 h-4 mr-1" />
                封禁
              </Button>
            )}
          </div>
        }
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">总计</p>
                <p className="text-xl font-bold">{allMessages.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">已展示</p>
                <p className="text-xl font-bold">{allMessages.filter(m => m.status === 'approved').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <EyeOff className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">已隐藏</p>
                  <p className="text-xl font-bold">{allMessages.filter(m => m.status === 'rejected').length}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grouped View */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="displayed">
            <Eye className="w-4 h-4 mr-2" />
            已展示 ({allMessages.filter(m => m.status === 'approved').length})
          </TabsTrigger>
          <TabsTrigger value="hidden">
            <EyeOff className="w-4 h-4 mr-2" />
            已隐藏 ({allMessages.filter(m => m.status === 'rejected').length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="displayed" className="space-y-4">
          {allMessages.filter(m => m.status === 'approved').length > 0 ? (
            allMessages.filter(m => m.status === 'approved').map(message => (
              <MessageCard key={message.id} message={message} />
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">暂无已展示内容</h3>
                <p className="text-muted-foreground">当前没有已展示的纸条</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="hidden" className="space-y-4">
          {allMessages.filter(m => m.status === 'rejected').length > 0 ? (
            allMessages.filter(m => m.status === 'rejected').map(message => (
              <MessageCard key={message.id} message={message} />
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <EyeOff className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">暂无已隐藏内容</h3>
                <p className="text-muted-foreground">当前没有已隐藏的纸条</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      <Dialog open={!!detail} onOpenChange={(o)=>{ if(!o){ setDetail(null); setTrail([]);} }}>
        <DialogContent className="max-w-2xl relative">
          <DialogHeader>
            <DialogTitle>纸条详情 #{detail?.id}</DialogTitle>
            <DialogDescription>
              创建于 {detail ? formatTime(detail.created_at) : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              {detail?.status === 'pending' && (<Badge variant="secondary"><Clock className="w-3 h-1"/>待审核</Badge>)}
              {detail?.status === 'approved' && (<Badge variant="default"><CheckCircle className="w-3 h-3 mr-1"/>已展示</Badge>)}
              {detail?.status === 'rejected' && (<Badge variant="destructive"><EyeOff className="w-3 h-3 mr-1"/>已隐藏</Badge>)}
            </div>
            <div className="text-sm whitespace-pre-wrap break-words">
              {detail?.content}
            </div>
            {detail?.image_url && (
              <div className="rounded-md overflow-hidden border">
                <img src={detail.image_url} alt="预览" className="w-full h-64 object-cover" />
              </div>
            )}
            {detail?.is_anonymous && (detail?.anon_email || detail?.anon_student_id) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {detail?.anon_email && (
                  <div className="flex items-center space-x-2 p-2 rounded-md border bg-muted/30">
                    <User className="w-3 h-3" />
                    <span className="text-muted-foreground">匿名邮箱：</span>
                    <span className="font-medium break-all">{detail.anon_email}</span>
                  </div>
                )}
                {detail?.anon_student_id && (
                  <div className="flex items-center space-x-2 p-2 rounded-md border bg-muted/30">
                    <User className="w-3 h-3" />
                    <span className="text-muted-foreground">匿名学号：</span>
                    <span className="font-medium break-all">{detail.anon_student_id}</span>
                  </div>
                )}
              </div>
            )}
            {detail?.status === 'rejected' && detail?.reject_reason && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg border border-red-200">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-700">隐藏原因：{detail.reject_reason}</span>
              </div>
            )}
            {/* 审计轨迹 */}
            <div className="space-y-2">
              <p className="text-sm font-medium">审计轨迹</p>
              <div className="rounded-md border bg-muted/30 p-3 max-h-48 overflow-auto text-xs">
                {trail.length === 0 ? (
                  <p className="text-muted-foreground">无相关记录</p>
                ) : (
                  <ul className="space-y-2">
                    {trail.map((it) => (
                      <li key={it.id} className="flex items-start justify-between">
                        <span className="break-all">{it.action}</span>
                        <span className="text-muted-foreground ml-2 whitespace-nowrap">{formatTime(it.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="justify-between">
            <div className="text-xs text-muted-foreground">审核人：{detail?.reviewed_by || '-'} {detail?.reviewed_at ? `· ${formatTime(detail.reviewed_at)}` : ''}</div>
            <div className="space-x-2">
              <Button size="sm" variant="destructive" onClick={()=>detail && handleReject(detail.id)} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin"/> : <EyeOff className="w-4 h-4 mr-1"/>}
                {loading ? '处理中...' : '隐藏'}
              </Button>
            </div>
          </DialogFooter>
          {loading && (
            <div className="absolute inset-0 bg-white/60 dark:bg-black/40 rounded-lg flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectDialog.open} onOpenChange={(o)=> setRejectDialog(prev => ({ ...prev, open: o }))}>
        <DialogContent className="relative">
          <DialogHeader>
            <DialogTitle>请输入隐藏理由</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <textarea className="w-full border rounded-md p-2 text-sm" rows={4} placeholder="内容不当" value={rejectDialog.text} onChange={(e)=> setRejectDialog(prev => ({ ...prev, text: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=> setRejectDialog({ open: false, id: null, text: '' })}>取消</Button>
            <Button onClick={async ()=>{
              if (!rejectDialog.id || !rejectDialog.text) return;
              setRejectSubmitting(true);
              try {
                await api.post(`/messages/${rejectDialog.id}/reject`, { reason: rejectDialog.text });
                // 统一使用 allMessages 状态
                setAllMessages(prev => prev.map(m => m.id === rejectDialog.id ? { ...m, status: 'rejected', reviewed_at: new Date().toISOString(), reject_reason: rejectDialog.text } : m));
                toast.success('内容已隐藏');
              } catch (error) {
                const msg = error.response?.data?.error || error.message || '操作失败';
                toast.error(msg);
              } finally {
                setRejectSubmitting(false);
                setRejectDialog({ open: false, id: null, text: '' });
              }
            }} disabled={rejectSubmitting}>
              {rejectSubmitting ? (<><Loader2 className="w-4 h-4 mr-1 animate-spin"/>提交中...</>) : '确认'}
            </Button>
          </DialogFooter>
          {rejectSubmitting && (
            <div className="absolute inset-0 bg-white/60 dark:bg-black/40 rounded-lg flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Ban Modal */}
      <Dialog open={banDialog.open} onOpenChange={(o)=> setBanDialog(prev => ({ ...prev, open: o }))}>
        <DialogContent className="relative">
          <DialogHeader>
            <DialogTitle>封禁目标与原因</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              {banDialog.options.map(opt => (
                <label key={opt.value} className="flex items-center space-x-2 border rounded-md p-2 cursor-pointer">
                  <input type="checkbox" checked={!!banDialog.selected[opt.value]} onChange={(e)=>{
                    const checked = e.target.checked;
                    setBanDialog(prev => ({ ...prev, selected: { ...prev.selected, [opt.value]: checked } }));
                  }} />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
            <textarea className="w-full border rounded-md p-2 text-sm" rows={3} placeholder="封禁原因（可选）" value={banDialog.reason} onChange={(e)=> setBanDialog(prev => ({ ...prev, reason: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=> setBanDialog({ open: false, selected: {}, options: [], reason: '' })}>取消</Button>
            <Button onClick={async ()=>{
              const chosen = (banDialog.options||[]).filter(opt => !!banDialog.selected[opt.value]);
              if (chosen.length === 0) return;
              try {
                setBanSubmitting(true);
                for (const opt of chosen) {
                  await api.post('/bans', { type: opt.type, value: opt.value, reason: banDialog.reason });
                }
                toast.success('封禁成功');
              } catch (e) {
                const msg = e.response?.data?.error || e.message || '封禁失败';
                toast.error(msg);
              } finally {
                setBanSubmitting(false);
                setBanDialog({ open: false, selected: {}, options: [], reason: '' });
              }
            }} disabled={banSubmitting}>
              {banSubmitting ? (<><Loader2 className="w-4 h-4 mr-1 animate-spin"/>提交中...</>) : '确认'}
            </Button>
          </DialogFooter>
          {banSubmitting && (
            <div className="absolute inset-0 bg-white/60 dark:bg-black/40 rounded-lg flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Moderation;

