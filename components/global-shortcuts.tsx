"use client"

import * as React from "react"
import { useTheme } from "@/components/theme-provider"
import { QuickOpenDialog } from "@/components/quick-open-dialog"
import { CommandBarDialog } from "@/components/command-bar-dialog"
import { NoItem } from "@/actions/types"
import { PinDialog } from "@/components/pin-dialog"
import { liberarAcesso } from "@/actions/acesso"
import { ReadSessionBoundary } from "@/components/read-session-boundary"

interface GlobalShortcutsProps {
  arvore: NoItem[]
  exigirPinBusca?: boolean
  children: React.ReactNode
}

export function GlobalShortcuts({ arvore, exigirPinBusca = false, children }: GlobalShortcutsProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [quickOpenOpen, setQuickOpenOpen] = React.useState(false)
  const [commandBarOpen, setCommandBarOpen] = React.useState(false)
  const [searchPinOpen, setSearchPinOpen] = React.useState(false)

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()

      if (e.key === "Escape") {
        if (quickOpenOpen || commandBarOpen) {
          setQuickOpenOpen(false)
          setCommandBarOpen(false)
        }
        return
      }

      if (!isMod) return

      if (isMod && e.shiftKey && key === "p") {
        e.preventDefault()
        e.stopPropagation()
        setCommandBarOpen(true)
        setQuickOpenOpen(false)
        return
      }

      if (isMod && !e.shiftKey && key === "p") {
        e.preventDefault()
        e.stopPropagation()
        if (exigirPinBusca) setSearchPinOpen(true)
        else setQuickOpenOpen(true)
        setCommandBarOpen(false)
        return
      }

      if (isMod && !e.shiftKey && key === "d") {
        e.preventDefault()
        e.stopPropagation()
        setTheme(resolvedTheme === "dark" ? "light" : "dark")
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown, { capture: true })
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true })
  }, [resolvedTheme, setTheme, quickOpenOpen, commandBarOpen])

  async function confirmarBusca(pin: string) {
    const result = await liberarAcesso(pin, ["search"])
    if (!result.success) throw new Error(result.error || "Não foi possível liberar a busca.")
    setSearchPinOpen(false)
    setQuickOpenOpen(true)
  }

  return (
    <>
      <ReadSessionBoundary />
      {children}
      <QuickOpenDialog
        open={quickOpenOpen}
        onOpenChange={setQuickOpenOpen}
        arvore={arvore}
      />
      <CommandBarDialog
        open={commandBarOpen}
        onOpenChange={setCommandBarOpen}
        arvore={arvore}
      />
      <PinDialog open={searchPinOpen} onOpenChange={setSearchPinOpen} onSuccess={confirmarBusca} title="PIN para buscar" description="Digite o PIN para usar a busca de notas." />
    </>
  )
}
