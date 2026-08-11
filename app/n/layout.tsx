import { obterArvore } from "@/actions/no"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { GlobalShortcuts } from "@/components/global-shortcuts"
import { obterPoliticasAtuais } from "@/lib/security-policies"
import { temAcessosPin } from "@/lib/pin-session"
import { AccessGate } from "@/components/access-gate"

export default async function NoteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const politicas = await obterPoliticasAtuais()
  if (politicas.exigirPinArvore && !(await temAcessosPin(["tree"]))) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <AccessGate scopes={["tree"]} title="Este site está protegido" description="Digite o PIN para visualizar a árvore e as notas liberadas nesta sessão." />
      </div>
    )
  }

  const arvore = await obterArvore()

  return (
    <GlobalShortcuts arvore={arvore} exigirPinBusca={politicas.exigirPinBusca}>
      <SidebarProvider>
        <div className="flex h-screen w-full overflow-hidden">
          <AppSidebar arvore={arvore} />
          <div className="flex-1 flex flex-col min-w-0">
            {children}
          </div>
        </div>
      </SidebarProvider>
    </GlobalShortcuts>
  )
}
