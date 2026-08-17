"use client"

import { Node, InputRule, mergeAttributes } from "@tiptap/core"
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react"
import { useRouter } from "next/navigation"
import * as React from "react"
import type { NoItem } from "@/actions/types"
import { navigateWith } from "@/lib/navigation"

// ──────────────────────────────────────────────
// NodeView: renders the [[nome]] node inline
// ──────────────────────────────────────────────
function WikiLinkView({ node, extension }: ReactNodeViewProps) {
  const router = useRouter()
  const nome = (node.attrs.nome ?? "") as string
  const arvore = (extension.options as { arvore: NoItem[] }).arvore ?? []

  function encontrarId(nodes: NoItem[], alvo: string): string | null {
    for (const n of nodes) {
      if (n.nome.toLowerCase() === alvo.toLowerCase() && n.tipo === "ARQUIVO") {
        return n.id
      }
      if (n.filhos && n.filhos.length > 0) {
        const found = encontrarId(n.filhos, alvo)
        if (found) return found
      }
    }
    return null
  }

  const targetId = encontrarId(arvore, nome)

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    if (targetId) {
      navigateWith(router, `/n/${targetId}`)
    }
  }

  return (
    <NodeViewWrapper as="span" className="wiki-link-wrapper">
      <span
        className={`wiki-link ${targetId ? "wiki-link--found" : "wiki-link--not-found"}`}
        onClick={handleClick}
        title={targetId ? `Ir para: ${nome}` : `Nota não encontrada: "${nome}"`}
        data-wiki-nome={nome}
      >
        {nome}
      </span>
    </NodeViewWrapper>
  )
}

// ──────────────────────────────────────────────
// Tiptap Extension definition
// ──────────────────────────────────────────────
export const WikiLink = Node.create<{ arvore: NoItem[] }>({
  name: "wikiLink",
  group: "inline",
  inline: true,
  atom: true,

  addOptions() {
    return {
      arvore: [],
    }
  },

  addAttributes() {
    return {
      nome: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-wiki-nome") ?? "",
        renderHTML: (attrs) => ({ "data-wiki-nome": attrs.nome }),
      },
    }
  },

  parseHTML() {
    return [{ tag: "span[data-wiki-nome]" }]
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "wiki-link" })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(WikiLinkView)
  },

  // Serialize as [[nome]] in markdown
  addStorage() {
    return {
      markdown: {
        serialize(
          state: { write: (s: string) => void },
          node: { attrs: { nome: string } }
        ) {
          state.write(`[[${node.attrs.nome}]]`)
        },
        parse: {
          // Handled by the InputRule and inline parse below
        },
      },
    }
  },

  // InputRule: typing [[some text]] triggers the node
  addInputRules() {
    return [
      new InputRule({
        find: /\[\[([^\]]+)\]\]$/,
        handler: ({ state, range, match }) => {
          const nome = match[1]?.trim()
          if (!nome) return

          const { tr } = state
          const node = this.type.create({ nome })
          tr.replaceWith(range.from, range.to, node)
        },
      }),
    ]
  },
})
