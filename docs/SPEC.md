# Hayaku Note — Especificação Técnica

> Design system completo: ver `DESIGN.md`.

## 1. Objetivo

Caderno pessoal de anotações e gestão de conhecimento minimalista em Markdown, sem fricção de login tradicional e sem dependência de plataformas proprietárias. **Leitura é livre por padrão** (totalmente configurável via políticas de segurança granulares) — ações de escrita e acesso a recursos sensíveis são protegidos por PIN de 6 dígitos com escopo de sessão, e a administração de configurações é protegida por Google Authenticator (2FA / TOTP). Todo o conteúdo é persistido como **Markdown puro** no banco de dados.

## 2. Stack

| Camada | Escolha | Motivo |
|---|---|---|
| Runtime/pkg manager | Bun | padrão que você já usa |
| Framework | Next.js 16 (App Router) + TypeScript | full-stack num projeto só |
| UI | shadcn/ui + Tailwind | já iniciado nesse formato |
| ORM | Prisma | tipagem + migrations |
| Banco | Neon (Postgres serverless) | plano free cobre de sobra |
| Editor | Tiptap + `tiptap-markdown` + `@tiptap/extension-code-block-lowlight` | autoformatação estilo Notion, markdown puro, highlight de código |
| Tema | `next-themes` | light/dark sem flash, respeitando `prefers-color-scheme` |
| Upload | Uploadthing | paste/drop de imagem no editor |
| AI | Vercel AI SDK (`@ai-sdk/google`, `@ai-sdk/openai`, `@ai-sdk/anthropic`) | chat com o documento |
| Auth TOTP | `jose` + crypto nativo | sessão de Configurações via Google Authenticator |
| Animações | `motion` | animações de UI |
| Deploy | Vercel + Neon | custo zero |

Sem NextAuth, sem tabela de usuário, sem sistema de conta.

## 3. Modelo de dados (Prisma)

Hierarquia genérica de pastas e arquivos (árvore auto-referenciada), em vez de um modelo fixo de "disciplina/nota" — permite pastas dentro de pastas e múltiplos documentos por pasta.

```prisma
model No {
  id           String   @id @default(cuid())
  nome         String
  tipo         String   // "PASTA" ou "ARQUIVO"
  conteudo     String?  // markdown puro; null para pastas
  ordem        Int      @default(0)

  paiId        String?
  pai          No?      @relation("Filhos", fields: [paiId], references: [id], onDelete: Cascade)
  filhos       No[]     @relation("Filhos")

  criadoEm     DateTime @default(now())
  atualizadoEm DateTime @updatedAt

  @@index([paiId])
}

model Configuracao {
  id                           String    @id
  // TOTP (Google Authenticator)
  totpSecretCriptografado      String?
  totpConfiguradoEm            DateTime?
  // Políticas de segurança granulares
  exigirPinArvore              Boolean   @default(false)
  acessoArquivo                String    @default("LIVRE")  // "LIVRE" | "SESSAO" | "POR_ARQUIVO"
  exigirPinCriar               Boolean   @default(true)
  exigirPinEditar              Boolean   @default(true)
  exigirPinRenomear            Boolean   @default(true)
  exigirPinMoverCopiar         Boolean   @default(true)
  exigirPinExcluir             Boolean   @default(true)
  exigirPinExportar            Boolean   @default(false)
  exigirPinBusca               Boolean   @default(false)
  exigirPinCommandBar          Boolean   @default(true)
  exigirPinUploadImagem        Boolean   @default(true)
  exigirPinChatAi              Boolean   @default(true)
  // API Keys de AI (criptografadas com AES-256-GCM)
  googleApiKeyCriptografado    String?
  openaiApiKeyCriptografado    String?
  anthropicApiKeyCriptografado String?

  criadoEm     DateTime @default(now())
  atualizadoEm DateTime @updatedAt
}
```

- Raiz da árvore: nós com `paiId = null`.
- Deletar uma pasta cascateia pros filhos (`onDelete: Cascade`).
- `ordem` define a posição dentro do mesmo `paiId`. Ordenação atual: pastas antes de arquivos, depois alfabético por nome.
- `Configuracao` tem exatamente um registro (`id = "principal"`), criado na primeira leitura via `upsert`.

## 4. Autenticação

