"use server"

import { prisma } from "@/lib/prisma"
import { validarPin } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { NoItem, TipoNo } from "./types"
import { UTApi } from "uploadthing/server"

const utapi = new UTApi()

function extractUploadThingKeys(content: string | null): string[] {
  if (!content) return []
  const regex = /https?:\/\/(?:utfs\.io|[^/]+\.ufs\.sh)\/f\/([a-zA-Z0-9_-]+)/g
  const keys: string[] = []
  let match
  while ((match = regex.exec(content)) !== null) {
    if (match[1]) {
      keys.push(match[1])
    }
  }
  return keys
}

import { cache } from "react"

export const obterArvore = cache(async (): Promise<NoItem[]> => {
  try {
    const todos = await prisma.no.findMany({
      orderBy: [{ nome: "asc" }, { ordem: "asc" }],
    })

    const mapa = new Map<string, NoItem>()
    const raizes: NoItem[] = []

    for (const item of todos) {
      mapa.set(item.id, { ...item, filhos: [] })
    }

    for (const item of todos) {
      const noMapeado = mapa.get(item.id)!
      if (item.paiId) {
        const pai = mapa.get(item.paiId)
        if (pai && pai.filhos) {
          pai.filhos.push(noMapeado)
        } else {
          raizes.push(noMapeado)
        }
      } else {
        raizes.push(noMapeado)
      }
    }

    const sortNodes = (nodes: NoItem[]): NoItem[] => {
      const folders = nodes.filter((n) => n.tipo === TipoNo.PASTA).sort((a, b) => a.nome.localeCompare(b.nome, undefined, { sensitivity: 'accent', numeric: true }))
      const files = nodes.filter((n) => n.tipo === TipoNo.ARQUIVO).sort((a, b) => a.nome.localeCompare(b.nome, undefined, { sensitivity: 'accent', numeric: true }))
      
      return [...folders, ...files].map((node) => ({
        ...node,
        filhos: node.filhos ? sortNodes(node.filhos) : [],
      }))
    }

    return sortNodes(raizes)
  } catch (err) {
    console.error("Erro ao obter arvore:", err)
    return []
  }
})

export const obterNo = cache(async (id: string): Promise<NoItem | null> => {
  try {
    return await prisma.no.findUnique({
      where: { id },
    })
  } catch (err) {
    console.error("Erro ao obter no:", err)
    return null
  }
})

export const obterPrimeiroArquivo = cache(async (): Promise<NoItem | null> => {
  try {
    return await prisma.no.findFirst({
      where: { tipo: "ARQUIVO" },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    })
  } catch (err) {
    console.error("Erro ao obter primeiro arquivo:", err)
    return null
  }
})

export const obterCaminhoBreadcrumb = cache(async (id: string): Promise<{ id: string; nome: string }[]> => {
  try {
    const caminho: { id: string; nome: string }[] = []
    let atualId: string | null = id

    while (atualId) {
      const no: { id: string; nome: string; paiId: string | null } | null = await prisma.no.findUnique({
        where: { id: atualId },
        select: { id: true, nome: true, paiId: true },
      })
      if (!no) break
      caminho.unshift({ id: no.id, nome: no.nome })
      atualId = no.paiId
    }

    return caminho
  } catch (err) {
    console.error("Erro ao obter caminho:", err)
    return []
  }
})

export async function criarNo(
  pin: string,
  data: { nome: string; tipo: string; paiId?: string | null; conteudo?: string }
): Promise<{ success: boolean; error?: string; id?: string }> {
  const isValid = await validarPin(pin)
  if (!isValid) {
    return { success: false, error: "PIN incorreto." }
  }

  if (!data.nome || data.nome.trim() === "") {
    return { success: false, error: "Nome não pode ser vazio." }
  }

  try {
    const maxOrdem = await prisma.no.findFirst({
      where: { paiId: data.paiId ?? null },
      orderBy: { ordem: "desc" },
      select: { ordem: true },
    })

    const novaOrdem = (maxOrdem?.ordem ?? -1) + 1

    const novo = await prisma.no.create({
      data: {
        nome: data.nome.trim(),
        tipo: data.tipo,
        paiId: data.paiId ?? null,
        conteudo: data.tipo === "ARQUIVO" ? (data.conteudo ?? "") : null,
        ordem: novaOrdem,
      },
    })

    revalidatePath("/")
    return { success: true, id: novo.id }
  } catch (err) {
    console.error("Erro ao criar no:", err)
    return { success: false, error: "Erro ao salvar no banco de dados." }
  }
}

