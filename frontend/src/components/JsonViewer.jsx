import { useState } from 'react';
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// JSON 数据类型检测
const getDataType = (value) => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  return typeof value;
};

// 获取数据类型对应的颜色
const getTypeColor = (type) => {
  const colors = {
    string: 'text-green-600 dark:text-green-400',
    number: 'text-blue-600 dark:text-blue-400',
    boolean: 'text-purple-600 dark:text-purple-400',
    null: 'text-gray-500',
    undefined: 'text-gray-500',
    object: 'text-orange-600 dark:text-orange-400',
    array: 'text-pink-600 dark:text-pink-400'
  };
  return colors[type] || 'text-gray-600';
};

// 格式化值的显示
const formatValue = (value, type) => {
  if (type === 'string') return `"${value}"`;
  if (type === 'null' || type === 'undefined') return String(value);
  return String(value);
};

// JSON 节点组件
const JsonNode = ({ nodeKey, value, depth = 0, expandAll, searchTerm = '', highlightPaths = [] }) => {
  const [isExpanded, setIsExpanded] = useState(expandAll || depth < 2);
  const [copied, setCopied] = useState(false);
  const type = getDataType(value);
  const isExpandable = type === 'object' || type === 'array';
  const currentPath = nodeKey ? [...(highlightPaths.slice(0, -1)), nodeKey] : [];
  
  // 检查是否需要高亮
  const shouldHighlight = searchTerm && (
    (nodeKey && nodeKey.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (!isExpandable && String(value).toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // 复制当前节点的值
  const copyValue = async () => {
    try {
      const textToCopy = isExpandable ? JSON.stringify(value, null, 2) : String(value);
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败');
    }
  };
  
  // 计算缩进
  const indent = depth * 20;
  
  if (!isExpandable) {
    // 叶子节点
    return (
      <div 
        className={`flex items-center group hover:bg-muted/30 py-0.5 px-2 rounded ${shouldHighlight ? 'bg-yellow-100 dark:bg-yellow-900/30' : ''}`}
        style={{ paddingLeft: `${indent}px` }}
      >
        {nodeKey && (
          <>
            <span className="text-sm font-medium mr-2">{nodeKey}:</span>
          </>
        )}
        <span className={`text-sm ${getTypeColor(type)} font-mono`}>
          {formatValue(value, type)}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="ml-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={copyValue}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
    );
  }
  
  // 容器节点（对象或数组）
  const entries = type === 'array' 
    ? value.map((v, i) => [i, v])
    : Object.entries(value);
    
  const itemCount = entries.length;
  
  return (
    <div className={shouldHighlight ? 'bg-yellow-100 dark:bg-yellow-900/30 rounded' : ''}>
      <div 
        className="flex items-center group hover:bg-muted/30 py-0.5 px-2 rounded cursor-pointer"
        style={{ paddingLeft: `${indent}px` }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 mr-1">
          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </Button>
        {nodeKey && (
          <span className="text-sm font-medium mr-2">{nodeKey}:</span>
        )}
        <span className={`text-sm ${getTypeColor(type)} mr-2`}>
          {type === 'array' ? '[' : '{'}
        </span>
        <Badge variant="secondary" className="text-xs px-1 py-0 h-5">
          {itemCount} {type === 'array' ? 'items' : 'keys'}
        </Badge>
        {!isExpanded && (
          <span className={`text-sm ${getTypeColor(type)} ml-2`}>
            {type === 'array' ? '...]' : '...}'}
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="ml-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            copyValue();
          }}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      {isExpanded && (
        <div>
          {entries.map(([key, val]) => (
            <JsonNode
              key={key}
              nodeKey={key}
              value={val}
              depth={depth + 1}
              expandAll={expandAll}
              searchTerm={searchTerm}
              highlightPaths={[...currentPath, key]}
            />
          ))}
          <div 
            className="text-sm py-0.5 px-2"
            style={{ paddingLeft: `${indent}px` }}
          >
            <span className={getTypeColor(type)}>
              {type === 'array' ? ']' : '}'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// 主 JSON 查看器组件
const JsonViewer = ({ data, className = '', searchTerm = '', expandAll = false, maxHeight = '400px' }) => {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  
  if (!data) {
    return (
      <div className={`text-sm text-muted-foreground p-4 ${className}`}>
        (无数据)
      </div>
    );
  }
  
  return (
    <div className={`${className}`}>
      {/* 搜索框 */}
      {!searchTerm && (
        <div className="mb-2">
          <input
            type="text"
            placeholder="搜索键名或值..."
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            className="w-full px-3 py-1 text-sm border rounded-md bg-background"
          />
        </div>
      )}
      
      {/* JSON 内容 */}
      <div 
        className="font-mono text-sm overflow-auto border rounded-md bg-muted/10"
        style={{ maxHeight }}
      >
        <JsonNode 
          value={data} 
          expandAll={expandAll}
          searchTerm={searchTerm || localSearchTerm}
        />
      </div>
    </div>
  );
};

export default JsonViewer;
