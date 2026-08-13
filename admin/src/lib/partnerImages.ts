/** Galeria do parceiro: pastas + imagens (coluna `imagens` como JSON). */

export const PARTNER_DEFAULT_FOLDER = "Geral";

export type PartnerImageItem = {
  url: string;
  folder: string;
};

export type PartnerGallery = {
  folders: string[];
  images: PartnerImageItem[];
};

function normalizeFolderName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, 60);
}

function uniqueFolders(folders: string[], images: PartnerImageItem[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [...folders, ...images.map((i) => i.folder)]) {
    const name = normalizeFolderName(raw) || PARTNER_DEFAULT_FOLDER;
    if (seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  if (out.length === 0) out.push(PARTNER_DEFAULT_FOLDER);
  return out;
}

/** Lê CSV legado ou JSON novo. */
export function parsePartnerGallery(raw: string | null | undefined): PartnerGallery {
  const text = (raw || "").trim();
  if (!text) {
    return { folders: [PARTNER_DEFAULT_FOLDER], images: [] };
  }

  if (text.startsWith("{") || text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text) as
        | PartnerGallery
        | PartnerImageItem[]
        | string[];

      if (Array.isArray(parsed)) {
        if (parsed.length === 0) {
          return { folders: [PARTNER_DEFAULT_FOLDER], images: [] };
        }
        if (typeof parsed[0] === "string") {
          const images = (parsed as string[])
            .filter(Boolean)
            .map((url) => ({ url, folder: PARTNER_DEFAULT_FOLDER }));
          return {
            folders: uniqueFolders([PARTNER_DEFAULT_FOLDER], images),
            images,
          };
        }
        const images = (parsed as PartnerImageItem[])
          .filter((item) => item?.url)
          .map((item) => ({
            url: item.url,
            folder: normalizeFolderName(item.folder) || PARTNER_DEFAULT_FOLDER,
          }));
        return {
          folders: uniqueFolders([PARTNER_DEFAULT_FOLDER], images),
          images,
        };
      }

      const folders = Array.isArray(parsed.folders)
        ? parsed.folders.map((f) => normalizeFolderName(String(f))).filter(Boolean)
        : [];
      const images = Array.isArray(parsed.images)
        ? parsed.images
            .filter((item) => item?.url)
            .map((item) => ({
              url: String(item.url),
              folder: normalizeFolderName(String(item.folder || "")) || PARTNER_DEFAULT_FOLDER,
            }))
        : [];
      return {
        folders: uniqueFolders(folders.length ? folders : [PARTNER_DEFAULT_FOLDER], images),
        images,
      };
    } catch {
      // cai no CSV
    }
  }

  const images = text
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean)
    .map((url) => ({ url, folder: PARTNER_DEFAULT_FOLDER }));

  return {
    folders: uniqueFolders([PARTNER_DEFAULT_FOLDER], images),
    images,
  };
}

export function serializePartnerGallery(gallery: PartnerGallery): string | null {
  const folders = uniqueFolders(gallery.folders, gallery.images);
  const images = gallery.images.filter((item) => item.url);
  if (folders.length === 1 && folders[0] === PARTNER_DEFAULT_FOLDER && images.length === 0) {
    return null;
  }
  return JSON.stringify({ folders, images });
}

export function listPartnerImageUrls(raw: string | null | undefined): string[] {
  return parsePartnerGallery(raw).images.map((item) => item.url);
}

export function countPartnerImages(raw: string | null | undefined): number {
  return parsePartnerGallery(raw).images.length;
}

export function addPartnerImage(
  gallery: PartnerGallery,
  url: string,
  folder?: string
): PartnerGallery {
  const folderName = normalizeFolderName(folder || "") || PARTNER_DEFAULT_FOLDER;
  return {
    folders: uniqueFolders([...gallery.folders, folderName], gallery.images),
    images: [...gallery.images, { url, folder: folderName }],
  };
}

export function removePartnerImage(gallery: PartnerGallery, url: string): PartnerGallery {
  return {
    folders: gallery.folders,
    images: gallery.images.filter((item) => item.url !== url),
  };
}

export function addPartnerFolder(gallery: PartnerGallery, name: string): PartnerGallery | { error: string } {
  const folderName = normalizeFolderName(name);
  if (!folderName) return { error: "Informe o nome da pasta." };
  if (gallery.folders.some((f) => f.toLowerCase() === folderName.toLowerCase())) {
    return { error: "Já existe uma pasta com este nome." };
  }
  return {
    folders: [...gallery.folders, folderName],
    images: gallery.images,
  };
}

export function renamePartnerFolder(
  gallery: PartnerGallery,
  from: string,
  to: string
): PartnerGallery | { error: string } {
  const next = normalizeFolderName(to);
  if (!next) return { error: "Informe o novo nome da pasta." };
  if (
    next.toLowerCase() !== from.toLowerCase() &&
    gallery.folders.some((f) => f.toLowerCase() === next.toLowerCase())
  ) {
    return { error: "Já existe uma pasta com este nome." };
  }
  return {
    folders: gallery.folders.map((f) => (f === from ? next : f)),
    images: gallery.images.map((item) =>
      item.folder === from ? { ...item, folder: next } : item
    ),
  };
}

export function removePartnerFolder(
  gallery: PartnerGallery,
  folder: string,
  { deleteImages = false }: { deleteImages?: boolean } = {}
): PartnerGallery | { error: string } {
  const imagesInFolder = gallery.images.filter((item) => item.folder === folder);
  if (imagesInFolder.length > 0 && !deleteImages) {
    return { error: "A pasta ainda tem fotos. Esvazie ou confirme a exclusão." };
  }
  const remainingFolders = gallery.folders.filter((f) => f !== folder);
  return {
    folders: remainingFolders.length ? remainingFolders : [PARTNER_DEFAULT_FOLDER],
    images: deleteImages
      ? gallery.images.filter((item) => item.folder !== folder)
      : gallery.images,
  };
}

export function imagesInFolder(gallery: PartnerGallery, folder: string): PartnerImageItem[] {
  return gallery.images.filter((item) => item.folder === folder);
}
