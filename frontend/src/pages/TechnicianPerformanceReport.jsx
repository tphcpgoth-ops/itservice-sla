import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE } from '../config';
import { 
  ArrowLeft, Clock, Calendar, CheckCircle2, AlertCircle, 
  Users, Wrench, Printer, Download, Search, RefreshCw, 
  Star, Shield, Award, ChevronDown, ChevronUp, ExternalLink, 
  Activity, Briefcase, Sun, Sunset, Moon, Sparkles, Filter
} from 'lucide-react';

export default function TechnicianPerformanceReport() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);

  // Filters
  const [selectedTech, setSelectedTech] = useState('all');
  const [datePreset, setDatePreset] = useState('all'); // all, today, 7days, 30days, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all'); // all, morning, afternoon, evening, night
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDays, setExpandedDays] = useState({});

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchReport();
  }, [token, selectedTech, datePreset, startDate, endDate]);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedTech && selectedTech !== 'all') {
        params.append('technician_id', selectedTech);
      }

      // Calculate date filters based on preset
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
      if (datePreset === 'today') {
        params.append('start_date', today);
        params.append('end_date', today);
      } else if (datePreset === '7days') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        const sevenDaysAgo = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
        params.append('start_date', sevenDaysAgo);
        params.append('end_date', today);
      } else if (datePreset === '30days') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        const thirtyDaysAgo = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
        params.append('start_date', thirtyDaysAgo);
        params.append('end_date', today);
      } else if (datePreset === 'custom') {
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
      }

      const res = await fetch(`${API_BASE}/reports/technician-performance?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setReportData(data);
        // Default expand first 3 days
        if (data.dailyReport) {
          const initExp = {};
          data.dailyReport.slice(0, 3).forEach(d => {
            initExp[d.groupKey] = true;
          });
          setExpandedDays(initExp);
        }
      } else {
        setError(data.error || 'ไม่สามารถดึงข้อมูลรายงานได้');
      }
    } catch (err) {
      console.error(err);
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  const toggleDayExpand = (groupKey) => {
    setExpandedDays(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const toggleAllExpand = (expand) => {
    if (!reportData?.dailyReport) return;
    const nextState = {};
    reportData.dailyReport.forEach(d => {
      nextState[d.groupKey] = expand;
    });
    setExpandedDays(nextState);
  };

  // Filter daily report by search query and period filter
  const filteredDailyReports = useMemo(() => {
    if (!reportData?.dailyReport) return [];
    return reportData.dailyReport.map(day => {
      const filteredTasks = day.tasks.filter(task => {
        // Search query match
        const matchesSearch = !searchQuery || 
          task.ticketCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.requesterDept.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.requesterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (task.note && task.note.toLowerCase().includes(searchQuery.toLowerCase()));

        // Period filter match
        let matchesPeriod = true;
        if (periodFilter === 'morning') matchesPeriod = task.periodCategory.includes('เวรเช้า');
        else if (periodFilter === 'afternoon') matchesPeriod = task.periodCategory.includes('เวรบ่าย');
        else if (periodFilter === 'night') matchesPeriod = task.periodCategory.includes('เวรดึก');

        return matchesSearch && matchesPeriod;
      });

      return {
        ...day,
        filteredTasks
      };
    }).filter(day => day.filteredTasks.length > 0);
  }, [reportData, searchQuery, periodFilter]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!reportData?.dailyReport) return;
    
    const headers = [
      'วันที่',
      'ช่างผู้ปฏิบัติงาน',
      'แผนกช่าง',
      'รหัสงาน',
      'หัวข้องานแจ้งซ่อม',
      'หมวดหมู่',
      'ความเร่งด่วน',
      'แผนกผู้แจ้ง',
      'ผู้แจ้ง',
      'สถานะ',
      'ช่วงเวลาปฏิบัติงาน',
      'เวลาเริ่ม',
      'เวลาสิ้นสุด',
      'ระยะเวลา (นาที)',
      'ช่วงเวลากะ/เวร',
      'ผล SLA',
      'บันทึกการแก้ไข / หมายเหตุ',
      'คะแนนประเมิน'
    ];

    const rows = [];
    filteredDailyReports.forEach(day => {
      day.filteredTasks.forEach(task => {
        rows.push([
          `"${day.thaiDate}"`,
          `"${day.technicianName}"`,
          `"${day.technicianDept || '-'}"`,
          `"${task.ticketCode}"`,
          `"${(task.title || '').replace(/"/g, '""')}"`,
          `"${task.category}"`,
          `"${task.priority}"`,
          `"${task.requesterDept || '-'}"`,
          `"${task.requesterName || '-'}"`,
          `"${task.status}"`,
          `"${task.timeSlotThai}"`,
          `"${task.workStartTime ? new Date(task.workStartTime).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' }) : '-'}"`,
          `"${task.workEndTime ? new Date(task.workEndTime).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' }) : 'กำลังทำ'}"`,
          task.durationMinutes != null ? task.durationMinutes : '-',
          `"${task.periodCategory}"`,
          `"${task.slaMet ? 'ผ่านตาม SLA' : 'เกินกำหนด SLA'}"`,
          `"${(task.note || '-').replace(/"/g, '""')}"`,
          task.rating ? task.rating : '-'
        ]);
      });
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `technician_performance_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="report-container" style={{ padding: '16px', paddingBottom: '90px', maxWidth: '100%', margin: '0 auto', minHeight: '80vh' }}>
      
      {/* 1. Header Navigation Bar */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            onClick={() => navigate('/')} 
            className="btn btn-secondary"
            style={{ 
              width: '38px', 
              height: '38px', 
              padding: 0, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRadius: 'var(--radius-md)'
            }}
            title="กลับสู่กระดานหลัก"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--on-surface)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Briefcase size={20} style={{ color: 'var(--primary)' }} />
              รายงานผลการปฏิบัติงานช่างไอที
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--outline)', margin: '2px 0 0 0' }}>
              สรุปเวลาปฏิบัติงาน จำนวนงาน และช่วงเวลาให้บริการรายวัน
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={fetchReport} 
            disabled={loading}
            className="btn btn-secondary" 
            style={{ height: '36px', padding: '0 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span style={{ display: 'none', md: 'inline' }}>รีเฟรช</span>
          </button>
          <button 
            onClick={handleExportCSV} 
            disabled={loading || !reportData}
            className="btn btn-secondary" 
            style={{ height: '36px', padding: '0 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0' }}
            title="ดาวน์โหลดเป็นไฟล์ Excel/CSV"
          >
            <Download size={14} />
            <span>Excel / CSV</span>
          </button>
          <button 
            onClick={handlePrint} 
            disabled={loading || !reportData}
            className="btn btn-primary" 
            style={{ height: '36px', padding: '0 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="พิมพ์รายงานสรุปผลการปฏิบัติงาน"
          >
            <Printer size={14} />
            <span>พิมพ์รายงาน</span>
          </button>
        </div>
      </div>

      {/* Official Hospital Header for Print Only */}
      <div className="print-only" style={{ display: 'none', textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: '14px', marginBottom: '18px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 4px 0' }}>โรงพยาบาลสมเด็จพระยุพราชตะพานหิน</h2>
        <h3 style={{ fontSize: '15px', fontWeight: '600', margin: '0 0 4px 0' }}>ฝ่ายเทคโนโลยีสารสนเทศและศูนย์คอมพิวเตอร์</h3>
        <p style={{ fontSize: '13px', margin: 0 }}>
          รายงานสรุปผลการปฏิบัติงาน เวลาปฏิบัติงาน และช่วงเวลาการให้บริการของช่างคอมพิวเตอร์
        </p>
        <p style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>
          ข้อมูล ณ วันที่ {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} น.
        </p>
      </div>

      {/* 2. Filter Controls Card */}
      <div className="card no-print" style={{ padding: '14px', marginBottom: '16px', background: 'white', border: '1px solid var(--outline-light)', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
          <Filter size={15} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--on-surface)' }}>ตัวกรองรายงาน</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          {/* Technician Select */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--outline)', display: 'block', marginBottom: '4px' }}>
              ช่างไอที / ผู้รับผิดชอบ
            </label>
            <select 
              value={selectedTech} 
              onChange={(e) => setSelectedTech(e.target.value)}
              className="form-control"
              style={{ height: '36px', fontSize: '12px', padding: '6px 10px' }}
            >
              <option value="all">👨‍🔧 ช่างไอทีทุกคน (ภาพรวม)</option>
              {reportData?.technicians?.map(t => (
                <option key={t.id} value={t.id}>
                  {t.display_name} ({t.department || (t.role === 'admin' ? 'แอดมิน' : 'ช่างไอที')})
                </option>
              ))}
            </select>
          </div>

          {/* Date Preset */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--outline)', display: 'block', marginBottom: '4px' }}>
              ช่วงวันที่ปฏิบัติงาน
            </label>
            <select 
              value={datePreset} 
              onChange={(e) => setDatePreset(e.target.value)}
              className="form-control"
              style={{ height: '36px', fontSize: '12px', padding: '6px 10px' }}
            >
              <option value="all">📅 ข้อมูลทั้งหมด (All Time)</option>
              <option value="today">☀️ วันนี้ (Today)</option>
              <option value="7days">⚡ 7 วันย้อนหลัง</option>
              <option value="30days">🗓️ 30 วันย้อนหลัง</option>
              <option value="custom">🔍 กำหนดช่วงวันที่เอง...</option>
            </select>
          </div>

          {/* Period Filter (Morning, Afternoon, Evening, Night) */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--outline)', display: 'block', marginBottom: '4px' }}>
              ช่วงเวลาปฏิบัติงาน (กะ/เวร)
            </label>
            <select 
              value={periodFilter} 
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="form-control"
              style={{ height: '36px', fontSize: '12px', padding: '6px 10px' }}
            >
              <option value="all">🕒 ทุกช่วงเวลา (24 ชั่วโมง)</option>
              <option value="morning">🌅 เช้า (08.30-16.30 น.)</option>
              <option value="afternoon">☀️ บ่าย (16.30-00.30 น.)</option>
              <option value="night">🌙 ดึก (00.30-08.30 น.)</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--outline)', display: 'block', marginBottom: '4px' }}>
              ค้นหารหัสงาน / หัวข้อ / แผนก
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text"
                placeholder="เช่น IT-2026..., เข้าเน็ต, OPD"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-control"
                style={{ height: '36px', fontSize: '12px', paddingLeft: '28px' }}
              />
              <Search size={14} style={{ position: 'absolute', left: '9px', top: '11px', color: 'var(--outline)' }} />
            </div>
          </div>
        </div>

        {/* Custom Date Picker row */}
        {datePreset === 'custom' && (
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed var(--outline-light)', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '140px' }}>
              <label style={{ fontSize: '10px', color: 'var(--outline)', display: 'block', marginBottom: '2px' }}>จากวันที่</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                className="form-control"
                style={{ height: '34px', fontSize: '12px' }}
              />
            </div>
            <div style={{ flex: '1', minWidth: '140px' }}>
              <label style={{ fontSize: '10px', color: 'var(--outline)', display: 'block', marginBottom: '2px' }}>ถึงวันที่</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                className="form-control"
                style={{ height: '34px', fontSize: '12px' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div style={{ 
          padding: '12px 14px', 
          backgroundColor: 'var(--status-pending-bg)', 
          color: 'var(--status-pending)', 
          borderRadius: 'var(--radius-md)', 
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--outline)' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px auto', color: 'var(--primary)' }} />
          <p style={{ fontSize: '13px' }}>กำลังประมวลผลข้อมูลการปฏิบัติงานของช่าง...</p>
        </div>
      )}

      {!loading && reportData && (
        <>
          {/* 3. Executive KPI Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '16px' }}>
            
            {/* Total Tasks Card */}
            <div className="card" style={{ padding: '12px', background: 'white', border: '1px solid var(--outline-light)', borderLeft: '4px solid var(--primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--outline)', fontWeight: '600' }}>จำนวนงานทั้งหมด</span>
                <Briefcase size={15} style={{ color: 'var(--primary)' }} />
              </div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--on-surface)' }}>
                {reportData.summary.totalTasks} <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--outline)' }}>งาน</span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--outline)', marginTop: '2px', display: 'flex', gap: '6px' }}>
                <span style={{ color: 'var(--status-resolved)' }}>✓ เสร็จ {reportData.summary.totalCompleted}</span>
                {reportData.summary.totalInProgress > 0 && (
                  <span style={{ color: 'var(--status-progress)' }}>⏳ ค้าง {reportData.summary.totalInProgress}</span>
                )}
              </div>
            </div>

            {/* Total Active Working Time Card */}
            <div className="card" style={{ padding: '12px', background: 'white', border: '1px solid var(--outline-light)', borderLeft: '4px solid #0284c7' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--outline)', fontWeight: '600' }}>รวมเวลาปฏิบัติงาน</span>
                <Clock size={15} style={{ color: '#0284c7' }} />
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--on-surface)' }}>
                {reportData.summary.totalWorkingHoursFormatted}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--outline)', marginTop: '2px' }}>
                เฉลี่ย {reportData.summary.avgMinutesPerTask} นาที/งาน
              </div>
            </div>

            {/* SLA Compliance Rate Card */}
            <div className="card" style={{ padding: '12px', background: 'white', border: '1px solid var(--outline-light)', borderLeft: '4px solid var(--status-resolved)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--outline)', fontWeight: '600' }}>บรรลุ SLA</span>
                <Award size={15} style={{ color: 'var(--status-resolved)' }} />
              </div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: reportData.summary.slaComplianceRate >= 80 ? 'var(--status-resolved)' : 'var(--status-pending)' }}>
                {reportData.summary.slaComplianceRate}%
              </div>
              <div style={{ fontSize: '10px', color: 'var(--outline)', marginTop: '2px' }}>
                ตามข้อตกลง SLA ของรพ.
              </div>
            </div>

            {/* Average Satisfaction Card */}
            <div className="card" style={{ padding: '12px', background: 'white', border: '1px solid var(--outline-light)', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--outline)', fontWeight: '600' }}>ความพึงพอใจ</span>
                <Star size={15} style={{ color: '#f59e0b' }} />
              </div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {reportData.summary.avgRating || '-'} <span style={{ fontSize: '12px', color: '#f59e0b' }}>★</span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--outline)', marginTop: '2px' }}>
                คะแนนเฉลี่ยจากผู้แจ้ง
              </div>
            </div>

          </div>

          {/* Time Slot Shift Summary Badge Ribbon */}
          <div className="card no-print" style={{ padding: '10px 14px', marginBottom: '16px', background: '#fafafa', border: '1px solid var(--outline-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={14} style={{ color: 'var(--primary)' }} />
              การกระจายงานตามช่วงเวลา (เวร/กะ):
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '12px', backgroundColor: '#fef3c7', color: '#92400e', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sun size={12} /> เช้า : {reportData.summary.periodCounts?.morning || 0}
              </span>
              <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '12px', backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sunset size={12} /> บ่าย : {reportData.summary.periodCounts?.afternoon || 0}
              </span>
              <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '12px', backgroundColor: '#fee2e2', color: '#262222ff', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Moon size={12} /> ดึก : {reportData.summary.periodCounts?.night || 0}
              </span>
            </div>
          </div>

          {/* 4. Technician Comparison / Summary Table (When 'All' is selected) */}
          {selectedTech === 'all' && reportData.technicianSummary?.length > 0 && (
            <div className="card no-print" style={{ padding: '14px', marginBottom: '16px', background: 'white', border: '1px solid var(--outline-light)' }}>
              <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--on-surface)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={16} style={{ color: 'var(--primary)' }} />
                สรุปผลงานเปรียบเทียบช่างไอทีแต่ละคน
              </h3>
              
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--outline-light)', color: 'var(--outline)', fontSize: '11px' }}>
                      <th style={{ padding: '8px 10px' }}>ช่างไอที</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>วันที่ลงปฏิบัติงาน</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>จำนวนงานรวม</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>งานที่เสร็จสิ้น</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>รวมเวลาซ่อม</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>SLA %</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>คะแนนเฉลี่ย</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.technicianSummary.map(tech => (
                      <tr key={tech.technicianId} style={{ borderBottom: '1px solid var(--outline-light)' }}>
                        <td style={{ padding: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <img 
                              src={tech.technicianAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} 
                              alt={tech.technicianName} 
                              style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                            <div>
                              <div style={{ fontWeight: '700', color: 'var(--on-surface)' }}>{tech.technicianName}</div>
                              <div style={{ fontSize: '10px', color: 'var(--outline)' }}>{tech.technicianDept || '-'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: '600' }}>{tech.totalActiveDays} วัน</td>
                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: '700', color: 'var(--primary)' }}>{tech.totalTasks} งาน</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <span style={{ color: 'var(--status-resolved)', fontWeight: '600' }}>{tech.completedTasks}</span>
                          {tech.inProgressTasks > 0 && (
                            <span style={{ color: 'var(--status-progress)', fontSize: '10px', marginLeft: '4px' }}>({tech.inProgressTasks} กำลังทำ)</span>
                          )}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: '600' }}>{tech.totalMinutesFormatted}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <span style={{ 
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            fontSize: '11px', 
                            fontWeight: '700',
                            backgroundColor: tech.slaComplianceRate >= 80 ? 'var(--status-resolved-bg)' : 'var(--status-pending-bg)',
                            color: tech.slaComplianceRate >= 80 ? 'var(--status-resolved)' : 'var(--status-pending)'
                          }}>
                            {tech.slaComplianceRate}%
                          </span>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          {tech.avgRating ? (
                            <span style={{ color: '#d97706', fontWeight: '700' }}>{tech.avgRating} ★</span>
                          ) : (
                            <span style={{ color: 'var(--outline)' }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <button 
                            onClick={() => setSelectedTech(String(tech.technicianId))}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '11px', height: '28px' }}
                          >
                            ดูเฉพาะคนนี้
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. Daily Breakdown Section */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={18} style={{ color: 'var(--primary)' }} />
                <h2 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--on-surface)', margin: 0 }}>
                  รายละเอียดผลการปฏิบัติงานแยกรายวัน ({filteredDailyReports.length} วัน)
                </h2>
              </div>
              <div className="no-print" style={{ display: 'flex', gap: '6px' }}>
                <button 
                  onClick={() => toggleAllExpand(true)} 
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                >
                  ขยายทั้งหมด
                </button>
                <span style={{ color: 'var(--outline)' }}>|</span>
                <button 
                  onClick={() => toggleAllExpand(false)} 
                  style={{ background: 'none', border: 'none', color: 'var(--outline)', fontSize: '11px', cursor: 'pointer' }}
                >
                  ย่อทั้งหมด
                </button>
              </div>
            </div>

            {filteredDailyReports.length === 0 ? (
              <div className="card" style={{ padding: '30px', textAlign: 'center', color: 'var(--outline)', background: 'white' }}>
                <AlertCircle size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                <p style={{ fontSize: '14px', fontWeight: '600' }}>ไม่พบข้อมูลผลการปฏิบัติงานในช่วงเวลาที่เลือก</p>
                <p style={{ fontSize: '12px' }}>ลองเปลี่ยนตัวกรองช่างไอที หรือขยายช่วงเวลาการค้นหา</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {filteredDailyReports.map(day => {
                  const isExpanded = expandedDays[day.groupKey] ?? true;

                  return (
                    <div 
                      key={day.groupKey} 
                      className="card day-card"
                      style={{ 
                        background: 'white', 
                        border: '1px solid var(--outline-light)',
                        borderRadius: 'var(--radius-lg)',
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                      }}
                    >
                      {/* Day Header */}
                      <div 
                        onClick={() => toggleDayExpand(day.groupKey)}
                        style={{ 
                          padding: '12px 16px', 
                          backgroundColor: '#f8fafc', 
                          borderBottom: isExpanded ? '1px solid var(--outline-light)' : 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img 
                            src={day.technicianAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} 
                            alt={day.technicianName} 
                            style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                          />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--on-surface)' }}>
                                {day.dayOfWeekThai}ที่ {day.thaiDate}
                              </span>
                              <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary)', backgroundColor: 'var(--primary-light)', padding: '2px 8px', borderRadius: '10px' }}>
                                ช่าง: {day.technicianName}
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--outline)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                              <span>🏢 {day.technicianDept || 'ฝ่ายไอที'}</span>
                              <span>•</span>
                              <span style={{ color: '#0369a1', fontWeight: '600' }}>
                                ⏰ ช่วงเวลาปฏิบัติงาน: {day.workingWindow}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Summary Badges on Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--on-surface)' }}>
                              จำนวน {day.taskCount} งาน
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--outline)' }}>
                              รวมเวลา: <strong style={{ color: '#0284c7' }}>{day.totalMinutesFormatted}</strong>
                            </div>
                          </div>

                          <div className="no-print" style={{ color: 'var(--outline)' }}>
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </div>
                        </div>
                      </div>

                      {/* Day Tasks List & Timeline (Shown when expanded or print) */}
                      {(isExpanded || true) && (
                        <div className="day-content" style={{ display: isExpanded ? 'block' : 'none', padding: '12px 16px' }}>
                          
                          {/* Desktop & Print Table View */}
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                              <thead>
                                <tr style={{ borderBottom: '2px solid var(--outline-light)', color: 'var(--outline)', fontSize: '11px', textAlign: 'left' }}>
                                  <th style={{ padding: '8px 6px', width: '130px' }}>ช่วงเวลาปฏิบัติงาน</th>
                                  <th style={{ padding: '8px 6px', width: '70px', textAlign: 'center' }}>ระยะเวลา</th>
                                  <th style={{ padding: '8px 6px', width: '110px' }}>รหัสงาน</th>
                                  <th style={{ padding: '8px 6px' }}>หัวข้องานแจ้งซ่อม</th>
                                  <th style={{ padding: '8px 6px', width: '100px' }}>แผนกผู้แจ้ง</th>
                                  <th style={{ padding: '8px 6px', width: '85px', textAlign: 'center' }}>สถานะ</th>
                                  <th style={{ padding: '8px 6px', width: '75px', textAlign: 'center' }}>ผล SLA</th>
                                  <th style={{ padding: '8px 6px', width: '150px' }}>บันทึกผลการซ่อม</th>
                                </tr>
                              </thead>
                              <tbody>
                                {day.filteredTasks.map((task, idx) => {
                                  const isResolved = ['resolved', 'closed'].includes(task.status);

                                  return (
                                    <tr 
                                      key={task.ticketId} 
                                      style={{ 
                                        borderBottom: '1px solid var(--outline-light)',
                                        backgroundColor: idx % 2 === 0 ? 'white' : '#fafafa'
                                      }}
                                    >
                                      {/* Time Slot with Shift Indicator */}
                                      <td style={{ padding: '10px 6px', verticalAlign: 'top' }}>
                                        <div style={{ fontWeight: '700', color: isResolved ? '#1e293b' : 'var(--status-progress)', fontSize: '12px' }}>
                                          {task.timeSlotThai}
                                        </div>
                                        <div style={{ marginTop: '3px' }}>
                                          <span style={{ 
                                            fontSize: '10px', 
                                            fontWeight: '600', 
                                            padding: '2px 6px', 
                                            borderRadius: '4px',
                                            backgroundColor: 
                                              task.periodCategory.includes('เช้า') ? '#fef3c7' :
                                              task.periodCategory.includes('บ่าย') ? '#e0f2fe' : '#fee2e2',
                                            color: 
                                              task.periodCategory.includes('เช้า') ? '#92400e' :
                                              task.periodCategory.includes('บ่าย') ? '#0369a1' : '#991b1b'
                                          }}>
                                            {task.periodCategory.split(' ')[0]}
                                          </span>
                                        </div>
                                      </td>

                                      {/* Duration */}
                                      <td style={{ padding: '10px 6px', textAlign: 'center', verticalAlign: 'top' }}>
                                        <span style={{ 
                                          fontSize: '11px', 
                                          fontWeight: '700',
                                          color: isResolved ? '#0284c7' : 'var(--status-progress)',
                                          backgroundColor: isResolved ? '#f0f9ff' : '#fff7ed',
                                          padding: '2px 6px',
                                          borderRadius: '4px'
                                        }}>
                                          {task.durationFormatted}
                                        </span>
                                      </td>

                                      {/* Ticket Code */}
                                      <td style={{ padding: '10px 6px', verticalAlign: 'top' }}>
                                        <Link 
                                          to={`/ticket/${task.ticketId}`}
                                          style={{ fontWeight: '700', color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
                                        >
                                          <span>{task.ticketCode}</span>
                                          <ExternalLink size={10} className="no-print" />
                                        </Link>
                                        <div style={{ fontSize: '10px', color: 'var(--outline)' }}>
                                          {task.category}
                                        </div>
                                      </td>

                                      {/* Title & Priority */}
                                      <td style={{ padding: '10px 6px', verticalAlign: 'top' }}>
                                        <div style={{ fontWeight: '600', color: 'var(--on-surface)' }}>
                                          {task.title}
                                        </div>
                                        {task.rating && (
                                          <div style={{ fontSize: '11px', color: '#d97706', marginTop: '2px' }}>
                                            คะแนน: {task.rating} ★ {task.feedback ? `("${task.feedback}")` : ''}
                                          </div>
                                        )}
                                      </td>

                                      {/* Requester Department */}
                                      <td style={{ padding: '10px 6px', verticalAlign: 'top' }}>
                                        <div style={{ fontWeight: '500', color: 'var(--on-surface)' }}>
                                          {task.requesterDept || '-'}
                                        </div>
                                        <div style={{ fontSize: '10px', color: 'var(--outline)' }}>
                                          {task.requesterName}
                                        </div>
                                      </td>

                                      {/* Status Badge */}
                                      <td style={{ padding: '10px 6px', textAlign: 'center', verticalAlign: 'top' }}>
                                        <span style={{ 
                                          fontSize: '10px', 
                                          fontWeight: '700', 
                                          padding: '3px 6px', 
                                          borderRadius: '4px',
                                          display: 'inline-block',
                                          backgroundColor: 
                                            task.status === 'resolved' ? 'var(--status-resolved-bg)' :
                                            task.status === 'closed' ? 'var(--status-closed-bg)' :
                                            task.status === 'in_progress' ? 'var(--status-progress-bg)' : 'var(--status-assigned-bg)',
                                          color:
                                            task.status === 'resolved' ? 'var(--status-resolved)' :
                                            task.status === 'closed' ? 'var(--status-closed)' :
                                            task.status === 'in_progress' ? 'var(--status-progress)' : 'var(--status-assigned)'
                                        }}>
                                          {task.status === 'resolved' ? 'เสร็จสิ้น' :
                                           task.status === 'closed' ? 'ปิดเคส' :
                                           task.status === 'in_progress' ? 'กำลังทำ' : 'มอบหมาย'}
                                        </span>
                                      </td>

                                      {/* SLA Met */}
                                      <td style={{ padding: '10px 6px', textAlign: 'center', verticalAlign: 'top' }}>
                                        {task.slaMet ? (
                                          <span style={{ color: 'var(--status-resolved)', fontWeight: '700', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                                            <CheckCircle2 size={12} /> ทัน SLA
                                          </span>
                                        ) : (
                                          <span style={{ color: 'var(--status-pending)', fontWeight: '600', fontSize: '11px' }}>
                                            เกินเวลา
                                          </span>
                                        )}
                                      </td>

                                      {/* Resolution Note */}
                                      <td style={{ padding: '10px 6px', verticalAlign: 'top', fontSize: '11px', color: '#475569' }}>
                                        {task.note && task.note !== '-' ? (
                                          <span style={{ fontStyle: 'italic' }}>"{task.note}"</span>
                                        ) : (
                                          <span style={{ color: 'var(--outline)' }}>-</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Official Signatures Section for Printing */}
          <div className="print-only" style={{ display: 'none', marginTop: '40px', paddingTop: '20px', pageBreakInside: 'avoid' }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', fontSize: '13px' }}>
              <div>
                <p style={{ margin: '0 0 50px 0' }}>ลงชื่อ ..............................................................</p>
                <p style={{ fontWeight: 'bold', margin: '0 0 4px 0' }}>({currentUser.display_name || 'ช่างผู้รายงาน'})</p>
                <p style={{ color: '#555', margin: 0 }}>ตำแหน่ง เจ้าหน้าที่เทคโนโลยีสารสนเทศ</p>
              </div>
              <div>
                <p style={{ margin: '0 0 50px 0' }}>ลงชื่อ ..............................................................</p>
                <p style={{ fontWeight: 'bold', margin: '0 0 4px 0' }}>(หัวหน้ากลุ่มงานเทคโนโลยีสารสนเทศ)</p>
                <p style={{ color: '#555', margin: 0 }}>ผู้ตรวจสอบรายงาน</p>
              </div>
            </div>
          </div>

        </>
      )}

      {/* Embedded CSS for Print Styling */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          #root {
            max-width: 100% !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          header, nav, .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .day-content {
            display: block !important;
          }
          .day-card {
            border: 1px solid #ccc !important;
            margin-bottom: 20px !important;
            page-break-inside: avoid;
            box-shadow: none !important;
          }
          table {
            font-size: 11px !important;
          }
          th, td {
            padding: 6px 4px !important;
          }
        }
      `}</style>

    </div>
  );
}
