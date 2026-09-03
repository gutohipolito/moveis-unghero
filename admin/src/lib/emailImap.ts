import { ImapFlow } from "imapflow";
import { simpleParser, type ParsedMail, type Attachment } from "mailparser";
import {
  looksLikeBrokenEncoding,
  plainTextToSafeHtml,
  repairEmailText,
} from "@/lib/emailText";
import type { MailFolderKey, EmailListItem } from "@/lib/emailAreas";

export type { MailFolderKey, EmailListItem };

export type ImapConnectionConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
};

export type EmailMessageDetail = {
  uid: number;
  subject: string;
  from: string;
  fromAddress: string;
  to: string;
  date: string | null;
  text: string;
  html: string | null;
  messageId: string | null;
  inReplyTo: string | null;
  references: string[];
  attachments: Array<{
    filename: string;
    contentType: string;
    size: number;
    index: number;
  }>;
};

export type EmailAttachmentPayload = {
  filename: string;
  contentType: string;
  content: Buffer;
};

type SpecialFolderKind = "trash" | "junk";

const SPECIAL_USE: Record<SpecialFolderKind, string> = {
  trash: "\\Trash",
  junk: "\\Junk",
};

const FOLDER_NAME_HINTS: Record<SpecialFolderKind, string[]> = {
  trash: ["trash", "lixeira", "deleted", "bin", "excluídos", "excluidos"],
  junk: ["junk", "spam", "lixo", "bulk", "bulk mail", "correio não solicitado"],
};

function createClient(config: ImapConnectionConfig) {
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: true,
    auth: { user: config.user, pass: config.pass },
    logger: false,
    connectionTimeout: 25_000,
    greetingTimeout: 20_000,
    tls: {
      servername: config.host,
      minVersion: "TLSv1.2",
    },
  });
  client.on("error", () => {
    /* handled via connect() rejection */
  });
  return client;
}

function normalizeParsedBody(parsed: ParsedMail): { text: string; html: string | null } {
  let text = repairEmailText(parsed.text || "");
  let html: string | null =
    typeof parsed.html === "string" && parsed.html.trim()
      ? repairEmailText(parsed.html)
      : null;

  if (!html && typeof parsed.textAsHtml === "string" && parsed.textAsHtml.trim()) {
    const asHtml = repairEmailText(parsed.textAsHtml);
    if (!looksLikeBrokenEncoding(asHtml)) {
      html = asHtml;
    }
  }

  if (html && looksLikeBrokenEncoding(html) && text && !looksLikeBrokenEncoding(text)) {
    html = plainTextToSafeHtml(text);
  }

  if (!html && text) {
    html = plainTextToSafeHtml(text);
  }

  return { text, html };
}

function mapAttachments(parsed: ParsedMail) {
  return (parsed.attachments || []).map((a: Attachment, index: number) => ({
    filename: a.filename || `anexo-${index + 1}`,
    contentType: a.contentType || "application/octet-stream",
    size: a.size || (Buffer.isBuffer(a.content) ? a.content.length : 0),
    index,
  }));
}

function mapFetchToListItem(msg: {
  uid: number;
  seq: number;
  envelope?: {
    subject?: string | null;
    date?: Date | string | null;
    from?: Array<{ name?: string | null; address?: string | null }> | null;
  } | null;
  flags?: Set<string> | null;
  bodyStructure?: {
    childNodes?: Array<{
      disposition?: string | null;
      dispositionParameters?: { filename?: string } | null;
    }>;
  } | null;
}): EmailListItem {
  const fromEntry = msg.envelope?.from?.[0];
  const fromName = fromEntry?.name?.trim();
  const fromAddress = fromEntry?.address || "";
  const from = fromName
    ? `${fromName} <${fromAddress}>`
    : fromAddress || "(sem remetente)";

  const hasAttachments = Boolean(
    msg.bodyStructure &&
      "childNodes" in msg.bodyStructure &&
      Array.isArray(msg.bodyStructure.childNodes) &&
      msg.bodyStructure.childNodes.some(
        (node) =>
          node.disposition === "attachment" ||
          (node.disposition === "inline" && node.dispositionParameters?.filename)
      )
  );

  return {
    uid: msg.uid,
    seq: msg.seq,
    subject: repairEmailText(msg.envelope?.subject?.trim() || "(sem assunto)"),
    from: repairEmailText(from),
    fromAddress,
    date: msg.envelope?.date ? new Date(msg.envelope.date).toISOString() : null,
    seen: Boolean(msg.flags?.has("\\Seen")),
    hasAttachments,
  };
}

