const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const multer = require("multer");
const { Pool } = require("pg");
const archiver = require("archiver");

const PORT = Number(process.env.PORT) || 3000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "data", "uploads");
const MAX_FILE_BYTES = Number.parseInt(
  process.env.MAX_FILE_BYTES || String(8 * 1024 * 1024 * 1024),
  10
);
/* Límite por petición (subida en lotes en el cliente). Máx. 200000 por entorno. */
const MAX_FILES_PER_REQUEST = Math.min(
  Math.max(1, Number.parseInt(process.env.MAX_FILES_PER_REQUEST || "20000", 10)),
  200000
);
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://eyed:eyedpass@localhost:5432/eyed";

const pool = new Pool({ connectionString: DATABASE_URL });
const app = express();

app.use(express.json({ limit: "2mb" }));

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toParentUuid(raw) {
  if (raw == null || raw === "" || raw === "null") return { ok: true, value: null };
  const s = String(raw);
  if (!UUID_RE.test(s)) return { ok: false, error: "parentId no válido" };
  return { ok: true, value: s };
}

function ensureUploadDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      parent_id UUID REFERENCES items(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('file', 'folder')),
      size BIGINT NOT NULL DEFAULT 0,
      storage_key TEXT,
      mime_type TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS items_unique_sibling_name
    ON items (COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), name);
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shares (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      token TEXT NOT NULL UNIQUE,
      folder_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function waitForDb() {
  const max = 30;
  for (let i = 0; i < max; i++) {
    try {
      const c = await pool.connect();
      c.release();
      return;
    } catch (e) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error("No se pudo conectar a PostgreSQL");
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadDir();
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "") || "";
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES_PER_REQUEST },
});

const TOKEN_RE = /^[0-9a-f]{64}$/i;

async function isUnderSharedFolder(shareRootId, itemId) {
  const { rows } = await pool.query(
    `WITH RECURSIVE up AS (
       SELECT id, parent_id FROM items WHERE id = $1::uuid
       UNION ALL
       SELECT p.id, p.parent_id FROM items p
       INNER JOIN up u ON p.id = u.parent_id
     )
     SELECT EXISTS(SELECT 1 FROM up WHERE id = $2::uuid) AS ok`,
    [itemId, shareRootId]
  );
  return Boolean(rows[0].ok);
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "eyedrive" });
});

app.get("/compartir/:token", (req, res) => {
  if (!TOKEN_RE.test(req.params.token)) {
    return res.status(400).type("text/plain").send("Enlace no válido");
  }
  res.sendFile(path.join(__dirname, "public", "compartir.html"));
});

app.get("/api/items", async (req, res) => {
  const p = toParentUuid(req.query.parentId);
  if (!p.ok) return res.status(400).json({ error: p.error });
  const parentId = p.value;
  try {
    const { rows } = await pool.query(
      `SELECT id, name, type, size, created_at, mime_type
       FROM items
       WHERE parent_id IS NOT DISTINCT FROM $1::uuid
       ORDER BY type DESC, lower(name)`,
      [parentId]
    );
    res.json(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        itemType: r.type,
        size: Number(r.size),
        addedAt: r.created_at,
        mimeType: r.mime_type || "",
      }))
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al listar" });
  }
});

