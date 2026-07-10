<?php
/**
 * Redireciona moveisunghero.com.br/cadastro-parceiro para o cadastro de parceiros.
 *
 * Upload via cPanel: public_html/cadastro-parceiro/index.php
 */

$targetUrl = 'https://admin.moveisunghero.com.br/cadastro-parceiro';

header('Location: ' . $targetUrl, true, 302);
header('Cache-Control: no-store, no-cache, must-revalidate');
exit;
