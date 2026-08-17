/** Mensagens de upload para o operador — nunca expor JSON cru nem 413 da Vercel. */

export function formatBytesLimit(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) {
    return Number.isInteger(mb) ? `${mb} MB` : `${mb.toFixed(1)} MB`;
  }
  const kb = bytes / 1024;
  return `${Math.max(1, Math.round(kb))} KB`;
}

export function formatFileSizeMb(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extractJsonError(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
  try {
    const parsed = JSON.parse(trimmed) as { error?: unknown; message?: unknown };
    if (typeof parsed.error === "string" && parsed.error.trim()) return parsed.error.trim();
    if (typeof parsed.message === "string" && parsed.message.trim()) return parsed.message.trim();
  } catch {
    return null;
  }
  return null;
}

export function describeUploadFailure(input: {
  status?: number;
  bodyText?: string;
  fallback?: string;
  maxBytes?: number;
  fileName?: string;
  allowedHint?: string;
}): string {
  const maxLabel = formatBytesLimit(input.maxBytes ?? 200 * 1024 * 1024);
  const name = input.fileName?.trim() ? `"${input.fileName.trim()}"` : "Este arquivo";
  const raw = (input.bodyText || "").trim();
  const jsonError = extractJsonError(raw);
  const text = jsonError || raw;
  const lower = text.toLowerCase();

  const tooLarge =
    input.status === 413 ||
    /entity too large|payload too large|content too large|request en|function_payload|body exceeded|maximum size|too large|larger than|size limit|excede o limite/.test(
      lower
    ) ||
    /unexpected token ['"]r['"]/.test(lower) ||
    (/is not valid json/.test(lower) && /request en/.test(lower));

  if (tooLarge) {
    return `${name} é grande demais para este envio (máx. ${maxLabel}). Compacte o SketchUp/ZIP ou envie um arquivo menor.`;
  }

  if (
    /unexpected token|is not valid json|json.parse/.test(lower) &&
    !jsonError
  ) {
    return `${name} não pôde ser enviado. Se for SketchUp, DWG ou ZIP grande, compacte o arquivo e tente de novo (máx. ${maxLabel}).`;
  }

  if (input.status === 401 || /não autenticado|unauthoriz|sessão/.test(lower)) {
    return "Sua sessão expirou. Entre de novo no painel e tente enviar o arquivo.";
  }

  if (
    input.status === 403 ||
    /acesso negado|forbidden|sem permissão|pode apenas visualizar|marceneiro pode apenas/.test(lower)
  ) {
    return "Este cargo não pode enviar arquivos nesta pasta. Peça para o projetista ou a diretoria.";
  }

  if (input.status === 404) {
    return "Não encontramos este cômodo ou pasta. Atualize a página e tente de novo.";
  }

  if (
    input.status === 415 ||
    /unsupported media|formato não suportado|formato não aceito|not allowed|content type|mime/.test(
      lower
    )
  ) {
    return `${name} não é um formato aceito. ${input.allowedHint || "Envie imagem, PDF, DWG, SketchUp (.skp) ou ZIP."}`;
  }

  if (input.status === 429 || /too many|muitas/.test(lower)) {
    return "Muitos envios seguidos. Aguarde um instante e tente de novo.";
  }

  if (
    input.status === 503 ||
    /blob_read_write|armazenamento (não|nao) configurado|armazenamento de arquivos/.test(lower)
  ) {
    return "O armazenamento de arquivos está indisponível no momento. Avise a diretoria.";
  }

  if (/failed to fetch|networkerror|load failed|offline|internet/.test(lower)) {
    return "A conexão caiu no meio do envio. Confira a internet e tente de novo.";
  }

  if (input.status && input.status >= 500) {
    return "O servidor não conseguiu salvar o arquivo. Tente de novo em instantes.";
  }

  if (jsonError && !/unexpected token|not valid json/.test(jsonError.toLowerCase())) {
    return jsonError;
  }

  if (text && text.length < 180 && !/^<!doctype|^<html/i.test(text)) {
    return text;
  }

  return input.fallback || "Não foi possível enviar o arquivo. Tente de novo.";
}

export async function readUploadResponse(
  response: Response,
  options?: { maxBytes?: number; fileName?: string; allowedHint?: string }
): Promise<{
  ok: boolean;
  status: number;
  json: Record<string, unknown> | null;
  error: string;
}> {
  const bodyText = await response.text();
  let json: Record<string, unknown> | null = null;
  if (bodyText) {
    try {
      json = JSON.parse(bodyText) as Record<string, unknown>;
    } catch {
      json = null;
    }
  }

  const apiError = typeof json?.error === "string" ? json.error : undefined;
  const failed = !response.ok || json?.success === false;
  if (!failed) {
    return { ok: true, status: response.status, json, error: "" };
  }

  return {
    ok: false,
    status: response.status,
    json,
    error: describeUploadFailure({
      status: response.status,
      bodyText: apiError || bodyText,
      maxBytes: options?.maxBytes,
      fileName: options?.fileName,
      allowedHint: options?.allowedHint,
    }),
  };
}

export function describeUploadException(
  error: unknown,
  options?: { maxBytes?: number; fileName?: string; allowedHint?: string }
): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  return describeUploadFailure({
    bodyText: message,
    maxBytes: options?.maxBytes,
    fileName: options?.fileName,
    allowedHint: options?.allowedHint,
    fallback: "Não foi possível enviar o arquivo. Tente de novo.",
  });
}

export function validateOperatorFile(
  file: File,
  opts: {
    maxBytes: number;
    isAllowed: (file: { name: string; type?: string | null }) => boolean;
    allowedHint: string;
  }
): string | null {
  if (!file.size) {
    return `"${file.name}" está vazio. Escolha outro arquivo.`;
  }
  if (file.size > opts.maxBytes) {
    return `"${file.name}" tem ${formatFileSizeMb(file.size)}. O limite é ${formatBytesLimit(opts.maxBytes)}. Compacte o SketchUp ou envie um arquivo menor.`;
  }
  if (!opts.isAllowed(file)) {
    return `"${file.name}" não é um formato aceito. ${opts.allowedHint}`;
  }
  return null;
}
