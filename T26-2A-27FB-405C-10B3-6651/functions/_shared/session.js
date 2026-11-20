
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

async function getSigningKey(secret) {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("SESSION_SECRET ausente ou muito curto.");
  }

  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export function randomToken() {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function createSession(user, secret) {
  const payload = {
    userId: String(user.userId),
    username: String(user.username),
    avatar: String(user.avatar || ""),
    exp: Math.floor(Date.now() / 1000) + 86400
  };

  const encoded = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await getSigningKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(encoded));

  return encoded + "." + toBase64Url(new Uint8Array(signature));
}

export async function verifySession(token, secret) {
  try {
    if (!token || typeof token !== "string") return null;

    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const key = await getSigningKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(parts[1]),
      encoder.encode(parts[0])
    );

    if (!valid) return null;

    const payload = JSON.parse(decoder.decode(fromBase64Url(parts[0])));

    if (!payload.userId || !payload.username) return null;
    if (!Number.isFinite(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      userId: payload.userId,
      username: payload.username,
      avatar: payload.avatar || ""
    };
  } catch {
    return null;
  }
}

export function getCookie(request, name) {
  const cookies = request.headers.get("Cookie") || "";
  const prefix = name + "=";

  for (const item of cookies.split(";")) {
    const cookie = item.trim();
    if (cookie.startsWith(prefix)) return cookie.slice(prefix.length);
  }

  return null;
}
