import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { 
  Search as SearchIcon,
  MessageCircle,
  Clock,
  User,
  Loader2,
  Heart,
  ArrowLeft,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { search } from '../lib/api';
import useAuthStore from '../stores/authStore';
import { useTheme } from '../contexts/ThemeContext';

const Search = () => {
  const { isLiquidGlass } = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(0);
  // 分页目前由后端控制，这里不保留本地 page 状态
  const [hasSearched, setHasSearched] = useState(false);
  // 控制每条纸条的评论展开/收起（默认展开）
  const [expandedMessages, setExpandedMessages] = useState({}); // { [messageId]: boolean }
  const searchInputRef = useRef(null);

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

  const performSearch = async (term, pageNum = 1) => {
    if (!term.trim()) return;
    
    setIsLoading(true);
    try {
      const params = {
        q: term.trim(),
        page: pageNum,
        pageSize: 20
      };
      
      const response = await search.searchAll(params);
      const data = response.data;
      
      setResults(data.items || []);
      setTotal(data.total || 0);
  // 本地不保存 page 状态，交由 URL 与请求参数驱动
      setHasSearched(true);
      
      // 更新URL参数
      setSearchParams({ q: term.trim() });
    } catch (error) {
      console.error('Search error:', error);
      toast.error(error.response?.data?.error || '搜索失败');
      setResults([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e) => {
    e?.preventDefault();
    if (searchTerm.trim()) {
      performSearch(searchTerm.trim(), 1);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  };

  // 页面加载时自动搜索URL中的查询词
  useEffect(() => {
    const initialQuery = searchParams.get('q');
    if (initialQuery && initialQuery !== searchTerm) {
      setSearchTerm(initialQuery);
      performSearch(initialQuery, 1);
    }
  }, [searchParams]);

  // 自动聚焦搜索框
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const highlightSearchTerm = (text, term) => {
    if (!term || !text) return text;
    
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? 
        <mark key={index} className="bg-yellow-200 px-1 rounded">{part}</mark> : 
        part
    );
  };

  const renderResult = (item) => {
    const isMessage = item.result_type === 'message';
    const isComment = item.result_type === 'comment';
    
    if (isMessage) {
      const hasComments = (item.comments?.items || []).length > 0;
      const isExpanded = expandedMessages[item.id] ?? true;
      return (
        <Card key={`message-${item.id}`} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <Badge variant="outline" className="text-xs">纸条</Badge>
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {formatTime(item.created_at)}
                </span>
              </div>
              <Badge variant="outline" className="text-xs">#{item.id}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="text-sm leading-relaxed">
              {highlightSearchTerm(item.content, searchTerm)}
            </div>
            
            {item.image_url && (
              <div className="rounded-lg overflow-hidden">
                <img 
                  src={item.image_url} 
                  alt="纸条图片" 
                  className="w-full h-48 object-cover"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center space-x-2">
                <Tooltip delayDuration={150}>
                  <TooltipTrigger asChild>
                    <Avatar className="w-6 h-6 cursor-default">
                      <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                        {item.user_email ? item.user_email.charAt(0).toUpperCase() : <User className="w-3 h-3" />}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  {(item.user_email || item.user_nickname) && (
                    <TooltipContent side="top" sideOffset={6}>
                      {(item.user_nickname || '') + (item.user_nickname && item.user_email ? ' · ' : '') + (item.user_email || '')}
                    </TooltipContent>
                  )}
                </Tooltip>
                {item.is_anonymous ? (<Badge variant="secondary" className="text-[10px]">匿名</Badge>) : null}
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 text-muted-foreground">
                  <Heart className="w-4 h-4" />
                  <span className="text-sm">{item.likes_count || 0}</span>
                </div>
                <div className="flex items-center space-x-1 text-muted-foreground">
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm">{item.comments?.total || 0}</span>
                </div>
                {hasComments && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedMessages(prev => ({ ...prev, [item.id]: !isExpanded }))}
                  >
                    {isExpanded ? '收起评论' : '展开评论'}
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/?message=${item.id}`)}
                >
                  查看详情
                </Button>
              </div>
            </div>

            {/* 评论区域（默认展开）*/}
            {hasComments && isExpanded && (
              <div className="mt-3 space-y-3">
                {item.comments.items.map((c) => {
                  const isReply = !!c.parent_id;
                  return (
                    <div key={c.id} className={`p-3 border rounded-md ${isReply ? 'ml-4' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-xs bg-gradient-to-br from-green-500 to-blue-500 text-white">
                              {c.user_email ? c.user_email.charAt(0).toUpperCase() : <User className="w-3 h-3" />}
                            </AvatarFallback>
                          </Avatar>
                          {c.is_anonymous ? (<Badge variant="secondary" className="text-[10px]">匿名</Badge>) : null}
                          {isReply && <Badge variant="outline" className="text-[10px]">回复</Badge>}
                          <span>{formatTime(c.created_at)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {c.user_nickname || ''}
                          {(c.user_nickname && c.user_email) ? ' · ' : ''}
                          {c.user_email || ''}
                        </div>
                      </div>
                      <div className="mt-2 text-sm whitespace-pre-wrap break-words">
                        {highlightSearchTerm(c.content, searchTerm)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      );
    }
    
    if (isComment) {
      return (
        <Card key={`comment-${item.id}`} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <MessageCircle className="w-4 h-4 text-green-500" />
                <Badge variant="outline" className="text-xs">评论</Badge>
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {formatTime(item.created_at)}
                </span>
              </div>
              <Badge variant="outline" className="text-xs">#{item.id}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="text-sm leading-relaxed">
              {highlightSearchTerm(item.content, searchTerm)}
            </div>

            {item.related_message && (
              <div className="p-3 bg-gray-50 rounded-lg border-l-4 border-blue-200">
                <div className="text-xs text-muted-foreground mb-1">回复的纸条：</div>
                <div className="text-sm text-gray-700 overflow-hidden" style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}>
                  {item.related_message.content}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatTime(item.related_message.created_at)}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center space-x-2">
                <Tooltip delayDuration={150}>
                  <TooltipTrigger asChild>
                    <Avatar className="w-6 h-6 cursor-default">
                      <AvatarFallback className="text-xs bg-gradient-to-br from-green-500 to-blue-500 text-white">
                        {item.user_email ? item.user_email.charAt(0).toUpperCase() : <User className="w-3 h-3" />}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  {(item.user_email || item.user_nickname) && (
                    <TooltipContent side="top" sideOffset={6}>
                      {(item.user_nickname || '') + (item.user_nickname && item.user_email ? ' · ' : '') + (item.user_email || '')}
                    </TooltipContent>
                  )}
                </Tooltip>
                {item.is_anonymous ? (<Badge variant="secondary" className="text-[10px]">匿名</Badge>) : null}
              </div>
              
              <div className="flex items-center space-x-2">
                {item.parent_id && (
                  <Badge variant="outline" className="text-[10px]">回复</Badge>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/?message=${item.message_id}`)}
                >
                  查看原文
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    return null;
  };

  return (
    <div className={`max-w-4xl mx-auto space-y-6 ${isLiquidGlass ? 'glass-wrapper' : ''}`}>
      {/* 头部和搜索框 */}
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>返回首页</span>
          </Button>
        </div>

        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            搜索纸条和评论
          </h1>
          <p className="text-muted-foreground">
            {user?.role === 'super_admin' || user?.role === 'moderator' 
              ? '管理员可以搜索所有内容和用户信息' 
              : '搜索纸条内容、评论内容和用户名'
            }
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex items-center space-x-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="输入搜索关键词..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10"
              disabled={isLoading}
            />
          </div>
          <Button 
            type="submit" 
            disabled={isLoading || !searchTerm.trim()}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <SearchIcon className="w-4 h-4 mr-2" />
                搜索
              </>
            )}
          </Button>
        </form>
      </div>

      {/* 搜索结果 */}
      {hasSearched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              搜索结果
              {total > 0 && (
                <span className="ml-2 text-muted-foreground">
                  找到 {total} 条结果
                </span>
              )}
            </h2>
            {searchTerm && (
              <Badge variant="outline">
                关键词: {searchTerm}
              </Badge>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">正在搜索...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-4">
              {results.map(renderResult)}
              
              {/* 分页控制 - 如果需要的话 */}
              {total > 20 && (
                <div className="text-center pt-6">
                  <p className="text-muted-foreground">
                    显示了前 {Math.min(results.length, total)} 条结果
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 space-y-4">
              <div className="text-6xl">🔍</div>
              <div className="space-y-2">
                <p className="text-lg font-medium">没有找到相关内容</p>
                <p className="text-muted-foreground">
                  尝试使用不同的关键词或检查拼写
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 搜索提示 */}
      {!hasSearched && (
        <div className="text-center py-12 space-y-4">
          <div className="text-6xl">🔍</div>
          <div className="space-y-2">
            <p className="text-lg font-medium">开始搜索</p>
            <p className="text-muted-foreground">
              输入关键词来搜索纸条和评论内容
            </p>
          </div>
          <div className="max-w-md mx-auto text-left">
            <h3 className="font-semibold mb-2">搜索提示：</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 可以搜索纸条内容和评论内容</li>
              <li>• 可以搜索实名用户的用户名</li>
              {user?.role === 'super_admin' || user?.role === 'moderator' ? (
                <li>• 管理员可以搜索所有字段包括敏感信息</li>
              ) : (
                <li>• 无法搜索匿名用户的敏感信息</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default Search;
