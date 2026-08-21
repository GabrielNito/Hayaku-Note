"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { useEditor, EditorContent, NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import Paragraph from "@tiptap/extension-paragraph"
import StarterKit from "@tiptap/starter-kit"
import Code from "@tiptap/extension-code"
import { markInputRule } from "@tiptap/core"
import Placeholder from "@tiptap/extension-placeholder"
import { Markdown } from "tiptap-markdown"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import { Checkbox } from "@/components/ui/checkbox"
import { CustomCodeBlock } from "@/components/extensions/code-block"
import { CustomTableBlock } from "@/components/extensions/table"
import { normalizeMarkdownTables } from "@/lib/markdown-table"
import { ResizableImage } from "@/components/resizable-image"
import { createLowlight } from "lowlight"
import js from "highlight.js/lib/languages/javascript"
import ts from "highlight.js/lib/languages/typescript"
import py from "highlight.js/lib/languages/python"
import bash from "highlight.js/lib/languages/bash"
import json from "highlight.js/lib/languages/json"
import css from "highlight.js/lib/languages/css"
import xml from "highlight.js/lib/languages/xml"
import sql from "highlight.js/lib/languages/sql"
import { salvarConteudo } from "@/actions/no"
import { PinDialog } from "@/components/pin-dialog"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { uploadFiles } from "@/lib/uploadthing"
import { Download, Sparkles, Search, Terminal, Table as TableIcon } from "lucide-react"
import { liberarAcesso } from "@/actions/acesso"
import { verificarAcessoChatAi } from "@/actions/configuracoes"
import { AiProposalBlock } from "@/components/extensions/ai-proposal-block"
import { DocumentIndex } from "@/components/document-index"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { useIsMobile } from "@/hooks/use-mobile"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"

const DocumentChat = dynamic(
  () => import("@/components/document-chat").then((m) => m.DocumentChat),
  {
    loading: () => (
      <div className="flex h-full w-full items-center justify-center p-6 text-xs text-muted-foreground">
        Carregando Assistente...
      </div>
    ),
    ssr: false,
  }
)

