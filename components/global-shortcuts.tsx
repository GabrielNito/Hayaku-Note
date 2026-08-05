"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { QuickOpenDialog } from "@/components/quick-open-dialog"
import { CommandBarDialog } from "@/components/command-bar-dialog"
import { NoItem } from "@/actions/types"

interface GlobalShortcutsProps {
  arvore: NoItem[]
  children: React.ReactNode
}

export function GlobalShortcuts({ arvore, children }: GlobalShortcutsProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [quickOpenOpen, setQuickOpenOpen] = React.useState(false)
  const [commandBarOpen, setCommandBarOpen] = React.useState(false)

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
        setQuickOpenOpen(true)
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

  return (
    <>
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
    </>
  )
}
