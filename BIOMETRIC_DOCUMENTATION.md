# 🔐 Biometric Integration — Complete Documentation

> **System:** HRMS | **Device Provider:** eSSL | **Cloud:** ADMS API  
> **Backend:** Node.js + MSSQL | **Last Updated:** March 2026

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Backend Files](#backend-files)
5. [API Reference](#api-reference)
6. [Environment Configuration](#environment-configuration)
7. [Scheduler (Auto Sync)](#scheduler-auto-sync)
8. [Setup Guide (Step-by-Step)](#setup-guide)
9. [Stored Procedure — sp_ProcessBiometricLogs](#stored-procedure)
10. [Frontend — Biometric Settings Page](#frontend)
11. [Data Flow](#data-flow)
12. [Employee Mapping](#employee-mapping)
13. [Troubleshooting](#troubleshooting)
14. [Security Notes](#security-notes)
15. [Verification Checklist](#verification-checklist)

---

## Overview

The HRMS uses **eSSL ADMS Cloud API** to connect biometric attendance devices without requiring IP addresses, ports, or LAN configuration. You only provide the **Device ID/Serial Number** — the ADMS cloud handles all communication with the physical device.

### How It Works (High Level)

```
[eSSL Device] ──pushes punches──► [eSSL ADMS Cloud]
                                         │
                                    API credentials
                                         │
[HRMS Backend] ─────pulls logs──────────►│
      │
      ▼
[biometric_logs table] ── sp_ProcessBiometricLogs ──► [Attendance table]
```

---

## Architecture

```
backend/
├── controllers/
│   └── biometricController.js    ← Request handlers (7 endpoints)
├── routes/
│   └── biometricRoutes.js        ← Express route definitions
├── services/
│   ├── esslAdmsService.js        ← ADMS HTTP API client
│   └── schedulerService.js       ← Cron-based auto sync
└── .env                          ← Credentials & cron schedule

database/
├── biometric_schema.sql          ← Table / view creation
└── sp_ProcessBiometricLogs.sql   ← Raw logs → Attendance records

frontend/
└── pages/
    └── biometric-settings.html   ← Device management UI
```

---

## Database Schema

### Table: `biometric_devices`

Stores all registered eSSL devices.

| Column | Type | Description |
|---|---|---|
| `id` | INT (PK) | Auto-increment ID |
| `device_id` | NVARCHAR(100) UNIQUE | eSSL Serial / Device ID |
| `device_name` | NVARCHAR(200) | Friendly name from ADMS |
| `status` | NVARCHAR(50) | `active` / `inactive` / `error` |
| `last_sync` | DATETIME | Last successful sync time |
| `created_at` | DATETIME | Registration timestamp |
| `updated_at` | DATETIME | Last update timestamp |

---

### Table: `biometric_logs`

Stores raw punch-in / punch-out logs fetched from ADMS.

| Column | Type | Description |
|---|---|---|
| `id` | INT (PK) | Auto-increment ID |
| `device_id` | NVARCHAR(100) (FK) | References `biometric_devices.device_id` |
| `biometric_user_id` | NVARCHAR(50) | User ID enrolled on the device |
| `punch_time` | DATETIME | Exact punch timestamp |
| `punch_type` | NVARCHAR(20) | `IN`, `OUT`, or `BREAK` |
| `raw_json` | NVARCHAR(MAX) | Original ADMS API payload |
| `processed` | BIT | `0` = pending, `1` = processed to Attendance |
| `created_at` | DATETIME | Log creation time |

**Indexes:**
- `IX_biometric_logs_device_user` — on `(device_id, biometric_user_id)`
- `IX_biometric_logs_punch_time` — on `punch_time`
- `IX_biometric_logs_processed` — on `processed`

---

### Column added to `Employees`

```sql
BiometricId   NVARCHAR(50) NULL  -- UNIQUE index, links employee to device user
```

---

### View: `vw_employee_biometric_attendance`

Joins `Employees` and `biometric_logs` for reporting.

```sql
SELECT e.EmployeeId, e.FirstName, e.BiometricId,
       bl.device_id, bl.punch_time, bl.punch_type, bl.processed
FROM Employees e
INNER JOIN biometric_logs bl ON e.BiometricId = bl.biometric_user_id
WHERE e.BiometricId IS NOT NULL;
```

---

## Backend Files

### `services/esslAdmsService.js`
Handles all HTTP communication with the eSSL ADMS Cloud API:
- `validateDevice(deviceId)` — Checks if device exists in ADMS
- `fetchAttendanceLogs(deviceId, startDate, endDate)` — Pulls punch logs

### `services/schedulerService.js`
Runs automated cron jobs using schedules from `.env`:
- `syncAllDevices()` — Syncs all active devices from ADMS → `biometric_logs`
- `processLogs()` — Calls `sp_ProcessBiometricLogs` to move logs → `Attendance`

### `controllers/biometricController.js`
7 request handlers — see [API Reference](#api-reference) below.

### `routes/biometricRoutes.js`
Maps HTTP verbs + paths to controller functions.

---

## API Reference

Base URL: `http://localhost:5000/api/biometric`

---

### 1. Connect Device

```http
POST /api/biometric/connect
Content-Type: application/json

{ "deviceId": "ESSL123456789" }
```

**What it does:** Validates the device via ADMS API, then registers it in `biometric_devices`.

| Status | Meaning |
|---|---|
| `201` | Device connected successfully |
| `400` | Missing deviceId or ADMS validation failed |
| `409` | Device already connected |
| `503` | ADMS credentials not configured |

**Response (201):**
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

### 2. Get All Devices

```http
GET /api/biometric/devices
```

Returns all devices with live stats (log count, unprocessed log count).

**Response (200):**
```json
{
  "success": true,
  "credentialsConfigured": true,
  "devices": [
    {
      "id": 1,
      "device_id": "ESSL123456789",
      "device_name": "Main Office",
      "status": "active",
      "last_sync": "2026-03-13T08:30:00",
      "log_count": 280,
      "unprocessed_count": 14
    }
  ]
}
```

---

### 3. Delete Device

```http
DELETE /api/biometric/devices/:deviceId
```

Permanently removes a device and its associated logs (CASCADE).

---

### 4. Sync Attendance (Single Device)

```http
POST /api/biometric/sync/:deviceId?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

- Without date params, defaults to the **last 7 days**.
- Duplicate punches are automatically skipped.

**Response (200):**
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

### 5. Sync All Active Devices

```http
POST /api/biometric/sync-all
```

Triggers `syncAllDevices()` in the background. Returns `202 Accepted` immediately; check server logs for progress.

---

### 6. Process Logs → Attendance

```http
POST /api/biometric/process
Content-Type: application/json

{
  "startDate": "2026-03-01",   // optional
  "endDate":   "2026-03-13",   // optional
  "deviceId":  "ESSL123456789" // optional
}
```

Executes `sp_ProcessBiometricLogs` stored procedure. Converts unprocessed `biometric_logs` rows into `Attendance` records.

**Response (200):**
```json
{
  "success": true,
  "message": "Biometric logs processed successfully",
  "summary": { "ProcessedCount": 42, "ErrorCount": 0 }
}
```

---

### 7. Get Unmapped IDs

```http
GET /api/biometric/unmapped
```

Returns two lists:
1. Biometric user IDs in `biometric_logs` that don't match any employee's `BiometricId`
2. Active employees who have no `BiometricId` set

**Response (200):**
```json
{
  "success": true,
  "unmappedBiometricIds": [
    { "biometricUserId": "99", "logCount": 12, "firstSeen": "...", "lastSeen": "..." }
  ],
  "employeesWithoutBiometricId": [
    { "EmployeeId": 5, "EmployeeCode": "EMP2026005", "FullName": "Ravi Patel", "BiometricId": null }
  ],
  "summary": { "unmappedLogCount": 1, "employeesWithoutId": 4 }
}
```

---

### 8. Integration Status / Health Check

```http
GET /api/biometric/status
```

**Response (200):**
```json
{
  "success": true,
  "credentialsConfigured": true,
  "schedulerEnabled": true,
  "syncSchedule": "30 0 * * *",
  "processSchedule": "0 1 * * *",
  "stats": {
    "activeDevices": 2,
    "unprocessedLogs": 14,
    "processedLogs": 1284,
    "lastSync": "2026-03-13T00:30:00",
    "mappedEmployees": 18,
    "unmappedEmployees": 3
  }
}
```

---

## Environment Configuration

Configure these in `backend/.env`:

```bash
# ─── eSSL ADMS API ────────────────────────────────────────
ESSL_ADMS_API_URL=//192.168.1.100:8080     # Your ADMS server URL
ESSL_ADMS_API_KEY=your_api_key_here        # API Key (from ADMS dashboard)
ESSL_ADMS_TOKEN=abc123xyz                  # Bearer Token (alternative to API Key)

# ─── Scheduler ─────────────────────────────────────────────
BIOMETRIC_SCHEDULER_ENABLED=true           # true / false
BIOMETRIC_SYNC_CRON=30 0 * * *            # Pull logs daily at 00:30
BIOMETRIC_PROCESS_CRON=0 1 * * *          # Process logs daily at 01:00
BIOMETRIC_SYNC_DAYS_BACK=7                 # How many days back to fetch
```

> **Note:** You need either `ESSL_ADMS_API_KEY` **or** `ESSL_ADMS_TOKEN`, not both. The system checks that neither is still set to a placeholder value.

---

## Scheduler (Auto Sync)

The `schedulerService.js` runs two automatic jobs:

| Job | Cron | What it does |
|---|---|---|
| **Sync** | `30 0 * * *` (12:30 AM) | Fetches fresh punch logs from all active ADMS devices into `biometric_logs` |
| **Process** | `0 1 * * *` (1:00 AM) | Runs `sp_ProcessBiometricLogs` to convert raw logs into `Attendance` records |

> You can change these schedules in `.env` without touching the code.  
> To disable the scheduler: set `BIOMETRIC_SCHEDULER_ENABLED=false`

---

## Setup Guide

### Step 1 — Run the Database Schema

Run once from SSMS or use the Node.js runner:

```bash
cd backend
node create-biometric-sp.js
```

**Creates:**
- `biometric_devices` table
- `biometric_logs` table
- `BiometricId` column on `Employees`
- `vw_employee_biometric_attendance` view
- `sp_ProcessBiometricLogs` stored procedure

---

### Step 2 — Configure ADMS Credentials

1. Log in to your **eSSL ADMS** account dashboard
2. Navigate to **API Settings** / Developer section
3. Copy your **API Key** or **Bearer Token**
4. Open `backend/.env` and fill in:

```bash
ESSL_ADMS_API_URL=https://your-adms-server:8080
ESSL_ADMS_TOKEN=your_actual_token_here
```

---

### Step 3 — Restart Backend

```bash
# Stop the running server (Ctrl+C), then:
npm run dev
```

---

### Step 4 — Open Biometric Settings Page

```
http://localhost:8080/pages/biometric-settings.html
```

---

### Step 5 — Connect Your Device

1. Copy the **Device ID / Serial Number** from the back of your eSSL device
2. Enter it in the **"Connect Device"** field
3. Click **Connect**
4. Device appears in the Connected Devices table

---

### Step 6 — Map Employees to Biometric IDs

For each employee, set their `BiometricId` to match the user ID enrolled on the device:

```sql
UPDATE Employees
SET BiometricId = '12345'
WHERE EmployeeCode = 'EMP2026001';
```

Or use the **Unmapped IDs** API endpoint to find who still needs mapping.

---

### Step 7 — Sync & Process

Either wait for the nightly scheduler, or trigger manually:

```bash
# Manual sync via API
POST /api/biometric/sync-all

# Manual process via API
POST /api/biometric/process
```

---

## Stored Procedure

### `sp_ProcessBiometricLogs`

**File:** `database/sp_ProcessBiometricLogs.sql`

**Purpose:** Converts raw punch records in `biometric_logs` into structured `Attendance` rows.

**Parameters (all optional):**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `@StartDate` | DATE | Yesterday | Start of log range |
| `@EndDate` | DATE | Today | End of log range |
| `@DeviceId` | NVARCHAR | All devices | Filter by specific device |

**Logic:**
1. Selects unprocessed logs matching the date/device filter
2. Joins with `Employees` on `BiometricId = biometric_user_id`
3. Determines Check-In (earliest punch) and Check-Out (latest punch) per employee per day
4. Inserts/updates the `Attendance` table
5. Marks processed logs with `processed = 1`
6. Returns a summary row with `ProcessedCount` and `ErrorCount`

---

## Frontend

### `frontend/pages/biometric-settings.html`

The UI for managing biometric devices and monitoring sync status.

**Features:**
- Integration status dashboard (active devices, log counts, last sync)
- Connect new device (enter Device ID → connect)
- Connected Devices table (status, last sync, log count, Sync Now / Delete actions)
- Unmapped IDs panel (biometric IDs not linked to any employee)
- Credential configuration status indicator

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: SYNC                                                   │
│                                                                 │
│  eSSL ADMS Cloud API  ──► esslAdmsService.fetchAttendanceLogs   │
│                                    │                           │
│                                    ▼                           │
│                           biometric_logs table (processed=0)   │
└─────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: PROCESS                                                │
│                                                                 │
│  biometric_logs (processed=0)                                   │
│       + Employees.BiometricId                                   │
│               │                                                 │
│        sp_ProcessBiometricLogs                                  │
│               │                                                 │
│               ▼                                                 │
│     Attendance table (CheckIn / CheckOut / Status)              │
│       biometric_logs.processed = 1                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Employee Mapping

Each employee must have their `BiometricId` set to the user ID they were enrolled with on the eSSL device.

**How to find unmapped employees:**
```http
GET /api/biometric/unmapped
```

**How to map via SQL:**
```sql
UPDATE Employees
SET BiometricId = '001'       -- ID from eSSL device enrollment
WHERE EmployeeCode = 'EMP2026001';
```

**How to map in bulk:**
```sql
-- Map by name (use carefully)
UPDATE e
SET e.BiometricId = m.BiometricId
FROM Employees e
JOIN (VALUES
    ('EMP2026001', '001'),
    ('EMP2026002', '002'),
    ('EMP2026003', '003')
) AS m(EmployeeCode, BiometricId)
ON e.EmployeeCode = m.EmployeeCode;
```

---

## Troubleshooting

### ❌ "eSSL ADMS credentials not configured"
- Check `ESSL_ADMS_API_URL`, `ESSL_ADMS_TOKEN` in `backend/.env`
- Make sure values don't contain placeholder text like `your_api_key_here`
- Restart the backend server after editing `.env`

### ❌ "Device validation failed"
- Verify the Device ID is correct (case-sensitive, no spaces)
- Ensure the device is registered in your ADMS account
- Confirm `ESSL_ADMS_API_URL` points to the right server

### ❌ "No attendance logs found" after sync
- Check the date range — default sync is last 7 days
- Confirm the device has recorded punches in ADMS dashboard
- Ensure device is online and pushing data to cloud

### ❌ Logs synced but Attendance table is empty
- Run `POST /api/biometric/process` manually
- Check `GET /api/biometric/unmapped` — employees may not have `BiometricId` set
- Review `sp_ProcessBiometricLogs` for errors

### ❌ Some employees not getting attendance
- Call `GET /api/biometric/unmapped` and check `unmappedBiometricIds`
- Match those IDs to your employees and update `BiometricId`

### ❌ Scheduler not running
- Set `BIOMETRIC_SCHEDULER_ENABLED=true` in `.env`
- Check `BIOMETRIC_SYNC_CRON` is valid cron syntax
- Restart the backend server

---

## Security Notes

| Practice | Detail |
|---|---|
| ✅ Parameterized queries | All DB queries use `mssql` typed inputs — no SQL injection risk |
| ✅ Credential guard | API returns `503` if credentials are placeholders, not actual errors |
| ✅ No IP exposure | ADMS cloud approach avoids exposing device IPs |
| ⚠️ `.env` in `.gitignore` | Never commit `backend/.env` to version control |
| ⚠️ HTTPS in production | Configure `ESSL_ADMS_API_URL` with `https://` in production |
| ⚠️ Role protection | Add `requireRole('admin', 'hr')` to all biometric API routes in production |

---

## Verification Checklist

- [ ] `biometric_schema.sql` executed — tables created in MSSQL
- [ ] `sp_ProcessBiometricLogs` exists in MSSQL
- [ ] `ESSL_ADMS_API_URL` set in `backend/.env`
- [ ] `ESSL_ADMS_TOKEN` or `ESSL_ADMS_API_KEY` set in `backend/.env`
- [ ] Backend restarted — no credential errors in console
- [ ] `GET /api/biometric/status` returns `credentialsConfigured: true`
- [ ] At least one device connected via Biometric Settings page
- [ ] Sync triggered — `biometric_logs` has rows
- [ ] Employees have `BiometricId` set
- [ ] `POST /api/biometric/process` runs successfully
- [ ] `Attendance` table has new records
- [ ] Nightly scheduler enabled (`BIOMETRIC_SCHEDULER_ENABLED=true`)

---

*For eSSL hardware or ADMS API support, contact your eSSL reseller or visit [eSSL Support](https://www.essl.co.in/support).*
