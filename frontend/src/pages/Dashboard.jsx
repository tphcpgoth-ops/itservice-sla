import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE } from '../config';
import { 
  PlusCircle, ClipboardList, Activity, Clock, 
  Settings, Award, RefreshCw, AlertOctagon, CheckCircle2 
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // SLA configuration hooks for Admin
  const [editingSettings, setEditingSettings] = useState({});
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchStats();
    if (user.role === 'admin') {
      fetchSlaSettings();
    }
  }, [token, navigate]);

  const fetchSlaSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings/sla`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.settings) {
        const mapped = {};
        data.settings.forEach(s => {
          mapped[s.priority] = s.minutes;
        });
        setEditingSettings(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch SLA settings:', err);
    }
  };

  const handleUpdateSla = async (priority) => {
    setUpdatingSettings(true);
    setSettingsMessage('');
    try {
      const res = await fetch(`${API_BASE}/settings/sla`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          priority,
          minutes: parseInt(editingSettings[priority])
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSettingsMessage(`อัปเดต SLA ของระบบกลุ่มความสำคัญ [${priority}] สำเร็จ!`);
        fetchStats(); // reload stats to update labels
      } else {
        setSettingsMessage(data.error || 'ไม่สามารถอัปเดตการตั้งค่าได้');
      }
    } catch (err) {
      setSettingsMessage('เกิดความผิดพลาดในการต่ออินเทอร์เน็ตหลังบ้าน');
    } finally {
      setUpdatingSettings(false);
    }
  };


  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setStats(data);
      } else {
        setError(data.error || 'ไม่สามารถโหลดข้อมูลสถิติได้');
      }
    } catch (err) {
      setError('เชื่อมต่อกับเซิร์ฟเวอร์ฐานข้อมูลล้มเหลว');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', flexDirection: 'column', gap: '10px' }}>
        <RefreshCw className="animate-spin" size={24} style={{ color: 'var(--primary)', animation: 'spin 1.5s linear infinite' }} />
        <span style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>กำลังประมวลผลข้อมูลสถิติ SLA...</span>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Dashboard for Requesters (Doctors, Nurses, General Hospital Staff)
  const isRequester = user.role === 'requester';

  return (
    <div style={{ padding: '16px' }} className="animated-fade">
      
      {/* Welcome Banner */}
      <div style={{
        backgroundColor: 'var(--primary)',
        color: 'white',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 8px 16px rgba(0, 88, 188, 0.1)'
      }}>
        <div style={{ fontSize: '12px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>
          ยินดีต้อนรับสู่ระบบแจ้งซ่อมไอที
        </div>
        <div style={{ fontSize: '20px', fontWeight: '700', marginTop: '4px' }}>
          {user.display_name}
        </div>
        <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '2px' }}>
          สิทธิ์: {isRequester ? `ผู้ใช้งานทั่วไป (แผนก ${user.department})` : user.role === 'technician' ? 'ช่างเทคนิคสารสนเทศ' : 'ผู้ดูแลระบบ (Admin)'}
        </div>
      </div>

      {error && (
        <div className="card" style={{ color: 'var(--status-pending)', backgroundColor: 'var(--status-pending-bg)' }}>
          {error}
        </div>
      )}

      {/* SLA COMPLIANCE METRIC (For Admin/Technicians - main statistic dashboard) */}
      {!isRequester && stats && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px', background: 'white' }}>
          <div style={{
            position: 'relative',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <div style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              backgroundColor: 'white',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary)' }}>
                {stats.slaComplianceRate}%
              </span>
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Award size={18} style={{ color: '#d4af37' }} />
              สถิติ SLA Compliance
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginTop: '4px' }}>
              เป้าหมายเวลาเสร็จสิ้นงานซ่อมบำรุงตามข้อตกลงระดับบริการของโรงพยาบาลในตั๋วงานทั้งหมด
            </p>
          </div>
        </div>
      )}

      {/* QUICK LINK ACTIONS BASED ON ROLE */}
      <h3 style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--outline)', marginBottom: '10px', letterSpacing: '0.05em' }}>
        บริการและงานเร่งด่วน
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
        
        {isRequester ? (
          <>
            <Link to="/request" className="btn btn-primary" style={{ height: '70px', flexDirection: 'column', gap: '4px', textAlign: 'center' }}>
              <PlusCircle size={20} />
              <span>แจ้งซ่อมคอมพิวเตอร์</span>
            </Link>
            
            <Link to="/tickets" className="btn btn-secondary" style={{ height: '70px', flexDirection: 'column', gap: '4px', textAlign: 'center' }}>
              <ClipboardList size={20} />
              <span>ประวัติและงานในแผนก</span>
            </Link>
          </>
        ) : (
          <>
            <Link to="/tickets" className="btn btn-primary" style={{ height: '70px', flexDirection: 'column', gap: '4px', textAlign: 'center', backgroundColor: '#0058bc' }}>
              <ClipboardList size={20} />
              <span>กระดานงานไอทีค้าง</span>
            </Link>
            
            <Link to="/request" className="btn btn-secondary" style={{ height: '70px', flexDirection: 'column', gap: '4px', textAlign: 'center' }}>
              <PlusCircle size={20} />
              <span>เปิดตั๋วงานแทนแผนก</span>
            </Link>
          </>
        )}

      </div>

      {/* TICKET QUEUE COUNTERS */}
      {stats && (
        <>
          <h3 style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--outline)', marginBottom: '10px', letterSpacing: '0.05em' }}>
            สถานะคิวงานแจ้งซ่อมในระบบ
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            
            <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '12px', margin: 0, borderLeft: '4px solid var(--status-pending)' }}>
              <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)', fontWeight: '600' }}>รอดำเนินงาน (Pending)</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
                <span style={{ fontSize: '24px', fontWeight: '700', color: 'var(--status-pending)' }}>{stats.statusCounts.pending}</span>
                <span style={{ fontSize: '11px', color: 'var(--outline)' }}>ตั๋ว</span>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '12px', margin: 0, borderLeft: '4px solid var(--status-assigned)' }}>
              <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)', fontWeight: '600' }}>รับงานแล้ว (Assigned)</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
                <span style={{ fontSize: '24px', fontWeight: '700', color: 'var(--status-assigned)' }}>{stats.statusCounts.assigned}</span>
                <span style={{ fontSize: '11px', color: 'var(--outline)' }}>ตั๋ว</span>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '12px', margin: 0, borderLeft: '4px solid var(--status-progress)' }}>
              <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)', fontWeight: '600' }}>กำลังซ่อม (In Progress)</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
                <span style={{ fontSize: '24px', fontWeight: '700', color: 'var(--status-progress)' }}>{stats.statusCounts.in_progress}</span>
                <span style={{ fontSize: '11px', color: 'var(--outline)' }}>ตั๋ว</span>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '12px', margin: 0, borderLeft: '4px solid var(--status-resolved)' }}>
              <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)', fontWeight: '600' }}>ซ่อมเสร็จแล้ว (Resolved/Closed)</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
                <span style={{ fontSize: '24px', fontWeight: '700', color: 'var(--status-resolved)' }}>
                  {(stats.statusCounts.resolved || 0) + (stats.statusCounts.closed || 0)}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--outline)' }}>ตั๋ว</span>
              </div>
            </div>

          </div>
        </>
      )}

      {/* PRIORITY & CATEGORY DISTRIBUTIONS (For Admin/Technicians) */}
      {!isRequester && stats && (
        <div className="card" style={{ margin: 0, background: 'white' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--on-surface)', marginBottom: '14px' }}>
            แยกตามความสำคัญของระบบ
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ fontWeight: '600', color: 'var(--priority-critical)' }}>วิกฤต (Critical - SLA 1 ชม.)</span>
                <span>{stats.priorityCounts.critical} เคส</span>
              </div>
              <div style={{ height: '6px', backgroundColor: 'var(--surface-low)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  backgroundColor: 'var(--priority-critical)', 
                  width: `${(stats.priorityCounts.critical / (Object.values(stats.priorityCounts).reduce((a,b)=>a+b, 0) || 1)) * 100}%` 
                }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ fontWeight: '600', color: 'var(--priority-high)' }}>สูง (High - SLA 2 ชม.)</span>
                <span>{stats.priorityCounts.high} เคส</span>
              </div>
              <div style={{ height: '6px', backgroundColor: 'var(--surface-low)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  backgroundColor: 'var(--priority-high)', 
                  width: `${(stats.priorityCounts.high / (Object.values(stats.priorityCounts).reduce((a,b)=>a+b, 0) || 1)) * 100}%` 
                }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ fontWeight: '600', color: 'var(--priority-medium)' }}>ปานกลาง (Medium - SLA 4 ชม.)</span>
                <span>{stats.priorityCounts.medium} เคส</span>
              </div>
              <div style={{ height: '6px', backgroundColor: 'var(--surface-low)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  backgroundColor: 'var(--priority-medium)', 
                  width: `${(stats.priorityCounts.medium / (Object.values(stats.priorityCounts).reduce((a,b)=>a+b, 0) || 1)) * 100}%` 
                }}></div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* REQUESTER INFO BLOCK */}
      {isRequester && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#e8f1fc', borderColor: '#adc6ff', color: '#004493', marginTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '13px' }}>
            <CheckCircle2 size={16} />
            เชื่อมต่อกับแชทไลน์เรียบร้อย
          </div>
          <span style={{ fontSize: '12px' }}>
            คุณจะได้รับการแจ้งเตือนความคืบหน้าของงานซ่อม (รับเรื่อง, กำลังซ่อม, ซ่อมเสร็จ) ผ่านไลน์ OA ของโรงพยาบาลโดยอัตโนมัติ
          </span>
        </div>
      )}

      {/* SLA CONFIGURATION SETTINGS PANEL (ADMIN ONLY) */}
      {user.role === 'admin' && (
        <div className="card" style={{ marginTop: '20px', background: 'white', border: '1px solid var(--outline-light)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--on-surface)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Settings size={16} />
            ตั้งค่าข้อตกลงจำกัดเวลา SLA โรงพยาบาล
          </h3>
          <p style={{ fontSize: '11px', color: 'var(--outline)', marginBottom: '14px' }}>
            ผู้ดูแลระบบสามารถปรับแต่งจำนวนเวลาข้อตกลงจำกัดการแก้ไข (นาที) ของแต่ละความเร่งด่วนได้ ซึ่งระบบคำนวณวันสิ้นสุดจะเปลี่ยนไปตามตาราง MySQL นี้โดยตรง
          </p>

          {settingsMessage && (
            <div style={{
              fontSize: '12px',
              padding: '8px 12px',
              borderRadius: '6px',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              fontWeight: '600',
              marginBottom: '12px'
            }}>
              {settingsMessage}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {['low', 'medium', 'high', 'critical'].map((prio) => (
              <div key={prio} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', paddingBottom: '8px', borderBottom: '1px solid var(--outline-light)' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: prio === 'critical' ? 'var(--status-pending)' : prio === 'high' ? 'var(--status-progress)' : 'var(--outline)' }}>
                  {prio === 'low' ? 'ต่ำ (Low)' : prio === 'medium' ? 'ปานกลาง (Medium)' : prio === 'high' ? 'สูง (High)' : 'วิกฤต (Critical)'}
                </span>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    value={editingSettings[prio] || ''}
                    onChange={(e) => setEditingSettings({ ...editingSettings, [prio]: e.target.value })}
                    className="form-control"
                    style={{ width: '80px', margin: 0, padding: '4px 8px', fontSize: '12px', textAlign: 'center' }}
                    min="1"
                  />
                  <span style={{ fontSize: '11px', color: 'var(--outline)' }}>นาที</span>
                  
                  <button
                    onClick={() => handleUpdateSla(prio)}
                    disabled={updatingSettings}
                    style={{
                      border: 'none',
                      backgroundColor: 'var(--primary)',
                      color: 'white',
                      fontSize: '11px',
                      fontWeight: '600',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    บันทึก
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
