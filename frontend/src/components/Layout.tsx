import React, { ReactNode, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { FileText, PenTool, Shield, BarChart3, FileSearch, Ban, LogIn, UserPlus } from 'lucide-react'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, isAuthed } = useAuth()
  const location = useLocation()
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isAdminRoute = location.pathname.startsWith('/admin') || 
                      location.pathname.startsWith('/dashboard') ||
                      location.pathname.startsWith('/logs') ||
                      location.pathname.startsWith('/moderation') ||
                      location.pathname.startsWith('/bans')

  const canAccessAdmin = user?.role === 'super_admin' || user?.role === 'moderator'

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header 
        className={cn(
          "sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300",
          isScrolled && "shadow-sm"
        )}
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center space-x-2 font-bold text-xl bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"
          >
            <FileText className="h-6 w-6 text-purple-600" />
            <span>UtiOpia 小纸条</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              to="/"
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                location.pathname === '/' 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <FileText className="h-4 w-4" />
              <span>纸条</span>
            </Link>
            
            <Link
              to="/write"
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                location.pathname === '/write' 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <PenTool className="h-4 w-4" />
              <span>写纸条</span>
            </Link>

            {canAccessAdmin && (
              <>
                <Link
                  to="/moderation"
                  className={cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    location.pathname === '/moderation' 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <Shield className="h-4 w-4" />
                  <span>审核</span>
                </Link>
                
                <Link
                  to="/admin"
                  className={cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    location.pathname === '/admin' 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <Shield className="h-4 w-4" />
                  <span>管理</span>
                </Link>
                
                <Link
                  to="/dashboard"
                  className={cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    location.pathname === '/dashboard' 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>看板</span>
                </Link>
                
                <Link
                  to="/logs"
                  className={cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    location.pathname === '/logs' 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <FileSearch className="h-4 w-4" />
                  <span>日志</span>
                </Link>
                
                <Link
                  to="/bans"
                  className={cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    location.pathname === '/bans' 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <Ban className="h-4 w-4" />
                  <span>封禁</span>
                </Link>
              </>
            )}
          </nav>

          {/* Auth buttons */}
          {!isAuthed && (
            <div className="flex items-center space-x-2">
              <Link
                to="/login"
                className={cn(
                  "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium border transition-colors",
                  "border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                )}
              >
                <LogIn className="h-4 w-4" />
                <span>登录</span>
              </Link>
              <Link
                to="/register"
                className="flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                <span>注册</span>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
