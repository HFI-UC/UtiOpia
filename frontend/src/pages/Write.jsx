import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Loader2, 
  Send, 
  Image as ImageIcon, 
  X, 
  Upload,
  AlertCircle,
  Eye,
  EyeOff,
  Smile,
  Heart,
  Star
} from 'lucide-react';
import { toast } from 'sonner';
import useMessagesStore from '../stores/messagesStore';
import useAuthStore from '../stores/authStore';
import Turnstile from '../components/Turnstile';
import api from '../lib/api';

const Write = () => {
  const navigate = useNavigate();
  const { createMessage, isLoading, error, clearError } = useMessagesStore();
  const { user, token } = useAuthStore();
  
  const [formData, setFormData] = useState({
    content: '',
    imageUrl: '',
    isAnonymous: !token, // 未登录用户默认匿名
    anonEmail: '',
    anonStudentId: '',
    anonPassphrase: ''
  });
  const [turnstileToken, setTurnstileToken] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [stats, setStats] = useState({ today: null, week: null, total: null });
  const [loadingStats, setLoadingStats] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);

  const isAuthenticated = !!token;
  const maxContentLength = 500;
  const remainingChars = maxContentLength - formData.content.length;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) clearError();
  };

  const handleAnonymousChange = (checked) => {
    setFormData(prev => ({ ...prev, isAnonymous: checked }));
  };

  const handleImageSelect = (file) => {
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过 5MB');
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }
    
    setImageFile(file);
    
    // 创建预览
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
    
    // 上传图片
    uploadImage(file);
  };

  const uploadImage = async (file) => {
    setUploadingImage(true);
    try {
      // 获取预签名URL
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await api.post('/upload/presign', {
        filename: file.name,
        size: file.size
      }, { headers: authHeaders });
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      const { upload_url, headers: uploadHeaders, public_url, get_url } = response.data;
      
      // 上传到COS
      await fetch(upload_url, {
        method: 'PUT',
        headers: uploadHeaders,
        body: file
      });
      
      const imageUrl = get_url || public_url;
      setFormData(prev => ({ ...prev, imageUrl }));
      toast.success('图片上传成功！');
    } catch (error) {
      toast.error('图片上传失败：' + error.message);
      setImageFile(null);
      setImagePreview('');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    setFormData(prev => ({ ...prev, imageUrl: '' }));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const addEmoji = (emoji) => {
    setFormData(prev => ({
      ...prev,
      content: prev.content + emoji
    }));
  };

  useEffect(() => {
    const fetchPublishStats = async () => {
      setLoadingStats(true);
      try {
        // Always get total approved count via list endpoint (public)
        const totalReq = api.get('/messages', { params: { status: 'approved', pageSize: 1, page: 1 } });

        // Prefer admin stats if permitted; otherwise fallback to client-aggregate
        let todayCount = null;
        let weekCount = null;

        if (token) {
          try {
            const seriesResp = await api.get('/stats/messages', { params: { days: 7 } });
            const items = seriesResp?.data?.items || [];
            const todayStr = new Date().toISOString().slice(0, 10);
            const todayItem = items.find(it => it.date === todayStr);
            todayCount = todayItem ? (todayItem.total ?? todayItem.count ?? 0) : 0;
            weekCount = items.reduce((sum, it) => sum + (it.total ?? it.count ?? 0), 0);
          } catch (_) {
            // No permission or error → fallback below
          }
        }

        if (todayCount === null || weekCount === null) {
          // Fallback: paginate approved messages until older than 7 days or max pages
          const pageSize = 50;
          const maxPages = 5;
          let page = 1;
          let done = false;
          let today = 0;
          let week = 0;
          const now = new Date();
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const sevenDaysAgo = new Date(startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000); // inclusive 7 days window

          while (!done && page <= maxPages) {
            const resp = await api.get('/messages', { params: { status: 'approved', pageSize, page } });
            const items = resp?.data?.items || [];
            if (items.length === 0) break;
            for (const m of items) {
              const createdAt = new Date(m.created_at);
              if (isNaN(createdAt.getTime())) continue;
              if (createdAt >= startOfToday) today += 1;
              if (createdAt >= sevenDaysAgo) {
                week += 1;
              } else {
                done = true;
                break;
              }
            }
            page += 1;
          }
          todayCount = today;
          weekCount = week;
        }

        const totalResp = await totalReq;
        const total = totalResp?.data?.total ?? null;
        setStats({ today: todayCount, week: weekCount, total });
      } catch (_) {
        setStats({ today: null, week: null, total: null });
      } finally {
        setLoadingStats(false);
      }
    };

    fetchPublishStats();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.content.trim()) {
      toast.error('请输入纸条内容');
      return;
    }
    
    if (!turnstileToken) {
      toast.error('请完成安全验证');
      return;
    }
    
    // 如果是未登录用户的匿名发布，需要验证必填字段
    if (formData.isAnonymous && !isAuthenticated) {
      if (!formData.anonEmail || !formData.anonStudentId || !formData.anonPassphrase) {
        toast.error('请填写完整的身份信息');
        return;
      }
    }
    
    // 如果是已登录用户的实名发布，需要确认
    if (!formData.isAnonymous && isAuthenticated) {
      setConfirmOpen(true);
      return;
    }

    try {
      const messageData = {
        content: formData.content,
        image_url: formData.imageUrl,
        turnstile_token: turnstileToken,
        is_anonymous: formData.isAnonymous
      };
      
      // 如果是匿名发布且未登录，添加匿名身份信息
      if (formData.isAnonymous && !isAuthenticated) {
        messageData.anon_email = formData.anonEmail;
        messageData.anon_student_id = formData.anonStudentId;
        messageData.anon_passphrase = formData.anonPassphrase;
      }
      
      await createMessage(messageData);
      toast.success('纸条发布成功，正在等待审核！');
      navigate('/');
    } catch (err) {
      // 错误已经在store中处理
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          写纸条
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          分享你的想法，让心声传达到更远的地方
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>创建新纸条</CardTitle>
              <CardDescription>
                写下你想分享的内容，可以是想法、心情或者有趣的故事
              </CardDescription>
            </CardHeader>
            
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                {/* Anonymous Option for Authenticated Users */}
                {isAuthenticated && (
                  <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <Checkbox
                      id="anonymous"
                      checked={formData.isAnonymous}
                      onCheckedChange={handleAnonymousChange}
                    />
                    <Label htmlFor="anonymous" className="flex items-center space-x-2 cursor-pointer">
                      {formData.isAnonymous ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      <span>匿名发布</span>
                    </Label>
                    <span className="text-xs text-muted-foreground ml-2">
                      其他用户将看不到你的身份
                    </span>
                  </div>
                )}
                
                {/* Anonymous User Info */}
                {formData.isAnonymous && !isAuthenticated && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">👤</span>
                      </div>
                      <h3 className="font-medium">身份信息</h3>
                      <span className="text-xs text-muted-foreground">用于身份验证</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="anonEmail">学校邮箱</Label>
                        <Input
                          id="anonEmail"
                          name="anonEmail"
                          type="email"
                          placeholder="your.email@school.edu"
                          value={formData.anonEmail}
                          onChange={handleInputChange}
                          required={formData.isAnonymous && !isAuthenticated}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="anonStudentId">学生号</Label>
                        <Input
                          id="anonStudentId"
                          name="anonStudentId"
                          placeholder="GJ20230001"
                          value={formData.anonStudentId}
                          onChange={handleInputChange}
                          required={formData.isAnonymous && !isAuthenticated}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="anonPassphrase">身份口令</Label>
                      <Input
                        id="anonPassphrase"
                        name="anonPassphrase"
                        type="password"
                        placeholder="用于编辑和删除的口令"
                        value={formData.anonPassphrase}
                        onChange={handleInputChange}
                        required={formData.isAnonymous && !isAuthenticated}
                      />
                      <p className="text-xs text-muted-foreground">
                        请记住此口令，用于后续编辑或删除纸条
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Content */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="content">内容</Label>
                    <span className={`text-xs ${remainingChars < 50 ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {remainingChars}/{maxContentLength}
                    </span>
                  </div>
                  <div className="relative">
                    <Textarea
                      id="content"
                      name="content"
                      placeholder="写下你想说的话...

可以是：
💭 一个有趣的想法
😊 今天的心情
📚 学习感悟
🎵 喜欢的歌词
或者任何你想分享的内容"
                      value={formData.content}
                      onChange={handleInputChange}
                      className="min-h-[200px] resize-none"
                      maxLength={maxContentLength}
                      required
                    />
                    <div className="absolute bottom-3 right-3 flex space-x-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addEmoji('😊')}
                        className="h-8 w-8 p-0"
                      >
                        😊
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addEmoji('💝')}
                        className="h-8 w-8 p-0"
                      >
                        💝
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addEmoji('🎉')}
                        className="h-8 w-8 p-0"
                      >
                        🎉
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Image Upload */}
                <div className="space-y-2">
                  <Label>图片 (可选)</Label>
                  
                  {!imagePreview ? (
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        isDragOver 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <div className="space-y-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">
                            拖拽图片到这里或{' '}
                            <Label htmlFor="image-upload" className="text-blue-500 hover:text-blue-600 cursor-pointer underline">
                              点击选择
                            </Label>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            支持 JPG、PNG 格式，最大 5MB
                          </p>
                        </div>
                        <Input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageSelect(e.target.files[0])}
                          className="hidden"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative rounded-lg overflow-hidden border">
                        <img
                          src={imagePreview}
                          alt="预览"
                          className="w-full h-64 object-cover"
                        />
                        {uploadingImage && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="flex items-center space-x-2 text-white">
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>上传中...</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="absolute top-2 right-2 flex space-x-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={removeImage}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <Label htmlFor="image-replace" className="cursor-pointer">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            asChild
                          >
                            <span>
                              <Upload className="w-4 h-4" />
                            </span>
                          </Button>
                        </Label>
                        <Input
                          id="image-replace"
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageSelect(e.target.files[0])}
                          className="hidden"
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Security Verification */}
                <div className="space-y-2">
                  <Label>安全验证</Label>
                  <Turnstile onVerified={setTurnstileToken} />
                </div>
              </CardContent>
              
              <CardFooter className="flex flex-col space-y-4">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || !turnstileToken || uploadingImage}
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      发布中...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-5 w-5" />
                      发布纸条
                    </>
                  )}
                </Button>
                
                <p className="text-center text-xs text-muted-foreground">
                  发布后需要等待审核通过才会显示
                </p>
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* Tips Sidebar */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-0">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">💡</span>
                </div>
                <span>小贴士</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-muted-foreground">内容应当积极向上，遵守社区规范</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-muted-foreground">支持换行和简单的文本格式</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-pink-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-muted-foreground">图片会自动压缩到合适大小</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-muted-foreground">匿名发布时请记住身份口令</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-muted-foreground">所有内容都会经过审核</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">发布统计</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">今日发布</span>
                <span className="font-medium">{loadingStats ? '…' : (stats.today ?? '-')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">本周发布</span>
                <span className="font-medium">{loadingStats ? '…' : (stats.week ?? '-')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">总发布数</span>
                <span className="font-medium">{loadingStats ? '…' : (stats.total ?? '-')}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Confirm Modal */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="relative">
          <DialogHeader>
            <DialogTitle>确认实名发布</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">你将以实名发布，其他用户可看到“由你发布”的标识。是否继续？</p>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setConfirmOpen(false)}>取消</Button>
            <Button onClick={async ()=>{ 
              try { 
                setConfirmSubmitting(true);
                await createMessage({ content: formData.content, image_url: formData.imageUrl, turnstile_token: turnstileToken, is_anonymous: false }); 
                toast.success('纸条发布成功，正在等待审核！'); 
                setConfirmOpen(false);
                navigate('/'); 
              } catch {} finally { setConfirmSubmitting(false); }
            }} disabled={confirmSubmitting}>
              {confirmSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />提交中...</>) : '确认'}
            </Button>
          </DialogFooter>
          {confirmSubmitting && (
            <div className="absolute inset-0 bg-white/60 dark:bg-black/40 rounded-lg flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Write;

