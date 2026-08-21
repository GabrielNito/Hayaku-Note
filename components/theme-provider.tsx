"use client"

import * as React from "react"

type Theme = "dark" | "light" | "system"

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: "dark" | "light"
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined)

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system"
  const val = localStorage.getItem("theme")
  if (val === "dark" || val === "light" || val === "system") return val
  return "system"
}

function getSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

let themeListeners: Array<() => void> = []

function notifyThemeChange() {
  for (const listener of themeListeners) {
    listener()
  }
}

function subscribeToTheme(callback: () => void) {
  themeListeners.push(callback)
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
  const handleMedia = () => callback()
  const handleStorage = (e: StorageEvent) => {
    if (e.key === "theme") callback()
  }
  mediaQuery.addEventListener("change", handleMedia)
  window.addEventListener("storage", handleStorage)

  return () => {
    themeListeners = themeListeners.filter((l) => l !== callback)
    mediaQuery.removeEventListener("change", handleMedia)
    window.removeEventListener("storage", handleStorage)
  }
}

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const theme = React.useSyncExternalStore(
    subscribeToTheme,
    getStoredTheme,
    () => "system" as Theme
  )

  const systemTheme = React.useSyncExternalStore(
    subscribeToTheme,
    getSystemTheme,
    () => "light" as "dark" | "light"
  )

  const resolvedTheme: "dark" | "light" = theme === "system" ? systemTheme : theme

  React.useEffect(() => {
    const root = document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(resolvedTheme)
  }, [resolvedTheme])

  const setTheme = React.useCallback((newTheme: Theme) => {
    localStorage.setItem("theme", newTheme)
    notifyThemeChange()
  }, [])

  const contextValue = React.useMemo(
    () => ({ theme, setTheme, resolvedTheme }),
    [theme, setTheme, resolvedTheme]
  )

  return (
    <ThemeContext.Provider value={contextValue}>
      <ThemeHotkey />
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

function ThemeHotkey() {
  const { resolvedTheme, setTheme } = useTheme()

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (event.key?.toLowerCase() !== "d") {
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      setTheme(resolvedTheme === "dark" ? "light" : "dark")
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [resolvedTheme, setTheme])

  return null
}
