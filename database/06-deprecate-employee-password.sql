-- =====================================================================
-- Migration: Deprecate Employees.Password Column
-- Date:      2026-04-25
-- Reason:    Authentication is handled EXCLUSIVELY through the Users table
--            (solar_invest DB) via Users.password_hash.
--            The Employees.Password column is unused, creates confusion,
--            and is a security liability (stores plain-text or weakly
--            hashed passwords without the bcrypt rounds protection
--            applied to Users.password_hash).
--
-- Auth Flow (CORRECT):
--   Login → Users.password_hash (bcrypt, 12 rounds, solar_invest DB)
--   NOT  → Employees.Password  (HRMS DB) — DEPRECATED
--
-- Steps:
--   Step 1: Verify no application code uses Employees.Password
--   Step 2: Clear all existing values (security)
--   Step 3: Add a computed deprecation marker column
--   Step 4: Rename the column to make intent clear (optional)
--   Step 5: Remove the column entirely (final step — after verification)
-- =====================================================================

USE HRMS;
GO

-- ─── STEP 1: Safety check ────────────────────────────────────────────────────
-- Before running, confirm no stored procedures use Employees.Password
-- Run this query and inspect results:
SELECT
    OBJECT_NAME(object_id) AS SPName,
    definition
FROM sys.sql_modules
WHERE definition LIKE '%Employees%Password%'
  AND OBJECTPROPERTY(object_id, 'IsProcedure') = 1;
GO

-- ─── STEP 2: Null out all existing values (security hygiene) ─────────────────
-- This removes any stored passwords immediately — do this FIRST.
UPDATE Employees
SET [Password] = NULL
WHERE [Password] IS NOT NULL;
GO

PRINT 'Step 2 complete: All Employees.Password values cleared.';
GO

-- ─── STEP 3: Rename column to signal deprecation ─────────────────────────────
-- Makes it visible to any developer who queries the table that this is deprecated.
-- Comment this out if you prefer to go straight to Step 4 (drop).
EXEC sp_rename 'Employees.Password', 'Password_DEPRECATED', 'COLUMN';
GO

PRINT 'Step 3 complete: Column renamed to Password_DEPRECATED.';
GO

-- ─── STEP 4: DROP the column (run after verifying no references remain) ───────
-- !! ONLY run this after:
--    a) All application code is confirmed to NOT use Employees.Password
--    b) The rename in Step 3 has been in production for at least 1 sprint
--       with no reported errors
-- Uncomment to execute:
/*
ALTER TABLE Employees DROP COLUMN Password_DEPRECATED;
GO
PRINT 'Step 4 complete: Password_DEPRECATED column permanently removed.';
GO
*/

-- ─── STEP 5: Add documentation constraint ────────────────────────────────────
-- (Optional) Add an extended property to document the auth flow
EXEC sys.sp_addextendedproperty
    @name       = N'MS_Description',
    @value      = N'Authentication handled via Users.password_hash in solar_invest database. Do NOT add password storage here.',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE',  @level1name = N'Employees';
GO

PRINT '✅ Migration complete. Verify with: SELECT Password_DEPRECATED FROM Employees;';
GO