export async function renomearNo(
  pin: string,
  id: string,
  novoNome: string
): Promise<{ success: boolean; error?: string }> {
  const isValid = await validarPin(pin)
  if (!isValid) {
    return { success: false, error: "PIN incorreto." }
  }

  if (!novoNome || novoNome.trim() === "") {
    return { success: false, error: "Nome não pode ser vazio." }
  }

  try {
    await prisma.no.update({
      where: { id },
      data: { nome: novoNome.trim() },
    })

    revalidatePath("/")
    return { success: true }
  } catch (err) {
    console.error("Erro ao renomear no:", err)
    return { success: false, error: "Erro ao renomear no banco de dados." }
  }
}

export async function deletarNo(
  pin: string,
  id: string
): Promise<{ success: boolean; error?: string }> {
  const isValid = await validarPin(pin)
  if (!isValid) {
    return { success: false, error: "PIN incorreto." }
  }

  try {
    const no = await prisma.no.findUnique({
      where: { id },
      select: { conteudo: true },
    })

    if (no && no.conteudo) {
      const keys = extractUploadThingKeys(no.conteudo)
      if (keys.length > 0) {
        await utapi.deleteFiles(keys).catch((err) => {
          console.error("Erro ao deletar arquivos do UploadThing ao excluir nó:", err)
        })
      }
    }

    async function deletarArquivosRecursivos(noId: string) {
      const filhos = await prisma.no.findMany({
        where: { paiId: noId },
        select: { id: true, conteudo: true },
      })
      for (const filho of filhos) {
        if (filho.conteudo) {
          const keys = extractUploadThingKeys(filho.conteudo)
          if (keys.length > 0) {
            await utapi.deleteFiles(keys).catch(() => {})
          }
        }
        await deletarArquivosRecursivos(filho.id)
      }
    }

    await deletarArquivosRecursivos(id)

    await prisma.no.delete({
      where: { id },
    })

    revalidatePath("/")
    return { success: true }
  } catch (err) {
    console.error("Erro ao deletar no:", err)
    return { success: false, error: "Erro ao deletar no banco de dados." }
  }
}

export async function salvarConteudo(
  pin: string,
  id: string,
  conteudo: string
): Promise<{ success: boolean; error?: string }> {
  const isValid = await validarPin(pin)
  if (!isValid) {
    return { success: false, error: "PIN incorreto." }
  }

  try {
    const noAntigo = await prisma.no.findUnique({
      where: { id },
      select: { conteudo: true },
    })

    const keysAntigas = extractUploadThingKeys(noAntigo?.conteudo ?? "")
    const keysNovas = extractUploadThingKeys(conteudo)

    const keysParaDeletar = keysAntigas.filter((key) => !keysNovas.includes(key))
    if (keysParaDeletar.length > 0) {
      await utapi.deleteFiles(keysParaDeletar).catch((err) => {
        console.error("Erro ao deletar arquivos removidos do UploadThing:", err)
      })
    }

    await prisma.no.update({
      where: { id },
      data: { conteudo },
    })

    revalidatePath("/")
    return { success: true }
  } catch (err) {
    console.error("Erro ao salvar conteudo:", err)
    return { success: false, error: "Erro ao salvar conteúdo no banco de dados." }
  }
}

