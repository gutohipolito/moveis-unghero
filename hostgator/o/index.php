<?php
/**
 * Link curto moveisunghero.com.br/o/{codigo}
 * Faz proxy da página do admin, remove o JS do Next.js (evita erro
 * cross-origin no History) e injeta <base> para CSS/imagens.
 * A URL do navegador permanece em moveisunghero.com.br.
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
        'User-Agent: MoveisUnghero-QuoteProxy/1.2',
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

// Remove runtime do Next — causa SecurityError em domínio diferente
$body = preg_replace('#<script\b[^>]*>.*?</script>#is', '', $body) ?? $body;
$body = preg_replace('#<link[^>]+rel=["\']manifest["\'][^>]*>#i', '', $body) ?? $body;
$body = preg_replace('#<link[^>]+rel=["\']modulepreload["\'][^>]*>#i', '', $body) ?? $body;

// CSS/imagens relativas sobem do admin
if (stripos($body, '<base ') === false) {
    $replaced = preg_replace(
        '/<head(\s[^>]*)?>/i',
        '<head$1><base href="https://admin.moveisunghero.com.br/">',
        $body,
        1
    );
    if (is_string($replaced)) {
        $body = $replaced;
    }
}

// Botão Salvar PDF sem React (barra público do Next usa onClick)
if (stripos($body, 'javascript:window.print()') === false) {
    $printBar = '<div class="print:hidden sticky top-0 bg-neutral-900 text-white p-3 flex items-center justify-between shadow-md z-50" style="position:sticky;top:0;z-index:50;display:flex;align-items:center;justify-content:space-between;background:#171717;color:#fff;padding:12px 16px;">'
        . '<p style="margin:0;font-size:14px;color:#d4d4d4;">Orçamento Móveis Unghero</p>'
        . '<a href="javascript:window.print()" style="background:#d97706;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:8px 16px;border-radius:8px;">Salvar PDF</a>'
        . '</div>';
    $replaced = preg_replace('/<body([^>]*)>/i', '<body$1>' . $printBar, $body, 1);
    if (is_string($replaced)) {
        $body = $replaced;
    }
}

http_response_code(200);
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: private, no-cache, must-revalidate');
header('X-Robots-Tag: noindex, nofollow');

echo $body;
