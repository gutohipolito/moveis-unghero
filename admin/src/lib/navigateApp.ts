/** Navegação plena no browser — não depende do App Router. */
export function navigateApp(href: string) {
  if (typeof document !== "undefined") {
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
    try {
      sessionStorage.removeItem("mu-nav-loading");
    } catch {
      /* ignore */
    }
    document.documentElement.classList.remove("mu-nav-loading");
    document.documentElement.removeAttribute("aria-busy");
  }
  window.location.assign(href);
}

export function isSafeInternalPath(value: string | null | undefined): value is string {
  if (!value) return false;
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//") || value.includes("://")) return false;
  return true;
}
