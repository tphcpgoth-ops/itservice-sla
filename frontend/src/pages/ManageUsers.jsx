import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { 
  ArrowLeft, Users, Pencil, Trash2, Save, X, 
  RefreshCw, AlertCircle, CheckCircle2, Shield, User as UserIcon, Wrench, Search
} from 'lucide-react';

export default function ManageUsers() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [editingId, setEditingId] = useState(null);
  const [editingRole, setEditingRole] = useState('');
  const [editingDept, setEditingDept] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    if (currentUser.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchData();
  }, [token, navigate]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, deptsRes] = await Promise.all([
        fetch(`${API_BASE}/users`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/departments`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const usersData = await usersRes.json();
      const deptsData = await deptsRes.json();
      
      if (usersRes.ok && usersData.success) {
        setUsers(usersData.users);
      } else {
        setError(usersData.error || 'ไม่สามารถดึงข้อมูลผู้ใช้ได้');
      }

      if (deptsRes.ok && deptsData.success) {
        setDepartments(deptsData.departments);
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (u) => {
    setEditingId(u.id);
    setEditingRole(u.role);
    setEditingDept(u.department);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async (id) => {
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`${API_BASE}/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: editingRole, department: editingDept })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('แก้ไขข้อมูลสิทธิ์และแผนกสำเร็จ');
        setEditingId(null);
        fetchData();
      } else {
        setError(data.error || 'ไม่สามารถบันทึกข้อมูลได้');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (id === currentUser.id) {
      setError('ไม่สามารถลบบัญชีของตนเองได้');
      return;
    }

    if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะลบผู้ใช้งาน "${name}"?\nการลบอาจล้มเหลวหากผู้ใช้นี้มีประวัติการแจ้งซ่อมหรือปฏิบัติงานในระบบแล้ว (ในกรณีนั้นระบบจะแสดง Error แนะนำให้เปลี่ยนสิทธิ์แทน)`)) {
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`${API_BASE}/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('ลบผู้ใช้งานเรียบร้อยแล้ว');
        fetchData();
      } else {
        setError(data.error || 'ไม่สามารถลบผู้ใช้งานได้');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.display_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    u.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadge = (role) => {
    if (role === 'admin') return <span style={{ backgroundColor: '#fee2e2', color: '#ef4444', padding: '4px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}><Shield size={10}/> ผู้ดูแลระบบ</span>;
    if (role === 'technician') return <span style={{ backgroundColor: '#e0f2fe', color: '#0ea5e9', padding: '4px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}><Wrench size={10}/> ช่างไอที</span>;
    return <span style={{ backgroundColor: '#f1f5f9', color: '#64748b', padding: '4px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}><UserIcon size={10}/> ผู้ใช้งานทั่วไป</span>;
  };

  return (
    <div style={{ padding: '16px' }} className="animated-fade">
      
      {/* Header Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => navigate('/')} 
            style={{ 
              border: 'none', 
              background: 'none', 
              cursor: 'pointer',
              padding: '4px',
              color: 'var(--on-background)'
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--on-background)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={22} style={{ color: 'var(--primary)' }} />
            จัดการสมาชิก (Users)
          </h2>
        </div>
      </div>

      {/* Success / Error Messages */}
      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: 'var(--status-pending-bg)',
          color: 'var(--status-pending)',
          borderRadius: 'var(--radius-md)',
          fontSize: '13px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div style={{
          padding: '12px',
          backgroundColor: 'var(--status-resolved-bg)',
          color: 'var(--status-resolved)',
          borderRadius: 'var(--radius-md)',
          fontSize: '13px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Search and Stats Card */}
      <div className="card" style={{ background: 'white', marginBottom: '20px', padding: '16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--on-surface)', margin: 0 }}>
            ค้นหาและจัดการสิทธิ์
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--outline)', fontWeight: '600' }}>
            ทั้งหมด {users.length} คน
          </span>
        </div>
        
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--outline)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="ค้นหาชื่อ, แผนก, อีเมล..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '36px', width: '100%', margin: 0 }}
          />
        </div>
      </div>

      {/* Users List */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 4px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--on-surface)', margin: 0 }}>
          รายชื่อผู้ใช้งาน
        </h3>
        <button
          onClick={fetchData}
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--primary)', padding: '4px' }}
          title="รีเฟรช"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 0' }}>
          <RefreshCw className="animate-spin" size={24} style={{ color: 'var(--primary)', animation: 'spin 1.5s linear infinite' }} />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: 'white', borderRadius: 'var(--radius-lg)', color: 'var(--outline)', fontSize: '13px' }}>
          ไม่พบข้อมูลผู้ใช้งานที่ตรงกับการค้นหา
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredUsers.map((u) => {
            const isEditing = editingId === u.id;
            
            return (
              <div 
                key={u.id} 
                style={{
                  backgroundColor: isEditing ? 'var(--primary-light)' : 'white',
                  borderRadius: 'var(--radius-lg)',
                  border: isEditing ? '1px solid var(--primary)' : '1px solid var(--outline-light)',
                  padding: '14px',
                  boxShadow: isEditing ? '0 4px 12px rgba(0, 88, 188, 0.08)' : '0 1px 3px rgba(0,0,0,0.02)',
                  transition: 'all 0.2s'
                }}
              >
                {isEditing ? (
                  // Edit Mode
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img 
                        src={u.picture_url || 'https://via.placeholder.com/40'} 
                        alt="Profile" 
                        style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                      />
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: '700', display: 'block', color: 'var(--on-surface)' }}>{u.display_name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--outline)', display: 'block' }}>{u.email || 'ไม่มีอีเมล'}</span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--primary)', marginBottom: '4px', display: 'block' }}>กำหนดสิทธิ์ผู้ใช้งาน (Role)</label>
                        <select
                          className="form-control"
                          value={editingRole}
                          onChange={(e) => setEditingRole(e.target.value)}
                          disabled={actionLoading}
                          style={{ padding: '8px', fontSize: '13px', margin: 0, width: '100%' }}
                        >
                          <option value="requester">ผู้ใช้งานทั่วไป (Requester)</option>
                          <option value="technician">ช่างซ่อมไอที (Technician)</option>
                          <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                        </select>
                      </div>
                      
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--primary)', marginBottom: '4px', display: 'block' }}>สังกัดแผนก (Department)</label>
                        <select
                          className="form-control"
                          value={editingDept}
                          onChange={(e) => setEditingDept(e.target.value)}
                          disabled={actionLoading}
                          style={{ padding: '8px', fontSize: '13px', margin: 0, width: '100%' }}
                        >
                          {departments.map(dept => (
                            <option key={dept.id} value={dept.name}>{dept.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button
                        onClick={() => handleSaveEdit(u.id)}
                        disabled={actionLoading}
                        className="btn btn-primary"
                        style={{ flexGrow: 1, padding: '8px', height: 'auto', fontSize: '13px' }}
                      >
                        <Save size={14} /> บันทึก
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={actionLoading}
                        className="btn btn-secondary"
                        style={{ padding: '8px', height: 'auto', fontSize: '13px' }}
                      >
                        <X size={14} /> ยกเลิก
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexGrow: 1, maxWidth: 'calc(100% - 60px)' }}>
                        <img 
                          src={u.picture_url || 'https://via.placeholder.com/48'} 
                          alt="Profile" 
                          style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--outline-light)', flexShrink: 0 }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                              {u.display_name}
                            </span>
                            {getRoleBadge(u.role)}
                          </div>
                          <span style={{ fontSize: '12px', color: 'var(--outline)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                            {u.department} {u.email ? `• ${u.email}` : ''}
                          </span>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                        <button
                          onClick={() => handleStartEdit(u)}
                          disabled={actionLoading}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--primary)', padding: '6px' }}
                          title="แก้ไขสิทธิ์"
                        >
                          <Pencil size={16} />
                        </button>
                        
                        {u.id !== currentUser.id && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.display_name)}
                            disabled={actionLoading}
                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--status-pending)', padding: '6px' }}
                            title="ลบผู้ใช้"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
