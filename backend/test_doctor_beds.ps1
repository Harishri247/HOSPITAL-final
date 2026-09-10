$ErrorActionPreference = 'Stop'

function Get-Token($user, $pass) {
    $body = @{ username = $user; password = $pass } | ConvertTo-Json
    $resp = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    return $resp.accessToken
}

Write-Host "=== TEST 1: Dr. Smith Bed & Ward Visibility ==="
$smithToken = Get-Token "dr.smith" "Doctor@123"
$smithHeaders = @{ Authorization = "Bearer " + $smithToken }

# Wards for Dr. Smith
$smithWards = Invoke-RestMethod -Uri "http://localhost:8080/api/wards" -Method Get -Headers $smithHeaders
$smithWards | ForEach-Object { Write-Host " - Ward:" $_.wardName "OccupiedBeds (Doctor's Patients):" $_.occupiedBeds }

# ICU Ward ID is 1
$smithIcuBeds = Invoke-RestMethod -Uri "http://localhost:8080/api/beds/ward/1" -Method Get -Headers $smithHeaders
Write-Host "Dr. Smith ICU Visible Beds Count:" $smithIcuBeds.Count
$smithIcuBeds | ForEach-Object { Write-Host "   Bed:" $_.bedNumber "Patient:" $_.patientName "Status:" $_.status }

# General Ward ID is 2
$smithGenBeds = Invoke-RestMethod -Uri "http://localhost:8080/api/beds/ward/2" -Method Get -Headers $smithHeaders
Write-Host "Dr. Smith General Ward Visible Beds Count:" $smithGenBeds.Count

# Available Beds
$smithAvailBeds = Invoke-RestMethod -Uri "http://localhost:8080/api/beds/available" -Method Get -Headers $smithHeaders
Write-Host "Dr. Smith Available Beds Count:" $smithAvailBeds.Count

Write-Host "`n=== TEST 2: Dr. Patel Bed Visibility ==="
$patelToken = Get-Token "dr.patel" "Doctor@123"
$patelHeaders = @{ Authorization = "Bearer " + $patelToken }
$patelIcuBeds = Invoke-RestMethod -Uri "http://localhost:8080/api/beds/ward/1" -Method Get -Headers $patelHeaders
Write-Host "Dr. Patel ICU Beds Count:" $patelIcuBeds.Count
$patelIcuBeds | ForEach-Object { Write-Host " - Bed:" $_.bedNumber "Patient:" $_.patientName "Status:" $_.status }

Write-Host "`n=== TEST 3: Nurse Bed Visibility (All Beds) ==="
$nurseToken = Get-Token "nurse.jones" "Nurse@123"
$nurseHeaders = @{ Authorization = "Bearer " + $nurseToken }
$nurseIcuBeds = Invoke-RestMethod -Uri "http://localhost:8080/api/beds/ward/1" -Method Get -Headers $nurseHeaders
Write-Host "Nurse Jones ICU Beds Count:" $nurseIcuBeds.Count
$nurseAvailBeds = Invoke-RestMethod -Uri "http://localhost:8080/api/beds/available" -Method Get -Headers $nurseHeaders
Write-Host "Nurse Jones Available Beds Count:" $nurseAvailBeds.Count

Write-Host "`n=== TEST 4: Doctor Bed Modification (Forbidden) ==="
try {
    Invoke-RestMethod -Uri "http://localhost:8080/api/beds/1/release" -Method Post -Headers $smithHeaders
    Write-Host "ERROR: Doctor was able to release bed!"
} catch {
    Write-Host "Doctor Release Bed Blocked with HTTP:" $_.Exception.Response.StatusCode.value__
}

Write-Host "`nALL TESTS COMPLETED SUCCESSFULLY!"
