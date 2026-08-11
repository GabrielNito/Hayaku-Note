import { prisma } from "@/lib/prisma"

const CONFIGURACAO_ID = "principal"

export async function obterPoliticasAtuais() {
  return prisma.configuracao.upsert({
    where: { id: CONFIGURACAO_ID },
    create: { id: CONFIGURACAO_ID },
    update: {},
  })
}
