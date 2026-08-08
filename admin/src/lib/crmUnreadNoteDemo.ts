/**
 * TEMP — demo do destaque de observação no funil CRM.
 * Com `true`: todos os cards comerciais aparecem com aviso + sobem na coluna,
 * e abrir o card NÃO limpa o destaque.
 *
 * Como testar de verdade (com o flag em `false`):
 * 1. Usuário A abre um card e salva uma observação.
 * 2. Usuário B (outra conta) atualiza o CRM → vê sino, card no topo e notificação.
 * 3. B abre o card → o destaque some para B.
 *
 * Remover / voltar para `false` após o teste.
 */
export const DEMO_FORCE_UNREAD_NOTES = true;
