# Design.md — Hayaku Note

## Princípios

- Minimalismo funcional: se um elemento não ajuda a ler, escrever ou navegar, ele não existe.
- Hierarquia visual por tipografia e espaçamento, não por cor ou ícone.
- Troca de tema instantânea, sem recarregar dados, sem "flash" de tema errado no load.

## Paleta e tema

- Baseado no sistema de CSS variables integrado ao Tailwind CSS v4 (`--background`, `--foreground`, `--muted`, `--border`, `--accent`, `--ring`...).
- **3 Famílias / Paletas de Cores:**
  1. **Catppuccin (Pastel Suave)**:
     - **Frappé (Dark)**: Fundo `#303446` (Base), sidebar `#292c3c` (Mantle), texto `#c6d0f5` (lavanda suave), acento `#babbf1` (Lavender).
     - **Latte (Light)**: Fundo `#eff1f5` (creme suave), sidebar `#e6e9ef`, texto `#4c4f69`, acento `#7287fd`.
  2. **Discord (Suave / Baixo Contraste)**:
     - **Dark**: Fundo cinza ardósia `#313338`, sidebar `#2b2d31`, texto suave `#dbdee1`, acento `#5865f2` (Blurple).
     - **Light**: Fundo cinza suave `#f2f3f5`, sidebar `#e3e5e8`, texto chumbo `#2e3338`, acento `#5865f2`.
  3. **Padrão / Clássico (Alto Contraste)**:
     - **Dark**: Preto profundo `#09090b` / `#18181b` com texto branco puro `#fafafa`.
     - **Light**: Branco puro `#ffffff` com texto preto.
- A paleta global padrão é sincronizada no banco de dados (`Configuracao.tema`).
- Alternância instantânea de modo (**Escuro** ⇄ **Claro**) via atalho global `Ctrl/Cmd+D` ou tecla `D` (quando fora de inputs), e pelo botão no rodapé da barra lateral.

## Tipografia

- UI e corpo: uma sans-serif neutra e única em todos os pesos (Inter ou Geist Sans) — sem misturar famílias decorativas.
- Código e metadados (datas, caminho de pasta, contadores): monoespaçada (IBM Plex Mono ou Geist Mono), levemente menor que o corpo.
- Escala enxuta: no máximo 3-4 tamanhos (título de nota, corpo, metadado pequeno, título de seção da sidebar).

## Sidebar (componente `Sidebar` do shadcn)

- `collapsible="offcanvas"` — ao colapsar, some 100%, sem rail de ícones.
- Toggle via `Ctrl/Cmd+Shift+B` (handler manual no editor) ou clique no `SidebarTrigger`.
- Árvore de pastas/arquivos tipográfica com ícones discretos do Lucide (`Folder`/`FolderOpen` para pastas, peso diferente para arquivos). Indentação progressiva + linha vertical sutil (`border-l`) conectando níveis.
- Item selecionado: fundo `--accent` suave, sem borda colorida forte.
- Menu de contexto (⋮) por item: criar pasta, criar arquivo, renomear, deletar, importar `.md`.
- Botão de import no header da sidebar (importa `.md` na raiz).
- Rodapé: toggle de tema + acesso às Configurações.
- Animações de abertura/fechamento de pasta via `motion` (AnimatePresence).

## Área de conteúdo

### Header do editor
Barra fina no topo do painel de conteúdo:
- **Esquerda:** `SidebarTrigger` + breadcrumb do caminho (`Pasta / Subpasta / Arquivo`).
- **Direita:** status de save (`Alterações não salvas` → `Salvo às 14:32`, texto pequeno, fade in/out, sem toast/popup) + botões de ação (Salvar, Export `.md`, Document Index, AI Chat).

### Editor
- Largura máxima ~720px, centralizado, mesmo em telas largas — otimizado pra leitura, não pra preencher a tela.
- Placeholder do editor vazio: "Comece a escrever...", cinza claro, sem ilustração.

### Layout resizável (desktop)
- `ResizablePanelGroup` horizontal: painel do editor + painel lateral (Document Index ou AI Chat).
- O painel lateral pode ser colapsado ou redimensionado com drag.

### Layout mobile
- Painel lateral (Document Index, AI Chat) exibido em `Sheet` sobreposto ao conteúdo, disparado por botão no header.

