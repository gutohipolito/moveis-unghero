import { ImapFlow } from "imapflow";
import { simpleParser, type ParsedMail, type Attachment } from "mailparser";
import {
  looksLikeBrokenEncoding,
  plainTextToSafeHtml,
  repairEmailText,
} from "@/lib/emailText";

export type ImapConnectionConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
};

export type EmailListItem = {
  uid: number;
  seq: number;
  subject: string;
  from: string;
  fromAddress: string;
  date: string | null;
  seen: boolean;
  hasAttachments: boolean;
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

  // textAsHtml do mailparser (quando não há HTML real)
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

export async function listInboxMessages(
  config: ImapConnectionConfig,
  options?: { limit?: number }
): Promise<EmailListItem[]> {
  const limit = options?.limit ?? 40;
  const client = createClient(config);
  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const mailbox = client.mailbox;
      const total =
        mailbox && typeof mailbox === "object" && "exists" in mailbox
          ? Number(mailbox.exists) || 0
          : 0;
      if (total === 0) return [];

      const start = Math.max(1, total - limit + 1);
      const range = `${start}:${total}`;
      const items: EmailListItem[] = [];

      for await (const msg of client.fetch(range, {
        uid: true,
        flags: true,
        envelope: true,
        bodyStructure: true,
      })) {
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

        items.push({
          uid: msg.uid,
          seq: msg.seq,
          subject: repairEmailText(msg.envelope?.subject?.trim() || "(sem assunto)"),
          from: repairEmailText(from),
          fromAddress,
          date: msg.envelope?.date ? new Date(msg.envelope.date).toISOString() : null,
          seen: Boolean(msg.flags?.has("\\Seen")),
          hasAttachments,
        });
      }

      return items.reverse();
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

async function loadParsedMessage(
  config: ImapConnectionConfig,
  uid: number
): Promise<{ uid: number; parsed: ParsedMail } | null> {
  const client = createClient(config);
  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const msg = await client.fetchOne(
        String(uid),
        { uid: true, source: true },
        { uid: true }
      );
      if (!msg || !msg.source) return null;
      const parsed = await simpleParser(msg.source);
      return { uid: msg.uid, parsed };
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

export async function fetchInboxMessage(
  config: ImapConnectionConfig,
  uid: number
): Promise<EmailMessageDetail | null> {
  const client = createClient(config);
  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const msg = await client.fetchOne(
        String(uid),
        { uid: true, envelope: true, source: true, flags: true },
        { uid: true }
      );
      if (!msg || !msg.source) return null;

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

export async function fetchInboxAttachment(
  config: ImapConnectionConfig,
  uid: number,
  attachmentIndex: number
): Promise<EmailAttachmentPayload | null> {
  const loaded = await loadParsedMessage(config, uid);
  if (!loaded) return null;
  const att = loaded.parsed.attachments?.[attachmentIndex];
  if (!att || !att.content) return null;
  const content = Buffer.isBuffer(att.content)
    ? att.content
    : Buffer.from(att.content);
  return {
    filename: att.filename || `anexo-${attachmentIndex + 1}`,
    contentType: att.contentType || "application/octet-stream",
    content,
  };
}
