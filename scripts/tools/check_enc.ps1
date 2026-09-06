$path = 'c:\Partage\Projet\signaid-studio\src\components\CustomizerView.tsx'
# Read with correct encoding (UTF-16 LE / Unicode)
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::Unicode)
$lines = $content -split "`r`n"

Write-Host "Line 3915: '$($lines[3915])'"
Write-Host "Line 3916: '$($lines[3916])'"
Write-Host "Total lines: $($lines.Count)"
