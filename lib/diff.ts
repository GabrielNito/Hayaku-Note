export interface DiffLine {
  type: "added" | "removed" | "unchanged"
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

export function computeLineDiff(original: string, proposed: string): DiffLine[] {
  const oldLines = original.split("\n")
  const newLines = proposed.split("\n")

  const diff: DiffLine[] = []

  let i = 0
  let j = 0

  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      diff.push({
        type: "unchanged",
        content: oldLines[i],
        oldLineNumber: i + 1,
        newLineNumber: j + 1,
      })
      i++
      j++
    } else {
      const findInNew = newLines.slice(j).indexOf(oldLines[i])
      const findInOld = oldLines.slice(i).indexOf(newLines[j])

      if (i < oldLines.length && (findInNew === -1 || (findInOld !== -1 && findInOld < findInNew))) {
        diff.push({
          type: "removed",
          content: oldLines[i],
          oldLineNumber: i + 1,
        })
        i++
      } else if (j < newLines.length) {
        diff.push({
          type: "added",
          content: newLines[j],
          newLineNumber: j + 1,
        })
        j++
      } else if (i < oldLines.length) {
        diff.push({
          type: "removed",
          content: oldLines[i],
          oldLineNumber: i + 1,
        })
        i++
      }
    }
  }

  return diff
}