### 4.1 PIN para ações de escrita

Não existe gate de leitura por padrão. Toda **ação de mutação** (criar, renomear, deletar, salvar conteúdo, import de `.md`, comandos CLI, upload de imagem) passa por verificação de PIN, conforme as políticas ativas.

**Variáveis de ambiente:**
```
PIN_HASH=              # bcrypt hash do PIN de 6 dígitos
DATABASE_URL=          # connection string do Neon DB (PostgreSQL)
UPLOADTHING_TOKEN=     # token do Uploadthing para upload de imagens
SETTINGS_SETUP_KEY=    # segredo único usado no primeiro cadastro do Authenticator
TOTP_ENCRYPTION_KEY=   # chave Base64 de 32 bytes para criptografar o segredo TOTP (AES-256-GCM)
```

**Fluxo de PIN:**
1. A ação abre o `AlertDialog` com `InputOTP` de 6 dígitos **antes** de executar qualquer coisa.
2. O client chama a Server Action com o PIN e o payload juntos.
3. A Server Action valida o PIN via `bcrypt.compare` e, se válido, executa a mutação.
4. Após validação bem-sucedida, a ação pode conceder um **scope de sessão** — ex.: `liberarAcesso(pin, ["upload"])` armazena um token JWT em cookie httpOnly. Isso permite que ações secundárias não exijam re-digitação na mesma sessão de browser.

### 4.2 Políticas de segurança granulares

Todas as políticas são configuráveis na tela de Configurações (protegida por TOTP) e persistidas no modelo `Configuracao`. Políticas disponíveis:

| Política | Default | Descrição |
|---|---|---|
| `exigirPinArvore` | `false` | Exige PIN para visualizar a árvore de arquivos |
| `acessoArquivo` | `"LIVRE"` | Controle de acesso a arquivos: `LIVRE`, `SESSAO` ou `POR_ARQUIVO` |
| `exigirPinCriar` | `true` | PIN para criar pasta ou arquivo |
| `exigirPinEditar` | `true` | PIN para salvar conteúdo do editor |
| `exigirPinRenomear` | `true` | PIN para renomear |
| `exigirPinMoverCopiar` | `true` | PIN para `mv`/`cp` na Command Bar |
| `exigirPinExcluir` | `true` | PIN para deletar |
| `exigirPinExportar` | `false` | PIN para exportar nota como `.md` |
| `exigirPinBusca` | `false` | PIN para usar o Quick Open |
| `exigirPinCommandBar` | `true` | PIN para executar comandos na Command Bar |
| `exigirPinUploadImagem` | `true` | PIN para fazer upload de imagem |
| `exigirPinChatAi` | `true` | PIN para abrir o chat com IA |

### 4.3 Google Authenticator (TOTP) — Configurações

A tela de Configurações é protegida por **Google Authenticator (TOTP)**, não por PIN. Isso separa completamente a administração (políticas, API Keys) do acesso cotidiano (edição de notas).

**Fluxo de acesso às Configurações:**
1. Usuário abre o dialog de Configurações e digita o código de 6 dígitos do Authenticator.
2. A Server Action valida o código TOTP; se válido, cria uma **sessão de Configurações** (cookie JWT separado do PIN).
3. Ações dentro de Configurações (`atualizarPoliticasSeguranca`, `atualizarApiKey`, etc.) exigem que a sessão esteja ativa.

**Setup inicial do Authenticator:**
- Requer a `SETTINGS_SETUP_KEY` no environment.
- O segredo TOTP gerado é criptografado com AES-256-GCM usando `TOTP_ENCRYPTION_KEY` antes de ser persistido.
- Após o primeiro cadastro, `SETTINGS_SETUP_KEY` pode ser removida do environment.
- Para recuperação (Authenticator perdido): limpar `totpSecretCriptografado` e `totpConfiguradoEm` no registro `Configuracao` e cadastrar novamente com uma nova `SETTINGS_SETUP_KEY`.

## 5. Editor (Tiptap)

Extensões ativas:

