# 📋 HR Management System (HRMS) — Full Project Documentation

> **Project Name:** Enterprise HR Management System (HRMS)  
> **Version:** 1.1.0  
> **Tech Stack:** Node.js (Express) + Microsoft SQL Server + Vanilla HTML/CSS/JS  
> **Documentation Date:** May 2026  

---

## 🏗️ System Architecture & Data Flow

The HRMS operates on a robust client-server architecture designed for high performance, security, and enterprise scalability:

1. **Presentation Layer (Frontend):** 
   - A highly responsive, pure HTML/CSS/JS frontend served via `http-server`. 
   - Uses a dynamic styling system with a global theme manager, offering a polished Dark/Light mode toggle, sleek micro-animations, and responsive layouts.
2. **Business Logic Layer (Backend):**
   - Built on Node.js and Express. 
   - Exposes RESTful APIs with strict endpoint validation using `express-validator`.
   - Incorporates enterprise-grade security middleware: `helmet` for HTTP headers, `cors` for cross-origin tracking, `express-rate-limit` for DDoS protection.
   - Comprehensive error handling and system-wide request logging via `winston` and `morgan`.
3. **Data Layer (Database):**
   - Microsoft SQL Server handles robust ACID-compliant transactions.
   - Features heavy use of Stored Procedures to optimize critical flows (like Bulk Payroll Generation, Biometric Log mapping, and Audit Trails).
4. **Asynchronous Processing Layer:**
   - Background jobs managed by `node-cron` orchestrate daily Biometric punch syncs.
   - Intelligent Audit diffing engine asynchronously processes metadata changes and serializes human-readable audit history.

---

## 📁 Project Directory Structure

```text
hr-employee/
├── backend/                  ← Node.js REST API Server
│   ├── config/               ← Environment & DB configuration files
│   ├── controllers/          ← API Handlers handling business logic
│   ├── middleware/           ← RBAC Auth, request validation, rate limiting
│   ├── routes/               ← Express API Routing Definitions (17 modules)
│   ├── services/             ← Business Services (AuditQueue, Auth, ESSL, Scheduler)
│   ├── uploads/              ← File uploads (documents, avatars)
│   ├── utils/                ← Helper classes and logger configurations
│   ├── package.json          ← Backend dependencies
│   └── server.js             ← Main API Entry Point
│
├── frontend/                 ← Static HTML/CSS/JS Client Layer
│   ├── index.html            ← HRMS Dashboard
│   ├── pages/                ← Sub-module UI templates (18 Feature Pages)
│   ├── scripts/              ← Modular Vanilla JS controllers handling DOM & API requests
│   ├── styles/               ← Modular CSS files establishing dynamic visual language
│   └── assets/               ← Static images, brand logos, vector icons
│
├── database/                 ← SQL Schema & Stored Procedures
│   ├── schema.sql            ← Master DDL Schema definitions
│   └── procedures.sql        ← Optimised logic for heavy data manipulation
│
├── nginx.conf                ← Production Reverse Proxy Configurations
└── PROJECT_DOCUMENTATION.md  ← Project Documentation (This File)
```

---

## 🛠️ Technology Stack Update

| Layer         | Technology / Dependency                  | Version |
|---------------|------------------------------------------|---------|
| Backend       | Node.js, Express framework               | 4.18.x  |
| Database      | Microsoft SQL Server (MSSQL)             | 12.5.x  |
| Security      | `helmet`, `cors`, `express-rate-limit`   | Latest  |
| Crypto / Auth | `jsonwebtoken` (JWT), `bcryptjs`         | Latest  |
| Logging       | `winston`, `morgan`                      | Latest  |
| Uploads       | `multer`                                 | Latest  |
| Task Sched.   | `node-cron`                              | Latest  |
| Dev Server    | `nodemon`, `http-server`                 | Latest  |

---

## 🔧 Environment Setup

Create `.env` inside the `backend/` directory with the following template:

```env
NODE_ENV=development
PORT=5000

# Database Settings
DB_SERVER=localhost
DB_DATABASE=HRMS
DB_USER=hrms_user
DB_PASSWORD=your_password
DB_PORT=1433
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true

# Auth & Security
JWT_SECRET=super_secret_key_change_in_production
JWT_EXPIRES_IN=24h
CORS_ORIGIN=*

# Biometric Device Variables
ESSL_ADMS_API_URL=//192.168.1.100:8080
BIOMETRIC_SCHEDULER_ENABLED=true
```

**Starting the Services:**
1. **Backend Server:** `cd backend && npm install && npm run dev`
2. **Frontend UI:** `cd frontend && npx http-server -p 8080`

---

