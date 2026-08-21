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
import { Search, FileText, CornerDownLeft, FileSearch, X } from "lucide-react"
import { NoItem } from "@/actions/types"
import { navigateWith } from "@/lib/navigation"

interface QuickOpenDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  arvore: NoItem[]
}

interface FlatNode {
  id: string
  nome: string
  path: string
  pastaPath: string
}

function flattenFiles(nodes: NoItem[], parentPath = ""): FlatNode[] {
  let result: FlatNode[] = []
  for (const node of nodes) {
    const currentPath = parentPath ? `${parentPath} / ${node.nome}` : node.nome
    if (node.tipo === "ARQUIVO") {
      result.push({
        id: node.id,
        nome: node.nome,
        path: currentPath,
        pastaPath: parentPath,
      })
    }
    if (node.filhos && node.filhos.length > 0) {
      result = result.concat(flattenFiles(node.filhos, currentPath))
    }
  }
  return result
}

export function QuickOpenDialog({ open, onOpenChange, arvore }: QuickOpenDialogProps) {
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const files = React.useMemo(() => flattenFiles(arvore), [arvore])
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)
  const contentMeasureRef = React.useRef<HTMLDivElement>(null)
  const [measuredHeight, setMeasuredHeight] = React.useState<number | null>(null)

  // Measure content height with ResizeObserver for ultra-smooth spring height morphing
  React.useLayoutEffect(() => {
    if (!contentMeasureRef.current) return
    const ro = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect) {
        setMeasuredHeight(entry.target.scrollHeight)
      }
    })
    ro.observe(contentMeasureRef.current)
    return () => ro.disconnect()
  }, [open, query])

  const filteredFiles = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return files
    return files.filter(
      (f) => f.nome.toLowerCase().includes(q) || f.path.toLowerCase().includes(q)
    )
  }, [files, query])

  React.useEffect(() => {
    setSelectedIndex(0)
  }, [filteredFiles])

  // Scroll active item into view
  React.useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.querySelector<HTMLElement>('[data-selected="true"]')
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" })
    }
  }, [selectedIndex])

  const handleSelect = React.useCallback(
    (fileId: string) => {
      onOpenChange(false)
      navigateWith(router, `/n/${fileId}`)
    },
    [onOpenChange, router]
  )

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (filteredFiles.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % filteredFiles.length)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filteredFiles.length) % filteredFiles.length)
        return
      }
      if (e.key === "Enter") {
        e.preventDefault()
        const selected = filteredFiles[selectedIndex]
        if (selected) {
          handleSelect(selected.id)
        }
        return
      }
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (isOpen) {
          setQuery("")
          setSelectedIndex(0)
        }
        onOpenChange(isOpen)
      }}
    >
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-popover/90 backdrop-blur-2xl border border-border/70 shadow-2xl rounded-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Busca Rápida</DialogTitle>
          <DialogDescription>Digite para pesquisar anotações pelo nome ou caminho.</DialogDescription>
        </DialogHeader>

        <motion.div
          animate={{ height: measuredHeight ? measuredHeight : "auto" }}
          transition={{ type: "spring", stiffness: 360, damping: 30 }}
          className="overflow-hidden w-full"
        >
          <div ref={contentMeasureRef} className="flex flex-col p-4 gap-3 w-full">
            {/* Spotlight Search Header */}
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 border border-border/70 rounded-xl bg-background/80 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all duration-200 shadow-inner">
              <Search className="size-4 text-primary shrink-0 opacity-90" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite para buscar anotações..."
                className="w-full bg-transparent text-sm font-sans outline-none placeholder:text-muted-foreground/60 text-foreground"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("")
                    inputRef.current?.focus()
                  }}
                  className="p-0.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/60 transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              )}
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground shrink-0 border border-border/40">
                {filteredFiles.length} {filteredFiles.length === 1 ? "nota" : "notas"}
              </span>
            </div>

            {/* Results List */}
            {filteredFiles.length > 0 ? (
              <div
                ref={listRef}
                className="border border-border/60 rounded-xl bg-background/50 backdrop-blur-md text-popover-foreground shadow-md max-h-72 overflow-y-auto p-1.5 flex flex-col gap-0.5"
              >
                {filteredFiles.map((file, idx) => {
                  const isSelected = idx === selectedIndex
                  return (
                    <button
                      key={file.id}
                      type="button"
                      data-selected={isSelected}
                      onClick={() => handleSelect(file.id)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex items-center justify-between px-3 py-2.5 text-xs rounded-lg text-left font-sans cursor-pointer transition-all duration-150 ios-press ${
                        isSelected
                          ? "bg-primary/10 text-primary font-medium ring-1 ring-primary/30"
                          : "text-foreground/80 hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <FileText className={`size-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="flex flex-col min-w-0">
                          <span className={`truncate text-xs ${isSelected ? "text-primary font-semibold" : "text-foreground"}`}>
                            {file.nome}
                          </span>
                          {file.pastaPath && (
                            <span className="truncate text-[10px] text-muted-foreground/70 font-mono">
                              {file.pastaPath}
                            </span>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <span className="text-[10px] text-primary font-sans flex items-center gap-1 shrink-0 ml-2">
                          <span>Abrir</span>
                          <CornerDownLeft className="size-3" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-center border border-border/40 rounded-xl bg-background/30">
                <FileSearch className="size-8 text-muted-foreground/40 stroke-1" />
                <p className="text-xs text-muted-foreground font-medium">
                  Nenhuma anotação encontrada {query ? `para "${query}"` : ""}
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-between items-center px-1 pt-1 text-[11px] text-muted-foreground/80 font-mono border-t border-border/40">
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] border border-border/50 font-sans">↑↓</kbd>
                <span>navegar</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] border border-border/50 font-sans">Enter</kbd>
                <span>abrir nota</span>
                <kbd className="ml-2 px-1.5 py-0.5 rounded bg-muted text-[10px] border border-border/50 font-sans">Esc</kbd>
                <span>fechar</span>
              </span>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}

