"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
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
import { Folder, FileText, CornerDownLeft, Sparkles, Terminal } from "lucide-react"

interface CommandBarDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  arvore: NoItem[]
}

const COMMAND_TEMPLATES = [
  { cmd: "touch", label: "Novo arquivo", example: "touch notas/minha-nota" },
  { cmd: "mkdir", label: "Nova pasta", example: "mkdir estudos" },
  { cmd: "cp", label: "Copiar", example: "cp origem destino" },
  { cmd: "mv", label: "Mover / Renomear", example: "mv nota1 nova-pasta/" },
  { cmd: "rm", label: "Excluir", example: "rm notas/antiga" },
]

export function CommandBarDialog({ open, onOpenChange, arvore }: CommandBarDialogProps) {
  const router = useRouter()
  const [inputVal, setInputVal] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [showPinModal, setShowPinModal] = React.useState(false)
  const [pendingCommand, setPendingCommand] = React.useState("")
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const contentMeasureRef = React.useRef<HTMLDivElement>(null)
  const [measuredHeight, setMeasuredHeight] = React.useState<number | null>(null)

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

  // Measure content height with ResizeObserver for ultra-smooth spring height morphing
  React.useLayoutEffect(() => {
    if (!contentMeasureRef.current) return
    const updateHeight = () => {
      if (contentMeasureRef.current) {
        setMeasuredHeight(contentMeasureRef.current.getBoundingClientRect().height)
      }
    }
    updateHeight()
    const ro = new ResizeObserver(() => {
      updateHeight()
    })
    ro.observe(contentMeasureRef.current)
    return () => ro.disconnect()
  }, [open, inputVal, suggestions.length, error])

  React.useEffect(() => {
    setSelectedIndex(0)
  }, [suggestions])

  function handleSelectSuggestion(item: NoItem) {
    const { pathStr, prefix } = getCommandContext
    const rawSegments = pathStr.split("/").map((s) => s.trim())
    if (!pathStr.endsWith("/")) {
      rawSegments.pop()
    }

    const completedSegments = [...rawSegments.filter(Boolean), item.nome]
    const newVal = `${prefix}${completedSegments.join("/")}${item.tipo === "PASTA" ? "/" : ""}`

    setInputVal(newVal)
    textareaRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % suggestions.length)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length)
        return
      }
      if (e.key === "Tab") {
        e.preventDefault()
        const selected = suggestions[selectedIndex]
        if (selected) {
          handleSelectSuggestion(selected)
        }
        return
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      const syntheticEvent = { preventDefault: () => {} } as React.FormEvent
      handleSubmit(syntheticEvent)
      return
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

    if (res.deletedId || res.deletedIds) {
      const currentPath = typeof window !== "undefined" ? window.location.pathname : ""
      const deletedList: string[] = res.deletedIds || (res.deletedId ? [res.deletedId] : [])
      const isCurrentDeleted = deletedList.some((id: string) => currentPath === `/n/${id}` || currentPath.startsWith(`/n/${id}`))

      if (isCurrentDeleted) {
        if (typeof window !== "undefined") {
          window.__checkUnsavedChangesBeforeNav = undefined
        }
        router.push("/")
        router.refresh()
        return
      }
    }

    router.refresh()
    if (res.id && res.tipo === "ARQUIVO") {
      navigateWith(router, `/n/${res.id}`)
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
            setSelectedIndex(0)
          }
          onOpenChange(isOpen)
        }}
      >
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-popover/90 backdrop-blur-2xl border border-border/70 shadow-2xl rounded-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Command Bar</DialogTitle>
            <DialogDescription>Execute comandos CLI para gerenciar notas e pastas.</DialogDescription>
          </DialogHeader>

          <motion.div
            animate={{ height: measuredHeight ? measuredHeight : "auto" }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            className="overflow-hidden w-full"
          >
            <div ref={contentMeasureRef} className="flex flex-col p-4 gap-3 w-full">
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                {/* Input Area */}
                <div className="flex items-start border border-border/70 rounded-xl px-3.5 py-2.5 bg-background/80 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all duration-200 shadow-inner">
                  <span className="text-xs text-primary font-mono mr-2.5 mt-1 select-none font-bold">$</span>
                  <textarea
                    ref={textareaRef}
                    value={inputVal}
                    onChange={(e) => {
                      setInputVal(e.target.value)
                      if (error) setError(null)
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="touch arquivo | mkdir pasta | rm caminho | cp orig dest | mv orig dest"
                    className="border-0 shadow-none font-mono text-sm focus-visible:ring-0 px-0 w-full bg-transparent resize-none min-h-[52px] max-h-28 outline-none leading-relaxed text-foreground placeholder:text-muted-foreground/60"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    autoFocus
                  />
                </div>

                {/* Suggestions List or Command Helpers / Execution Preview */}
                {suggestions.length > 0 ? (
                  <div className="border border-border/60 rounded-xl bg-background/50 backdrop-blur-md text-popover-foreground shadow-md max-h-52 overflow-y-auto p-1.5 flex flex-col gap-0.5">
                    {suggestions.map((item, idx) => {
                      const isSelected = idx === selectedIndex
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectSuggestion(item)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left font-mono cursor-pointer transition-all duration-150 ios-press ${
                            isSelected
                              ? "bg-primary/10 text-primary font-semibold ring-1 ring-primary/30"
                              : "text-foreground/80 hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {item.tipo === "PASTA" ? (
                              <Folder className="size-3.5 text-primary shrink-0" />
                            ) : (
                              <FileText className="size-3.5 text-muted-foreground shrink-0" />
                            )}
                            <span className="truncate">{item.nome}{item.tipo === "PASTA" ? "/" : ""}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-muted-foreground/70 px-1.5 py-0.5 rounded bg-muted/60 font-sans">
                              {item.tipo}
                            </span>
                            {isSelected && (
                              <span className="text-[10px] text-primary font-sans flex items-center gap-0.5">
                                <CornerDownLeft className="size-3" />
                              </span>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : !inputVal.trim() ? (
                  /* Command Helper Pills */
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {COMMAND_TEMPLATES.map((tmpl) => (
                      <button
                        key={tmpl.cmd}
                        type="button"
                        onClick={() => {
                          setInputVal(`${tmpl.cmd} `)
                          textareaRef.current?.focus()
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/60 text-muted-foreground hover:text-foreground text-[11px] font-mono transition-all ios-press cursor-pointer"
                        title={tmpl.example}
                      >
                        <span className="font-bold text-primary">{tmpl.cmd}</span>
                        <span className="text-[10px] text-muted-foreground font-sans">{tmpl.label}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  /* Command Execution Preview when typing path */
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-background/50 backdrop-blur-md text-[11px] font-mono border border-border/50 text-muted-foreground">
                    <span className="truncate">
                      Executar: <strong className="text-foreground">{inputVal.trim()}</strong>
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-primary shrink-0 ml-2">
                      <span>Enter para rodar</span>
                      <CornerDownLeft className="size-3" />
                    </span>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <p className="text-xs text-destructive font-mono px-1 animate-ios-shake">
                    {error}
                  </p>
                )}

                {/* Footer */}
                <div className="flex justify-between items-center px-1 pt-1 text-[11px] text-muted-foreground/80 font-mono border-t border-border/40">
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] border border-border/50 font-sans">Tab</kbd>
                    <span>autocompletar</span>
                    <kbd className="ml-2 px-1.5 py-0.5 rounded bg-muted text-[10px] border border-border/50 font-sans">↑↓</kbd>
                    <span>navegar</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] border border-border/50 font-sans">Enter</kbd>
                    <span>executar</span>
                  </span>
                </div>
              </form>
            </div>
          </motion.div>
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