app.post("/api/folders", async (req, res) => {
  const name = (req.body?.name || "").trim();
  const pr = toParentUuid(req.body?.parentId);
  if (!pr.ok) return res.status(400).json({ error: pr.error });
  const parentId = pr.value;
  if (!name) {
    return res.status(400).json({ error: "Nombre requerido" });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO items (parent_id, name, type, size)
       VALUES ($1::uuid, $2, 'folder', 0)
       RETURNING id, name, type, size, created_at, mime_type`,
      [parentId, name]
    );
    const r = rows[0];
    res.status(201).json({
      id: r.id,
      name: r.name,
      itemType: r.type,
      size: 0,
      addedAt: r.created_at,
      mimeType: "",
    });
  } catch (e) {
    if (e.code === "23505") {
      return res.status(409).json({ error: "Ya existe con ese nombre aquí" });
    }
    console.error(e);
    res.status(500).json({ error: "Error al crear carpeta" });
  }
});

function normalizeRelPath(s) {
  if (s == null || typeof s !== "string") return "";
  const t = s.replace(/\\/g, "/").replace(/^\.\/+/g, "");
  const parts = t.split("/").filter((p) => p.length > 0);
  if (parts.some((p) => p === "..")) return null;
  return parts.join("/");
}

function splitRelToFoldersAndFile(norm) {
  if (!norm) return { folders: [], fileName: "" };
  const parts = norm.split("/");
  const fileName = parts.pop() || "";
  return { folders: parts.filter(Boolean), fileName };
}

async function findOrCreateFolderDb(client, parentId, folderName) {
  const { rows: ex } = await client.query(
    `SELECT id FROM items
     WHERE parent_id IS NOT DISTINCT FROM $1::uuid AND name = $2 AND type = 'folder' LIMIT 1`,
    [parentId, folderName]
  );
  if (ex.length) return ex[0].id;
  const { rows } = await client.query(
    `INSERT INTO items (parent_id, name, type, size) VALUES ($1::uuid, $2, 'folder', 0) RETURNING id`,
    [parentId, folderName]
  );
  return rows[0].id;
}

async function ensureFolderChainDb(client, baseParentId, folderNames) {
  let pid = baseParentId;
  for (const name of folderNames) {
    pid = await findOrCreateFolderDb(client, pid, name);
  }
  return pid;
}

app.post("/api/upload", upload.array("files", MAX_FILES_PER_REQUEST), async (req, res) => {
  const pr = toParentUuid(req.body?.parentId);
  if (!pr.ok) return res.status(400).json({ error: pr.error });
  const baseParentId = pr.value;
  const files = req.files || [];
  if (!files.length) {
    return res.status(400).json({ error: "Sin archivos" });
  }

  const rawPaths = req.body.relativePaths;
  const pathsList =
    rawPaths === undefined || rawPaths === null
      ? []
      : Array.isArray(rawPaths)
        ? rawPaths.map((p) => (p == null ? "" : String(p)))
        : [String(rawPaths)];
  while (pathsList.length < files.length) pathsList.push("");

  let client;
  const created = [];
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const relRaw = pathsList[i] || "";
      const norm = relRaw.trim() ? normalizeRelPath(relRaw) : "";
      if (norm === null) {
        throw Object.assign(new Error("bad path"), { code: "BAD_PATH" });
      }
      const useTree = Boolean(norm);
      let targetParent = baseParentId;
      let displayName = f.originalname || "archivo";

      if (useTree) {
        const { folders, fileName } = splitRelToFoldersAndFile(norm);
        if (!fileName) {
          fs.unlink(path.join(UPLOAD_DIR, f.filename), () => {});
          continue;
        }
        targetParent = await ensureFolderChainDb(client, baseParentId, folders);
        displayName = fileName;
      }

      const { rows } = await client.query(
        `INSERT INTO items (parent_id, name, type, size, storage_key, mime_type)
         VALUES ($1::uuid, $2, 'file', $3, $4, $5)
         RETURNING id, name, type, size, created_at, mime_type`,
        [targetParent, displayName, f.size, f.filename, f.mimetype || null]
      );
      const r = rows[0];
      created.push({
        id: r.id,
        name: r.name,
        itemType: r.type,
        size: Number(r.size),
        addedAt: r.created_at,
        mimeType: r.mime_type || "",
      });
    }

    await client.query("COMMIT");
    res.status(201).json(created);
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackErr) {
      console.error(rollbackErr);
    }
    for (const f of files) {
      const p = path.join(UPLOAD_DIR, f.filename);
      fs.unlink(p, () => {});
    }
    if (e.code === "BAD_PATH") {
      return res.status(400).json({ error: "Ruta no válida" });
    }
    if (e.code === "23505") {
      return res.status(409).json({ error: "Ya existe con ese nombre aquí" });
    }
    console.error(e);
    res.status(500).json({ error: "Error al subir" });
  } finally {
    if (client) client.release();
  }
});

function sanitizeArchivePart(name, fallback) {
  const n = String(name || "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/\.+$/g, "")
    .trim();
  return n || fallback;
}

async function streamFolderZip(res, folderId, folderName) {
  const { rows } = await pool.query(
    `WITH RECURSIVE tree AS (
       SELECT id, parent_id, name, type, storage_key
       FROM items
       WHERE id = $1::uuid
       UNION ALL
       SELECT i.id, i.parent_id, i.name, i.type, i.storage_key
       FROM items i
       INNER JOIN tree t ON i.parent_id = t.id
     )
     SELECT id, parent_id, name, type, storage_key FROM tree`,
    [folderId]
  );

  const byParent = new Map();
  for (const row of rows) {
    const p = row.parent_id || "__root__";
    if (!byParent.has(p)) byParent.set(p, []);
    byParent.get(p).push(row);
  }

  const rootName = sanitizeArchivePart(folderName, "carpeta");
  const archiveName = `${rootName}.zip`;
  res.setHeader(
    "Content-Disposition",
    `attachment; filename*=UTF-8''${encodeURIComponent(archiveName)}`
  );
  res.setHeader("Content-Type", "application/zip");

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (err) => {
    console.error(err);
    if (!res.headersSent) res.status(500).end();
    else res.end();
  });
  archive.pipe(res);
  archive.append("", { name: `${rootName}/` });

  const walk = (parentId, relBase) => {
    const kids = byParent.get(parentId) || [];
    for (const k of kids) {
      if (k.type === "folder") {
        const safe = sanitizeArchivePart(k.name, "carpeta");
        const nextRel = `${relBase}${safe}/`;
        archive.append("", { name: nextRel });
        walk(k.id, nextRel);
      } else if (k.type === "file" && k.storage_key) {
        const filePath = path.join(UPLOAD_DIR, k.storage_key);
        if (!fs.existsSync(filePath)) continue;
        const safe = sanitizeArchivePart(k.name, "archivo");
        archive.file(filePath, { name: `${relBase}${safe}` });
      }
    }
  };
  walk(folderId, `${rootName}/`);
  await archive.finalize();
}

app.get("/api/items/:id/download", async (req, res) => {
  if (!UUID_RE.test(req.params.id)) {
    return res.status(400).end();
  }
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT id, name, type, storage_key, mime_type FROM items WHERE id = $1::uuid`,
      [id]
    );
    if (!rows.length) return res.status(404).end();
    const row = rows[0];
    if (row.type === "file") {
      const filePath = path.join(UPLOAD_DIR, row.storage_key || "");
      if (!row.storage_key || !fs.existsSync(filePath)) return res.status(404).end();
      res.setHeader(
        "Content-Disposition",
        `attachment; filename*=UTF-8''${encodeURIComponent(row.name)}`
      );
      if (row.mime_type) res.setHeader("Content-Type", row.mime_type);
      return fs.createReadStream(filePath).pipe(res);
    }
    if (row.type === "folder") {
      await streamFolderZip(res, id, row.name);
      return;
    }
    return res.status(404).end();
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
});

