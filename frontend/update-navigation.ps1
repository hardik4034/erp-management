# PowerShell script to add Payroll and Employee Salary navigation links to all pages

$pages = @(
    "c:\hr-employee\frontend\pages\leaves.html",
    "c:\hr-employee\frontend\pages\holidays.html",
    "c:\hr-employee\frontend\pages\departments.html",
    "c:\hr-employee\frontend\pages\designations.html",
    "c:\hr-employee\frontend\pages\appreciations.html",
    "c:\hr-employee\frontend\pages\attendance-by-member.html"
)

$payrollLink = '                <div class="nav-item"><a href="payroll.html" class="nav-link"><i>💰</i> Payroll</a></div>'
$salaryLink = '                <div class="nav-item"><a href="employee-salary.html" class="nav-link"><i>💵</i> Employee Salary</a></div>'

$holidaysPattern = '                <div class="nav-item"><a href="holidays.html"'

foreach ($page in $pages) {
    if (Test-Path $page) {
        $content = Get-Content $page -Raw
        
        # Check if already has payroll link
        if ($content -notmatch "payroll.html") {
            # Find the holidays link and add payroll/salary after it
            $content = $content -replace "($holidaysPattern[^\n]*\n\s*</div>\r?\n)", "`$1$payrollLink`r`n$salaryLink`r`n"
            
            Set-Content $page -Value $content -NoNewline
            Write-Host "Updated: $page" -ForegroundColor Green
        } else {
            Write-Host "Skipped (already has links): $page" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Not found: $page" -ForegroundColor Red
    }
}

Write-Host "`nDone! All pages updated." -ForegroundColor Cyan
