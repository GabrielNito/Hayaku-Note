# Hayaku Note — Anotações de aula, sem login, sem lock-in

> Nome sugerido: **Hayaku Note**. Troque à vontade — não afeta schema ou código.
> Design system completo: ver `DESIGN.md`.

## 1. Objetivo

App pessoal de anotações de aula, separado do Notion e das anotações pessoais. **Leitura é sempre livre, sem gate nenhum** — o único atrito é um PIN de 6 dígitos exigido nas ações de escrita (criar, salvar, deletar), pra colegas de sala não mexerem no conteúdo. Conteúdo salvo como **markdown puro** no banco, sem lock-in de formato.

## 2. Stack

| Camada | Escolha | Motivo |
|---|---|---|
| Runtime/pkg manager | Bun | padrão que você já usa |
| Framework | Next.js 15 (App Router) + TypeScript | full-stack num projeto só |
| UI | shadcn/ui + Tailwind | já iniciado nesse formato |
| ORM | Prisma | tipagem + migrations |
| Banco | Neon (Postgres serverless) | plano free cobre de sobra, mesmo banco do Yumeji |
| Editor | Tiptap + `tiptap-markdown` + `@tiptap/extension-code-block-lowlight` | autoformatação estilo Notion, markdown puro, highlight de código |
| Tema | `next-themes` | light/dark sem flash, respeitando `prefers-color-scheme` |
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
```

- Raiz da árvore: nós com `paiId = null`.
- Deletar uma pasta cascateia pros filhos (`onDelete: Cascade`).
- `ordem` define a posição dentro do mesmo `paiId` (drag-to-reorder é opcional, pode ficar pra v2 — sem isso, ordena por `ordem` e depois `nome`).

## 4. Autenticação por PIN (não é login, e não é sessão)

Não existe gate de leitura, e **não existe cookie de sessão nem estado de "desbloqueado"**. Motivo: a máquina fica ligada e acessível fisicamente, então uma sessão temporizada não protege nada — alguém sentando no teclado nos primeiros segundos já teria acesso. Em vez disso, **toda ação de mutação exige o PIN naquele exato momento**, sempre, sem exceção e sem cache.

**Variáveis de ambiente:**
```
PIN_HASH=              # bcrypt hash do PIN de 6 dígitos, gerado uma vez com um script local
DATABASE_URL=          # connection string do Neon DB (PostgreSQL)
```

Sem `SESSION_SECRET`, sem cookie, sem middleware de auth. O PIN em si fica fixo no `.env` (`PIN_HASH`) — você mesmo decidiu manter isso hardcoded, não há problema, é só o hash que fica lá, nunca o PIN em texto puro.

**Fluxo:**
1. Toda ação de escrita relevante (criar pasta/arquivo, renomear, deletar, salvar conteúdo) abre o `AlertDialog` com `InputOTP` de 6 dígitos (ver `DESIGN.md`) **antes** de executar qualquer coisa — não é um fallback condicional, é sempre o primeiro passo.
2. O client chama a Server Action correspondente já com o PIN digitado e o payload da ação juntos, ex: `salvarConteudo(pin, id, conteudo)`, `deletarNo(pin, id)`.
3. A Server Action compara o `pin` recebido com `PIN_HASH` via `bcrypt.compare` **naquela mesma chamada**. Se bater, executa a mutação e retorna sucesso. Se não bater, retorna erro, sem executar nada.
4. Não há nada persistido entre uma ação e outra — a próxima mutação, um segundo depois, pede o PIN de novo.

Isso significa que ler/navegar pelas notas nunca pede nada, mas qualquer criação, renomeação, exclusão ou alteração de conteúdo pede o PIN, sempre, mesmo que a última tenha sido há 5 segundos.

## 5. Editor (Tiptap)

Extensões:
- `StarterKit` — headings, listas, bold/italic, blockquote, hr, input rules de autoformatação (`#` + espaço → H1, `-` + espaço → lista, etc.)
- `CustomParagraph` — extensão customizada de parágrafo que serializa parágrafos vazios como `&nbsp;` para garantir preservação exata de linhas em branco sem colapso ao salvar/recarregar
- `Markdown` (`tiptap-markdown`) — serializa/desserializa o doc como markdown puro (configurado com `html: true` e `breaks: true`)
- `Placeholder` — "Comece a escrever..."
- `CodeBlockLowlight` (`@tiptap/extension-code-block-lowlight`) — highlight de código, linguagens registradas conforme `DESIGN.md`

