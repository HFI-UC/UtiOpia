import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster } from '@/components/ui/toaster'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import Write from '@/pages/Write'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Admin from '@/pages/Admin'
import Dashboard from '@/pages/Dashboard'
import Logs from '@/pages/Logs'
import Moderation from '@/pages/Moderation'
import Bans from '@/pages/Bans'
import ProtectedRoute from '@/components/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/write" element={<Write />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route 
              path="/moderation" 
              element={
                <ProtectedRoute roles={['moderator', 'super_admin']}>
                  <Moderation />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute roles={['moderator', 'super_admin']}>
                  <Admin />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute roles={['moderator', 'super_admin']}>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/logs" 
              element={
                <ProtectedRoute roles={['moderator', 'super_admin']}>
                  <Logs />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/bans" 
              element={
                <ProtectedRoute roles={['moderator', 'super_admin']}>
                  <Bans />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </Layout>
        <Toaster />
      </Router>
    </AuthProvider>
  )
}

export default App
