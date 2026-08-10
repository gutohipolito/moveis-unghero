<?php
/**
 * Portal do parceiro em moveisunghero.com.br/parceiro/...
 *
 * A URL permanece no domínio institucional; o painel (login, produtos, etc.)
 * é embutido via iframe a partir de admin.moveisunghero.com.br.
 *
 * Upload via cPanel: public_html/parceiro/index.php + .htaccess
 */

$path = isset($_GET['path']) ? (string) $_GET['path'] : '';
$path = trim($path, '/');

// Só caminhos conhecidos do portal (evita open redirect / proxy aberto)
$allowedPrefixes = [
    'login',
    'painel',
    'produtos',
    'clientes',
    'marketing',
    'projetos',
    'comissoes',
];

$ok = $path === '';
if (!$ok) {
    foreach ($allowedPrefixes as $prefix) {
        if ($path === $prefix || strpos($path, $prefix . '/') === 0) {
            $ok = true;
            break;
        }
    }
}

if (!$ok) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    header('X-Robots-Tag: noindex, nofollow');
    echo 'Página não encontrada.';
    exit;
}

$adminPath = $path === '' ? 'login' : $path;
$query = $_SERVER['QUERY_STRING'] ?? '';
// Remove path=... do query string interno do rewrite
if ($query !== '') {
    parse_str($query, $qs);
    unset($qs['path']);
    $query = http_build_query($qs);
}
$src = 'https://admin.moveisunghero.com.br/parceiro/' . $adminPath;
if ($query !== '') {
    $src .= '?' . $query;
}
$safeSrc = htmlspecialchars($src, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Portal do Parceiro | Móveis Unghero</title>
  <link rel="icon" href="https://admin.moveisunghero.com.br/favicon.ico" />
  <style>
    html, body { margin: 0; padding: 0; height: 100%; background: #120e0c; }
    body { overflow: hidden; }
    #portal-frame {
      position: fixed; inset: 0; width: 100%; height: 100%;
      border: 0; display: block;
    }
    #loading {
      position: fixed; inset: 0; z-index: -1;
      display: flex; align-items: center; justify-content: center;
      background: #120e0c;
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
    id="portal-frame"
    src="<?= $safeSrc ?>"
    title="Portal do Parceiro — Móveis Unghero"
    allow="clipboard-write"
  ></iframe>
  <script>
    (function () {
      var ADMIN = 'https://admin.moveisunghero.com.br';
      var BASE = '/parceiro';
      window.addEventListener('message', function (event) {
        if (event.origin !== ADMIN) return;
        var data = event.data;
        if (!data || data.type !== 'unghero-parceiro-nav') return;
        var path = String(data.path || '');
        if (path.indexOf('/parceiro') !== 0) return;
        var next = path.replace(/^\/parceiro/, BASE) || BASE + '/login';
        if (next === location.pathname + location.search) return;
        history.replaceState(null, '', next);
      });
    })();
  </script>
</body>
</html>