async function resolveSpecialFolderPath(
  client: ImapFlow,
  kind: SpecialFolderKind
): Promise<string | null> {
  const folders = await client.list();
  const special = SPECIAL_USE[kind];
  const bySpecial = folders.find((f) => f.specialUse === special);
  if (bySpecial?.path) return bySpecial.path;

  const hints = FOLDER_NAME_HINTS[kind];
  const byName = folders.find((f) => {
    const name = (f.name || "").toLowerCase();
    const path = (f.path || "").toLowerCase();
    return hints.some((h) => name === h || path.endsWith(h) || path.includes(`.${h}`));
  });
  return byName?.path || null;
}

/** Resolve o caminho IMAP real para a pasta lógica do painel. */
export async function resolveMailFolderPath(
  config: ImapConnectionConfig,
  folderKey: MailFolderKey
): Promise<string> {
  if (folderKey === "inbox" || folderKey === "unread") return "INBOX";

  const client = createClient(config);
  await client.connect();
  try {
    const kind: SpecialFolderKind = folderKey === "spam" ? "junk" : "trash";
    const path = await resolveSpecialFolderPath(client, kind);
    if (!path) {
      throw new Error(
        folderKey === "spam"
          ? "Pasta de Spam/Junk não encontrada nesta caixa."
          : "Pasta de Lixeira não encontrada nesta caixa."
      );
    }
    return path;
  } finally {
    try {
      await client.logout();
    } catch {
      /* ignore */
    }
  }
}

async function withFolderClient<T>(
  config: ImapConnectionConfig,
  folderPath: string,
  fn: (client: ImapFlow) => Promise<T>
): Promise<T> {
  const client = createClient(config);
  await client.connect();
  try {
    const lock = await client.getMailboxLock(folderPath);
    try {
      return await fn(client);
    } finally {
      lock.release();
    }
  } finally {
    try {
      await client.logout();
    } catch {
      /* ignore */
    }
  }
}

export async function testImapConnection(config: ImapConnectionConfig) {
  const client = createClient(config);
  try {
    await client.connect();
    await client.mailboxOpen("INBOX");
    return { success: true as const };
  } catch (error) {
    const { formatMailConnectionError } = await import("@/lib/emailErrors");
    console.error("testImapConnection:", error);
    return {
      success: false as const,
      error: formatMailConnectionError(error, "IMAP"),
    };
  } finally {
    try {
      await client.logout();
    } catch {
      /* ignore */
    }
  }
}

export async function listFolderMessages(
  config: ImapConnectionConfig,
  folderKey: MailFolderKey,
  options?: { limit?: number }
): Promise<{ folderPath: string; items: EmailListItem[]; inboxUnseen: number }> {
  const limit = options?.limit ?? 40;
  const client = createClient(config);
  await client.connect();
  try {
    let inboxUnseen = 0;
    try {
      const status = await client.status("INBOX", { unseen: true });
      inboxUnseen = Number(status.unseen) || 0;
    } catch {
      inboxUnseen = 0;
    }

    let folderPath = "INBOX";
    if (folderKey === "spam" || folderKey === "trash") {
      const kind: SpecialFolderKind = folderKey === "spam" ? "junk" : "trash";
      const resolved = await resolveSpecialFolderPath(client, kind);
      if (!resolved) {
        throw new Error(
          folderKey === "spam"
            ? "Pasta de Spam/Junk não encontrada nesta caixa."
            : "Pasta de Lixeira não encontrada nesta caixa."
        );
      }
      folderPath = resolved;
    }

    const lock = await client.getMailboxLock(folderPath);
    try {
      try {
        await client.noop();
      } catch {
        /* alguns servidores só atualizam EXISTS após NOOP */
      }
      const mailbox = client.mailbox;
      const total =
        mailbox && typeof mailbox === "object" && "exists" in mailbox
          ? Number(mailbox.exists) || 0
          : 0;
      if (total === 0) return { folderPath, items: [], inboxUnseen };

      const items: EmailListItem[] = [];

      if (folderKey === "unread") {
        const searched = await client.search({ seen: false }, { uid: true });
        const uids = Array.isArray(searched) ? searched : [];
        if (uids.length === 0) {
          return { folderPath, items: [], inboxUnseen };
        }
        const slice = uids.slice(-limit);
        for await (const msg of client.fetch(
          slice,
          {
            uid: true,
            flags: true,
            envelope: true,
            bodyStructure: true,
          },
          { uid: true }
        )) {
          items.push(mapFetchToListItem(msg));
        }
        items.sort((a, b) => {
          const da = a.date ? Date.parse(a.date) : 0;
          const db = b.date ? Date.parse(b.date) : 0;
          return db - da;
        });
        return { folderPath, items, inboxUnseen };
      }

      const start = Math.max(1, total - limit + 1);
      const range = `${start}:*`;
      for await (const msg of client.fetch(range, {
        uid: true,
        flags: true,
        envelope: true,
        bodyStructure: true,
      })) {
        items.push(mapFetchToListItem(msg));
      }
      return { folderPath, items: items.reverse().slice(0, limit), inboxUnseen };
    } finally {
      lock.release();
    }
  } finally {
    try {
      await client.logout();
    } catch {
      /* ignore */
    }
  }
}

