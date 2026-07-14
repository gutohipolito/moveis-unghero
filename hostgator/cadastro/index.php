<?php
/**
 * Cadastro de cliente em moveisunghero.com.br/cadastro.
 *
 * A URL permanece no site institucional, mas o formulário exibido é a
 * página do painel (admin.moveisunghero.com.br/cadastro) embutida em um
 * iframe em tela cheia. Assim o layout é sempre o do sistema (deploy via
 * Vercel) e este arquivo NÃO precisa ser atualizado quando o formulário muda.
 *
 * Upload via cPanel (uma única vez): public_html/cadastro/index.php
 */
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Cadastro de Cliente | Móveis Unghero</title>
  <link rel="icon" href="https://admin.moveisunghero.com.br/favicon.ico" />
  <style>
    html, body { margin: 0; padding: 0; height: 100%; background: #020617; }
    body { overflow: hidden; }
    #cadastro-frame {
      position: fixed; inset: 0; width: 100%; height: 100%;
      border: 0; display: block;
    }
    /* Estado de carregamento (fica atrás do iframe até ele carregar) */
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
    id="cadastro-frame"
    src="https://admin.moveisunghero.com.br/cadastro"
    title="Cadastro de Cliente — Móveis Unghero"
    allow="clipboard-write"
  ></iframe>
</body>
</html>
