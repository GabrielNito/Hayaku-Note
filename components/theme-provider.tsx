"use client"

import * as React from "react"

export type ThemePalette = "catppuccin" | "discord" | "normal"
export type ThemeMode = "dark" | "light" | "system"
export type ResolvedMode = "dark" | "light"

interface ThemeContextType {
  palette: ThemePalette
  setPalette: (palette: ThemePalette) => void
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  resolvedMode: ResolvedMode
  toggleMode: () => void
  isDark: boolean
  // Compatibilidade
  theme: string
  setTheme: (val: string) => void
  resolvedTheme: "dark" | "light"
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined)

function getStoredPalette(defaultPalette: ThemePalette): ThemePalette {
  if (typeof window === "undefined") return defaultPalette
  const val = localStorage.getItem("theme_palette") || localStorage.getItem("theme")
  if (val === "catppuccin" || val === "discord" || val === "normal") return val
  return defaultPalette
}

function getStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "system"
  const val = localStorage.getItem("theme_mode")
  if (val === "dark" || val === "light" || val === "system") return val
  const legacyVal = localStorage.getItem("theme")
  if (legacyVal === "dark" || legacyVal === "light" || legacyVal === "system") return legacyVal
  return "system"
}

function getSystemMode(): ResolvedMode {
  if (typeof window === "undefined") return "dark"
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
    if (e.key === "theme_palette" || e.key === "theme_mode" || e.key === "theme") callback()
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
  initialTheme = "discord",
}: {
  children: React.ReactNode
  initialTheme?: string
}) {
  const defaultPalette: ThemePalette =
    initialTheme === "catppuccin"
      ? "catppuccin"
      : initialTheme === "normal" || initialTheme === "classico"
      ? "normal"
      : "discord"

  const getPaletteSnapshot = React.useCallback(() => getStoredPalette(defaultPalette), [defaultPalette])
  const getPaletteServerSnapshot = React.useCallback(() => defaultPalette, [defaultPalette])

  const palette = React.useSyncExternalStore(
    subscribeToTheme,
    getPaletteSnapshot,
    getPaletteServerSnapshot
  )

  const mode = React.useSyncExternalStore(
    subscribeToTheme,
    getStoredMode,
    () => "system" as ThemeMode
  )

  const systemMode = React.useSyncExternalStore(
    subscribeToTheme,
    getSystemMode,
    () => "dark" as ResolvedMode
  )

  const resolvedMode: ResolvedMode = mode === "system" ? systemMode : mode
  const isDark = resolvedMode === "dark"

  React.useEffect(() => {
    const root = document.documentElement
    root.classList.remove("light", "dark", "theme-discord", "theme-catppuccin", "theme-normal")

    root.classList.add(resolvedMode)
    if (palette === "catppuccin") {
      root.classList.add("theme-catppuccin")
      root.dataset.palette = "catppuccin"
    } else if (palette === "discord") {
      root.classList.add("theme-discord")
      root.dataset.palette = "discord"
    } else {
      root.classList.add("theme-normal")
      root.dataset.palette = "normal"
    }
  }, [resolvedMode, palette])

  const setPalette = React.useCallback((newPalette: ThemePalette) => {
    localStorage.setItem("theme_palette", newPalette)
    notifyThemeChange()
  }, [])

  const setMode = React.useCallback((newMode: ThemeMode) => {
    localStorage.setItem("theme_mode", newMode)
    notifyThemeChange()
  }, [])

  const toggleMode = React.useCallback(() => {
    const nextMode = resolvedMode === "dark" ? "light" : "dark"
    setMode(nextMode)
  }, [resolvedMode, setMode])

  const setTheme = React.useCallback(
    (val: string) => {
      if (val === "catppuccin" || val === "discord" || val === "normal") {
        setPalette(val)
      } else if (val === "dark" || val === "light" || val === "system") {
        setMode(val as ThemeMode)
      } else if (val === "toggle") {
        toggleMode()
      }
    },
    [setPalette, setMode, toggleMode]
  )

  const contextValue = React.useMemo(
    () => ({
      palette,
      setPalette,
      mode,
      setMode,
      resolvedMode,
      toggleMode,
      isDark,
      theme: palette,
      setTheme,
      resolvedTheme: resolvedMode,
    }),
    [palette, setPalette, mode, setMode, resolvedMode, toggleMode, isDark, setTheme]
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
  const { toggleMode } = useTheme()

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

      toggleMode()
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [toggleMode])

  return null
}
