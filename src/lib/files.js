import { open } from "@tauri-apps/api/dialog";
import { readBinaryFile, writeBinaryFile, createDir, removeFile, exists } from "@tauri-apps/api/fs";
import { appDataDir, join } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/tauri";

export async function getAppDataDir() {
  return await appDataDir();
}

export async function ensureDir(dir) {
  const ok = await exists(dir);
  if (!ok) {
    await createDir(dir, { recursive: true });
  }
}

export async function getMediaDirForPaciente(id_paciente) {
  const base = await getAppDataDir();
  const media = await join(base, "media");
  await ensureDir(media);
  const dir = await join(media, String(id_paciente));
  await ensureDir(dir);
  return dir;
}

export function fileUrl(localPath) {
  // Para usar en <img src="...">
  return convertFileSrc(localPath);
}

export async function pickImageFile() {
  const selected = await open({
    multiple: false,
    filters: [{ name: "Imágenes", extensions: ["jpg", "jpeg", "png", "webp"] }],
  });
  if (!selected) return null;
  return selected; // string path
}

export async function copyImageToMedia(id_paciente, fechaISO, originalPath, indexHint = 1) {
  const dir = await getMediaDirForPaciente(id_paciente);
  // conserva extensión
  const ext = (String(originalPath).split(".").pop() || "jpg").toLowerCase();
  const fname = `${fechaISO}_${Date.now()}_${indexHint}.${ext}`;
  const destPath = await join(dir, fname);
  const bin = await readBinaryFile(originalPath);
  await writeBinaryFile({ contents: bin, path: destPath });
  return destPath; // ruta absoluta local
}

export async function deleteLocalFile(path) {
  const ok = await exists(path);
  if (ok) await removeFile(path);
}
