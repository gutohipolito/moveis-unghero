<?php
/**
 * Redireciona moveisunghero.com.br/o/{codigo} para o painel admin.
 *
 * Upload via cPanel: public_html/o/.htaccess (preferencial)
 * ou public_html/o/index.php como fallback.
 */

$uri = $_SERVER['REQUEST_URI'] ?? '';
$path = parse_url($uri, PHP_URL_PATH) ?: '';

if (!preg_match('#/o/([a-zA-Z0-9]{6,12})/?$#', $path, $matches)) {
    http_response_code(404);
    echo 'Link inválido.';
    exit;
}

$code = strtolower($matches[1]);
$target = 'https://admin.moveisunghero.com.br/o/' . rawurlencode($code);

header('Location: ' . $target, true, 302);
header('Cache-Control: no-store, no-cache, must-revalidate');
exit;
