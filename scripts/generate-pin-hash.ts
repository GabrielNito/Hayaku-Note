import bcrypt from "bcryptjs"

const pin = process.argv[2] || "123456"
const hash = bcrypt.hashSync(pin, 10)

console.log(`PIN: ${pin}`)
console.log(`PIN_HASH=${hash}`)
