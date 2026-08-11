"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export interface MessageScrollerProps extends React.ComponentProps<typeof ScrollArea> {
  children: React.ReactNode
}

export function MessageScroller({ children, className, ...props }: MessageScrollerProps) {
  const endRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [children])

  return (
    <ScrollArea className={cn("flex-1 p-4", className)} {...props}>
      <div className="space-y-4 pr-3">
        {children}
        <div ref={endRef} />
      </div>
    </ScrollArea>
  )
}

export interface MessageProps extends React.HTMLAttributes<HTMLDivElement> {
  role: "user" | "assistant" | "system"
  avatar?: React.ReactNode
}

export function Message({ role, avatar, children, className, ...props }: MessageProps) {
  const isUser = role === "user"

  return (
    <div
      data-slot="chat-message"
      data-role={role}
      className={cn(
        "group relative flex gap-3 text-sm",
        isUser ? "justify-end" : "justify-start",
        className
      )}
      {...props}
    >
      {!isUser && avatar && (
        <div className="flex size-7 shrink-0 select-none items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
          {avatar}
        </div>
      )}
      <div className={cn("relative max-w-[85%] space-y-1", isUser && "flex flex-col items-end")}>
        {children}
      </div>
      {isUser && avatar && (
        <div className="flex size-7 shrink-0 select-none items-center justify-center rounded-full bg-secondary text-secondary-foreground mt-0.5">
          {avatar}
        </div>
      )}
    </div>
  )
}

export interface BubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "user" | "assistant"
}

export function Bubble({ variant = "assistant", children, className, ...props }: BubbleProps) {
  const isUser = variant === "user"

  return (
    <div
      data-slot="chat-bubble"
      data-variant={variant}
      className={cn(
        "rounded-2xl px-4 py-3 leading-relaxed shadow-xs text-sm",
        isUser
          ? "bg-primary text-primary-foreground rounded-tr-xs whitespace-pre-wrap"
          : "bg-muted text-foreground rounded-tl-xs border border-border/50 [&_p]:m-0 [&_p+p]:mt-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_pre]:bg-background/80 [&_pre]:p-2.5 [&_pre]:rounded-lg [&_code]:text-xs [&_code]:bg-background/60 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_pre_code]:bg-transparent [&_a]:underline",
        className
      )}
      {...props}
    >
      {isUser || typeof children !== "string" ? (
        children
      ) : (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {children}
        </ReactMarkdown>
      )}
    </div>
  )
}

export interface AttachmentProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string
  size?: string
  icon?: React.ReactNode
}

export function Attachment({ name, size, icon, className, ...props }: AttachmentProps) {
  return (
    <div
      data-slot="chat-attachment"
      className={cn(
        "flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs",
        className
      )}
      {...props}
    >
      {icon}
      <div className="flex flex-col overflow-hidden">
        <span className="truncate font-medium text-foreground">{name}</span>
        {size && <span className="text-[10px] text-muted-foreground">{size}</span>}
      </div>
    </div>
  )
}

export interface MarkerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function Marker({ children, className, ...props }: MarkerProps) {
  return (
    <div
      data-slot="chat-marker"
      className={cn(
        "my-2 flex items-center justify-center gap-2 text-xs text-muted-foreground",
        className
      )}
      {...props}
    >
      <div className="h-px flex-1 bg-border/60" />
      <span className="px-2 font-medium">{children}</span>
      <div className="h-px flex-1 bg-border/60" />
    </div>
  )
}
