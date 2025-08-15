import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import axios from 'axios'
import { API_BASE } from '@/lib/utils'

interface User {
  id: number
  email: string
  nickname: string
  role: string
}

interface AuthContextType {
  token: string
  user: User | null
  isAuthed: boolean
  setToken: (token: string) => void
  logout: () => void
  login: (email: string, password: string, turnstileToken: string) => Promise<void>
  register: (email: string, password: string, nickname: string, studentId: string, turnstileToken: string) => Promise<void>
  fetchMe: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string>(localStorage.getItem('token') || '')
  const [user, setUser] = useState<User | null>(null)

  const isAuthed = Boolean(token)

  const setToken = (newToken: string) => {
    setTokenState(newToken)
    localStorage.setItem('token', newToken)
  }

  const logout = () => {
    setTokenState('')
    setUser(null)
    localStorage.removeItem('token')
  }

  const login = async (email: string, password: string, turnstileToken: string) => {
    const res = await axios.post(`${API_BASE}/login`, { email, password, turnstile_token: turnstileToken })
    if (res.data.token) {
      setToken(res.data.token)
      await fetchMe()
    } else {
      throw new Error(res.data.error || '登录失败')
    }
  }

  const register = async (email: string, password: string, nickname: string, studentId: string, turnstileToken: string) => {
    const res = await axios.post(`${API_BASE}/register`, { 
      email, 
      password, 
      nickname, 
      student_id: studentId, 
      turnstile_token: turnstileToken 
    })
    if (res.data.error) throw new Error(res.data.error)
  }

  const fetchMe = async () => {
    if (!token) return
    try {
      const res = await axios.get(`${API_BASE}/me`, { 
        headers: { Authorization: `Bearer ${token}` } 
      })
      if (res.data.user) setUser(res.data.user)
    } catch (error) {
      console.error('Failed to fetch user:', error)
    }
  }

  useEffect(() => {
    if (token && !user) {
      fetchMe()
    }
  }, [token, user])

  const value = {
    token,
    user,
    isAuthed,
    setToken,
    logout,
    login,
    register,
    fetchMe
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
