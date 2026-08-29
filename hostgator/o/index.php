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
const QUOTE_PROXY_UA = 'MoveisUnghero-QuoteProxy/1.8';

/**
 * UA do visitante (celular/desktop) — sem isso o admin registra tudo como Desktop.
 * Remove CR/LF para evitar injeção de cabeçalho.
 */
function quote_client_user_agent(): string
{
    $ua = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');
    $ua = preg_replace('/[\r\n]+/', ' ', $ua) ?? '';
    $ua = trim($ua);
    if ($ua === '' || strlen($ua) > 500) {
        return QUOTE_PROXY_UA;
    }
    return $ua;
}

function quote_is_proxy_ua(string $ua): bool
{
    return (bool) preg_match('/^MoveisUnghero-QuoteProxy\//i', $ua);
}

function quote_is_preview_ua(string $ua): bool
{
    return (bool) preg_match(
        '/whatsapp|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|preview|bot|crawler|spider|embedly|pinterest/i',
        $ua
    );
}

/** Cabeçalhos comuns do proxy: UA real + identificação do proxy. */
function quote_proxy_headers(array $extra = []): array
{
    $clientUa = quote_client_user_agent();
    $headers = [
        'User-Agent: ' . $clientUa,
        'X-Quote-Proxy: ' . QUOTE_PROXY_UA,
        'X-Quote-Client-UA: ' . $clientUa,
        'X-Quote-View-Client: 1',
    ];

    $chMobile = (string) ($_SERVER['HTTP_SEC_CH_UA_MOBILE'] ?? '');
    $chPlatform = (string) ($_SERVER['HTTP_SEC_CH_UA_PLATFORM'] ?? '');
    if ($chMobile !== '') {
        $headers[] = 'Sec-CH-UA-Mobile: ' . preg_replace('/[\r\n]+/', '', $chMobile);
    }
    if ($chPlatform !== '') {
        $headers[] = 'Sec-CH-UA-Platform: ' . preg_replace('/[\r\n]+/', '', $chPlatform);
    }

    return array_merge($headers, $extra);
}

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
    $headers = array_merge(
        ['Accept: application/json'],
        quote_proxy_headers($extraHeaders)
    );

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
    $year = (int) date('Y');
    $bg = QUOTE_ADMIN_BASE . '/img-fundo-senha-moveis-unghero.jpg';
    $logo = QUOTE_ADMIN_BASE . '/logo.png';

    http_response_code(200);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: private, no-cache, must-revalidate');
    header('X-Robots-Tag: noindex, nofollow');

    echo '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">';
    echo '<meta name="viewport" content="width=device-width, initial-scale=1">';
    echo '<title>Orçamento protegido | Móveis Unghero</title>';
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
    echo '<p class="eyebrow">Acesso protegido</p><h1>Abrir orçamento</h1>';
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
    echo '<button type="submit">Acessar Orçamento</button></form>';
    echo '</div></div>';
    echo '<div class="why"><p>';
    echo 'Proteção de dados pessoais e comerciais conforme a LGPD (Lei nº 13.709/2018). Somente você acessa este orçamento.';
    echo '</p></div>';
    echo '</div></main>';
    echo '<footer><p>© ' . $year . ' Móveis Unghero LTDA. Todos os direitos reservados.</p></footer>';
    echo '</body></html>';
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

$accessStatus = (int) ($access['status'] ?? 0);
$accessExists = !empty($access['data']['exists']);

// 404 real: código inválido / orçamento sem link.
if ($accessStatus === 404 || ($access['ok'] && !$accessExists)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Orçamento não encontrado ou link expirado.';
    exit;
}

