import { PrismaClient } from "@prisma/client"
import fs from "fs"
import path from "path"

const prisma = new PrismaClient()

async function seed() {
  const mdPath = path.join(process.cwd(), "prisma", "seed-test.md")
  const content = fs.readFileSync(mdPath, "utf-8")

  const created = await prisma.no.create({
    data: {
      nome: "Nota Teste Espaçamento",
      tipo: "ARQUIVO",
      conteudo: content,
      ordem: 99,
      paiId: null,
    },
  })

  console.log(`Nota criada com ID: ${created.id}`)
}

seed().finally(() => prisma.$disconnect())
