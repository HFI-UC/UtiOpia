import React, { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: ReactNode
  roles?: string[]
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, isAuthed } = useAuth()

  if (!roles) {
    return <>{children}</>
  }

  const userRole = user?.role || 'user'
  
  if (!roles.includes(userRole)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
