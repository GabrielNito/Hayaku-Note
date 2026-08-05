"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { PinDialog } from "@/components/pin-dialog"
import { executarComandoCli } from "@/actions/no"
import { NoItem } from "@/actions/types"

interface CommandBarDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  arvore: NoItem[]
}

export function CommandBarDialog({ open, onOpenChange, arvore }: CommandBarDialogProps) {
  const router = useRouter()
  const [inputVal, setInputVal] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [showPinModal, setShowPinModal] = React.useState(false)
  const [pendingCommand, setPendingCommand] = React.useState("")
  const [tabIndex, setTabIndex] = React.useState(0)
  const [lastPartial, setLastPartial] = React.useState("")

  React.useEffect(() => {
    if (open) {
      setInputVal("")
      setError(null)
      setShowPinModal(false)
      setPendingCommand("")
      setTabIndex(0)
      setLastPartial("")
    }
  }, [open])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Tab") {
      e.preventDefault()
      const parts = inputVal.trim().split(/\s+/)
      const cmd = parts[0] || "touch"
      const pathStr = parts.slice(1).join(" ") || ""

      const endsWithSlash = pathStr.endsWith("/")
      const rawSegments = pathStr.split("/").map((s) => s.trim())
      const partial = endsWithSlash ? "" : (rawSegments.pop() || "")
      const dirSegments = rawSegments.filter(Boolean)

      let currentNodes = arvore
      let valid = true
      for (const seg of dirSegments) {
        const found = currentNodes.find((n) => n.nome.toLowerCase() === seg.toLowerCase() && n.tipo === "PASTA")
        if (found && found.filhos) {
          currentNodes = found.filhos
        } else {
          valid = false
          break
        }
      }

      if (valid) {
        const matches = currentNodes.filter((n) => n.nome.toLowerCase().startsWith(partial.toLowerCase()))
        if (matches.length > 0) {
          const nextIndex = partial === lastPartial ? (tabIndex + 1) % matches.length : 0
          setTabIndex(nextIndex)
          setLastPartial(partial)

          const match = matches[nextIndex]
          const completedSegments = [...dirSegments, match.nome]
          setInputVal(`${cmd} ${completedSegments.join("/")}${match.tipo === "PASTA" ? "/" : ""}`)
        }
      }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = inputVal.trim()
    if (!trimmed) return

    const parts = trimmed.split(/\s+/)
    const cmd = parts[0]?.toLowerCase()
    const pathStr = parts.slice(1).join(" ").trim()

    if (!["touch", "mkdir", "rm"].includes(cmd) || !pathStr) {
      setError("Uso correto: touch <caminho>, mkdir <caminho> ou rm <caminho>")
      return
    }

    setError(null)
    setPendingCommand(trimmed)
    setShowPinModal(true)
  }

  async function handlePinSuccess(pin: string) {
    const res = await executarComandoCli(pin, pendingCommand)
    if (!res.success) {
      throw new Error(res.error || "Erro ao executar comando.")
    }

    onOpenChange(false)
    router.refresh()
    if (res.id && res.tipo === "ARQUIVO") {
      router.push(`/n/${res.id}`)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[550px] p-4">
          <DialogHeader className="sr-only">
            <DialogTitle>Command Bar</DialogTitle>
            <DialogDescription>Execute comandos CLI para gerenciar notas e pastas.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <div className="flex items-center border rounded-md px-3 bg-background">
              <span className="text-xs text-muted-foreground font-mono mr-2">$</span>
              <Input
                value={inputVal}
                onChange={(e) => {
                  setInputVal(e.target.value)
                  if (error) setError(null)
                }}
                onKeyDown={handleKeyDown}
                placeholder="touch pasta/arquivo | mkdir pasta | rm pasta/arquivo"
                className="border-0 shadow-none font-mono text-sm focus-visible:ring-0 px-0 h-11"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-xs text-destructive font-mono px-1">
                {error}
              </p>
            )}

            <div className="flex justify-between items-center px-1 text-[11px] text-muted-foreground font-mono">
              <span>Tab para autocompletar (pressione repetidamente para ciclar)</span>
              <span>Pressione Enter para executar</span>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <PinDialog
        open={showPinModal}
        onOpenChange={setShowPinModal}
        onSuccess={handlePinSuccess}
        title="Autorizar Comando CLI"
        description="Digite o PIN de 6 dígitos para confirmar a execução do comando."
      />
    </>
  )
}
