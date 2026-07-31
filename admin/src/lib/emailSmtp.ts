import nodemailer from "nodemailer";
import { EMAIL_MAX_ATTACHMENT_BYTES } from "@/lib/emailAreas";
import { formatMailConnectionError } from "@/lib/emailErrors";

export type SmtpConnectionConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
};

export type OutboundAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

export type SendEmailInput = {
  fromAddress: string;
  fromName?: string;
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  inReplyTo?: string;
  references?: string[];
  attachments?: OutboundAttachment[];
};

export async function testSmtpConnection(config: SmtpConnectionConfig) {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: 25_000,
    greetingTimeout: 20_000,
    tls: {
      servername: config.host,
      minVersion: "TLSv1.2",
    },
  });
  try {
    await transporter.verify();
    return { success: true as const };
  } catch (error) {
    console.error("testSmtpConnection:", error);
    return {
      success: false as const,
      error: formatMailConnectionError(error, "SMTP"),
    };
  } finally {
    transporter.close();
  }
}

export async function sendSmtpEmail(
  config: SmtpConnectionConfig,
  input: SendEmailInput
) {
  for (const att of input.attachments || []) {
    if (att.content.length > EMAIL_MAX_ATTACHMENT_BYTES) {
      throw new Error(
        `Anexo "${att.filename}" excede o limite de ${Math.round(EMAIL_MAX_ATTACHMENT_BYTES / (1024 * 1024))} MB.`
      );
    }
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
  });

  try {
    const info = await transporter.sendMail({
      from: input.fromName
        ? `"${input.fromName.replace(/"/g, "")}" <${input.fromAddress}>`
        : input.fromAddress,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      replyTo: input.replyTo,
      inReplyTo: input.inReplyTo,
      references: input.references?.join(" "),
      attachments: (input.attachments || []).map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });
    return { success: true as const, messageId: info.messageId || null };
  } finally {
    transporter.close();
  }
}
