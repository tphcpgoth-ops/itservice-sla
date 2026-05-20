import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE } from '../config';
import { 
  ArrowLeft, RefreshCw, AlertTriangle, Clock, 
  ChevronRight, Calendar, User, Search 
} from 'lucide-react';

export default function TaskList() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // all, active, completed
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchTickets();
  }, [token, navigate]);

  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setTickets(data.tickets);
      } else {
        setError(data.error || 'ไม่สามารถดึงข้อมูลรายการได้');
      }
    } catch (err) {
      setError('การเชื่อมต่อเครือข่ายขัดข้อง');
    } finally {
      setLoading(false);
    }
  };

  const isRequester = user.role === 'requester';

  // Filters logic
  const filteredTickets = tickets.filter(ticket => {
    // 1. Tab filter
    if (activeTab === 'active') {
      if (ticket.status === 'resolved' || ticket.status === 'closed') return false;
    }
    if (activeTab === 'completed') {
      if (ticket.status !== 'resolved' && ticket.status !== 'closed') return false;
    }

    // 2. Search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const codeMatch = ticket.ticket_code.toLowerCase().includes(query);
      const titleMatch = ticket.title.toLowerCase().includes(query);
      const categoryMatch = ticket.category.toLowerCase().includes(query);
      const deptMatch = ticket.requester_dept.toLowerCase().includes(query);
      const requesterMatch = ticket.requester_name.toLowerCase().includes(query);
      return codeMatch || titleMatch || categoryMatch || deptMatch || requesterMatch;
    }

    return true;
  });

  // Calculate remaining time for SLA
  const getSlaInfo = (deadlineStr, status) => {
    if (status === 'resolved' || status === 'closed') {
      return { text: 'เสร็จงานเรียบร้อย', color: 'var(--status-resolved)' };
    }

    const deadline = new Date(deadlineStr);
    const now = new Date();
    const diffMs = deadline - now;
    const diffMins = Math.round(diffMs / 60000);

    if (diffMins < 0) {
      return { text: `SLA เกินกำหนด: ${Math.abs(diffMins)} นาที`, color: 'var(--status-pending)' };
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return { 
        text: `เวลา SLA เหลือ: ${hours > 0 ? `${hours} ชม. ` : ''}${mins} นาที`, 
        color: diffMins < 60 ? 'var(--status-progress)' : 'var(--primary)' 
      };
    }
  };

  return (
    <div style={{ padding: '16px' }} className="animated-fade">
      
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => navigate('/')} 
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', color: 'var(--on-background)' }}
          >
            <ArrowLeft size={20} />
          </button>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--on-background)' }}>
            {isRequester ? `ประวัติงานซ่อม (แผนก ${user.department})` : 'รายการคิวงานไอทีทั้งหมด'}
          </h2>
        </div>
        <button 
          onClick={fetchTickets}
          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', color: 'var(--primary)' }}
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Search Input Bar */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--outline)' }} />
        <input 
          type="text" 
          placeholder="ค้นหารหัสใบงาน, ชื่อแผนก, ปัญหา, ผู้แจ้ง..."
          className="form-control"
          style={{ paddingLeft: '38px', width: '100%', margin: 0 }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Tabs list selector */}
      <div style={{
        display: 'flex',
        backgroundColor: 'var(--surface-low)',
        borderRadius: 'var(--radius-md)',
        padding: '4px',
        marginBottom: '16px'
      }}>
        <button 
          onClick={() => setActiveTab('all')}
          style={{
            flexGrow: 1,
            border: 'none',
            padding: '8px',
            fontSize: '13px',
            fontWeight: '600',
            borderRadius: '6px',
            cursor: 'pointer',
            backgroundColor: activeTab === 'all' ? 'white' : 'transparent',
            color: activeTab === 'all' ? 'var(--primary)' : 'var(--on-surface-variant)',
            boxShadow: activeTab === 'all' ? '0 1px 4px rgba(0,0,0,0.05)' : 'none'
          }}
        >
          ทั้งหมด ({tickets.length})
        </button>
        <button 
          onClick={() => setActiveTab('active')}
          style={{
            flexGrow: 1,
            border: 'none',
            padding: '8px',
            fontSize: '13px',
            fontWeight: '600',
            borderRadius: '6px',
            cursor: 'pointer',
            backgroundColor: activeTab === 'active' ? 'white' : 'transparent',
            color: activeTab === 'active' ? 'var(--primary)' : 'var(--on-surface-variant)',
            boxShadow: activeTab === 'active' ? '0 1px 4px rgba(0,0,0,0.05)' : 'none'
          }}
        >
          กำลังทำ ({tickets.filter(t => t.status !== 'resolved' && t.status !== 'closed').length})
        </button>
        <button 
          onClick={() => setActiveTab('completed')}
          style={{
            flexGrow: 1,
            border: 'none',
            padding: '8px',
            fontSize: '13px',
            fontWeight: '600',
            borderRadius: '6px',
            cursor: 'pointer',
            backgroundColor: activeTab === 'completed' ? 'white' : 'transparent',
            color: activeTab === 'completed' ? 'var(--primary)' : 'var(--on-surface-variant)',
            boxShadow: activeTab === 'completed' ? '0 1px 4px rgba(0,0,0,0.05)' : 'none'
          }}
        >
          สำเร็จเสร็จสิ้น ({tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length})
        </button>
      </div>

      {/* Render Tickets Queue */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <RefreshCw className="animate-spin" size={24} style={{ color: 'var(--primary)', animation: 'spin 1.5s linear infinite' }} />
        </div>
      ) : error ? (
        <div className="card" style={{ color: 'var(--status-pending)', backgroundColor: 'var(--status-pending-bg)' }}>
          {error}
        </div>
      ) : filteredTickets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--on-surface-variant)' }}>
          <AlertTriangle size={32} style={{ color: 'var(--outline)', marginBottom: '8px' }} />
          <p style={{ fontSize: '14px' }}>ไม่พบรายการใบแจ้งซ่อมในระบบ</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {filteredTickets.map((ticket) => {
            const slaInfo = getSlaInfo(ticket.sla_deadline, ticket.status);
            return (
              <Link 
                key={ticket.id} 
                to={`/ticket/${ticket.id}`}
                className="card"
                style={{
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px',
                  background: 'white'
                }}
              >
                <div style={{ flexGrow: 1, paddingRight: '12px' }}>
                  
                  {/* Top line: Code and Status badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--outline)' }}>
                      {ticket.ticket_code}
                    </span>
                    <span className={`badge badge-${ticket.status}`}>
                      {ticket.status === 'pending' ? 'รอดำเนินการ' :
                       ticket.status === 'assigned' ? 'ช่างรับงาน' :
                       ticket.status === 'in_progress' ? 'กำลังซ่อม' :
                       ticket.status === 'resolved' ? 'ซ่อมเสร็จแล้ว' : 'ปิดตั๋วรีวิวแล้ว'}
                    </span>
                    
                    {/* Priority Badge */}
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      color: ticket.priority === 'critical' ? 'var(--status-pending)' :
                             ticket.priority === 'high' ? 'var(--status-progress)' : 'var(--outline)',
                      backgroundColor: 'var(--surface-low)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      textTransform: 'uppercase'
                    }}>
                      {ticket.priority}
                    </span>

                    {/* Image Attachment indicator badge */}
                    {ticket.image_url && (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        color: 'var(--primary)',
                        backgroundColor: 'var(--primary-light)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}>
                        📷 มีรูปแนบ
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--on-surface)', marginBottom: '4px' }}>
                    {ticket.title}
                  </h4>

                  {/* Location & Requester */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '11px', color: 'var(--on-surface-variant)', marginBottom: '6px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <User size={12} />
                      {ticket.requester_name} ({ticket.requester_dept})
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Calendar size={12} />
                      {new Date(ticket.created_at).toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* SLA Bar Indicator */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '600', color: slaInfo.color }}>
                    <Clock size={12} />
                    <span>{slaInfo.text}</span>
                  </div>

                </div>

                {/* Right Arrow indicator */}
                <ChevronRight size={18} style={{ color: 'var(--outline-light)', flexShrink: 0 }} />
              </Link>
            );
          })}
        </div>
      )}

    </div>
  );
}
