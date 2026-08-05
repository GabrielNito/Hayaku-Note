import bcrypt from "bcryptjs"

export async function validarPin(pin: string): Promise<boolean> {
  const pinHash = process.env.PIN_HASH
  if (!pinHash) {
    console.error("PIN_HASH env var not set")
    return false
  }
  if (!pin || pin.trim().length !== 6) {
    return false
  }
  try {
    let cleanHash = pinHash.trim()
    if (!cleanHash.startsWith("$2b$")) {
      cleanHash = "$2b$10$" + cleanHash
    }
    return await bcrypt.compare(pin.trim(), cleanHash)
  } catch (err) {
    console.error("Error validating PIN:", err)
    return false
  }
}
