import { obterArvore } from "@/actions/no"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { GlobalShortcuts } from "@/components/global-shortcuts"
import { AccessGate } from "@/components/access-gate"
import { temAcessosPin } from "@/lib/pin-session"
import { obterPoliticasAtuais } from "@/lib/security-policies"

export const metadata = {
  title: "Hayaku Note",
}

export default async function HomePage() {
  const politicas = await obterPoliticasAtuais()
  if (politicas.exigirPinArvore && !(await temAcessosPin(["tree"]))) {
    return <AccessGate scopes={["tree"]} title="Este site está protegido" description="Digite o PIN para visualizar a árvore e as notas liberadas nesta sessão." />
  }

  const arvore = await obterArvore()

  return (
    <GlobalShortcuts arvore={arvore} exigirPinBusca={politicas.exigirPinBusca}>
      <SidebarProvider>
        <div className="flex h-screen w-full overflow-hidden">
          <AppSidebar arvore={arvore} />
          <main className="flex-1 flex flex-col items-center justify-center p-8 bg-background text-center overflow-y-auto relative">
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <SidebarTrigger />
              <span className="text-xs font-sans text-muted-foreground">Barra lateral</span>
            </div>

            <div className="max-w-md w-full space-y-6 mx-auto animate-in fade-in-0 zoom-in-95 duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]">
              <div className="space-y-2">
                <h1 className="text-xl font-semibold tracking-tight font-sans">Hayaku Note</h1>
                <p className="text-xs text-muted-foreground font-sans">
                  Nenhuma anotação selecionada. Escolha uma nota na barra lateral ou crie uma nova para começar.
                </p>
              </div>

              <div className="border border-border/60 rounded-2xl p-5 text-left space-y-3.5 bg-card/80 backdrop-blur-sm text-card-foreground shadow-md text-xs font-mono">
                <div className="font-semibold text-foreground border-b border-border/60 pb-2.5 flex items-center justify-between">
                  <span>Atalhos & Command Bar</span>
                  <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded bg-muted/60">Guia Rápido</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-semibold">Ctrl/Cmd + P</kbd></div>
                  <div className="text-muted-foreground">Quick Open (Busca)</div>

                  <div><kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-semibold">Ctrl/Cmd + ⇧ + P</kbd></div>
                  <div className="text-muted-foreground">Command Bar (CLI)</div>

                  <div><kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-semibold">Ctrl/Cmd + D</kbd></div>
                  <div className="text-muted-foreground">Alternar Tema</div>

                  <div><kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-semibold">Ctrl/Cmd + S</kbd></div>
                  <div className="text-muted-foreground">Salvar Nota (PIN)</div>

                  <div><kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-semibold">Ctrl/Cmd + B</kbd></div>
                  <div className="text-muted-foreground">Alternar Sidebar</div>
                </div>

                <div className="border-t border-border/60 pt-2.5 space-y-1 text-[11px] text-muted-foreground">
                  <div className="font-semibold text-foreground">Comandos CLI (Command Bar):</div>
                  <div>• <code className="text-primary font-semibold">touch path/nota</code> (cria arquivo)</div>
                  <div>• <code className="text-primary font-semibold">mkdir path/pasta</code> (cria pasta)</div>
                  <div>• <code className="text-primary font-semibold">rm path/item</code> (deleta arquivo/pasta)</div>
                  <div>• Pressione <kbd className="bg-muted px-1 py-0.5 rounded text-[10px]">Tab</kbd> para autocompletar e ciclar.</div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    </GlobalShortcuts>
  )
}
