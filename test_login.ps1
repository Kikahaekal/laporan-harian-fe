$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$cookieUrl = "http://localhost:8000/sanctum/csrf-cookie"
$loginUrl = "http://localhost:8000/login"

try {
    Write-Host "1. Getting CSRF cookie..."
    $resp1 = Invoke-WebRequest -Uri $cookieUrl -SessionVariable session -Method Get
    Write-Host "Status: $($resp1.StatusCode)"
    
    $cookies = $session.Cookies.GetCookies($cookieUrl)
    $xsrfToken = $cookies | Where-Object { $_.Name -eq "XSRF-TOKEN" } | Select-Object -ExpandProperty Value
    
    if (-not $xsrfToken) {
        Write-Host "ERROR: XSRF-TOKEN cookie not found!"
        $cookies | Format-Table
    } else {
        Write-Host "XSRF-TOKEN found: $xsrfToken"
        # Decode the token because it's URL encoded in the cookie but needs to be sent as header
        $decodedToken = [System.Net.WebUtility]::UrlDecode($xsrfToken)
        Write-Host "Decoded Token: $decodedToken"

        Write-Host "2. Attempting Login..."
        $body = @{
            email = "john@example.com"
            password = "password"
        } | ConvertTo-Json

        $headers = @{
            "X-XSRF-TOKEN" = $decodedToken
            "Content-Type" = "application/json"
            "Accept" = "application/json"
        }

        try {
            # Use -SessionVariable session again? No, -WebSession $session
            $resp2 = Invoke-WebRequest -Uri $loginUrl -WebSession $session -Method Post -Body $body -Headers $headers -ErrorAction Stop
            Write-Host "Login Status: $($resp2.StatusCode)"
            Write-Host "Body: $($resp2.Content)"
        } catch {
                if ($stream) {
                    $reader = New-Object System.IO.StreamReader($stream)
                    $errBody = $reader.ReadToEnd()
                    Write-Host "Error Body Start"
                    Write-Host $errBody
                    Write-Host "Error Body End"
                }
        }
    }
} catch {
    Write-Host "Error in step 1: $_"
}
