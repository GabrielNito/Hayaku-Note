import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const notes = await prisma.no.findMany()
  for (const n of notes) {
    console.log(`--- ID: ${n.id} | NOME: ${n.nome} ---`)
    console.log(JSON.stringify(n.conteudo))
    console.log("-----------------------------------------")
  }
}

main().finally(() => prisma.$disconnect())
