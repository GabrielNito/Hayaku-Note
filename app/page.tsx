import { obterArvore, obterPrimeiroArquivo } from "@/actions/no"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { redirect } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { GlobalShortcuts } from "@/components/global-shortcuts"

export default async function HomePage() {
  const arvore = await obterArvore()
  const primeiroArquivo = await obterPrimeiroArquivo()

  if (primeiroArquivo) {
    redirect(`/n/${primeiroArquivo.id}`)
  }

  return (
    <GlobalShortcuts arvore={arvore}>
      <SidebarProvider>
        <div className="flex h-screen w-full overflow-hidden">
          <AppSidebar arvore={arvore} />
          <main className="flex-1 flex flex-col items-center justify-center p-6 bg-background text-center">
            <div className="flex items-center gap-2 mb-4">
              <SidebarTrigger />
              <span className="text-sm font-sans text-muted-foreground">Abrir barra lateral</span>
            </div>
            <div className="max-w-sm space-y-2">
              <h1 className="text-base font-medium font-sans">Nenhuma anotação encontrada</h1>
              <p className="text-xs text-muted-foreground font-sans">
                Use o botão de criação na barra lateral para criar sua primeira pasta ou arquivo de anotação.
              </p>
            </div>
          </main>
        </div>
      </SidebarProvider>
    </GlobalShortcuts>
  )
}