export async function executarComandoCli(
  pin: string,
  commandLine: string
): Promise<{ success: boolean; error?: string; id?: string; tipo?: string; deletedId?: string }> {
  const isValid = await validarPin(pin)
  if (!isValid) {
    return { success: false, error: "PIN incorreto." }
  }

  const parts = commandLine.trim().split(/\s+/)
  const cmd = parts[0]?.toLowerCase()
  const rawPath = parts.slice(1).join(" ").trim()

  if (!cmd || !rawPath) {
    return { success: false, error: "Comando inválido. Use: touch, mkdir, rm, cp ou mv." }
  }

  if (cmd !== "touch" && cmd !== "mkdir" && cmd !== "rm" && cmd !== "cp" && cmd !== "mv") {
    return { success: false, error: `Comando desconhecido: "${cmd}". Use touch, mkdir, rm, cp ou mv.` }
  }

  if (cmd === "cp" || cmd === "mv") {
    const args = rawPath.split(/\s+/)
    if (args.length < 2) {
      return { success: false, error: `Uso correto: ${cmd} <origem> <destino>` }
    }
    const srcPath = args[0]
    const destPath = args.slice(1).join(" ")

    const srcSegments = srcPath.split("/").map((s) => s.trim()).filter(Boolean)
    let srcPaiId: string | null = null
    let sourceNode: { id: string; nome: string; tipo: string; conteudo: string | null } | null = null

    for (let i = 0; i < srcSegments.length; i++) {
      const seg = srcSegments[i]
      const node: { id: string; nome: string; tipo: string; paiId: string | null; conteudo: string | null } | null = await prisma.no.findFirst({
        where: { nome: seg, paiId: srcPaiId },
      })
      if (!node) {
        return { success: false, error: `Origem não encontrada: "${srcPath}"` }
      }
      if (i === srcSegments.length - 1) {
        sourceNode = node
      } else {
        srcPaiId = node.id
      }
    }

    if (!sourceNode) {
      return { success: false, error: "Nó de origem inválido." }
    }

    const destSegments = destPath.split("/").map((s) => s.trim()).filter(Boolean)
    if (destSegments.length === 0) {
      return { success: false, error: "Caminho de destino inválido." }
    }

    let destFolder = null
    let currentPai: string | null = null
    for (let i = 0; i < destSegments.length; i++) {
      const seg = destSegments[i]
      const folder: { id: string; nome: string; tipo: string; paiId: string | null } | null = await prisma.no.findFirst({
        where: { nome: seg, paiId: currentPai, tipo: "PASTA" },
      })
      if (!folder) {
        destFolder = null
        break
      }
      currentPai = folder.id
      if (i === destSegments.length - 1) {
        destFolder = folder
      }
    }

    let destPaiId: string | null = null
    let newName: string

    if (destFolder) {
      destPaiId = destFolder.id
      newName = sourceNode.nome
    } else {
      const tempSegments = [...destSegments]
      newName = tempSegments.pop()!
      let tempPaiId: string | null = null

      for (const seg of tempSegments) {
        let folder: { id: string; nome: string; tipo: string; paiId: string | null } | null = await prisma.no.findFirst({
          where: { nome: seg, paiId: tempPaiId, tipo: "PASTA" },
        })
        if (!folder) {
          const maxOrdem: { ordem: number } | null = await prisma.no.findFirst({
            where: { paiId: tempPaiId },
            orderBy: { ordem: "desc" },
            select: { ordem: true },
          })
          const novaOrdem: number = (maxOrdem?.ordem ?? -1) + 1
          folder = await prisma.no.create({
            data: {
              nome: seg,
              tipo: "PASTA",
              paiId: tempPaiId,
              ordem: novaOrdem,
            },
          })
        }
        tempPaiId = folder.id
      }
      destPaiId = tempPaiId
    }

    if (cmd === "mv") {
      if (sourceNode.id === destPaiId) {
        return { success: false, error: "Não é possível mover um item para dentro de si mesmo." }
      }

      await prisma.no.update({
        where: { id: sourceNode.id },
        data: {
          nome: newName,
          paiId: destPaiId,
        },
      })

      revalidatePath("/")
      return { success: true, id: sourceNode.id, tipo: sourceNode.tipo }
    }

    async function copiarRecursivo(origemId: string, paiDestId: string | null, nomeOverride?: string) {
      const orig = await prisma.no.findUnique({
        where: { id: origemId },
      })
      if (!orig) return null

      const maxOrdem: { ordem: number } | null = await prisma.no.findFirst({
        where: { paiId: paiDestId },
        orderBy: { ordem: "desc" },
        select: { ordem: true },
      })
      const novaOrdem: number = (maxOrdem?.ordem ?? -1) + 1

      const copia = await prisma.no.create({
        data: {
          nome: nomeOverride || orig.nome,
          tipo: orig.tipo,
          conteudo: orig.conteudo,
          paiId: paiDestId,
          ordem: novaOrdem,
        },
      })

      const filhos = await prisma.no.findMany({
        where: { paiId: origemId },
      })
      for (const filho of filhos) {
        await copiarRecursivo(filho.id, copia.id)
      }

      return copia
    }

    const resultadoCopia = await copiarRecursivo(sourceNode.id, destPaiId, newName)
    revalidatePath("/")
    return {
      success: true,
      id: resultadoCopia?.id,
      tipo: resultadoCopia?.tipo,
    }
  }

  const segments = rawPath.split("/").map((s) => s.trim()).filter(Boolean)
  if (segments.length === 0) {
    return { success: false, error: "Caminho inválido." }
  }

  try {
    if (cmd === "rm") {
      let currentPaiId: string | null = null
      let targetNode: { id: string } | null = null

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i]
        const node: { id: string; nome: string; tipo: string; paiId: string | null } | null = await prisma.no.findFirst({
          where: {
            nome: seg,
            paiId: currentPaiId,
          },
        })
        if (!node) {
          return { success: false, error: `Caminho não encontrado: "${rawPath}"` }
        }
        if (i === segments.length - 1) {
          targetNode = node
        } else {
          currentPaiId = node.id
        }
      }

      if (targetNode) {
        // Delete recursively including associated files in UploadThing
        async function deletarArquivosRecursivos(noId: string) {
          const no = await prisma.no.findUnique({
            where: { id: noId },
            select: { conteudo: true },
          })
          if (no && no.conteudo) {
            const keys = extractUploadThingKeys(no.conteudo)
            if (keys.length > 0) {
              await utapi.deleteFiles(keys).catch(() => {})
            }
          }
          const filhos = await prisma.no.findMany({
            where: { paiId: noId },
            select: { id: true },
          })
          for (const filho of filhos) {
            await deletarArquivosRecursivos(filho.id)
          }
        }

        await deletarArquivosRecursivos(targetNode.id)
        await prisma.no.delete({
          where: { id: targetNode.id },
        })

        revalidatePath("/")
        return { success: true, deletedId: targetNode.id }
      }
      return { success: false, error: "Nó não encontrado para remoção." }
    }

    let currentPaiId: string | null = null
    const targetTipo = cmd === "touch" ? "ARQUIVO" : "PASTA"

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]
      const isLast = i === segments.length - 1

      let node: { id: string; nome: string; tipo: string; paiId: string | null } | null = await prisma.no.findFirst({
        where: {
          nome: seg,
          paiId: currentPaiId,
        },
      })

      if (!node) {
        const maxOrdem: { ordem: number } | null = await prisma.no.findFirst({
          where: { paiId: currentPaiId },
          orderBy: { ordem: "desc" },
          select: { ordem: true },
        })
        const novaOrdem: number = (maxOrdem?.ordem ?? -1) + 1

        const tipoNo: string = isLast ? targetTipo : "PASTA"
        node = await prisma.no.create({
          data: {
            nome: seg,
            tipo: tipoNo,
            paiId: currentPaiId,
            conteudo: tipoNo === "ARQUIVO" ? "" : null,
            ordem: novaOrdem,
          },
        })
      } else {
        if (isLast && node.tipo !== targetTipo) {
          return { success: false, error: `Já existe um nó do tipo "${node.tipo}" com o nome "${seg}".` }
        }
      }

      if (isLast) {
        revalidatePath("/")
        return { success: true, id: node.id, tipo: node.tipo }
      }

      currentPaiId = node.id
    }

    return { success: false, error: "Erro ao processar caminho." }
  } catch (err) {
    console.error("Erro ao executar comando CLI:", err)
    return { success: false, error: "Erro ao executar comando no banco de dados." }
  }
}
