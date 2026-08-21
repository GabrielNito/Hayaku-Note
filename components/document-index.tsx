"use client"

import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import { type Editor } from "@tiptap/react"
import { List, X, ChevronRight, AlignLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"

interface HeadingItem {
  level: number // 1, 2, 3
  text: string
  index: number // 0-based index of heading in DOM
}

interface DocumentIndexProps {
  editor: Editor | null
  isChatOpen?: boolean
}

function extractHeadings(editor: Editor | null): HeadingItem[] {
  if (!editor || editor.isDestroyed) return []
  const items: HeadingItem[] = []
  try {
    editor.state.doc.descendants((node) => {
      if (node.type.name === "heading") {
        const level = node.attrs.level as number
        if (level >= 1 && level <= 6) {
          const text = node.textContent?.trim()
          if (text) {
            items.push({
              level,
              text,
              index: items.length,
            })
          }
        }
      }
    })
  } catch (err) {
    console.error("Erro ao extrair cabeçalhos:", err)
  }
  return items
}

export function DocumentIndex({ editor, isChatOpen }: DocumentIndexProps) {
  const isMobile = useIsMobile()
  const [isOpen, setIsOpen] = React.useState(true)
  const [isHighlighted, setIsHighlighted] = React.useState(false)
  const [headings, setHeadings] = React.useState<HeadingItem[]>([])
  const [mobileOpen, setMobileOpen] = React.useState(false)

  // Extract headings immediately on mount and whenever editor/document updates
  React.useEffect(() => {
    if (!editor || editor.isDestroyed) return

    // Immediate initial extraction
    setHeadings(extractHeadings(editor))

    let timeoutId: NodeJS.Timeout | null = null

    function updateHeadings() {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        if (!editor || editor.isDestroyed) return
        const items = extractHeadings(editor)
        setHeadings(items)
      }, 150)
    }

    editor.on("update", updateHeadings)
    editor.on("selectionUpdate", updateHeadings)
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      editor.off("update", updateHeadings)
      editor.off("selectionUpdate", updateHeadings)
    }
  }, [editor])

  const scrollToHeading = React.useCallback(
    (index: number) => {
      if (!editor) return

      try {
        const headingElements = editor.view.dom.querySelectorAll("h1, h2, h3")
        const element = headingElements[index] as HTMLElement

        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      } catch {
        // Fallback
      }

      setMobileOpen(false)
    },
    [editor]
  )

  if (isChatOpen || headings.length === 0) {
    return null
  }

  // Mobile view: Sheet modal with enhanced border visibility
  if (isMobile) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            render={
              <Button
                size="icon"
                variant="secondary"
                className="h-10 w-10 rounded-full shadow-lg border border-border bg-background"
                aria-label="Abrir sumário"
              />
            }
          >
            <List className="size-4" />
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[360px] flex flex-col border-l border-border/80 dark:border-zinc-700 shadow-xl bg-background">
            <SheetHeader className="pb-4 border-b border-border/60">
              <SheetTitle className="text-sm font-medium flex items-center gap-2">
                <AlignLeft className="size-4 text-muted-foreground" />
                Índice do Documento
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 h-full py-4 overflow-y-auto pr-2">
              <div className="space-y-1 pr-1">
                {headings.map((heading) => (
                  <button
                    key={heading.index}
                    onClick={() => scrollToHeading(heading.index)}
                    className={`w-full min-w-0 text-left text-xs py-1.5 px-2 rounded-md transition-colors hover:bg-accent hover:text-accent-foreground flex items-center gap-1.5 ${
                      heading.level === 1
                        ? "font-medium text-foreground"
                        : heading.level === 2
                        ? "pl-4 text-muted-foreground"
                        : "pl-7 text-muted-foreground/80"
                    }`}
                  >
                    <span className="text-[10px] text-muted-foreground/60 font-mono shrink-0">
                      {"#".repeat(heading.level)}
                    </span>
                    <span className="truncate flex-1 min-w-0 block">{heading.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    )
  }

  // Filter headings for open state (H1 only)
  const h1Headings = headings.filter((h) => h.level === 1)
  const displayHeadings = isHighlighted ? headings : h1Headings.length > 0 ? h1Headings : headings

  return (
    <div className="fixed right-8 top-16 z-30 hidden sm:block shrink-0">
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.div
            key="toc-closed"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 450, damping: 30 }}
          >
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => setIsOpen(true)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground bg-popover/80 backdrop-blur-xl border border-border/50 shadow-md rounded-xl ios-press"
              title="Abrir sumário"
              aria-label="Abrir sumário"
            >
              <List className="size-4" />
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="toc-open"
            initial={{ opacity: 0, scale: 0.92, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -6 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onMouseEnter={() => setIsHighlighted(true)}
            onMouseLeave={() => setIsHighlighted(false)}
            className="transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
          >
            <div
              className={`bg-popover/80 backdrop-blur-xl border border-border/60 rounded-2xl shadow-xl overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col h-fit ${
                isHighlighted ? "w-68 max-h-[380px]" : "w-48 max-h-[240px]"
              }`}
            >
              {/* Subtle Header: Just the close button, no title text */}
              <div className="flex items-center justify-end px-2.5 pt-2 pb-1 shrink-0 bg-muted/20 border-b border-border/30">
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => {
                    setIsOpen(false)
                    setIsHighlighted(false)
                  }}
                  className="text-muted-foreground hover:text-foreground h-5 w-5 rounded-md ios-press"
                  title="Fechar índice"
                  aria-label="Fechar índice"
                >
                  <X className="size-3" />
                </Button>
              </div>

              {/* Headings list */}
              <div className={`w-full p-2 pt-1.5 text-xs overflow-y-auto overflow-x-hidden ${
                isHighlighted ? "max-h-[320px]" : "max-h-[190px]"
              }`}>
                <div className="space-y-0.5 pr-2">
                  {displayHeadings.length === 0 ? (
                    <div className="text-muted-foreground/60 px-2 py-3 text-center text-[11px]">
                      Nenhum cabeçalho encontrado
                    </div>
                  ) : (
                    displayHeadings.map((heading) => {
                      const indentClass =
                        heading.level === 1
                          ? "font-medium text-foreground"
                          : heading.level === 2
                          ? "pl-3 text-muted-foreground font-normal"
                          : "pl-6 text-muted-foreground/80 font-normal text-[11px]"

                      return (
                        <button
                          key={heading.index}
                          onClick={() => scrollToHeading(heading.index)}
                          className={`w-full min-w-0 text-left py-1.5 px-2 rounded-lg hover:bg-accent/60 hover:text-accent-foreground transition-all duration-150 flex items-center gap-1.5 group ios-press cursor-pointer ${indentClass}`}
                          title={heading.text}
                        >
                          {isHighlighted && (
                            <span className="text-[10px] text-muted-foreground/50 font-mono shrink-0">
                              {"#".repeat(heading.level)}
                            </span>
                          )}
                          <span className="truncate flex-1 min-w-0 block">{heading.text}</span>
                          {!isHighlighted && heading.level === 1 && (
                            <ChevronRight className="size-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          )}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
