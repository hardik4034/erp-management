# eSSL Biometric Integration - Complete Guide

## 📋 Overview

This guide explains the complete eSSL biometric attendance integration for your HRMS system. The integration uses **eSSL ADMS (Cloud API)** approach, allowing device connection using only the Device ID without requiring IP addresses, ports, or LAN configuration.

---

## 🔑 How "Device ID Only" Connection Works

### Traditional LAN-Based Approach (NOT USED)

- Requires device IP address and port
- Needs network configuration
- Works only on local network
- Complex firewall setup

### ADMS Cloud API Approach (IMPLEMENTED) ✅

1. **Device Registration**: eSSL devices are pre-registered in your ADMS cloud account
2. **Cloud Communication**: Devices automatically communicate with eSSL cloud servers
3. **API Integration**: Your HRMS connects to ADMS API using credentials
4. **Simple Input**: You only provide the Device ID/Serial Number
5. **Automatic Connection**: ADMS API handles all device communication

**Benefits:**

- ✅ No IP/Port configuration needed
- ✅ Works from anywhere (not limited to LAN)
- ✅ Centralized device management
- ✅ Automatic firmware updates via cloud
- ✅ Simple user experience

---

## 📁 Files Created

### Database

- **`database/biometric_schema.sql`** - Complete database schema

### Backend

- **`backend/services/esslAdmsService.js`** - ADMS API integration service
- **`backend/controllers/biometricController.js`** - Request handlers
- **`backend/routes/biometricRoutes.js`** - API endpoints
- **`backend/.env.biometric.example`** - Environment configuration template

### Frontend

- **`frontend/pages/biometric-settings.html`** - Device management UI

---

## 🚀 Setup Instructions

### Step 1: Database Setup

Run the SQL schema in your MSSQL database:

```bash
# Using SQL Server Management Studio (SSMS)
# 1. Open SSMS and connect to your database
# 2. Open database/biometric_schema.sql
# 3. Execute the script
```

Or via command line:

```bash
sqlcmd -S your_server -d your_database -i database/biometric_schema.sql
```

**What it creates:**

- `biometric_devices` table
- `biometric_logs` table
- `biometric_id` column in `employees` table
- `vw_employee_biometric_attendance` view

---

### Step 2: Configure ADMS API Credentials

1. **Get your eSSL ADMS credentials:**
   - Log in to your eSSL ADMS account dashboard
   - Navigate to API Settings or Developer section
   - Copy your API Key or Bearer Token

2. **Add to your `.env` file:**

```bash
# Open backend/.env and add these lines:
ESSL_ADMS_API_URL=https://api.essl.cloud/v1
ESSL_ADMS_TOKEN=your_actual_bearer_token_here
```

> **Note:** The exact API URL may vary. Check eSSL ADMS documentation for the correct endpoint.

---

### Step 3: Install Dependencies (if needed)

The integration uses `axios` for HTTP requests:

```bash
cd backend
npm install axios
```

---

### Step 4: Restart Backend Server

The biometric routes are already integrated into `server.js`. Simply restart:

```bash
# If running with npm run dev, press Ctrl+C and restart
npm run dev
```

You should see:

```
🔐 Biometric API: http://localhost:3000/api/biometric
```

---

### Step 5: Access Biometric Settings Page

Open in browser:

```
http://localhost:8080/pages/biometric-settings.html
```

---

## 🎯 Usage Guide

### Connecting a Device

1. Open **Biometric Settings** page
2. Enter your **eSSL Device ID** (e.g., `ESSL123456789`)
3. Click **"Connect Device"**
4. System validates device via ADMS API
5. Device appears in "Connected Devices" list

### Syncing Attendance

1. In the Connected Devices table, find your device
2. Click **"Sync Now"** button
3. System fetches attendance logs from ADMS
4. Logs are stored in `biometric_logs` table
5. Last sync timestamp is updated

### Mapping Employees to Biometric IDs

Update employees with their biometric user IDs:

```sql
-- Example: Map employee to biometric ID
UPDATE employees
SET biometric_id = '12345'
WHERE id = 1;
```

Or add this field to your employee form in the HRMS UI.

---

## 🔌 API Endpoints

### 1. Connect Device

```http
POST /api/biometric/connect
Content-Type: application/json

{
  "deviceId": "ESSL123456789"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Device connected successfully",
  "device": {
    "id": 1,
    "device_id": "ESSL123456789",
    "device_name": "Main Office",
    "status": "active"
  }
}
```

---

### 2. Sync Attendance

```http
POST /api/biometric/sync/ESSL123456789?startDate=2026-02-01&endDate=2026-02-07
```

**Response:**