## 🚀 Detailed Module Implementation Status

### 1. User Management & Authentication 🛡️
**Status:** ✅ **COMPLETE**
- **Routes:** `/api/auth/login`, `/api/auth/profile`, `/api/users/*`
- **Features:** 
  - JWT generation and cookie parsing.
  - PBKDF2 / bcrypt hashing for user passwords.
  - Unified `User` entity linked explicitly to `Employee` profiles.
  - Role-Based Access Control (RBAC): `Admin`, `HR`, `Manager`, `Employee`.
  - Frontend implementation (`users.html`) handling credential provisioning.

### 2. Global System Audit Logging 📜
**Status:** ✅ **COMPLETE**
- **Routes:** `/api/audit-logs/*`
- **Features:**
  - Highly decoupled background Queue system (`auditQueueService.js`).
  - Implements a diff-engine tracking deep object mutations across all system endpoints.
  - Provides Human-readable translation on the Frontend UI (`audit-logs.html`) showing WHO changed WHAT, WHEN, and mapped against target record IDs.

### 3. Employee Management 🧑‍💼
**Status:** ✅ **COMPLETE**
- **Routes:** `/api/employees/*`
- **Features:**
  - Automated dynamic Employee ID generation mappings.
  - Extended profile traits mapped explicitly to Departments, Designations, Salary Bands.
  - Avatar support in UI and search indexing features.

### 4. Attendance & eSSL Biometrics ⏱️
**Status:** ✅ **COMPLETE (API & Sync logic)**
- **Routes:** `/api/attendance/*`, `/api/biometric/*`
- **Features:**
  - Robust `node-cron` jobs pulling raw punch logs from remote hardware terminals.
  - SQL Stored procedure mapper transforming punch-ins into `Present`, `Absent`, `Late`, or `Half-Day`.
  - Extensive frontend visualization: Calendar Grids, Individual Timelines, and Monthly aggregates.

### 5. Leave & Holiday Operations 🏖️
**Status:** ✅ **COMPLETE**
- **Routes:** `/api/leaves/*`, `/api/holidays/*`
- **Features:**
  - Multi-tier approval flows tailored by User Roles (Employees request -> Managers approve -> HR finalizes).
  - Proportional Leave Balance tracking calculations.

### 6. Compensation & Payroll 💰
**Status:** ✅ **COMPLETE**
- **Routes:** `/api/payroll/*`, `/api/salary/*`
- **Features:**
  - CTC (Cost to Company) framework binding earnings and deductions formulas.
  - Bulk Generation routines leveraging stored procedures calculating active attendance logic.
  - Downloadable payload exports in UI.

### 7. Documentation & Assets 📂
**Status:** ✅ **COMPLETE**
- **Routes:** `/api/documents/*`, `/api/assets/*`
- **Features:**
  - Hardware / Software asset assignment workflows mapping devices to Employees (`assets.html`).
  - Company Policy distributions handling central File Uploads via `multer` (`documentRoutes.js`).

### 8. System Dashboard & UI Core 📊
**Status:** ✅ **COMPLETE**
- **Features:**
  - State-of-the-Art aesthetics featuring soft-glassmorphism, cohesive transitions, and skeleton loaders.
  - Implementation of intelligent **Global Search auto-suggestions**.
  - Persistent Session states bridging Dark-Mode configurations seamlessly across multiple page navigations.

---

## 🗄️ Database Schema Summary (Core Tables)

1. **Auth & Audits:** `Users`, `Roles`, `AuditLogs`
2. **Organization Structs:** `Departments`, `Designations`, `CompanyAssets`
3. **Core HR:** `Employees`, `EmployeeNotes`, `EmployeeDocuments`
4. **Tracking:** `Attendance`, `BiometricDevices`, `RawPunchLogs`, `Leaves`, `Holidays`
5. **Financial:** `SalaryGroups`, `EmployeeSalary`, `Payroll`, `PayrollDetails`

---

## 🔐 Production Deployment Configurations

The application has been structurally prepared for direct staging and enterprise deployment:

1. **Security Policy Headers:** Integrated via `Helmet.js`.
2. **Reverse Proxying:** Fully configured `nginx.conf` present at root orchestrating HTTP routing, Load Balancing, gzip compression, and TLS/SSL mapping over ports `80`/`443`.
3. **Logging Strategy:** Production logs routed asynchronously into stream files utilizing `winston`, segregated by debug contexts and HTTP access traces via `morgan`.
4. **Environment Isolation:** Hard-checked `NODE_ENV=production` conditional blocks bypassing trace stack exposures to end users.

---

*Generated by HRMS System Architecture Audit — May 2026*
