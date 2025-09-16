import { open } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile, mkdir, remove, exists } from "@tauri-apps/plugin-fs";
import { appDataDir, join, basename } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/core";

export function fileUrl(p) {
  if (!p || typeof p !== "string") return null;
  try {
    const norm = p.replace(/\\/g, "/");
    return convertFileSrc(norm);
  } catch {
    return null;
  }
}

export async function pickImageFile() {
  const selected = await open({
    multiple: false,
    filters: [{ name: "Imágenes", extensions: ["png", "jpg", "jpeg", "webp"] }],
  });
  if (!selected) return null;
  const path = Array.isArray(selected) ? selected[0] : selected;
  return {
    path,
    name: path.split(/[\\/]/).pop(),
    previewUrl: convertFileSrc(path),
  };
}

async function ensureDir(dir) {
  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true });
  }
}

export async function copyImageToMedia(idPaciente, fechaISO, source, index = 1) {
  // Puede venir un string o un objeto { path, ... }
  const sourcePath = typeof source === "string" ? source : source?.path;
  if (!sourcePath) throw new Error("copyImageToMedia: source path vacío");

  const root = await appDataDir();
  const folder = await join(root, "media", String(idPaciente), fechaISO);
  if (!(await exists(folder))) {
    await mkdir(folder, { recursive: true });
  }

  const name = await basename(sourcePath);
  const dest = await join(folder, name);

  const bytes = await readFile(sourcePath);
  await writeFile(dest, bytes);

  return dest;
}

export async function deleteLocalFile(p) {
  if (await exists(p)) {
    await remove(p);
  }
}
