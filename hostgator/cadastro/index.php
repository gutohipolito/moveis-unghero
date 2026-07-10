<?php
/**
 * Redireciona moveisunghero.com.br/cadastro para o cadastro completo de clientes.
 *
 * Upload via cPanel: public_html/cadastro/index.php
 */

$targetUrl = 'https://admin.moveisunghero.com.br/cadastro';

header('Location: ' . $targetUrl, true, 302);
header('Cache-Control: no-store, no-cache, must-revalidate');
exit;
