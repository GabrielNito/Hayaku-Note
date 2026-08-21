"use client"

import * as React from "react"
import { type Editor } from "@tiptap/react"
import { useIsMobile } from "@/hooks/use-mobile"

interface SmoothCursorProps {
  editor: Editor | null
  enabled?: boolean
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function SmoothCursor({ editor, enabled = true, containerRef }: SmoothCursorProps) {
  const isMobile = useIsMobile()
  const [pos, setPos] = React.useState<{ x: number; y: number; height: number } | null>(null)
  const [isVisible, setIsVisible] = React.useState(false)
  const [isTyping, setIsTyping] = React.useState(false)
  const idleTimerRef = React.useRef<NodeJS.Timeout | null>(null)

  const updateCursorPosition = React.useCallback(() => {
    if (!editor || editor.isDestroyed || !containerRef.current || !enabled || isMobile) {
      setIsVisible(false)
      return
    }

    try {
      const { selection } = editor.state
      // Only render smooth cursor if selection is collapsed (not dragging a highlight range)
      if (!selection.empty) {
        setIsVisible(false)
        return
      }

      const view = editor.view
      const coords = view.coordsAtPos(selection.from)
      const containerRect = containerRef.current.getBoundingClientRect()

      // Calculate relative position within container
      const x = coords.left - containerRect.left
      const y = coords.top - containerRect.top
      const height = Math.max(coords.bottom - coords.top, 18)

      // Ensure valid numbers
      if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(height)) {
        setPos({ x, y, height })
        setIsVisible(true)
        setIsTyping(true)

        if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
        idleTimerRef.current = setTimeout(() => {
          setIsTyping(false)
        }, 500)
      }
    } catch {
      setIsVisible(false)
    }
  }, [editor, containerRef, enabled, isMobile])

  React.useEffect(() => {
    if (!editor || !enabled || isMobile) return

    updateCursorPosition()

    const handleUpdate = () => {
      requestAnimationFrame(updateCursorPosition)
    }

    editor.on("selectionUpdate", handleUpdate)
    editor.on("update", handleUpdate)
    editor.on("focus", handleUpdate)
    editor.on("blur", () => {
      setIsVisible(false)
    })

    const container = containerRef.current
    if (container) {
      container.addEventListener("scroll", handleUpdate, { passive: true })
    }
    window.addEventListener("resize", handleUpdate, { passive: true })

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      editor.off("selectionUpdate", handleUpdate)
      editor.off("update", handleUpdate)
      editor.off("focus", handleUpdate)
      if (container) {
        container.removeEventListener("scroll", handleUpdate)
      }
      window.removeEventListener("resize", handleUpdate)
    }
  }, [editor, enabled, isMobile, updateCursorPosition, containerRef])

  if (!enabled || isMobile || !isVisible || !pos) return null

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute left-0 top-0 z-20 w-[2px] rounded-full bg-primary will-change-transform ${
        !isTyping ? "animate-ios-pulse-soft" : ""
      }`}
      style={{
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        height: `${pos.height}px`,
        transition: "transform 75ms cubic-bezier(0.2, 0.9, 0.4, 1), height 75ms ease",
      }}
    />
  )
}
