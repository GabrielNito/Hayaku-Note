"use client"

import * as React from "react"
import { GripVertical } from "lucide-react"
import {
  Panel,
  Group as ResizablePanelGroup,
  Separator as ResizableHandle,
} from "react-resizable-panels"

import { cn } from "@/lib/utils"

function CustomResizablePanelGroup({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePanelGroup>) {
  return (
    <ResizablePanelGroup
      data-slot="resizable-panel-group"
      className={cn("flex h-full w-full data-[panel-group-direction=vertical]:flex-col", className)}
      {...props}
    />
  )
}

function CustomResizablePanel({
  ...props
}: React.ComponentProps<typeof Panel>) {
  return <Panel data-slot="resizable-panel" {...props} />
}

function CustomResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizableHandle> & {
  withHandle?: boolean
}) {
  return (
    <ResizableHandle
      data-slot="resizable-handle"
      className={cn(
        "relative flex w-1.5 items-center justify-center bg-border/40 hover:bg-primary/20 transition-colors after:absolute after:inset-y-0 after:left-1/2 after:w-2 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-1.5 data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-2 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 cursor-col-resize data-[panel-group-direction=vertical]:cursor-row-resize [&[data-panel-group-direction=vertical]>div]:rotate-90",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="z-10 flex h-4 w-3 items-center justify-center rounded-xs border bg-border text-muted-foreground shadow-xs">
          <GripVertical className="size-2.5" />
        </div>
      )}
    </ResizableHandle>
  )
}

export {
  CustomResizablePanelGroup as ResizablePanelGroup,
  CustomResizablePanel as ResizablePanel,
  CustomResizableHandle as ResizableHandle,
}
