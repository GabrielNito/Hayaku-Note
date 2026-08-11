"use client"

import * as React from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import Paragraph from "@tiptap/extension-paragraph"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { Markdown } from "tiptap-markdown"
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight"
import { ResizableImage } from "@/components/resizable-image"
import { common, createLowlight } from "lowlight"
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
import { useRouter } from "next/navigation"
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { uploadFiles } from "@/lib/uploadthing"
import { Download } from "lucide-react"
import { liberarAcesso } from "@/actions/acesso"

const lowlight = createLowlight(common)
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
  const router = useRouter()
  const { toggleSidebar } = useSidebar()
  const [isDirty, setIsDirty] = React.useState(false)
  const [lastSavedTime, setLastSavedTime] = React.useState<string | null>(null)
  const [showPinModal, setShowPinModal] = React.useState(false)
  const [pendingSaveContent, setPendingSaveContent] = React.useState("")
  const [prevNoId, setPrevNoId] = React.useState(noId)
  const [prevInitialContent, setPrevInitialContent] = React.useState(initialContent)
  const [savedContent, setSavedContent] = React.useState(initialContent)
  const [showExportPinModal, setShowExportPinModal] = React.useState(false)
  const [showImagePinModal, setShowImagePinModal] = React.useState(false)
  const [pendingImage, setPendingImage] = React.useState<File | null>(null)

  if (noId !== prevNoId || initialContent !== prevInitialContent) {
    setPrevNoId(noId)
    setPrevInitialContent(initialContent)
    setSavedContent(initialContent)
    setIsDirty(false)
    setLastSavedTime(null)
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        paragraph: false,
      }),
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
      CodeBlockLowlight.configure({
        lowlight,
      }),
      ResizableImage,
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
      // @ts-expect-error getMarkdown
      const markdown = editor.storage.markdown.getMarkdown() as string
      setIsDirty(markdown !== savedContent)
    },
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
    // @ts-expect-error getMarkdown
    const currentMarkdown = editor.storage.markdown.getMarkdown() as string
    setPendingSaveContent(currentMarkdown)
    setShowPinModal(true)
  }, [editor])

  const handleExportMarkdown = React.useCallback(() => {
    if (!editor) return

    // @ts-expect-error getMarkdown
    const markdown = editor.storage.markdown.getMarkdown() as string
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

  // Whenever savedContent changes (switching notes), update editor content
  React.useEffect(() => {
    if (editor && savedContent) {
      // @ts-expect-error markdown storage
      const currentMd = editor.storage.markdown.getMarkdown() as string
      if (currentMd !== savedContent) {
        editor.commands.setContent(savedContent)
      }
      editor.commands.focus("start")
    }
  }, [noId, savedContent, editor])

  React.useEffect(() => {
    if (editor) {
      editor.commands.focus("start")
    }
  }, [editor])

  // Global shortcuts for Save (Ctrl+S), Sidebar (Ctrl+Shift+B), and Bold (Ctrl+B)
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
    }

    window.addEventListener("keydown", handleKeyDown, { capture: true })
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true })
  }, [toggleSidebar, editor, handleTriggerSave])

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
    router.refresh()
  }

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden">
      {/* Top fine bar: breadcrumb + save status */}
      <header className="h-11 border-b border-border/60 flex items-center justify-between px-4 shrink-0 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 overflow-hidden text-xs text-muted-foreground font-sans">
          <SidebarTrigger className="h-7 w-7 text-muted-foreground hover:text-foreground mr-1" />
          {caminhoBreadcrumb.map((item, index) => (
            <React.Fragment key={item.id}>
              {index > 0 && <span className="text-border">/</span>}
              <span
                className={`truncate ${
                  index === caminhoBreadcrumb.length - 1
                    ? "text-foreground font-medium"
                    : ""
                }`}
              >
                {item.nome}
              </span>
            </React.Fragment>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground transition-opacity duration-300">
            {isDirty
              ? "Alterações não salvas"
              : lastSavedTime
              ? `Salvo às ${lastSavedTime}`
              : "Salvo"}
          </span>

          <Button
            size="sm"
            variant="outline"
            onClick={handleTriggerSave}
            disabled={!isDirty}
            className="h-7 text-xs font-sans px-2.5 disabled:opacity-50"
          >
            Salvar
          </Button>

          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            onClick={() => exigirPinExportar ? setShowExportPinModal(true) : handleExportMarkdown()}
            aria-label="Exportar nota em Markdown"
            title="Exportar em Markdown"
          >
            <Download />
          </Button>
        </div>
      </header>

      {/* Editor area centered (~720px max width) */}
      <main className="flex-1 overflow-y-auto px-4 py-8 flex justify-center">
        <div className="w-full max-w-180 font-sans text-foreground">
          <EditorContent editor={editor} />
        </div>
      </main>

      {/* PIN Dialog for saving */}
      <PinDialog
        open={showPinModal}
        onOpenChange={setShowPinModal}
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
    </div>
  )
}
