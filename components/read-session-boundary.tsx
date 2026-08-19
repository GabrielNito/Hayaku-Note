"use client"

import * as React from "react"

export function ReadSessionBoundary() {
  React.useEffect(() => {
    const clearReadSession = () => {
      document.cookie = "mesapad-read-active=; Max-Age=0; Path=/; SameSite=Strict"
    }

    window.addEventListener("beforeunload", clearReadSession)
    return () => window.removeEventListener("beforeunload", clearReadSession)
  }, [])

  return null
}
