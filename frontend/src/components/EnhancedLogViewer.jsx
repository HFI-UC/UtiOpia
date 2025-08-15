import { useState } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Copy, 
  Check, 
  Eye, 
  EyeOff,
  Globe,
  User,
  Server,
  Cloud,
  Shield,
  Key,
  AlertTriangle,
  Info,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import JsonViewer from './JsonViewer';
import { 
  processLogData, 
  extractSummary, 
  isImportantField,
  isSensitiveField,
  getObjectSize,
  formatBytes
} from './LogDataProcessor';

// 分类图标
const getCategoryIcon = (category) => {
  const icons = {
    request: Globe,
    user: User,
    server: Server,
    cloudflare: Cloud,
    headers: Info,
    environment: Shield,
    sensitive: Key,
    other: Info
  };
  return icons[category] || Info;
};

// 分类标题
const getCategoryTitle = (category) => {
  const titles = {
    request: '请求信息',
    user: '用户信息',
    server: '服务器信息',
    cloudflare: 'Cloudflare',
    headers: '请求头',
    environment: '环境变量',
    sensitive: '敏感信息',
    other: '其他信息'
  };
  return titles[category] || '其他';
};

const EnhancedLogViewer = ({ data, className = '' }) => {
  const [showSensitive, setShowSensitive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('summary');
  const [expandedCategories, setExpandedCategories] = useState({
    request: true,
    user: true,
    error: true
  });
  
  if (!data || typeof data !== 'object') {
    return (
      <div className={`text-sm text-muted-foreground p-4 ${className}`}>
        (无数据)
      </div>
    );
  }
  
  // 处理数据
  const { processed, categorized } = processLogData(data, showSensitive);
  const summary = extractSummary(data);
  const dataSize = getObjectSize(data);
  
  // 复制数据
  const copyData = async (value, masked = false) => {
    try {
      const textToCopy = masked ? JSON.stringify(processed, null, 2) : JSON.stringify(data, null, 2);
      await navigator.clipboard.writeText(textToCopy);
      toast.success('已复制到剪贴板');
    } catch {
      toast.error('复制失败');
    }
  };
  
  // 切换分类展开状态
  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };
  
  return (
    <div className={className}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {Object.keys(data).length} 个字段
          </Badge>
          <Badge variant="outline" className="text-xs">
            {formatBytes(dataSize)}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSensitive(!showSensitive)}
          >
            {showSensitive ? (
              <>
                <EyeOff className="w-4 h-4 mr-1" />
                隐藏敏感信息
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-1" />
                显示敏感信息
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyData(data, !showSensitive)}
          >
            <Copy className="w-4 h-4 mr-1" />
            复制JSON
          </Button>
        </div>
      </div>
      
      {/* 选项卡 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary">摘要</TabsTrigger>
          <TabsTrigger value="categorized">分类视图</TabsTrigger>
          <TabsTrigger value="raw">原始数据</TabsTrigger>
        </TabsList>
        
        {/* 摘要视图 */}
        <TabsContent value="summary" className="space-y-4">
          {/* 请求摘要 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="w-4 h-4" />
                请求摘要
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">方法:</span>
                  <Badge variant="outline" className="ml-2">
                    {summary.request.method}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">状态:</span>
                  <Badge variant="outline" className="ml-2">
                    {summary.request.status}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">路径:</span>
                  <code className="ml-2 text-xs bg-muted px-1 py-0.5 rounded">
                    {summary.request.path}
                  </code>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">IP:</span>
                  <Badge variant="secondary" className="ml-2">
                    {summary.request.ip}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* 用户摘要 */}
          {(summary.user.id !== 'Unknown' || summary.user.email || summary.user.username) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="w-4 h-4" />
                  用户信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {summary.user.id !== 'Unknown' && (
                    <div>
                      <span className="text-muted-foreground">ID:</span>
                      <span className="ml-2">{summary.user.id}</span>
                    </div>
                  )}
                  {summary.user.email && (
                    <div>
                      <span className="text-muted-foreground">邮箱:</span>
                      <span className="ml-2">{showSensitive ? summary.user.email : '***'}</span>
                    </div>
                  )}
                  {summary.user.username && (
                    <div>
                      <span className="text-muted-foreground">用户名:</span>
                      <span className="ml-2">{summary.user.username}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* 位置信息 */}
          {(summary.location.country || summary.location.city) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  位置信息
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm">
                  {summary.location.country && (
                    <Badge variant="outline">{summary.location.country}</Badge>
                  )}
                  {summary.location.city && (
                    <Badge variant="outline">{summary.location.city}</Badge>
                  )}
                  {summary.location.region && (
                    <Badge variant="outline">{summary.location.region}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* 错误信息 */}
          {summary.error && (
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  错误信息
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-red-600 dark:text-red-400">
                  {summary.error}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* 分类视图 */}
        <TabsContent value="categorized" className="space-y-2">
          <Input
            placeholder="搜索字段或值..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4"
            prefix={<Search className="w-4 h-4" />}
          />
          
          {Object.entries(categorized).map(([category, fields]) => {
            if (!fields || Object.keys(fields).length === 0) return null;
            
            const Icon = getCategoryIcon(category);
            const isExpanded = expandedCategories[category] !== false;
            
            return (
              <Card key={category}>
                <CardHeader 
                  className="py-3 cursor-pointer"
                  onClick={() => toggleCategory(category)}
                >
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {getCategoryTitle(category)}
                      <Badge variant="secondary" className="text-xs">
                        {Object.keys(fields).length}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </CardTitle>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="space-y-1">
                      {Object.entries(fields).map(([key, value]) => {
                        const isImportant = isImportantField(key);
                        const isSensitive = isSensitiveField(key);
                        
                        // 搜索高亮
                        const matchesSearch = searchTerm && (
                          key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          JSON.stringify(value).toLowerCase().includes(searchTerm.toLowerCase())
                        );
                        
                        return (
                          <div 
                            key={key} 
                            className={`
                              flex items-start justify-between py-1 px-2 rounded text-sm
                              ${matchesSearch ? 'bg-yellow-100 dark:bg-yellow-900/30' : ''}
                              ${isImportant ? 'font-medium' : ''}
                            `}
                          >
                            <span className="text-muted-foreground mr-2 flex items-center gap-1">
                              {isSensitive && <Key className="w-3 h-3" />}
                              {key}:
                            </span>
                            <span className="font-mono text-xs break-all">
                              {typeof value === 'object' 
                                ? <JsonViewer data={value} expandAll={false} maxHeight="200px" />
                                : String(value)
                              }
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </TabsContent>
        
        {/* 原始数据视图 */}
        <TabsContent value="raw">
          <JsonViewer 
            data={processed} 
            searchTerm={searchTerm}
            expandAll={false}
            maxHeight="600px"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedLogViewer;
