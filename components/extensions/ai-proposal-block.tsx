"use client"

import * as React from "react"
import { Node, mergeAttributes } from "@tiptap/core"
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react"
import { Check, X, Sparkles, Eye, FileText, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { computeLineDiff } from "@/lib/diff"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

function AiProposalComponent({ node, getPos, editor }: ReactNodeViewProps) {
  const [showDiff, setShowDiff] = React.useState(false)

  const originalContent = (node.attrs.originalContent ?? "") as string
  const proposedContent = (node.attrs.proposedContent ?? "") as string
  const summary = (node.attrs.summary ?? "Proposta da IA") as string

  const diffLines = React.useMemo(() => {
    return computeLineDiff(originalContent, proposedContent)
  }, [originalContent, proposedContent])

  const stats = React.useMemo(() => {
    let added = 0
    let removed = 0
    for (const line of diffLines) {
      if (line.type === "added") added++
      if (line.type === "removed") removed++
    }
    return { added, removed }
  }, [diffLines])

  const handleAccept = React.useCallback(() => {
    if (typeof getPos !== "function") return
    const pos = getPos()
    if (typeof pos !== "number") return

    setTimeout(() => {
      editor
        .chain()
        .focus()
        .deleteRange({ from: pos, to: pos + node.nodeSize })
        .insertContentAt(pos, proposedContent)
        .run()
    }, 0)
  }, [editor, getPos, node.nodeSize, proposedContent])

  const handleReject = React.useCallback(() => {
    if (typeof getPos !== "function") return
    const pos = getPos()
    if (typeof pos !== "number") return

    setTimeout(() => {
      if (originalContent && originalContent.trim()) {
        editor
          .chain()
          .focus()
          .deleteRange({ from: pos, to: pos + node.nodeSize })
          .insertContentAt(pos, originalContent)
          .run()
      } else {
        editor
          .chain()
          .focus()
          .deleteRange({ from: pos, to: pos + node.nodeSize })
          .run()
      }
    }, 0)
  }, [editor, getPos, node.nodeSize, originalContent])

  // Keybindings listener for when this proposal node is active/focused or visible
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        // Optional keyboard shortcut if node is active
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [handleAccept, handleReject])

  return (
    <NodeViewWrapper className="my-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20 shadow-lg overflow-hidden transition-all duration-300 select-text font-sans relative">
      {/* Header Bar */}
      <div className="bg-emerald-500/10 dark:bg-emerald-950/40 border-b border-emerald-500/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 select-none">
        <div className="flex items-center gap-2 text-xs font-sans text-foreground">
          <div className="p-1 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0 animate-ios-pulse-soft">
            <Sparkles className="size-4 animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-emerald-900 dark:text-emerald-200">
              Proposta da IA
            </span>
            {summary && (
              <span className="text-muted-foreground hidden sm:inline text-[11px]">
                • {summary}
              </span>
            )}
            <div className="flex items-center gap-1 text-[11px] font-mono shrink-0 ml-1">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                +{stats.added}
              </span>
              <span className="text-rose-600 dark:text-rose-400 font-medium">
                -{stats.removed}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowDiff(!showDiff)}
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground px-2 ios-press"
            title="Alternar entre Visualização Formatada e Diff"
          >
            <Eye className="size-3.5" />
            <span className="hidden xs:inline">{showDiff ? "Ver Resultado" : "Ver Diff"}</span>
            {showDiff ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReject}
            className="h-7 text-xs gap-1 border-rose-500/30 text-rose-700 dark:text-rose-300 hover:bg-rose-500/15 px-2.5 ios-press"
            title="Rejeitar alteração"
          >
            <X className="size-3.5 text-rose-500" />
            <span>Rejeitar</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleAccept}
            className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-medium shadow-xs px-2.5 ios-press"
            title="Aceitar e aplicar no documento"
          >
            <Check className="size-3.5" />
            <span>Aceitar</span>
          </Button>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-4 bg-background/50 text-sm leading-relaxed">
        {showDiff ? (
          <div className="border border-border/60 rounded-lg bg-background overflow-hidden text-xs font-mono max-h-80 overflow-y-auto">
            <div className="bg-muted/40 px-3 py-1.5 border-b border-border/60 text-[11px] text-muted-foreground font-sans flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="size-3.5 text-primary" />
                Comparativo de Alterações
              </span>
              <span>Verde = adicionado | Vermelho = removido</span>
            </div>
            <div className="p-2 space-y-0.5 select-text">
              {diffLines.map((line, idx) => {
                if (line.type === "added") {
                  return (
                    <div
                      key={idx}
                      className="flex items-start bg-emerald-500/15 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded-xs"
                    >
                      <span className="w-6 shrink-0 text-[10px] opacity-60 font-mono select-none">+</span>
                      <span className="whitespace-pre-wrap break-all flex-1">{line.content || " "}</span>
                    </div>
                  )
                }
                if (line.type === "removed") {
                  return (
                    <div
                      key={idx}
                      className="flex items-start bg-rose-500/15 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 px-2 py-0.5 rounded-xs line-through opacity-80"
                    >
                      <span className="w-6 shrink-0 text-[10px] opacity-60 font-mono select-none">-</span>
                      <span className="whitespace-pre-wrap break-all flex-1">{line.content || " "}</span>
                    </div>
                  )
                }
                return (
                  <div key={idx} className="flex items-start opacity-60 px-2 py-0.5">
                    <span className="w-6 shrink-0 text-[10px] opacity-40 font-mono select-none">
                      {line.newLineNumber || " "}
                    </span>
                    <span className="whitespace-pre-wrap break-all flex-1">{line.content || " "}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="prose dark:prose-invert max-w-none text-foreground text-sm space-y-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {proposedContent}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}

export const AiProposalBlock = Node.create({
  name: "aiProposalBlock",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      originalContent: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-original-content") ?? "",
        renderHTML: (attrs) => ({ "data-original-content": attrs.originalContent }),
      },
      proposedContent: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-proposed-content") ?? "",
        renderHTML: (attrs) => ({ "data-proposed-content": attrs.proposedContent }),
      },
      summary: {
        default: "Proposta da IA",
        parseHTML: (el) => el.getAttribute("data-summary") ?? "",
        renderHTML: (attrs) => ({ "data-summary": attrs.summary }),
      },
    }
  },

  parseHTML() {
    return [{ tag: "div[data-type='ai-proposal-block']" }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "ai-proposal-block" }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(AiProposalComponent)
  },
})
