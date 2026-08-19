import { createHash } from "node:crypto"
import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"

const COOKIE_NAME = "mesapad-settings-session"
const MAX_AGE_SECONDS = 15 * 60

function sessionKey() {
  const encryptionKey = process.env.TOTP_ENCRYPTION_KEY
  if (!encryptionKey) throw new Error("TOTP_ENCRYPTION_KEY não está configurada.")
  return createHash("sha256").update(`mesapad-settings-session:${encryptionKey}`).digest()
}

export async function criarSessaoConfiguracoes() {
  const token = await new SignJWT({ scope: "settings" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(sessionKey())
  const store = await cookies()
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  })
}

export async function temSessaoConfiguracoes() {
  try {
    const token = (await cookies()).get(COOKIE_NAME)?.value
    if (!token) return false
    const { payload } = await jwtVerify(token, sessionKey())
    return payload.scope === "settings"
  } catch {
    return false
  }
}

export async function encerrarSessaoConfiguracoes() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}
