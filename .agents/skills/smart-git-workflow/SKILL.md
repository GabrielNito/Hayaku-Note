---
name: smart-git-workflow
description: >-
  Executa o fluxo automatizado de Git quando o usuário der ordens como 'pode commitar',
  'pode commitar e pushar', 'comita isso', 'salva no git', ou 'faz o commit'.
  Gerencia branches semânticas, validação de contexto, Conventional Commits e push.
---

# Smart Git Workflow & Conventional Commits

Use esta skill sempre que o usuário solicitar commitar ou commitar/pushar alterações no projeto.

## Protocolo de Execução

### 1. Diagnóstico do Repositório
Execute os comandos de inspeção:
1. `git status -s` (para verificar arquivos modificados, adicionados ou não rastreados).
2. `git branch --show-current` (para checar em qual branch está).
3. `git diff --stat` (para entender o escopo e os arquivos que foram alterados).

### 2. Validação e Gestão de Branch (GitHub Flow)
- **Se a branch atual for `main` ou `master`**:
  - Identifique o tipo de mudança predominante:
    - Nova funcionalidade $\rightarrow$ `feature/<nome-kebab-case>`
    - Correção de bug $\rightarrow$ `fix/<nome-kebab-case>`
    - Refatoração de código $\rightarrow$ `refactor/<nome-kebab-case>`
    - Dependências, configs, build, CI $\rightarrow$ `chore/<nome-kebab-case>`
    - Documentação $\rightarrow$ `docs/<nome-kebab-case>`
    - Testes isolados $\rightarrow$ `test/<nome-kebab-case>`
  - Crie e mude para a nova branch: `git checkout -b <prefixo>/<nome-descritivo>`.
- **Se a branch atual for uma branch específica (ex: `feature/totem-cart`, `fix/login-auth`)**:
  - **Validação Semântica**: Compare os arquivos modificados com o nome/propósito da branch atual.
  - **Se houver divergência clara de contexto** (ex: branch é de `totem-cart`, mas a alteração foi um fix em `auth-jwt`):
    - Alerte o usuário no chat: *"Você está na branch `<branch-atual>`, mas as alterações parecem ser de `<escopo-detectado>`. Deseja criar uma nova branch `<tipo>/<nome-sugerido>` ou commitar aqui mesmo?"* e aguarde ou siga a preferência indicada.
  - **Se o conteúdo estiver alinhado com a branch atual**:
    - Permaneça na branch atual.

### 3. Higiene e Staging
- **Nunca adicione arquivos com segredos ou temporários**: `.env`, `.env.local`, `.env.*.local`, chaves privadas `.pem`/certificados.
- **Nunca adicione artefatos de build ou dependências**: `dist/`, `.next/`, `build/`, `node_modules/`, `coverage/`.
- Adicione os arquivos modificados relevantes usando `git add <arquivos>` de forma limpa e atômica.

### 4. Criação do Conventional Commit
Monte a mensagem seguindo o padrão:
```
<tipo>(<escopo opcional>): <descrição em imperativo>

[corpo opcional explicando o porquê da mudança]
```

**Regras de escrita:**
- **Tipos**: `feat`, `fix`, `chore`, `refactor`, `perf`, `docs`, `style`, `test`, `build`, `ci`.
- **Escopos recomendados**: `(auth)`, `(totem)`, `(painel)`, `(api)`, `(prisma)`, `(kiosk)`, `(deps)`, `(ui)`.
- **Verbo no modo imperativo em português**:
  - Ex: `adiciona`, `corrige`, `refatora`, `atualiza`, `remove`, `implementa`.
- **Formatação**: Minúsculas, sem ponto final, máximo de 72 caracteres no título.

**Exemplos:**
- `feat(totem): adiciona integração com leitor de cartão Mercado Pago Point`
- `fix(painel): corrige atualização de status de pedidos em tempo real`
- `chore(prisma): atualiza schema e adiciona migration de clientes`
- `refactor(kiosk): centraliza máquina de estados do carrinho de compras`

### 5. Execução do Commit e Push
1. Execute: `git commit -m "<mensagem>"`
2. **Se o usuário solicitou push** (ex: *"pode commitar e pushar"*, *"comita e sobe"*):
   - Execute: `git push -u origin <branch-atual>`
3. **Se o usuário pediu apenas commit** (ex: *"pode commitar"*):
   - Confirme que o commit local foi realizado e informe que a branch está pronta para push quando desejar.

### 6. Relatório de Finalização
Retorne uma resposta concisa no chat:
- 🌿 **Branch**: `<nome-da-branch>`
- 📝 **Commit**: `<mensagem-do-commit>`
- 📁 **Arquivos**: Quantidade ou lista sucinta dos arquivos alterados
- 🚀 **Status do Push**: Se foi enviado para o repositório remoto ou se ficou local
