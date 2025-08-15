import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Turnstile } from '@/components/Turnstile'
import { LogIn, Mail, Lock } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { toast } = useToast()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [loading, setLoading] = useState(false)

  const canSubmit = email && password && turnstileToken

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || loading) return

    try {
      setLoading(true)
      await login(email, password, turnstileToken)
      toast({
        variant: "success",
        description: '登录成功！'
      })
      navigate('/')
    } catch (error: any) {
      toast({
        variant: "destructive",
        description: error.message || '登录失败'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <LogIn className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">登录账户</CardTitle>
          <CardDescription>
            输入你的邮箱和密码来登录
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@school.edu"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入密码"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>安全验证</Label>
              <div className="flex justify-center">
                <Turnstile onVerified={setTurnstileToken} />
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={!canSubmit || loading}
            >
              {loading ? (
                <>
                  <div className="spinner mr-2" />
                  登录中...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  登录
                </>
              )}
            </Button>
            
            <div className="text-center text-sm text-muted-foreground">
              还没有账户？{' '}
              <Link 
                to="/register" 
                className="text-primary hover:underline font-medium"
              >
                立即注册
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
