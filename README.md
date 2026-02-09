# HR Management System (HRMS)

**Pure HR Management System** - No Authentication Required

## 🚀 Quick Start

### 1. Database Setup (2 minutes)
```bash
# Run in SQL Server Management Studio
c:\hr-employee\database\database-schema.sql
```

### 2. Start Backend (1 minute)
```bash
cd c:\hr-employee\backend
npm run dev
```
Server runs on: http://localhost:5000

### 3. Start Frontend (1 minute)
```bash
cd c:\hr-employee\frontend
npx http-server -p 8080
```
Or use VS Code Live Server extension

### 4. Access Application
```
http://localhost:8080
```
Direct access to dashboard - **No login required!**

---

## ✅ Features

- **Employee Management** - Add, edit, delete employees with auto codes (EMP2026001)
- **Attendance Tracking** - Daily attendance with check-in/out times
- **Leave Management** - Apply and approve/reject leaves
- **Holiday Calendar** - Year-wise holiday management
- **Department Management** - Organize by departments
- **Designation Management** - Job roles and titles
- **Employee Appreciations** - Awards and recognition

---

## 📁 Project Structure

```
c:\hr-employee/
├── database/
│   └── database-schema.sql          # Complete MSSQL schema
├── backend/                          # Node.js + Express
│   ├── controllers/                  # 7 modules
│   ├── routes/                       # API routes
│   ├── middleware/                   # Validation, errors
│   ├── config/                       # Database config
│   └── server.js                     # Express server
└── frontend/                         # HTML + CSS + JS
    ├── pages/                        # 7 module pages
    ├── scripts/api.js                # API client
    ├── styles/main.css               # Responsive CSS
    └── index.html                    # Dashboard
```

---

## 🔌 API Endpoints

All endpoints work without authentication:

### Employees
- `GET /api/employees` - List all
- `POST /api/employees` - Create
- `PUT /api/employees/:id` - Update
- `DELETE /api/employees/:id` - Delete

### Attendance
- `GET /api/attendance` - List records
- `POST /api/attendance` - Mark attendance
- `GET /api/attendance/report/monthly` - Monthly report

### Leaves
- `GET /api/leaves` - List leaves
- `POST /api/leaves` - Apply leave
- `PUT /api/leaves/:id/status` - Approve/Reject
- `GET /api/leaves/types/all` - Leave types

### Holidays, Departments, Designations, Appreciations
- Full CRUD operations for all modules

---

## 🎯 Key Features

✅ **No Authentication** - Direct access to all features  
✅ **Auto Employee Codes** - EMP{YEAR}{SEQUENCE} format  
✅ **Responsive Design** - Works on all devices  
✅ **Modern UI** - Clean, professional interface  
✅ **Real-time Updates** - Instant data refresh  
✅ **MSSQL Database** - Robust data storage  

---

## 🛠️ Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: Microsoft SQL Server
- **Frontend**: HTML5 + CSS3 + Vanilla JavaScript
- **Architecture**: MVC Pattern

---

## 📝 Configuration

### Database (.env)
```env
DB_SERVER=localhost
DB_DATABASE=HRMS
DB_USER=sa
DB_PASSWORD=YourPassword
DB_PORT=1433
```

### Frontend (scripts/api.js)
```javascript
const API_BASE_URL = 'http://localhost:5000/api';
```

---

## 🚀 Production Deployment

1. Update database connection in `.env`
2. Set `NODE_ENV=production`
3. Build and deploy backend to your server
4. Deploy frontend to static hosting (Netlify, Vercel, etc.)
5. Update `API_BASE_URL` in frontend

---

## 📊 Database Schema

- **Employees** - Employee profiles
- **Departments** - Department organization
- **Designations** - Job roles
- **Attendance** - Daily attendance records
- **LeaveTypes** - Leave categories
- **Leaves** - Leave applications
- **Holidays** - Holiday calendar
- **Appreciations** - Employee awards

All tables include audit fields (CreatedAt, UpdatedAt) and soft delete support.

---

## 🎉 Ready to Use!

No setup complexity - just run and start managing your HR data!

**Built with ❤️ - Simple, Fast, Effective**
