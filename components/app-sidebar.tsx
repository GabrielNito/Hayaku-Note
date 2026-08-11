"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ChevronRight,
  MoreVertical,
  Search,
  Trash2,
  Edit2,
  FolderPlus,
  FilePlus,
  GripVertical,
} from "lucide-react"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
} from "@dnd-kit/core"
import type { DraggableAttributes } from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useTheme } from "@/components/theme-provider"
import { criarNo, renomearNo, deletarNo, reordenarNos, moverNo } from "@/actions/no"
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

const DragHandleProps = React.createContext<{
  attributes: DraggableAttributes
  listeners: Record<string, unknown> | undefined
  isDragging: boolean
}>({
  attributes: {
    role: "button",
    tabIndex: 0,
    "aria-disabled": false,
    "aria-pressed": undefined,
    "aria-roledescription": "sortable",
    "aria-describedby": "",
  },
  listeners: undefined,
  isDragging: false,
})

function SortableNoNode({
  item,
  activeId,
}: {
  item: NoItem
  activeId?: string
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `folder-${item.id}`,
    disabled: item.tipo !== TipoNo.PASTA,
  })

  const setRefs = (node: HTMLDivElement | null) => {
    setNodeRef(node)
    setDroppableRef(node)
  }

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    position: "relative",
  }

  return (
    <div ref={setRefs} style={style}>
      <DragHandleProps.Provider
        value={{ attributes, listeners, isDragging }}
      >
        <NoTreeNode item={item} activeId={activeId} isOver={isOver} />
      </DragHandleProps.Provider>
    </div>
  )
}

