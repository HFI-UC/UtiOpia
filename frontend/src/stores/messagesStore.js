import { create } from 'zustand';
import api from '../lib/api';

const useMessagesStore = create((set, get) => ({
  messages: [],
  total: 0,
  page: 1,
  // 增加默认 pageSize，确保能一次性拉取更多纸条，避免只显示 10 条
  pageSize: 50,
  isLoading: false,
  isDone: false,
  error: null,

  // 获取消息列表
  fetchMessages: async (reset = false) => {
    const { isLoading, isDone, page, pageSize } = get();
    if (isLoading || (isDone && !reset)) return;

    set({ isLoading: true, error: null });
    
    try {
      const currentPage = reset ? 1 : page;
      const response = await api.get('/messages', {
        params: { page: currentPage, pageSize, with_comments: 1, public: 1 }
      });

      const { items = [], total = 0 } = response.data;
      
      set((state) => ({
        messages: reset ? items : [...state.messages, ...items],
        total,
        page: currentPage + 1,
        isDone: (reset ? items.length : state.messages.length + items.length) >= total,
        isLoading: false
      }));
    } catch (error) {
      const message = error.response?.data?.error || error.message || '获取消息失败';
      set({ error: message, isLoading: false });
    }
  },

  // 创建消息
  createMessage: async (messageData) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await api.post('/messages', messageData);
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      set({ isLoading: false });
      // 重新获取消息列表
      await get().fetchMessages(true);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || error.message || '发布失败';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  // 更新消息
  updateMessage: async (id, messageData) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await api.put(`/messages/${id}`, messageData);
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      set({ isLoading: false });
      // 重新获取消息列表
      await get().fetchMessages(true);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || error.message || '更新失败';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  // 删除消息
  deleteMessage: async (id, deleteData) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await api.delete(`/messages/${id}`, { data: deleteData });
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      set({ isLoading: false });
      // 重新获取消息列表
      await get().fetchMessages(true);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || error.message || '删除失败';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  // 点赞/取消点赞
  toggleLike: async (id) => {
    try {
      await api.post(`/messages/${id}/like`);
      set((state) => ({
        messages: state.messages.map(msg =>
          msg.id === id
            ? {
                ...msg,
                likes_count: (msg.liked_by_me ? (msg.likes_count - 1) : (msg.likes_count + 1)),
                liked_by_me: !msg.liked_by_me
              }
            : msg
        )
      }));
    } catch (error) {
      const message = error.response?.data?.error || error.message || '点赞失败';
      set({ error: message });
      throw new Error(message);
    }
  },

  // 重置状态
  reset: () => {
    set({
      messages: [],
      total: 0,
      page: 1,
      isDone: false,
      error: null
    });
  },

  // 清除错误
  clearError: () => set({ error: null })
}));

export default useMessagesStore;

