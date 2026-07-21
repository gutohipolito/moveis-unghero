<?php
/**
 * Link curto moveisunghero.com.br/r/{codigo}
 * Proxy da página pública do recibo no admin.
 *
 * Upload via cPanel: public_html/r/index.php
 */

function receipt_share_code(): ?string
{
    if (!empty($_GET['code']) && preg_match('/^[a-zA-Z0-9]{6,12}$/', (string) $_GET['code'])) {
        return strtolower((string) $_GET['code']);
    }

    $uri = $_SERVER['REQUEST_URI'] ?? '';
    $path = parse_url($uri, PHP_URL_PATH) ?: '';

    if (preg_match('#/r/([a-zA-Z0-9]{6,12})/?$#', $path, $matches)) {
        return strtolower($matches[1]);
    }

    return null;
}

$code = receipt_share_code();
if (!$code) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Link inválido.';
    exit;
}

$source = 'https://admin.moveisunghero.com.br/r/' . rawurlencode($code);

$ch = curl_init($source);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 25,
    CURLOPT_HTTPHEADER => [
        'Accept: text/html',
        'User-Agent: MóveisUnghero-Receipt-Proxy/1.0',
    ],
]);

$body = curl_exec($ch);
$status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'text/html; charset=utf-8';
$err = curl_error($ch);
curl_close($ch);

if ($body === false || $status >= 400) {
    http_response_code($status >= 400 ? $status : 502);
    header('Content-Type: text/plain; charset=utf-8');
    echo $err ? ('Falha ao carregar recibo: ' . $err) : 'Recibo não encontrado.';
    exit;
}

header('Content-Type: ' . $contentType);
header('Cache-Control: private, max-age=60');
echo $body;
