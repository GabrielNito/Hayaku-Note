"use client"

import * as React from "react"
import { Settings } from "lucide-react"
import {
  atualizarPoliticasSeguranca,
  authenticatorEstaConfigurado,
  confirmarCadastroAuthenticator,
  confirmarTrocaAuthenticator,
  fecharConfiguracoes,
  iniciarCadastroAuthenticator,
  iniciarTrocaAuthenticator,
  obterPoliticasSeguranca,
  obterStatusApiKeys,
  atualizarApiKey,
  type PoliticasSeguranca,
  validarAuthenticator,
} from "@/actions/configuracoes"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"

type AuthStep = "code" | "setup-key" | "scan" | "change-current" | "change-scan"

type PolicyKey = Exclude<keyof PoliticasSeguranca, "acessoArquivo">

const policyLabels: { key: PolicyKey; title: string; description: string }[] = [
  { key: "exigirPinArvore", title: "Árvore de arquivos", description: "Exige o PIN uma vez por sessão para visualizar a árvore." },
  { key: "exigirPinCriar", title: "Criar arquivos e pastas", description: "Protege a criação de itens novos." },
  { key: "exigirPinEditar", title: "Editar e salvar conteúdo", description: "Protege mudanças dentro de uma nota." },
  { key: "exigirPinRenomear", title: "Renomear", description: "Protege alterações de nome." },
  { key: "exigirPinMoverCopiar", title: "Mover e copiar", description: "Protege alterações de localização e duplicações." },
  { key: "exigirPinExcluir", title: "Excluir", description: "Protege a remoção de arquivos e pastas." },
  { key: "exigirPinExportar", title: "Exportar Markdown", description: "Exige PIN antes de baixar uma nota." },
  { key: "exigirPinBusca", title: "Busca e Quick Open", description: "Protege a descoberta de nomes de notas." },
  { key: "exigirPinCommandBar", title: "Command Bar", description: "Protege comandos que podem alterar a estrutura." },
  { key: "exigirPinUploadImagem", title: "Upload de imagens", description: "Protege a inclusão de arquivos em notas." },
  { key: "exigirPinChatAi", title: "Chat com IA (BYOK)", description: "Exige PIN antes de abrir o assistente de inteligência artificial." },
]

const policyGroups: { title: string; description: string; keys: PolicyKey[] }[] = [
  {
    title: "Navegação e descoberta",
    description: "Controle o que pode ser encontrado antes da leitura de uma nota.",
    keys: ["exigirPinArvore", "exigirPinBusca"],
  },
  {
    title: "Estrutura de arquivos",
    description: "Proteja a organização da sua árvore de notas.",
    keys: ["exigirPinCriar", "exigirPinRenomear", "exigirPinMoverCopiar", "exigirPinExcluir"],
  },
  {
    title: "Recursos auxiliares",
    description: "Defina proteções para ações complementares da aplicação.",
    keys: ["exigirPinExportar", "exigirPinCommandBar", "exigirPinUploadImagem", "exigirPinChatAi"],
  },
]

function OtpInput({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <InputOTP maxLength={6} value={value} onChange={onChange} disabled={disabled} autoFocus>
      <InputOTPGroup>
        {[0, 1, 2, 3, 4, 5].map((index) => <InputOTPSlot key={index} index={index} masked={false} />)}
      </InputOTPGroup>
    </InputOTP>
  )
}

