$path = 'c:\Partage\Projet\Signaid V24\src\components\CustomizerView.tsx'
$content = Get-Content -Raw $path
$lines = $content -split "`r`n"

# Lines are 0-indexed in array, so line 3916 = index 3915, etc.
$lines[3915] = '                         </div>'
$lines[3916] = '                         </div>'
$lines[3917] = '                         )}'

$newContent = $lines -join "`r`n"
Set-Content -Path $path -Value $newContent -NoNewline -Encoding UTF8
Write-Host "Done"
