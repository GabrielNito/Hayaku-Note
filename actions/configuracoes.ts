"use server"

import { timingSafeEqual } from "node:crypto"
import QRCode from "qrcode"
import { prisma } from "@/lib/prisma"
import { criarSessaoConfiguracoes, encerrarSessaoConfiguracoes, temSessaoConfiguracoes } from "@/lib/settings-session"
import { temAcessosPin } from "@/lib/pin-session"
import {
  criarSegredoTotp,
  criarUriTotp,
  criptografarSegredoTotp,
  descriptografarSegredoTotp,
  validarCodigoTotp,
} from "@/lib/totp"

const CONFIGURACAO_ID = "principal"

export type PoliticasSeguranca = {
  exigirPinArvore: boolean
  acessoArquivo: "LIVRE" | "SESSAO" | "POR_ARQUIVO"
  exigirPinCriar: boolean
  exigirPinEditar: boolean
  exigirPinRenomear: boolean
  exigirPinMoverCopiar: boolean
  exigirPinExcluir: boolean
  exigirPinExportar: boolean
  exigirPinBusca: boolean
  exigirPinCommandBar: boolean
  exigirPinUploadImagem: boolean
  exigirPinChatAi: boolean
}

const politicasPadrao: PoliticasSeguranca = {
  exigirPinArvore: false,
  acessoArquivo: "LIVRE",
  exigirPinCriar: true,
  exigirPinEditar: true,
  exigirPinRenomear: true,
  exigirPinMoverCopiar: true,
  exigirPinExcluir: true,
  exigirPinExportar: false,
  exigirPinBusca: false,
  exigirPinCommandBar: true,
  exigirPinUploadImagem: true,
  exigirPinChatAi: true,
}

async function obterConfiguracao() {
  return prisma.configuracao.upsert({
    where: { id: CONFIGURACAO_ID },
    create: { id: CONFIGURACAO_ID, ...politicasPadrao },
    update: {},
  })
}

function validarSetupKey(setupKey: string) {
  const expected = process.env.SETTINGS_SETUP_KEY
  if (!expected) throw new Error("SETTINGS_SETUP_KEY não está configurada.")
  const receivedBuffer = Buffer.from(setupKey)
  const expectedBuffer = Buffer.from(expected)
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer)
}

async function exigirSessaoConfiguracoes() {
  if (!(await temSessaoConfiguracoes())) {
    throw new Error("A sessão de Configurações expirou. Valide o Authenticator novamente.")
  }
}

function paraPoliticas(configuracao: Awaited<ReturnType<typeof obterConfiguracao>>): PoliticasSeguranca {
  return {
    exigirPinArvore: configuracao.exigirPinArvore,
    acessoArquivo: configuracao.acessoArquivo as PoliticasSeguranca["acessoArquivo"],
    exigirPinCriar: configuracao.exigirPinCriar,
    exigirPinEditar: configuracao.exigirPinEditar,
    exigirPinRenomear: configuracao.exigirPinRenomear,
    exigirPinMoverCopiar: configuracao.exigirPinMoverCopiar,
    exigirPinExcluir: configuracao.exigirPinExcluir,
    exigirPinExportar: configuracao.exigirPinExportar,
    exigirPinBusca: configuracao.exigirPinBusca,
    exigirPinCommandBar: configuracao.exigirPinCommandBar,
    exigirPinUploadImagem: configuracao.exigirPinUploadImagem,
    exigirPinChatAi: configuracao.exigirPinChatAi,
  }
}

export async function verificarAcessoChatAi(): Promise<{ exigirPin: boolean; autorizado: boolean }> {
  const configuracao = await obterConfiguracao()
  if (!configuracao.exigirPinChatAi) {
    return { exigirPin: false, autorizado: true }
  }
  const autorizado = await temAcessosPin(["ai-chat"])
  return { exigirPin: true, autorizado }
}

export async function validarAuthenticator(code: string): Promise<{ success: boolean; setupRequired?: boolean; error?: string }> {
  const configuracao = await obterConfiguracao()
  if (!configuracao.totpSecretCriptografado) {
    return { success: false, setupRequired: true }
  }

  try {
    const secret = descriptografarSegredoTotp(configuracao.totpSecretCriptografado)
    if (!validarCodigoTotp(secret, code)) return { success: false, error: "Código do Authenticator inválido." }
    await criarSessaoConfiguracoes()
    return { success: true }
  } catch (error) {
    console.error("Erro ao validar Authenticator:", error)
    return { success: false, error: "Não foi possível validar o Authenticator." }
  }
}

export async function authenticatorEstaConfigurado(): Promise<boolean> {
  const configuracao = await obterConfiguracao()
  return Boolean(configuracao.totpSecretCriptografado)
}

