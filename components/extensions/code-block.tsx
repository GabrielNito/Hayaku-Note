"use client"

import * as React from "react"
import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react"
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight"
import { Copy, Check, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"

const LANGUAGES = [
  { label: "Plaintext", value: "" },
  { label: "JavaScript", value: "javascript" },
  { label: "TypeScript", value: "typescript" },
  { label: "Python", value: "python" },
  { label: "Bash", value: "bash" },
  { label: "JSON", value: "json" },
  { label: "CSS", value: "css" },
  { label: "HTML", value: "html" },
  { label: "SQL", value: "sql" },
]

const CodeBlockComponent = ({ node, updateAttributes }: NodeViewProps) => {
  const [copied, setCopied] = React.useState(false)
  const [isLangOpen, setIsLangOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const currentLang = node.attrs.language || ""

  const selectedLangLabel =
    LANGUAGES.find((l) => l.value === currentLang)?.label || currentLang || "Plaintext"

  React.useEffect(() => {
    if (!isLangOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsLangOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isLangOpen])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(node.textContent || "")
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy code:", err)
    }
  }

  return (
    <NodeViewWrapper className="my-4 rounded-lg border border-border/60 bg-[var(--code-bg)] overflow-hidden group shadow-sm">
      {/* Top bar */}
      <div
        contentEditable={false}
        className="h-9 px-3.5 bg-muted/30 border-b border-border/40 flex items-center justify-between text-xs font-sans text-muted-foreground select-none"
      >
        <div ref={menuRef} className="relative" onMouseDown={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setIsLangOpen(!isLangOpen)
            }}
            className="h-6 px-2 text-xs font-mono text-muted-foreground hover:text-foreground flex items-center gap-1 rounded bg-transparent hover:bg-muted/60 cursor-pointer outline-none ios-press"
          >
            <span>{selectedLangLabel}</span>
            <ChevronDown className={`size-3 opacity-60 transition-transform duration-150 ${isLangOpen ? "rotate-180" : ""}`} />
          </button>

          {isLangOpen && (
            <div className="absolute left-0 top-full mt-1 z-50 min-w-44 w-48 rounded-xl border border-border/60 bg-popover p-1 text-popover-foreground shadow-xl animate-in fade-in-0 zoom-in-95 duration-150 font-sans max-h-64 overflow-y-auto">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.value || "none"}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    updateAttributes({ language: lang.value })
                    setIsLangOpen(false)
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-1.5 text-xs font-mono rounded-lg hover:bg-accent hover:text-accent-foreground text-left cursor-pointer transition-colors whitespace-nowrap ${
                    currentLang === lang.value ? "bg-accent text-accent-foreground font-semibold" : ""
                  }`}
                >
                  <span className="truncate">{lang.label}</span>
                  {currentLang === lang.value && <Check className="size-3 text-primary shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5 bg-transparent hover:bg-muted/60 ios-press"
          title="Copiar código"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-emerald-500 animate-ios-pop" />
              <span className="text-emerald-500 animate-ios-pop">Copiado</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              <span>Copiar</span>
            </>
          )}
        </Button>
      </div>

      {/* Code content area */}
      <div className="py-2 px-4 overflow-x-auto max-w-full">
        <pre className="m-0 bg-transparent p-0 font-mono text-xs text-[var(--code-fg)] leading-relaxed whitespace-pre !whitespace-pre">
          <NodeViewContent className="outline-none whitespace-pre !whitespace-pre block" />
        </pre>
      </div>
    </NodeViewWrapper>
  )
}

export interface CodeBlockExtensionOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lowlight: any
}

export const CustomCodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockComponent)
  },
})
