/** html2canvas (usado pelo html2pdf.js) não entende lab()/oklch() do Tailwind v4. */

let colorCanvas: HTMLCanvasElement | null = null;

function cssColorToRgb(color: string): string {
  if (!color || color === "transparent" || color === "rgba(0, 0, 0, 0)") {
    return color;
  }

  if (!colorCanvas) {
    colorCanvas = document.createElement("canvas");
  }

  const ctx = colorCanvas.getContext("2d");
  if (!ctx) return color;

  try {
    ctx.fillStyle = "#000000";
    ctx.fillStyle = color;
    return ctx.fillStyle;
  } catch {
    return color;
  }
}

function sanitizeCssValue(prop: string, value: string): string {
  if (!value || !/lab\(|lch\(|oklch\(|oklab\(/i.test(value)) {
    return value;
  }

  if (prop.includes("shadow")) {
    return "none";
  }

  if (prop.includes("image") || prop.includes("gradient")) {
    const flat = cssColorToRgb(value);
    return flat.includes("lab(") ? "none" : flat;
  }

  return cssColorToRgb(value);
}

const INLINE_PROPS = [
  "display",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "z-index",
  "box-sizing",
  "width",
  "height",
  "min-width",
  "max-width",
  "min-height",
  "max-height",
  "margin",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "padding",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "border",
  "border-top",
  "border-right",
  "border-bottom",
  "border-left",
  "border-radius",
  "border-collapse",
  "border-spacing",
  "color",
  "background",
  "background-color",
  "background-image",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "line-height",
  "letter-spacing",
  "text-align",
  "text-transform",
  "text-decoration",
  "white-space",
  "word-break",
  "overflow",
  "overflow-wrap",
  "flex",
  "flex-direction",
  "flex-wrap",
  "flex-grow",
  "flex-shrink",
  "align-items",
  "align-self",
  "justify-content",
  "justify-self",
  "gap",
  "grid-template-columns",
  "grid-column",
  "vertical-align",
  "opacity",
  "box-shadow",
  "object-fit",
  "object-position",
  "list-style",
  "list-style-type",
  "fill",
  "stroke",
] as const;

function inlineSafeStyles(sourceEl: HTMLElement, clonedEl: HTMLElement) {
  const computed = window.getComputedStyle(sourceEl);

  for (const prop of INLINE_PROPS) {
    const raw = computed.getPropertyValue(prop);
    if (!raw) continue;

    let value = raw;
    if (
      prop.includes("color") ||
      prop.includes("border") ||
      prop === "background" ||
      prop === "fill" ||
      prop === "stroke"
    ) {
      value = sanitizeCssValue(prop, raw);
    }

    clonedEl.style.setProperty(prop, value);
  }

  if (sourceEl instanceof SVGElement) {
    const fill = sourceEl.getAttribute("fill");
    const stroke = sourceEl.getAttribute("stroke");
    if (fill) clonedEl.setAttribute("fill", cssColorToRgb(fill));
    if (stroke) clonedEl.setAttribute("stroke", cssColorToRgb(stroke));
  }
}

function walkAndInlineStyles(sourceRoot: Element, clonedRoot: Element) {
  if (sourceRoot instanceof HTMLElement && clonedRoot instanceof HTMLElement) {
    inlineSafeStyles(sourceRoot, clonedRoot);
  }

  const sourceChildren = Array.from(sourceRoot.children);
  const clonedChildren = Array.from(clonedRoot.children);

  for (let i = 0; i < sourceChildren.length; i += 1) {
    const sourceChild = sourceChildren[i];
    const clonedChild = clonedChildren[i];
    if (sourceChild && clonedChild) {
      walkAndInlineStyles(sourceChild, clonedChild);
    }
  }
}

/** Remove folhas de estilo do clone e inline estilos em RGB para o html2canvas. */
export function prepareCloneForHtml2Canvas(
  clonedDoc: Document,
  sourceSelector = ".print-page"
) {
  clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    node.remove();
  });

  const sourceRoot = document.querySelector(sourceSelector);
  const clonedRoot = clonedDoc.querySelector(sourceSelector);
  if (!sourceRoot || !clonedRoot) return;

  walkAndInlineStyles(sourceRoot, clonedRoot);
}

export function createPrintPageHtml2CanvasOptions(
  sourceSelector = ".print-page"
): Record<string, unknown> {
  return {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    onclone: (clonedDoc: Document) => {
      prepareCloneForHtml2Canvas(clonedDoc, sourceSelector);
    },
  };
}
