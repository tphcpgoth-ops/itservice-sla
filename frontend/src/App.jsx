import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ITRequestForm from './pages/ITRequestForm';
import TaskList from './pages/TaskList';
import TaskProgress from './pages/TaskProgress';
import SummaryRating from './pages/SummaryRating';
import ManageDepartments from './pages/ManageDepartments';
import ManageUsers from './pages/ManageUsers';

import { LogOut, Home, ClipboardList, Shield, User, RefreshCw, Building2, CheckCircle2, AlertCircle } from 'lucide-react';
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
  
  const [token, setToken] = useState(null);
  const [userState, setUserState] = useState({});

  useEffect(() => {
    setToken(localStorage.getItem('token'));
    setUserState(JSON.parse(localStorage.getItem('user') || '{}'));
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUserState({});
    navigate('/login');
  };

  const isLoginPage = location.pathname === '/login' || location.pathname === '/login-success';
  const showDeptModal = token && !isLoginPage && userState.department === 'ทั่วไป';

  // State for overlay modal
  const [depts, setDepts] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [selectedDept, setSelectedDept] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [modalError, setModalError] = useState(null);
  const [savingDept, setSavingDept] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (showDeptModal) {
      setLoadingDepts(true);
      fetch(`${API_BASE}/departments`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            // Filter out 'ทั่วไป' department
            const filtered = data.departments.filter(d => d.name !== 'ทั่วไป');
            setDepts(filtered);
          } else {
            setModalError(data.error || 'ไม่สามารถดึงข้อมูลแผนกได้');
          }
        })
        .catch(() => {
          setModalError('เกิดข้อผิดพลาดในการโหลดข้อมูลแผนก');
        })
        .finally(() => {
          setLoadingDepts(false);
        });
    }
  }, [showDeptModal, token]);

  // Set email from profile once loaded
  useEffect(() => {
    if (userState.email) {
      setEmailInput(userState.email);
    }
  }, [userState]);

  const handleSaveFirstTimeDept = async (e) => {
    e.preventDefault();
    if (!selectedDept) {
      setModalError('กรุณาเลือกแผนกสังกัดจริงของคุณ');
      return;
    }
    setSavingDept(true);
    setModalError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          department: selectedDept,
          email: emailInput.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveSuccess(true);
        setTimeout(() => {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          setToken(data.token);
          setUserState(data.user);
          setSaveSuccess(false);
        }, 1000);
      } else {
        setModalError(data.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (err) {
      setModalError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setSavingDept(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', flexGrow: 1, position: 'relative' }}>
      
      {/* Non-dismissible Glassmorphic Overlay for First-time Department Selection */}
      {showDeptModal && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          backgroundColor: 'rgba(25, 28, 30, 0.65)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          animation: 'fadeIn 0.3s ease-out forwards'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(0, 0, 0, 0.05)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Ambient Background Gradient Glow for premium feel */}
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '150px',
              height: '150px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0, 88, 188, 0.12) 0%, rgba(255, 255, 255, 0) 70%)',
              zIndex: 0,
              pointerEvents: 'none'
            }} />

            {saveSuccess ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '30px 0',
                gap: '16px',
                textAlign: 'center',
                animation: 'fadeIn 0.3s ease-out'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--status-resolved-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--status-resolved)',
                  boxShadow: '0 4px 10px rgba(46, 125, 50, 0.15)'
                }}>
                  <CheckCircle2 size={36} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--on-surface)', marginBottom: '6px' }}>บันทึกข้อมูลเรียบร้อยแล้ว</h3>
                  <p style={{ fontSize: '13px', color: 'var(--outline)' }}>ระบบกำลังอัปเดตสิทธิ์เข้าถึง และพาคุณเข้าสู่ระบบหลัก...</p>
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative', zIndex: 1 }}>
                {/* Header Section */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    backgroundColor: 'var(--primary-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                    marginBottom: '14px',
                    boxShadow: '0 4px 12px rgba(0, 88, 188, 0.1)'
                  }}>
                    <Building2 size={28} />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--on-surface)', letterSpacing: '-0.02em', marginBottom: '8px' }}>
                    ระบุแผนกสังกัดของคุณ
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', lineHeight: '1.6' }}>
                    ยินดีต้อนรับเข้าสู่ระบบแจ้งซ่อมบำรุง! กรุณายืนยันแผนกที่สังกัดอยู่ในปัจจุบันและอีเมลเพื่อประโยชน์ในการสื่อสารและการคิด SLA
                  </p>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSaveFirstTimeDept}>
                  {modalError && (
                    <div style={{
                      padding: '10px 12px',
                      backgroundColor: 'var(--status-pending-bg)',
                      color: 'var(--status-pending)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '12px',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <AlertCircle size={16} />
                      <span style={{ fontWeight: '500' }}>{modalError}</span>
                    </div>
                  )}

                  {/* Department Select Option */}
                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label className="form-label">สังกัดจริง / แผนกปฏิบัติงาน *</label>
                    <select
                      className="form-control"
                      value={selectedDept}
                      onChange={(e) => {
                        setSelectedDept(e.target.value);
                        setModalError(null);
                      }}
                      disabled={loadingDepts || savingDept}
                      style={{
                        width: '100%',
                        cursor: 'pointer',
                        fontWeight: selectedDept ? '600' : '400',
                        color: selectedDept ? 'var(--on-background)' : 'var(--outline)'
                      }}
                      required
                    >
                      <option value="" disabled style={{ color: 'var(--outline)' }}>--- กรุณาเลือกแผนก ---</option>
                      {depts.map((dept) => (
                        <option 
                          key={dept.id} 
                          value={dept.name} 
                          style={{ color: 'var(--on-background)', fontWeight: 'normal' }}
                        >
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Email Input Field */}
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label className="form-label">อีเมลหน่วยงาน / ติดต่อ (ถ้ามี)</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="เช่น user@hospital.go.th"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      disabled={savingDept}
                    />
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      type="submit"
                      disabled={savingDept || !selectedDept}
                      className="btn btn-primary btn-block"
                      style={{ height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      {savingDept ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" style={{ animation: 'spin 1.5s linear infinite' }} />
                          <span>กำลังบันทึกข้อมูล...</span>
                        </>
                      ) : (
                        <span>ยืนยันและเริ่มใช้งานระบบ</span>
                      )}
                    </button>
                    
                    {/* Logout Option as emergency backup */}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="btn btn-secondary btn-block"
                      style={{ 
                        height: '40px', 
                        fontSize: '12px', 
                        border: 'none', 
                        background: 'transparent',
                        color: 'var(--outline)',
                        boxShadow: 'none'
                      }}
                    >
                      ออกจากระบบชั่วคราว
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

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
              <span style={{ fontSize: '14px', fontWeight: '700', letterSpacing: '-0.01em', display: 'block' }}>IT Service Tracker</span>
              <span style={{ fontSize: '9px', color: 'var(--outline)', display: 'block', marginTop: '-2px', textTransform: 'uppercase' }}>รพร.ตะพานหิน</span>
            </div>
          </Link>

          {/* User profile & Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img 
                src={userState.picture_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} 
                alt={userState.display_name} 
                style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--outline-light)' }}
              />
              <div style={{ display: 'none', md: 'block' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--on-surface)', display: 'block' }}>{userState.display_name}</span>
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
          <Route path="/admin/departments" element={<ManageDepartments />} />
          <Route path="/admin/users" element={<ManageUsers />} />
        </Routes>
      </AppLayout>
    </Router>
  );
}
