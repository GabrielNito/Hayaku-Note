import { createHash } from "node:crypto"
import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"

const COOKIE_NAME = "mesapad-pin-session"
const ACTIVE_COOKIE_NAME = "mesapad-read-active"

function sessionKey() {
  const pinHash = process.env.PIN_HASH
  if (!pinHash) throw new Error("PIN_HASH não está configurada.")
  const normalized = pinHash.trim().replaceAll("$$", "$")
  return createHash("sha256").update(`mesapad-pin-session:${normalized}`).digest()
}

export async function concederAcessosPin(scopes: string[]) {
  const store = await cookies()
  const current = await lerAcessosPin()
  const access = [...new Set([...current, ...scopes])]
  const token = await new SignJWT({ access })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .sign(sessionKey())

  store.set(COOKIE_NAME, token, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/" })
  store.set(ACTIVE_COOKIE_NAME, "1", { httpOnly: false, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/" })
}

export async function temAcessosPin(scopes: string[]) {
  if ((await cookies()).get(ACTIVE_COOKIE_NAME)?.value !== "1") return false
  const access = await lerAcessosPin()
  return scopes.every((scope) => access.includes(scope))
}

async function lerAcessosPin(): Promise<string[]> {
  try {
    const token = (await cookies()).get(COOKIE_NAME)?.value
    if (!token) return []
    const { payload } = await jwtVerify(token, sessionKey())
    return Array.isArray(payload.access) && payload.access.every((value) => typeof value === "string") ? payload.access : []
  } catch {
    return []
  }
}