| Extensão | Função |
|---|---|
| `StarterKit` | Headings, listas, bold/italic/strike, blockquote, hr. Input rules: `#`+espaço → H1, `-`+espaço → lista, etc. Code block desabilitado (substituído) |
| `CustomParagraph` | Serializa parágrafos vazios como `&nbsp;` para preservar linhas em branco exatas ao salvar/recarregar |
| `CustomCode` | Inline code com input rule para `` `backtick` `` |
| `Markdown` (`tiptap-markdown`) | Serializa/desserializa o doc como markdown puro (`html: true`, `breaks: true`, `tightLists: false`) |
| `Placeholder` | "Comece a escrever..." |
| `CustomCodeBlock` | Code block com lowlight, linguagens: `javascript`, `typescript`, `python`, `bash`, `json`, `css`, `html`, `sql` |
| `CustomTableBlock` | Suporte a tabelas GFM com aba visual e aba markdown raw; comando `/table` no editor |
| `ResizableImage` | Imagens redimensionáveis via drag nas alças laterais |
| `AiProposalBlock` | Bloco interativo de proposta de edição gerado pelo AI Chat, com diff linha a linha |
| `TaskList` + `CustomTaskItem` | Task lists (`- [ ]` / `- [x]`) com checkbox do shadcn |
| `Underline` | Sublinhado |

**Atalhos do editor:**

| Atalho | Ação |
|---|---|
| `Ctrl/Cmd + S` | Salvar nota (abre PIN se `exigirPinEditar`) |
| `Ctrl/Cmd + B` | Negrito no texto selecionado |
| `Ctrl/Cmd + Shift + B` | Alternar sidebar |
| `Ctrl/Cmd + /` | Toggle AI Chat lateral |

**Persistência (save manual, sem autosave):**
- Ao abrir um arquivo, `conteudo` (markdown) é parseado pro doc do Tiptap.
- Edições ficam em estado local até save explícito — sem debounce, sem chamada automática.
- `Ctrl+S` e o botão "Salvar" disparam o mesmo fluxo: abre PIN dialog → confirma → chama `salvarConteudo(pin, id, conteudo)`.
- Indicador de estado no topo do painel: `"Alterações não salvas"` → `"Salvo às HH:MM"`.
- Ao tentar trocar de arquivo com alterações não salvas, um dialog de confirmação intercepta a navegação.

**Upload de imagem:**
- Paste (`Ctrl+V`) ou drag-and-drop de imagem no editor interceptado pelo `handlePaste`/`handleDrop`.
- Upload client-side pro Uploadthing. Placeholder inline enquanto sobe; substituído pela imagem com a URL retornada.
- Se `exigirPinUploadImagem`, abre PIN dialog antes do upload.
- Ao deletar uma nota ou salvar com imagens removidas, os arquivos correspondentes são deletados do Uploadthing via `UTApi`.

**Export de nota:**
- Botão de download no header do editor exporta o conteúdo atual como `.md`.
- Se `exigirPinExportar`, exige PIN antes.

**Import de `.md`:**
- Disponível no menu de contexto de pasta e arquivo na sidebar, e em botão no header da sidebar.
- Lê o arquivo local e cria a nota com o conteúdo.
- Exige PIN (mesmo fluxo de `criarNo`).

## 6. AI Chat (Document Chat)

Chat com o documento aberto, usando o Vercel AI SDK. Acessível via `Ctrl+/` ou botão no header do editor.

- **Provedores suportados:** Google Gemini, OpenAI, Anthropic.
- **API Keys** configuradas na tela de Configurações (criptografadas em banco).
- O conteúdo atual do editor (markdown) é enviado como contexto em todas as mensagens.
- **AI Proposal Block:** o AI pode retornar propostas de edição estruturadas; cada proposta aparece como bloco interativo no editor com diff linha a linha. O usuário pode aceitar, rejeitar ou editar antes de aplicar.
- Se `exigirPinChatAi`, exige PIN antes de abrir o chat.
- Layout desktop: painel lateral redimensionável ao lado do editor (`ResizablePanelGroup`).
- Layout mobile: drawer (Sheet) sobreposto ao conteúdo.

## 7. Atalhos globais, Quick Open e Command Bar

**Hook global** registrado no layout raiz (`GlobalShortcuts`):

| Atalho | Ação |
|---|---|
| `Ctrl/Cmd + P` | Quick Open (busca fuzzy de arquivos por nome) |
| `Ctrl/Cmd + Shift + P` | Command Bar (CLI) |
| `Ctrl/Cmd + D` | Alternar tema light/dark |
| `Esc` | Fechar qualquer dialog/palette aberto |

