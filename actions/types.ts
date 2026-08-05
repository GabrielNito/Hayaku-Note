export const TipoNo = {
  PASTA: "PASTA",
  ARQUIVO: "ARQUIVO",
} as const

export type TipoNoType = (typeof TipoNo)[keyof typeof TipoNo]

export interface NoItem {
  id: string
  nome: string
  tipo: string
  conteudo: string | null
  ordem: number
  paiId: string | null
  criadoEm: Date
  atualizadoEm: Date
  filhos?: NoItem[]
}
