"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { useTheme } from "@/components/theme-provider"
import { NoItem } from "@/actions/types"
import { PinDialog } from "@/components/pin-dialog"
import { liberarAcesso } from "@/actions/acesso"
import { ReadSessionBoundary } from "@/components/read-session-boundary"

const QuickOpenDialog = dynamic(
  () => import("@/components/quick-open-dialog").then((m) => m.QuickOpenDialog),
  { ssr: false }
)

const CommandBarDialog = dynamic(
  () => import("@/components/command-bar-dialog").then((m) => m.CommandBarDialog),
  { ssr: false }
)

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

  const handleOpenSearch = React.useCallback(() => {
    if (exigirPinBusca) {
      setSearchPinOpen(true)
    } else {
      setQuickOpenOpen(true)
    }
    setCommandBarOpen(false)
  }, [exigirPinBusca])

  const handleOpenCommandBar = React.useCallback(() => {
    setCommandBarOpen(true)
    setQuickOpenOpen(false)
  }, [])

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey
      const key = e.key?.toLowerCase() || ""

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
        handleOpenCommandBar()
        return
      }

      if (isMod && !e.shiftKey && key === "p") {
        e.preventDefault()
        e.stopPropagation()
        handleOpenSearch()
        return
      }

      if (isMod && !e.shiftKey && key === "d") {
        e.preventDefault()
        e.stopPropagation()
        setTheme(resolvedTheme === "dark" ? "light" : "dark")
        return
      }
    }

    const handleCustomQuickOpen = () => handleOpenSearch()
    const handleCustomCommandBar = () => handleOpenCommandBar()

    window.addEventListener("keydown", handleKeyDown, { capture: true })
    window.addEventListener("open-quick-open", handleCustomQuickOpen)
    window.addEventListener("open-command-bar", handleCustomCommandBar)

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true })
      window.removeEventListener("open-quick-open", handleCustomQuickOpen)
      window.removeEventListener("open-command-bar", handleCustomCommandBar)
    }
  }, [resolvedTheme, setTheme, quickOpenOpen, commandBarOpen, handleOpenSearch, handleOpenCommandBar])

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
      {quickOpenOpen && (
        <QuickOpenDialog
          open={quickOpenOpen}
          onOpenChange={setQuickOpenOpen}
          arvore={arvore}
        />
      )}
      {commandBarOpen && (
        <CommandBarDialog
          open={commandBarOpen}
          onOpenChange={setCommandBarOpen}
          arvore={arvore}
        />
      )}
      <PinDialog open={searchPinOpen} onOpenChange={setSearchPinOpen} onSuccess={confirmarBusca} title="PIN para buscar" description="Digite o PIN para usar a busca de notas." />
    </>
  )
}
