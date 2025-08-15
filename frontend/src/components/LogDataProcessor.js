// 日志数据处理工具

// 敏感字段列表
const SENSITIVE_FIELDS = [
  'password', 'pass', 'pwd', 'secret', 'token', 'key', 'auth',
  'authorization', 'api_key', 'apikey', 'access_token', 'refresh_token',
  'private_key', 'jwt', 'session', 'cookie', 'DB_PASS', 'JWT_SECRET',
  'COS_SECRET_KEY', 'COS_SECRET_ID', 'TURNSTILE_SECRET', 'ADMIN_PASSWORD',
  'SMTP_PASSWORD', 'HTTP_AUTHORIZATION'
];

// 需要高亮的重要字段
const IMPORTANT_FIELDS = [
  'ip', 'method', 'path', 'status', 'error', 'message', 'user_id',
  'email', 'username', 'action', 'REQUEST_URI', 'REMOTE_ADDR',
  'CF_CONNECTING_IP', 'User-Agent', 'Origin', 'Referer'
];

// 分类配置
const FIELD_CATEGORIES = {
  request: ['method', 'path', 'ip', 'get', 'post', 'REQUEST_METHOD', 'REQUEST_URI', 'QUERY_STRING'],
  user: ['user_id', 'email', 'username', 'REMOTE_ADDR', 'CF_CONNECTING_IP', 'CF_IPCOUNTRY', 'CF_IPCITY'],
  server: ['SERVER_NAME', 'SERVER_SOFTWARE', 'SERVER_ADDR', 'SERVER_PORT'],
  headers: ['User-Agent', 'Accept', 'Origin', 'Referer', 'Authorization'],
  cloudflare: ['CF_RAY', 'CF_CONNECTING_IP', 'CF_IPCOUNTRY', 'CF_IPCITY', 'CF_REGION'],
  environment: ['DB_HOST', 'DB_NAME', 'CORS_ORIGIN', 'SITE_NAME', 'SITE_URL'],
  sensitive: [...SENSITIVE_FIELDS]
};

// 检查字段是否敏感
export const isSensitiveField = (fieldName) => {
  const lowerFieldName = fieldName.toLowerCase();
  return SENSITIVE_FIELDS.some(sensitive => 
    lowerFieldName.includes(sensitive.toLowerCase())
  );
};

// 脱敏处理
export const maskSensitiveValue = (value, fieldName) => {
  if (!isSensitiveField(fieldName)) return value;
  
  if (typeof value !== 'string') return '***';
  
  // 对于某些字段保留部分信息
  if (fieldName.toLowerCase().includes('email')) {
    const parts = value.split('@');
    if (parts.length === 2) {
      const [local, domain] = parts;
      return `${local.substring(0, 2)}***@${domain}`;
    }
  }
  
  // 对于较长的值，显示首尾字符
  if (value.length > 10) {
    return `${value.substring(0, 3)}***${value.substring(value.length - 3)}`;
  }
  
  return '***';
};

// 处理日志数据，进行分类和脱敏
export const processLogData = (data, showSensitive = false) => {
  if (!data || typeof data !== 'object') return data;
  
  const processed = {};
  const categorized = {
    request: {},
    user: {},
    server: {},
    headers: {},
    cloudflare: {},
    environment: {},
    other: {}
  };
  
  // 递归处理对象
  const processValue = (value, key) => {
    if (value === null || value === undefined) return value;
    
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.map(item => processValue(item, key));
      }
      const result = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = processValue(v, k);
      }
      return result;
    }
    
    // 脱敏处理
    if (!showSensitive && isSensitiveField(key)) {
      return maskSensitiveValue(value, key);
    }
    
    return value;
  };
  
  // 处理并分类数据
  for (const [key, value] of Object.entries(data)) {
    const processedValue = processValue(value, key);
    processed[key] = processedValue;
    
    // 分类
    let matchedCategory = false;
    for (const [category, fields] of Object.entries(FIELD_CATEGORIES)) {
      if (fields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        if (!categorized[category]) categorized[category] = {};
        categorized[category][key] = processedValue;
        matchedCategory = true;
        break;
      }
    }
    
    // 如果没有匹配的类别，放入other
    if (!matchedCategory) {
      categorized.other[key] = processedValue;
    }
  }
  
  return { processed, categorized };
};

// 提取摘要信息
export const extractSummary = (data) => {
  if (!data || typeof data !== 'object') return {};
  
  const summary = {
    request: {
      method: data.method || data.REQUEST_METHOD || 'Unknown',
      path: data.path || data.REQUEST_URI || 'Unknown',
      ip: data.ip || data.CF_CONNECTING_IP || data.REMOTE_ADDR || 'Unknown',
      status: data.status || data.REDIRECT_STATUS || 'Unknown'
    },
    user: {
      id: data.user_id || data.userId || 'Unknown',
      email: data.email || data.user_email || null,
      username: data.username || data.user_name || null
    },
    location: {
      country: data.CF_IPCOUNTRY || null,
      city: data.CF_IPCITY || null,
      region: data.CF_REGION || null
    },
    client: {
      userAgent: data['User-Agent'] || data.HTTP_USER_AGENT || null,
      origin: data.Origin || data.HTTP_ORIGIN || null
    },
    error: data.error || data.message || null
  };
  
  return summary;
};

// 搜索日志数据
export const searchInLogData = (data, searchTerm) => {
  if (!searchTerm || !data) return false;
  
  const term = searchTerm.toLowerCase();
  
  const searchInValue = (value) => {
    if (value === null || value === undefined) return false;
    
    if (typeof value === 'string') {
      return value.toLowerCase().includes(term);
    }
    
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value).toLowerCase().includes(term);
    }
    
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.some(item => searchInValue(item));
      }
      return Object.entries(value).some(([k, v]) => 
        k.toLowerCase().includes(term) || searchInValue(v)
      );
    }
    
    return false;
  };
  
  return searchInValue(data);
};

// 高亮重要字段
export const isImportantField = (fieldName) => {
  return IMPORTANT_FIELDS.some(field => 
    fieldName.toLowerCase().includes(field.toLowerCase())
  );
};

// 格式化字节大小
export const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

// 计算对象大小（近似）
export const getObjectSize = (obj) => {
  const jsonString = JSON.stringify(obj);
  return new Blob([jsonString]).size;
};
