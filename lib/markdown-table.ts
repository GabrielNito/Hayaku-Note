export function normalizeMarkdownTables(markdown: string): string {
  if (!markdown) return ""

  const lines = markdown.split(/\r?\n/)
  const normalizedLines: string[] = []
  let inTable = false
  let tableBuffer: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Check if line is part of a markdown table (starts or ends with |)
    const isTableLine = trimmed.startsWith("|") || trimmed.endsWith("|") || (trimmed.includes("|") && trimmed.includes("---"))

    if (isTableLine) {
      if (!inTable) {
        inTable = true
        tableBuffer = []
      }
      // Clean up trailing backslash (e.g. `|\` -> `|`)
      const cleanLine = line.replace(/\\\s*$/, "")
      tableBuffer.push(cleanLine)
    } else {
      if (inTable) {
        flushTable(tableBuffer, normalizedLines)
        inTable = false
        tableBuffer = []
      }
      normalizedLines.push(line)
    }
  }

  if (inTable && tableBuffer.length > 0) {
    flushTable(tableBuffer, normalizedLines)
  }

  return normalizedLines.join("\n")
}

function flushTable(buffer: string[], output: string[]) {
  const validLines = buffer.map(l => l.trim()).filter(l => l.length > 0)
  if (validLines.length > 0) {
    const tableMarkdown = validLines.join("\n")
    // Convert table block to custom HTML container so tiptap-markdown / HTML parser picks it up as tableBlock
    const escapedMarkdown = tableMarkdown.replace(/"/g, "&quot;")
    output.push(`<div data-type="table-block" data-markdown="${escapedMarkdown}"></div>`)
    output.push("")
  }
}

export interface TableData {
  headers: string[]
  rows: string[][]
}

export function parseMarkdownTable(markdownTable: string): TableData {
  const lines = markdownTable.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) {
    return { headers: ["Coluna 1", "Coluna 2"], rows: [["Valor 1", "Valor 2"]] }
  }

  const parseRow = (line: string): string[] => {
    let content = line
    if (content.startsWith("|")) content = content.slice(1)
    if (content.endsWith("|")) content = content.slice(0, -1)
    return content.split("|").map(cell => cell.trim())
  }

  const headers = parseRow(lines[0])
  let rowIndex = 1

  if (lines.length > 1 && /^[\|\-\:\s]+$/.test(lines[1])) {
    rowIndex = 2
  }

  const rows: string[][] = []
  for (let i = rowIndex; i < lines.length; i++) {
    const row = parseRow(lines[i])
    if (row.length > 0 && !(row.length === 1 && row[0] === "")) {
      rows.push(row)
    }
  }

  if (rows.length === 0) {
    rows.push(headers.map(() => ""))
  }

  const colCount = headers.length
  for (const row of rows) {
    while (row.length < colCount) {
      row.push("")
    }
    if (row.length > colCount) {
      row.length = colCount
    }
  }

  return { headers, rows }
}

export function serializeMarkdownTable(data: TableData): string {
  const { headers, rows } = data
  const colCount = headers.length

  const formatRow = (cells: string[]) => {
    const padded = [...cells]
    while (padded.length < colCount) padded.push("")
    return `| ${padded.join(" | ")} |`
  }

  const headerLine = formatRow(headers)
  const separatorLine = `| ${headers.map(() => "---").join(" | ")} |`
  const rowLines = rows.map(formatRow)

  return [headerLine, separatorLine, ...rowLines].join("\n")
}
