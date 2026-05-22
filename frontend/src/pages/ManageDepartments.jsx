import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { 
  ArrowLeft, PlusCircle, Pencil, Trash2, Save, X, 
  Building2, RefreshCw, AlertCircle, CheckCircle2 
} from 'lucide-react';

export default function ManageDepartments() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form states
  const [newDeptName, setNewDeptName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    // Only admins should access this page
    if (!token) {
      navigate('/login');
      return;
    }
    if (user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchDepartments();
  }, [token, navigate]);

  const fetchDepartments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/departments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDepartments(data.departments);
      } else {
        setError(data.error || 'ไม่สามารถดึงข้อมูลแผนกได้');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;

    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`${API_BASE}/departments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newDeptName.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`เพิ่มแผนก "${data.name}" เรียบร้อยแล้ว`);
        setNewDeptName('');
        fetchDepartments();
      } else {
        setError(data.error || 'ไม่สามารถเพิ่มแผนกได้');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartEdit = (dept) => {
    setEditingId(dept.id);
    setEditingName(dept.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleSaveEdit = async (id) => {
    if (!editingName.trim()) return;

    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`${API_BASE}/departments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: editingName.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`แก้ไขข้อมูลแผนกสำเร็จ`);
        setEditingId(null);
        setEditingName('');
        fetchDepartments();
      } else {
        setError(data.error || 'ไม่สามารถแก้ไขแผนกได้');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteDepartment = async (id, name) => {
    if (name === 'ทั่วไป' || name === 'ศูนย์คอมพิวเตอร์') {
      setError('ไม่สามารถลบแผนกพื้นฐานของระบบได้');
      return;
    }

    if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะลบแผนก "${name}"?\nการลบแผนกอาจส่งผลต่อการเชื่อมโยงข้อมูลของผู้ใช้งาน`)) {
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`${API_BASE}/departments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`ลบแผนกเรียบร้อยแล้ว`);
        fetchDepartments();
      } else {
        setError(data.error || 'ไม่สามารถลบแผนกได้');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ padding: '16px' }} className="animated-fade">
      
      {/* Header Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyBehavior: 'space-between', marginBottom: '20px' }}>
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
            <Building2 size={22} style={{ color: 'var(--primary)' }} />
            จัดการแผนกภายในระบบ
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

      {/* Add Department Form Card */}
      <div className="card" style={{ background: 'white', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--on-surface)', marginBottom: '12px' }}>
          เพิ่มแผนก / แผนกใหม่ในโรงพยาบาล
        </h3>
        
        <form onSubmit={handleAddDepartment} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="เช่น ฝ่ายการพยาบาล, แผนกรังสีวิทยา"
            value={newDeptName}
            onChange={(e) => setNewDeptName(e.target.value)}
            disabled={actionLoading}
            style={{ margin: 0, flexGrow: 1 }}
            required
          />
          <button
            type="submit"
            disabled={actionLoading || !newDeptName.trim()}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', padding: '0 16px' }}
          >
            <PlusCircle size={16} />
            เพิ่มแผนก
          </button>
        </form>
      </div>

      {/* Departments List Card */}
      <div className="card" style={{ background: 'white', padding: '16px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '0 4px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--on-surface)', margin: 0 }}>
            รายชื่อแผนกทั้งหมดในฐานข้อมูล ({departments.length} แผนก)
          </h3>
          
          <button
            onClick={fetchDepartments}
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
        ) : departments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--outline)', fontSize: '13px' }}>
            ไม่พบแผนกในระบบ
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {departments.map((dept) => {
              const isEditing = editingId === dept.id;
              const isSystemDept = dept.name === 'ทั่วไป' || dept.name === 'ศูนย์คอมพิวเตอร์';

              return (
                <div 
                  key={dept.id} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--outline-light)',
                    backgroundColor: isEditing ? 'var(--primary-light)' : 'white',
                    transition: 'all 0.2s'
                  }}
                >
                  {isEditing ? (
                    <div style={{ display: 'flex', flexGrow: 1, gap: '10px', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-control"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        style={{ margin: 0, padding: '4px 8px', fontSize: '13px', flexGrow: 1 }}
                        disabled={actionLoading}
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit(dept.id)}
                        disabled={actionLoading || !editingName.trim()}
                        style={{
                          border: 'none',
                          backgroundColor: 'var(--status-resolved)',
                          color: 'white',
                          borderRadius: '4px',
                          padding: '6px 10px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}
                      >
                        <Save size={14} />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={actionLoading}
                        style={{
                          border: 'none',
                          backgroundColor: 'var(--outline)',
                          color: 'white',
                          borderRadius: '4px',
                          padding: '6px 10px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: isSystemDept ? 'var(--primary)' : 'var(--outline)'
                        }}></div>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--on-surface)' }}>
                          {dept.name}
                        </span>
                        {isSystemDept && (
                          <span style={{ fontSize: '9px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                            ระบบ
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleStartEdit(dept)}
                          disabled={actionLoading}
                          style={{
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            color: 'var(--primary)',
                            padding: '4px'
                          }}
                          title="แก้ไขชื่อแผนก"
                        >
                          <Pencil size={15} />
                        </button>
                        
                        {!isSystemDept && (
                          <button
                            onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                            disabled={actionLoading}
                            style={{
                              border: 'none',
                              background: 'none',
                              cursor: 'pointer',
                              color: 'var(--status-pending)',
                              padding: '4px'
                            }}
                            title="ลบแผนก"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
