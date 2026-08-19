# Tasks — Mesa-Pad

Backlog de features já especificadas em `SPEC.md`/`DESIGN.md`, mas fora do prompt inicial (que já está rodando). Cada item abaixo tem um prompt pronto — quando o núcleo estiver de pé, cola o prompt correspondente direto no OpenCode, sem precisar voltar aqui pra reformular nada.

---

## 1. Paste de imagem (Uploadthing)

**Spec:** `SPEC.md` seção 5 ("Imagens"), `DESIGN.md` (nota de estilo de imagem em "Área de conteúdo").

**Status:** especificado, não implementado.

**Prompt:**

```
O projeto Mesa-Pad já está implementado (schema, PIN, CRUD de No, editor Tiptap com
save manual). Agora adicione suporte a colar imagem direto no editor, conforme a seção
"Imagens" da seção 5 do SPEC.md e a nota de estilo de imagem no DESIGN.md:

1. Adicionar `@tiptap/extension-image` ao editor.
2. Configurar `editorProps.handlePaste` pra interceptar item de imagem colado
   (image/*), prevenindo o comportamento padrão de embutir como base64.
3. Upload client-side pro Uploadthing. Confira a documentação atual do Uploadthing
   pro nome exato das env vars antes de implementar (variou entre
   UPLOADTHING_SECRET/APP_ID e UPLOADTHING_TOKEN dependendo da versão).
4. Mostrar um placeholder simples ("Enviando imagem...") no lugar do texto
   enquanto o upload roda; substituir pelo nó Image com a URL retornada ao terminar.
5. Esse upload NÃO passa pelo fluxo de PIN — só o save da nota (Ctrl+S já
   existente) passa.
6. Estilo da imagem: largura máxima = largura do conteúdo do editor, sem sombra,
   `rounded-sm` no máximo — ver DESIGN.md.

Teste: colar um print de tela numa nota existente, confirmar que a imagem aparece,
salvar a nota (PIN), recarregar a página e confirmar que o markdown persistiu com a
URL da imagem.
```

---

## 2. Atalhos de teclado globais + Command Bar

**Spec:** `SPEC.md` seção 9 ("Atalhos de teclado e Command Bar"), `DESIGN.md` ("Quick Open e Command Bar").

**Status:** especificado, não implementado.

**Prompt:**

```
O projeto Mesa-Pad já está implementado (schema, PIN, CRUD de No, editor Tiptap,
sidebar, tema). Agora adicione navegação 100% por teclado, conforme a seção 9 do
SPEC.md e a seção "Quick Open e Command Bar" do DESIGN.md:

1. Hook global único (ex: useAtalhosGlobais), registrado no layout raiz, cuidando de:
   - Ctrl/Cmd+D → alterna tema light/dark via useTheme() do next-themes (a lib NÃO
     tem esse atalho nativo, é implementação nossa)
   - Ctrl/Cmd+P → abre Quick Open (busca fuzzy de arquivos)
   - Ctrl/Cmd+Shift+P → abre a Command Bar
   - Esc → fecha qualquer dialog/palette aberto
   Todos com preventDefault() (Ctrl+P e Ctrl+D colidem com atalhos nativos do
   browser). Ctrl/Cmd+B do sidebar já é nativo do SidebarProvider do shadcn, não
   reimplementar — só garantir que ele não dispare quando o foco estiver dentro do
   editor Tiptap (onde Ctrl+B já significa negrito).

2. Quick Open (Ctrl+P): componente Command do shadcn (cmdk), lista fuzzy-searchable
   dos arquivos da árvore, abre o arquivo selecionado ao confirmar.

3. Command Bar (Ctrl+Shift+P): modal com um único input monoespaçado aceitando:
   - `touch caminho/para/arquivo` → cria ARQUIVO, criando pastas intermediárias
     que faltarem
   - `mkdir caminho/para/pasta` → cria PASTA, mesma lógica de criação intermediária
   - `rm caminho/para/algo` → deleta o nó (cascata se for pasta)
   Sem extensão .md no nome — o comando já define o tipo do nó. Tab autocompleta
   segmentos de pasta comparando com os filhos do nó atual na árvore, client-side.
   Confirmar com Enter dispara a Server Action correspondente (criarNo/deletarNo)
   através do MESMO fluxo de PIN já existente — a Command Bar não pula o PIN, só
   oferece outra forma de disparar a mesma mutação. Comando inválido ou caminho
   inexistente (pro rm) mostra erro inline, sem fechar a palette.

Teste: abrir Quick Open e pular pra um arquivo existente; abrir a Command Bar e
criar uma pasta nova com `mkdir` seguida de um arquivo dentro dela com `touch`,
confirmando que o PIN é pedido em ambos; testar Tab completando um caminho parcial
que já existe na árvore.
```

---

## Backlog não especificado ainda (ideias soltas, sem spec pronta)

- `mv`/rename via Command Bar
- `ls`/preview do que será afetado antes de confirmar um `rm`
- Drag-to-reorder na sidebar
- Full-text search no Postgres (se a busca client-side ficar lenta com muitos arquivos)