**Atalhos de teclado:**
- `Ctrl/Cmd + S`: Dispara o fluxo de salvamento manual (solicita PIN)
- `Ctrl/Cmd + B`: Aplica ou remove formatação de **negrito** no texto selecionado do editor
- `Ctrl/Cmd + Shift + B`: Alterna a visibilidade da barra lateral (sidebar)

**Persistência (save manual, sem autosave):**
- Ao abrir um arquivo, `conteudo` (markdown) é parseado pro doc do Tiptap.
- Edições ficam só em estado local do editor até um save explícito — sem debounce, sem chamada automática ao servidor a cada digitação, porque cada save agora pede PIN (pedir PIN a cada 1.5s de digitação seria inviável).
- `Ctrl/Cmd+S` (com `preventDefault` no evento do browser) e um botão "Salvar" visível disparam o mesmo fluxo: abre o `AlertDialog` de PIN → confirma → chama `salvarConteudo(pin, id, conteudo)`.
- Indicador de estado: texto pequeno no topo do painel — `"Alterações não salvas"` (enquanto há edição pendente) → `"Salvo às HH:MM"` (após confirmar o PIN e salvar com sucesso). Sem "Salvando..." automático, já que o save não é automático.
- Ao tentar sair da página/trocar de arquivo com alterações não salvas, mostrar um aviso simples (`beforeunload` / confirmação local) pra não perder o texto.

## 6. Estrutura de rotas

```
/                      → abre o primeiro arquivo da árvore (ou estado vazio "criar seu primeiro arquivo")
/n/[noId]              → visualização/edição de um arquivo específico
```

Não existe `/login`. Toda a navegação de pastas acontece na sidebar (client-side, sem troca de rota necessária pra abrir/fechar pastas — só `/n/[noId]` muda a URL, ao abrir um arquivo).

Layout: sidebar (árvore completa, colapsável 100% com `Ctrl/Cmd+Shift+B`) + painel principal (breadcrumb + status de save + editor), conforme `DESIGN.md`.

## 7. Features (Status v1)

1. [x] Árvore de pastas/arquivos na sidebar (leitura livre, sem PIN) — **Concluído v1**
2. [x] Fluxo de PIN por ação, sem sessão (seção 4) — **Concluído v1**
3. [x] CRUD de nó: criar pasta, criar arquivo, renomear, deletar — cada ação passa pelo `AlertDialog` de PIN — **Concluído v1**
4. [x] Editor com autoformatação + syntax highlight + save manual (`Ctrl+S`/botão, com PIN) + indicador de estado + preservação exata de quebras de linha — **Concluído v1**
5. [x] Toggle de tema light/dark — **Concluído v1**
6. [x] Busca simples client-side por nome de arquivo/pasta — **Concluído v1**
7. [x] Paste de imagem com upload via Uploadthing (usando `file.ufsUrl`) — **Concluído v1**
8. [x] Atalhos globais, Quick Open (`Ctrl+P`) e Command Bar (`Ctrl+Shift+P`) com suporte a CLI (`touch`, `mkdir`, `rm`, `cp`, `mv`) e Tab autocompletion — **Concluído v1**
9. [x] Página/Dialog completa de Configurações e Políticas de Segurança granulares com Google Authenticator (TOTP) — **Concluído v1**
10. [ ] Drag-to-reorder dentro da mesma pasta (opcional, v2)

## 8. Fora de escopo (de propósito)

- Multi-usuário / times / compartilhamento
- Blocos arrastáveis estilo Notion (editor é linear, markdown-first)
- Anexos/upload de arquivo (se precisar depois, dá pra plugar Uploadthing como no catálogo)
- Offline-first / PWA
- Qualquer sistema de conta/login de verdade

## 9. Deploy

Vercel (Next.js) + Neon (Postgres). `DATABASE_URL` e `PIN_HASH` como env vars no Vercel.
