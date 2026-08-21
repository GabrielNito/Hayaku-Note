"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import dynamic from "next/dynamic"
import { useRouter, usePathname } from "next/navigation"
import {
  ChevronRight,
  MoreVertical,
  Search,
  Trash2,
  Edit2,
  FolderPlus,
  FilePlus,
  FileUp,
  Folder,
  FolderOpen,
} from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { navigateWith } from "@/lib/navigation"
import { criarNo, renomearNo, deletarNo } from "@/actions/no"
import { NoItem, TipoNo } from "@/actions/types"
import { PinDialog } from "@/components/pin-dialog"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const SettingsDialog = dynamic(
  () => import("@/components/settings-dialog").then((m) => m.SettingsDialog),
  { ssr: false }
)

interface SidebarTreeProps {
  arvore: NoItem[]
  activeId?: string
}

function hasActiveChild(node: NoItem, activeId?: string): boolean {
  if (!activeId) return false
  if (node.id === activeId) return true
  if (node.filhos) {
    return node.filhos.some((filho) => hasActiveChild(filho, activeId))
  }
  return false
}

function NoTreeNode({ item, activeId }: { item: NoItem; activeId?: string }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = React.useState(() => hasActiveChild(item, activeId))
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)

  const isActive = activeId === item.id
  const isPasta = item.tipo === TipoNo.PASTA

  // Dialog states
  const [dialogAction, setDialogAction] = React.useState<
    "criarPasta" | "criarArquivo" | "renomear" | "deletar" | null
  >(null)
  const [inputValue, setInputValue] = React.useState("")
  const [showPinModal, setShowPinModal] = React.useState(false)
  const [pendingActionData, setPendingActionData] = React.useState<{
    action: "criarPasta" | "criarArquivo" | "renomear" | "deletar" | "importar" | null
    payload: string
    filesData?: { nome: string; conteudo: string }[]
  } | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Long press for mobile touch devices
  const longPressTimerRef = React.useRef<NodeJS.Timeout | null>(null)
  const isLongPressRef = React.useRef(false)
  const touchStartPosRef = React.useRef<{ x: number; y: number } | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    isLongPressRef.current = false
    const touch = e.touches[0]
    if (touch) {
      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY }
    }
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(50)
        } catch {}
      }
      setIsMenuOpen(true)
    }, 450)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current || !longPressTimerRef.current) return
    const touch = e.touches[0]
    if (touch) {
      const dx = Math.abs(touch.clientX - touchStartPosRef.current.x)
      const dy = Math.abs(touch.clientY - touchStartPosRef.current.y)
      if (dx > 8 || dy > 8) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
    }
  }

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handleNodeClick = () => {
    if (isLongPressRef.current) {
      isLongPressRef.current = false
      return
    }
    if (isPasta) {
      setIsOpen(!isOpen)
    } else {
      navigateWith(router, `/n/${item.id}`)
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsMenuOpen(true)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    Promise.all(
      files.map((file) => {
        return new Promise<{ nome: string; conteudo: string }>((resolve) => {
          const reader = new FileReader()
          reader.onload = (event) => {
            const conteudo = (event.target?.result as string) || ""
            const nome = file.name.replace(/\.(md|markdown)$/i, "")
            resolve({ nome, conteudo })
          }
          reader.readAsText(file)
        })
      })
    ).then((filesData) => {
      setPendingActionData({
        action: "importar",
        payload: "",
        filesData,
      })
      setShowPinModal(true)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    })
  }

  function handleOpenCreateModal(tipo: string) {
    setInputValue("")
    setDialogAction(tipo === TipoNo.PASTA ? "criarPasta" : "criarArquivo")
  }

  function handleOpenRenameModal() {
    setInputValue(item.nome)
    setDialogAction("renomear")
  }

  function handleOpenDeleteModal() {
    setDialogAction("deletar")
  }

  function handleDialogSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (dialogAction === "renomear" && (!inputValue.trim() || inputValue === item.nome)) {
      setDialogAction(null)
      return
    }
    if ((dialogAction === "criarPasta" || dialogAction === "criarArquivo") && !inputValue.trim()) {
      return
    }

    // Prepare pending action data and open PIN modal
    setPendingActionData({
      action: dialogAction,
      payload: inputValue.trim(),
    })
    setDialogAction(null)
    setShowPinModal(true)
  }

  async function executePinAction(pin: string) {
    if (!pendingActionData) return

    let res: { success: boolean; error?: string; id?: string } | undefined
    let firstId: string | undefined

    if (pendingActionData.action === "criarPasta") {
      res = await criarNo(pin, {
        nome: pendingActionData.payload,
        tipo: TipoNo.PASTA,
        paiId: item.id,
      })
    } else if (pendingActionData.action === "criarArquivo") {
      res = await criarNo(pin, {
        nome: pendingActionData.payload,
        tipo: TipoNo.ARQUIVO,
        paiId: item.id,
        conteudo: "",
      })
    } else if (pendingActionData.action === "renomear") {
      res = await renomearNo(pin, item.id, pendingActionData.payload)
    } else if (pendingActionData.action === "deletar") {
      res = await deletarNo(pin, item.id)
    } else if (pendingActionData.action === "importar" && pendingActionData.filesData) {
      for (const fileData of pendingActionData.filesData) {
        const importRes = await criarNo(pin, {
          nome: fileData.nome,
          tipo: TipoNo.ARQUIVO,
          paiId: item.id,
          conteudo: fileData.conteudo,
        })
        if (!importRes.success) {
          throw new Error(importRes.error || "Erro ao importar arquivo.")
        }
        if (!firstId && importRes.id) {
          firstId = importRes.id
        }
      }
      res = { success: true, id: firstId }
    }

    if (res && !res.success) {
      throw new Error(res.error || "Erro na operação.")
    }

    setShowPinModal(false)
    setPendingActionData(null)
    router.refresh()

    if (pendingActionData.action === "deletar" && isActive) {
      navigateWith(router, "/")
    } else if (res && "id" in res && res.id && pendingActionData.action === "criarArquivo") {
      navigateWith(router, `/n/${res.id}`)
    }
  }

  return (
    <div className="flex flex-col select-none">
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={handleContextMenu}
        className={`group relative flex items-center justify-between py-1.5 px-2 rounded-lg text-sm transition-all duration-150 ease-out ios-press ${
          isActive || isMenuOpen ? "bg-accent text-accent-foreground font-medium shadow-xs" : "text-foreground/80 hover:bg-accent/40 active:bg-accent/60"
        }`}
      >
        <div
          className="flex items-center gap-1.5 flex-1 cursor-pointer overflow-hidden py-0.5"
          onClick={handleNodeClick}
        >
          {isPasta ? (
            <ChevronRight
              className={`size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                isOpen ? "rotate-90" : ""
              }`}
            />
          ) : (
            <span className="w-3.5 shrink-0" />
          )}

          {isPasta ? (
            isOpen ? (
              <FolderOpen className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200" />
            ) : (
              <Folder className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200" />
            )
          ) : (
            <span className="w-3.5 shrink-0" />
          )}

          <span className="truncate font-sans tracking-tight text-xs">
            {item.nome}
          </span>
        </div>

        {/* Actions dropdown */}
        <div
          className={`flex items-center transition-all duration-150 ease-out ${
            isMenuOpen
              ? "opacity-100 translate-x-0 pointer-events-auto"
              : "opacity-0 group-hover:opacity-100 max-sm:opacity-60 translate-x-1 group-hover:translate-x-0 max-sm:translate-x-0"
          }`}
        >
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground cursor-pointer outline-none ios-press">
              <MoreVertical className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 font-sans text-xs">
              {isPasta && (
                <>
                  <DropdownMenuItem onClick={() => handleOpenCreateModal(TipoNo.ARQUIVO)}>
                    <FilePlus className="size-3.5 mr-2" /> Novo Arquivo
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleOpenCreateModal(TipoNo.PASTA)}>
                    <FolderPlus className="size-3.5 mr-2" /> Nova Pasta
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                    <FileUp className="size-3.5 mr-2" /> Importar .md
                  </DropdownMenuItem>
                  <input
                    type="file"
                    accept=".md,.markdown"
                    multiple
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </>
              )}
              <DropdownMenuItem onClick={handleOpenRenameModal}>
                <Edit2 className="size-3.5 mr-2" /> Renomear
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleOpenDeleteModal}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-3.5 mr-2" /> Deletar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Children tree with smooth CSS GPU-accelerated transition */}
      {isPasta && item.filhos && item.filhos.length > 0 && (
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"
          }`}
        >
          <div className="overflow-hidden">
            <div className="pl-3 ml-2 border-l border-border/40 flex flex-col gap-0.5 mt-0.5">
              {item.filhos.map((filho) => (
                <NoTreeNode key={filho.id} item={filho} activeId={activeId} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action Dialogs */}
      <Dialog
        open={dialogAction !== null}
        onOpenChange={(open) => !open && setDialogAction(null)}
      >
        <DialogContent className="sm:max-w-95">
          <form onSubmit={handleDialogSubmit}>
            <DialogHeader>
              <DialogTitle className="text-sm font-medium">
                {dialogAction === "criarPasta" && "Criar nova pasta"}
                {dialogAction === "criarArquivo" && "Criar novo arquivo"}
                {dialogAction === "renomear" && `Renomear "${item.nome}"`}
                {dialogAction === "deletar" && `Deletar "${item.nome}"?`}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {dialogAction === "deletar"
                  ? "Esta ação é irreversível. Se for pasta, todos os arquivos e subpastas serão removidos."
                  : "Digite o nome abaixo."}
              </DialogDescription>
            </DialogHeader>

            {dialogAction !== "deletar" && (
              <div className="py-3">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Nome..."
                  autoFocus
                  className="h-8 text-xs font-sans"
                />
              </div>
            )}

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogAction(null)}
                className="h-8 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                variant={dialogAction === "deletar" ? "destructive" : "default"}
                className="h-8 text-xs"
              >
                {dialogAction === "deletar" ? "Continuar para PIN" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* PIN Verification Modal */}
      <PinDialog
        open={showPinModal}
        onOpenChange={setShowPinModal}
        onSuccess={executePinAction}
        title="PIN de Autorização"
        description={`Necessário PIN de 6 dígitos para ${
          pendingActionData?.action === "deletar"
            ? "deletar"
            : pendingActionData?.action === "renomear"
            ? "renomear"
            : "criar"
        } este item.`}
      />
    </div>
  )
}

export function AppSidebar({ arvore, activeId }: SidebarTreeProps) {
  const router = useRouter()
  const pathname = usePathname()
  const currentActiveId = activeId || pathname?.split("/").pop()
  const { resolvedMode, toggleMode } = useTheme()
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const [searchQuery, setSearchQuery] = React.useState("")

  // Root action states
  const [rootAction, setRootAction] = React.useState<"criarPasta" | "criarArquivo" | null>(null)
  const [rootInputValue, setRootInputValue] = React.useState("")
  const [showRootPinModal, setShowRootPinModal] = React.useState(false)
  const [rootPendingData, setRootPendingData] = React.useState<{
    action: "criarPasta" | "criarArquivo" | "importar" | null
    payload: string
    filesData?: { nome: string; conteudo: string }[]
  } | null>(null)
  const rootFileInputRef = React.useRef<HTMLInputElement>(null)

  function handleRootFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    Promise.all(
      files.map((file) => {
        return new Promise<{ nome: string; conteudo: string }>((resolve) => {
          const reader = new FileReader()
          reader.onload = (event) => {
            const conteudo = (event.target?.result as string) || ""
            const nome = file.name.replace(/\.(md|markdown)$/i, "")
            resolve({ nome, conteudo })
          }
          reader.readAsText(file)
        })
      })
    ).then((filesData) => {
      setRootPendingData({
        action: "importar",
        payload: "",
        filesData,
      })
      setShowRootPinModal(true)
      if (rootFileInputRef.current) {
        rootFileInputRef.current.value = ""
      }
    })
  }

  function handleRootSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rootInputValue.trim()) return

    setRootPendingData({
      action: rootAction,
      payload: rootInputValue.trim(),
    })
    setRootAction(null)
    setShowRootPinModal(true)
  }

  async function executeRootPinAction(pin: string) {
    if (!rootPendingData) return

    let res: { success: boolean; error?: string; id?: string } | undefined
    let firstId: string | undefined

    if (rootPendingData.action === "importar" && rootPendingData.filesData) {
      for (const fileData of rootPendingData.filesData) {
        const importRes = await criarNo(pin, {
          nome: fileData.nome,
          tipo: TipoNo.ARQUIVO,
          paiId: null,
          conteudo: fileData.conteudo,
        })
        if (!importRes.success) {
          throw new Error(importRes.error || "Erro ao importar arquivo na raiz.")
        }
        if (!firstId && importRes.id) {
          firstId = importRes.id
        }
      }
      res = { success: true, id: firstId }
    } else {
      res = await criarNo(pin, {
        nome: rootPendingData.payload,
        tipo: rootPendingData.action === "criarPasta" ? TipoNo.PASTA : TipoNo.ARQUIVO,
        paiId: null,
        conteudo: "",
      })
    }

    if (!res.success) {
      throw new Error(res.error || "Erro na operação.")
    }

    setShowRootPinModal(false)
    setRootPendingData(null)
    router.refresh()

    if (res.id && rootPendingData.action === "criarArquivo") {
      navigateWith(router, `/n/${res.id}`)
    }
  }

  // Filter tree client-side by search query
  function filterTree(nodes: NoItem[]): NoItem[] {
    if (!searchQuery.trim()) return nodes
    const q = searchQuery.toLowerCase()

    return nodes
      .map((node) => {
        const matchName = node.nome.toLowerCase().includes(q)
        const filteredFilhos = node.filhos ? filterTree(node.filhos) : []
        if (matchName || filteredFilhos.length > 0) {
          return {
            ...node,
            filhos: filteredFilhos.length > 0 ? filteredFilhos : node.filhos,
          }
        }
        return null
      })
      .filter(Boolean) as NoItem[]
  }

  const filteredArvore = filterTree(arvore)

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-border bg-sidebar font-sans">
      <SidebarHeader className="p-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-2">
          <Link href="/" className="font-semibold text-xs tracking-tight text-foreground flex items-center gap-1.5">
            <Image src="/icon.ico" alt="Logo" width={16} height={16} className="size-4 rounded-sm object-contain" />
            Hayaku Note
          </Link>
          <div className="flex items-center gap-1">
            <button
              onClick={() => rootFileInputRef.current?.click()}
              title="Importar .md na Raiz"
              className="p-1 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground ios-press transition-colors cursor-pointer"
            >
              <FileUp className="size-3.5" />
            </button>
            <input
              type="file"
              accept=".md,.markdown"
              multiple
              ref={rootFileInputRef}
              onChange={handleRootFileChange}
              className="hidden"
            />
            <button
              onClick={() => {
                setRootInputValue("")
                setRootAction("criarArquivo")
              }}
              title="Novo Arquivo na Raiz"
              className="p-1 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground ios-press transition-colors cursor-pointer"
            >
              <FilePlus className="size-3.5" />
            </button>
            <button
              onClick={() => {
                setRootInputValue("")
                setRootAction("criarPasta")
              }}
              title="Nova Pasta na Raiz"
              className="p-1 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground ios-press transition-colors cursor-pointer"
            >
              <FolderPlus className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-2 top-2 size-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar notas..."
            className="h-7 pl-7 text-xs bg-background/50 border-border/60 rounded-md focus-visible:ring-1 focus-visible:ring-primary/40 transition-all"
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2 flex flex-col gap-0.5 overflow-y-auto">
        {filteredArvore.length === 0 ? (
          <div className="px-2 py-6 text-center text-xs text-muted-foreground">
            {searchQuery ? "Nenhum resultado." : "Nenhuma nota encontrada."}
          </div>
        ) : (
          filteredArvore.map((item) => (
            <NoTreeNode key={item.id} item={item} activeId={currentActiveId} />
          ))
        )}
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-border/50 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-1">
          <SettingsDialog />
          <button
            onClick={() => toggleMode()}
            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-accent/50 transition-colors shrink-0 ios-press cursor-pointer"
            title="Alternar tema claro/escuro (Atalho: D ou Ctrl+D)"
          >
            {mounted ? (resolvedMode === "light" ? "Escuro" : "Claro") : "Tema"}
          </button>
        </div>
        <div className="px-0.5">
          <span className="text-[10px] text-muted-foreground font-mono">
            Hayaku Note v1.0
          </span>
        </div>
      </SidebarFooter>

      {/* Root Creation Dialog */}
      <Dialog
        open={rootAction !== null}
        onOpenChange={(open) => !open && setRootAction(null)}
      >
        <DialogContent className="sm:max-w-95">
          <form onSubmit={handleRootSubmit}>
            <DialogHeader>
              <DialogTitle className="text-sm font-medium">
                {rootAction === "criarPasta" ? "Criar pasta na raiz" : "Criar arquivo na raiz"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Digite o nome para o novo item na raiz.
              </DialogDescription>
            </DialogHeader>

            <div className="py-3">
              <Input
                value={rootInputValue}
                onChange={(e) => setRootInputValue(e.target.value)}
                placeholder="Nome..."
                autoFocus
                className="h-8 text-xs font-sans"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRootAction(null)}
                className="h-8 text-xs"
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="h-8 text-xs">
                Continuar para PIN
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Root PIN Modal */}
      <PinDialog
        open={showRootPinModal}
        onOpenChange={setShowRootPinModal}
        onSuccess={executeRootPinAction}
        title="PIN de Autorização"
        description="Necessário PIN de 6 dígitos para criar este item."
      />
    </Sidebar>
  )
}
