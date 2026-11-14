import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const wasmSrc = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const wasmDst = join(root, "public", "mediapipe", "wasm");
const modelDir = join(root, "public", "models");
const modelPath = join(modelDir, "face_landmarker.task");
const manifestPath = join(modelDir, "MODEL-MANIFEST.md");
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";

const wasmOnly = process.argv.includes("--wasm-only");

function copyWasm() {
  if (!existsSync(wasmSrc)) {
    console.warn("[assets] @mediapipe/tasks-vision no está instalado; se omite la copia de WASM.");
    return;
  }
  mkdirSync(wasmDst, { recursive: true });
  cpSync(wasmSrc, wasmDst, { recursive: true, force: true });
  console.log("[assets] WASM copiado a public/mediapipe/wasm");
}

async function downloadModel() {
  mkdirSync(modelDir, { recursive: true });
  if (existsSync(modelPath)) {
    console.log("[assets] Modelo ya presente: public/models/face_landmarker.task");
  } else {
    console.log("[assets] Descargando Face Landmarker Float16…");
    const res = await fetch(MODEL_URL);
    if (!res.ok) throw new Error(`Descarga fallida: HTTP ${res.status}`);
    writeFileSync(modelPath, Buffer.from(await res.arrayBuffer()));
  }

  const data = readFileSync(modelPath);
  const sha256 = createHash("sha256").update(data).digest("hex").toUpperCase();
  const pkg = JSON.parse(
    readFileSync(join(root, "node_modules", "@mediapipe", "tasks-vision", "package.json"), "utf8"),
  );

  writeFileSync(
    manifestPath,
    [
      "# Model manifest",
      "",
      "| Campo | Valor |",
      "|---|---|",
      "| Archivo | `face_landmarker.task` |",
      "| Variante | Face Landmarker Float16 |",
      `| URL | ${MODEL_URL} |`,
      `| Fecha de descarga | ${new Date().toISOString()} |`,
      `| Tamaño | ${data.length} bytes |`,
      `| SHA-256 | \`${sha256}\` |`,
      `| @mediapipe/tasks-vision | ${pkg.version} |`,
      "",
      "El enlace `latest` puede cambiar. Conservar este archivo y su hash para que la demo sea reproducible.",
      "",
    ].join("\n"),
  );
  console.log(`[assets] SHA-256 ${sha256}`);
}

copyWasm();
if (!wasmOnly) {
  await downloadModel();
}