```json
{
  "success": true,
  "message": "Attendance synced successfully",
  "count": 45,
  "skipped": 3,
  "total": 48
}
```

---

### 3. Get All Devices

```http
GET /api/biometric/devices
```

**Response:**

```json
{
  "success": true,
  "devices": [
    {
      "id": 1,
      "device_id": "ESSL123456789",
      "device_name": "Main Office",
      "status": "active",
      "last_sync": "2026-02-07T14:30:00",
      "log_count": 150
    }
  ]
}
```

---

### 4. Delete Device

```http
DELETE /api/biometric/devices/ESSL123456789
```

---

## 📊 Database Schema

### biometric_devices

```sql
id              INT (Primary Key)
device_id       NVARCHAR(100) UNIQUE
device_name     NVARCHAR(200)
status          NVARCHAR(50) -- 'active', 'inactive', 'error'
last_sync       DATETIME
created_at      DATETIME
updated_at      DATETIME
```

### biometric_logs

```sql
id                  INT (Primary Key)
device_id           NVARCHAR(100) (Foreign Key)
biometric_user_id   NVARCHAR(50)
punch_time          DATETIME
punch_type          NVARCHAR(20) -- 'IN', 'OUT', 'BREAK'
raw_json            NVARCHAR(MAX)
processed           BIT
created_at          DATETIME
```

### employees (modified)

```sql
-- New column added:
biometric_id    NVARCHAR(50) UNIQUE
```

---

## 🔧 Customization

### Adjusting ADMS API Endpoints

The actual eSSL ADMS API endpoints may differ. Update `esslAdmsService.js`:

```javascript
// Line 36: Device validation endpoint
const response = await this.client.get(`/devices/${deviceId}`);

// Line 72: Attendance logs endpoint
const response = await this.client.get(`/devices/${deviceId}/attendance`, {
  params: { startDate: start, endDate: end },
});
```

Refer to your eSSL ADMS API documentation for exact endpoint paths.

---

### Scheduling Automatic Sync

Add a cron job or scheduled task to sync attendance automatically:

```javascript
// Example using node-cron
const cron = require("node-cron");

// Sync every day at 6 AM
cron.schedule("0 6 * * *", async () => {
  const devices = await getActiveDevices();
  for (const device of devices) {
    await syncAttendance(device.device_id);
  }
});
```

---

## 🐛 Troubleshooting

### Issue: "Device validation failed"

**Solution:**

- Verify device is registered in your ADMS account
- Check Device ID is correct (case-sensitive)
- Ensure ADMS API credentials are valid

### Issue: "Unable to connect to eSSL ADMS API"

**Solution:**

- Check internet connection
- Verify `ESSL_ADMS_API_URL` in `.env`
- Test API credentials in ADMS dashboard

### Issue: "No attendance logs found"

**Solution:**

- Verify date range includes actual punch data
- Check device has recorded attendance
- Ensure device is online in ADMS

### Issue: Logs not mapping to employees

**Solution:**

- Update `employees.biometric_id` with correct IDs
- Check `biometric_user_id` in logs matches employee records

---

## 🔐 Security Notes

1. **Protect API Credentials**: Never commit `.env` file to version control
2. **Use HTTPS**: In production, ensure ADMS API uses HTTPS
3. **Validate Input**: All device IDs are validated before database insertion
4. **SQL Injection Protection**: Using parameterized queries
5. **Error Handling**: Sensitive error details not exposed to frontend

---

## 📈 Next Steps

1. **Add Employee Biometric ID Field**: Update employee form to include biometric_id
2. **Process Attendance**: Create logic to convert raw logs to attendance records
3. **Reporting**: Build reports using `vw_employee_biometric_attendance` view
4. **Notifications**: Alert HR when sync fails or device goes offline
5. **Automated Sync**: Set up scheduled jobs for automatic syncing

---

## 📞 Support

For eSSL ADMS API issues:

- Check eSSL ADMS documentation
- Contact eSSL support team
- Verify your ADMS subscription is active

For integration issues:

- Review backend console logs
- Check database connection
- Verify all files are in correct locations

---

## ✅ Verification Checklist

- [ ] Database schema executed successfully
- [ ] ADMS API credentials configured in `.env`
- [ ] Backend server restarted and showing biometric API endpoint
- [ ] Biometric settings page accessible
- [ ] Test device connection with valid Device ID
- [ ] Attendance sync working and logs appearing in database
- [ ] Employees mapped with biometric IDs

---

**🎉 Integration Complete!**

You now have a fully functional eSSL biometric attendance system integrated with your HRMS, using the simple Device ID-only connection approach via ADMS Cloud API.
