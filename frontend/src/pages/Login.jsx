import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { Shield, MessageSquare, AlertCircle } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Users for mock logins (matches the database seed)
  const mockUsers = [
    { id: 1, name: 'นพ.สมชาย (ผู้แจ้ง)', role: 'requester', dept: 'OPD (แผนกผู้ป่วยนอก)', img: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100' },
    { id: 2, name: 'พญ.วันดี (ผู้แจ้ง)', role: 'requester', dept: 'IPD (แผนกผู้ป่วยใน)', img: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?w=100' },
    { id: 3, name: 'ช่างเอก (ไอทีซัพพอร์ต)', role: 'technician', dept: 'ศูนย์คอมพิวเตอร์', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100' },
    { id: 4, name: 'ช่างบอย (เน็ตเวิร์ก)', role: 'technician', dept: 'ศูนย์คอมพิวเตอร์', img: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100' },
    { id: 5, name: 'แอดมินหญิง (สารสนเทศ)', role: 'admin', dept: 'ศูนย์คอมพิวเตอร์', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' }
  ];

  // Handle URL errors or success callbacks
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errParam = urlParams.get('error');
    if (errParam) {
      setError('การเข้าสู่ระบบผ่าน LINE ล้มเหลว โปรดใช้ Mock Login');
    }
  }, []);

  const handleLineLogin = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/line/login-url`);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // Redirect to LINE Login Page
      } else {
        setError('ไม่สามารถเรียกใช้งาน LINE Login ได้');
      }
    } catch (err) {
      setError('ไม่สามารถติดต่อเซิร์ฟเวอร์ LINE Login ได้');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMockLogin = async (userId) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/mock-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/');
        window.location.reload(); // Refresh to update nav header
      } else {
        setError(data.error || 'Mock Login ล้มเหลว');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ฐานข้อมูล');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center' }}>
      
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '16px',
          backgroundColor: 'var(--primary)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          marginBottom: '16px',
          boxShadow: '0 8px 16px rgba(0, 88, 188, 0.2)'
        }}>
          <Shield size={32} />
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--on-background)', marginBottom: '8px' }}>
          IT Service Tracker
        </h1>
        <p style={{ color: 'var(--on-surface-variant)', fontSize: '14px' }}>
          ระบบแจ้งซ่อมและรายงานผลสถิติ SLA โรงพยาบาล
        </p>
      </div>

      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px',
          backgroundColor: 'var(--status-pending-bg)',
          color: 'var(--status-pending)',
          borderRadius: 'var(--radius-md)',
          fontSize: '13px',
          marginBottom: '20px'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Real LINE Login Action */}
      <div style={{ marginBottom: '36px' }}>
        <button 
          onClick={handleLineLogin} 
          disabled={isLoading}
          className="btn btn-primary btn-block"
          style={{
            backgroundColor: '#06C755', // LINE Green Color
            borderColor: '#06C755',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '15px',
            padding: '14px',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(6, 199, 85, 0.15)'
          }}
        >
          <MessageSquare size={18} fill="white" />
          เข้าสู่ระบบด้วย LINE Account
        </button>
      </div>

      {/* Mock Local Logins (Crucial for Localhost testing) */}
      {/* <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{ flexGrow: 1, height: '1px', backgroundColor: 'var(--outline-light)' }}></div>
          <span style={{ fontSize: '11px', color: 'var(--outline)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            หรือ เข้าใช้งานจำลองสำหรับการทดสอบ
          </span>
          <div style={{ flexGrow: 1, height: '1px', backgroundColor: 'var(--outline-light)' }}></div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {mockUsers.map((u) => (
            <button
              key={u.id}
              onClick={() => handleMockLogin(u.id)}
              disabled={isLoading}
              className="btn btn-secondary btn-block"
              style={{
                display: 'flex',
                justifyContent: 'flex-start',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                textAlign: 'left'
              }}
            >
              <img 
                src={u.img} 
                alt={u.name} 
                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--outline-light)' }} 
              />
              <div style={{ flexGrow: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--on-surface)' }}>{u.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>{u.dept} ({u.role})</div>
              </div>
            </button>
          ))}
        </div>
      </div> */}

    </div>
  );
}
