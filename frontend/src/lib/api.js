import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api';

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

// 请求拦截器 - 添加认证token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token过期或无效，清除本地存储
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 搜索API
export const search = {
  // 搜索纸条和评论
  searchAll: (params) => api.get('/search', { params }),
};

// 公告 API
export const announcements = {
  listPublic: (params) => api.get('/announcements', { params }),
  latest: () => api.get('/announcements/latest'),
  adminList: () => api.get('/admin/announcements'),
  create: (data) => api.post('/admin/announcements', data),
  update: (id, data) => api.put(`/admin/announcements/${id}`, data),
  remove: (id) => api.delete(`/admin/announcements/${id}`),
};

export default api;
export { API_BASE };

