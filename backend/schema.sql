-- สร้างฐานข้อมูลหากยังไม่มี
CREATE DATABASE IF NOT EXISTS itservice CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE itservice;

-- ล้างตารางเดิมออก (เพื่อการสร้างใหม่)
DROP TABLE IF EXISTS ticket_logs;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS sla_settings;
DROP TABLE IF EXISTS users;

-- 1. สร้างตาราง users
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    line_user_id VARCHAR(255) UNIQUE COMMENT 'LINE User ID สำหรับเชื่อมโยงสิทธิ์',
    display_name VARCHAR(255) NOT NULL,
    picture_url VARCHAR(500),
    role ENUM('requester', 'technician', 'admin') DEFAULT 'requester',
    department VARCHAR(100) NOT NULL DEFAULT 'ทั่วไป',
    email VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. สร้างตาราง sla_settings (สำหรับตั้งค่าระยะเวลา SLA ผ่านระบบหลังบ้าน)
CREATE TABLE sla_settings (
    priority VARCHAR(50) PRIMARY KEY COMMENT 'low, medium, high, critical',
    minutes INT NOT NULL COMMENT 'เวลาข้อตกลง SLA (นาที)',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. สร้างตาราง tickets
CREATE TABLE tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_code VARCHAR(50) UNIQUE COMMENT 'รหัสใบแจ้งซ่อม เช่น IT-YYYYMMDD-XXXX',
    requester_id INT NOT NULL,
    technician_id INT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    image_url VARCHAR(500) NULL,
    category VARCHAR(100) NOT NULL COMMENT 'Hardware, Software, Network, Document, Other',
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    status ENUM('pending', 'assigned', 'in_progress', 'resolved', 'closed') DEFAULT 'pending',
    sla_minutes INT NOT NULL COMMENT 'เวลาข้อตกลง SLA (นาที) ณ ตอนกดสร้างตั๋ว',
    sla_deadline DATETIME NOT NULL COMMENT 'เวลาจำกัดที่กำหนดตาม SLA',
    rating INT NULL,
    feedback TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (requester_id) REFERENCES users(id),
    FOREIGN KEY (technician_id) REFERENCES users(id)
);

-- 4. สร้างตาราง ticket_logs
CREATE TABLE ticket_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    actor_id INT NOT NULL,
    action VARCHAR(255) NOT NULL COMMENT 'Created, Assigned, In Progress, Resolved, Rating, Closed',
    note TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES users(id)
);

-- ==========================================
-- SEED DATA (ข้อมูลการตั้งค่าเบื้องต้นของระบบ)
-- ==========================================

-- เพิ่มตั้งค่า SLA เริ่มต้น (หน่วยเป็นนาที)
INSERT INTO sla_settings (priority, minutes) VALUES
('low', 480),       -- 8 ชั่วโมง
('medium', 240),    -- 4 ชั่วโมง
('high', 120),      -- 2 ชั่วโมง
('critical', 60);    -- 1 ชั่วโมง
