/** Extrai a 1ª página de um PDF (File ou URL) como PNG via pdf.js (CDN). */

declare global {
  interface Window {
    pdfjsLib?: {
      GlobalWorkerOptions: { workerSrc: string };
      getDocument: (src: unknown) => { promise: Promise<PdfDocument> };
    };
  }
}

interface PdfDocument {
  getPage: (n: number) => Promise<PdfPage>;
}

interface PdfPage {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (opts: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
  }) => { promise: Promise<void> };
}

const PDFJS_VERSION = "3.11.174";
const PDFJS_SCRIPT_ID = "pdfjs-script";
const PDFJS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
const PDFJS_WORKER = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

let pdfJsPromise: Promise<NonNullable<typeof window.pdfjsLib>> | null = null;

export function ensurePdfJs(): Promise<NonNullable<typeof window.pdfjsLib>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("pdf.js só no browser"));
  }
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    return Promise.resolve(window.pdfjsLib);
  }
  if (pdfJsPromise) return pdfJsPromise;

  pdfJsPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(PDFJS_SCRIPT_ID) as HTMLScriptElement | null;
    const onReady = () => {
      if (!window.pdfjsLib) {
        reject(new Error("pdf.js não carregou"));
        return;
      }
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      resolve(window.pdfjsLib);
    };

    if (existing) {
      if (window.pdfjsLib) onReady();
      else existing.addEventListener("load", onReady, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Falha ao carregar pdf.js")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.id = PDFJS_SCRIPT_ID;
    script.src = PDFJS_CDN;
    script.async = true;
    script.onload = onReady;
    script.onerror = () => reject(new Error("Falha ao carregar pdf.js"));
    document.head.appendChild(script);
  });

  return pdfJsPromise;
}

async function renderPageToBlob(pdf: PdfDocument, scale = 1.4): Promise<Blob | null> {
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return null;

  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: context, viewport }).promise;

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

/** Gera PNG da 1ª página a partir de um File (upload). */
export async function generateCapaFromPdfFile(pdfFile: File): Promise<File | null> {
  try {
    const pdfjs = await ensurePdfJs();
    const data = await pdfFile.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data }).promise;
    const blob = await renderPageToBlob(pdf);
    if (!blob) return null;
    return new File([blob], "capa-pdf-gerada.png", { type: "image/png" });
  } catch (err) {
    console.error("Erro ao extrair capa do PDF (file):", err);
    return null;
  }
}

/** Gera PNG da 1ª página a partir de uma URL pública do PDF. */
export async function generateCapaFromPdfUrl(pdfUrl: string): Promise<Blob | null> {
  try {
    const pdfjs = await ensurePdfJs();
    // Baixa o PDF e renderiza via ArrayBuffer (mais confiável que url+CORS no worker).
    const res = await fetch(pdfUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data }).promise;
    return await renderPageToBlob(pdf);
  } catch (err) {
    console.error("Erro ao extrair capa do PDF (url):", err);
    return null;
  }
}
