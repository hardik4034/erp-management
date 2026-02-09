# How to Get Payroll Data in Database and UI

## ✅ Current Status

Your database now has:

- ✅ CTC column added to Payroll table
- ✅ sp_GeneratePayroll procedure updated with @AddSewerageToSalary parameter
- ✅ Payroll records exist in the database
- ✅ Payroll components configured

## 🔍 Troubleshooting: Why Data Isn't Showing

If your payroll page shows an empty table, here are the steps to diagnose and fix:

### Step 1: Check Browser Console for Errors

1. Open the payroll page: `http://localhost:8080/pages/payroll.html`
2. Press `F12` to open Developer Tools
3. Click on the **Console** tab
4. Look for any red error messages

**Common errors and fixes:**

#### Error: "Failed to load payroll records"

- **Cause**: Backend API not responding
- **Fix**: Check if backend is running on port 5000
  ```powershell
  # In terminal, check if you see:
  # Server running on port 5000
  ```

#### Error: "Network Error" or "ERR_CONNECTION_REFUSED"

- **Cause**: Backend server not running
- **Fix**: Start the backend server
  ```powershell
  cd c:\hr-employee\backend
  npm run dev
  ```

#### Error: "Invalid column name 'CTC'"

- **Cause**: Database schema not updated
- **Fix**: Run the CTC column script
  ```powershell
  cd c:\hr-employee\backend
  node add-ctc-column.js
  ```

### Step 2: Check Network Tab

1. In Developer Tools, click the **Network** tab
2. Refresh the page
3. Look for the API call to `/api/payroll`
4. Click on it to see the response

**What to check:**

- Status Code should be `200 OK`
- Response should contain JSON data with payroll records
- If Status is `500`, check backend console for errors
- If Status is `404`, check if backend routes are configured

### Step 3: Verify Backend API

Open this URL in your browser:

```
http://localhost:5000/api/payroll
```

**Expected result:**

```json
{
  "success": true,
  "data": [
    {
      "PayrollId": 1,
      "EmployeeId": 1,
      "FirstName": "John",
      "LastName": "Doe",
      "NetSalary": 5000.00,
      "CTC": 6000.00,
      ...
    }
  ]
}
```

**If you see an error:**

- Check backend console logs
- Verify database connection
- Run diagnostic script:
  ```powershell
  cd c:\hr-employee\backend
  node check-payroll-data.js
  ```

### Step 4: Check Database Directly

Run this script to see what's in your database:

```powershell
cd c:\hr-employee\backend
node check-payroll-data.js
```

**If no records found:**

- Employees might not have salary configured
- Run setup script to generate sample data:
  ```powershell
  node setup-payroll-data.js
  ```

## 📝 How to Add Payroll Data

### Method 1: Using the UI (Recommended)

1. **Configure Employee Salaries First**
   - Go to `http://localhost:8080/pages/employee-salary.html`
   - For each employee, click "Edit" and set their salary
   - Example: Base Salary: $5000, Salary Type: Monthly

2. **Generate Payroll**
   - Go to `http://localhost:8080/pages/payroll.html`
   - In the "Generate Payroll" section:
     - Check/uncheck options as needed:
       - ☐ Include Expenses Claims
       - ☐ Add sewerage to salary
       - ☑ Use Attendance (recommended)
     - Select an employee from the dropdown
     - Click **Generate** button
   - Payroll record will appear in the table below

3. **Verify Data Appears**
   - The table should show:
     - Employee name with avatar
     - Net Salary (in green)
     - CTC (in blue)
     - Duration (date range)
     - Paid On date
     - Status badge
     - Actions menu (⋮)

### Method 2: Using Scripts (For Testing)

```powershell
cd c:\hr-employee\backend

# 1. Check current setup
node check-payroll-data.js

# 2. Generate sample payroll for all employees with salary
node setup-payroll-data.js

# 3. Verify data was created
node check-payroll-data.js
```

## 🔧 Complete Setup Checklist

Run these commands in order to ensure everything is set up:

```powershell
# Navigate to backend directory
cd c:\hr-employee\backend

# 1. Add CTC column to database
node add-ctc-column.js

# 2. Update stored procedure
node update-payroll-sp.js

# 3. Setup payroll components and generate sample data
node setup-payroll-data.js

# 4. Verify everything is working
node check-payroll-data.js
```

