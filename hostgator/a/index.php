<?php
/**
 * Link curto moveisunghero.com.br/a/{codigo}
 *
 * Cadastro de cliente indicado pelo arquiteto. A URL permanece no site
 * institucional; o formulário do painel é embutido em iframe.
 *
 * Upload via cPanel: public_html/a/index.php + .htaccess
 */

function partner_invite_code(): ?string
{
    if (!empty($_GET['code']) && preg_match('/^[a-zA-Z0-9]{6,16}$/', (string) $_GET['code'])) {
        return strtolower((string) $_GET['code']);
    }

    $uri = $_SERVER['REQUEST_URI'] ?? '';
    $path = parse_url($uri, PHP_URL_PATH) ?: '';

    if (preg_match('#/a/([a-zA-Z0-9]{6,16})/?$#', $path, $matches)) {
        return strtolower($matches[1]);
    }

    return null;
}

$code = partner_invite_code();
if (!$code) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    header('X-Robots-Tag: noindex, nofollow');
    echo 'Link inválido.';
    exit;
}

$src = 'https://admin.moveisunghero.com.br/a/' . rawurlencode($code);
$safeSrc = htmlspecialchars($src, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Cadastro | Móveis Unghero</title>
  <link rel="icon" href="https://admin.moveisunghero.com.br/favicon.ico" />
  <style>
    html, body { margin: 0; padding: 0; height: 100%; background: #020617; }
    body { overflow: hidden; }
    #form-frame {
      position: fixed; inset: 0; width: 100%; height: 100%;
      border: 0; display: block;
    }
    #loading {
      position: fixed; inset: 0; z-index: -1;
      display: flex; align-items: center; justify-content: center;
      background: #020617;
    }
    .spin {
      width: 40px; height: 40px; border-radius: 50%;
      border: 3px solid rgba(250,178,7,.25); border-top-color: #fab207;
      animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div id="loading"><div class="spin"></div></div>
  <iframe
    id="form-frame"
    src="<?= $safeSrc ?>"
    title="Cadastro de Cliente — Móveis Unghero"
    allow="clipboard-write"
  ></iframe>
</body>
</html>
