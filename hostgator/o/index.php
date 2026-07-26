<?php
/**
 * Link curto moveisunghero.com.br/o/{codigo}
 * Faz proxy da página do admin, remove o JS do Next.js (evita erro
 * cross-origin no History) e injeta <base> para CSS/imagens.
 * A URL do navegador permanece em moveisunghero.com.br.
 *
 * Senha: últimos 4 dígitos do celular — gate nativo no PHP (sem JS do Next).
 *
 * Upload via cPanel: public_html/o/.htaccess + public_html/o/index.php
 */

const QUOTE_ADMIN_BASE = 'https://admin.moveisunghero.com.br';
const QUOTE_UNLOCK_COOKIE_PREFIX = 'qo_';
const QUOTE_UNLOCK_MAX_AGE = 60 * 60 * 24 * 14;

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

function quote_cookie_name(string $code): string
{
    return QUOTE_UNLOCK_COOKIE_PREFIX . $code;
}

function quote_http_json(string $url, string $method = 'GET', ?array $body = null, array $extraHeaders = []): array
{
    $ch = curl_init($url);
    $headers = array_merge([
        'Accept: application/json',
        'User-Agent: MoveisUnghero-QuoteProxy/1.4',
    ], $extraHeaders);
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 3,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_CUSTOMREQUEST => $method,
    ];

    if ($body !== null) {
        $payload = json_encode($body, JSON_UNESCAPED_UNICODE);
        $headers[] = 'Content-Type: application/json';
        $opts[CURLOPT_POSTFIELDS] = $payload;
    }

    $opts[CURLOPT_HTTPHEADER] = $headers;
    curl_setopt_array($ch, $opts);

    $raw = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    $data = null;
    if (is_string($raw) && $raw !== '') {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            $data = $decoded;
        }
    }

    return [
        'ok' => $raw !== false && $httpCode >= 200 && $httpCode < 300,
        'status' => $httpCode,
        'data' => $data,
        'error' => $curlError,
    ];
}

