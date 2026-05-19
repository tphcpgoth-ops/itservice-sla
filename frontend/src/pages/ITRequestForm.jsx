import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';
import { Clipboard, ShieldAlert, ArrowLeft, Send, CheckCircle } from 'lucide-react';

export default function ITRequestForm() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Hardware',
    priority: 'medium'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const categories = [
    { value: 'Hardware', label: 'ฮาร์ดแวร์ (คอมพิวเตอร์, หน้าจอ, ปริ้นเตอร์)' },
    { value: 'Software', label: 'ซอฟต์แวร์ (ระบบ HOSxP, HosPayroll, Windows)' },
    { value: 'Network', label: 'เครือข่ายอินเทอร์เน็ต (LAN, Wi-Fi)' },
    { value: 'Other', label: 'อื่นๆ' }
  ];

  const priorities = [
    { value: 'low', label: 'ต่ำ (SLA 8 ชม. - เคสทั่วไป)', desc: 'ไม่มีผลกระทบต่อผู้ป่วยหรืองานบริการห้องตรวจ' },
    { value: 'medium', label: 'ปานกลาง (SLA 4 ชม. - งานแผนก)', desc: 'อุปกรณ์บางส่วนเสียหาย แต่มีเครื่องทดแทนทำงานได้' },
    { value: 'high', label: 'สูง (SLA 2 ชม. - บริการตรง)', desc: 'ส่งผลกระทบโดยตรงต่อคิวคนไข้หรือการบริการหลัก' },
    { value: 'critical', label: 'วิกฤต (SLA 1 ชม. - ระบบล่ม)', desc: 'ระบบโรงพยาบาลล่ม หรือเครื่องแพทย์ขัดข้องเร่งด่วนที่สุด!' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      setError('กรุณากรอกหัวข้อปัญหาและรายละเอียดอาการเสีย');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(data);
        setTimeout(() => {
          navigate(`/ticket/${data.ticketId}`);
        }, 2000);
      } else {
        setError(data.error || 'เกิดข้อผิดพลาดในการบันทึกใบแจ้งซ่อม');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center', alignItems: 'center', textAlign: 'center' }} className="animated-fade">
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          backgroundColor: 'var(--status-resolved-bg)',
          color: 'var(--status-resolved)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px'
        }}>
          <CheckCircle size={40} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--on-background)', marginBottom: '8px' }}>
          บันทึกแจ้งซ่อมสำเร็จ!
        </h2>
        <p style={{ color: 'var(--on-surface-variant)', fontSize: '14px', marginBottom: '24px' }}>
          รหัสตั๋วของคุณคือ: <strong>{success.ticketCode}</strong> <br />
          ระบบส่งแจ้งเตือน Flex Message ไปทางแชทไลน์ของคุณแล้ว
        </p>
        <span style={{ fontSize: '12px', color: 'var(--outline)' }}>
          กำลังนำคุณไปที่หน้าประวัติไทม์ไลน์ความคืบหน้าการซ่อม...
        </span>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px' }} className="animated-fade">
      
      {/* Header Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
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
        <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--on-background)' }}>
          แบบฟอร์มแจ้งซ่อมไอที
        </h2>
      </div>

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: 'var(--status-pending-bg)',
          color: 'var(--status-pending)',
          borderRadius: 'var(--radius-md)',
          fontSize: '13px',
          marginBottom: '16px'
        }}>
          {error}
        </div>
      )}

      {/* Main Request Form */}
      <form onSubmit={handleSubmit} className="card" style={{ background: 'white', margin: 0 }}>
        
        {/* Category select */}
        <div className="form-group">
          <label className="form-label">หมวดหมู่อุปกรณ์ / ระบบ</label>
          <select 
            className="form-control"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div className="form-group">
          <label className="form-label">หัวข้อปัญหา (ย่อสั้นๆ)</label>
          <input 
            type="text" 
            className="form-control"
            placeholder="เช่น ปริ้นเตอร์ไม่ออก, เข้าเว็บระบบโรงพยาบาลไม่ได้"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            maxLength={100}
            required
          />
        </div>

        {/* Description */}
        <div className="form-group">
          <label className="form-label">อาการเสีย / รายละเอียดข้อมูลอุปกรณ์</label>
          <textarea 
            className="form-control"
            style={{ minHeight: '100px', resize: 'vertical' }}
            placeholder="โปรดอธิบายรายละเอียด เช่น หมายเลขสินทรัพย์ รหัสเครื่องแพทย์ จุดพิกัดเคาน์เตอร์ และพฤติกรรมของปัญหา..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
          ></textarea>
        </div>

        {/* Priorities radio list */}
        <div className="form-group" style={{ marginBottom: '24px' }}>
          <label className="form-label">ระดับความเร่งด่วนตามเงื่อนไข SLA</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
            {priorities.map((p) => (
              <label 
                key={p.value} 
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: formData.priority === p.value ? '2px solid var(--primary)' : '1px solid var(--outline-light)',
                  backgroundColor: formData.priority === p.value ? 'var(--primary-light)' : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <input 
                  type="radio" 
                  name="priority" 
                  value={p.value}
                  checked={formData.priority === p.value}
                  onChange={() => setFormData({ ...formData, priority: p.value })}
                  style={{ marginTop: '3px' }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: formData.priority === p.value ? 'var(--primary)' : 'var(--on-surface)' }}>
                    {p.label}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>
                    {p.desc}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button 
          type="submit" 
          disabled={isLoading}
          className="btn btn-primary btn-block"
          style={{ padding: '14px', fontSize: '15px' }}
        >
          <Send size={16} />
          {isLoading ? 'กำลังส่งข้อมูล...' : 'ส่งใบงานซ่อมบำรุง'}
        </button>

      </form>

    </div>
  );
}