## 🌐 Testing the UI

After running the setup scripts:

1. **Open the payroll page:**

   ```
   http://localhost:8080/pages/payroll.html
   ```

2. **You should see:**
   - Filter dropdowns at the top (Year, Salary Cycle, Month)
   - Generate Payroll section with checkboxes
   - Table with payroll records
   - Pagination controls at the bottom

3. **Test filtering:**
   - Select "2026" for Year
   - Select "Monthly" for Salary Cycle
   - Select "January" for Month
   - Table should update automatically

4. **Test actions:**
   - Click the ⋮ button on any row
   - Click "View Details"
   - Modal should open showing full payroll breakdown

## 🐛 Common Issues and Solutions

### Issue: Table shows "Loading..." forever

**Diagnosis:**

- Open browser console (F12)
- Check for JavaScript errors

**Solutions:**

1. Hard refresh the page (Ctrl + F5)
2. Check if `payroll-redesign.css` is loading
3. Verify `api.js` and `auth.js` are loaded
4. Check backend is running on port 5000

### Issue: "No payroll records found" message

**Diagnosis:**

- Data doesn't exist in database

**Solutions:**

1. Run setup script:
   ```powershell
   node setup-payroll-data.js
   ```
2. Or generate payroll manually using the UI

### Issue: CTC column shows "N/A" or error

**Diagnosis:**

- CTC column not added to database

**Solution:**

```powershell
node add-ctc-column.js
```

### Issue: Generate button doesn't work

**Diagnosis:**

- Check browser console for errors
- Likely stored procedure parameter mismatch

**Solution:**

```powershell
node update-payroll-sp.js
```

## 📊 Expected Data Flow

```
1. User clicks "Generate" button
   ↓
2. Frontend sends POST request to /api/payroll/generate
   ↓
3. Backend calls sp_GeneratePayroll stored procedure
   ↓
4. Database creates payroll record with:
   - Base Salary (from Employees table)
   - Earnings (from PayrollComponents)
   - Deductions (from PayrollComponents)
   - CTC (computed: BaseSalary + TotalEarnings)
   - Net Salary (BaseSalary + Earnings - Deductions)
   ↓
5. Backend returns success response
   ↓
6. Frontend reloads payroll list
   ↓
7. Table displays new record with all columns
```

## 🎯 Quick Test

Run this complete test sequence:

```powershell
# 1. Setup everything
cd c:\hr-employee\backend
node add-ctc-column.js
node update-payroll-sp.js
node setup-payroll-data.js

# 2. Check data
node check-payroll-data.js

# 3. Open browser
start http://localhost:8080/pages/payroll.html
```

Then in the browser:

1. Press F12 to open DevTools
2. Check Console tab for errors
3. Check Network tab for API calls
4. Verify table shows data

## 📞 Still Having Issues?

If data still doesn't show:

1. **Take a screenshot of:**
   - The payroll page
   - Browser console (F12 → Console tab)
   - Network tab showing the /api/payroll request

2. **Run diagnostic:**

   ```powershell
   cd c:\hr-employee\backend
   node check-payroll-data.js > payroll-diagnostic.txt
   ```

3. **Check backend logs:**
   - Look at the terminal where `npm run dev` is running
   - Check for any error messages

4. **Verify all services are running:**
   - Backend: `http://localhost:5000` (should show API info)
   - Frontend: `http://localhost:8080` (should show pages)
   - Database: SQL Server should be running

## ✅ Success Indicators

You'll know everything is working when:

- ✅ Payroll page loads without errors
- ✅ Table shows employee records with avatars
- ✅ Net Salary displays in green
- ✅ CTC displays in blue
- ✅ Status badges show with colors
- ✅ Pagination shows "Showing X to Y of Z entries"
- ✅ Filters update the table when changed
- ✅ Generate button creates new payroll records
- ✅ Actions menu opens when clicking ⋮
- ✅ View Details modal shows full payroll breakdown

---

**Need more help?** Share the output of `node check-payroll-data.js` and any browser console errors.
