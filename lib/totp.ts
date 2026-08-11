import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto"

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

function decodeBase32(value: string) {
  let bits = ""
  for (const char of value.replace(/=|\s/g, "").toUpperCase()) {
    const index = BASE32_ALPHABET.indexOf(char)
    if (index === -1) throw new Error("Segredo TOTP inválido.")
    bits += index.toString(2).padStart(5, "0")
  }

  const bytes: number[] = []
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2))
  }
  return Buffer.from(bytes)
}

export function criarSegredoTotp() {
  const bytes = randomBytes(20)
  let bits = ""
  for (const byte of bytes) bits += byte.toString(2).padStart(8, "0")

  let secret = ""
  for (let index = 0; index < bits.length; index += 5) {
    secret += BASE32_ALPHABET[Number.parseInt(bits.slice(index, index + 5).padEnd(5, "0"), 2)]
  }
  return secret
}

function gerarCodigoTotp(secret: string, timestamp: number) {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(timestamp / 30)), 0)
  const hmac = createHmac("sha1", decodeBase32(secret)).update(counter).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const value = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3]
  return (value % 1_000_000).toString().padStart(6, "0")
}

export function validarCodigoTotp(secret: string, code: string) {
  if (!/^\d{6}$/.test(code)) return false
  const now = Math.floor(Date.now() / 1000)
  return [-30, 0, 30].some((offset) => {
    const expected = Buffer.from(gerarCodigoTotp(secret, now + offset))
    return timingSafeEqual(expected, Buffer.from(code))
  })
}

export function criarUriTotp(secret: string) {
  const issuer = "Hayaku Note"
  return `otpauth://totp/${encodeURIComponent(`${issuer}:Administrador`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
}

function obterChaveCriptografia() {
  const key = process.env.TOTP_ENCRYPTION_KEY
  if (!key) throw new Error("TOTP_ENCRYPTION_KEY não está configurada.")
  const buffer = Buffer.from(key, "base64")
  if (buffer.length !== 32) throw new Error("TOTP_ENCRYPTION_KEY deve conter uma chave Base64 de 32 bytes.")
  return buffer
}

export function criptografarSegredoTotp(secret: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", obterChaveCriptografia(), iv)
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()])
  return [iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(".")
}

export function descriptografarSegredoTotp(value: string) {
  const [iv, tag, encrypted] = value.split(".")
  if (!iv || !tag || !encrypted) throw new Error("Segredo TOTP armazenado é inválido.")
  const decipher = createDecipheriv("aes-256-gcm", obterChaveCriptografia(), Buffer.from(iv, "base64"))
  decipher.setAuthTag(Buffer.from(tag, "base64"))
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]).toString("utf8")
}
