<?php
/**
 * Link curto moveisunghero.com.br/catalogos/{codigo}
 *
 * Redireciona para o visualizador completo no painel
 * (admin.moveisunghero.com.br/catalogos/{codigo}), que embute o PDF/arquivo
 * inteiro — não a capa/primeira página.
 *
 * Upload via cPanel: public_html/catalogos/index.php + .htaccess
 */

function catalog_share_code(): ?string
{
    if (!empty($_GET['code']) && preg_match('/^[a-zA-Z0-9]{6,12}$/', (string) $_GET['code'])) {
        return strtolower((string) $_GET['code']);
    }

    $uri = $_SERVER['REQUEST_URI'] ?? '';
    $path = parse_url($uri, PHP_URL_PATH) ?: '';

    if (preg_match('#/catalogos/([a-zA-Z0-9]{6,12})/?$#', $path, $matches)) {
        return strtolower($matches[1]);
    }

    return null;
}

$code = catalog_share_code();
if (!$code) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    header('X-Robots-Tag: noindex, nofollow');
    echo 'Link inválido.';
    exit;
}

$target = 'https://admin.moveisunghero.com.br/catalogos/' . rawurlencode($code);
header('Location: ' . $target, true, 302);
header('X-Robots-Tag: noindex, nofollow, noarchive, nosnippet');
exit;
