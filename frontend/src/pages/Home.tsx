import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Turnstile } from '@/components/Turnstile'
import { API_BASE, formatTime, getStatusText, cn } from '@/lib/utils'
import { PenTool, User, Clock, MoreVertical, Edit, Trash, Star } from 'lucide-react'

interface Message {
  id: number
  content: string
  image_url?: string
  user_id?: number
  user_email?: string
  is_anonymous: boolean
  status: string
  created_at: string
}

export default function Home() {
  const { user, isAuthed, token } = useAuth()
  const { toast } = useToast()
  
  const [messages, setMessages] = useState<Message[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [menuFor, setMenuFor] = useState<number | null>(null)

  // Edit/Delete dialog states
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [formContent, setFormContent] = useState('')
  const [formPass, setFormPass] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [currentMessage, setCurrentMessage] = useState<Message | null>(null)

  const fetchMessages = useCallback(async (reset = false) => {
    if (isLoading) return
    setIsLoading(true)
    
    try {
      if (reset) {
        setPage(1)
        setIsDone(false)
        setMessages([])
      }
      
      const headers: any = {}
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }
      
      const res = await axios.get(`${API_BASE}/messages`, {
        params: { page: reset ? 1 : page, pageSize: 10 },
        headers
      })
      
      const items = res.data.items || []
      setTotal(res.data.total || 0)
      
      if (reset) {
        setMessages(items)
      } else {
        setMessages(prev => [...prev, ...items])
      }
      
      if (messages.length + items.length >= (res.data.total || 0)) {
        setIsDone(true)
      }
      
      if (!reset) {
        setPage(prev => prev + 1)
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        description: error.response?.data?.error || error.message || '加载失败'
      })
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, page, token, toast, messages.length])

  useEffect(() => {
    fetchMessages(true)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 200
      if (nearBottom && !isDone && !isLoading) {
        fetchMessages()
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isDone, isLoading, fetchMessages])

  const canEdit = (message: Message) => {
    if (isAuthed && user && message.user_id === user.id) return true
    if (!message.user_id && message.is_anonymous) return true
    return false
  }

  const toggleMenu = (messageId: number) => {
    setMenuFor(menuFor === messageId ? null : messageId)
  }

  const onOpenEdit = (message: Message) => {
    setCurrentMessage(message)
    setFormContent(message.content)
    setFormPass('')
    setTurnstileToken('')
    setShowEdit(true)
    setMenuFor(null)
  }

  const onOpenDelete = (message: Message) => {
    setCurrentMessage(message)
    setFormPass('')
    setTurnstileToken('')
    setShowDelete(true)
    setMenuFor(null)
  }

  const doEdit = async () => {
    if (!currentMessage) return
    
    try {
      const body: any = { 
        content: formContent, 
        turnstile_token: turnstileToken 
      }
      
      if (!currentMessage.user_id && currentMessage.is_anonymous) {
        body.anon_passphrase = formPass
      }
      
      const headers: any = {}
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }
      
      await axios.put(`${API_BASE}/messages/${currentMessage.id}`, body, { headers })
      
      setShowEdit(false)
      fetchMessages(true)
      toast({
        variant: "success",
        description: "纸条编辑成功"
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        description: error.response?.data?.error || '编辑失败'
      })
    }
  }

  const doDelete = async () => {
    if (!currentMessage) return
    
    try {
      const body: any = { turnstile_token: turnstileToken }
      
      if (!currentMessage.user_id && currentMessage.is_anonymous) {
        body.anon_passphrase = formPass
      }
      
      const headers: any = {}
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }
      
      await axios.delete(`${API_BASE}/messages/${currentMessage.id}`, { 
        data: body, 
        headers 
      })
      
      setShowDelete(false)
      fetchMessages(true)
      toast({
        variant: "success",
        description: "纸条删除成功"
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        description: error.response?.data?.error || '删除失败'
      })
    }
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">分享你的想法</h1>
          <p className="hero-subtitle">在这里写下你的小纸条，与大家分享你的心声</p>
          <Link to="/write">
            <Button size="lg" className="text-lg">
              <PenTool className="h-5 w-5" />
              写纸条
            </Button>
          </Link>
        </div>
      </section>

      {/* Messages Section */}
      <section className="container py-12">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">最新纸条</h2>
          <div className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
            共 {total} 条纸条
          </div>
        </div>

        {/* Messages Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {messages.map((message, index) => (
            <Card 
              key={message.id} 
              className={cn(
                "message-card group relative transition-all duration-300 hover:shadow-lg",
                index < 3 && "featured border-purple-200 bg-gradient-to-br from-purple-50 to-white"
              )}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {index < 3 && (
                <Star className="absolute right-4 top-4 h-4 w-4 text-purple-500" />
              )}
              
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatTime(message.created_at)}
                    </div>
                    <div className={cn("status-badge", `status-${message.status}`)}>
                      {getStatusText(message.status)}
                    </div>
                  </div>
                  
                  {canEdit(message) && (
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => toggleMenu(message.id)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      
                      {menuFor === message.id && (
                        <div className="absolute right-0 top-full mt-1 w-32 rounded-md border bg-background shadow-lg z-10">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs"
                            onClick={() => onOpenEdit(message)}
                          >
                            <Edit className="h-3 w-3 mr-2" />
                            编辑
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs text-destructive hover:text-destructive"
                            onClick={() => onOpenDelete(message)}
                          >
                            <Trash className="h-3 w-3 mr-2" />
                            删除
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pb-4">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
                {message.image_url && (
                  <div className="mt-3 rounded-lg overflow-hidden">
                    <img 
                      src={message.image_url} 
                      alt="图片" 
                      className="w-full h-auto max-h-48 object-cover transition-transform hover:scale-105"
                    />
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="pt-3 border-t">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {message.user_id && message.user_email ? message.user_email : '匿名用户'}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    #{message.id}
                  </span>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Loading & Status */}
        <div className="mt-12 text-center">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <div className="spinner" />
              正在加载更多纸条...
            </div>
          )}
          
          {isDone && !isLoading && (
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <span className="text-2xl">🎉</span>
              <p>已加载全部纸条</p>
            </div>
          )}
          
          {!messages.length && !isLoading && (
            <div className="flex flex-col items-center gap-4 py-12">
              <span className="text-6xl">📝</span>
              <p className="text-lg text-muted-foreground">还没有纸条，快来写第一条吧！</p>
              <Link to="/write">
                <Button>写纸条</Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              编辑纸条
            </DialogTitle>
            <DialogDescription>
              修改纸条内容
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="content">内容</Label>
              <Textarea
                id="content"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={5}
                placeholder="写下你想说的话..."
              />
            </div>
            
            {currentMessage && !currentMessage.user_id && currentMessage.is_anonymous && (
              <div>
                <Label htmlFor="passphrase">身份口令</Label>
                <Input
                  id="passphrase"
                  type="password"
                  value={formPass}
                  onChange={(e) => setFormPass(e.target.value)}
                  placeholder="用于验证匿名身份"
                />
              </div>
            )}
            
            <div>
              <Label>安全验证</Label>
              <div className="flex justify-center mt-2">
                <Turnstile onVerified={setTurnstileToken} />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>
              取消
            </Button>
            <Button 
              onClick={doEdit}
              disabled={!formContent.trim() || !turnstileToken}
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash className="h-5 w-5" />
              删除纸条
            </DialogTitle>
            <DialogDescription>
              确定删除这条纸条吗？该操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {currentMessage && !currentMessage.user_id && currentMessage.is_anonymous && (
              <div>
                <Label htmlFor="delete-passphrase">身份口令</Label>
                <Input
                  id="delete-passphrase"
                  type="password"
                  value={formPass}
                  onChange={(e) => setFormPass(e.target.value)}
                  placeholder="用于验证匿名身份"
                />
              </div>
            )}
            
            <div>
              <Label>安全验证</Label>
              <div className="flex justify-center mt-2">
                <Turnstile onVerified={setTurnstileToken} />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>
              取消
            </Button>
            <Button 
              variant="destructive"
              onClick={doDelete}
              disabled={!turnstileToken}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
