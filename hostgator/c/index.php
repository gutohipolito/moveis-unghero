<?php
/**
 * Link curto moveisunghero.com.br/c/{codigo}
 * Proxy da página pública do contrato no admin.
 *
 * Upload via cPanel: public_html/c/index.php
 * (e .htaccess de rewrite se a pasta /o usar o mesmo padrão)
 */

function contract_share_code(): ?string
{
    if (!empty($_GET['code']) && preg_match('/^[a-zA-Z0-9]{6,12}$/', (string) $_GET['code'])) {
        return strtolower((string) $_GET['code']);
    }

    $uri = $_SERVER['REQUEST_URI'] ?? '';
    $path = parse_url($uri, PHP_URL_PATH) ?: '';

    if (preg_match('#/c/([a-zA-Z0-9]{6,12})/?$#', $path, $matches)) {
        return strtolower($matches[1]);
    }

    return null;
}

$code = contract_share_code();
if (!$code) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Link inválido.';
    exit;
}

$source = 'https://admin.moveisunghero.com.br/c/' . rawurlencode($code);

$ch = curl_init($source);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 25,
    CURLOPT_USERAGENT => 'MoveisUnghero-ContractProxy/1.0',
]);
$html = curl_exec($ch);
$status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($html === false || $status >= 400) {
    http_response_code($status >= 400 ? $status : 502);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Contrato indisponível.';
    exit;
}

// Remove scripts Next.js (evita History.replaceState cross-origin) e injeta base.
$html = preg_replace('#<script\b[^>]*>.*?</script>#is', '', $html) ?? $html;
if (stripos($html, '<base ') === false) {
    $html = preg_replace(
        '#<head([^>]*)>#i',
        '<head$1><base href="https://admin.moveisunghero.com.br/">',
        $html,
        1
    ) ?? $html;
}

header('Content-Type: text/html; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
echo $html;
