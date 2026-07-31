/** Helpers da Fullscreen API (Chrome/Android + webkit). */

export function getFullscreenElement(): Element | null {
  if (typeof document === "undefined") return null;
  const doc = document as Document & {
    webkitFullscreenElement?: Element | null;
  };
  return document.fullscreenElement || doc.webkitFullscreenElement || null;
}

export function isDocumentFullscreen() {
  return Boolean(getFullscreenElement());
}

export function canUseFullscreenApi() {
  if (typeof document === "undefined") return false;
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => void;
  };
  return Boolean(el.requestFullscreen || el.webkitRequestFullscreen);
}

export async function enterDocumentFullscreen(): Promise<boolean> {
  if (typeof document === "undefined") return false;
  if (isDocumentFullscreen()) return true;

  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };

  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen({ navigationUI: "hide" });
      return true;
    }
    if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen();
      return true;
    }
  } catch {
    return false;
  }
  return isDocumentFullscreen();
}

export async function exitDocumentFullscreen(): Promise<boolean> {
  if (typeof document === "undefined") return false;
  if (!isDocumentFullscreen()) return true;

  const doc = document as Document & {
    webkitExitFullscreen?: () => Promise<void> | void;
  };

  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
      return true;
    }
    if (doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen();
      return true;
    }
  } catch {
    return false;
  }
  return !isDocumentFullscreen();
}

export async function toggleDocumentFullscreen(): Promise<boolean> {
  if (isDocumentFullscreen()) {
    await exitDocumentFullscreen();
    return false;
  }
  const ok = await enterDocumentFullscreen();
  return ok;
}
