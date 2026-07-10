import html2canvas from "html2canvas-pro";
import { slugifyFileName } from "@/lib/quoteWhatsApp";

export class QuotePdfBlobNotConfiguredError extends Error {
  constructor() {
    super("Armazenamento de PDF não configurado na Vercel.");
    this.name = "QuotePdfBlobNotConfiguredError";
  }
}

export async function generateQuotePdfBlob() {
  const element = document.querySelector<HTMLElement>(".print-page");
  if (!element) {
    throw new Error("Não foi possível localizar o conteúdo do orçamento.");
  }

  const { jsPDF } = await import("jspdf");

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    width: element.scrollWidth,
    height: element.scrollHeight,
    windowWidth: element.scrollWidth,
  });

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
  const imgData = canvas.toDataURL("image/jpeg", 0.92);

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
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
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
  return fileName;
}
