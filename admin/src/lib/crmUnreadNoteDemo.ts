/**
 * Demo do destaque de observação não lida no funil CRM.
 * Com `true`: todos os cards comerciais aparecem com aviso + sobem na coluna,
 * e abrir o card NÃO limpa o destaque.
 *
 * Como testar de verdade (com o flag em `false`):
 * 1. Usuário A abre um card e salva uma observação.
 * 2. Usuário B (outra conta) atualiza o CRM → vê sino, card no topo e notificação.
 * 3. B abre o card → o destaque some para B.
 */
export const DEMO_FORCE_UNREAD_NOTES = false;
