# Design.md — Mesa-Pad

## Princípios

- Minimalismo funcional: se um elemento não ajuda a ler, escrever ou navegar, ele não existe.
- Hierarquia visual por tipografia e espaçamento, não por cor ou ícone.
- Troca de tema instantânea, sem recarregar dados, sem "flash" de tema errado no load.

## Paleta e tema

- Baseado no sistema de CSS variables do shadcn (`--background`, `--foreground`, `--muted`, `--border`, `--accent`, `--ring`...), usando a paleta **neutral** ou **zinc** como base — sem tons quentes/coloridos por padrão.
- **Light**: fundo quase-branco, texto quase-preto, bordas cinza bem claras.
- **Dark**: fundo cinza-muito-escuro (não preto puro — cansa menos visualmente), texto cinza-claro, bordas sutis.
- Um único **accent color** (ex: um azul-acinzentado neutro) reservado exclusivamente para: item selecionado na sidebar, foco de input, cursor/seleção no editor. Nenhum outro elemento usa cor de destaque.
- Alternância via `next-themes`: respeita `prefers-color-scheme` por padrão, com toggle manual discreto no rodapé da sidebar (texto "Claro/Escuro" ou ícone simples, sua escolha).

## Tipografia

- UI e corpo: uma sans-serif neutra e única em todos os pesos (Inter ou Geist Sans) — sem misturar famílias decorativas.
- Código e metadados (datas, caminho de pasta, contadores): monoespaçada (IBM Plex Mono ou Geist Mono), levemente menor que o corpo.
- Escala enxuta: no máximo 3-4 tamanhos (título de nota, corpo, metadado pequeno, título de seção da sidebar).

## Sidebar (componente `Sidebar` do shadcn)

- `collapsible="offcanvas"` — ao colapsar, some 100%, sem rail de ícones.
- O `SidebarProvider` já expõe `Ctrl/Cmd+B` nativamente como atalho de toggle — não precisa handler de teclado manual.
- Árvore de pastas/arquivos puramente tipográfica: pasta em peso médio (ou leve caixa-alta), arquivo em peso normal. Indentação progressiva + uma linha vertical sutil (`border-l`) conectando níveis. Sem ícones de pasta/arquivo — a hierarquia se lê pelo peso e indentação.
- Item selecionado: fundo `--accent` suave, sem borda colorida forte.
- Rodapé: só o toggle de tema, texto pequeno.

## Área de conteúdo

- Sem navbar tradicional. Barra fina no topo do painel: breadcrumb do caminho (`Pasta / Subpasta / Arquivo`) à esquerda + status de save à direita (`Alterações não salvas` → `Salvo às 14:32`, texto pequeno, fade in/out, sem toast/popup). Sem estado intermediário de "salvando", já que o save é manual e imediato após o PIN.
- Editor com largura máxima ~720px, centralizado, mesmo em telas largas — otimizado pra leitura, não pra preencher a tela.
- Placeholder do editor vazio: "Comece a escrever...", cinza claro, sem ilustração.

## Syntax highlighting

- `@tiptap/extension-code-block-lowlight` com `lowlight` (core — não o `highlight.js` inteiro, bundle menor).
- Registrar só as linguagens usadas nas aulas: `javascript`, `typescript`, `python`, `bash`, `json`, `css`, `html`, `sql` — evita carregar gramática de ~190 linguagens à toa.
- Tema do highlight: paleta neutra customizada via CSS variables próprias (`--code-keyword`, `--code-string`, `--code-comment`...), reescritas pra bater com as duas paletas (light/dark) do app, em vez de importar um tema pronto de terceiro.

## Dialog de PIN (ações protegidas)

- Toda ação de mutação (criar pasta/arquivo, salvar, deletar, renomear) passa por verificação de PIN de 6 dígitos **sempre**, sem sessão nem cache — ver seção de auth do `SPEC.md`. Por isso o save do editor é manual (`Ctrl+S`/botão), não automático: pedir PIN a cada 1.5s de digitação inviabilizaria o uso.
- Componente: `AlertDialog` do shadcn + `InputOTP` (pacote `input-otp`), 6 slots.
- **Mascarar os dígitos**: o `input-otp` não tem uma prop nativa tipo `type="password"`, mas dá pra mascarar customizando o `render` de cada slot — em vez de mostrar o caractere digitado (`slot.char`), renderiza um `•` quando o slot está preenchido. É o padrão comum pra PIN inputs com essa lib. Confirme a API exata do slot render na documentação atual do `input-otp` antes de implementar — a lib evolui — mas a abordagem é essa.
- Erro de PIN: shake sutil no dialog + mensagem pequena em vermelho neutro (não saturado).

## O que NÃO existe nessa UI

- Sem avatares, badges coloridos, gradientes ou sombras pesadas (máximo `shadow-sm` em dialogs).
- Sem emojis em nome de pasta/arquivo.
- Sem onboarding/tour na primeira visita.