app.get("/api/files/:id/download", async (req, res) => {
  if (!UUID_RE.test(req.params.id)) {
    return res.status(400).end();
  }
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT name, type, storage_key, mime_type FROM items WHERE id = $1::uuid`,
      [id]
    );
    if (!rows.length || rows[0].type !== "file" || !rows[0].storage_key) {
      return res.status(404).end();
    }
    const row = rows[0];
    const filePath = path.join(UPLOAD_DIR, row.storage_key);
    if (!fs.existsSync(filePath)) {
      return res.status(404).end();
    }
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(row.name)}`
    );
    if (row.mime_type) res.setHeader("Content-Type", row.mime_type);
    fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
});

app.post("/api/shares", async (req, res) => {
  const folderId = req.body?.folderId;
  if (!UUID_RE.test(String(folderId || ""))) {
    return res.status(400).json({ error: "Carpeta no válida" });
  }
  try {
    const { rows: fr } = await pool.query(
      `SELECT id, name, type FROM items WHERE id = $1::uuid`,
      [folderId]
    );
    if (!fr.length || fr[0].type !== "folder") {
      return res.status(404).json({ error: "Carpeta no encontrada" });
    }
    const token = crypto.randomBytes(32).toString("hex");
    await pool.query(`INSERT INTO shares (token, folder_id) VALUES ($1, $2::uuid)`, [token, folderId]);
    res.status(201).json({
      token,
      path: `/compartir/${token}`,
      folderName: fr[0].name,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo crear el enlace" });
  }
});

app.get("/api/share/:token/info", async (req, res) => {
  if (!TOKEN_RE.test(req.params.token)) {
    return res.status(400).json({ error: "Enlace no válido" });
  }
  try {
    const { rows } = await pool.query(
      `SELECT s.folder_id, i.name
       FROM shares s
       JOIN items i ON i.id = s.folder_id
       WHERE s.token = $1`,
      [req.params.token]
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Enlace inexistente" });
    }
    res.json({
      rootId: rows[0].folder_id,
      folderName: rows[0].name,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error" });
  }
});

app.get("/api/share/:token/items", async (req, res) => {
  if (!TOKEN_RE.test(req.params.token)) {
    return res.status(400).json({ error: "Enlace no válido" });
  }
  try {
    const { rows: sr } = await pool.query(
      `SELECT s.folder_id FROM shares s WHERE s.token = $1`,
      [req.params.token]
    );
    if (!sr.length) {
      return res.status(404).json({ error: "Enlace inexistente" });
    }
    const shareRootId = sr[0].folder_id;
    const pr = toParentUuid(req.query.parentId);
    if (!pr.ok) return res.status(400).json({ error: pr.error });
    const parentId = pr.value === null ? shareRootId : pr.value;
    if (!(await isUnderSharedFolder(shareRootId, parentId))) {
      return res.status(404).json({ error: "No disponible" });
    }
    const { rows } = await pool.query(
      `SELECT id, name, type, size, created_at, mime_type
       FROM items
       WHERE parent_id = $1::uuid
       ORDER BY type DESC, lower(name)`,
      [parentId]
    );
    res.json(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        itemType: r.type,
        size: Number(r.size),
        addedAt: r.created_at,
        mimeType: r.mime_type || "",
      }))
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al listar" });
  }
});

app.get("/api/share/:token/file/:id/download", async (req, res) => {
  if (!TOKEN_RE.test(req.params.token) || !UUID_RE.test(req.params.id)) {
    return res.status(400).end();
  }
  const { id } = req.params;
  try {
    const { rows: sr } = await pool.query(
      `SELECT s.folder_id FROM shares s WHERE s.token = $1`,
      [req.params.token]
    );
    if (!sr.length) {
      return res.status(404).end();
    }
    const shareRootId = sr[0].folder_id;
    if (!(await isUnderSharedFolder(shareRootId, id))) {
      return res.status(404).end();
    }
    const { rows } = await pool.query(
      `SELECT name, type, storage_key, mime_type FROM items WHERE id = $1::uuid`,
      [id]
    );
    if (!rows.length || rows[0].type !== "file" || !rows[0].storage_key) {
      return res.status(404).end();
    }
    const row = rows[0];
    const filePath = path.join(UPLOAD_DIR, row.storage_key);
    if (!fs.existsSync(filePath)) {
      return res.status(404).end();
    }
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(row.name)}`
    );
    if (row.mime_type) res.setHeader("Content-Type", row.mime_type);
    fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
});

app.delete("/api/items/:id", async (req, res) => {
  if (!UUID_RE.test(req.params.id)) {
    return res.status(400).json({ error: "id no válido" });
  }
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `WITH RECURSIVE tree AS (
         SELECT id FROM items WHERE id = $1::uuid
         UNION ALL
         SELECT i.id FROM items i INNER JOIN tree t ON i.parent_id = t.id
       )
       SELECT storage_key FROM items
       WHERE id IN (SELECT id FROM tree) AND type = 'file' AND storage_key IS NOT NULL`,
      [id]
    );
    for (const row of rows) {
      const p = path.join(UPLOAD_DIR, row.storage_key);
      fs.unlink(p, () => {});
    }
    const del = await pool.query(`DELETE FROM items WHERE id = $1::uuid`, [id]);
    if (del.rowCount === 0) {
      return res.status(404).json({ error: "No encontrado" });
    }
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al eliminar" });
  }
});

app.use((err, req, res, next) => {
  if (!err) {
    next();
    return;
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "Archivo demasiado grande para el límite del servidor" });
  }
  if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(413).json({ error: "Demasiados archivos en una sola subida" });
  }
  next(err);
});

app.use(express.static(path.join(__dirname, "public")));

async function start() {
  ensureUploadDir();
  await waitForDb();
  await initDb();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`eyedrive en http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
