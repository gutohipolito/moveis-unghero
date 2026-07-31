import html2canvas from "html2canvas-pro";
import { slugifyFileName } from "@/lib/quoteWhatsApp";

export class QuotePdfBlobNotConfiguredError extends Error {
  constructor() {
    super("Armazenamento de PDF não configurado na Vercel.");
    this.name = "QuotePdfBlobNotConfiguredError";
  }
}

/** Tolerância em mm: evita 2ª página em branco por arredondamento. */
const PAGE_OVERFLOW_EPSILON_MM = 1.5;

async function waitForQuoteAssets(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
          window.setTimeout(done, 2500);
        })
    )
  );

  if (document.fonts?.ready) {
    try {
      await Promise.race([
        document.fonts.ready,
        new Promise<void>((resolve) => window.setTimeout(resolve, 1500)),
      ]);
    } catch {
      // ignora falha de fonts API
    }
  }

  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );
}

function showCaptureOverlay() {
  const overlay = document.createElement("div");
  overlay.id = "quote-pdf-capture-overlay";
  overlay.setAttribute("aria-live", "polite");
  overlay.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:2147483647",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "background:#0a0a0a",
    "color:#fafafa",
    "font:600 14px/1.4 system-ui,sans-serif",
    "letter-spacing:0.02em",
  ].join(";");
  overlay.textContent = "Gerando PDF…";
  document.body.appendChild(overlay);
  return overlay;
}

export type GeneratePrintPdfOptions = {
  /** Senha de abertura do PDF (ex.: 4 últimos dígitos do celular). */
  userPassword?: string | null;
};

/** Altura A4 em px CSS (~96dpi). Usada para manter o layout flex na captura. */
const A4_HEIGHT_MM = 297;
const A4_WIDTH_MM = 210;

function mmToCssPx(mm: number) {
  return (mm * 96) / 25.4;
}

/**
 * Gera PDF no layout compacto de impressão (sem alterar a tela visível do usuário).
 * Estilos de captura vão só no clone do html2canvas; a tela fica coberta por overlay.
 */
export async function generateQuotePdfBlob(options?: GeneratePrintPdfOptions) {
  const element = document.querySelector<HTMLElement>(".print-page");
  if (!element) {
    throw new Error("Não foi possível localizar o conteúdo do documento.");
  }

  const { jsPDF } = await import("jspdf");
  const shell = document.documentElement;
  const overlay = showCaptureOverlay();

  shell.classList.add("pdf-capture-mode");

  let canvas: HTMLCanvasElement;
  try {
    await waitForQuoteAssets(element);

    const a4WidthPx = Math.ceil(mmToCssPx(A4_WIDTH_MM));
    const a4HeightPx = Math.ceil(mmToCssPx(A4_HEIGHT_MM));
    const width = Math.max(Math.ceil(element.scrollWidth), a4WidthPx);
    // Preserva folha A4 (min-height) para o flex “colar” footer/cards no bottom
    const height = Math.max(
      Math.ceil(element.scrollHeight),
      Math.ceil(element.offsetHeight),
      Math.ceil(element.getBoundingClientRect().height),
      a4HeightPx
    );

    canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: "#ffffff",
      width,
      height,
      windowWidth: Math.max(width, 820),
      windowHeight: height,
      onclone: (clonedDoc) => {
        clonedDoc.documentElement.classList.add("pdf-capture-mode");
        const clonedOverlay = clonedDoc.getElementById("quote-pdf-capture-overlay");
        clonedOverlay?.remove();

        const clonedPage = clonedDoc.querySelector<HTMLElement>(".print-page");
        if (clonedPage) {
          // Mantém altura A4 + flex — NÃO colapsar (isso voltava o layout antigo)
          clonedPage.style.minHeight = `${A4_HEIGHT_MM}mm`;
          clonedPage.style.height = height > a4HeightPx + 2 ? "auto" : `${A4_HEIGHT_MM}mm`;
          clonedPage.style.width = `${A4_WIDTH_MM}mm`;
          clonedPage.style.maxWidth = `${A4_WIDTH_MM}mm`;
          clonedPage.style.display = "flex";
          clonedPage.style.flexDirection = "column";
          clonedPage.style.overflow = "visible";
          clonedPage.style.border = "none";
          clonedPage.style.borderRadius = "0";
          clonedPage.style.boxShadow = "none";
          clonedPage.style.margin = "0";
          clonedPage.style.background = "#ffffff";

          const main = clonedPage.querySelector<HTMLElement>(":scope > main");
          if (main) {
            main.style.flex = "1 1 auto";
            main.style.display = "flex";
            main.style.flexDirection = "column";
            main.style.minHeight = "0";
          }

          const items = clonedPage.querySelectorAll<HTMLElement>(".print-quote-items");
          items.forEach((el) => {
            el.style.flex = "1 1 auto";
            el.style.display = "flex";
            el.style.flexDirection = "column";
          });

          const bottoms = clonedPage.querySelectorAll<HTMLElement>(".print-quote-bottom");
          bottoms.forEach((el) => {
            el.style.flexShrink = "0";
            el.style.marginTop = "auto";
          });

          const footer = clonedPage.querySelector<HTMLElement>(".print-quote-footer");
          if (footer) {
            footer.style.flexShrink = "0";
            footer.style.marginTop = "auto";
          }
        }
      },
    });
  } finally {
    shell.classList.remove("pdf-capture-mode");
    overlay.remove();
  }

  const userPassword = options?.userPassword?.trim() || undefined;
  const ownerPassword = userPassword
    ? `unghero-owner-${userPassword}-${Math.random().toString(36).slice(2, 10)}`
    : undefined;

  const pdf = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
    compress: true,
    ...(userPassword
      ? {
          encryption: {
            userPassword,
            ownerPassword,
            userPermissions: ["print", "copy"] as const,
          },
        }
      : {}),
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const imgData = canvas.toDataURL("image/jpeg", 0.92);

  if (imgHeight <= pageHeight + PAGE_OVERFLOW_EPSILON_MM) {
    // Conteúdo cabe em 1 folha: desenha preenchendo o A4 (evita “encolher” o layout)
    pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, pageHeight);
    return pdf.output("blob");
  }

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > PAGE_OVERFLOW_EPSILON_MM) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  return pdf.output("blob");
}

export async function publishQuotePdfShare(
  quoteId: string,
  clientName: string,
  existingBlob?: Blob
) {
  const blob = existingBlob ?? (await generateQuotePdfBlob());
  const fileName = `orcamento-${slugifyFileName(clientName)}.pdf`;

  const formData = new FormData();
  formData.append("file", blob, fileName);

  const response = await fetch(`/api/quotes/${quoteId}/pdf-share`, {
    method: "POST",
    body: formData,
  });

  const data = (await response.json()) as {
    success?: boolean;
    url?: string;
    code?: string;
    error?: string;
  };

  if (data.code === "BLOB_NOT_CONFIGURED") {
    throw new QuotePdfBlobNotConfiguredError();
  }

  if (!response.ok || !data.success || !data.url) {
    throw new Error(data.error || "Falha ao publicar o PDF");
  }

  return { url: data.url, blob };
}

export function downloadQuotePdf(blob: Blob, clientName: string) {
  const fileName = `orcamento-${slugifyFileName(clientName)}.pdf`;
  return downloadPdfBlob(blob, fileName);
}

export function downloadPdfBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return fileName;
}

/** Alias genérico — captura qualquer `.print-page` (orçamento, recibo, contrato). */
export async function generatePrintPagePdfBlob(options?: GeneratePrintPdfOptions) {
  return generateQuotePdfBlob(options);
}
