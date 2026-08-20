"use client"

import * as React from "react"
import { Node, mergeAttributes, InputRule } from "@tiptap/core"
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Copy, Check, Table as TableIcon, Code, MoreVertical } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { parseMarkdownTable, serializeMarkdownTable, TableData } from "@/lib/markdown-table"

function generateTableMarkdown(rowsCount = 3, colsCount = 3): string {
  const headers = Array.from({ length: colsCount }, (_, i) => `Coluna ${i + 1}`)
  const rows = Array.from({ length: rowsCount }, () => Array.from({ length: colsCount }, () => ""))
  return serializeMarkdownTable({ headers, rows })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TableBlockComponent = ({ node, updateAttributes, deleteNode }: { node: any; updateAttributes: (attrs: any) => void; deleteNode: () => void }) => {
  const [activeTab, setActiveTab] = React.useState<string>("visual")
  const [copied, setCopied] = React.useState(false)

  const initialMarkdown = node.attrs.markdown || "| Coluna 1 | Coluna 2 |\n|---|---|\n| Valor 1 | Valor 2 |"
  const [tableData, setTableData] = React.useState<TableData>(() => parseMarkdownTable(initialMarkdown))
  const [rawMarkdown, setRawMarkdown] = React.useState<string>(initialMarkdown)

  React.useEffect(() => {
    const md = node.attrs.markdown || "| Coluna 1 | Coluna 2 |\n|---|---|\n| Valor 1 | Valor 2 |"
    setTableData(parseMarkdownTable(md))
    setRawMarkdown(md)
  }, [node.attrs.markdown])

  const commitTableData = (newData: TableData) => {
    const newMarkdown = serializeMarkdownTable(newData)
    setTableData(newData)
    setRawMarkdown(newMarkdown)
    updateAttributes({ markdown: newMarkdown })
  }

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const updatedRows = tableData.rows.map((row, rIdx) => {
      if (rIdx === rowIndex) {
        return row.map((cell, cIdx) => (cIdx === colIndex ? value : cell))
      }
      return row
    })
    setTableData({ headers: tableData.headers, rows: updatedRows })
  }

  const handleCellBlur = () => {
    commitTableData(tableData)
  }

  const handleHeaderChange = (colIndex: number, value: string) => {
    const updatedHeaders = tableData.headers.map((h, idx) => (idx === colIndex ? value : h))
    setTableData({ headers: updatedHeaders, rows: tableData.rows })
  }

  const handleHeaderBlur = () => {
    commitTableData(tableData)
  }

  const addRow = () => {
    const emptyRow = tableData.headers.map(() => "")
    commitTableData({ headers: tableData.headers, rows: [...tableData.rows, emptyRow] })
  }

  const addColumn = () => {
    const newColIndex = tableData.headers.length + 1
    const updatedHeaders = [...tableData.headers, `Coluna ${newColIndex}`]
    const updatedRows = tableData.rows.map((row) => [...row, ""])
    commitTableData({ headers: updatedHeaders, rows: updatedRows })
  }

  const removeRow = (rowIndex: number) => {
    if (tableData.rows.length <= 1) return
    const updatedRows = tableData.rows.filter((_, idx) => idx !== rowIndex)
    commitTableData({ headers: tableData.headers, rows: updatedRows })
  }

  const removeColumn = (colIndex: number) => {
    if (tableData.headers.length <= 1) return
    const updatedHeaders = tableData.headers.filter((_, idx) => idx !== colIndex)
    const updatedRows = tableData.rows.map((row) => row.filter((_, idx) => idx !== colIndex))
    commitTableData({ headers: updatedHeaders, rows: updatedRows })
  }

  const handleRawChange = (value: string) => {
    setRawMarkdown(value)
  }

  const handleRawBlur = () => {
    const parsed = parseMarkdownTable(rawMarkdown)
    setTableData(parsed)
    updateAttributes({ markdown: rawMarkdown })
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(serializeMarkdownTable(tableData))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy table:", err)
    }
  }

  return (
    <NodeViewWrapper className="my-4 rounded-lg border border-border/60 bg-card overflow-hidden shadow-sm group">
      <Tabs defaultValue="visual" value={activeTab} onValueChange={setActiveTab}>
        {/* Top bar */}
        <div
          contentEditable={false}
          className="h-9 px-3.5 bg-muted/30 border-b border-border/40 flex items-center justify-between text-xs font-sans text-muted-foreground select-none"
        >
          <div className="flex items-center gap-2">
            <TabsList className="h-6">
              <TabsTrigger value="visual" className="h-5 px-2 text-xs gap-1">
                <TableIcon className="size-3" />
                <span>Tabela</span>
              </TabsTrigger>
              <TabsTrigger value="raw" className="h-5 px-2 text-xs gap-1">
                <Code className="size-3" />
                <span className="hidden sm:inline">Markdown</span>
                <span className="sm:hidden">MD</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded flex items-center justify-center cursor-pointer outline-none ios-press">
                <MoreVertical className="size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 font-sans text-xs">
                {activeTab === "visual" && (
                  <>
                    <DropdownMenuItem onClick={addRow} className="cursor-pointer">
                      <Plus className="size-3.5 mr-2" /> Adicionar Linha
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={addColumn} className="cursor-pointer">
                      <Plus className="size-3.5 mr-2" /> Adicionar Coluna
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onClick={handleCopy} className="cursor-pointer">
                  {copied ? (
                    <>
                      <Check className="size-3.5 mr-2 text-emerald-500 animate-ios-pop" />
                      <span className="text-emerald-500 animate-ios-pop">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5 mr-2" /> Copiar Markdown
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={deleteNode}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-3.5 mr-2" /> Deletar Tabela
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Visual Tab */}
        <TabsContent value="visual" className="p-3 m-0 overflow-x-auto">
          <Table className="w-max min-w-full table-auto">
            <TableHeader>
              <TableRow>
                {tableData.headers.map((header, cIdx) => (
                  <TableHead key={cIdx} className="relative group/head whitespace-nowrap">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={header}
                        onChange={(e) => handleHeaderChange(cIdx, e.target.value)}
                        onBlur={handleHeaderBlur}
                        onKeyDown={(e) => e.stopPropagation()}
                        style={{ width: `${Math.max(12, (header || "").length + 4)}ch` }}
                        className="bg-transparent border-0 font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 rounded px-1 text-xs whitespace-nowrap"
                      />
                      {tableData.headers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeColumn(cIdx)}
                          className="opacity-0 group-hover/head:opacity-100 text-muted-foreground hover:text-destructive p-0.5 rounded transition-opacity shrink-0"
                          title="Remover coluna"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      )}
                    </div>
                  </TableHead>
                ))}
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.rows.map((row, rIdx) => (
                <TableRow key={rIdx} className="group/row">
                  {row.map((cell, cIdx) => (
                    <TableCell key={cIdx} className="whitespace-nowrap">
                      <input
                        type="text"
                        value={cell}
                        onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                        onBlur={handleCellBlur}
                        onKeyDown={(e) => e.stopPropagation()}
                        style={{ width: `${Math.max(12, (cell || "").length + 4)}ch` }}
                        className="bg-transparent border-0 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 rounded px-1 text-xs font-sans whitespace-nowrap"
                        placeholder="..."
                      />
                    </TableCell>
                  ))}
                  <TableCell className="w-10 text-right">
                    {tableData.rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(rIdx)}
                        className="opacity-0 group-hover/row:opacity-100 text-muted-foreground hover:text-destructive p-1 rounded transition-opacity"
                        title="Remover linha"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Raw Tab */}
        <TabsContent value="raw" className="p-4 m-0 bg-[var(--code-bg)]">
          <textarea
            value={rawMarkdown}
            onChange={(e) => handleRawChange(e.target.value)}
            onBlur={handleRawBlur}
            onKeyDown={(e) => e.stopPropagation()}
            className="w-full h-36 bg-transparent font-mono text-xs text-[var(--code-fg)] resize-y outline-none focus:ring-0 border-0"
            spellCheck={false}
          />
        </TabsContent>
      </Tabs>
    </NodeViewWrapper>
  )
}

export const CustomTableBlock = Node.create({
  name: "tableBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      markdown: {
        default: "| Coluna 1 | Coluna 2 |\n|---|---|\n| Valor 1 | Valor 2 |",
        parseHTML: (element) => element.getAttribute("data-markdown") || "",
        renderHTML: (attributes) => ({
          "data-markdown": attributes.markdown,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: "div[data-type='table-block']",
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "table-block" })]
  },

  addCommands() {
    return {
      insertTable:
        (rowsCount = 3, colsCount = 3) =>
        ({ chain }) => {
          const markdown = generateTableMarkdown(rowsCount, colsCount)
          return chain().insertContent({ type: this.name, attrs: { markdown } }).run()
        },
    }
  },

  addInputRules() {
    return [
      new InputRule({
        find: /(?:^|\s)\/table(?:[ \t]+(\d+)x(\d+))?[ \t]$/,
        handler: ({ state, range, match }) => {
          const rows = match[1] ? parseInt(match[1], 10) : 3
          const cols = match[2] ? parseInt(match[2], 10) : 3
          const markdown = generateTableMarkdown(Math.max(1, rows), Math.max(1, cols))

          const { tr } = state
          let from = range.from
          const matchedText = match[0]
          if (matchedText.startsWith(" ") || matchedText.startsWith("\t")) {
            from += 1
          }
          tr.replaceWith(from, range.to, this.type.create({ markdown }))
        },
      }),
    ]
  },

  addStorage() {
    return {
      markdown: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        serialize(state: any, node: any) {
          state.write(node.attrs.markdown || "")
          state.closeBlock(node)
        },
        parse: {
          // Handled via normalization
        },
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(TableBlockComponent, {
      stopEvent: () => true,
    })
  },
})

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    tableBlock: {
      insertTable: (rowsCount?: number, colsCount?: number) => ReturnType
    }
  }
}
