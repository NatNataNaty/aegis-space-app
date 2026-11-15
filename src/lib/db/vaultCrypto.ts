/**
 * Bóveda de claves del registro local (P4, diseño aportado por P2/P4 en careVault.ts).
 *
 * - Una clave de datos aleatoria de 256 bits cifra los registros con AES-GCM.
 * - Esa clave nunca se guarda en claro: se «envuelve» con otra clave derivada del PIN
 *   mediante PBKDF2-SHA-256 (sal aleatoria de 16 bytes, 600 000 iteraciones, OWASP 2023).
 * - Cada cifrado lleva additionalData con su propósito: un texto cifrado para un uso no
 *   se puede descifrar haciéndolo pasar por otro.
 * - El PIN nunca se guarda. Un PIN incorrecto falla al desenvolver la clave (AES-GCM autentica).
 *
 * Funciones puras sobre Web Crypto: sin IndexedDB ni estado, para poder probarlas.
 */

export const PBKDF2_ITERATIONS = 600_000;
export const PIN_PATTERN = /^\d{4,8}$/;

export const PURPOSE = {
  dataKey: "aegis:vault:data-key:v1",
  events: "aegis:events:v1",
} as const;

export interface Sealed {
  iv: string;
  cipher: string;
}

/** Lo único que se guarda: sal, iteraciones y la clave de datos envuelta. Nada del PIN. */
export interface VaultRecord {
  salt: string;
  iterations: number;
  wrappedKey: Sealed;
}

export class WrongPinError extends Error {
  constructor() {
    super("wrong_pin");
  }
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const out = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

const randomBytes = (n: number) => crypto.getRandomValues(new Uint8Array(new ArrayBuffer(n)));

export async function deriveWrappingKey(pin: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", encoder.encode(pin), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function sealBytes(key: CryptoKey, plain: Uint8Array<ArrayBuffer>, purpose: string): Promise<Sealed> {
  const iv = randomBytes(12);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: encoder.encode(purpose) }, key, plain);
  return { iv: toBase64(iv), cipher: toBase64(new Uint8Array(cipher)) };
}

export async function unsealBytes(key: CryptoKey, sealed: Sealed, purpose: string): Promise<Uint8Array<ArrayBuffer>> {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(sealed.iv), additionalData: encoder.encode(purpose) },
    key,
    fromBase64(sealed.cipher),
  );
  return new Uint8Array(plain);
}

export async function seal(key: CryptoKey, value: unknown, purpose: string): Promise<Sealed> {
  return sealBytes(key, encoder.encode(JSON.stringify(value)), purpose);
}

export async function unseal<T = unknown>(key: CryptoKey, sealed: Sealed, purpose: string): Promise<T> {
  return JSON.parse(decoder.decode(await unsealBytes(key, sealed, purpose))) as T;
}

async function importDataKey(raw: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

/** Crea la bóveda: devuelve lo que hay que guardar y la clave de datos para esta sesión. */
export async function createVault(
  pin: string,
  iterations = PBKDF2_ITERATIONS,
): Promise<{ record: VaultRecord; dataKey: CryptoKey }> {
  if (!PIN_PATTERN.test(pin)) throw new Error("invalid_pin");
  const salt = randomBytes(16);
  const wrappingKey = await deriveWrappingKey(pin, salt, iterations);
  const raw = randomBytes(32);
  try {
    const wrappedKey = await sealBytes(wrappingKey, raw, PURPOSE.dataKey);
    const dataKey = await importDataKey(raw);
    return { record: { salt: toBase64(salt), iterations, wrappedKey }, dataKey };
  } finally {
    raw.fill(0);
  }
}

/** Abre la bóveda con el PIN. Lanza WrongPinError si el PIN no es el correcto. */
export async function openVault(pin: string, record: VaultRecord): Promise<CryptoKey> {
  const wrappingKey = await deriveWrappingKey(pin, fromBase64(record.salt), record.iterations);
  let raw: Uint8Array<ArrayBuffer>;
  try {
    raw = await unsealBytes(wrappingKey, record.wrappedKey, PURPOSE.dataKey);
  } catch {
    throw new WrongPinError();
  }
  try {
    return await importDataKey(raw);
  } finally {
    raw.fill(0);
  }
}