**Quick Open (`Ctrl+P`):** componente `Command` do shadcn (cmdk), lista fuzzy-searchable dos arquivos da árvore. Se `exigirPinBusca`, exige PIN antes de abrir.

**Command Bar (`Ctrl+Shift+P`):** modal com input monoespaçado aceitando:

| Comando | Ação |
|---|---|
| `touch caminho/nota` | Cria ARQUIVO (cria pastas intermediárias que faltarem) |
| `mkdir caminho/pasta` | Cria PASTA (mesma lógica) |
| `rm caminho/item` | Deleta o nó (cascata se for pasta, deleta imagens do Uploadthing) |
| `cp origem destino` | Copia nó recursivamente |
| `mv origem destino` | Move/renomeia nó |

- `Tab` autocompleta segmentos de pasta comparando com os filhos do nó atual, client-side.
- Todos os comandos passam pelo fluxo de PIN (se `exigirPinCommandBar`).
- Erro ou caminho inexistente mostra erro inline sem fechar a palette.

## 8. Estrutura de rotas

```
/                      → página inicial com guia de atalhos (estado vazio)
/n/[noId]              → visualização/edição de um arquivo específico
```

Layout: sidebar (árvore completa, colapsável com `Ctrl+Shift+B`) + painel principal (breadcrumb + status de save + editor + AI Chat lateral).

## 9. Document Index

Índice automático de seções (headings H1–H3) do documento aberto.

- **Desktop:** painel lateral redimensionável ao lado do editor, com múltiplos estados (colapsado, expandido).
- **Mobile:** Sheet sobreposto.
- Scroll suave ao clicar em uma seção.
- Atualiza dinamicamente conforme o documento é editado.

## 10. Features (Status atual)

1. [x] Árvore de pastas/arquivos na sidebar (leitura livre, sem PIN) — **Concluído**
2. [x] Fluxo de PIN por ação, com sessão JWT via cookie e políticas granulares — **Concluído**
3. [x] CRUD de nó: criar pasta, criar arquivo, renomear, deletar — **Concluído**
4. [x] Editor com autoformatação + syntax highlight + save manual + indicador de estado + preservação de quebras de linha — **Concluído**
5. [x] Toggle de tema light/dark (`Ctrl+D`) — **Concluído**
6. [x] Busca simples client-side por nome de arquivo/pasta (Quick Open) — **Concluído**
7. [x] Paste e drag-and-drop de imagem com upload via Uploadthing — **Concluído**
8. [x] Atalhos globais, Quick Open (`Ctrl+P`) e Command Bar (`Ctrl+Shift+P`) com suporte a `touch`, `mkdir`, `rm`, `cp`, `mv` e Tab autocompletion — **Concluído**
9. [x] Configurações com Google Authenticator (TOTP) e políticas de segurança granulares — **Concluído**
10. [x] AI Chat com o documento (Google Gemini, OpenAI, Anthropic) + AI Proposal Block — **Concluído**
11. [x] Task Lists (`- [ ]` / `- [x]`) — **Concluído**
12. [x] Tabelas GFM com aba visual e markdown — **Concluído**
13. [x] Import de `.md` pela sidebar — **Concluído**
14. [x] Export de nota como `.md` — **Concluído**
15. [x] Document Index (índice de seções do documento) — **Concluído**
16. [x] Suporte mobile (layout responsivo, Sheet para AI Chat e Document Index) — **Concluído**
17. [ ] Drag-to-reorder dentro da mesma pasta (v2)
18. [ ] Full-text search no Postgres (v2, se a busca client-side ficar lenta)

## 11. Fora de escopo (de propósito)

- Multi-usuário / times / compartilhamento
- Blocos arrastáveis (editor é linear, markdown-first)
- Offline-first / PWA
- Qualquer sistema de conta/login de verdade

## 12. Deploy

Vercel (Next.js) + Neon (Postgres). Todas as variáveis de ambiente (`DATABASE_URL`, `PIN_HASH`, `UPLOADTHING_TOKEN`, `SETTINGS_SETUP_KEY`, `TOTP_ENCRYPTION_KEY`) como env vars no Vercel.
