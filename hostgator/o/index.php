<?php
/**
 * Link curto moveisunghero.com.br/o/{codigo}
 * Redireciona para o admin (mesma página HTML do orçamento).
 * Não faz proxy do HTML: o Next.js quebra com cross-origin History/replaceState.
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

$target = 'https://admin.moveisunghero.com.br/o/' . rawurlencode($code);

header('Cache-Control: private, no-cache, must-revalidate');
header('X-Robots-Tag: noindex, nofollow');
header('Location: ' . $target, true, 302);
exit;
