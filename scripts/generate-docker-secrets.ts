import bcrypt from "bcryptjs"
import crypto from "crypto"

const pin = process.argv[2] || "123456"
if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
  console.error("❌ Warning: PIN should be 6 digits (e.g. 123456)")
}

const pinHash = bcrypt.hashSync(pin, 10)
const escapedPinHash = pinHash.replaceAll("$", () => "$$")
const setupKey = crypto.randomBytes(24).toString("hex")
const totpEncryptionKey = crypto.randomBytes(32).toString("base64")

console.log("==================================================")
console.log("  🪨 Hayaku Note Secrets Generated")
console.log("==================================================")
console.log(`PIN: ${pin}`)
console.log("")
console.log("🐳 FOR DOCKER COMPOSE (.env file):")
console.log(`PIN_HASH=${escapedPinHash}`)
console.log(`SETTINGS_SETUP_KEY=${setupKey}`)
console.log(`TOTP_ENCRYPTION_KEY=${totpEncryptionKey}`)
console.log("")
console.log("☁️ FOR VERCEL / LOCAL DEV (.env file):")
console.log(`PIN_HASH=${pinHash}`)
console.log(`SETTINGS_SETUP_KEY=${setupKey}`)
console.log(`TOTP_ENCRYPTION_KEY=${totpEncryptionKey}`)
console.log("==================================================")
