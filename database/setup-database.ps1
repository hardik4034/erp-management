# PowerShell script to execute SQL files using sqlcmd
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Database Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Database connection details
$server = "localhost"
$database = "HRMS"

# SQL files to execute in order
$sqlFiles = @(
    "c:\hr-employee\database\payroll-schema.sql",
    "c:\hr-employee\database\payroll-procedures.sql",
    "c:\hr-employee\database\payroll-bulk-procedures.sql",
    "c:\hr-employee\database\employee-salary-schema.sql",
    "c:\hr-employee\database\employee-salary-procedures.sql"
)

Write-Host "Checking SQL Server connection..." -ForegroundColor Yellow

# Test connection
$testQuery = "SELECT @@VERSION"
$result = sqlcmd -S $server -d $database -E -Q $testQuery -h -1 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Connected to SQL Server successfully!" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "Failed to connect to SQL Server" -ForegroundColor Red
    Write-Host "Make sure SQL Server is running" -ForegroundColor Red
    Write-Host ""
    pause
    exit 1
}

# Execute each SQL file
foreach ($file in $sqlFiles) {
    $fileName = Split-Path $file -Leaf
    
    if (Test-Path $file) {
        Write-Host "Executing: $fileName" -ForegroundColor Yellow
        
        sqlcmd -S $server -d $database -E -i $file
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  SUCCESS: $fileName" -ForegroundColor Green
        } else {
            Write-Host "  FAILED: $fileName (exit code: $LASTEXITCODE)" -ForegroundColor Red
        }
        
        Write-Host ""
    } else {
        Write-Host "  File not found: $file" -ForegroundColor Red
        Write-Host ""
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Backend server should auto-restart" -ForegroundColor White
Write-Host "2. Refresh your browser page" -ForegroundColor White
Write-Host "3. Payroll page should now work!" -ForegroundColor White
Write-Host ""
pause
