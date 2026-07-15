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

  // Um frame para o browser aplicar o CSS de captura
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );
}

/**
 * Gera PDF no layout de impressão (mesmo visual que o cliente deve ver no link).
 */
export async function generateQuotePdfBlob() {
  const element = document.querySelector<HTMLElement>(".print-page");
  if (!element) {
    throw new Error("Não foi possível localizar o conteúdo do orçamento.");
  }

  const { jsPDF } = await import("jspdf");
  const shell = document.documentElement;

  shell.classList.add("pdf-capture-mode");
  const previousMinHeight = element.style.minHeight;
  const previousHeight = element.style.height;
  const previousOverflow = element.style.overflow;
  element.style.minHeight = "0px";
  element.style.height = "auto";
  element.style.overflow = "visible";

  let canvas: HTMLCanvasElement;
  try {
    await waitForQuoteAssets(element);

    const width = Math.ceil(element.scrollWidth);
    const height = Math.ceil(element.scrollHeight);

    canvas = await html2canvas(element, {
      scale: 2.5,
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
        const clonedPage = clonedDoc.querySelector<HTMLElement>(".print-page");
        if (clonedPage) {
          clonedPage.style.minHeight = "0px";
          clonedPage.style.height = "auto";
          clonedPage.style.overflow = "visible";
          clonedPage.style.border = "none";
          clonedPage.style.borderRadius = "0";
          clonedPage.style.boxShadow = "none";
          clonedPage.style.margin = "0 auto";
        }
      },
    });
  } finally {
    shell.classList.remove("pdf-capture-mode");
    element.style.minHeight = previousMinHeight;
    element.style.height = previousHeight;
    element.style.overflow = previousOverflow;
  }

  const pdf = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  // PNG preserva melhor texto/áreas escuras do cabeçalho/rodapé
  const imgData = canvas.toDataURL("image/png");

  if (imgHeight <= pageHeight + PAGE_OVERFLOW_EPSILON_MM) {
    const drawHeight = Math.min(imgHeight, pageHeight);
    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, drawHeight);
    return pdf.output("blob");
  }

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > PAGE_OVERFLOW_EPSILON_MM) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
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
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
  return fileName;
}
