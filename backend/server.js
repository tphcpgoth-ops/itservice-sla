require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const querystring = require('querystring');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MySQL Connection Pool
let pool;
async function connectDB() {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'itservice',
      port: parseInt(process.env.DB_PORT || '3306'),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    // Test connection
    const conn = await pool.getConnection();
    console.log('✓ Successfully connected to MySQL database: ' + process.env.DB_NAME);
    conn.release();
  } catch (err) {
    console.error('✗ MySQL Connection failed. Make sure MySQL is running and database exists.');
    console.error(err.message);
  }
}
connectDB();

// Middleware: Authenticate JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access token missing' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token expired or invalid' });
    req.user = user;
    next();
  });
}

// Middleware: Require Admin Role
function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied: Requires Admin role' });
  }
}

// Helper: Send LINE Push Notification (Flex Message)
async function sendLineNotification(lineUserId, title, status, description, ticketCode, linkUrl) {
  if (!lineUserId || lineUserId.startsWith('U11111111') || !process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN || process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN.includes('your_line')) {
    console.log(`[LINE MOCK] Sending notification to ${lineUserId}: ${title} - [${status}]`);
    return;
  }

  const url = 'https://api.line.me/v2/bot/message/push';
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN}`
  };

  let color = '#3b82f6'; // Blue
  if (status === 'Pending') color = '#ef4444'; // Red
  if (status === 'In Progress') color = '#f97316'; // Orange
  if (status === 'Resolved') color = '#22c55e'; // Green

  const payload = {
    to: lineUserId,
    messages: [
      {
        type: 'flex',
        altText: `อัปเดตงานซ่อม ${ticketCode}: ${status}`,
        contents: {
          type: 'bubble',
          styles: {
            header: { backgroundColor: color }
          },
          header: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: 'Hospital IT Service Tracker',
                color: '#ffffff',
                size: 'xs',
                weight: 'bold'
              },
              {
                type: 'text',
                text: `สถานะ: ${status}`,
                color: '#ffffff',
                size: 'xl',
                weight: 'bold',
                margin: 'xs'
              }
            ]
          },
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: `เลขใบแจ้งซ่อม: ${ticketCode}`,
                weight: 'bold',
                size: 'sm'
              },
              {
                type: 'text',
                text: title,
                weight: 'bold',
                margin: 'md',
                size: 'md'
              },
              {
                type: 'text',
                text: description,
                color: '#666666',
                size: 'sm',
                margin: 'sm',
                wrap: true
              }
            ]
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'button',
                action: {
                  type: 'uri',
                  label: 'เปิดดูรายละเอียดงาน',
                  uri: linkUrl || process.env.FRONTEND_URL
                },
                style: 'primary',
                color: '#0058bc'
              }
            ]
          }
        }
      }
    ]
  };

  try {
    await axios.post(url, payload, { headers });
    console.log(`✓ LINE notification successfully sent to ${lineUserId}`);
  } catch (err) {
    console.error('✗ Failed to send LINE notification:', err.response ? err.response.data : err.message);
  }
}


// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

// 1. Get LINE Login URL
app.get('/api/auth/line/login-url', (req, res) => {
  const client_id = process.env.LINE_LOGIN_CHANNEL_ID;
  const redirect_uri = encodeURIComponent(process.env.LINE_LOGIN_CALLBACK_URL);
  const state = Math.random().toString(36).substring(7);
  const scope = 'profile%20openid%20email';
  
  const url = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${client_id}&redirect_uri=${redirect_uri}&state=${state}&scope=${scope}`;
  res.json({ url });
});

