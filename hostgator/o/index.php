<?php
/**
 * Link curto moveisunghero.com.br/o/{codigo}
 * Serve HTML estático do orçamento (sem JS do Next.js),
 * para a URL permanecer em moveisunghero.com.br.
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
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Link inválido.';
    exit;
}

// HTML estático (não a página Next.js — evita erro de History cross-origin)
$source = 'https://admin.moveisunghero.com.br/api/public/orcamento/' . rawurlencode($code);

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
        'User-Agent: MoveisUnghero-QuoteProxy/1.1',
    ],
]);

$response = curl_exec($ch);
$httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$curlError = curl_error($ch);
curl_close($ch);

if ($response === false || $httpCode !== 200) {
    http_response_code($httpCode >= 400 ? $httpCode : 502);
    header('Content-Type: text/plain; charset=utf-8');
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

$body = substr($response, $headerSize);

http_response_code(200);
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: private, no-cache, must-revalidate');
header('X-Robots-Tag: noindex, nofollow');

echo $body;
