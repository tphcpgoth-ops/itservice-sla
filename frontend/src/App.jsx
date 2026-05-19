import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ITRequestForm from './pages/ITRequestForm';
import TaskList from './pages/TaskList';
import TaskProgress from './pages/TaskProgress';
import SummaryRating from './pages/SummaryRating';

import { LogOut, Home, ClipboardList, Shield, User, RefreshCw } from 'lucide-react';
import { API_BASE } from './config';

// 1. Redirect helper callback component
function LoginSuccess() {
  const navigate = useNavigate();
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      localStorage.setItem('token', token);
      
      // Fetch me details to save profile
      fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        navigate('/');
        window.location.reload();
      })
      .catch(() => {
        navigate('/login?error=profile_failed');
      });
    } else {
      navigate('/login?error=token_missing');
    }
  }, [navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', flexDirection: 'column', gap: '12px' }}>
      <RefreshCw className="animate-spin" size={24} style={{ color: 'var(--primary)', animation: 'spin 1.5s linear infinite' }} />
      <span style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>กำลังเชื่อมต่อบัญชีไลน์และเข้าระบบโรงพยาบาล...</span>
    </div>
  );
}

// 2. Navigation Header and Layout Shell
function AppLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isLoginPage = location.pathname === '/login' || location.pathname === '/login-success';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', flexGrow: 1 }}>
      
      {/* Premium Top Navigation Bar */}
      {!isLoginPage && token && (
        <header style={{
          backgroundColor: 'white',
          borderBottom: '1px solid var(--outline-light)',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
        }}>
          
          {/* Logo Brand */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'var(--on-background)' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'var(--primary)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Shield size={16} />
            </div>
            <div>
              <span style={{ fontSize: '14px', fontWeight: '700', letterSpacing: '-0.01em', display: 'block' }}>IT SLA Tracker</span>
              <span style={{ fontSize: '9px', color: 'var(--outline)', display: 'block', marginTop: '-2px', textTransform: 'uppercase' }}>Hospital IT</span>
            </div>
          </Link>

          {/* User profile & Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img 
                src={user.picture_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} 
                alt={user.display_name} 
                style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--outline-light)' }}
              />
              <div style={{ display: 'none', md: 'block' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--on-surface)', display: 'block' }}>{user.display_name}</span>
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--status-pending)',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="ออกจากระบบ"
            >
              <LogOut size={16} />
            </button>
          </div>

        </header>
      )}

      {/* Main Content Area */}
      <main style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      {!isLoginPage && token && (
        <nav style={{
          backgroundColor: 'white',
          borderTop: '1px solid var(--outline-light)',
          display: 'flex',
          position: 'sticky',
          bottom: 0,
          zIndex: 100,
          padding: '6px 0',
          boxShadow: '0 -2px 10px rgba(0,0,0,0.02)'
        }}>
          <Link 
            to="/" 
            style={{
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
              textDecoration: 'none',
              fontSize: '10px',
              fontWeight: '600',
              color: location.pathname === '/' ? 'var(--primary)' : 'var(--outline)'
            }}
          >
            <Home size={18} />
            <span>กระดานหลัก</span>
          </Link>

          <Link 
            to="/tickets" 
            style={{
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
              textDecoration: 'none',
              fontSize: '10px',
              fontWeight: '600',
              color: location.pathname === '/tickets' ? 'var(--primary)' : 'var(--outline)'
            }}
          >
            <ClipboardList size={18} />
            <span>คิวงานแจ้งซ่อม</span>
          </Link>

          <Link 
            to="/request" 
            style={{
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
              textDecoration: 'none',
              fontSize: '10px',
              fontWeight: '600',
              color: location.pathname === '/request' ? 'var(--primary)' : 'var(--outline)'
            }}
          >
            <User size={18} />
            <span>แจ้งซ่อมบำรุง</span>
          </Link>
        </nav>
      )}

    </div>
  );
}

// 3. Routing Router Setup
export default function App() {
  return (
    <Router>
      <AppLayout>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/login-success" element={<LoginSuccess />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/request" element={<ITRequestForm />} />
          <Route path="/tickets" element={<TaskList />} />
          <Route path="/ticket/:id" element={<TaskProgress />} />
          <Route path="/rate/:id" element={<SummaryRating />} />
        </Routes>
      </AppLayout>
    </Router>
  );
}
