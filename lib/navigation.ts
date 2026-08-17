declare global {
  interface Window {
    __checkUnsavedChangesBeforeNav?: (cb: () => void) => void
  }
}

export function navigateWith(router: { push: (url: string) => void }, url: string) {
  if (typeof window !== "undefined" && window.__checkUnsavedChangesBeforeNav) {
    window.__checkUnsavedChangesBeforeNav(() => router.push(url))
  } else {
    router.push(url)
  }
}
