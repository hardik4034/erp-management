# HRMS Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Setup Database (2 minutes)

1. Open **SQL Server Management Studio (SSMS)**
2. Connect to your SQL Server
3. Open and execute: `c:\hr-employee\database\database-schema.sql`
4. Verify database created:
   ```sql
   USE HRMS;
   SELECT COUNT(*) FROM Employees; -- Should show 0
   SELECT * FROM Roles; -- Should show Admin, HR, Employee
   ```

### Step 2: Start Backend (1 minute)

```bash
cd c:\hr-employee\backend

# Update .env file with your SQL Server password
# Then start the server:
npm run dev
```

✅ Look for: "🚀 HRMS Server Started Successfully" at http://localhost:5000

### Step 3: Start Frontend (1 minute)

```bash
cd c:\hr-employee\frontend

# Choose one:
python -m http.server 8080
# OR
npx http-server -p 8080
```

✅ Open browser: http://localhost:8080/login.html

---

## 🔐 Login

**Default Admin:**

- Email: `admin@hrms.com`
- Password: `Admin@123`

---

## ✅ What's Working Now

### Fully Functional

- ✅ **Login/Logout** - JWT authentication
- ✅ **Dashboard** - Stats and recent data
- ✅ **Employee Management** - Full CRUD with auto codes
- ✅ **All Backend APIs** - 40+ endpoints ready

### Backend APIs Ready (Test with Postman)

- ✅ Employees API
- ✅ Attendance API
- ✅ Leaves API
- ✅ Holidays API
- ✅ Departments API
- ✅ Designations API
- ✅ Appreciations API

---

## 📝 Next Steps (Optional)

Create remaining frontend pages (6 pages, ~2 hours):

- Attendance Management
- Leave Management
- Holiday Management
- Department Management
- Designation Management
- Appreciation Management

**Template**: Use `frontend/pages/employees.html` as reference

---

## 🧪 Quick Test

1. Login as admin
2. Go to Employees page
3. Click "Add Employee"
4. Fill form and save
5. See employee with code EMP2026001

---

## 📚 Full Documentation

- **Setup Guide**: `README.md`
- **Implementation Details**: `walkthrough.md`
- **API Docs**: See README.md

---

## 🆘 Troubleshooting

**Database connection failed?**

- Check SQL Server is running
- Update `backend/.env` with correct password
- Enable TCP/IP in SQL Server Configuration Manager

**Backend won't start?**

- Run `npm install` in backend folder
- Check port 5000 is not in use

**Frontend not loading?**

- Check backend is running on port 5000
- Update API_BASE_URL in `frontend/scripts/api.js` if needed

---

**Built with ❤️ - Ready to use!**
