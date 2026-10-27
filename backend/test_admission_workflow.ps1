$ErrorActionPreference = "Stop"

Write-Host "=== Testing Doctor Admission Order & Bed Assignment Workflow ===" -ForegroundColor Cyan

# 1. Login as admin to find users and tokens
$adminLoginPayload = @{
    username = "admin"
    password = "Admin@123"
} | ConvertTo-Json

$loginRes = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -Body $adminLoginPayload -ContentType "application/json"
$adminToken = $loginRes.accessToken
Write-Host "1. Admin Login Successful. Token obtained." -ForegroundColor Green

# Also login as doctor
$doctorLoginPayload = @{
    username = "dr.smith"
    password = "Doctor@123"
} | ConvertTo-Json

$docLoginRes = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -Body $doctorLoginPayload -ContentType "application/json"
$doctorToken = $docLoginRes.accessToken
Write-Host "2. Doctor Login Successful (Dr. $($docLoginRes.fullName)). Token obtained." -ForegroundColor Green

# 3. Find an outpatient and an available bed
$patients = Invoke-RestMethod -Uri "http://localhost:8080/api/patients" -Method Get -Headers @{ Authorization = "Bearer $adminToken" }
$testPatient = $patients | Where-Object { $_.status -ne "INPATIENT" } | Select-Object -First 1
Write-Host "Selected Test Patient: $($testPatient.name) (ID: $($testPatient.id), Status: $($testPatient.status))" -ForegroundColor Yellow

$availBeds = Invoke-RestMethod -Uri "http://localhost:8080/api/beds/available" -Method Get -Headers @{ Authorization = "Bearer $adminToken" }
$testBed = $availBeds | Select-Object -First 1
Write-Host "Selected Available Bed: Bed $($testBed.bedNumber) (ID: $($testBed.id), Ward: $($testBed.wardName))" -ForegroundColor Yellow

# 4. TEST: Attempt to assign bed WITHOUT admission order (must fail)
Write-Host "`n4. Testing Direct Bed Assignment without Admission Order (Expect 400)..." -ForegroundColor Cyan
$directAssignPayload = @{
    bedId = $testBed.id
    patientId = $testPatient.id
} | ConvertTo-Json

try {
    $failRes = Invoke-RestMethod -Uri "http://localhost:8080/api/beds/assign" -Method Post -Body $directAssignPayload -ContentType "application/json" -Headers @{ Authorization = "Bearer $adminToken" }
    Write-Host "ERROR: Bed assignment should have failed without an admission order!" -ForegroundColor Red
    exit 1
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Successfully blocked with status: $statusCode. Expected behavior!" -ForegroundColor Green
}

# 5. TEST: Doctor creates an Inpatient Admission Order
Write-Host "`n5. Doctor creates Inpatient Admission Order..." -ForegroundColor Cyan
$orderPayload = @{
    patientId = $testPatient.id
    diagnosis = "Acute exacerbation of chronic bronchitis with severe hypoxemia"
    recommendedWardType = "GENERAL"
    priority = "URGENT"
    notes = "Start supplemental O2, nebulization Q4H, IV steroids. Monitor ABG."
} | ConvertTo-Json

$orderRes = Invoke-RestMethod -Uri "http://localhost:8080/api/admissions/orders" -Method Post -Body $orderPayload -ContentType "application/json" -Headers @{ Authorization = "Bearer $doctorToken" }
Write-Host "Admission Order Created! ID: $($orderRes.id), Status: $($orderRes.status), Priority: $($orderRes.priority)" -ForegroundColor Green

# 6. TEST: Check pending orders queue
Write-Host "`n6. Checking Pending Admission Orders Queue..." -ForegroundColor Cyan
$pendingOrders = Invoke-RestMethod -Uri "http://localhost:8080/api/admissions/orders/pending" -Method Get -Headers @{ Authorization = "Bearer $adminToken" }
$foundPending = $pendingOrders | Where-Object { $_.id -eq $orderRes.id }
if ($foundPending) {
    Write-Host "Order $($orderRes.id) found in pending queue for patient $($foundPending.patientName)!" -ForegroundColor Green
} else {
    Write-Host "ERROR: Order not found in pending queue!" -ForegroundColor Red
    exit 1
}

# 7. TEST: Nurse/Admin assigns bed now that order exists
Write-Host "`n7. Assigning Bed to Patient with Valid Admission Order..." -ForegroundColor Cyan
$assignRes = Invoke-RestMethod -Uri "http://localhost:8080/api/beds/assign" -Method Post -Body $directAssignPayload -ContentType "application/json" -Headers @{ Authorization = "Bearer $adminToken" }
Write-Host "Bed Assignment Succeeded! Bed $($assignRes.bedNumber) is now $($assignRes.status)" -ForegroundColor Green

# 8. TEST: Verify patient status is INPATIENT and order is BED_ASSIGNED
Write-Host "`n8. Verifying Patient Status & Order Status Transition..." -ForegroundColor Cyan
$updatedPatient = Invoke-RestMethod -Uri "http://localhost:8080/api/patients/$($testPatient.id)" -Method Get -Headers @{ Authorization = "Bearer $adminToken" }
Write-Host "Patient Status is now: $($updatedPatient.status) (Expected: INPATIENT)" -ForegroundColor Green

$patientOrders = Invoke-RestMethod -Uri "http://localhost:8080/api/admissions/orders/patient/$($testPatient.id)" -Method Get -Headers @{ Authorization = "Bearer $adminToken" }
$fulfilledOrder = $patientOrders | Where-Object { $_.id -eq $orderRes.id }
Write-Host "Admission Order Status is now: $($fulfilledOrder.status) (Assigned Bed: $($fulfilledOrder.assignedBedNumber), Ward: $($fulfilledOrder.assignedWardName))" -ForegroundColor Green

if ($fulfilledOrder.status -eq "BED_ASSIGNED" -and $updatedPatient.status -eq "INPATIENT") {
    Write-Host "`n>>> ALL ADMISSION ORDER WORKFLOW TESTS PASSED PERFECTLY! <<<" -ForegroundColor Green
} else {
    Write-Host "`n>>> TEST FAILED: State transition mismatch <<<" -ForegroundColor Red
    exit 1
}


# 9. Clean up: Release bed for subsequent tests
Write-Host "`n9. Cleaning up test bed assignment..." -ForegroundColor Cyan
$releaseRes = Invoke-RestMethod -Uri "http://localhost:8080/api/beds/$($testBed.id)/release" -Method Post -Headers @{ Authorization = "Bearer $adminToken" }
Write-Host "Bed $($testBed.bedNumber) released back to $($releaseRes.status)." -ForegroundColor Green
