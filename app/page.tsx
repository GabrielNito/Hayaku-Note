import { obterArvore, obterPrimeiroArquivo } from "@/actions/no"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { redirect } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { GlobalShortcuts } from "@/components/global-shortcuts"

export const metadata = {
  title: "Hayaku Note",
}

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
          <main className="flex-1 flex flex-col items-center justify-center p-8 bg-background text-center overflow-y-auto relative">
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <SidebarTrigger />
              <span className="text-xs font-sans text-muted-foreground">Barra lateral</span>
            </div>

            <div className="max-w-md w-full space-y-6 mx-auto">
              <div className="space-y-2">
                <h1 className="text-xl font-semibold tracking-tight font-sans">Hayaku Note</h1>
                <p className="text-xs text-muted-foreground font-sans">
                  Nenhuma anotação encontrada. Crie sua primeira nota ou pasta para começar.
                </p>
              </div>

              <div className="border border-border/60 rounded-lg p-4 text-left space-y-3 bg-card text-card-foreground shadow-xs text-xs font-mono">
                <div className="font-semibold text-foreground border-b pb-2 flex items-center justify-between">
                  <span>Atalhos & Command Bar</span>
                  <span className="text-[10px] text-muted-foreground">Guia Rápido</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><kbd className="bg-muted px-1 py-0.5 rounded">Ctrl/Cmd + P</kbd></div>
                  <div className="text-muted-foreground">Quick Open (Busca)</div>

                  <div><kbd className="bg-muted px-1 py-0.5 rounded">Ctrl/Cmd + ⇧ + P</kbd></div>
                  <div className="text-muted-foreground">Command Bar (CLI)</div>

                  <div><kbd className="bg-muted px-1 py-0.5 rounded">Ctrl/Cmd + D</kbd></div>
                  <div className="text-muted-foreground">Alternar Tema</div>

                  <div><kbd className="bg-muted px-1 py-0.5 rounded">Ctrl/Cmd + S</kbd></div>
                  <div className="text-muted-foreground">Salvar Nota (PIN)</div>

                  <div><kbd className="bg-muted px-1 py-0.5 rounded">Ctrl/Cmd + B</kbd></div>
                  <div className="text-muted-foreground">Alternar Sidebar</div>
                </div>

                <div className="border-t pt-2 space-y-1 text-[11px] text-muted-foreground">
                  <div className="font-semibold text-foreground">Comandos CLI (Command Bar):</div>
                  <div>• <code className="text-primary">touch path/nota</code> (cria arquivo)</div>
                  <div>• <code className="text-primary">mkdir path/pasta</code> (cria pasta)</div>
                  <div>• <code className="text-primary">rm path/item</code> (deleta arquivo/pasta)</div>
                  <div>• Pressione <kbd className="bg-muted px-1 py-0.5 rounded">Tab</kbd> para autocompletar e ciclar.</div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    </GlobalShortcuts>
  )
}