function IosSwitch({
  checked,
  onCheckedChange,
  disabled,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onCheckedChange(!checked)
      }}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ios-press ${
        checked ? "bg-emerald-500 dark:bg-emerald-600" : "bg-muted-foreground/30 dark:bg-muted-foreground/25"
      }`}
    >
      <span
        className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  )
}

export function SettingsDialog() {
  const [authOpen, setAuthOpen] = React.useState(false)
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [step, setStep] = React.useState<AuthStep>("code")
  const [code, setCode] = React.useState("")
  const [setupKey, setSetupKey] = React.useState("")
  const [secret, setSecret] = React.useState("")
  const [qrCode, setQrCode] = React.useState("")
  const [policies, setPolicies] = React.useState<PoliticasSeguranca | null>(null)
  const [apiKeysStatus, setApiKeysStatus] = React.useState<{ google: boolean; openai: boolean; anthropic: boolean } | null>(null)
  const [keyInputs, setKeyInputs] = React.useState({ google: "", openai: "", anthropic: "" })
  const [keyLoading, setKeyLoading] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [saved, setSaved] = React.useState(false)

  function resetAuthenticator() {
    setStep("code")
    setCode("")
    setSetupKey("")
    setSecret("")
    setQrCode("")
    setError("")
    setLoading(false)
  }

  async function abrirConfiguracoes() {
    setSettingsOpen(false)
    resetAuthenticator()
    setAuthOpen(true)
    try {
      const configurado = await authenticatorEstaConfigurado()
      if (!configurado) setStep("setup-key")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível verificar o Authenticator.")
    }
  }

  async function abrirPainel() {
    const [data, keysStatus] = await Promise.all([
      obterPoliticasSeguranca(),
      obterStatusApiKeys(),
    ])
    setPolicies(data)
    setApiKeysStatus(keysStatus)
    setAuthOpen(false)
    setSettingsOpen(true)
  }

  async function validarCodigo() {
    if (code.length !== 6) return
    setLoading(true)
    setError("")
    try {
      if (step === "change-current") {
        const result = await iniciarTrocaAuthenticator(code)
        if (!result.success || !result.secret || !result.qrCode) throw new Error(result.error || "Não foi possível iniciar a troca.")
        setSecret(result.secret)
        setQrCode(result.qrCode)
        setCode("")
        setStep("change-scan")
        return
      }

      if (step === "scan" || step === "change-scan") {
        const result = step === "scan"
          ? await confirmarCadastroAuthenticator(setupKey, secret, code)
          : await confirmarTrocaAuthenticator(secret, code)
        if (!result.success) throw new Error(result.error || "Não foi possível confirmar o Authenticator.")
        await abrirPainel()
        return
      }

      const result = await validarAuthenticator(code)
      if (result.setupRequired) {
        setCode("")
        setStep("setup-key")
        return
      }
      if (!result.success) throw new Error(result.error || "Código do Authenticator inválido.")
      await abrirPainel()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível validar o Authenticator.")
    } finally {
      setLoading(false)
    }
  }

  async function iniciarCadastro() {
    if (!setupKey.trim()) return
    setLoading(true)
    setError("")
    try {
      const result = await iniciarCadastroAuthenticator(setupKey)
      if (!result.success || !result.secret || !result.qrCode) throw new Error(result.error || "Não foi possível iniciar o cadastro.")
      setSecret(result.secret)
      setQrCode(result.qrCode)
      setStep("scan")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível iniciar o cadastro.")
    } finally {
      setLoading(false)
    }
  }

  async function salvarPoliticas() {
    if (!policies) return
    setLoading(true)
    setError("")
    try {
      const result = await atualizarPoliticasSeguranca(policies)
      if (!result.success) throw new Error(result.error || "Não foi possível salvar as políticas.")
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar as políticas.")
    } finally {
      setLoading(false)
    }
  }

  async function handleSalvarApiKey(provider: "google" | "openai" | "anthropic") {
    const keyVal = keyInputs[provider]
    if (!keyVal.trim()) return
    setKeyLoading(provider)
    setError("")
    try {
      const res = await atualizarApiKey(provider, keyVal)
      if (!res.success) throw new Error(res.error || "Erro ao salvar API Key.")
      const updatedStatus = await obterStatusApiKeys()
      setApiKeysStatus(updatedStatus)
      setKeyInputs((prev) => ({ ...prev, [provider]: "" }))
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar API Key.")
    } finally {
      setKeyLoading(null)
    }
  }

  async function handleRemoverApiKey(provider: "google" | "openai" | "anthropic") {
    if (!confirm(`Tem certeza que deseja remover a API Key de ${provider}?`)) return
    setKeyLoading(provider)
    setError("")
    try {
      const res = await atualizarApiKey(provider, null)
      if (!res.success) throw new Error(res.error || "Erro ao remover API Key.")
      const updatedStatus = await obterStatusApiKeys()
      setApiKeysStatus(updatedStatus)
      setKeyInputs((prev) => ({ ...prev, [provider]: "" }))
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover API Key.")
    } finally {
      setKeyLoading(null)
    }
  }

  async function fecharPainel() {
    setSettingsOpen(false)
    setPolicies(null)
    setApiKeysStatus(null)
    await fecharConfiguracoes()
  }

  function iniciarTroca() {
    setSettingsOpen(false)
    setCode("")
    setError("")
    setStep("change-current")
    setAuthOpen(true)
  }

  function atualizarGrupo(keys: PolicyKey[], enabled: boolean) {
    setPolicies((current) => current ? Object.fromEntries(
      Object.entries(current).map(([key, value]) => [key, keys.includes(key as PolicyKey) ? enabled : value])
    ) as PoliticasSeguranca : current)
  }

  const isScanStep = step === "scan" || step === "change-scan"
  const title = step === "setup-key" ? "Configurar Authenticator" : isScanStep ? "Confirme o novo Authenticator" : step === "change-current" ? "Trocar Google Authenticator" : "Acessar Configurações"
  const description = step === "setup-key"
    ? "Informe o valor definido diretamente na variável SETTINGS_SETUP_KEY do ambiente."
    : isScanStep
    ? "Escaneie o QR Code no Google Authenticator e confirme o código gerado."
    : step === "change-current"
    ? "Digite um código válido do Authenticator atual antes de substituí-lo."
    : "Digite o código de 6 dígitos do Google Authenticator."

  return (
    <>
      <button
        onClick={() => void abrirConfiguracoes()}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-accent/50 transition-colors"
      >
        <Settings className="size-3.5" />
        <span>Configurações</span>
      </button>

      <Dialog open={authOpen} onOpenChange={(open) => { setAuthOpen(open); if (!open) resetAuthenticator() }}>
        <DialogContent className="sm:max-w-105" showCloseButton={!loading}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          {isScanStep && qrCode && (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCode} alt="QR Code para Google Authenticator" width={176} height={176} className="size-44 rounded bg-white p-2" />
              <p className="max-w-sm text-center text-xs text-muted-foreground">Se não puder escanear, adicione uma chave baseada em tempo e use: <code className="select-all break-all text-foreground">{secret}</code></p>
            </div>
          )}

          <form onSubmit={(event) => { event.preventDefault(); if (step === "setup-key") void iniciarCadastro(); else void validarCodigo() }} className="flex flex-col items-center gap-4 pt-1">
            {step === "setup-key" ? (
              <Input type="password" value={setupKey} onChange={(event) => setSetupKey(event.target.value)} placeholder="Chave de configuração" disabled={loading} autoFocus />
            ) : (
              <OtpInput value={code} onChange={(value) => { setCode(value); if (error) setError("") }} disabled={loading} />
            )}
            {error && <p className="w-full text-center text-xs text-destructive animate-ios-shake">{error}</p>}
            <DialogFooter className="w-[calc(100%+2rem)] gap-2">
              <Button type="button" variant="outline" disabled={loading} onClick={() => setAuthOpen(false)} className="ios-press">Cancelar</Button>
              <Button type="submit" disabled={loading || (step === "setup-key" ? !setupKey.trim() : code.length !== 6)} className="ios-press">{loading ? "Validando..." : isScanStep ? "Confirmar" : step === "setup-key" ? "Continuar" : "Confirmar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={(open) => { if (!open) void fecharPainel() }}>
        <DialogContent className="h-[80vh] max-w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-[75vw]" showCloseButton={!loading}>
          <DialogHeader className="border-b border-border/60 px-6 py-5 pr-12">
            <DialogTitle>Configurações</DialogTitle>
            <DialogDescription>As mudanças desta área exigem uma sessão válida do Google Authenticator.</DialogDescription>
          </DialogHeader>

          <div className="grid flex-1 overflow-y-auto md:grid-cols-[13rem_1fr]">
            <aside className="border-b border-border/60 bg-muted/30 p-4 md:border-r md:border-b-0">
              <p className="text-xs font-medium text-foreground">Segurança e PIN</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Defina quando o PIN comum será exigido.</p>
            </aside>
            <section className="space-y-6 p-6">
              {/* Seção Provedores de IA (BYOK) */}
              <div className="rounded-lg border border-border/60 p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-medium">Provedores de IA (Bring Your Own Key)</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Insira suas chaves de API com segurança. Elas são criptografadas e restritas à sua sessão autenticada.</p>
                </div>

                <div className="space-y-3 pt-1">
                  {(
                    [
                      { id: "google", name: "Google Gemini", placeholder: "AIzaSy..." },
                      { id: "openai", name: "OpenAI", placeholder: "sk-..." },
                      { id: "anthropic", name: "Anthropic Claude", placeholder: "sk-ant-..." },
                    ] as const
                  ).map(({ id, name, placeholder }) => {
                    const isConfigured = apiKeysStatus?.[id]
                    return (
                      <div key={id} className="rounded-lg border border-border/60 p-3 space-y-2 bg-muted/20">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">{name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isConfigured ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                            {isConfigured ? "Configurada" : "Não configurada"}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            type="password"
                            placeholder={isConfigured ? "•••••••••••••••• (Substituir chave existente)" : placeholder}
                            value={keyInputs[id]}
                            onChange={(e) => setKeyInputs((prev) => ({ ...prev, [id]: e.target.value }))}
                            disabled={keyLoading === id}
                            className="text-xs flex-1 h-8"
                          />
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 text-xs"
                            disabled={keyLoading === id || !keyInputs[id].trim()}
                            onClick={() => void handleSalvarApiKey(id)}
                          >
                            {keyLoading === id ? "Salvando..." : isConfigured ? "Alterar" : "Salvar"}
                          </Button>
                          {isConfigured && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="h-8 text-xs"
                              disabled={keyLoading === id}
                              onClick={() => void handleRemoverApiKey(id)}
                            >
                              Remover
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium">Leitura de arquivos</h3>
                <p className="mt-1 text-xs text-muted-foreground">Escolha como o acesso ao conteúdo de uma nota será protegido.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {(["LIVRE", "SESSAO", "POR_ARQUIVO"] as const).map((value) => (
                    <label
                      key={value}
                      className={`cursor-pointer rounded-xl border p-3 text-xs transition-all duration-200 ios-press ${
                        policies?.acessoArquivo === value
                          ? "border-foreground bg-muted/70 shadow-xs ring-1 ring-foreground/20"
                          : "border-border/60 hover:bg-muted/30"
                      }`}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        name="acessoArquivo"
                        checked={policies?.acessoArquivo === value}
                        onChange={() => setPolicies((current) => current ? { ...current, acessoArquivo: value } : current)}
                      />
                      <span className="font-semibold block">{value === "LIVRE" ? "Livre" : value === "SESSAO" ? "Por sessão" : "Por arquivo"}</span>
                      <span className="mt-1 block text-[11px] text-muted-foreground leading-snug">{value === "LIVRE" ? "Sem PIN." : value === "SESSAO" ? "Um PIN por sessão." : "PIN sempre ao abrir."}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                <h3 className="text-sm font-medium">Ações protegidas</h3>
                {policies && policyGroups.map((group) => {
                  const groupEnabled = group.keys.every((key) => policies[key])
                  return (
                    <div key={group.title} className="overflow-hidden rounded-xl border border-border/60 shadow-xs bg-card">
                      <div className="flex items-center justify-between gap-4 border-b border-border/60 bg-muted/30 p-3.5">
                        <div>
                          <span className="block text-xs font-semibold text-foreground">{group.title}</span>
                          <span className="mt-0.5 block text-[11px] text-muted-foreground">{group.description}</span>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-[11px] text-muted-foreground">Exigir em todas</span>
                          <IosSwitch
                            checked={groupEnabled}
                            onCheckedChange={(checked) => atualizarGrupo(group.keys, checked)}
                          />
                        </div>
                      </div>
                      <div className="divide-y divide-border/60">
                        {policyLabels.filter((policy) => group.keys.includes(policy.key)).map(({ key, title: policyTitle, description: policyDescription }) => (
                          <div
                            key={key}
                            onClick={() => setPolicies({ ...policies, [key]: !policies[key] })}
                            className="flex cursor-pointer items-center justify-between gap-4 p-3.5 hover:bg-muted/20 transition-colors duration-150"
                          >
                            <div>
                              <span className="block text-xs font-medium text-foreground">{policyTitle}</span>
                              <span className="mt-0.5 block text-[11px] text-muted-foreground">{policyDescription}</span>
                            </div>
                            <div className="shrink-0">
                              <IosSwitch
                                checked={Boolean(policies[key])}
                                onCheckedChange={(checked) => setPolicies({ ...policies, [key]: checked })}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="rounded-lg border border-border/60 p-4">
                <h3 className="text-sm font-medium">Google Authenticator</h3>
                <p className="mt-1 text-xs text-muted-foreground">Para trocar o dispositivo, confirme primeiro um código do Authenticator atual.</p>
                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={iniciarTroca}>Trocar Google Authenticator</Button>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </section>
          </div>

          <DialogFooter className="mx-0 mb-0 rounded-none px-6 py-4">
            {saved && <span className="mr-auto self-center text-xs text-muted-foreground">Configurações salvas.</span>}
            <Button type="button" variant="outline" disabled={loading} onClick={() => void fecharPainel()}>Fechar</Button>
            <Button type="button" disabled={loading || !policies} onClick={() => void salvarPoliticas()}>{loading ? "Salvando..." : "Salvar alterações"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