function quote_render_gate(string $code, string $firstName, ?string $error = null): void
{
    $safeName = htmlspecialchars($firstName, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $safeError = $error !== null ? htmlspecialchars($error, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') : null;
    $greeting = $safeName !== '' ? "Olá, {$safeName}. " : '';

    http_response_code(200);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: private, no-cache, must-revalidate');
    header('X-Robots-Tag: noindex, nofollow');

    echo '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">';
    echo '<meta name="viewport" content="width=device-width, initial-scale=1">';
    echo '<title>Orçamento protegido | Móveis Unghero</title>';
    echo '<style>
      *{box-sizing:border-box}body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
      padding:24px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;background:#f5f5f5;color:#171717}
      .card{width:100%;max-width:420px;background:#fff;border:1px solid #e5e5e5;border-radius:16px;padding:32px;box-shadow:0 10px 30px rgba(0,0,0,.08)}
      .eyebrow{font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#a3a3a3;margin:0 0 4px}
      h1{font-size:22px;margin:0 0 16px}p{font-size:14px;line-height:1.55;color:#525252;margin:0 0 20px}
      label{display:block;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#737373;margin-bottom:8px}
      input{width:100%;padding:14px 16px;border:1px solid #d4d4d4;border-radius:12px;font-size:24px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
      letter-spacing:.35em;text-align:center}input:focus{outline:2px solid rgba(217,119,6,.55);border-color:#d97706}
      button{width:100%;margin-top:16px;border:0;border-radius:12px;padding:14px 16px;background:#d97706;color:#fff;font-weight:700;font-size:15px;cursor:pointer}
      button:hover{background:#b45309}.err{color:#e11d48;font-size:13px;font-weight:600;margin:12px 0 0}
    </style></head><body><div class="card">';
    echo '<p class="eyebrow">Orçamento protegido</p><h1>Móveis Unghero</h1>';
    echo '<p>' . $greeting . 'Para abrir o orçamento, digite a senha: os <strong>4 últimos dígitos do seu celular</strong> cadastrado conosco.</p>';
    echo '<form method="post" action="">';
    echo '<label for="pin">Senha (4 dígitos)</label>';
    echo '<input id="pin" name="pin" type="password" inputmode="numeric" autocomplete="one-time-code" maxlength="4" pattern="[0-9]{4}" required autofocus>';
    if ($safeError) {
        echo '<p class="err" role="alert">' . $safeError . '</p>';
    }
    echo '<button type="submit">Abrir orçamento</button></form></div></body></html>';
    exit;
}

$code = quote_share_code();
if (!$code) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Link inválido.';
    exit;
}

$cookieName = quote_cookie_name($code);
$unlockToken = isset($_COOKIE[$cookieName]) ? (string) $_COOKIE[$cookieName] : '';

$accessHeaders = [];
if ($unlockToken !== '') {
    $accessHeaders[] = 'X-Quote-Share-Unlock: ' . $unlockToken;
}

$access = quote_http_json(
    QUOTE_ADMIN_BASE . '/api/o/' . rawurlencode($code) . '/access',
    'GET',
    null,
    $accessHeaders
);
if (($access['status'] ?? 0) === 404 || empty($access['data']['exists'])) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Orçamento não encontrado ou link expirado.';
    exit;
}
if (!$access['ok']) {
    http_response_code(502);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Não foi possível abrir o orçamento.';
    exit;
}

$requiresPin = !empty($access['data']['requiresPin']);
$unlocked = !empty($access['data']['unlocked']);
$firstName = (string) ($access['data']['clientFirstName'] ?? '');

if ($requiresPin) {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $pin = preg_replace('/\D+/', '', (string) ($_POST['pin'] ?? ''));
        $unlock = quote_http_json(
            QUOTE_ADMIN_BASE . '/api/o/' . rawurlencode($code) . '/unlock',
            'POST',
            ['pin' => $pin]
        );

        if (!empty($unlock['ok']) && !empty($unlock['data']['unlockToken'])) {
            $unlockToken = (string) $unlock['data']['unlockToken'];
            setcookie($cookieName, $unlockToken, [
                'expires' => time() + QUOTE_UNLOCK_MAX_AGE,
                'path' => '/',
                'secure' => true,
                'httponly' => true,
                'samesite' => 'Lax',
            ]);
            header('Location: /o/' . rawurlencode($code), true, 303);
            exit;
        }

        $msg = (string) ($unlock['data']['error'] ?? 'Senha incorreta.');
        quote_render_gate($code, $firstName, $msg);
    }

    if (!$unlocked) {
        // Cookie inválido/ausente — limpa e pede senha no PHP (sem JS do Next).
        if ($unlockToken !== '') {
            setcookie($cookieName, '', [
                'expires' => time() - 3600,
                'path' => '/',
                'secure' => true,
                'httponly' => true,
                'samesite' => 'Lax',
            ]);
            $unlockToken = '';
        }
        quote_render_gate($code, $firstName);
    }
}

$source = QUOTE_ADMIN_BASE . '/o/' . rawurlencode($code);

$ch = curl_init($source);
$fetchHeaders = [
    'Accept: text/html,application/xhtml+xml',
    'User-Agent: MoveisUnghero-QuoteProxy/1.4',
];
if ($requiresPin && $unlockToken !== '') {
    $fetchHeaders[] = 'X-Quote-Share-Unlock: ' . $unlockToken;
}

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS => 3,
    CURLOPT_HEADER => true,
    CURLOPT_TIMEOUT => 60,
    CURLOPT_CONNECTTIMEOUT => 15,
    CURLOPT_HTTPHEADER => $fetchHeaders,
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
        '<head$1><base href="' . QUOTE_ADMIN_BASE . '/">',
        $body,
        1
    );
    if (is_string($replaced)) {
        $body = $replaced;
    }
}

http_response_code(200);
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: private, no-cache, must-revalidate');
header('X-Robots-Tag: noindex, nofollow');

echo $body;
