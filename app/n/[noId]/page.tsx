import { obterArvore, obterNo, obterCaminhoBreadcrumb } from "@/actions/no"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { NoteEditor } from "@/components/note-editor"
import { GlobalShortcuts } from "@/components/global-shortcuts"
import { notFound } from "next/navigation"

interface NotePageProps {
  params: Promise<{
    noId: string
  }>
}

export default async function NotePage({ params }: NotePageProps) {
  const { noId } = await params

  const [arvore, no, caminho] = await Promise.all([
    obterArvore(),
    obterNo(noId),
    obterCaminhoBreadcrumb(noId),
  ])

  if (!no || no.tipo !== "ARQUIVO") {
    notFound()
  }

  return (
    <GlobalShortcuts arvore={arvore}>
      <SidebarProvider>
        <div className="flex h-screen w-full overflow-hidden">
          <AppSidebar arvore={arvore} activeId={noId} />
          <div className="flex-1 flex flex-col min-w-0">
            <NoteEditor
              noId={no.id}
              initialContent={no.conteudo || ""}
              caminhoBreadcrumb={caminho}
            />
          </div>
        </div>
      </SidebarProvider>
    </GlobalShortcuts>
  )
}
