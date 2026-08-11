import { obterArvore, obterNo, obterCaminhoBreadcrumb } from "@/actions/no"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { NoteEditor } from "@/components/note-editor"
import { GlobalShortcuts } from "@/components/global-shortcuts"
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
  if (politicas.exigirPinArvore) scopes.push("tree")
  if (politicas.acessoArquivo === "SESSAO") scopes.push("files")
  if (politicas.acessoArquivo === "POR_ARQUIVO") scopes.push(`file:${noId}`)

  if (scopes.length > 0 && !(await temAcessosPin(scopes))) {
    return <AccessGate scopes={scopes} title="Nota protegida" description="Digite o PIN para continuar. As permissões serão mantidas apenas nesta sessão." />
  }

  const [arvore, no, caminho] = await Promise.all([
    obterArvore(),
    obterNo(noId),
    obterCaminhoBreadcrumb(noId),
  ])

  if (!no || no.tipo !== "ARQUIVO") {
    notFound()
  }

  return (
    <GlobalShortcuts arvore={arvore} exigirPinBusca={politicas.exigirPinBusca}>
      <SidebarProvider>
        <div className="flex h-screen w-full overflow-hidden">
          <AppSidebar arvore={arvore} activeId={noId} />
          <div className="flex-1 flex flex-col min-w-0">
            <NoteEditor
              noId={no.id}
              initialContent={no.conteudo || ""}
              caminhoBreadcrumb={caminho}
              exigirPinExportar={politicas.exigirPinExportar}
              exigirPinUploadImagem={politicas.exigirPinUploadImagem}
            />
          </div>
        </div>
      </SidebarProvider>
    </GlobalShortcuts>
  )
}
