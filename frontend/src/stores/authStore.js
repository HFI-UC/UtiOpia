import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '../lib/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      token: '',
      user: null,
      isLoading: false,
      error: null,

      // 设置token
      setToken: (token) => {
        set({ token });
        localStorage.setItem('token', token);
      },

      // 登录
      login: async (email, password, turnstileToken) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/login', {
            email,
            password,
            turnstile_token: turnstileToken
          });
          
          if (response.data.token) {
            const { token } = response.data;
            set({ token, isLoading: false });
            localStorage.setItem('token', token);
            
            // 获取用户信息
            await get().fetchUser();
            return { success: true };
          } else {
            throw new Error(response.data.error || '登录失败');
          }
        } catch (error) {
          const message = error.response?.data?.error || error.message || '登录失败';
          set({ error: message, isLoading: false });
          throw new Error(message);
        }
      },

      // 注册
      register: async (email, password, nickname, studentId, turnstileToken) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/register', {
            email,
            password,
            nickname,
            student_id: studentId,
            turnstile_token: turnstileToken
          });
          
          if (response.data.error) {
            throw new Error(response.data.error);
          }
          
          set({ isLoading: false });
          return { success: true };
        } catch (error) {
          const message = error.response?.data?.error || error.message || '注册失败';
          set({ error: message, isLoading: false });
          throw new Error(message);
        }
      },

      // 获取用户信息
      fetchUser: async () => {
        const { token } = get();
        if (!token) return;
        
        try {
          const response = await api.get('/me');
          if (response.data.user) {
            set({ user: response.data.user });
          }
        } catch (error) {
          console.error('Failed to fetch user:', error);
        }
      },

      // 登出
      logout: () => {
        set({ token: '', user: null, error: null });
        localStorage.removeItem('token');
      },

      // 清除错误
      clearError: () => set({ error: null }),

      // 检查是否已认证
      isAuthenticated: () => {
        const { token } = get();
        return !!token;
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token, user: state.user })
    }
  )
);

export default useAuthStore;

