# Checklist — Portal Parceiro VEIO (Fase 5)

Validação manual restante após os endurecimentos de código.

## Autorização

- [ ] Parceiro A não abre `/parceiro/projetos/{id}` de projeto do parceiro B (404/redirect).
- [ ] Upload e exclusão de arquivo só no próprio projeto vinculado.
- [ ] `/parceiro/comissoes` redireciona sem recibo emitido.
- [ ] Print de recibo de outro parceiro retorna 404.

## Teclado / leitor de tela

- [ ] Skip link leva ao conteúdo.
- [ ] Drawer mobile: Escape fecha, foco volta ao botão menu, Tab fica no painel.
- [ ] Abas do projeto: setas / Home / End.
- [ ] Filtro de etapas anuncia mudança (live region).

## Mobile / contraste

- [ ] Sem scroll horizontal em 320–428 px.
- [ ] Alvos ≥ 44 px no menu, abas e CTAs.
- [ ] Etapas vazias legíveis (sem “apagadas” demais).

## Upload

- [ ] Arquivo > 20 MB rejeitado antes do envio.
- [ ] Formato inválido rejeitado com mensagem clara.
- [ ] Seleção múltipla: sucessos permanecem se um item falhar.
- [ ] HEIC/HEIF aceitos quando o dispositivo envia.

## Usabilidade (5–7 parceiros)

- [ ] Entendem “acompanhar” sem achar que controlam a etapa.
- [ ] Acham “Indicar cliente” e o fluxo de etapas.
- [ ] Consultam PDF/arquivos sem suporte.
- [ ] Com recibo: encontram “Comissões e recibos”; sem recibo: não veem a área.