/** Contagem de não lidos da INBOX via STATUS — sem baixar mensagens. */
export async function getInboxUnreadCount(config: ImapConnectionConfig): Promise<number> {
  const client = createClient(config);
  await client.connect();
  try {
    const status = await client.status("INBOX", { unseen: true });
    return Number(status.unseen) || 0;
  } finally {
    try {
      await client.logout();
    } catch {
      /* ignore */
    }
  }
}

export async function fetchFolderMessage(
  config: ImapConnectionConfig,
  folderPath: string,
  uid: number
): Promise<EmailMessageDetail | null> {
  return withFolderClient(config, folderPath, async (client) => {
    const msg = await client.fetchOne(
      String(uid),
      { uid: true, envelope: true, source: true, flags: true },
      { uid: true }
    );
    if (!msg || !msg.source) return null;

    if (!msg.flags?.has("\\Seen")) {
      try {
        await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
      } catch {
        /* ignore */
      }
    }

    const parsed = await simpleParser(msg.source);
    const { text, html } = normalizeParsedBody(parsed);

    const fromEntry = msg.envelope?.from?.[0];
    const fromName = fromEntry?.name?.trim();
    const fromAddress = fromEntry?.address || parsed.from?.value?.[0]?.address || "";
    const from = repairEmailText(
      fromName
        ? `${fromName} <${fromAddress}>`
        : parsed.from?.text || fromAddress || "(sem remetente)"
    );

    const parsedTo = parsed.to;
    const parsedToText = Array.isArray(parsedTo)
      ? parsedTo.map((a) => a.text).join(", ")
      : parsedTo?.text || "";
    const to = repairEmailText(
      msg.envelope?.to?.map((t) => t.address).filter(Boolean).join(", ") ||
        parsedToText ||
        ""
    );

    const refs = parsed.references
      ? Array.isArray(parsed.references)
        ? parsed.references
        : [parsed.references]
      : [];

    return {
      uid: msg.uid,
      subject: repairEmailText(
        msg.envelope?.subject?.trim() || parsed.subject || "(sem assunto)"
      ),
      from,
      fromAddress,
      to,
      date: msg.envelope?.date
        ? new Date(msg.envelope.date).toISOString()
        : parsed.date
          ? parsed.date.toISOString()
          : null,
      text,
      html,
      messageId: parsed.messageId || msg.envelope?.messageId || null,
      inReplyTo: parsed.inReplyTo || null,
      references: refs.map(String),
      attachments: mapAttachments(parsed),
    };
  });
}

export async function fetchInboxMessage(
  config: ImapConnectionConfig,
  uid: number
): Promise<EmailMessageDetail | null> {
  return fetchFolderMessage(config, "INBOX", uid);
}

export async function fetchFolderAttachment(
  config: ImapConnectionConfig,
  folderPath: string,
  uid: number,
  attachmentIndex: number
): Promise<EmailAttachmentPayload | null> {
  return withFolderClient(config, folderPath, async (client) => {
    const msg = await client.fetchOne(String(uid), { uid: true, source: true }, { uid: true });
    if (!msg || !msg.source) return null;
    const parsed = await simpleParser(msg.source);
    const att = parsed.attachments?.[attachmentIndex];
    if (!att || !att.content) return null;
    const content = Buffer.isBuffer(att.content) ? att.content : Buffer.from(att.content);
    return {
      filename: att.filename || `anexo-${attachmentIndex + 1}`,
      contentType: att.contentType || "application/octet-stream",
      content,
    };
  });
}

