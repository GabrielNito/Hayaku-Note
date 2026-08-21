import { cache } from "react"
import { prisma } from "@/lib/prisma"

const CONFIGURACAO_ID = "principal"

export const obterPoliticasAtuais = cache(async () => {
  return prisma.configuracao.upsert({
    where: { id: CONFIGURACAO_ID },
    create: { id: CONFIGURACAO_ID },
    update: {},
  })
})

