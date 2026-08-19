/** Extrai a 1ª página de um PDF (File ou URL) como PNG via pdf.js. */

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
const PDFJS_LOCAL = "/vendor/pdfjs/pdf.min.js";
const PDFJS_LOCAL_WORKER = "/vendor/pdfjs/pdf.worker.min.js";
const PDFJS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
const PDFJS_CDN_WORKER = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

let pdfJsPromise: Promise<NonNullable<typeof window.pdfjsLib>> | null = null;
const capaByUrl = new Map<string, Promise<Blob | null>>();

export function ensurePdfJs(): Promise<NonNullable<typeof window.pdfjsLib>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("pdf.js só no browser"));
  }
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_LOCAL_WORKER;
    return Promise.resolve(window.pdfjsLib);
  }
  if (pdfJsPromise) return pdfJsPromise;

  pdfJsPromise = loadPdfJsScript(PDFJS_LOCAL, PDFJS_LOCAL_WORKER).catch(() =>
    loadPdfJsScript(PDFJS_CDN, PDFJS_CDN_WORKER)
  );

  pdfJsPromise.catch(() => {
    pdfJsPromise = null;
  });

  return pdfJsPromise;
}

function loadPdfJsScript(src: string, workerSrc: string) {
  return new Promise<NonNullable<typeof window.pdfjsLib>>((resolve, reject) => {
    const fail = (error: Error, scriptEl?: HTMLScriptElement | null) => {
      scriptEl?.remove();
      reject(error);
    };

    const onReady = (scriptEl?: HTMLScriptElement | null) => {
      if (!window.pdfjsLib) {
        fail(new Error("pdf.js não carregou"), scriptEl);
        return;
      }
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
      resolve(window.pdfjsLib);
    };

    const existing = document.getElementById(PDFJS_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (window.pdfjsLib) {
        onReady(existing);
        return;
      }
      existing.addEventListener("load", () => onReady(existing), { once: true });
      existing.addEventListener(
        "error",
        () => fail(new Error("Falha ao carregar pdf.js"), existing),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.id = PDFJS_SCRIPT_ID;
    script.src = src;
    script.async = true;
    script.onload = () => onReady(script);
    script.onerror = () => fail(new Error("Falha ao carregar pdf.js"), script);
    document.head.appendChild(script);
  });
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
  const cached = capaByUrl.get(pdfUrl);
  if (cached) return cached;

  const pending = (async () => {
    try {
      const pdfjs = await ensurePdfJs();
      const res = await fetch(pdfUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data }).promise;
      return await renderPageToBlob(pdf);
    } catch (err) {
      console.error("Erro ao extrair capa do PDF (url):", err);
      capaByUrl.delete(pdfUrl);
      return null;
    }
  })();

  capaByUrl.set(pdfUrl, pending);
  return pending;
}
