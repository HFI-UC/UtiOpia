import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Page, Navbar as KNavbar, Block } from 'konsta/react';
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
import Search from './pages/Search';
import Admin from './pages/Admin';
import Moderation from './pages/Moderation';
import Dashboard from './pages/Dashboard';
import Logs from './pages/Logs';
import Bans from './pages/Bans';
import ThemeDemo from './pages/ThemeDemo';

import './App.css';
import { useTheme } from './contexts/ThemeContext';
import GlassHome from './liquid/GlassHome';
import GlassWrite from './liquid/GlassWrite';
import GlassSearch from './liquid/GlassSearch';

function App() {
  const { token, fetchUser } = useAuthStore();
  const { isLiquidGlass } = useTheme();

  useEffect(() => {
    // 如果有token但没有用户信息，则获取用户信息
    if (token) {
      fetchUser();
    }
  }, [token, fetchUser]);

  return (
    <Router>
      <div className={`min-h-screen ${isLiquidGlass ? 'liquid-page-bg' : 'bg-background'}`}>
        {isLiquidGlass ? (
          <Page>
            <KNavbar title="UtiOpia" right={null} />
            <Block className="max-w-6xl mx-auto px-4 py-6">
              <Routes>
                <Route path="/" element={<GlassHome />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/write" element={<GlassWrite />} />
                <Route path="/search" element={<GlassSearch />} />
                <Route path="/messages/:id" element={<MessageDetail />} />
                <Route path="/admin" element={<ProtectedRoute roles={['moderator','super_admin']}><Admin /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute roles={['moderator','super_admin']}><Dashboard /></ProtectedRoute>} />
                <Route path="/moderation" element={<ProtectedRoute roles={['moderator','super_admin']}><Moderation /></ProtectedRoute>} />
                <Route path="/logs" element={<ProtectedRoute roles={['moderator','super_admin']}><Logs /></ProtectedRoute>} />
                <Route path="/bans" element={<ProtectedRoute roles={['moderator','super_admin']}><Bans /></ProtectedRoute>} />
                <Route path="/theme-demo" element={<ThemeDemo />} />
              </Routes>
            </Block>
          </Page>
        ) : (
          <>
            <Navbar />
            <main className="container mx-auto px-4 py-8">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/write" element={<Write />} />
                <Route path="/search" element={<Search />} />
                <Route path="/messages/:id" element={<MessageDetail />} />
                <Route path="/admin" element={<ProtectedRoute roles={['moderator','super_admin']}><Admin /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute roles={['moderator','super_admin']}><Dashboard /></ProtectedRoute>} />
                <Route path="/moderation" element={<ProtectedRoute roles={['moderator','super_admin']}><Moderation /></ProtectedRoute>} />
                <Route path="/logs" element={<ProtectedRoute roles={['moderator','super_admin']}><Logs /></ProtectedRoute>} />
                <Route path="/bans" element={<ProtectedRoute roles={['moderator','super_admin']}><Bans /></ProtectedRoute>} />
                <Route path="/theme-demo" element={<ThemeDemo />} />
              </Routes>
            </main>
          </>
        )}
        <Toaster position="top-right" richColors />
      </div>
    </Router>
  );
}

export default App;