const CustomCode = Code.extend({
  addInputRules() {
    return [
      markInputRule({
        find: /(?:^|[^`])(`([^`]+)`)$/,
        type: this.type,
      }),
    ]
  },
})

const TaskItemComponent = ({ node, updateAttributes }: NodeViewProps) => {
  const isChecked = Boolean(node.attrs.checked)

  return (
    <NodeViewWrapper as="li" data-checked={isChecked} className="flex items-center gap-2 my-1">
      <label contentEditable={false} className="select-none flex items-center">
        <Checkbox
          checked={isChecked}
          onCheckedChange={(checked) => {
            updateAttributes({ checked: Boolean(checked) })
          }}
        />
      </label>
      <div className={`flex-1 ${isChecked ? "line-through text-muted-foreground" : ""}`}>
        <NodeViewContent className="outline-none" />
      </div>
    </NodeViewWrapper>
  )
}

const CustomTaskItem = TaskItem.extend({
  addNodeView() {
    return ReactNodeViewRenderer(TaskItemComponent)
  },
})

const lowlight = createLowlight()
lowlight.register("javascript", js)
lowlight.register("typescript", ts)
lowlight.register("python", py)
lowlight.register("bash", bash)
lowlight.register("json", json)
lowlight.register("css", css)
lowlight.register("html", xml)
lowlight.register("sql", sql)

const CustomParagraph = Paragraph.extend({
  addStorage() {
    return {
      ...this.parent?.(),
      markdown: {
        serialize(state: { write: (str: string) => void; closeBlock: (node: unknown) => void; renderInline: (node: unknown) => void }, node: { textContent: string }) {
          if (!node.textContent || !node.textContent.replace(/\u00a0/g, " ").trim()) {
            state.write("&nbsp;")
            state.closeBlock(node)
          } else {
            state.renderInline(node)
            state.closeBlock(node)
          }
        },
        parse: {
          // handled by markdown-it
        },
      },
    }
  },
})

interface NoteEditorProps {
  noId: string
  initialContent: string
  caminhoBreadcrumb: { id: string; nome: string }[]
  exigirPinExportar: boolean
  exigirPinUploadImagem: boolean
}

export function NoteEditor({
  noId,
  initialContent,
  caminhoBreadcrumb,
  exigirPinExportar,
  exigirPinUploadImagem,
}: NoteEditorProps) {
  const { toggleSidebar } = useSidebar()
  const isMobile = useIsMobile()
  const [isDirty, setIsDirty] = React.useState(false)
  const [lastSavedTime, setLastSavedTime] = React.useState<string | null>(null)
  const [showPinModal, setShowPinModal] = React.useState(false)
  const [pendingSaveContent, setPendingSaveContent] = React.useState("")
  const [prevNoId, setPrevNoId] = React.useState(noId)
  const normalizedInitial = React.useMemo(() => normalizeMarkdownTables(initialContent), [initialContent])
  const [savedContent, setSavedContent] = React.useState(normalizedInitial)
  const [showExportPinModal, setShowExportPinModal] = React.useState(false)
  const [showImagePinModal, setShowImagePinModal] = React.useState(false)
  const [pendingImage, setPendingImage] = React.useState<File | null>(null)
  const [isChatOpen, setIsChatOpen] = React.useState(false)
  const [showAiPinModal, setShowAiPinModal] = React.useState(false)
  const [chatProvider, setChatProvider] = React.useState<"google" | "openai" | "anthropic">("google")
  const [chatModel, setChatModel] = React.useState<string>("gemini-3.5-flash")
  const [showUnsavedDialog, setShowUnsavedDialog] = React.useState(false)
  const [pendingNavigationCallback, setPendingNavigationCallback] = React.useState<(() => void) | null>(null)
  const dirtyTimerRef = React.useRef<NodeJS.Timeout | null>(null)

  React.useEffect(() => {
    return () => {
      if (dirtyTimerRef.current) clearTimeout(dirtyTimerRef.current)
    }
  }, [])

  React.useEffect(() => {
    window.__checkUnsavedChangesBeforeNav = (cb: () => void) => {
      if (isDirty) {
        setPendingNavigationCallback(() => cb)
        setShowUnsavedDialog(true)
      } else {
        cb()
      }
    }
    return () => {
      window.__checkUnsavedChangesBeforeNav = undefined
    }
  }, [isDirty])

  if (noId !== prevNoId) {
    setPrevNoId(noId)
    setSavedContent(normalizeMarkdownTables(initialContent))
    setIsDirty(false)
    setLastSavedTime(null)
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        paragraph: false,
        code: false,
      }),
      CustomCode,
      CustomParagraph,
      Markdown.configure({
        html: true,
        transformPastedText: true,
        tightLists: false,
        bulletListMarker: "-",
        transformCopiedText: false,
        breaks: true,
      }),
      Placeholder.configure({
        placeholder: "Comece a escrever...",
      }),
      CustomCodeBlock.configure({
        lowlight,
      }),
      CustomTableBlock,
      ResizableImage,
      AiProposalBlock,
      TaskList,
      CustomTaskItem.configure({
        nested: true,
      }),
    ],
    content: savedContent,
    editorProps: {
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items
        if (!items) return false

        for (const item of Array.from(items)) {
          if (item.type.indexOf("image") === 0) {
            event.preventDefault()
            const file = item.getAsFile()
            if (!file) return true

            if (exigirPinUploadImagem) {
              setPendingImage(file)
              setShowImagePinModal(true)
            } else {
              enviarImagem(file)
            }

            return true
          }
        }
        return false
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files
        if (!files || files.length === 0) return false

        for (const file of Array.from(files)) {
          if (file.type.indexOf("image") === 0) {
            event.preventDefault()
            if (exigirPinUploadImagem) {
              setPendingImage(file)
              setShowImagePinModal(true)
            } else {
              enviarImagem(file)
            }

            return true
          }
        }
        return false
      },
    },
    onUpdate: ({ editor }) => {
      if (dirtyTimerRef.current) clearTimeout(dirtyTimerRef.current)
      dirtyTimerRef.current = setTimeout(() => {
        const mdStorage = editor.storage as { markdown?: { getMarkdown: () => string } }
        const markdown = mdStorage.markdown?.getMarkdown() ?? ""
        setIsDirty(markdown !== savedContent)
      }, 250)
    },
  })

  const getDocumentContent = React.useCallback(() => {
    if (!editor) return initialContent
    const mdStorage = editor.storage as { markdown?: { getMarkdown: () => string } }
    return mdStorage.markdown?.getMarkdown() || initialContent
  }, [editor, initialContent])

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      headers: {
        "x-provider": chatProvider,
        "x-model": chatModel,
      },
      body: {
        documentContent: getDocumentContent(),
      },
    }),
  })

  function enviarImagem(file: File) {
    uploadFiles("noteImageUploader", { files: [file] })
      .then((res) => {
        if (res && res[0]) {
          editor?.chain().focus().setImage({ src: res[0].ufsUrl || res[0].url, alt: file.name }).run()
        }
      })
      .catch((err) => {
        console.error("Erro ao enviar imagem:", err)
      })
  }

  const handleTriggerSave = React.useCallback(() => {
    if (!editor) return
    const mdStorage = editor.storage as { markdown?: { getMarkdown: () => string } }
    const currentMarkdown = mdStorage.markdown?.getMarkdown() || ""
    setPendingSaveContent(currentMarkdown)
    setShowPinModal(true)
  }, [editor])

  const handleExportMarkdown = React.useCallback(() => {
    if (!editor) return

    const mdStorage = editor.storage as { markdown?: { getMarkdown: () => string } }
    const markdown = mdStorage.markdown?.getMarkdown() || ""
    const noteName = caminhoBreadcrumb.at(-1)?.nome || "nota"
    const fileName = `${noteName
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
      .trim() || "nota"}.md`
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")

    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }, [caminhoBreadcrumb, editor])

  async function confirmarExportacao(pin: string) {
    const result = await liberarAcesso(pin, ["export"])
    if (!result.success) throw new Error(result.error || "Não foi possível autorizar a exportação.")
    handleExportMarkdown()
  }

  async function confirmarUploadImagem(pin: string) {
    const result = await liberarAcesso(pin, ["upload"])
    if (!result.success) throw new Error(result.error || "Não foi possível autorizar o upload.")
    if (pendingImage) enviarImagem(pendingImage)
    setPendingImage(null)
  }

  async function confirmarAcessoAi(pin: string) {
    const result = await liberarAcesso(pin, ["ai-chat"])
    if (!result.success) throw new Error(result.error || "Não foi possível autorizar o acesso ao chat com IA.")
    setIsChatOpen(true)
  }

  const handleToggleChat = React.useCallback(async () => {
    if (isChatOpen) {
      setIsChatOpen(false)
      return
    }
    try {
      const access = await verificarAcessoChatAi()
      if (access.exigirPin && !access.autorizado) {
        setShowAiPinModal(true)
      } else {
        setIsChatOpen(true)
      }
    } catch {
      setIsChatOpen(true)
    }
  }, [isChatOpen])

  // Whenever active note changes (switching notes), update editor content and focus start
  React.useEffect(() => {
    if (editor && savedContent) {
      const mdStorage = editor.storage as { markdown?: { getMarkdown: () => string } }
      const currentMd = mdStorage.markdown?.getMarkdown() ?? ""
      if (currentMd !== savedContent) {
        editor.commands.setContent(savedContent)
      }
      editor.commands.focus("start")
    }
  }, [noId, editor, savedContent])

  // Global shortcuts for Save (Ctrl+S), Sidebar (Ctrl+Shift+B), Bold (Ctrl+B), and AI Chat (Ctrl+/)
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey
      if (!isMod) return

      const key = e.key.toLowerCase()

      if (key === "s") {
        e.preventDefault()
        e.stopPropagation()
        handleTriggerSave()
        return
      }

      if (key === "b") {
        e.preventDefault()
        e.stopPropagation()
        if (e.shiftKey) {
          toggleSidebar()
        } else if (editor) {
          editor.chain().focus().toggleBold().run()
        }
        return
      }

      if (key === "/") {
        e.preventDefault()
        e.stopPropagation()
        void handleToggleChat()
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown, { capture: true })
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true })
  }, [toggleSidebar, editor, handleTriggerSave, handleToggleChat])

  // Warn before leaving page with unsaved changes
  React.useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ""
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isDirty])

  async function executeSave(pin: string) {
    const res = await salvarConteudo(pin, noId, pendingSaveContent)
    if (!res.success) {
      throw new Error(res.error || "Erro ao salvar.")
    }

    setIsDirty(false)
    setSavedContent(pendingSaveContent)
    const now = new Date()
    setLastSavedTime(
      now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    )
    setShowPinModal(false)

    if (pendingNavigationCallback) {
      const cb = pendingNavigationCallback
      setPendingNavigationCallback(null)
      cb()
    }
  }

  const handleProposeEdit = React.useCallback(
    (
      proposedContent: string,
      summary?: string,
      originalSnippet?: string,
      position?: string
    ) => {
      if (!editor) return

      setTimeout(() => {
        let originalContent = originalSnippet?.trim() || ""
        const docSize = editor.state.doc.content.size

        if (position === "end") {
          editor
            .chain()
            .focus()
            .insertContentAt(docSize, {
              type: "aiProposalBlock",
              attrs: {
                originalContent,
                proposedContent,
                summary: summary || "Adicionado no final do documento",
              },
            })
            .run()
          return
        }

        if (position === "start") {
          editor
            .chain()
            .focus()
            .insertContentAt(0, {
              type: "aiProposalBlock",
              attrs: {
                originalContent,
                proposedContent,
                summary: summary || "Adicionado no início do documento",
              },
            })
            .run()
          return
        }

        // Se originalContent for fornecido, busca no documento a seção correspondente (cabeçalho + conteúdo filho) para substituir no local exato (in-place)
        if (originalContent) {
          let targetRange: { from: number; to: number; origText: string } | null = null
          const clean = originalContent.trim().toLowerCase()
          const doc = editor.state.doc

          let startPos: number | null = null
          let endPos: number | null = null
          let isHeadingSection = false
          let found = false

          doc.forEach((node: ProseMirrorNode, offset: number) => {
            if (found && isHeadingSection) {
              if (node.type.name === "heading") {
                isHeadingSection = false
                return
              }
              endPos = offset + node.nodeSize
              return
            }

            if (!found && node.isBlock && node.textContent) {
              const text = node.textContent.trim().toLowerCase()
              if (text && (text.includes(clean) || clean.includes(text))) {
                found = true
                startPos = offset
                endPos = offset + node.nodeSize
                if (node.type.name === "heading") {
                  isHeadingSection = true
                }
              }
            }
          })

          if (startPos !== null && endPos !== null) {
            targetRange = {
              from: startPos,
              to: endPos,
              origText: doc.textBetween(startPos, endPos, "\n"),
            }
          }

          if (targetRange) {
            const range = targetRange
            const actualOriginal = range.origText || originalContent
            editor
              .chain()
              .focus()
              .deleteRange({ from: range.from, to: range.to })
              .insertContentAt(range.from, {
                type: "aiProposalBlock",
                attrs: {
                  originalContent: actualOriginal,
                  proposedContent,
                  summary: summary || "Proposta da IA",
                },
              })
              .run()
            return
          }
        }

        const { from, to } = editor.state.selection
        const hasSelection = from !== to

        if (hasSelection && !originalContent) {
          originalContent = editor.state.doc.textBetween(from, to, "\n")
          editor
            .chain()
            .focus()
            .deleteRange({ from, to })
            .insertContentAt(from, {
              type: "aiProposalBlock",
              attrs: {
                originalContent,
                proposedContent,
                summary: summary || "Proposta da IA",
              },
            })
            .run()
        } else {
          editor
            .chain()
            .focus()
            .insertContent({
              type: "aiProposalBlock",
              attrs: {
                originalContent,
                proposedContent,
                summary: summary || "Proposta da IA",
              },
            })
            .run()
        }
      }, 0)
    },
    [editor]
  )

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden">
      {/* Top fine bar: breadcrumb + save status */}
      <header className="h-11 border-b border-border/60 flex items-center justify-between px-4 shrink-0 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-2 overflow-hidden text-xs text-muted-foreground font-sans">
          <SidebarTrigger className="h-7 w-7 text-muted-foreground hover:text-foreground mr-1 ios-press" />
          <div className="hidden sm:flex items-center gap-2 overflow-hidden">
            {caminhoBreadcrumb.map((item, index) => (
              <React.Fragment key={item.id}>
                {index > 0 && <span className="text-border/60">/</span>}
                <span
                  className={`truncate transition-colors ${
                    index === caminhoBreadcrumb.length - 1
                      ? "text-foreground font-medium"
                      : "hover:text-foreground"
                  }`}
                >
                  {item.nome}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick Open - desktop only */}
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            onClick={() => window.dispatchEvent(new CustomEvent("open-quick-open"))}
            aria-label="Busca rápida (Quick Open)"
            title="Busca Rápida (Ctrl+P)"
            className="h-7 w-7 ios-press hidden sm:inline-flex"
          >
            <Search className="size-3.5" />
          </Button>

          {/* Command Bar - desktop only */}
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            onClick={() => window.dispatchEvent(new CustomEvent("open-command-bar"))}
            aria-label="Command Bar (CLI)"
            title="Command Bar (Ctrl+Shift+P)"
            className="h-7 w-7 ios-press hidden sm:inline-flex"
          >
            <Terminal className="size-3.5" />
          </Button>

          {/* Table Insert */}
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            onClick={() => {
              editor?.chain().focus().insertTable(3, 3).run()
            }}
            aria-label="Inserir Tabela"
            title="Inserir Tabela (3x3)"
            className="h-7 w-7 ios-press"
          >
            <TableIcon className="size-3.5" />
          </Button>

          {/* Animated Save Status Badge - visible on mobile and desktop */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-border/50 bg-muted/30 text-[10px] sm:text-[11px] font-sans text-muted-foreground transition-all duration-300 max-w-[120px] sm:max-w-none">
            <span
              className={`size-1.5 rounded-full transition-colors duration-300 shrink-0 ${
                isDirty
                  ? "bg-amber-500 animate-pulse"
                  : "bg-emerald-500"
              }`}
            />
            <span className="truncate">
              {isDirty
                ? "Não salvo"
                : lastSavedTime
                ? `Salvo ${lastSavedTime}`
                : "Salvo"}
            </span>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleTriggerSave}
            disabled={!isDirty}
            className="h-7 text-xs font-sans px-2 sm:px-2.5 disabled:opacity-50 ios-press shrink-0"
          >
            Salvar
          </Button>

          <Button
            size="sm"
            variant={isChatOpen ? "secondary" : "outline"}
            onClick={handleToggleChat}
            className="h-7 text-xs font-sans px-2.5 gap-1.5 ios-press transition-all duration-200"
            title="Alternar Chat com IA"
          >
            <Sparkles className={`size-3.5 text-primary ${isChatOpen ? "animate-pulse" : ""}`} />
            <span>IA</span>
          </Button>

          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            onClick={() => exigirPinExportar ? setShowExportPinModal(true) : handleExportMarkdown()}
            aria-label="Exportar nota em Markdown"
            title="Exportar em Markdown"
            className="h-7 w-7 ios-press"
          >
            <Download />
          </Button>
        </div>
      </header>

      {/* Content area: editor + side chat / mobile sheet */}
      <div className="flex-1 flex flex-row min-h-0 overflow-hidden relative">
        <DocumentIndex editor={editor} isChatOpen={isChatOpen} />
        {isChatOpen && !isMobile ? (
          <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
            <ResizablePanel defaultSize={60} minSize={30}>
              <div className="h-full w-full overflow-y-auto overflow-x-hidden relative">
                <main className="px-3 sm:px-6 py-8 pb-48 flex justify-center min-h-full w-full box-border">
                  <div className="relative w-full max-w-180 font-sans text-foreground box-border min-w-0">
                    <EditorContent editor={editor} />
                  </div>
                </main>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={40} minSize={20}>
              <div className="h-full w-full bg-background flex flex-col">
                <DocumentChat
                  isOpen={isChatOpen}
                  onClose={() => setIsChatOpen(false)}
                  getDocumentContent={getDocumentContent}
                  onProposeEdit={handleProposeEdit}
                  provider={chatProvider}
                  setProvider={setChatProvider}
                  model={chatModel}
                  setModel={setChatModel}
                  messages={messages}
                  sendMessage={sendMessage}
                  status={status}
                  error={error}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="h-full w-full overflow-y-auto overflow-x-hidden relative">
            <main className="px-3 sm:px-6 py-8 pb-48 flex justify-center min-h-full w-full box-border">
              <div className="relative w-full max-w-180 font-sans text-foreground box-border min-w-0">
                <EditorContent editor={editor} />
              </div>
            </main>
          </div>
        )}

        {isChatOpen && isMobile && (
          <Sheet open={isChatOpen} onOpenChange={setIsChatOpen}>
            <SheetContent side="bottom" className="h-[80vh] max-h-[80vh] p-0 flex flex-col bg-background" showCloseButton={false}>
              <DocumentChat
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                getDocumentContent={getDocumentContent}
                onProposeEdit={handleProposeEdit}
                provider={chatProvider}
                setProvider={setChatProvider}
                model={chatModel}
                setModel={setChatModel}
                messages={messages}
                sendMessage={sendMessage}
                status={status}
                error={error}
              />
            </SheetContent>
          </Sheet>
        )}
      </div>

      {/* PIN Dialog for saving */}
      <PinDialog
        open={showPinModal}
        onOpenChange={(open) => {
          setShowPinModal(open)
          if (!open) {
            requestAnimationFrame(() => {
              editor?.chain().focus().run()
            })
          }
        }}
        onSuccess={executeSave}
        title="PIN para Salvar"
        description="Digite o PIN de 6 dígitos para autorizar a gravação desta nota."
      />
      <PinDialog
        open={showExportPinModal}
        onOpenChange={setShowExportPinModal}
        onSuccess={confirmarExportacao}
        title="PIN para exportar"
        description="Digite o PIN para baixar esta nota em Markdown."
      />
      <PinDialog
        open={showImagePinModal}
        onOpenChange={(open) => {
          setShowImagePinModal(open)
          if (!open) setPendingImage(null)
        }}
        onSuccess={confirmarUploadImagem}
        title="PIN para enviar imagem"
        description="Digite o PIN antes de enviar esta imagem para a nota."
      />
      <PinDialog
        open={showAiPinModal}
        onOpenChange={setShowAiPinModal}
        onSuccess={confirmarAcessoAi}
        title="PIN para acessar Assistente IA"
        description="Digite o PIN de 6 dígitos para autorizar o acesso ao chat com inteligência artificial."
      />

      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent className="sm:max-w-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-medium">Alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Você possui alterações não salvas nesta nota. O que deseja fazer antes de sair?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowUnsavedDialog(false)
                setPendingNavigationCallback(null)
              }}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsDirty(false)
                setShowUnsavedDialog(false)
                if (pendingNavigationCallback) {
                  const cb = pendingNavigationCallback
                  setPendingNavigationCallback(null)
                  cb()
                }
              }}
              className="h-8 text-xs text-destructive hover:text-destructive"
            >
              Descartar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setShowUnsavedDialog(false)
                handleTriggerSave()
              }}
              className="h-8 text-xs"
            >
              Salvar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
