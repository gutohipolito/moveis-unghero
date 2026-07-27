<?php
/**
 * Link curto moveisunghero.com.br/r/{codigo}
 * Proxy da página pública do recibo no admin.
 * Senha: últimos 4 dígitos do celular — gate nativo no PHP (sem JS do Next),
 * visual igual ao do orçamento (/o/).
 *
 * Upload via cPanel: public_html/r/.htaccess + public_html/r/index.php
 */

const RECEIPT_ADMIN_BASE = 'https://admin.moveisunghero.com.br';
const RECEIPT_UNLOCK_COOKIE_PREFIX = 'qr_';
const RECEIPT_UNLOCK_MAX_AGE = 60 * 60 * 24 * 14;

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

function receipt_cookie_name(string $code): string
{
    return RECEIPT_UNLOCK_COOKIE_PREFIX . $code;
}

function receipt_http_json(string $url, string $method = 'GET', ?array $body = null, array $extraHeaders = []): array
{
    $ch = curl_init($url);
    $headers = array_merge([
        'Accept: application/json',
        'User-Agent: MoveisUnghero-ReceiptProxy/2.0',
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

function receipt_render_gate(string $code, string $firstName, ?string $error = null): void
{
    $safeName = htmlspecialchars($firstName, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $safeError = $error !== null ? htmlspecialchars($error, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') : null;
    $year = (int) date('Y');
    $bg = RECEIPT_ADMIN_BASE . '/img-fundo-senha-moveis-unghero.jpg';
    $logo = RECEIPT_ADMIN_BASE . '/logo.png';

    http_response_code(200);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: private, no-cache, must-revalidate');
    header('X-Robots-Tag: noindex, nofollow');

    echo '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">';
    echo '<meta name="viewport" content="width=device-width, initial-scale=1">';
    echo '<title>Recibo protegido | Móveis Unghero</title>';
    echo '<style>
      *{box-sizing:border-box}
      html,body{margin:0;min-height:100%}
      body{
        min-height:100vh;min-height:100svh;display:flex;flex-direction:column;
        font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
        color:#fff;position:relative;overflow-x:hidden;
        background:#111 url(' . json_encode($bg) . ') center/cover no-repeat;
      }
      .overlay{
        position:fixed;inset:0;z-index:0;
        background:linear-gradient(180deg,rgba(0,0,0,.95),rgba(0,0,0,.7),rgba(0,0,0,1));
      }
      main{position:relative;z-index:1;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px}
      .wrap{width:100%;max-width:420px;display:flex;flex-direction:column;align-items:center}
      .logo{height:48px;width:auto;object-fit:contain;filter:brightness(0) invert(1) drop-shadow(0 4px 12px rgba(0,0,0,.35));margin-bottom:32px}
      .card{
        width:100%;background:#fff;color:#0a0a0a;border-radius:16px;overflow:hidden;
        border:1px solid rgba(255,255,255,.2);box-shadow:0 24px 60px -12px rgba(0,0,0,.55)
      }
      .card-inner{padding:28px 32px 24px}
      .eyebrow{font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#a3a3a3;margin:0 0 2px}
      h1{font-size:20px;font-weight:700;margin:0;line-height:1.3;color:#0a0a0a}
      .hello{font-size:14px;color:#525252;margin:8px 0 0}
      .hello strong{color:#0a0a0a;font-weight:600}
      label{display:block;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#737373;margin:20px 0 8px}
      input{
        width:100%;padding:14px 16px;border:1px solid #d4d4d4;border-radius:12px;background:#fafafa;
        font-size:24px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.45em;text-align:center;color:#0a0a0a
      }
      input:focus{outline:2px solid rgba(217,119,6,.55);border-color:#d97706;background:#fff}
      .hint{margin:12px 0 0;font-size:12px;line-height:1.5;color:#737373;text-align:center}
      button{
        width:100%;margin-top:14px;border:0;border-radius:12px;padding:14px 16px;
        background:#d97706;color:#fff;font-weight:700;font-size:15px;cursor:pointer
      }
      button:hover{background:#b45309}
      .err{color:#e11d48;font-size:13px;font-weight:600;margin:10px 0 0;text-align:center}
      .why{
        margin-top:24px;max-width:360px;text-align:center;
        font-size:10px;line-height:1.55;color:rgba(255,255,255,.45)
      }
      .why p{margin:0}
      footer{position:relative;z-index:1;padding:0 20px 24px;text-align:center}
      footer p{margin:0;font-size:11px;color:rgba(255,255,255,.45);letter-spacing:.02em}
    </style></head><body>';
    echo '<div class="overlay" aria-hidden="true"></div>';
    echo '<main><div class="wrap">';
    echo '<img class="logo" src="' . htmlspecialchars($logo, ENT_QUOTES, 'UTF-8') . '" alt="Móveis Unghero" width="180" height="48">';
    echo '<div class="card"><div class="card-inner">';
    echo '<p class="eyebrow">Acesso protegido</p><h1>Abrir recibo</h1>';
    if ($safeName !== '') {
        echo '<p class="hello">Olá, <strong>' . $safeName . '</strong>.</p>';
    }
    echo '<form method="post" action="">';
    echo '<label for="pin">Senha (4 dígitos)</label>';
    echo '<input id="pin" name="pin" type="password" inputmode="numeric" autocomplete="one-time-code" maxlength="4" pattern="[0-9]{4}" required autofocus>';
    echo '<p class="hint">A senha é os últimos 4 dígitos do teu celular cadastrado</p>';
    if ($safeError) {
        echo '<p class="err" role="alert">' . $safeError . '</p>';
    }
    echo '<button type="submit">Acessar Recibo</button></form>';
    echo '</div></div>';
    echo '<div class="why"><p>';
    echo 'Proteção de dados pessoais e comerciais conforme a LGPD (Lei nº 13.709/2018). Somente você acessa este recibo.';
    echo '</p></div>';
    echo '</div></main>';
    echo '<footer><p>© ' . $year . ' Móveis Unghero LTDA. Todos os direitos reservados.</p></footer>';
    echo '</body></html>';
    exit;
}

$code = receipt_share_code();
if (!$code) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Link inválido.';
    exit;
}

$cookieName = receipt_cookie_name($code);
$unlockToken = isset($_COOKIE[$cookieName]) ? (string) $_COOKIE[$cookieName] : '';

$accessHeaders = [];
if ($unlockToken !== '') {
    $accessHeaders[] = 'X-Receipt-Share-Unlock: ' . $unlockToken;
}

$access = receipt_http_json(
    RECEIPT_ADMIN_BASE . '/api/r/' . rawurlencode($code) . '/access',
    'GET',
    null,
    $accessHeaders
);
if (($access['status'] ?? 0) === 404 || empty($access['data']['exists'])) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Recibo não encontrado.';
    exit;
}
if (!$access['ok']) {
    http_response_code(502);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Não foi possível abrir o recibo.';
    exit;
}

$requiresPin = !empty($access['data']['requiresPin']);
$unlocked = !empty($access['data']['unlocked']);
$firstName = (string) ($access['data']['clientFirstName'] ?? '');

if ($requiresPin) {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $pin = preg_replace('/\D+/', '', (string) ($_POST['pin'] ?? ''));
        $unlock = receipt_http_json(
            RECEIPT_ADMIN_BASE . '/api/r/' . rawurlencode($code) . '/unlock',
            'POST',
            ['pin' => $pin]
        );

        if (!empty($unlock['ok']) && !empty($unlock['data']['unlockToken'])) {
            $unlockToken = (string) $unlock['data']['unlockToken'];
            setcookie($cookieName, $unlockToken, [
                'expires' => time() + RECEIPT_UNLOCK_MAX_AGE,
                'path' => '/',
                'secure' => true,
                'httponly' => true,
                'samesite' => 'Lax',
            ]);
            header('Location: /r/' . rawurlencode($code), true, 303);
            exit;
        }

        $msg = (string) ($unlock['data']['error'] ?? 'Senha incorreta.');
        receipt_render_gate($code, $firstName, $msg);
    }

    if (!$unlocked) {
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
        receipt_render_gate($code, $firstName);
    }
}

$source = RECEIPT_ADMIN_BASE . '/r/' . rawurlencode($code);

$ch = curl_init($source);
$fetchHeaders = [
    'Accept: text/html,application/xhtml+xml',
    'User-Agent: MoveisUnghero-ReceiptProxy/2.0',
];
if ($requiresPin && $unlockToken !== '') {
    $fetchHeaders[] = 'X-Receipt-Share-Unlock: ' . $unlockToken;
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
        echo 'Recibo não encontrado.';
    } else {
        echo 'Não foi possível abrir o recibo.';
        if ($curlError !== '') {
            error_log('receipt share proxy: ' . $curlError);
        }
    }
    exit;
}

$body = substr($response, $headerSize);

$body = preg_replace('#<script\b[^>]*>.*?</script>#is', '', $body) ?? $body;
$body = preg_replace('#<link[^>]+rel=["\']manifest["\'][^>]*>#i', '', $body) ?? $body;
$body = preg_replace('#<link[^>]+rel=["\']modulepreload["\'][^>]*>#i', '', $body) ?? $body;

if (stripos($body, '<base ') === false) {
    $replaced = preg_replace(
        '/<head(\s[^>]*)?>/i',
        '<head$1><base href="' . RECEIPT_ADMIN_BASE . '/">',
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
