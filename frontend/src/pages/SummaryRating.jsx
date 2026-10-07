import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { ArrowLeft, RefreshCw, Star, Clock, AlertTriangle, CheckCircle2, MessageSquare, CheckSquare } from 'lucide-react';

// Helper to format duration
function formatDuration(startStr, endStr) {
  if (!startStr || !endStr) return 'ไม่ทราบเวลา';
  const start = new Date(startStr);
  const end = new Date(endStr);
  const diffMs = end - start;
  if (diffMs < 0) return '0 นาที';
  const mins = Math.floor(diffMs / 60000);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h} ชม. ${m} นาที` : `${h} ชม.`;
  }
  return `${mins} นาที`;
}

export default function SummaryRating() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Rating form
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchTicketInfo();
  }, [token, id, navigate]);

  const fetchTicketInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/tickets/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setTicket(data.ticket);
      } else {
        setError(data.error || 'ไม่พบตั๋วแจ้งซ่อม');
      }
    } catch (err) {
      setError('การเชื่อมต่อล้มเหลว');
    } finally {
      setLoading(false);
    }
  };

  const handleRatingSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/tickets/${id}/rate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating, feedback })
      });
      const data = await res.json();
      if (res.ok) {
        navigate(`/ticket/${id}`);
      } else {
        setError(data.error || 'การส่งคะแนนประเมินล้มเหลว');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดทางเทคนิคในการเชื่อมต่อ');
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

  if (error || !ticket) {
    return (
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <button onClick={() => navigate(`/ticket/${id}`)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--on-background)' }}>
            <ArrowLeft size={20} />
          </button>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--on-background)' }}>ให้คะแนนบริการซ่อม</h2>
        </div>
        <div className="card" style={{ color: 'var(--status-pending)', backgroundColor: 'var(--status-pending-bg)' }}>
          {error || 'เกิดข้อผิดพลาดในการโหลด'}
        </div>
      </div>
    );
  }

  // Calculate SLA values
  const totalTimeStr = formatDuration(ticket.created_at, ticket.updated_at);
  const isSlaHealthy = new Date(ticket.updated_at) <= new Date(ticket.sla_deadline);

  return (
    <div style={{ padding: '16px', maxWidth: '780px', margin: '0 auto' }} className="animated-fade">
      
      {/* Top Bar Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button 
          onClick={() => navigate(`/ticket/${id}`)} 
          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', color: 'var(--on-background)' }}
        >
          <ArrowLeft size={24} />
        </button>
      </div>

      {/* Summary Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '24px' }}>
        <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary)', letterSpacing: '0.05em' }}>
          TICKET #{ticket.ticket_code}
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: '700', lineHeight: '34px', letterSpacing: '-0.02em', color: 'var(--on-background)', margin: '4px 0' }}>
          สรุปรายละเอียดการซ่อม
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)', margin: 0 }}>
          {ticket.title} (แผนก {ticket.requester_dept})
        </p>
      </div>

      {/* Bento Layout Summary Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '16px', 
        marginBottom: '24px' 
      }}>
        
        {/* SLA Card */}
        <div style={{ 
          gridColumn: '1 / -1',
          padding: '24px', 
          borderRadius: '12px', 
          backgroundColor: 'var(--surface)', 
          border: '1px solid var(--outline-light)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#d5e0f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={28} color="var(--primary)" />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--on-surface-variant)' }}>เวลาดำเนินการทั้งหมด (Total SLA)</div>
              <div style={{ fontSize: '22px', fontWeight: '600', color: 'var(--on-surface)' }}>{totalTimeStr}</div>
            </div>
          </div>
          
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '9999px',
            backgroundColor: isSlaHealthy ? '#E8F5E9' : '#ffebee',
            color: isSlaHealthy ? '#2E7D32' : '#c62828'
          }}>
            <CheckCircle2 size={18} fill={isSlaHealthy ? "currentColor" : "none"} color={isSlaHealthy ? "white" : "currentColor"} />
            <span style={{ fontSize: '12px', fontWeight: '600' }}>
              {isSlaHealthy ? 'ภายในกำหนด (SLA Healthy)' : 'ล่าช้ากว่ากำหนด (SLA Breached)'}
            </span>
          </div>
        </div>

        {/* Issues Card */}
        <div style={{ 
          padding: '20px', 
          borderRadius: '12px', 
          backgroundColor: 'var(--surface)', 
          border: '1px solid var(--outline-light)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <AlertTriangle size={20} color="#9e3d00" />
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--on-surface)', margin: 0 }}>ปัญหาที่พบ</h3>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)', lineHeight: '1.6', whiteSpace: 'pre-wrap', margin: 0 }}>
            {ticket.description}
          </p>
        </div>

      </div>

      {/* Satisfaction Rating Section */}
      <form onSubmit={handleRatingSubmit} style={{ 
        marginTop: '16px', 
        padding: '24px', 
        borderRadius: '12px', 
        backgroundColor: '#d8e2ff', // primary-fixed
        color: '#001a41', // on-primary-fixed
        border: '1px solid #adc6ff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '4px', marginTop: 0 }}>ประเมินความพึงพอใจ</h2>
          <p style={{ fontSize: '14px', opacity: 0.8, margin: 0 }}>ความคิดเห็นของท่านช่วยให้เราพัฒนาบริการดียิ่งขึ้น</p>
        </div>

        {/* Rating Stars */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '32px' }}>
          {[1, 2, 3, 4, 5].map((star) => {
            const isActive = (hoverRating || rating) >= star;
            return (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                style={{
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: isActive ? '#0070eb' : 'var(--outline-variant)',
                  transform: hoverRating === star ? 'scale(1.1)' : 'scale(1)',
                  transition: 'transform 0.15s, color 0.15s'
                }}
              >
                <Star size={40} fill={isActive ? "currentColor" : "none"} strokeWidth={1.5} />
              </button>
            );
          })}
        </div>
        
        {/* Rating text description */}
        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary)', textAlign: 'center', marginBottom: '24px' }}>
          {rating === 5 ? '⭐ ยอดเยี่ยมที่สุด (SLA ดีเลิศ)' :
           rating === 4 ? '⭐ ดีมาก (ประทับใจการบริการ)' :
           rating === 3 ? '⭐ ปานกลาง (แก้ไขได้ตามกำหนด)' :
           rating === 2 ? '⭐ พอใช้ (ล่าช้าหรือซ่อมแล้วยังมีจุดติด)' : '⭐ ปรับปรุงด่วน (เกินเวลา SLA มาก / ซ่อมไม่สำเร็จ)'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MessageSquare size={14} /> ข้อเสนอแนะเพิ่มเติม
          </label>
          <textarea 
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="กรอกความเห็นของคุณที่นี่..." 
            rows="3"
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '8px',
              backgroundColor: 'white',
              border: '1px solid var(--outline-light)',
              fontSize: '14px',
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
              fontFamily: 'inherit'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--outline-light)'}
          ></textarea>
        </div>

        {/* Action Button */}
        <div style={{ marginTop: '16px' }}>
          <button 
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              height: '56px',
              backgroundColor: 'var(--primary)',
              color: 'white',
              borderRadius: '12px',
              fontWeight: '700',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              transition: 'transform 0.1s, background-color 0.2s',
              opacity: isSubmitting ? 0.7 : 1
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <CheckSquare size={20} />
            {isSubmitting ? 'กำลังส่งข้อมูล...' : 'ปิดงาน (Close Ticket)'}
          </button>
          <p style={{ textAlign: 'center', fontSize: '12px', color: '#3c475a', marginTop: '16px', opacity: 0.8 }}>
            เมื่อกดปุ่มระบบจะบันทึกสถานะงานเป็น 'เสร็จสมบูรณ์' และแจ้งผู้ที่เกี่ยวข้องทราบ
          </p>
        </div>
      </form>

    </div>
  );
}
