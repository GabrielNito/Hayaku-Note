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
import { PinDialog } from "@/components/pin-dialog"
import { executarComandoCli } from "@/actions/no"
import { NoItem } from "@/actions/types"
import { navigateWith } from "@/lib/navigation"

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
  const [tabState, setTabState] = React.useState<{
    dirSegments: string[]
    partial: string
    cmd: string
    index: number
  } | null>(null)
  const getCommandContext = React.useMemo(() => {
    const trimmed = inputVal.trimStart()
    const parts = trimmed.split(/\s+/)
    const cmd = parts[0]?.toLowerCase() || ""
    const isTwoArg = ["cp", "mv"].includes(cmd)
    const endsWithSpace = inputVal.endsWith(" ")

    let slot = 1
    let pathStr = ""
    let prefix = `${cmd} `

    if (isTwoArg) {
      if (parts.length >= 3 || (parts.length === 2 && endsWithSpace)) {
        slot = 2
        prefix = `${parts[0]} ${parts[1] || ""} `
        pathStr = parts.length >= 3 ? parts.slice(2).join(" ") : ""
      } else {
        slot = 1
        prefix = `${parts[0]} `
        pathStr = parts[1] || ""
      }
    } else {
      slot = 1
      prefix = `${cmd} `
      pathStr = parts.slice(1).join(" ") || ""
    }

    return { cmd, slot, pathStr, prefix }
  }, [inputVal])

  const suggestions = React.useMemo(() => {
    const { pathStr } = getCommandContext
    if (!pathStr && !inputVal.endsWith(" ") && inputVal.trim().split(/\s+/).length <= 1) {
      return []
    }

    const endsWithSlash = pathStr.endsWith("/")
    const rawSegments = pathStr.split("/").map((s) => s.trim())
    const partial = endsWithSlash ? "" : (rawSegments.pop() || "")
    const dirSegments = rawSegments.filter(Boolean)

    let currentNodes = arvore
    for (const seg of dirSegments) {
      const found = currentNodes.find((n) => n.nome.toLowerCase() === seg.toLowerCase() && n.tipo === "PASTA")
      if (found && found.filhos) {
        currentNodes = found.filhos
      } else {
        return []
      }
    }

    return currentNodes.filter((n) => n.nome.toLowerCase().startsWith(partial.toLowerCase()))
  }, [getCommandContext, arvore, inputVal])

  function handleSelectSuggestion(item: NoItem) {
    const { pathStr, prefix } = getCommandContext
    const rawSegments = pathStr.split("/").map((s) => s.trim())
    if (!pathStr.endsWith("/")) {
      rawSegments.pop()
    }

    const completedSegments = [...rawSegments.filter(Boolean), item.nome]
    const newVal = `${prefix}${completedSegments.join("/")}${item.tipo === "PASTA" ? "/" : ""}`

    setInputVal(newVal)
    setTabState(null)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      const syntheticEvent = { preventDefault: () => {} } as React.FormEvent
      handleSubmit(syntheticEvent)
      return
    }

    if (e.key === "Tab") {
      e.preventDefault()
      const { pathStr, prefix, cmd } = getCommandContext

      const endsWithSlash = pathStr.endsWith("/")
      const rawSegments = pathStr.split("/").map((s) => s.trim())

      let dirSegments: string[] = []
      let partial = ""

      if (tabState) {
        dirSegments = tabState.dirSegments
        partial = tabState.partial
      } else {
        if (endsWithSlash) {
          dirSegments = rawSegments.filter(Boolean)
          partial = ""
        } else {
          partial = rawSegments.pop() || ""
          dirSegments = rawSegments.filter(Boolean)
        }
      }

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
          const nextIndex = tabState ? (tabState.index + 1) % matches.length : 0
          const match = matches[nextIndex]
          const completedSegments = [...dirSegments, match.nome]
          const newVal = `${prefix}${completedSegments.join("/")}${match.tipo === "PASTA" ? "/" : ""}`

          setInputVal(newVal)
          setTabState({
            dirSegments,
            partial,
            cmd,
            index: nextIndex,
          })
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

    if (!["touch", "mkdir", "rm", "cp", "mv"].includes(cmd) || !pathStr) {
      setError("Uso correto: touch <caminho>, mkdir <caminho>, rm <caminho>, cp <origem> <destino> ou mv <origem> <destino>")
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
      navigateWith(router, `/n/${res.id}`)
    } else if (res.deletedId) {
      const currentPath = window.location.pathname
      if (currentPath.includes(`/n/${res.deletedId}`)) {
        navigateWith(router, "/")
      }
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (isOpen) {
            setInputVal("")
            setError(null)
            setShowPinModal(false)
            setPendingCommand("")
            setTabState(null)
          }
          onOpenChange(isOpen)
        }}
      >
        <DialogContent className="sm:max-w-2xl p-4">
          <DialogHeader className="sr-only">
            <DialogTitle>Command Bar</DialogTitle>
            <DialogDescription>Execute comandos CLI para gerenciar notas e pastas.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <div className="flex items-start border border-border/70 rounded-xl px-3.5 py-2.5 bg-background/90 focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-200">
              <span className="text-xs text-muted-foreground font-mono mr-2.5 mt-1 select-none font-semibold">$</span>
              <textarea
                value={inputVal}
                onChange={(e) => {
                  setInputVal(e.target.value)
                  setTabState(null)
                  if (error) setError(null)
                }}
                onKeyDown={handleKeyDown}
                placeholder="touch arquivo | mkdir pasta | rm caminho | cp orig dest | mv orig dest"
                className="border-0 shadow-none font-mono text-sm focus-visible:ring-0 px-0 w-full bg-transparent resize-none min-h-[56px] max-h-32 outline-none leading-relaxed"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                autoFocus
              />
            </div>

            {suggestions.length > 0 && (
              <div className="border border-border/60 rounded-xl bg-popover text-popover-foreground shadow-lg max-h-48 overflow-y-auto p-1.5 flex flex-col gap-0.5 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                {suggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectSuggestion(item)}
                    className="flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg hover:bg-accent hover:text-accent-foreground text-left font-mono cursor-pointer ios-press transition-colors duration-150"
                  >
                    <span className="font-medium">{item.nome}{item.tipo === "PASTA" ? "/" : ""}</span>
                    <span className="text-[10px] text-muted-foreground/80 px-1.5 py-0.5 rounded bg-muted font-sans">{item.tipo}</span>
                  </button>
                ))}
              </div>
            )}

            {error && (
              <p className="text-xs text-destructive font-mono px-1 animate-ios-shake">
                {error}
              </p>
            )}

            <div className="flex justify-between items-center px-1 text-[11px] text-muted-foreground font-mono">
              <span>Tab para autocompletar e ciclar</span>
              <span>Enter para executar</span>
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