// 2. LINE OAuth Callback
app.get('/api/auth/line/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=code_missing`);
  }

  try {
    // Exchange Auth Code for Tokens
    const tokenResponse = await axios.post(
      'https://api.line.me/oauth2/v2.1/token',
      querystring.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.LINE_LOGIN_CALLBACK_URL,
        client_id: process.env.LINE_LOGIN_CHANNEL_ID,
        client_secret: process.env.LINE_LOGIN_CHANNEL_SECRET
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, id_token } = tokenResponse.data;

    // Get User Profile from LINE
    const profileResponse = await axios.get('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const { userId, displayName, pictureUrl } = profileResponse.data;

    // Decode ID Token to get Email (optional)
    let email = null;
    if (id_token) {
      const decodedToken = jwt.decode(id_token);
      email = decodedToken.email || null;
    }

    // Check or Insert User in Database
    let [users] = await pool.query('SELECT * FROM users WHERE line_user_id = ?', [userId]);
    let user;

    if (users.length === 0) {
      // Create a new user with default 'requester' role
      const [result] = await pool.query(
        'INSERT INTO users (line_user_id, display_name, picture_url, role, department, email) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, displayName, pictureUrl, 'requester', 'ทั่วไป', email]
      );
      
      const [newUsers] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
      user = newUsers[0];
    } else {
      // Update existing user profile just in case
      await pool.query(
        'UPDATE users SET display_name = ?, picture_url = ? WHERE line_user_id = ?',
        [displayName, pictureUrl, userId]
      );
      user = users[0];
      user.display_name = displayName;
      user.picture_url = pictureUrl;
    }

    // Sign JWT Token
    const jwtToken = jwt.sign(
      { id: user.id, display_name: user.display_name, role: user.role, department: user.department, line_user_id: user.line_user_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Redirect to frontend app with JWT token in URL params
    res.redirect(`${process.env.FRONTEND_URL}/login-success?token=${jwtToken}`);

  } catch (err) {
    console.error('✗ LINE authentication callback failed:', err.response ? err.response.data : err.message);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
  }
});

// 3. Mock Login (Extremely helpful for local dev without LINE parameters setup)
app.post('/api/auth/mock-login', async (req, res) => {
  const { userId } = req.body; // Expects standard seed ID 1, 2, 3, 4, or 5
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found in seeding data' });
    }

    const user = users[0];
    
    // Sign Token
    const jwtToken = jwt.sign(
      { id: user.id, display_name: user.display_name, role: user.role, department: user.department, line_user_id: user.line_user_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token: jwtToken, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Get Current User Info
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, line_user_id, display_name, picture_url, role, department, email FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ user: users[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Update Profile details (like department)
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  const { department, email } = req.body;
  try {
    await pool.query('UPDATE users SET department = ?, email = ? WHERE id = ?', [department, email, req.user.id]);
    res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// DYNAMIC SLA SETTINGS ENDPOINTS
// ==========================================

// Get SLA Settings
app.get('/api/settings/sla', authenticateToken, async (req, res) => {
  try {
    const [settings] = await pool.query('SELECT * FROM sla_settings');
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update SLA Settings (Admin Only)
app.put('/api/settings/sla', authenticateToken, requireAdmin, async (req, res) => {
  const { priority, minutes } = req.body;
  if (!priority || !minutes || isNaN(minutes)) {
    return res.status(400).json({ error: 'priority and numeric minutes are required' });
  }

  try {
    await pool.query(
      'INSERT INTO sla_settings (priority, minutes) VALUES (?, ?) ON DUPLICATE KEY UPDATE minutes = ?',
      [priority, minutes, minutes]
    );
    res.json({ success: true, message: `SLA config for ${priority} updated to ${minutes} minutes` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// TICKET ENDPOINTS
// ==========================================

// 1. Get List of Tickets
app.get('/api/tickets', authenticateToken, async (req, res) => {
  try {
    let sql = `
      SELECT t.*, 
             req.display_name AS requester_name, req.picture_url AS requester_avatar, req.department AS requester_dept,
             tech.display_name AS technician_name, tech.picture_url AS technician_avatar
      FROM tickets t
      JOIN users req ON t.requester_id = req.id
      LEFT JOIN users tech ON t.technician_id = tech.id
    `;
    const params = [];

    // Filter by role: 
    // - Requester sees only tickets in their department or that they requested
    // - Technicians and Admins see all tickets
    if (req.user.role === 'requester') {
      sql += ` WHERE t.requester_id = ? OR req.department = ?`;
      params.push(req.user.id, req.user.department);
    }

    sql += ` ORDER BY t.created_at DESC`;

    const [tickets] = await pool.query(sql, params);
    res.json({ tickets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Get Single Ticket Details and its Logs
app.get('/api/tickets/:id', authenticateToken, async (req, res) => {
  const ticketId = req.params.id;
  try {
    // 1. Get ticket
    const [tickets] = await pool.query(`
      SELECT t.*, 
             req.display_name AS requester_name, req.picture_url AS requester_avatar, req.department AS requester_dept,
             tech.display_name AS technician_name, tech.picture_url AS technician_avatar
      FROM tickets t
      JOIN users req ON t.requester_id = req.id
      LEFT JOIN users tech ON t.technician_id = tech.id
      WHERE t.id = ?
    `, [ticketId]);

    if (tickets.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = tickets[0];

    // Check permissions
    if (req.user.role === 'requester' && ticket.requester_id !== req.user.id && ticket.requester_dept !== req.user.department) {
      return res.status(403).json({ error: 'Unauthorized to view this ticket' });
    }

    // 2. Get logs
    const [logs] = await pool.query(`
      SELECT tl.*, u.display_name AS actor_name, u.role AS actor_role
      FROM ticket_logs tl
      JOIN users u ON tl.actor_id = u.id
      WHERE tl.ticket_id = ?
      ORDER BY tl.created_at ASC
    `, [ticketId]);

    res.json({ ticket, logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Create Ticket
app.post('/api/tickets', authenticateToken, async (req, res) => {
  const { title, description, category, priority } = req.body;
  if (!title || !description || !category) {
    return res.status(400).json({ error: 'Title, description and category are required' });
  }

  try {
    // DYNAMIC SLA QUERY: Fetch SLA minutes configuration from the MySQL database!
    const [slaRows] = await pool.query('SELECT minutes FROM sla_settings WHERE priority = ?', [priority || 'medium']);
    let slaMinutes = 240; // Fallback to 4 hours if not set
    if (slaRows.length > 0) {
      slaMinutes = slaRows[0].minutes;
    }

    const now = new Date();
    const slaDeadline = new Date(now.getTime() + slaMinutes * 60000);

    // Generate Code: IT-YYYYMMDD-[RANDOM_NUM]
    const dateStr = now.toISOString().slice(0,10).replace(/-/g,"");
    const rand = Math.floor(1000 + Math.random() * 9000);
    const ticketCode = `IT-${dateStr}-${rand}`;

    const [result] = await pool.query(`
      INSERT INTO tickets (ticket_code, requester_id, title, description, category, priority, status, sla_minutes, sla_deadline)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [ticketCode, req.user.id, title, description, category, priority || 'medium', 'pending', slaMinutes, slaDeadline]);

    const ticketId = result.insertId;

    // Log the creation
    await pool.query(`
      INSERT INTO ticket_logs (ticket_id, actor_id, action, note)
      VALUES (?, ?, 'Created', ?)
    `, [ticketId, req.user.id, 'เปิดตั๋วแจ้งซ่อมเข้าระบบ']);

    // Send LINE Push to requester if LINE user ID exists
    const fullLink = `${process.env.FRONTEND_URL}/ticket/${ticketId}`;
    if (req.user.line_user_id) {
      await sendLineNotification(
        req.user.line_user_id,
        title,
        'Pending',
        `ได้รับแจ้งงานระบบ '${category}' เรียบร้อยแล้ว กำลังรอช่างไอทีเข้าจัดการงาน`,
        ticketCode,
        fullLink
      );
    }

    res.status(201).json({ success: true, ticketId, ticketCode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Update Ticket Status (Assign, Start, Resolve, Close)
app.put('/api/tickets/:id/status', authenticateToken, async (req, res) => {
  const ticketId = req.params.id;
  const { status, note } = req.body;
  const allowedStatuses = ['assigned', 'in_progress', 'resolved', 'closed'];
  
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status transition' });
  }

  try {
    // Get current ticket state and requester LINE ID
    const [tickets] = await pool.query(`
      SELECT t.*, u.line_user_id AS requester_line_id 
      FROM tickets t 
      JOIN users u ON t.requester_id = u.id 
      WHERE t.id = ?
    `, [ticketId]);

    if (tickets.length === 0) return res.status(404).json({ error: 'Ticket not found' });
    const ticket = tickets[0];

    // Business Logic Roles Checks
    if (status === 'assigned' && req.user.role === 'requester') {
      return res.status(403).json({ error: 'Only admins or technicians can assign tickets' });
    }

    let updateFieldsSql = 'status = ?';
    const queryParams = [status];

    // If assigned, bind the technician_id
    if (status === 'assigned') {
      updateFieldsSql += ', technician_id = ?';
      // Assign to current user if they are a technician, or let admin specify technician
      const techId = req.body.technician_id || req.user.id;
      queryParams.push(techId);
    }

    queryParams.push(ticketId);
    await pool.query(`UPDATE tickets SET ${updateFieldsSql} WHERE id = ?`, queryParams);

    // Create log entry
    let thaiAction = status;
    if (status === 'assigned') thaiAction = 'Assigned (มอบหมายงาน)';
    if (status === 'in_progress') thaiAction = 'In Progress (กำลังดำเนินการ)';
    if (status === 'resolved') thaiAction = 'Resolved (แก้ไขเสร็จสิ้น)';
    if (status === 'closed') thaiAction = 'Closed (ปิดตั๋วสำเร็จ)';

    await pool.query(`
      INSERT INTO ticket_logs (ticket_id, actor_id, action, note)
      VALUES (?, ?, ?, ?)
    `, [ticketId, req.user.id, status, note || `เปลี่ยนสถานะเป็น ${thaiAction}`]);

    // Send LINE message to requester
    if (ticket.requester_line_id) {
      let friendlyStatus = 'กำลังจัดลำดับงาน';
      let msg = '';
      if (status === 'assigned') {
        friendlyStatus = 'ช่างรับมอบหมายงาน';
        msg = `ช่างได้รับมอบหมายงานซ่อมแล้ว: ${note || 'รอกำลังเตรียมเครื่องมือเข้าตรวจสอบ'}`;
      } else if (status === 'in_progress') {
        friendlyStatus = 'กำลังดำเนินการซ่อม';
        msg = `ขณะนี้ช่างกำลังทำการตรวจสอบแก้ไขปัญหา: ${note || 'อยู่ระหว่างการดำเนินงาน'}`;
      } else if (status === 'resolved') {
        friendlyStatus = 'แก้ไขสำเร็จ (Resolved)';
        msg = `งานแจ้งซ่อมของคุณได้รับการแก้ไขแล้วเสร็จ! \nรายละเอียด: ${note || '-'}\n\nกรุณาคลิกเพื่อทำแบบประเมินพึงพอใจการให้บริการด้วยครับ`;
      } else if (status === 'closed') {
        friendlyStatus = 'ปิดตั๋วถาวร (Closed)';
        msg = 'ใบงานซ่อมนี้ได้รับการประเมินและปิดเคสเรียบร้อยแล้ว ขอบคุณสำหรับการใช้งาน!';
      }

      await sendLineNotification(
        ticket.requester_line_id,
        ticket.title,
        friendlyStatus,
        msg,
        ticket.ticket_code,
        `${process.env.FRONTEND_URL}/ticket/${ticketId}`
      );
    }

    res.json({ success: true, message: `Ticket status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Rate Ticket (Summary & Rating)
app.put('/api/tickets/:id/rate', authenticateToken, async (req, res) => {
  const ticketId = req.params.id;
  const { rating, feedback } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be a number between 1 and 5' });
  }

  try {
    const [tickets] = await pool.query('SELECT * FROM tickets WHERE id = ?', [ticketId]);
    if (tickets.length === 0) return res.status(404).json({ error: 'Ticket not found' });
    const ticket = tickets[0];

    // Only requester can rate
    if (ticket.requester_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the original requester can rate the ticket' });
    }

    // Update rating, feedback and close the ticket automatically
    await pool.query(
      'UPDATE tickets SET rating = ?, feedback = ?, status = "closed" WHERE id = ?',
      [rating, feedback || null, ticketId]
    );

    // Log the actions
    await pool.query(`
      INSERT INTO ticket_logs (ticket_id, actor_id, action, note)
      VALUES (?, ?, 'Rating', ?)
    `, [ticketId, req.user.id, `ให้คะแนน ${rating} ดาว: ${feedback || 'ไม่มีคอมเมนต์'}`]);

    await pool.query(`
      INSERT INTO ticket_logs (ticket_id, actor_id, action, note)
      VALUES (?, ?, 'closed', ?)
    `, [ticketId, req.user.id, 'ปิดตั๋วซ่อมสมบูรณ์จากการรีวิว']);

    res.json({ success: true, message: 'Ticket feedback recorded and closed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// DASHBOARD & SLA ENDPOINTS
// ==========================================

app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    // 1. Counters by Status
    const [statusCounts] = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM tickets 
      GROUP BY status
    `);

    // 2. SLA Compliance Rate
    // Compliance = (Tickets resolved before deadline / Total resolved/closed tickets) * 100
    const [slaData] = await pool.query(`
      SELECT 
        COUNT(CASE WHEN status IN ('resolved', 'closed') AND updated_at <= sla_deadline THEN 1 END) as compliant_count,
        COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END) as total_resolved
      FROM tickets
    `);

    const compliant = slaData[0].compliant_count || 0;
    const totalResolved = slaData[0].total_resolved || 0;
    const complianceRate = totalResolved > 0 ? Math.round((compliant / totalResolved) * 100) : 100;

    // 3. Category distribution
    const [categoryCounts] = await pool.query(`
      SELECT category, COUNT(*) as count 
      FROM tickets 
      GROUP BY category
    `);

    // 4. Monthly Trend (last 6 months)
    const [monthlyTrend] = await pool.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
      FROM tickets
      GROUP BY month
      ORDER BY month DESC
      LIMIT 6
    `);

    // 5. Unresolved Priority Distribution
    const [priorityCounts] = await pool.query(`
      SELECT priority, COUNT(*) as count
      FROM tickets
      WHERE status NOT IN ('resolved', 'closed')
      GROUP BY priority
    `);

    res.json({
      statusCounts: statusCounts.reduce((acc, curr) => {
        acc[curr.status] = curr.count;
        return acc;
      }, { pending: 0, assigned: 0, in_progress: 0, resolved: 0, closed: 0 }),
      slaComplianceRate: complianceRate,
      categoryCounts,
      monthlyTrend: monthlyTrend.reverse(),
      priorityCounts: priorityCounts.reduce((acc, curr) => {
        acc[curr.priority] = curr.count;
        return acc;
      }, { low: 0, medium: 0, high: 0, critical: 0 })
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// LINE OA WEBHOOK ENDPOINT
// ==========================================

app.post('/api/line/webhook', (req, res) => {
  const events = req.body.events;
  if (!events || events.length === 0) {
    return res.status(200).send('OK');
  }

  // Handle LINE events
  events.forEach(async (event) => {
    const { type, replyToken, source } = event;
    const lineUserId = source.userId;

    if (type === 'follow') {
      // User added the LINE OA!
      console.log(`[LINE WEBHOOK] User ${lineUserId} followed LINE OA.`);
      
      // Send a welcoming message instructing them to link their account
      const replyUrl = 'https://api.line.me/v2/bot/message/reply';
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN}`
      };

      const replyPayload = {
        replyToken,
        messages: [
          {
            type: 'text',
            text: 'ยินดีต้อนรับสู่ Hospital IT Service Tracker! \n\nกรุณากดลิงก์ด้านล่างเพื่อเชื่อมต่อบัญชีไลน์ของคุณและรับการแจ้งเตือนงานซ่อมแซมทันที:'
          },
          {
            type: 'template',
            altText: 'ปุ่มเชื่อมต่อระบบแจ้งซ่อม',
            template: {
              type: 'buttons',
              title: 'เชื่อมต่อบัญชีของคุณ',
              text: 'ยืนยันตัวตนเพื่อเชื่อมต่อระบบแจ้งซ่อมคอมพิวเตอร์โรงพยาบาล',
              actions: [
                {
                  type: 'uri',
                  label: 'เข้าสู่ระบบ / ลงทะเบียน',
                  uri: `${process.env.FRONTEND_URL}/login`
                }
              ]
            }
          }
        ]
      };

      if (process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN && !process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN.includes('your_line')) {
        try {
          await axios.post(replyUrl, replyPayload, { headers });
        } catch (err) {
          console.error('✗ LINE reply message on follow failed:', err.message);
        }
      }
    }
  });

  res.status(200).send('OK');
});

// ==========================================
// STATIC FRONTEND SERVING Fallback (All-in-one Single Folder Execution!)
// ==========================================
// Serves built react files from ../frontend/dist
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Serve React App Router Fallback for all unmatched web requests
app.get('*', (req, res, next) => {
  // If request is an API request, let Express handle it normally or 404
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Start listening
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔑 Real LINE Login Configured (Channel ID: ${process.env.LINE_LOGIN_CHANNEL_ID})`);
  console.log(`📦 Serving React frontend statically from ../frontend/dist`);
  console.log(`=================================================`);
});
