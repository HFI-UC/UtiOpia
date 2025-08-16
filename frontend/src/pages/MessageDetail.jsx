import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Heart, MessageCircle, Clock, User, Loader2, Reply } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';
import useAuthStore from '../stores/authStore';

const MessageDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const isAuthed = !!token;
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState({ items: [], total: 0 });
  const [cLoading, setCLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null); // { id, content }
  const [likeBusy, setLikeBusy] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const r = await api.get(`/messages/${id}`);
        setDetail(r?.data?.item || null);
      } catch (e) {
        toast.error(e.response?.data?.error || e.message || '加载失败');
      } finally { setLoading(false); }
    };
    load();
  }, [id]);

  const loadComments = async () => {
    setCLoading(true);
    try {
      const r = await api.get(`/messages/${id}/comments`, { params: { page: 1, pageSize: 100 } });
      setComments({ items: r?.data?.items || [], total: r?.data?.total || 0 });
    } catch (e) {
      setComments({ items: [], total: 0 });
    } finally { setCLoading(false); }
  };

  useEffect(() => { loadComments(); }, [id]);

  const formatTime = (s) => {
    const d = new Date(s);
    return d.toLocaleString('zh-CN', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
  };

  const toggleLike = async () => {
    if (!isAuthed) { navigate('/login?redirect=' + encodeURIComponent(location.pathname)); return; }
    if (!detail) return;
    try {
      setLikeBusy(true);
      const r = await api.post(`/messages/${detail.id}/like`);
      const liked = !!r?.data?.liked;
      setDetail(prev => prev ? ({ ...prev, liked_by_me: liked, likes_count: Math.max(0, (prev.likes_count||0) + ((liked?1:0) - (prev.liked_by_me?1:0))) }) : prev);
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || '操作失败');
    } finally { setLikeBusy(false); }
  };

  const submitComment = async () => {
    if (!isAuthed) { navigate('/login?redirect=' + encodeURIComponent(location.pathname)); return; }
    const content = newComment.trim();
    if (!content) { toast.error('请输入评论内容'); return; }
    try {
      const payload = replyTo ? { content, parent_id: replyTo.id } : { content };
      const r = await api.post(`/messages/${id}/comments`, payload);
      if (r?.data?.id) {
        setNewComment('');
        setReplyTo(null);
        await loadComments();
        toast.success('评论已发布');
      }
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || '评论失败');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />加载中...
      </div>
    );
  }

  if (!detail) return <div className="text-center text-muted-foreground">不存在或不可见</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{formatTime(detail.created_at)}</span>
            </div>
            <Badge variant="outline">#{detail.id}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm whitespace-pre-wrap">{detail.content}</div>
          {detail.image_url && (
            <img src={detail.image_url} alt="图片" className="w-full rounded-md border" />
          )}
        </CardContent>
        <CardFooter>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              <Avatar className="w-6 h-6">
                <AvatarFallback className="text-xs">
                  {detail.user_email ? detail.user_email.charAt(0).toUpperCase() : <User className="w-3 h-3" />}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">{detail.user_email || '匿名用户'}</span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                className={`inline-flex items-center text-sm ${detail.liked_by_me ? 'text-red-500' : 'text-muted-foreground'} hover:text-red-500 transition-colors`}
                onClick={toggleLike}
                disabled={likeBusy}
              >
                <Heart className={`w-4 h-4 mr-1 ${detail.liked_by_me ? 'fill-current' : ''}`} />
                <span>{detail.likes_count || 0}</span>
              </button>
            </div>
          </div>
        </CardFooter>
      </Card>

      {/* Comments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="font-medium">评论</div>
            <Badge variant="outline">{comments.total}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {cLoading ? (
            <div className="text-sm text-muted-foreground flex items-center"><Loader2 className="w-4 h-4 animate-spin mr-2"/>加载中…</div>
          ) : (
            (comments.items || []).length === 0 ? (
              <div className="text-sm text-muted-foreground">暂无评论</div>
            ) : (
              <div className="space-y-3">
                {comments.items.map(c => (
                  <div key={c.id} className="p-3 border rounded-md">
                    <div className="text-sm whitespace-pre-wrap break-words">{c.content}</div>
                    <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
                      <span>{formatTime(c.created_at)}</span>
                      <Button variant="ghost" size="sm" onClick={() => { if (!isAuthed) { navigate('/login?redirect=' + encodeURIComponent(location.pathname)); return; } setReplyTo({ id: c.id, content: c.content }); }}>
                        <Reply className="w-3 h-3 mr-1"/>回复
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </CardContent>
        <CardFooter>
          <div className="w-full space-y-2">
            {replyTo && (
              <div className="text-xs text-muted-foreground">正在回复：{replyTo.content.slice(0, 40)}</div>
            )}
            <Textarea placeholder={isAuthed ? '写下你的评论...' : '登录后参与评论'} value={newComment} onChange={e=>setNewComment(e.target.value)} disabled={!isAuthed} />
            <div className="flex items-center justify-between">
              {!isAuthed ? (
                <div className="text-xs text-muted-foreground">
                  想要发表评论或回复？
                  <Link to={`/login?redirect=${encodeURIComponent(location.pathname)}`} className="text-blue-600 ml-1">去登录</Link>
                  <span className="mx-1">/</span>
                  <Link to={`/register?redirect=${encodeURIComponent(location.pathname)}`} className="text-blue-600">去注册</Link>
                </div>
              ) : <span />}
              <Button onClick={submitComment} disabled={!isAuthed}>发表评论</Button>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default MessageDetail;