## Document Index

Índice automático de seções (H1–H3) do documento aberto.
- **Desktop:** painel lateral redimensionável, com estados colapsado/expandido.
- **Mobile:** Sheet.
- Itens clicáveis com scroll suave para a seção correspondente.
- Atualiza em tempo real conforme o documento é editado.

## AI Chat (Document Chat)

Chat lateral com o documento aberto.
- **Desktop:** painel lateral redimensionável, abre com `Ctrl+/` ou botão no header.
- **Mobile:** Sheet.
- Provedores: Google Gemini, OpenAI, Anthropic (selecionáveis no header do chat).
- Conteúdo atual do editor enviado como contexto.
- **AI Proposal Block:** bloco interativo inserido no editor com proposta de edição e diff linha a linha. O usuário aceita, rejeita ou edita antes de aplicar.

## Syntax highlighting

- `CustomCodeBlock` baseado em `@tiptap/extension-code-block-lowlight` com `lowlight`.
- Linguagens e aliases registrados: `javascript` (`js`, `jsx`, `mjs`), `typescript` (`ts`, `tsx`), `python` (`py`), `bash` (`sh`, `zsh`), `json` (`jsonc`), `css` (`scss`), `html` (`xml`), `sql`.
- Cores de sintaxe ricas e adaptativas por tema:
  - **Catppuccin**: Mauve para palavras-chave, Blue para funções, Green para strings, Yellow para tipos, Peach para números/booleanos, Red para JSX tags, Teal para atributos.
  - **Discord**: Coral pink em palavras-chave, Sky blue em funções, Emerald green em strings, Discord gold em tipos.
  - **Clássico**: Esquema One Dark no modo escuro e GitHub Light no modo claro.
- Code block com botão de copiar, animações iOS e seletor de linguagem no topo.

## Task Lists

- Renderizadas via `TaskList` + `CustomTaskItem` (Tiptap).
- Checkbox usa o componente `Checkbox` do shadcn, com alinhamento vertical perfeito.
- Item marcado recebe `line-through` e cor `text-muted-foreground`.
- Input rule: `- [ ]` + espaço → task list.

## Tabelas

- `CustomTableBlock`: suporte a tabelas GFM com duas abas — Visual (tabela renderizada) e Markdown (raw).
- Comando `/table` no editor insere uma tabela nova.
- Tabela visual usa `ScrollArea` para overflow horizontal.

## Dialog de PIN (ações protegidas)

- Toda ação de mutação (criar, salvar, deletar, renomear, import, comandos CLI, upload de imagem) passa por verificação de PIN, conforme as políticas de segurança ativas — ver `SPEC.md` seção 4.
- Componente: `AlertDialog` do shadcn + `InputOTP` (pacote `input-otp`), 6 slots.
- **Mascarar os dígitos:** cada slot preenchido exibe `•` em vez do caractere digitado.
- Erro de PIN: shake sutil no dialog + mensagem pequena em vermelho neutro (não saturado).
- Após validação bem-sucedida, um scope de sessão é concedido via cookie JWT (ex: `["upload"]`, `["search"]`), evitando re-digitação para ações secundárias na mesma sessão.

## Configurações

Dialog acessível pelo rodapé da sidebar, protegido por **Google Authenticator (TOTP)**.

- **Autenticação:** input de 6 dígitos do Authenticator cria uma sessão de Configurações (cookie JWT separado do PIN).
- **Setup inicial:** exige `SETTINGS_SETUP_KEY`; gera QR Code para cadastrar no Google Authenticator.
- **Políticas de segurança:** toggles para cada política (`exigirPinEditar`, `exigirPinCriar`, etc.) — ver tabela completa em `SPEC.md` seção 4.2.
- **API Keys de AI:** campos para Google, OpenAI e Anthropic, criptografadas em banco.
- **Troca de Authenticator:** fluxo de troca com validação do código atual + cadastro do novo.

## O que NÃO existe nessa UI

- Sem avatares, badges coloridos, gradientes ou sombras pesadas (máximo `shadow-sm` em dialogs).
- Sem emojis em nome de pasta/arquivo.
- Sem onboarding/tour na primeira visita.
- Sem notificações/toasts para ações de save (o status inline no header substitui).
