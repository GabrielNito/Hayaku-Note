"use client"

import * as React from "react"
import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from "@tiptap/react"
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight"
import { Copy, Check, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CodeBlockComponent = ({ node, updateAttributes }: { node: any; updateAttributes: (attrs: any) => void }) => {
  const [copied, setCopied] = React.useState(false)
  const currentLang = node.attrs.language || ""

  const selectedLangLabel =
    LANGUAGES.find((l) => l.value === currentLang)?.label || currentLang || "Plaintext"

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
      <div className="h-9 px-3.5 bg-muted/30 border-b border-border/40 flex items-center justify-between text-xs font-sans text-muted-foreground select-none">
        <DropdownMenu>
          <DropdownMenuTrigger className="h-6 px-2 text-xs font-mono text-muted-foreground hover:text-foreground flex items-center gap-1 rounded bg-transparent hover:bg-muted/60 cursor-pointer outline-none">
            <span>{selectedLangLabel}</span>
            <ChevronDown className="size-3 opacity-60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-36">
            {LANGUAGES.map((lang) => (
              <DropdownMenuItem
                key={lang.value || "none"}
                onClick={() => updateAttributes({ language: lang.value })}
                className="text-xs font-mono cursor-pointer"
              >
                {lang.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5 bg-transparent hover:bg-muted/60"
          title="Copiar código"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-green-500" />
              <span className="text-green-500">Copiado</span>
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
      <div className="p-4 overflow-x-auto">
        <pre className="m-0 bg-transparent p-0 font-mono text-xs text-[var(--code-fg)] leading-relaxed">
          <NodeViewContent />
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
