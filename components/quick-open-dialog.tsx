"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"
import { FileText } from "lucide-react"
import { NoItem } from "@/actions/types"
import { navigateWith } from "@/lib/navigation"

interface QuickOpenDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  arvore: NoItem[]
}

interface FlatNode {
  id: string
  nome: string
  path: string
}

function flattenFiles(nodes: NoItem[], parentPath = ""): FlatNode[] {
  let result: FlatNode[] = []
  for (const node of nodes) {
    const currentPath = parentPath ? `${parentPath} / ${node.nome}` : node.nome
    if (node.tipo === "ARQUIVO") {
      result.push({
        id: node.id,
        nome: node.nome,
        path: currentPath,
      })
    }
    if (node.filhos && node.filhos.length > 0) {
      result = result.concat(flattenFiles(node.filhos, currentPath))
    }
  }
  return result
}

export function QuickOpenDialog({ open, onOpenChange, arvore }: QuickOpenDialogProps) {
  const router = useRouter()
  const files = React.useMemo(() => flattenFiles(arvore), [arvore])

  const runCommand = React.useCallback(
    (command: () => void) => {
      onOpenChange(false)
      command()
    },
    [onOpenChange]
  )

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Digite para buscar anotações..." />
      <CommandList>
        <CommandEmpty>Nenhuma anotação encontrada.</CommandEmpty>
        <CommandGroup heading="Anotações">
          {files.map((file) => (
            <CommandItem
              key={file.id}
              value={file.path}
              onSelect={() => {
                runCommand(() => {
                  navigateWith(router, `/n/${file.id}`)
                })
              }}
            >
              <FileText className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{file.path}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