// Falha transitória (banco/API/rede): não confundir com link inválido.
if (!$access['ok'] || !$accessExists) {
    http_response_code($accessStatus >= 500 ? $accessStatus : 502);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Não foi possível abrir o orçamento no momento. Tente novamente em instantes.';
    if (!empty($access['error'])) {
        error_log('quote share access: ' . $access['error']);
    }
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
$fetchHeaders = array_merge(
    ['Accept: text/html,application/xhtml+xml'],
    quote_proxy_headers()
);
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
    } elseif ($httpCode >= 500 || $httpCode === 0) {
        echo 'Não foi possível abrir o orçamento no momento. Tente novamente em instantes.';
    } else {
        echo 'Não foi possível abrir o orçamento.';
    }
    if ($curlError !== '') {
        error_log('quote share proxy: ' . $curlError);
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

// Helper mínimo: Salvar PDF (data-unghero-print). O Next JS foi removido acima;
// o onclick nativo do botão também funciona — isto é fallback extra.
$printHelper = '<script>'
    . 'document.addEventListener("click",function(e){'
    . 'var t=e.target&&e.target.closest?e.target.closest("[data-unghero-print]"):null;'
    . 'if(!t)return;e.preventDefault();window.print();'
    . '});</script>';
if (stripos($body, '</body>') !== false) {
    $body = preg_replace('/<\/body>/i', $printHelper . '</body>', $body, 1) ?? ($body . $printHelper);
} else {
    $body .= $printHelper;
}

$chMobile = (string) ($_SERVER['HTTP_SEC_CH_UA_MOBILE'] ?? '');
$chPlatform = (string) ($_SERVER['HTTP_SEC_CH_UA_PLATFORM'] ?? '');
$clientUa = quote_client_user_agent();
$serverCanTrustUa = !quote_is_proxy_ua($clientUa);
$isPreviewBot = quote_is_preview_ua($clientUa);

// Só registra no servidor se temos UA real do visitante (ou crawler/preview).
// Proxy antigo (1.4) mandava MoveisUnghero-QuoteProxy → 100% Desktop.
// Aberturas humanas ficam a cargo do beacon no browser (UA + touch + viewport).
if ($serverCanTrustUa || $isPreviewBot) {
    quote_http_json(
        QUOTE_ADMIN_BASE . '/api/o/' . rawurlencode($code) . '/view',
        'POST',
        [
            'userAgent' => $clientUa,
            'hints' => [
                'mobile' => $chMobile,
                'platform' => $chPlatform,
            ],
        ]
    );
}

$viewUrlJson = json_encode(QUOTE_ADMIN_BASE . '/api/o/' . $code . '/view', JSON_UNESCAPED_SLASHES);
// Se o PHP já contou com UA real de um humano, o JS só refina; senão o JS é a abertura oficial.
$refineFlag = ($serverCanTrustUa && !$isPreviewBot) ? 'true' : 'false';

$viewBeacon = '<script>'
    . '(function(){'
    . 'var url=' . $viewUrlJson . ';'
    . 'function detect(){'
    . 'var ua=navigator.userAgent||"";'
    . 'var uaData=navigator.userAgentData||null;'
    . 'var touch=navigator.maxTouchPoints||0;'
    . 'var w=Math.min(screen.width||0,window.innerWidth||0)||0;'
    . 'var tablet=/iPad|Tablet|(Android(?!.*Mobile))/i.test(ua)||(navigator.platform==="MacIntel"&&touch>1);'
    . 'var mobile=false;'
    . 'if(uaData&&typeof uaData.mobile==="boolean"){mobile=!!uaData.mobile;}'
    . 'else if(/Mobi|iPhone|iPod|Android.+Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)){mobile=true;}'
    . 'else if(touch>0&&w>0&&w<768){mobile=true;}'
    . 'if(tablet){mobile=false;}'
    . 'var platform=(uaData&&uaData.platform)||navigator.platform||"";'
    . 'return{'
    . 'refine:' . $refineFlag . ','
    . 'userAgent:ua,'
    . 'hints:{mobile:mobile?"?1":"?0",platform:platform},'
    . 'client:{mobile:mobile,tablet:tablet,maxTouchPoints:touch,platform:navigator.platform||"",viewportWidth:w}'
    . '};'
    . '}'
    . 'function send(payload){'
    . 'var body=JSON.stringify(payload);'
    . 'try{fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:body,keepalive:true,mode:"cors",credentials:"omit"});}'
    . 'catch(e){'
    . 'try{if(navigator.sendBeacon){navigator.sendBeacon(url,new Blob([body],{type:"application/json"}));}}catch(e2){}'
    . '}'
    . '}'
    . 'send(detect());'
    . 'window.addEventListener("pageshow",function(ev){if(ev.persisted)send(detect());});'
    . '})();</script>';
if (stripos($body, '</body>') !== false) {
    $body = preg_replace('/<\/body>/i', $viewBeacon . '</body>', $body, 1) ?? ($body . $viewBeacon);
} else {
    $body .= $viewBeacon;
}

http_response_code(200);
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: private, no-cache, must-revalidate');
header('X-Robots-Tag: noindex, nofollow');
header('Accept-CH: Sec-CH-UA-Mobile, Sec-CH-UA-Platform');
header('Permissions-Policy: ch-ua-mobile=(self), ch-ua-platform=(self)');

echo $body;
