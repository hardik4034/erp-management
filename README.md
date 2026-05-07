# 🏢 HR Management System (HRMS)

> **Enterprise-Grade Human Resource Management Platform** — Built with Node.js, Express, Microsoft SQL Server, and a pure Vanilla HTML/CSS/JS frontend.

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=flat-square&logo=nodedotjs)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.18.x-000000?style=flat-square&logo=express)](https://expressjs.com)
[![SQL Server](https://img.shields.io/badge/SQL%20Server-MSSQL-CC2927?style=flat-square&logo=microsoftsqlserver)](https://www.microsoft.com/sql-server)
[![JWT](https://img.shields.io/badge/Auth-JWT-FB015B?style=flat-square&logo=jsonwebtokens)](https://jwt.io)
[![License](https://img.shields.io/badge/License-ISC-blue?style=flat-square)](LICENSE)

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Database Setup](#1-database-setup)
  - [Backend Setup](#2-backend-setup)
  - [Frontend Setup](#3-frontend-setup)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Modules](#-modules)
- [Security](#-security)
- [Database Schema](#-database-schema)
- [Deployment](#-deployment)
- [Contributing](#-contributing)

---

## 🌐 Overview

The **HRMS** is a full-featured, production-ready HR platform designed to streamline every aspect of human resource management — from employee onboarding and attendance tracking to payroll processing and audit logging.

It follows a clean **3-tier architecture**:

| Layer | Technology | Role |
|---|---|---|
| Frontend | HTML5 / CSS3 / Vanilla JS | UI served via `http-server` |
| Backend | Node.js + Express | RESTful API server |
| Database | Microsoft SQL Server | ACID-compliant data store |

---

## ✅ Features

| Module | Description |
|---|---|
| 🔐 **Authentication** | JWT-based login, token refresh, role-based access control (RBAC) |
| 🧑‍💼 **Employee Management** | Full lifecycle CRUD with avatar support, auto-generated IDs, and search |
| ⏱️ **Attendance & Biometrics** | eSSL hardware integration, cron-based punch sync, status classification |
| 🏖️ **Leave Management** | Multi-tier approval workflows, proportional balance tracking |
| 💰 **Payroll & Salary** | CTC framework, bulk generation via stored procedures, export support |
| 🏢 **Departments & Designations** | Hierarchical org structure management |
| 📂 **Documents & Assets** | File uploads via Multer, asset-to-employee assignments |
| 📅 **Calendar & Holidays** | Company calendar with public and custom holiday management |
| 🌟 **Appreciations** | Peer-to-peer recognition and commendation tracking |
| 📜 **Audit Logging** | Deep-diff engine tracking WHO changed WHAT and WHEN, asynchronously |
| 📊 **Reports** | Consolidated HR reports and data exports |
| 👤 **User Management** | Admin-provisioned accounts linked to employee profiles |

---

## 🛠️ Tech Stack

### Backend
| Package | Version | Purpose |
|---|---|---|
| `express` | ^4.18.2 | Web framework |
| `mssql` | ^12.5.0 | SQL Server driver |
| `jsonwebtoken` | ^9.0.2 | JWT auth |
| `bcryptjs` | ^2.4.3 | Password hashing |
| `helmet` | ^8.1.0 | Security HTTP headers |
| `cors` | ^2.8.5 | Cross-origin handling |
| `express-rate-limit` | ^8.3.2 | DDoS protection |
| `express-validator` | ^7.0.1 | Request validation |
| `winston` | ^3.19.0 | Structured logging |
| `morgan` | ^1.10.1 | HTTP access logs |
| `multer` | ^2.0.2 | File uploads |
| `node-cron` | ^4.2.1 | Scheduled jobs |
| `compression` | ^1.8.1 | Gzip compression |
| `cookie-parser` | ^1.4.7 | Cookie parsing |
| `axios` | ^1.13.4 | HTTP client (biometric sync) |
| `nodemon` | ^3.0.2 | Dev auto-reload |

### Frontend
- Pure **HTML5 / CSS3 / Vanilla JavaScript** (no framework dependencies)
- **Dark/Light Mode** with persistent theme preference
- **Glassmorphism UI** with micro-animations and skeleton loaders
- **Global Search** with live auto-suggestions
- Served via `npx http-server`

---

## 📁 Project Structure

```
hr-employee/
├── backend/                        ← Node.js REST API
│   ├── config/                     ← DB & environment configuration
│   ├── controllers/                ← Route handler business logic (17 modules)
│   ├── middleware/                 ← Auth, RBAC, validation, rate limiting
│   ├── routes/                     ← Express router definitions (17 modules)
│   ├── services/                   ← Core services (AuditQueue, Auth, ESSL scheduler)
│   ├── repositories/               ← Data access layer (DB query abstractions)
│   ├── validators/                 ← express-validator schemas
│   ├── utils/                      ← Logger, helpers
│   ├── uploads/                    ← Stored user file uploads
│   ├── logs/                       ← Winston log output files
│   ├── _dev_tools/                 ← One-off development/setup scripts
│   ├── ecosystem.config.js         ← PM2 process manager config
│   ├── server.js                   ← Application entry point
│   └── package.json
│
├── frontend/                       ← Static HTML/CSS/JS client
│   ├── index.html                  ← Main HRMS Dashboard
│   ├── pages/                      ← 18 module-specific UI pages
│   │   ├── employees.html
│   │   ├── attendance.html
│   │   ├── attendance-by-member.html
│   │   ├── leaves.html
│   │   ├── payroll.html
│   │   ├── employee-salary.html
│   │   ├── departments.html
│   │   ├── designations.html
│   │   ├── users.html
│   │   ├── audit-logs.html
│   │   ├── biometric-settings.html
│   │   ├── appreciations.html
│   │   ├── assets.html
│   │   ├── holidays.html
│   │   ├── calendar.html
│   │   ├── reports.html
│   │   ├── profile.html
│   │   └── note.html
│   ├── scripts/                    ← Vanilla JS controllers (API calls, DOM logic)
│   ├── styles/                     ← Modular CSS design system
│   └── assets/                     ← Images, icons, brand assets
│
├── database/                       ← SQL Server Schema & Stored Procedures
│   ├── database-schema.sql         ← Master DDL (tables, indexes, constraints)
│   └── procedures.sql              ← Optimized stored procedures
│
├── docs/                           ← Additional documentation
├── nginx.conf                      ← Production reverse proxy config
├── QUICKSTART.md                   ← Abbreviated quick-start guide
├── PROJECT_DOCUMENTATION.md        ← Detailed architecture documentation
├── BIOMETRIC_DOCUMENTATION.md      ← eSSL biometric integration guide
├── STORED_PROCEDURES.md            ← Database stored procedures reference
└── HOW_TO_GET_PAYROLL_DATA.md      ← Payroll data retrieval guide
```

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Minimum Version |
|---|---|
| [Node.js](https://nodejs.org) | v18+ |
| [npm](https://npmjs.com) | v9+ |
| [Microsoft SQL Server](https://www.microsoft.com/sql-server) | 2019+ |
| [SQL Server Management Studio (SSMS)](https://aka.ms/ssmsfullsetup) | Optional but recommended |

---

### 1. Database Setup

Open **SSMS** and execute the schema file against your SQL Server instance:

```sql
-- Run this file in SSMS to create all tables, indexes, and procedures
d:\hr-employee\hr-employee\database\database-schema.sql
```

> 💡 See [`STORED_PROCEDURES.md`](./STORED_PROCEDURES.md) for a full reference of all stored procedures.

---

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy and configure environment variables
copy .env.example .env
# Edit .env with your DB credentials and secrets (see section below)

# Start the development server
npm run dev
```

✅ Backend API available at: **http://localhost:5000**

**Other npm scripts:**

| Command | Description |
|---|---|
| `npm start` | Start in production mode |
| `npm run dev` | Start with nodemon (auto-reload) |
| `npm test` | Run Jest test suite |
| `npm run test:coverage` | Run tests with coverage report |

---

### 3. Frontend Setup

```bash
cd frontend

# Serve the static files on port 8080
npx http-server -p 8080
```

✅ Frontend available at: **http://localhost:8080**

> **Default Login Credentials** (seeded by setup scripts):
> - **Username:** `admin`
> - **Password:** `adminpassword` *(change immediately in production)*

---

## ⚙️ Environment Variables

Create a `.env` file inside the `backend/` directory. Use `.env.example` as the template:

```env
# ── Server ─────────────────────────────────────────────────────────────────
NODE_ENV=development
PORT=5000

# ── Database ────────────────────────────────────────────────────────────────
DB_SERVER=localhost
DB_DATABASE=HRMS
DB_USER=hrms_user
DB_PASSWORD=your_secure_password
DB_PORT=1433
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true

# ── Authentication ──────────────────────────────────────────────────────────
JWT_ACCESS_SECRET=your_strong_access_secret_here
JWT_REFRESH_SECRET=your_strong_refresh_secret_here
JWT_EXPIRES_IN=24h

# ── CORS ────────────────────────────────────────────────────────────────────
CORS_ORIGIN=http://localhost:8080

# ── Biometric Device (eSSL ADMS) ────────────────────────────────────────────
ESSL_ADMS_API_URL=http://192.168.1.100:8080
BIOMETRIC_SCHEDULER_ENABLED=true
```

> ⚠️ **Never commit `.env` to version control.** It is already listed in `.gitignore`.

---

## 📡 API Reference

All endpoints (except `/api/auth/*` and `/health`) require a valid **Bearer token** in the `Authorization` header.

```
Authorization: Bearer <your_access_token>
```

### 🔑 Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Authenticate user, receive JWT tokens |
| `POST` | `/api/auth/refresh-token` | Rotate access/refresh token pair |
| `POST` | `/api/auth/logout` | Revoke session and clear cookie |
| `GET` | `/api/auth/profile` | Get current authenticated user profile |

### 👥 Employees
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/employees` | List all employees (paginated, searchable) |
| `POST` | `/api/employees` | Create new employee record |
| `GET` | `/api/employees/:id` | Get single employee by ID |
| `PUT` | `/api/employees/:id` | Update employee details |
| `DELETE` | `/api/employees/:id` | Soft-delete employee |

### ⏱️ Attendance
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/attendance` | List attendance records |
| `POST` | `/api/attendance` | Log manual attendance entry |
| `GET` | `/api/attendance/employee/:id` | Get attendance by employee |

### 🖥️ Biometrics
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/biometric/devices` | List registered biometric devices |
| `POST` | `/api/biometric/sync` | Trigger manual punch log sync |
| `GET` | `/api/biometric/punch-logs` | View raw punch logs |

### 🏖️ Leaves
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/leaves` | List all leave requests |
| `POST` | `/api/leaves` | Submit a new leave request |
| `PUT` | `/api/leaves/:id/approve` | Approve a leave request |
| `PUT` | `/api/leaves/:id/reject` | Reject a leave request |

### 💰 Payroll
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/payroll` | List payroll records |
| `POST` | `/api/payroll/generate-bulk` | Generate bulk payroll for a period |
| `GET` | `/api/payroll/:id` | Get single payroll entry |

### 💵 Salary Groups
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/salary` | List salary groups / structures |
| `POST` | `/api/salary` | Create salary structure |
| `PUT` | `/api/salary/:id` | Update salary structure |

### 🏢 Departments & Designations
| Method | Endpoint | Description |
|---|---|---|
| `GET/POST/PUT/DELETE` | `/api/departments` | Department CRUD |
| `GET/POST/PUT/DELETE` | `/api/designations` | Designation CRUD |

### 👤 Users
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/users` | List all system users |
| `POST` | `/api/users` | Create user account |
| `PUT` | `/api/users/:id` | Update user |
| `DELETE` | `/api/users/:id` | Deactivate user |

### 📜 Audit Logs
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/audit-logs` | List all audit log entries (filterable) |

### 📂 Documents & Assets
| Method | Endpoint | Description |
|---|---|---|
| `GET/POST/DELETE` | `/api/documents` | Employee document management |
| `GET/POST/PUT/DELETE` | `/api/assets` | Company asset CRUD & assignments |

### 📅 Holidays & Calendar
| Method | Endpoint | Description |
|---|---|---|
| `GET/POST/PUT/DELETE` | `/api/holidays` | Holiday management |
| `GET` | `/api/calendar` | Calendar view data |

### 🌟 Appreciations & Notes
| Method | Endpoint | Description |
|---|---|---|
| `GET/POST/PUT/DELETE` | `/api/appreciations` | Appreciation/recognition records |
| `GET/POST/PUT/DELETE` | `/api/notes` | Employee notes |

---

## 🧩 Modules

### 1. 🔐 Authentication & RBAC
- JWT-based stateless auth with access + refresh token rotation.
- Refresh tokens stored in secure, HTTP-only cookies.
- Four permission levels: **Admin**, **HR**, **Manager**, **Employee**.
- bcrypt-hashed passwords (salt rounds: 10).

### 2. 🧑‍💼 Employee Management
- Auto-generated, formatted Employee IDs.
- Linked to Departments, Designations, and Salary Groups.
- Supports document uploads, avatar photos, and notes.
- Global search with auto-suggestion across employee fields.

### 3. ⏱️ Attendance & eSSL Biometrics
- Integrates with **eSSL ADMS** biometric hardware via HTTP polling.
- `node-cron` scheduler auto-syncs raw punch logs daily.
- SQL Stored Procedure maps punches → `Present / Absent / Late / Half-Day`.
- Visual calendar grid and individual timeline on the frontend.

### 4. 🏖️ Leave Management
- Multi-step approval: Employee → Manager → HR.
- Automatic leave balance calculation and deduction.
- Tracks leave types (Annual, Sick, Casual, Unpaid, etc.).

### 5. 💰 Payroll & Salary
- CTC-based salary structure with configurable earnings and deductions.
- **Bulk payroll generation** powered by SQL Stored Procedures.
- Calculates LOP (Loss of Pay) based on attendance data.
- Downloadable pay-slip exports from the UI.

### 6. 📜 Audit Logging
- Fully decoupled, async queue-based audit engine.
- Records deep-diff of JSON objects (before/after) for all mutations.
- Human-readable display of changes: field name, old value, new value.
- Searchable and filterable in the `audit-logs.html` UI.

---

## 🔐 Security

| Measure | Implementation |
|---|---|
| **Secure Headers** | `helmet.js` (CSP, HSTS, X-Frame-Options, etc.) |
| **Rate Limiting** | `express-rate-limit` — 100 req/15min per IP |
| **CORS** | Configured to allow only `CORS_ORIGIN` |
| **Input Validation** | `express-validator` on all mutation endpoints |
| **Password Hashing** | `bcryptjs` with 10 salt rounds |
| **JWT Auth** | Short-lived access tokens + HTTP-only refresh cookies |
| **File Uploads** | `multer` with type/size restrictions |
| **Error Handling** | Stack traces suppressed in `NODE_ENV=production` |
| **Logging** | `winston` for structured logs, `morgan` for HTTP traces |

---

## 🗄️ Database Schema

**Core Tables (15 tables across 5 domains):**

| Domain | Tables |
|---|---|
| **Auth & Access** | `Users`, `Roles`, `AuditLogs` |
| **Organization** | `Departments`, `Designations`, `CompanyAssets` |
| **Core HR** | `Employees`, `EmployeeNotes`, `EmployeeDocuments` |
| **Time & Leave** | `Attendance`, `BiometricDevices`, `RawPunchLogs`, `Leaves`, `Holidays` |
| **Finance** | `SalaryGroups`, `EmployeeSalary`, `Payroll`, `PayrollDetails` |

> See [`STORED_PROCEDURES.md`](./STORED_PROCEDURES.md) for all stored procedure signatures and usage.

---

## 🚢 Deployment

### Using PM2 (Recommended)

```bash
cd backend
npm install -g pm2

# Start with PM2 using ecosystem config
pm2 start ecosystem.config.js

# Save process list and enable startup
pm2 save
pm2 startup
```

### Using Nginx as Reverse Proxy

A pre-configured `nginx.conf` is included at the project root with:
- HTTP → HTTPS redirect
- Reverse proxy to `localhost:5000` (API)
- Static file serving for the frontend
- Gzip compression enabled
- SSL/TLS termination support

```bash
# Copy nginx config and reload
sudo cp nginx.conf /etc/nginx/sites-available/hrms
sudo nginx -t && sudo systemctl reload nginx
```

### Environment Checklist for Production

- [ ] Set `NODE_ENV=production`
- [ ] Use strong, unique `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`
- [ ] Set `CORS_ORIGIN` to your actual frontend domain
- [ ] Set `DB_TRUST_SERVER_CERTIFICATE=false` with a valid SSL cert
- [ ] Enable HTTPS via Nginx with a valid TLS certificate
- [ ] Change default admin credentials immediately after first login

---

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'feat: add new feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request.

---

## 📄 Additional Documentation

| File | Description |
|---|---|
| [`QUICKSTART.md`](./QUICKSTART.md) | Abbreviated 5-minute setup guide |
| [`PROJECT_DOCUMENTATION.md`](./PROJECT_DOCUMENTATION.md) | Full architecture & module docs |
| [`BIOMETRIC_DOCUMENTATION.md`](./BIOMETRIC_DOCUMENTATION.md) | eSSL biometric device setup guide |
| [`BIOMETRIC_INTEGRATION_GUIDE.md`](./BIOMETRIC_INTEGRATION_GUIDE.md) | API integration specifics |
| [`STORED_PROCEDURES.md`](./STORED_PROCEDURES.md) | SQL stored procedures reference |
| [`HOW_TO_GET_PAYROLL_DATA.md`](./HOW_TO_GET_PAYROLL_DATA.md) | Payroll data retrieval reference |

---

<div align="center">

**Built with ❤️ for Professional HR Management**

*Version 1.1.0 — May 2026*

</div>
