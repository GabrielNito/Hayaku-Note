import { obterNo, obterCaminhoBreadcrumb } from "@/actions/no"
import { NoteEditor } from "@/components/note-editor"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { AccessGate } from "@/components/access-gate"
import { temAcessosPin } from "@/lib/pin-session"
import { obterPoliticasAtuais } from "@/lib/security-policies"

interface NotePageProps {
  params: Promise<{
    noId: string
  }>
}

export async function generateMetadata({ params }: NotePageProps): Promise<Metadata> {
  const { noId } = await params
  const politicas = await obterPoliticasAtuais()
  const scopes = politicas.acessoArquivo === "SESSAO" ? ["files"] : politicas.acessoArquivo === "POR_ARQUIVO" ? [`file:${noId}`] : []
  if (scopes.length > 0 && !(await temAcessosPin(scopes))) return { title: "Hayaku Note" }
  const no = await obterNo(noId)
  if (!no) {
    return {
      title: "Hayaku Note",
    }
  }
  return {
    title: `${no.nome} — Hayaku Note`,
  }
}

export default async function NotePage({ params }: NotePageProps) {
  const { noId } = await params
  const politicas = await obterPoliticasAtuais()
  const scopes: string[] = []
  if (politicas.acessoArquivo === "SESSAO") scopes.push("files")
  if (politicas.acessoArquivo === "POR_ARQUIVO") scopes.push(`file:${noId}`)

  if (scopes.length > 0 && !(await temAcessosPin(scopes))) {
    return <AccessGate scopes={scopes} title="Nota protegida" description="Digite o PIN para continuar. As permissões serão mantidas apenas nesta sessão." />
  }

  const [no, caminho] = await Promise.all([
    obterNo(noId),
    obterCaminhoBreadcrumb(noId),
  ])

  if (!no || no.tipo !== "ARQUIVO") {
    notFound()
  }

  return (
    <NoteEditor
      noId={no.id}
      initialContent={no.conteudo || ""}
      caminhoBreadcrumb={caminho}
      exigirPinExportar={politicas.exigirPinExportar}
      exigirPinUploadImagem={politicas.exigirPinUploadImagem}
      smoothCursor={politicas.smoothCursor ?? true}
    />
  )
}
