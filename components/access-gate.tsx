"use client"

import * as React from "react"
import { LockKeyhole } from "lucide-react"
import { useRouter } from "next/navigation"
import { liberarAcesso } from "@/actions/acesso"
import { PinDialog } from "@/components/pin-dialog"
import { Button } from "@/components/ui/button"

export function AccessGate({ scopes, title = "Este site está protegido", description = "Digite o PIN para continuar nesta sessão." }: { scopes: string[]; title?: string; description?: string }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(true)

  async function confirmar(pin: string) {
    const result = await liberarAcesso(pin, scopes)
    if (!result.success) throw new Error(result.error || "Não foi possível liberar o acesso.")
    setOpen(false)
    router.refresh()
  }

  return (
    <main className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background p-8 text-center animate-in fade-in-0 duration-500">
      <div className="flex size-12 items-center justify-center rounded-full border border-border/80 bg-muted/40 shadow-xs animate-ios-pulse-soft">
        <LockKeyhole className="size-5 text-primary" />
      </div>
      <div className="space-y-1">
        <h1 className="text-base font-semibold tracking-tight">Acesso protegido</h1>
        <p className="text-xs text-muted-foreground max-w-sm">Nenhum conteúdo foi carregado neste navegador.</p>
      </div>
      {!open && (
        <Button type="button" size="sm" onClick={() => setOpen(true)} className="ios-press shadow-sm">
          Inserir PIN
        </Button>
      )}
      <PinDialog open={open} onOpenChange={setOpen} onSuccess={confirmar} title={title} description={`${description} O conteúdo do site permanece oculto até a validação.`} />
    </main>
  )
}
