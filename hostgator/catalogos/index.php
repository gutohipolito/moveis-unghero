<?php
/**
 * Link curto moveisunghero.com.br/catalogos/{codigo}
 *
 * Mantém a URL no domínio institucional e embute a rota pública do painel
 * (admin.moveisunghero.com.br/catalogos/{codigo}) em iframe em tela cheia.
 * O PDF/imagem é carregado diretamente do Vercel Blob — este PHP NÃO baixa
 * nem retransmite o arquivo.
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

$src = 'https://admin.moveisunghero.com.br/catalogos/' . rawurlencode($code);
$title = 'Catálogo | Móveis Unghero';
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
  <title><?= htmlspecialchars($title, ENT_QUOTES, 'UTF-8') ?></title>
  <link rel="icon" href="https://admin.moveisunghero.com.br/favicon.ico" />
  <style>
    html, body { margin: 0; padding: 0; height: 100%; background: #020617; }
    body { overflow: hidden; }
    #catalog-frame {
      position: fixed; inset: 0; width: 100%; height: 100%;
      border: 0; display: block; background: #020617;
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
    id="catalog-frame"
    src="<?= htmlspecialchars($src, ENT_QUOTES, 'UTF-8') ?>"
    title="<?= htmlspecialchars($title, ENT_QUOTES, 'UTF-8') ?>"
    allow="fullscreen"
  ></iframe>
</body>
</html>
