import {
  Archive,
  Code2,
  File,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  Folder,
  type LucideIcon,
} from "lucide-react";

const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "avif"]);
const VIDEO_EXT = new Set(["mp4", "mkv", "avi", "mov", "webm", "m4v"]);
const AUDIO_EXT = new Set(["mp3", "wav", "flac", "ogg", "m4a", "aac"]);
const ARCHIVE_EXT = new Set(["zip", "rar", "7z", "tar", "gz", "bz2", "xz", "iso"]);
const CODE_EXT = new Set([
  "js", "ts", "jsx", "tsx", "json", "html", "css", "md", "py", "php", "go", "rs", "java", "kt", "sql", "sh", "yml", "yaml",
]);

function ext(name: string): string {
  const parts = name.trim().toLowerCase().split(".");
  return parts.length > 1 ? parts.pop()! : "";
}

export function isImageItem(name: string, mimeType?: string, itemType?: string): boolean {
  if (itemType === "folder") return false;
  const mime = (mimeType || "").toLowerCase();
  if (mime === "image/svg+xml") return false;
  if (mime.startsWith("image/")) return true;
  const e = ext(name);
  return e !== "svg" && IMAGE_EXT.has(e);
}

export function getFileKindLabel(name: string, mimeType?: string, itemType?: string): string {
  if (itemType === "folder") return "Carpeta";
  const e = ext(name).toUpperCase() || "ARCHIVO";
  const mime = (mimeType || "").toLowerCase();
  if (mime.startsWith("image/") || IMAGE_EXT.has(ext(name))) return `Imagen · ${e}`;
  if (mime.startsWith("video/") || VIDEO_EXT.has(ext(name))) return `Vídeo · ${e}`;
  if (mime.startsWith("audio/") || AUDIO_EXT.has(ext(name))) return `Audio · ${e}`;
  if (mime === "application/pdf" || e === "PDF") return "PDF";
  if (ARCHIVE_EXT.has(ext(name))) return `Comprimido · ${e}`;
  if (CODE_EXT.has(ext(name))) return `Código · ${e}`;
  if (e === "JAR") return "Java · JAR";
  return e;
}

export function getFileIcon(name: string, itemType?: string): LucideIcon {
  if (itemType === "folder") return Folder;
  const e = ext(name);
  if (IMAGE_EXT.has(e)) return FileImage;
  if (VIDEO_EXT.has(e)) return FileVideo;
  if (AUDIO_EXT.has(e)) return FileAudio;
  if (ARCHIVE_EXT.has(e)) return Archive;
  if (CODE_EXT.has(e)) return Code2;
  if (e) return FileText;
  return File;
}
