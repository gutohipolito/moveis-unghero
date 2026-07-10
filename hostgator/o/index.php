<?php
/**
 * Serve o PDF em moveisunghero.com.br/o/{codigo} sem expor a URL da Vercel.
 *
 * Upload via cPanel: public_html/o/.htaccess + public_html/o/index.php
 */

function quote_pdf_share_code(): ?string
{
    if (!empty($_GET['code']) && preg_match('/^[a-zA-Z0-9]{6,12}$/', (string) $_GET['code'])) {
        return strtolower((string) $_GET['code']);
    }

    $uri = $_SERVER['REQUEST_URI'] ?? '';
    $path = parse_url($uri, PHP_URL_PATH) ?: '';

    if (preg_match('#/o/([a-zA-Z0-9]{6,12})/?$#', $path, $matches)) {
        return strtolower($matches[1]);
    }

    return null;
}

$code = quote_pdf_share_code();
if (!$code) {
    http_response_code(404);
    echo 'Link inválido.';
    exit;
}

$source = 'https://admin.moveisunghero.com.br/o/' . rawurlencode($code);

$ch = curl_init($source);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_HEADER => true,
    CURLOPT_TIMEOUT => 60,
    CURLOPT_CONNECTTIMEOUT => 15,
]);

$response = curl_exec($ch);
$httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$curlError = curl_error($ch);
curl_close($ch);

if ($response === false || $httpCode !== 200) {
    http_response_code($httpCode >= 400 ? $httpCode : 502);
    if ($httpCode === 404) {
        echo 'Orçamento não encontrado ou link expirado.';
    } else {
        echo 'Não foi possível abrir o PDF.';
        if ($curlError !== '') {
            error_log('quote pdf proxy: ' . $curlError);
        }
    }
    exit;
}

$rawHeaders = substr($response, 0, $headerSize);
$body = substr($response, $headerSize);

http_response_code(200);
foreach (explode("\r\n", $rawHeaders) as $line) {
    if (preg_match('/^(Content-Type|Content-Disposition):/i', $line)) {
        header($line);
    }
}

header('Cache-Control: private, max-age=3600');
header('X-Robots-Tag: noindex, nofollow');

echo $body;
