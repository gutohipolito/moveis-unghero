<?php
/**
 * Redireciona moveisunghero.com.br/orcamento para o formulário de qualificação.
 *
 * Upload via cPanel: public_html/orcamento/index.php
 */

$targetUrl = 'https://admin.moveisunghero.com.br/briefing';

header('Location: ' . $targetUrl, true, 302);
header('Cache-Control: no-store, no-cache, must-revalidate');
exit;
