import { getDeviceId } from "./auth";

/** Hasta ~512 MB por lote cuando hay varios archivos; uno grande va solo. */
const BATCH_MAX_BYTES = 512 * 1024 * 1024;
const BATCH_MAX_FILES = 80;

export type UploadProgress = {
  pct: number;
  label: string;
};

export class UploadCancelledError extends Error {
  constructor() {
    super("Subida cancelada");
    this.name = "UploadCancelledError";
  }
}

type UploadBatch = { files: File[]; paths: string[] };

function uploadStatusError(status: number, body: string): Error {
  if (status === 413) {
    return new Error(
      "Archivo demasiado grande o lote rechazado por el servidor (límite 100 GB por archivo)."
    );
  }
  if (status === 409) {
    return new Error("Conflicto de nombre. Renombra o vacía un poco el destino e inténtalo de nuevo.");
  }
  try {
    const data = JSON.parse(body) as { error?: string };
    if (data.error) return new Error(data.error);
  } catch {
    /* ignore */
  }
  return new Error(`Error al subir (HTTP ${status})`);
}

export function buildUploadBatches(files: File[], relativePaths?: string[]): UploadBatch[] {
  const batches: UploadBatch[] = [];
  let batchFiles: File[] = [];
  let batchPaths: string[] = [];
  let batchBytes = 0;

  const flush = () => {
    if (!batchFiles.length) return;
    batches.push({ files: batchFiles, paths: batchPaths });
    batchFiles = [];
    batchPaths = [];
    batchBytes = 0;
  };

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const relPath = relativePaths?.[i] ?? "";
    const size = file.size || 0;

    if (batchFiles.length > 0) {
      if (batchFiles.length >= BATCH_MAX_FILES || batchBytes + size > BATCH_MAX_BYTES) {
        flush();
      }
    }

    batchFiles.push(file);
    batchPaths.push(relPath);
    batchBytes += size;

    if (size >= BATCH_MAX_BYTES) flush();
  }

  flush();
  return batches;
}

function postUploadBatch(
  batch: UploadBatch,
  parentId: string | null,
  onBatchProgress: (loaded: number, total: number) => void,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new UploadCancelledError());
      return;
    }

    const form = new FormData();
    batch.files.forEach((f) => form.append("files", f));
    if (parentId) form.append("parentId", parentId);
    batch.paths.forEach((p) => form.append("relativePaths", p));

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.withCredentials = true;

    const token = typeof window !== "undefined" ? sessionStorage.getItem("eyedrive.sessionToken") : "";
    if (token) xhr.setRequestHeader("X-Session-Token", token);
    xhr.setRequestHeader("X-Device-Id", getDeviceId());

    const onAbort = () => {
      xhr.abort();
      reject(new UploadCancelledError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onBatchProgress(e.loaded, e.total);
    };

    xhr.onload = () => {
      signal?.removeEventListener("abort", onAbort);
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(uploadStatusError(xhr.status, xhr.responseText));
    };

    xhr.onerror = () => {
      signal?.removeEventListener("abort", onAbort);
      reject(new Error("Error de red. Comprueba la conexión e inténtalo de nuevo."));
    };

    xhr.onabort = () => {
      signal?.removeEventListener("abort", onAbort);
      reject(new UploadCancelledError());
    };

    xhr.send(form);
  });
}

/** Sube archivos en lotes con progreso global y cancelación opcional. */
export async function uploadFilesBatched(
  files: File[],
  parentId: string | null,
  relativePaths?: string[],
  onProgress?: (progress: UploadProgress) => void,
  options?: { signal?: AbortSignal }
): Promise<{ uploaded: number; total: number }> {
  if (!files.length) return { uploaded: 0, total: 0 };

  const batches = buildUploadBatches(files, relativePaths);
  const totalFiles = files.length;
  const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
  let completedBytes = 0;
  let uploadedFiles = 0;

  onProgress?.({ pct: 0, label: `Preparando… 0 de ${totalFiles} archivos` });

  for (let b = 0; b < batches.length; b++) {
    if (options?.signal?.aborted) throw new UploadCancelledError();

    const batch = batches[b];
    const batchBytes = batch.files.reduce((acc, f) => acc + (f.size || 0), 0);
    const batchEnd = uploadedFiles + batch.files.length;

    await postUploadBatch(
      batch,
      parentId,
      (loaded, batchTotal) => {
        const denom = totalBytes > 0 ? totalBytes : totalFiles;
        const numer = totalBytes > 0 ? completedBytes + loaded : batchEnd - batch.files.length + (batchTotal ? (loaded / batchTotal) * batch.files.length : 0);
        const pct = denom > 0 ? Math.min(100, Math.round((numer / denom) * 100)) : 0;
        const name = batch.files.length === 1 ? batch.files[0].name : `${batch.files.length} archivos`;
        onProgress?.({
          pct,
          label: `Subiendo ${name}… ${Math.min(batchEnd, totalFiles)} de ${totalFiles} (${pct}%)`,
        });
      },
      options?.signal
    );

    uploadedFiles += batch.files.length;
    completedBytes += batchBytes;
    onProgress?.({
      pct: totalBytes > 0 ? Math.min(100, Math.round((completedBytes / totalBytes) * 100)) : Math.round((uploadedFiles / totalFiles) * 100),
      label: `Subido ${uploadedFiles} de ${totalFiles} archivos`,
    });
  }

  onProgress?.({ pct: 100, label: "Subida completada" });
  return { uploaded: uploadedFiles, total: totalFiles };
}

export function relativePathsFromFileList(fileList: FileList | File[]): string[] {
  return Array.from(fileList).map(
    (f) => (f as File & { webkitRelativePath?: string }).webkitRelativePath || ""
  );
}
