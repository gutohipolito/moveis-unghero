/** Navegação plena no browser — não depende do App Router. */

export const NAV_LOADING_STORAGE_KEY = "mu-nav-loading";

export function beginAppNavigation() {
  if (typeof document === "undefined") return;
  try {
    sessionStorage.setItem(NAV_LOADING_STORAGE_KEY, "1");
  } catch {
    /* modo privado / storage bloqueado */
  }
  document.documentElement.classList.add("mu-nav-loading");
  document.documentElement.setAttribute("aria-busy", "true");
}

export function endAppNavigation() {
  if (typeof document === "undefined") return;
  try {
    sessionStorage.removeItem(NAV_LOADING_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  document.documentElement.classList.remove("mu-nav-loading");
  document.documentElement.removeAttribute("aria-busy");
}

export function navigateApp(href: string) {
  if (typeof document !== "undefined") {
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  }
  beginAppNavigation();
  window.location.assign(href);
}

export function isSafeInternalPath(value: string | null | undefined): value is string {
  if (!value) return false;
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//") || value.includes("://")) return false;
  return true;
}
