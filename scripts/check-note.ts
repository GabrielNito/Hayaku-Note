import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function check() {
  const note = await prisma.no.findUnique({
    where: { id: "cmsg8pbi30001fo3gtgl1jmtt" }
  })
  console.log(JSON.stringify(note?.conteudo))
}

check().finally(() => prisma.$disconnect())
