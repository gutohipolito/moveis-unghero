<?php
/**
 * Proxy do orçamento em moveisunghero.com.br/o/{codigo}.
 * Repassa a página HTML do admin (mesmo layout da impressão) e injeta <base>
 * para logo/CSS/_next carregarem de admin.moveisunghero.com.br.
 *
 * Upload via cPanel: public_html/o/.htaccess + public_html/o/index.php
 */

function quote_share_code(): ?string
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

$code = quote_share_code();
if (!$code) {
    http_response_code(404);
    echo 'Link inválido.';
    exit;
}

$source = 'https://admin.moveisunghero.com.br/o/' . rawurlencode($code);

$ch = curl_init($source);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS => 3,
    CURLOPT_HEADER => true,
    CURLOPT_TIMEOUT => 60,
    CURLOPT_CONNECTTIMEOUT => 15,
    CURLOPT_HTTPHEADER => [
        'Accept: text/html,application/xhtml+xml',
        'User-Agent: MoveisUnghero-QuoteProxy/1.0',
    ],
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
        echo 'Não foi possível abrir o orçamento.';
        if ($curlError !== '') {
            error_log('quote share proxy: ' . $curlError);
        }
    }
    exit;
}

$rawHeaders = substr($response, 0, $headerSize);
$body = substr($response, $headerSize);

$contentType = 'text/html; charset=utf-8';
foreach (explode("\r\n", $rawHeaders) as $line) {
    if (preg_match('/^Content-Type:\s*(.+)$/i', $line, $m)) {
        $contentType = trim($m[1]);
        break;
    }
}

// HTML: assets relativos (/_next, /logo.png) precisam apontar para o admin
if (stripos($contentType, 'text/html') !== false && stripos($body, '<base ') === false) {
    $body = preg_replace(
        '/<head(\s[^>]*)?>/i',
        '<head$1><base href="https://admin.moveisunghero.com.br/">',
        $body,
        1
    );
}

http_response_code(200);
header('Content-Type: ' . $contentType);
header('Cache-Control: private, no-cache, must-revalidate');
header('X-Robots-Tag: noindex, nofollow');

echo $body;
