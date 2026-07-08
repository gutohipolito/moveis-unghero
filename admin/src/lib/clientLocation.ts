/** Separa cidade e bairro — corrige registros legados do briefing ("Cidade - Bairro"). */
export function resolveClientLocation(client: { cidade: string; bairro?: string | null }) {
  const bairro = (client.bairro || "").trim();
  if (bairro) {
    return { cidade: client.cidade.trim(), bairro };
  }

  const combined = client.cidade.trim();
  const match = combined.match(/^(.+?)\s*[-–·]\s*(.+)$/);
  if (match) {
    return { cidade: match[1].trim(), bairro: match[2].trim() };
  }

  return { cidade: combined, bairro: "" };
}
