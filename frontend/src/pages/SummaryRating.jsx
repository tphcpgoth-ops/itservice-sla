import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { ArrowLeft, RefreshCw, Star, Heart, MessageSquare, Send } from 'lucide-react';

export default function SummaryRating() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

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

  return (
    <div style={{ padding: '16px' }} className="animated-fade">
      
      {/* Header Nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button 
          onClick={() => navigate(`/ticket/${id}`)} 
          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', color: 'var(--on-background)' }}
        >
          <ArrowLeft size={20} />
        </button>
        <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--on-background)' }}>
          แบบประเมินผู้ใช้และปิดตั๋ว
        </h2>
      </div>

      {/* Ticket Details Summary Info */}
      <div className="card" style={{ background: 'white', marginBottom: '20px' }}>
        <span style={{ fontSize: '11px', color: 'var(--outline)', fontWeight: '600' }}>สรุปประวัติงานซ่อม:</span>
        <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--on-surface)', marginTop: '4px', marginBottom: '4px' }}>
          [{ticket.ticket_code}] {ticket.title}
        </h4>
        <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>
          ช่างไอทีผู้แก้ไข: <strong>{ticket.technician_name || '-'}</strong>
        </div>
      </div>

      {/* Main Review Form Card */}
      <form onSubmit={handleRatingSubmit} className="card" style={{ background: 'white', margin: 0, textAlign: 'center', padding: '24px 16px' }}>
        
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#ffebee',
          color: '#e53935',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px'
        }}>
          <Heart size={30} fill="#e53935" />
        </div>

        <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--on-surface)', marginBottom: '8px' }}>
          ความพึงพอใจการให้บริการไอที
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginBottom: '20px' }}>
          ความเห็นและการประเมินดาวของคุณมีส่วนสำคัญอย่างยิ่งในการรักษาและรับรองความพร้อมใช้งานของระบบ SLA
        </p>

        {/* Stars Selector UI */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: (hoverRating || rating) >= star ? '#FFC107' : 'var(--outline-light)',
                transition: 'transform 0.1s'
              }}
            >
              <Star size={36} fill={(hoverRating || rating) >= star ? '#FFC107' : 'none'} strokeWidth={2} />
            </button>
          ))}
        </div>

        {/* Rating text description */}
        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary)', marginBottom: '24px' }}>
          {rating === 5 ? '⭐ ยอดเยี่ยมที่สุด (SLA ดีเลิศ)' :
           rating === 4 ? '⭐ ดีมาก (ประทับใจการบริการ)' :
           rating === 3 ? '⭐ ปานกลาง (แก้ไขได้ตามกำหนด)' :
           rating === 2 ? '⭐ พอใช้ (ชล่าช้าหรือซ่อมแล้วยังมีจุดติด)' : '⭐ ปรับปรุงด่วน (เกินเวลา SLA มาก / ซ่อมไม่สำเร็จ)'}
        </div>

        {/* Feedback text area */}
        <div className="form-group" style={{ textAlign: 'left', marginBottom: '24px' }}>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MessageSquare size={14} />
            ความคิดเห็น / คำแนะนำเพิ่มเติม
          </label>
          <textarea
            className="form-control"
            style={{ minHeight: '80px' }}
            placeholder="ข้อความเพิ่มเติมที่จะส่งเป็นคำขอบคุณ หรือแนะแนวช่าง..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          ></textarea>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary btn-block"
          style={{ padding: '14px', backgroundColor: 'var(--status-resolved)' }}
        >
          <Send size={16} />
          {isSubmitting ? 'กำลังส่งแบบประเมิน...' : 'ส่งและปิดใบแจ้งซ่อมสำเร็จ'}
        </button>

      </form>

    </div>
  );
}