export async function fetchInboxAttachment(
  config: ImapConnectionConfig,
  uid: number,
  attachmentIndex: number
): Promise<EmailAttachmentPayload | null> {
  return fetchFolderAttachment(config, "INBOX", uid, attachmentIndex);
}

export async function setFolderMessageSeen(
  config: ImapConnectionConfig,
  folderPath: string,
  uid: number,
  seen: boolean
): Promise<void> {
  await withFolderClient(config, folderPath, async (client) => {
    if (seen) {
      await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
    } else {
      await client.messageFlagsRemove(String(uid), ["\\Seen"], { uid: true });
    }
  });
}

export async function setInboxMessageSeen(
  config: ImapConnectionConfig,
  uid: number,
  seen: boolean
): Promise<void> {
  return setFolderMessageSeen(config, "INBOX", uid, seen);
}

export type MoveDestination = "trash" | "junk" | "inbox";

const MOVE_CHUNK = 25;

function normalizeUids(uids: number[]): number[] {
  return [...new Set(uids.filter((uid) => Number.isInteger(uid) && uid > 0))];
}

/**
 * Move uma ou mais mensagens entre pastas na mesma conexão IMAP.
 * Na lixeira (ou sem pasta de lixo), exclui de fato.
 */
export async function moveFolderMessages(
  config: ImapConnectionConfig,
  fromFolderPath: string,
  uids: number[],
  destination: MoveDestination
): Promise<{ folder: string | null; deleted: boolean; moved: number }> {
  const unique = normalizeUids(uids);
  if (unique.length === 0) {
    return { folder: fromFolderPath, deleted: false, moved: 0 };
  }

  return withFolderClient(config, fromFolderPath, async (client) => {
    const runChunks = async (
      fn: (uidList: string) => Promise<unknown>
    ) => {
      for (let i = 0; i < unique.length; i += MOVE_CHUNK) {
        const chunk = unique.slice(i, i + MOVE_CHUNK);
        await fn(chunk.join(","));
      }
    };

    if (destination === "inbox") {
      if (fromFolderPath === "INBOX") {
        return { folder: "INBOX", deleted: false, moved: 0 };
      }
      await runChunks(async (uidList) => {
        const moved = await client.messageMove(uidList, "INBOX", { uid: true });
        if (!moved) throw new Error("Não foi possível mover para a Entrada.");
      });
      return { folder: "INBOX", deleted: false, moved: unique.length };
    }

    const kind: SpecialFolderKind = destination === "junk" ? "junk" : "trash";
    const folder = await resolveSpecialFolderPath(client, kind);

    if (destination === "trash" && (!folder || folder === fromFolderPath)) {
      await runChunks(async (uidList) => {
        const ok = await client.messageDelete(uidList, { uid: true });
        if (!ok) throw new Error("Não foi possível excluir a mensagem.");
      });
      return { folder: folder ?? null, deleted: true, moved: unique.length };
    }

    if (!folder) {
      throw new Error(
        destination === "junk"
          ? "Pasta de Spam/Junk não encontrada nesta caixa. Verifique no webmail do HostGator."
          : "Pasta de Lixeira não encontrada nesta caixa."
      );
    }

    await runChunks(async (uidList) => {
      const moved = await client.messageMove(uidList, folder, { uid: true });
      if (!moved) {
        throw new Error(
          destination === "junk"
            ? "Não foi possível mover para Spam."
            : "Não foi possível mover para a Lixeira."
        );
      }
    });
    return { folder, deleted: false, moved: unique.length };
  });
}

export async function moveFolderMessage(
  config: ImapConnectionConfig,
  fromFolderPath: string,
  uid: number,
  destination: MoveDestination
): Promise<{ folder: string | null; deleted: boolean }> {
  const result = await moveFolderMessages(config, fromFolderPath, [uid], destination);
  return { folder: result.folder, deleted: result.deleted };
}

export async function moveInboxMessage(
  config: ImapConnectionConfig,
  uid: number,
  destination: SpecialFolderKind
): Promise<{ folder: string | null; deleted: boolean }> {
  return moveFolderMessage(config, "INBOX", uid, destination);
}
