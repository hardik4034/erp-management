# Create New SQL User for HRMS

Run these commands in **SQL Server Management Studio (SSMS)**:

1. Open SSMS and connect with Windows Authentication
2. Click **New Query**
3. Copy and paste these commands:

```sql
-- Create a new login with password
CREATE LOGIN hrms_user WITH PASSWORD = 'Hrms@2026';

-- Switch to the hr_employee database
USE hr_employee;

-- Create a user for the login
CREATE USER hrms_user FOR LOGIN hrms_user;

-- Give the user full permissions on the database
ALTER ROLE db_owner ADD MEMBER hrms_user;

-- Verify the user was created
SELECT name, type_desc, create_date
FROM sys.database_principals
WHERE name = 'hrms_user';
```

4. Click **Execute** (or press F5)
5. You should see "Commands completed successfully"

## What This Does:

- Creates a new SQL Server login called `hrms_user`
- Password: `Hrms@2026`
- Gives it full access to the `hr_employee` database
- This avoids SA account issues

## After Running:

Your `.env` file has been updated to use:

- `DB_USER=hrms_user`
- `DB_PASSWORD=Hrms@2026`

The backend should connect successfully after you run these SQL commands!
