$htmlPath = "C:\Users\Dave\Downloads\Capstone UI\UI_dave_1\index.html"
$cssPath = "C:\Users\Dave\Downloads\Capstone UI\UI_dave_1\style.css"
$jsPath = "C:\Users\Dave\Downloads\Capstone UI\UI_dave_1\script.js"

$content = [IO.File]::ReadAllText($htmlPath)

$stylePattern = '(?is)<style>(.*?)</style>'
$scriptPattern = '(?is)<script>(.*?)</script>'

if ($content -match $stylePattern) {
    [IO.File]::WriteAllText($cssPath, $matches[1].Trim())
    $content = $content -replace $stylePattern, '<link rel="stylesheet" href="style.css" />'
}

if ($content -match $scriptPattern) {
    [IO.File]::WriteAllText($jsPath, $matches[1].Trim())
    $content = $content -replace $scriptPattern, '<script src="script.js"></script>'
}

[IO.File]::WriteAllText($htmlPath, $content)
Write-Output "Successfully separated HTML, CSS, and JS."
