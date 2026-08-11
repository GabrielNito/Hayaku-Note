"use client";

import { useState, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageScroller,
  Message,
  Bubble,
  Attachment,
  Marker,
} from "@/components/ui/chat";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Bot, User, Send, ChevronDown, Sparkles, Loader2, X, MessageSquare, AlertCircle, Copy, Check, FileText } from "lucide-react";
import { verificarApiKeysConfiguradas } from "@/actions/configuracoes";

interface DocumentChatProps {
  isOpen: boolean;
  onClose: () => void;
  getDocumentContent: () => string;
}

type Provider = "google" | "openai" | "anthropic";

const PROVIDER_MODELS: Record<Provider, { id: string; name: string }[]> = {
  google: [
    { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash" },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
    { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview" },
    { id: "gemini-flash-latest", name: "Gemini Flash Latest" },
  ],
  openai: [
    { id: "gpt-4o", name: "GPT-4o" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini" },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
  ],
  anthropic: [
    { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
    { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" },
  ],
};

const providerNames: Record<Provider, string> = {
  google: "Google Gemini",
  openai: "OpenAI",
  anthropic: "Anthropic Claude",
};

export function DocumentChat({ isOpen, onClose, getDocumentContent }: DocumentChatProps) {
  const [configuredKeys, setConfiguredKeys] = useState<{ google: boolean; openai: boolean; anthropic: boolean } | null>(null);
  const [provider, setProvider] = useState<Provider>("google");
  const [model, setModel] = useState<string>("gemini-3.5-flash");
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      verificarApiKeysConfiguradas()
        .then((status) => {
          setConfiguredKeys(status);
          if (!status[provider]) {
            if (status.google) { setProvider("google"); setModel("gemini-3.5-flash"); }
            else if (status.openai) { setProvider("openai"); setModel("gpt-4o"); }
            else if (status.anthropic) { setProvider("anthropic"); setModel("claude-3-5-sonnet-20241022"); }
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      headers: {
        "x-provider": provider,
        "x-model": model,
      },
      body: {
        documentContent: getDocumentContent(),
      },
    }),
  });

  if (!isOpen) return null;

  const isLoading = status === "submitted" || status === "streaming";
  const hasAnyKey = configuredKeys ? (configuredKeys.google || configuredKeys.openai || configuredKeys.anthropic) : false;
  const isCurrentKeyConfigured = configuredKeys ? configuredKeys[provider] : false;

  const handleProviderChange = (newProvider: Provider) => {
    setProvider(newProvider);
    setModel(PROVIDER_MODELS[newProvider][0].id);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isCurrentKeyConfigured) return;
    if (!input.trim()) return;

    const textToSend = input;
    setInput("");

    await sendMessage(
      { text: textToSend },
      {
        headers: {
          "x-provider": provider,
          "x-model": model,
        },
        body: {
          documentContent: getDocumentContent(),
        },
      }
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-background select-text">
      {/* Header do Chat */}
      <div className="flex flex-col gap-3 p-4 border-b border-border/60 bg-muted/20 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <Sparkles className="size-4 text-primary" />
            <span>Chat com Documento</span>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
            <span className="sr-only">Fechar</span>
          </Button>
        </div>

        {!hasAnyKey ? (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>Nenhuma API Key configurada. Vá em <strong>Configurações</strong> para cadastrar sua chave do Google, OpenAI ou Anthropic.</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center justify-between gap-1 w-full px-2.5 py-1.5 text-xs font-medium rounded-md border border-input bg-background hover:bg-muted cursor-pointer outline-none">
                <span className="truncate">{providerNames[provider]}</span>
                <ChevronDown className="size-3.5 opacity-50 shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-[10px]">Provedor</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={provider}
                    onValueChange={(val) => handleProviderChange(val as Provider)}
                  >
                    <DropdownMenuRadioItem value="google" disabled={!configuredKeys?.google}>
                      Google Gemini {!configuredKeys?.google && "(Não config.)"}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="openai" disabled={!configuredKeys?.openai}>
                      OpenAI {!configuredKeys?.openai && "(Não config.)"}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="anthropic" disabled={!configuredKeys?.anthropic}>
                      Anthropic {!configuredKeys?.anthropic && "(Não config.)"}
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center justify-between gap-1 w-full px-2.5 py-1.5 text-xs font-medium rounded-md border border-input bg-background hover:bg-muted cursor-pointer outline-none">
                <span className="truncate">{PROVIDER_MODELS[provider].find(m => m.id === model)?.name || model}</span>
                <ChevronDown className="size-3.5 opacity-50 shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-[10px]">Modelo</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={model}
                    onValueChange={(val) => setModel(val)}
                  >
                    {PROVIDER_MODELS[provider].map((m) => (
                      <DropdownMenuRadioItem key={m.id} value={m.id}>
                        {m.name}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {hasAnyKey && (
          <Attachment
            name="Documento atual (Contexto ativo)"
            size="Markdown / Texto"
            icon={<FileText className="size-4 text-primary" />}
          />
        )}

        {!isCurrentKeyConfigured && hasAnyKey && (
          <p className="text-[11px] text-destructive">
            A chave para <strong>{providerNames[provider]}</strong> não está configurada nas Configurações.
          </p>
        )}
      </div>

      {/* MessageScroller */}
      <MessageScroller>
        {messages.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center text-muted-foreground p-6">
            <MessageSquare className="size-10 mb-2 opacity-30" />
            <p className="text-sm font-medium">Faça perguntas sobre este documento</p>
            <p className="text-xs text-muted-foreground/80 mt-1">
              O conteúdo atual do editor será enviado automaticamente como contexto para a IA.
            </p>
          </div>
        ) : (
          <>
            <Marker>Início da Conversa</Marker>
            {messages.map((m) => {
              const textContent =
                m.parts
                  ?.map((p: any) => (p.type === "text" ? p.text : ""))
                  .join("") ||
                (m as any).content ||
                "";

              return (
                <Message
                  key={m.id}
                  role={m.role as any}
                  avatar={m.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
                >
                  <Bubble variant={m.role === "user" ? "user" : "assistant"}>
                    {textContent}
                  </Bubble>
                  {m.role !== "user" && textContent && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-1 pt-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => copyToClipboard(textContent, m.id)}
                        title="Copiar resposta"
                      >
                        {copiedId === m.id ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                      </Button>
                    </div>
                  )}
                </Message>
              );
            })}
          </>
        )}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <Message role="assistant" avatar={<Bot className="size-4" />}>
            <Bubble variant="assistant" className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-xs">Pensando...</span>
            </Bubble>
          </Message>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/20">
            <strong>Erro:</strong> {error.message || "Ocorreu um erro ao processar a requisição."}
          </div>
        )}
      </MessageScroller>

      {/* Input */}
      <form onSubmit={onSubmit} className="p-3 border-t border-border/60 bg-background flex gap-2 shrink-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isCurrentKeyConfigured ? "Pergunte algo sobre o documento..." : "Configure a API key nas Configurações"}
          disabled={!isCurrentKeyConfigured || isLoading}
          className="flex-1 text-xs"
        />
        <Button type="submit" disabled={isLoading || !input.trim() || !isCurrentKeyConfigured} size="icon" className="shrink-0">
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </form>
    </div>
  );
}
