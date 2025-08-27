param(
  [string]$RepoPath = "C:\playground\SpringBoot\rent-a-car",
  [string]$Profile = "local"
)

Write-Host "Starting backend at $RepoPath with profile $Profile..."
Push-Location $RepoPath
mvn -q -Dspring-boot.run.profiles=$Profile spring-boot:run
Pop-Location