export async function iniciarCadastroAuthenticator(setupKey: string): Promise<{ success: boolean; secret?: string; qrCode?: string; error?: string }> {
  const configuracao = await obterConfiguracao()
  if (configuracao.totpSecretCriptografado) return { success: false, error: "O Authenticator já está configurado." }
  if (!validarSetupKey(setupKey)) return { success: false, error: "Chave de configuração inválida." }

  const secret = criarSegredoTotp()
  const uri = criarUriTotp(secret)
  return { success: true, secret, qrCode: await QRCode.toDataURL(uri, { margin: 1, width: 224 }) }
}

export async function confirmarCadastroAuthenticator(setupKey: string, secret: string, code: string): Promise<{ success: boolean; error?: string }> {
  const configuracao = await obterConfiguracao()
  if (configuracao.totpSecretCriptografado) return { success: false, error: "O Authenticator já está configurado." }
  if (!validarSetupKey(setupKey)) return { success: false, error: "Chave de configuração inválida." }
  if (!validarCodigoTotp(secret, code)) return { success: false, error: "Código do Authenticator inválido." }

  await prisma.configuracao.update({
    where: { id: CONFIGURACAO_ID },
    data: { totpSecretCriptografado: criptografarSegredoTotp(secret), totpConfiguradoEm: new Date() },
  })
  await criarSessaoConfiguracoes()
  return { success: true }
}

export async function obterPoliticasSeguranca(): Promise<PoliticasSeguranca> {
  await exigirSessaoConfiguracoes()
  return paraPoliticas(await obterConfiguracao())
}

export async function atualizarPoliticasSeguranca(politicas: PoliticasSeguranca): Promise<{ success: boolean; error?: string }> {
  await exigirSessaoConfiguracoes()
  if (!["LIVRE", "SESSAO", "POR_ARQUIVO"].includes(politicas.acessoArquivo)) {
    return { success: false, error: "Regra de acesso a arquivo inválida." }
  }
  await prisma.configuracao.update({ where: { id: CONFIGURACAO_ID }, data: politicas })
  return { success: true }
}

export async function iniciarTrocaAuthenticator(code: string): Promise<{ success: boolean; secret?: string; qrCode?: string; error?: string }> {
  await exigirSessaoConfiguracoes()
  const configuracao = await obterConfiguracao()
  if (!configuracao.totpSecretCriptografado) return { success: false, error: "O Authenticator não está configurado." }
  const secretAtual = descriptografarSegredoTotp(configuracao.totpSecretCriptografado)
  if (!validarCodigoTotp(secretAtual, code)) return { success: false, error: "Código atual inválido." }

  const secret = criarSegredoTotp()
  return { success: true, secret, qrCode: await QRCode.toDataURL(criarUriTotp(secret), { margin: 1, width: 224 }) }
}

export async function confirmarTrocaAuthenticator(secret: string, code: string): Promise<{ success: boolean; error?: string }> {
  await exigirSessaoConfiguracoes()
  if (!validarCodigoTotp(secret, code)) return { success: false, error: "Código do novo Authenticator inválido." }
  await prisma.configuracao.update({
    where: { id: CONFIGURACAO_ID },
    data: { totpSecretCriptografado: criptografarSegredoTotp(secret), totpConfiguradoEm: new Date() },
  })
  return { success: true }
}

export async function fecharConfiguracoes() {
  await encerrarSessaoConfiguracoes()
}

export async function obterStatusApiKeys(): Promise<{ google: boolean; openai: boolean; anthropic: boolean }> {
  await exigirSessaoConfiguracoes()
  const configuracao = await obterConfiguracao()
  return {
    google: Boolean(configuracao.googleApiKeyCriptografado),
    openai: Boolean(configuracao.openaiApiKeyCriptografado),
    anthropic: Boolean(configuracao.anthropicApiKeyCriptografado),
  }
}

export async function verificarApiKeysConfiguradas(): Promise<{ google: boolean; openai: boolean; anthropic: boolean }> {
  const configuracao = await obterConfiguracao()
  return {
    google: Boolean(configuracao.googleApiKeyCriptografado),
    openai: Boolean(configuracao.openaiApiKeyCriptografado),
    anthropic: Boolean(configuracao.anthropicApiKeyCriptografado),
  }
}

export async function atualizarApiKey(provider: "google" | "openai" | "anthropic", apiKey: string | null): Promise<{ success: boolean; error?: string }> {
  await exigirSessaoConfiguracoes()
  const dataKey = provider === "google"
    ? "googleApiKeyCriptografado"
    : provider === "openai"
    ? "openaiApiKeyCriptografado"
    : "anthropicApiKeyCriptografado"

  const encrypted = apiKey && apiKey.trim() ? criptografarSegredoTotp(apiKey.trim()) : null

  await prisma.configuracao.update({
    where: { id: CONFIGURACAO_ID },
    data: { [dataKey]: encrypted },
  })
  return { success: true }
}
