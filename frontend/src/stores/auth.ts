import { defineStore } from 'pinia'
import axios from 'axios'

const API = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: null as null | { id:number; email:string; nickname:string; role:string },
  }),
  getters: {
    isAuthed: (s) => !!s.token,
  },
  actions: {
    setToken(t: string) {
      this.token = t
      localStorage.setItem('token', t)
    },
    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem('token')
    },
    async login(email: string, password: string, turnstile_token: string) {
      const res = await axios.post(`${API}/login`, { email, password, turnstile_token })
      if (res.data.token) {
        this.setToken(res.data.token)
        await this.fetchMe()
      } else {
        throw new Error(res.data.error || '登录失败')
      }
    },
    async register(email: string, password: string, nickname: string, turnstile_token: string) {
      const res = await axios.post(`${API}/register`, { email, password, nickname, turnstile_token })
      if (res.data.error) throw new Error(res.data.error)
    },
    async fetchMe() {
      if (!this.token) return
      const res = await axios.get(`${API}/me`, { headers: { Authorization: `Bearer ${this.token}` } })
      if (res.data.user) this.user = res.data.user
    }
  }
})


