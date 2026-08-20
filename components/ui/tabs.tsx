"use client"

import * as React from "react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"

interface TabsProps {
  defaultValue: string
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}

const TabsContext = React.createContext<{
  value: string
  onValueChange: (value: string) => void
  tabGroupId: string
}>({ value: "", onValueChange: () => {}, tabGroupId: "" })

export function Tabs({ defaultValue, value, onValueChange, children, className }: TabsProps) {
  const [tabState, setTabState] = React.useState(defaultValue)
  const tabGroupId = React.useId()
  const currentTab = value !== undefined ? value : tabState
  const handleValueChange = React.useCallback((val: string) => {
    if (value === undefined) {
      setTabState(val)
    }
    onValueChange?.(val)
  }, [value, onValueChange])

  return (
    <TabsContext.Provider value={{ value: currentTab, onValueChange: handleValueChange, tabGroupId }}>
      <div className={cn("flex flex-col", className)}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="tabs-list"
      className={cn("inline-flex h-7 items-center justify-center rounded-lg bg-muted/70 p-0.5 text-muted-foreground", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function TabsTrigger({ className, value, children, ...props }: React.ComponentProps<"button"> & { value: string }) {
  const { value: selectedValue, onValueChange, tabGroupId } = React.useContext(TabsContext)
  const isSelected = selectedValue === value

  return (
    <button
      type="button"
      data-slot="tabs-trigger"
      data-state={isSelected ? "active" : "inactive"}
      onClick={() => onValueChange(value)}
      className={cn(
        "relative inline-flex items-center justify-center rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-150 outline-none select-none cursor-pointer disabled:pointer-events-none disabled:opacity-50 z-10",
        isSelected ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground",
        className
      )}
      {...props}
    >
      {isSelected && (
        <motion.div
          layoutId={`segmentedControl-${tabGroupId}`}
          className="absolute inset-0 rounded-md bg-background shadow-xs -z-10"
          transition={{ type: "spring", stiffness: 450, damping: 35 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-1.5">{children}</span>
    </button>
  )
}

export function TabsContent({ className, value, children, ...props }: React.ComponentProps<"div"> & { value: string }) {
  const { value: selectedValue } = React.useContext(TabsContext)
  if (selectedValue !== value) return null

  return (
    <div
      data-slot="tabs-content"
      className={cn("mt-2 outline-none", className)}
      {...props}
    >
      {children}
    </div>
  )
}
