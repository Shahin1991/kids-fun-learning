// NOT real security: this only keeps small children out of the parent area.
// Anyone with devtools can read or reset IndexedDB and sessionStorage.
const DEFAULT_PIN = "1234";

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function newSalt(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return toHex(bytes.buffer);
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  return toHex(await crypto.subtle.digest("SHA-256", data));
}

export async function verifyPin(pin: string, salt: string, hash: string): Promise<boolean> {
  return (await hashPin(pin, salt)) === hash;
}

export async function defaultPinCredentials() {
  const pinSalt = newSalt();
  return { pinSalt, pinHash: await hashPin(DEFAULT_PIN, pinSalt) };
}
