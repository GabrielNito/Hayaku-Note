"use client"

import * as React from "react"
import { type Editor } from "@tiptap/react"
import { List, X, ChevronRight, AlignLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
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

export function DocumentIndex({ editor, isChatOpen }: DocumentIndexProps) {
  const isMobile = useIsMobile()
  const [isOpen, setIsOpen] = React.useState(true)
  const [isHighlighted, setIsHighlighted] = React.useState(false)
  const [headings, setHeadings] = React.useState<HeadingItem[]>([])
  const [mobileOpen, setMobileOpen] = React.useState(false)

  // Extract headings whenever editor content updates
  React.useEffect(() => {
    if (!editor) return

    function updateHeadings() {
      const items: HeadingItem[] = []
      editor?.state.doc.descendants((node) => {
        if (node.type.name === "heading") {
          const level = node.attrs.level as number
          if (level >= 1 && level <= 3) {
            items.push({
              level,
              text: node.textContent || "Cabeçalho sem título",
              index: items.length,
            })
          }
        }
      })
      setHeadings(items)
    }

    updateHeadings()

    editor.on("update", updateHeadings)
    return () => {
      editor.off("update", updateHeadings)
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
            <ScrollArea className="flex-1 h-full py-4">
              <div className="space-y-1 pr-3">
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
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    )
  }

  // Desktop Closed State: Small subtle icon-only button pinned near header right edge
  if (!isOpen) {
    return (
      <div className="fixed right-8 top-16 z-30 hidden sm:block shrink-0">
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => setIsOpen(true)}
          className="h-7 w-7 text-muted-foreground hover:text-foreground bg-muted/80 backdrop-blur-sm border border-border/40 shadow-xs"
          title="Abrir sumário"
          aria-label="Abrir sumário"
        >
          <List className="size-3.5" />
        </Button>
      </div>
    )
  }

  // Filter headings for open state (H1 only)
  const h1Headings = headings.filter((h) => h.level === 1)
  const displayHeadings = isHighlighted ? headings : h1Headings.length > 0 ? h1Headings : headings

  return (
    <div
      className="fixed right-8 top-16 z-30 hidden sm:block shrink-0 transition-all duration-200 ease-in-out"
      onMouseEnter={() => setIsHighlighted(true)}
      onMouseLeave={() => setIsHighlighted(false)}
    >
      <div
        className={`bg-muted backdrop-blur-md border border-border/60 rounded-lg shadow-md overflow-hidden transition-all duration-200 flex flex-col ${
          isHighlighted ? "w-64 h-[380px]" : "w-48 h-[240px]"
        }`}
      >
        {/* Subtle Header: Just the close button, no title text */}
        <div className="flex items-center justify-end px-2 pt-1.5 pb-0.5 shrink-0 bg-muted/50 border-b border-border/30">
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={() => {
              setIsOpen(false)
              setIsHighlighted(false)
            }}
            className="text-muted-foreground hover:text-foreground h-5 w-5"
            title="Fechar índice"
            aria-label="Fechar índice"
          >
            <X className="size-3" />
          </Button>
        </div>

        {/* Headings list with ScrollArea */}
        <ScrollArea className="flex-1 w-full h-full p-2 pt-1.5 text-xs">
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
                    className={`w-full min-w-0 text-left py-1.5 px-2 rounded hover:bg-background hover:text-accent-foreground transition-colors flex items-center gap-1.5 group ${indentClass}`}
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
        </ScrollArea>
      </div>
    </div>
  )
}
