# Hayaku Note

Um caderno de anotações minimalista, pessoal e sem atrito, com navegação rápida por teclado, políticas de segurança granulares e assistente de IA integrado.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/gabrielnito/hayaku-note&env=DATABASE_URL,PIN_HASH,UPLOADTHING_TOKEN,SETTINGS_SETUP_KEY,TOTP_ENCRYPTION_KEY&project-name=hayaku-note&repository-name=hayaku-note)
![License](https://img.shields.io/badge/license-MIT-black)
![Stack](https://img.shields.io/badge/stack-Next.js%20%2B%20Bun%20%2B%20Prisma%20%2B%20Tailwind-black)

[🇺🇸 Read README in English](../README.md)

---

## O que é o Hayaku Note?

O **Hayaku Note** foi criado para eliminar o atrito de tomar notas e organizar conhecimento pessoal. Não existem contas tradicionais, fluxos de login com senha ou sobrecarga pesada de workspaces. Em vez disso, você tem um espaço ágil, controlado por teclado e armazenado como Markdown puro no seu próprio banco de dados — com proteção opcional por PIN de 6 dígitos e painel administrativo protegido por Google Authenticator (TOTP).

- **Sem atrito de login, sem contas tradicionais.** Sem tabelas de usuários ou OAuth complexo. O uso no dia a dia pode ser livre ou protegido por PIN de 6 dígitos com escopos de sessão.
- **Políticas de segurança granulares.** Totalmente configuráveis por uma tela de Configurações protegida por 2FA (TOTP). Você escolhe se as notas são públicas ou privadas, se exigem PIN por sessão/arquivo, na busca, barra de comandos, upload de imagens ou chat com IA.
- **Sem lock-in de formato.** Todo o conteúdo é armazenado como Markdown puro no PostgreSQL. Importe e exporte notas em `.md` a qualquer momento.
- **Assistente de IA integrado ao documento.** Converse diretamente com o arquivo aberto usando Google Gemini, OpenAI ou Anthropic (chaves de API próprias, salvas criptografadas com AES-256-GCM). A IA gera propostas de edição com diffs visuais linha a linha para você aceitar ou rejeitar no editor.
- **Navegação por teclado e Barra de Comandos (CLI).** Busca rápida (`Ctrl+P`), Command Bar modal (`Ctrl+Shift+P`) com comandos no estilo terminal (`touch`, `mkdir`, `rm`, `cp`, `mv`) e autocompletar com Tab.
- **Custo zero de hospedagem.** Projetado para rodar 100% nos planos gratuitos da Vercel, Neon e Uploadthing.

---

## Funcionalidades

- 📝 **Editor Tiptap Markdown**: Regras de autoformatação instantânea (`#`, `-`, `>`), listas de tarefas (`- [ ]`), tabelas GFM com abas visual e markdown bruto, código inline e blocos de código com destaque de sintaxe (JS, TS, Python, Bash, SQL, JSON, HTML, CSS), botão de cópia e seleção de linguagem.
- 🖼️ **Colagem e Arrastar Imagens**: Cole capturas de tela ou arraste imagens direto no editor com upload para o Uploadthing e alças de redimensionamento.
- 🤖 **Chat com IA no Documento**: Interaja com suas notas usando Gemini, OpenAI ou Anthropic. Receba blocos de proposta com diffs linha a linha para aplicar direto no texto.
- ⚡ **Command Bar CLI e Quick Open**: Busca difusa rápida (`Ctrl+P`) e modal CLI (`Ctrl+Shift+P`) para criar, mover, copiar e excluir notas e pastas sem tocar no mouse.
- 📑 **Índice Dinâmico do Documento (TOC)**: Navegação automática por cabeçalhos (H1–H3) com rolagem suave e suporte responsivo a Sheet no mobile.
- 🔒 **Segurança Granular & Google Authenticator (TOTP)**: Painel de configurações protegido por 2FA (TOTP) para alternar exigência de PIN em visualização da árvore, leitura de arquivos, edição, exclusão, movimentação/cópia, exportação, busca e IA.
- 🌓 **Alternância de Tema Instantânea**: Temas claro e escuro com suporte a detecção do sistema (`Ctrl+D`).
- 📱 **100% Responsivo**: Painéis redimensionáveis no desktop e gavetas (sheets) otimizadas para mobile.

---

## Stack Tecnológica

| Camada | Tecnologia | Finalidade |
|---|---|---|
| **Framework** | [Next.js](https://nextjs.org) 16 (App Router) + TypeScript | Framework React fullstack com Server Actions |
| **Runtime & Gerenciador** | [Bun](https://bun.sh) | Gerenciador de pacotes e runtime local ultra-rápido |
| **Estilização & UI** | [Tailwind CSS](https://tailwindcss.com) v4 + [shadcn/ui](https://ui.shadcn.com) + [Lucide](https://lucide.dev) | Sistema de componentes minimalista e responsivo |
| **Animações** | [Motion](https://motion.dev) | Transições suaves de layout e barra lateral |
| **Editor** | [Tiptap](https://tiptap.dev) + `tiptap-markdown` + `lowlight` | Editor Markdown rico com destaque de sintaxe |
| **Banco de Dados & ORM** | [Neon](https://neon.tech) + [Prisma](https://www.prisma.io) | PostgreSQL serverless e ORM tipado |
| **Armazenamento de Arquivos** | [Uploadthing](https://uploadthing.com) | Upload de imagens coladas e arrastadas |
| **Integração de IA** | [Vercel AI SDK](https://sdk.vercel.ai) (`@ai-sdk/google`, `@ai-sdk/openai`, `@ai-sdk/anthropic`) | Chat contextual e propostas de edição |
| **Segurança & Criptografia** | `jose` (JWT) + `bcryptjs` + Node.js `crypto` (AES-256-GCM) | Sessões PIN com escopo, validação TOTP e criptografia de chaves de API |
| **Deploy** | [Vercel](https://vercel.com) | Hospedagem serverless com deploy contínuo |

Arquitetura detalhada em [`docs/SPEC.md`](./SPEC.md) e design system em [`docs/DESIGN.md`](./DESIGN.md).

---

## Como Rodar / Criar Sua Instância

### 1. Pré-requisitos
- [Bun](https://bun.sh) instalado na máquina
- Conta gratuita no [Neon](https://neon.tech) (PostgreSQL)
- (Opcional) Conta gratuita no [Uploadthing](https://uploadthing.com) para upload de imagens

### 2. Fork e Clone
```bash
git clone https://github.com/SEU_USUARIO/hayaku-note.git
cd hayaku-note
bun install
```

### 3. Gerar Hash do PIN e Chaves de Criptografia

**a. Gere o hash do seu PIN de 6 dígitos:**
```bash
bun run scripts/generate-pin-hash.ts
# Siga o prompt e copie o hash bcrypt gerado
```

**b. Gere a chave de criptografia TOTP (32 bytes em Base64):**
```bash
openssl rand -base64 32
# Copie a chave de saída
```

### 4. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz baseado no `.env.example`:

```env
DATABASE_URL="postgresql://usuario:senha@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require"
PIN_HASH="$2a$10$..."
UPLOADTHING_TOKEN="seu-token-do-uploadthing"
SETTINGS_SETUP_KEY="uma-chave-secreta-forte-escolhida-por-voce"
TOTP_ENCRYPTION_KEY="sua-chave-base64-de-32-bytes-gerada"
```

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | String de conexão PostgreSQL do Neon |
| `PIN_HASH` | Hash bcrypt gerado no passo 3a — **nunca** insira o PIN em texto puro aqui |
| `UPLOADTHING_TOKEN` | Token obtido no painel do Uploadthing para upload de imagens |
| `SETTINGS_SETUP_KEY` | Chave de uso único para cadastrar o Google Authenticator nas Configurações pela primeira vez |
| `TOTP_ENCRYPTION_KEY` | Chave Base64 de 32 bytes usada para criptografar o segredo TOTP e chaves de IA no banco (AES-256-GCM) |

> **Nota sobre o Setup das Configurações:** Na primeira vez que você abrir o modal de Configurações no site, informe a `SETTINGS_SETUP_KEY`. Um QR Code será gerado para ser lido no Google Authenticator. Após o cadastro, você pode remover `SETTINGS_SETUP_KEY` do ambiente.

### 5. Executar Migrações e Iniciar em Desenvolvimento

```bash
bunx prisma migrate deploy
bun dev
```

Acesse [http://localhost:3000](http://localhost:3000) no navegador.

### 6. Deploy na Vercel

1. Suba o repositório para o seu GitHub.
2. Importe o projeto na [Vercel](https://vercel.com).
3. Adicione as 5 variáveis de ambiente do Passo 4.
4. Clique em Deploy!

---

## Atalhos de Teclado

| Atalho | Ação |
|---|---|
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>P</kbd> | Quick Open (busca rápida de notas) |
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> | Command Bar (CLI modal) |
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>S</kbd> | Salvar nota ativa (solicita PIN se configurado) |
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>B</kbd> | Negrito na seleção (dentro do editor) |
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>B</kbd> | Alternar visibilidade da barra lateral |
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>/</kbd> | Abrir/fechar Chat com IA |
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>D</kbd> | Alternar tema claro / escuro |
| <kbd>Esc</kbd> | Fechar modais, command bar ou quick open |

**Comandos da Command Bar CLI (`Ctrl+Shift+P`):**
- `touch caminho/para/nota` — Cria um novo arquivo (cria pastas intermediárias automaticamente)
- `mkdir caminho/para/pasta` — Cria uma nova pasta
- `rm caminho/para/item` — Deleta arquivo ou pasta (e suas imagens associadas no Uploadthing)
- `cp origem destino` — Copia arquivo ou pasta recursivamente
- `mv origem destino` — Move ou renomeia arquivo/pasta
- <kbd>Tab</kbd> — Autocompleta segmentos do caminho

---

## Contribuindo

Contribuições são muito bem-vindas! Se encontrar algum problema ou tiver sugestões, abra uma issue ou pull request. Lembre-se de que recursos como autenticação multiusuário tradicional, sincronização em nuvem por contas de terceiros ou blocos proprietários estão fora do escopo do projeto (consulte [`docs/SPEC.md`](./SPEC.md)).

---

## Licença

[MIT](../LICENSE.md) © [Gabriel Nito](https://github.com/GabrielNito)

