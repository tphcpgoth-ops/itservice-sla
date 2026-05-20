import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { 
  ArrowLeft, RefreshCw, Clock, User, HardDrive, 
  CheckSquare, Activity, MessageCircle, AlertTriangle, Send 
} from 'lucide-react';

export default function TaskProgress() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Technician status changing form
  const [statusNote, setStatusNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [zoomedImage, setZoomedImage] = useState(null);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchTicketDetails();
  }, [token, id, navigate]);

  const fetchTicketDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/tickets/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const resData = await res.json();
      if (res.ok) {
        setData(resData);
      } else {
        setError(resData.error || 'ไม่พบข้อมูลตั๋วงานซ่อมแซม');
      }
    } catch (err) {
      setError('ไม่สามารถเรียกข้อมูลใบแจ้งซ่อมจากเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (nextStatus) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/tickets/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: nextStatus,
          note: statusNote || undefined
        })
      });
      const resData = await res.json();
      if (res.ok) {
        setStatusNote('');
        fetchTicketDetails(); // Refresh
      } else {
        setError(resData.error || 'การเปลี่ยนสถานะล้มเหลว');
      }
    } catch (err) {
      setError('เกิดความผิดพลาดในการส่งข้อมูลสถานะซ่อม');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <RefreshCw className="animate-spin" size={24} style={{ color: 'var(--primary)', animation: 'spin 1.5s linear infinite' }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <button onClick={() => navigate('/tickets')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--on-background)' }}>
            <ArrowLeft size={20} />
          </button>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--on-background)' }}>รายละเอียดงานแจ้งซ่อม</h2>
        </div>
        <div className="card" style={{ color: 'var(--status-pending)', backgroundColor: 'var(--status-pending-bg)' }}>
          {error || 'เกิดข้อผิดพลาดในการโหลดข้อมูล'}
        </div>
      </div>
    );
  }

  const { ticket, logs } = data;
  const isTechnicianOrAdmin = user.role === 'technician' || user.role === 'admin';
  const isOriginalRequester = ticket.requester_id === user.id;

  // Render priority label
  const getPriorityStyle = (p) => {
    if (p === 'critical') return { color: 'var(--status-pending)', bg: 'var(--status-pending-bg)' };
    if (p === 'high') return { color: 'var(--status-progress)', bg: 'var(--status-progress-bg)' };
    if (p === 'medium') return { color: 'var(--status-assigned)', bg: 'var(--status-assigned-bg)' };
    return { color: 'var(--secondary)', bg: 'var(--surface-low)' };
  };

  const priorityStyle = getPriorityStyle(ticket.priority);

  return (
    <div style={{ padding: '16px' }} className="animated-fade">
      
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => navigate('/tickets')} 
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', color: 'var(--on-background)' }}
          >
            <ArrowLeft size={20} />
          </button>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--on-background)' }}>
            ใบแจ้งซ่อม {ticket.ticket_code}
          </h2>
        </div>
        <button 
          onClick={fetchTicketDetails}
          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', color: 'var(--primary)' }}
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Ticket Details Panel Card */}
      <div className="card" style={{ background: 'white', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <span className={`badge badge-${ticket.status}`}>
            {ticket.status === 'pending' ? 'รอดำเนินการ' :
             ticket.status === 'assigned' ? 'ช่างรับงาน' :
             ticket.status === 'in_progress' ? 'กำลังซ่อม' :
             ticket.status === 'resolved' ? 'ซ่อมเสร็จแล้ว' : 'ปิดตั๋วรีวิวแล้ว'}
          </span>
          <span style={{
            fontSize: '11px',
            fontWeight: '700',
            color: priorityStyle.color,
            backgroundColor: priorityStyle.bg,
            padding: '4px 10px',
            borderRadius: '4px',
            textTransform: 'uppercase'
          }}>
            ความสำคัญ: {ticket.priority}
          </span>
        </div>

        <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--on-surface)', marginBottom: '8px' }}>
          {ticket.title}
        </h3>

        <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', marginBottom: '16px', whiteSpace: 'pre-wrap' }}>
          {ticket.description}
        </p>

        {ticket.image_url && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--outline)', marginBottom: '6px', textTransform: 'uppercase' }}>
              รูปภาพแนบอาการเสีย:
            </div>
            <img 
              src={ticket.image_url} 
              alt="อาการเสียแนบมา" 
              onClick={() => setZoomedImage(ticket.image_url)}
              style={{ 
                maxWidth: '100%', 
                maxHeight: '180px', 
                borderRadius: '6px', 
                border: '1px solid var(--outline-light)',
                cursor: 'pointer',
                objectFit: 'cover',
                display: 'block',
                transition: 'opacity 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
            />
          </div>
        )}

        {/* Metadata info grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--outline-light)', paddingTop: '12px', fontSize: '12px', color: 'var(--on-surface-variant)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={14} style={{ color: 'var(--outline)' }} />
            <span>ผู้แจ้ง: <strong>{ticket.requester_name}</strong> (แผนก {ticket.requester_dept})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HardDrive size={14} style={{ color: 'var(--outline)' }} />
            <span>หมวดหมู่ระบบ: <strong>{ticket.category}</strong></span>
          </div>
          {ticket.technician_name ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckSquare size={14} style={{ color: 'var(--primary)' }} />
              <span>ช่างไอทีผู้รับผิดชอบ: <strong>{ticket.technician_name}</strong></span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-pending)' }}>
              <AlertTriangle size={14} />
              <span>ยังไม่มีช่างเทคนิครับงานแจ้งซ่อมนี้</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
            <Clock size={14} />
            <span>เส้นตาย SLA: <strong>{new Date(ticket.sla_deadline).toLocaleString('th-TH')}</strong></span>
          </div>
        </div>
      </div>

      {/* SLA COMPLIANCE METRIC STATUS WARNING */}
      {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px',
          backgroundColor: new Date(ticket.sla_deadline) < new Date() ? 'var(--status-pending-bg)' : 'var(--primary-light)',
          color: new Date(ticket.sla_deadline) < new Date() ? 'var(--status-pending)' : 'var(--primary)',
          borderRadius: 'var(--radius-md)',
          fontSize: '12px',
          fontWeight: '600',
          marginBottom: '20px'
        }}>
          <Clock size={16} />
          <span>
            {new Date(ticket.sla_deadline) < new Date() ? 
              '⚠️ ใบงานแจ้งซ่อมนี้ใช้เวลาเกินขีดจำกัด SLA โรงพยาบาลแล้ว!' : 
              `กรุณาซ่อมบำรุงและอัปเดตงานให้สำเร็จก่อนเวลาเส้นตาย SLA`}
          </span>
        </div>
      )}

      {/* DYNAMIC TIMELINE PROGRESS PANEL */}
      <h3 style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--outline)', marginBottom: '12px', letterSpacing: '0.05em' }}>
        บันทึกความคืบหน้า (Task Timeline)
      </h3>

      <div className="card" style={{ background: 'white', marginBottom: '20px', padding: '20px 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
          
          {/* Vertical line connection */}
          <div style={{
            position: 'absolute',
            left: '11px',
            top: '8px',
            bottom: '8px',
            width: '2px',
            backgroundColor: 'var(--outline-light)',
            zIndex: 1
          }}></div>

          {logs.map((log, idx) => {
            let logColor = 'var(--outline)';
            if (log.action === 'Created') logColor = 'var(--status-pending)';
            if (log.action === 'assigned') logColor = 'var(--status-assigned)';
            if (log.action === 'in_progress') logColor = 'var(--status-progress)';
            if (log.action === 'resolved') logColor = 'var(--status-resolved)';
            if (log.action === 'Rating' || log.action === 'closed') logColor = 'var(--status-closed)';

            return (
              <div key={log.id} style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 2 }}>
                
                {/* Timeline node dot */}
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: 'white',
                  border: `4px solid ${logColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}></div>

                <div style={{ flexGrow: 1 }}>
                  {/* Log Action name and time */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--on-surface)' }}>
                      {log.action === 'Created' ? '📝 เริ่มแจ้งซ่อมเข้าระบบ' :
                       log.action === 'assigned' ? '👤 ช่างรับมอบหมายงานซ่อม' :
                       log.action === 'in_progress' ? '⚙️ ดำเนินการซ่อมบำรุง' :
                       log.action === 'resolved' ? '✅ ตรวจซ่อมเสร็จสิ้น' :
                       log.action === 'Rating' ? '⭐ ผู้แจ้งลงคะแนนพึงพอใจ' : '🔒 ปิดตั๋วประเมินสำเร็จ'}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--outline)' }}>
                      {new Date(log.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  {/* Log Actor and details */}
                  <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                    โดย: {log.actor_name} ({log.actor_role === 'requester' ? 'ผู้ใช้งาน' : log.actor_role === 'technician' ? 'ช่าง' : 'แอดมิน'})
                  </span>
                  
                  {log.note && (
                    <p style={{
                      fontSize: '12px',
                      backgroundColor: 'var(--surface-low)',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      marginTop: '6px',
                      color: 'var(--on-surface)',
                      borderLeft: `2.5px solid ${logColor}`
                    }}>
                      {log.note}
                    </p>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* TECHNICIAN ACTION INTERACTIVE PORTAL */}
      {isTechnicianOrAdmin && (
        <div className="card" style={{ background: '#e8f1fc', borderColor: '#adc6ff', padding: '16px', margin: 0 }}>
          <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#004493', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={16} />
            แผงควบคุมการดำเนินงานสำหรับช่างซ่อม
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            {/* Note text field */}
            <div className="form-group" style={{ margin: 0 }}>
              <textarea 
                className="form-control"
                placeholder="กรอกบันทึก / ข้อความอัปเดตงาน (เช่น ตรวจพบแรมเสีย กำลังสลับชิ้นส่วน)..."
                style={{ fontSize: '13px', minHeight: '60px', border: '1px solid #adc6ff' }}
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
              ></textarea>
            </div>

            {/* Buttons depending on state */}
            <div style={{ display: 'flex', gap: '10px' }}>
              
              {ticket.status === 'pending' && (
                <button
                  onClick={() => handleUpdateStatus('assigned')}
                  disabled={isSubmitting}
                  className="btn btn-primary btn-block"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  <User size={16} />
                  คลิกรับงานใบแจ้งนี้
                </button>
              )}

              {ticket.status === 'assigned' && (
                <button
                  onClick={() => handleUpdateStatus('in_progress')}
                  disabled={isSubmitting}
                  className="btn btn-primary btn-block"
                  style={{ backgroundColor: 'var(--status-progress)' }}
                >
                  <Activity size={16} />
                  เริ่มการซ่อม (In Progress)
                </button>
              )}

              {ticket.status === 'in_progress' && (
                <button
                  onClick={() => handleUpdateStatus('resolved')}
                  disabled={isSubmitting}
                  className="btn btn-primary btn-block"
                  style={{ backgroundColor: 'var(--status-resolved)' }}
                >
                  <CheckSquare size={16} />
                  ซ่อมเสร็จแล้ว (Mark Resolved)
                </button>
              )}

              {/* Resolved / Closed state details */}
              {(ticket.status === 'resolved' || ticket.status === 'closed') && (
                <span style={{ fontSize: '12px', color: 'var(--status-resolved)', fontWeight: '600', textAlign: 'center', width: '100%', padding: '8px' }}>
                  ✓ งานแจ้งซ่อมเสร็จสิ้นสมบูรณ์แล้ว ไม่จำเป็นต้องดำเนินการใดเพิ่มเติม
                </span>
              )}

            </div>
          </div>
        </div>
      )}

      {/* REQUESTER RATING PORTAL LINK */}
      {isOriginalRequester && ticket.status === 'resolved' && (
        <div className="card" style={{ background: '#e8f5e9', borderColor: '#a5d6a7', color: '#2e7d32', padding: '16px', margin: 0, textAlign: 'center' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>
            🎉 ช่างแจ้งว่าตรวจซ่อมเสร็จเรียบร้อยแล้ว!
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--on-surface)', marginBottom: '14px' }}>
            รบกวนให้คะแนนความพึงพอใจและประเมินผล เพื่อช่วยเราพัฒนาคุณภาพงานบริการ SLA
          </p>
          <button
            onClick={() => navigate(`/rate/${ticket.id}`)}
            className="btn btn-primary btn-block"
            style={{ backgroundColor: 'var(--status-resolved)' }}
          >
            <Send size={16} />
            ประเมินคะแนนและปิดเคสซ่อม
          </button>
        </div>
      )}
      {/* Lightbox Zoom Modal Overlay */}
      {zoomedImage && (
        <div 
          onClick={() => setZoomedImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadein 0.2s'
          }}
        >
          <img 
            src={zoomedImage} 
            alt="Zoomed View" 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '100%', 
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }} 
          />
          <style>{`@keyframes fadein { from { opacity: 0; } to { opacity: 1; } }`}</style>
        </div>
      )}

    </div>
  );
}
