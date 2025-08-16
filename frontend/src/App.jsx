import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useEffect } from 'react';
import useAuthStore from './stores/authStore';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

// Pages
import Home from './pages/Home';
import MessageDetail from './pages/MessageDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Write from './pages/Write';
import Admin from './pages/Admin';
import Moderation from './pages/Moderation';
import Dashboard from './pages/Dashboard';
import Logs from './pages/Logs';
import Bans from './pages/Bans';

import './App.css';

function App() {
  const { token, fetchUser } = useAuthStore();

  useEffect(() => {
    // 如果有token但没有用户信息，则获取用户信息
    if (token) {
      fetchUser();
    }
  }, [token, fetchUser]);

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/write" element={<Write />} />
            <Route path="/messages/:id" element={<MessageDetail />} />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute roles={['moderator', 'super_admin']}>
                  <Admin />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/moderation" 
              element={
                <ProtectedRoute roles={['moderator', 'super_admin']}>
                  <Moderation />
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
        </main>
        <Toaster position="top-right" richColors />
      </div>
    </Router>
  );
}

export default App;