function NoTreeNode({
  item,
  activeId,
  isOver,
}: {
  item: NoItem
  activeId?: string
  isOver?: boolean
}) {
  const router = useRouter()
  const { attributes, listeners } = React.useContext(DragHandleProps)
  const [isOpen, setIsOpen] = React.useState(true)

  const [dialogAction, setDialogAction] = React.useState<
    "criarPasta" | "criarArquivo" | "renomear" | "deletar" | null
  >(null)
  const [inputValue, setInputValue] = React.useState("")
  const [showPinModal, setShowPinModal] = React.useState(false)
  const [pendingActionData, setPendingActionData] = React.useState<{
    action: "criarPasta" | "criarArquivo" | "renomear" | "deletar" | null
    payload: string
  } | null>(null)

  const isActive = activeId === item.id
  const isPasta = item.tipo === TipoNo.PASTA

  const localFilhos = item.filhos ?? []

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
    if (
      dialogAction === "renomear" &&
      (!inputValue.trim() || inputValue === item.nome)
    ) {
      setDialogAction(null)
      return
    }
    if (
      (dialogAction === "criarPasta" || dialogAction === "criarArquivo") &&
      !inputValue.trim()
    ) {
      return
    }
    setPendingActionData({ action: dialogAction, payload: inputValue.trim() })
    setDialogAction(null)
    setShowPinModal(true)
  }

  async function executePinAction(pin: string) {
    if (!pendingActionData) return

    let res: { success: boolean; error?: string; id?: string } | undefined
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
    }

    if (res && !res.success) {
      throw new Error(res.error || "Erro na operação.")
    }

    setShowPinModal(false)
    setPendingActionData(null)
    router.refresh()

    if (pendingActionData.action === "deletar" && isActive) {
      router.push("/")
    } else if (
      res &&
      "id" in res &&
      res.id &&
      pendingActionData.action === "criarArquivo"
    ) {
      router.push(`/n/${res.id}`)
    }
  }

  return (
    <div className="flex flex-col select-none">
      <div
        className={`group relative flex items-center justify-between py-1 px-2 rounded-md text-sm transition-colors hover:bg-accent/50 ${
          isOver
            ? "bg-accent/85 ring-1 ring-accent-foreground/30 font-semibold"
            : ""
        } ${
          isActive
            ? "bg-accent text-accent-foreground font-medium"
            : "text-foreground/80"
        }`}
      >
        <span
          {...(attributes as React.HTMLAttributes<HTMLSpanElement>)}
          {...(listeners as React.HTMLAttributes<HTMLSpanElement>)}
          className="opacity-0 group-hover:opacity-40 hover:!opacity-100 cursor-grab active:cursor-grabbing shrink-0 text-muted-foreground mr-0.5 touch-none"
          title="Arrastar para reordenar"
        >
          <GripVertical className="size-3" />
        </span>

        <div
          className="flex items-center gap-1.5 flex-1 cursor-pointer overflow-hidden"
          onClick={() => {
            if (isPasta) {
              setIsOpen(!isOpen)
            } else {
              router.push(`/n/${item.id}`)
            }
          }}
        >
          {isPasta ? (
            <ChevronRight
              className={`size-3.5 shrink-0 transition-transform text-muted-foreground ${
                isOpen ? "rotate-90" : ""
              }`}
            />
          ) : (
            <span className="w-3.5 shrink-0" />
          )}

          <span className="truncate font-sans tracking-tight text-xs">
            {item.nome}
          </span>
        </div>

        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground cursor-pointer">
              <MoreVertical className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 font-sans text-xs">
              {isPasta && (
                <>
                  <DropdownMenuItem
                    onClick={() => handleOpenCreateModal(TipoNo.ARQUIVO)}
                  >
                    <FilePlus className="size-3.5 mr-2" /> Novo Arquivo
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleOpenCreateModal(TipoNo.PASTA)}
                  >
                    <FolderPlus className="size-3.5 mr-2" /> Nova Pasta
                  </DropdownMenuItem>
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

      {isPasta && isOpen && localFilhos.length > 0 && (
        <div className="pl-3 ml-2 border-l border-border/40 flex flex-col gap-0.5 mt-0.5">
          <SortableContext
            items={localFilhos.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            {localFilhos.map((filho) => (
              <SortableNoNode key={filho.id} item={filho} activeId={activeId} />
            ))}
          </SortableContext>
        </div>
      )}

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

function encontrarPai(nodes: NoItem[], id: string, paiId: string | null = null): string | null {
  for (const n of nodes) {
    if (n.id === id) return paiId
    if (n.filhos && n.filhos.length > 0) {
      const found = encontrarPai(n.filhos, id, n.id)
      if (found !== null) return found
    }
  }
  return null
}

function encontrarLista(nodes: NoItem[], paiId: string | null): NoItem[] {
  if (paiId === null) return nodes
  for (const n of nodes) {
    if (n.id === paiId) return n.filhos ?? []
    if (n.filhos && n.filhos.length > 0) {
      const found = encontrarLista(n.filhos, paiId)
      if (found.length > 0 || found === n.filhos) return found
    }
  }
  return []
}

interface SidebarTreeProps {
  arvore: NoItem[]
  activeId?: string
}

export function AppSidebar({ arvore, activeId }: SidebarTreeProps) {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const [searchQuery, setSearchQuery] = React.useState("")

  const [localRaiz, setLocalRaiz] = React.useState<NoItem[]>(arvore)
  const [activeDragItem, setActiveDragItem] = React.useState<NoItem | null>(null)

  // ── Move state ──
  const [pendingMove, setPendingMove] = React.useState<{ id: string; paiId: string | null } | null>(null)
  const [showMovePinModal, setShowMovePinModal] = React.useState(false)

  // ── Global Reorder state ──
  const [pendingReorderList, setPendingReorderList] = React.useState<{ nos: { id: string; ordem: number }[] } | null>(null)
  const [showGlobalReorderPin, setShowGlobalReorderPin] = React.useState(false)

  React.useEffect(() => {
    setLocalRaiz(arvore)
  }, [arvore])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  const { setNodeRef: setRootDropRef, isOver: isRootOver } = useDroppable({
    id: "root-drop-area",
  })

  function handleGlobalDragEnd(event: DragEndEvent) {
    setActiveDragItem(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const overId = String(over.id)
    const activeId = String(active.id)

    // 1. Move into folder
    if (overId.startsWith("folder-")) {
      const targetPaiId = overId.replace("folder-", "")
      if (activeId === targetPaiId) return
      setPendingMove({ id: activeId, paiId: targetPaiId })
      setShowMovePinModal(true)
      return
    }

    // 2. Move to root
    if (overId === "root-drop-area") {
      setPendingMove({ id: activeId, paiId: null })
      setShowMovePinModal(true)
      return
    }

    // 3. Reorder siblings
    const parentIdActive = encontrarPai(localRaiz, activeId)
    const parentIdOver = encontrarPai(localRaiz, overId)

    if (parentIdActive === parentIdOver) {
      const lista = encontrarLista(localRaiz, parentIdActive)
      const oldIndex = lista.findIndex((n) => n.id === activeId)
      const newIndex = lista.findIndex((n) => n.id === overId)
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(lista, oldIndex, newIndex)
        setPendingReorderList({
          nos: reordered.map((n, i) => ({ id: n.id, ordem: i })),
        })
        setShowGlobalReorderPin(true)
      }
    }
  }

  async function executeMove(pin: string) {
    if (!pendingMove) return
    const res = await moverNo(pin, pendingMove.id, pendingMove.paiId)
    if (!res.success) {
      throw new Error(res.error || "Erro ao mover item.")
    }
    setShowMovePinModal(false)
    setPendingMove(null)
    router.refresh()
  }

  async function executeGlobalReorder(pin: string) {
    if (!pendingReorderList) return
    const res = await reordenarNos(pin, pendingReorderList.nos)
    if (!res.success) throw new Error(res.error || "Erro ao reordenar.")
    setShowGlobalReorderPin(false)
    setPendingReorderList(null)
    router.refresh()
  }

  function cancelGlobalReorder() {
    setPendingReorderList(null)
    setLocalRaiz(arvore)
  }

  // ── Root action states ──
  const [rootAction, setRootAction] = React.useState<"criarPasta" | "criarArquivo" | null>(null)
  const [rootInputValue, setRootInputValue] = React.useState("")
  const [showRootPinModal, setShowRootPinModal] = React.useState(false)
  const [rootPendingData, setRootPendingData] = React.useState<{
    action: "criarPasta" | "criarArquivo" | null
    payload: string
  } | null>(null)

  function handleRootSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rootInputValue.trim()) return
    setRootPendingData({ action: rootAction, payload: rootInputValue.trim() })
    setRootAction(null)
    setShowRootPinModal(true)
  }

  async function executeRootPinAction(pin: string) {
    if (!rootPendingData) return

    const res = await criarNo(pin, {
      nome: rootPendingData.payload,
      tipo: rootPendingData.action === "criarPasta" ? TipoNo.PASTA : TipoNo.ARQUIVO,
      paiId: null,
      conteudo: "",
    })

    if (!res.success) {
      throw new Error(res.error || "Erro na operação.")
    }

    setShowRootPinModal(false)
    setRootPendingData(null)
    router.refresh()

    if (res.id && rootPendingData.action === "criarArquivo") {
      router.push(`/n/${res.id}`)
    }
  }

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

  const filteredRaiz = filterTree(localRaiz)

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-border bg-sidebar font-sans">
      <SidebarHeader className="p-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-2">
          <Link
            href="/"
            className="font-semibold text-xs tracking-tight text-foreground flex items-center gap-1.5"
          >
            <img src="/icon.ico" alt="Logo" className="size-4 rounded-sm object-contain" />
            Hayaku Note
          </Link>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setRootInputValue(""); setRootAction("criarArquivo") }}
              title="Novo Arquivo na Raiz"
              className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
            >
              <FilePlus className="size-3.5" />
            </button>
            <button
              onClick={() => { setRootInputValue(""); setRootAction("criarPasta") }}
              title="Nova Pasta na Raiz"
              className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
            >
              <FolderPlus className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-2 size-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar notas..."
            className="h-7 pl-7 text-xs bg-background/50 border-border/60"
          />
        </div>
      </SidebarHeader>

      <SidebarContent
        ref={setRootDropRef}
        className={`px-2 py-2 flex flex-col gap-0.5 overflow-y-auto transition-colors ${
          isRootOver ? "bg-accent/20 ring-1 ring-dashed ring-accent-foreground/30" : ""
        }`}
      >
        {filteredRaiz.length === 0 ? (
          <div className="px-2 py-6 text-center text-xs text-muted-foreground">
            {searchQuery ? "Nenhum resultado." : "Nenhuma nota encontrada."}
          </div>
        ) : searchQuery ? (
          filteredRaiz.map((item) => (
            <NoTreeNode key={item.id} item={item} activeId={activeId} />
          ))
        ) : (
          <DndContext
            id="dnd-global-tree"
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={(e) => {
              const findNode = (nodes: NoItem[]): NoItem | null => {
                for (const n of nodes) {
                  if (n.id === e.active.id) return n
                  if (n.filhos) {
                    const found = findNode(n.filhos)
                    if (found) return found
                  }
                }
                return null
              }
              setActiveDragItem(findNode(localRaiz))
            }}
            onDragEnd={handleGlobalDragEnd}
          >
            <SortableContext
              items={filteredRaiz.map((n) => n.id)}
              strategy={verticalListSortingStrategy}
            >
              {filteredRaiz.map((item) => (
                <SortableNoNode key={item.id} item={item} activeId={activeId} />
              ))}
            </SortableContext>

            <DragOverlay>
              {activeDragItem ? (
                <div className="flex items-center gap-1.5 py-1 px-2 rounded-md text-xs bg-accent/80 text-accent-foreground shadow-md border border-border/60 font-sans tracking-tight opacity-90">
                  <GripVertical className="size-3 text-muted-foreground" />
                  <span className="truncate">{activeDragItem.nome}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-border/50 flex flex-row items-center justify-between">
        <span className="text-[10px] text-muted-foreground font-mono">
          Hayaku Note v1.0
        </span>
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-accent/50 transition-colors"
        >
          {mounted ? (resolvedTheme === "dark" ? "Claro" : "Escuro") : "Tema"}
        </button>
      </SidebarFooter>

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

      <PinDialog
        open={showRootPinModal}
        onOpenChange={setShowRootPinModal}
        onSuccess={executeRootPinAction}
        title="PIN de Autorização"
        description="Necessário PIN de 6 dígitos para criar este item."
      />

      <PinDialog
        open={showMovePinModal}
        onOpenChange={(open) => {
          if (!open) setPendingMove(null)
          setShowMovePinModal(open)
        }}
        onSuccess={executeMove}
        title="PIN para Mover Item"
        description="Digite o PIN para confirmar a movimentação deste item."
      />

      <PinDialog
        open={showGlobalReorderPin}
        onOpenChange={(open) => {
          if (!open) cancelGlobalReorder()
          setShowGlobalReorderPin(open)
        }}
        onSuccess={executeGlobalReorder}
        title="PIN para Reordenar"
        description="Digite o PIN para confirmar a nova ordem dos itens."
      />
    </Sidebar>
  )
}
