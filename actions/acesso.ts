"use server"

import { validarPin } from "@/lib/auth"
import { concederAcessosPin } from "@/lib/pin-session"
import { obterPoliticasAtuais } from "@/lib/security-policies"

export async function liberarAcesso(pin: string, scopes: string[]): Promise<{ success: boolean; error?: string }> {
  if (!(await validarPin(pin))) return { success: false, error: "PIN incorreto." }

  const politicas = await obterPoliticasAtuais()
  const isReadingAccess = scopes.some((scope) => scope === "tree" || scope === "files" || scope.startsWith("file:"))
  const grantedScopes = new Set(scopes)

  // A single PIN entry unlocks every configured session-level reading area.
  // It deliberately does not grant any write or destructive operation.
  if (isReadingAccess) {
    if (politicas.exigirPinArvore) grantedScopes.add("tree")
    if (politicas.acessoArquivo === "SESSAO") grantedScopes.add("files")
  }

  await concederAcessosPin([...grantedScopes])
  return { success: true }
}
