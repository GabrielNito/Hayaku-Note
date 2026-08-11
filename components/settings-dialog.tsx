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
    keys: ["exigirPinExportar", "exigirPinCommandBar", "exigirPinUploadImagem"],
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

export function SettingsDialog() {
  const [authOpen, setAuthOpen] = React.useState(false)
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [step, setStep] = React.useState<AuthStep>("code")
  const [code, setCode] = React.useState("")
  const [setupKey, setSetupKey] = React.useState("")
  const [secret, setSecret] = React.useState("")
  const [qrCode, setQrCode] = React.useState("")
  const [policies, setPolicies] = React.useState<PoliticasSeguranca | null>(null)
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
    const data = await obterPoliticasSeguranca()
    setPolicies(data)
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

  async function fecharPainel() {
    setSettingsOpen(false)
    setPolicies(null)
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
              <img src={qrCode} alt="QR Code para Google Authenticator" className="size-44 rounded bg-white p-2" />
              <p className="max-w-sm text-center text-xs text-muted-foreground">Se não puder escanear, adicione uma chave baseada em tempo e use: <code className="select-all break-all text-foreground">{secret}</code></p>
            </div>
          )}

          <form onSubmit={(event) => { event.preventDefault(); if (step === "setup-key") void iniciarCadastro(); else void validarCodigo() }} className="flex flex-col items-center gap-4 pt-1">
            {step === "setup-key" ? (
              <Input type="password" value={setupKey} onChange={(event) => setSetupKey(event.target.value)} placeholder="Chave de configuração" disabled={loading} autoFocus />
            ) : (
              <OtpInput value={code} onChange={(value) => { setCode(value); if (error) setError("") }} disabled={loading} />
            )}
            {error && <p className="w-full text-center text-xs text-destructive">{error}</p>}
            <DialogFooter className="w-[calc(100%+2rem)]">
              <Button type="button" variant="outline" disabled={loading} onClick={() => setAuthOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading || (step === "setup-key" ? !setupKey.trim() : code.length !== 6)}>{loading ? "Validando..." : isScanStep ? "Confirmar" : step === "setup-key" ? "Continuar" : "Confirmar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={(open) => { if (!open) void fecharPainel() }}>
        <DialogContent className="h-[75vh] max-w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-[75vw]" showCloseButton={!loading}>
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
              <div>
                <h3 className="text-sm font-medium">Leitura de arquivos</h3>
                <p className="mt-1 text-xs text-muted-foreground">Escolha como o acesso ao conteúdo de uma nota será protegido.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {(["LIVRE", "SESSAO", "POR_ARQUIVO"] as const).map((value) => (
                    <label key={value} className={`cursor-pointer rounded-lg border p-3 text-xs ${policies?.acessoArquivo === value ? "border-foreground bg-muted" : "border-border/60"}`}>
                      <input type="radio" className="sr-only" name="acessoArquivo" checked={policies?.acessoArquivo === value} onChange={() => setPolicies((current) => current ? { ...current, acessoArquivo: value } : current)} />
                      <span className="font-medium">{value === "LIVRE" ? "Livre" : value === "SESSAO" ? "Por sessão" : "Por arquivo"}</span>
                      <span className="mt-1 block text-[11px] text-muted-foreground">{value === "LIVRE" ? "Sem PIN." : value === "SESSAO" ? "Um PIN por sessão." : "PIN sempre ao abrir."}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                <h3 className="text-sm font-medium">Ações protegidas</h3>
                {policies && policyGroups.map((group) => {
                  const groupEnabled = group.keys.every((key) => policies[key])
                  return (
                    <div key={group.title} className="overflow-hidden rounded-lg border border-border/60">
                      <label className="flex cursor-pointer items-center justify-between gap-4 border-b border-border/60 bg-muted/30 p-3.5">
                        <span><span className="block text-xs font-medium">{group.title}</span><span className="mt-0.5 block text-[11px] text-muted-foreground">{group.description}</span></span>
                        <span className="flex items-center gap-2 text-[11px] text-muted-foreground"><span>Exigir em todas</span><input type="checkbox" checked={groupEnabled} onChange={(event) => atualizarGrupo(group.keys, event.target.checked)} className="size-4 accent-foreground" /></span>
                      </label>
                      <div className="divide-y divide-border/60">
                        {policyLabels.filter((policy) => group.keys.includes(policy.key)).map(({ key, title: policyTitle, description: policyDescription }) => (
                          <label key={key} className="flex cursor-pointer items-center justify-between gap-4 p-3.5">
                            <span><span className="block text-xs font-medium">{policyTitle}</span><span className="mt-0.5 block text-[11px] text-muted-foreground">{policyDescription}</span></span>
                            <input type="checkbox" checked={policies[key]} onChange={(event) => setPolicies({ ...policies, [key]: event.target.checked })} className="size-4 accent-foreground" />
                          </label>
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
