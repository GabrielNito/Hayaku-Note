import { streamText, convertToModelMessages } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { descriptografarSegredoTotp } from '@/lib/totp';

export const runtime = 'nodejs';

async function obterApiKeyDescriptografada(provider: "google" | "openai" | "anthropic"): Promise<string | null> {
  const configuracao = await prisma.configuracao.findUnique({ where: { id: "principal" } })
  if (!configuracao) return null
  const encrypted = provider === "google"
    ? configuracao.googleApiKeyCriptografado
    : provider === "openai"
    ? configuracao.openaiApiKeyCriptografado
    : provider === "anthropic"
    ? configuracao.anthropicApiKeyCriptografado
    : null

  if (!encrypted) return null
  try {
    return descriptografarSegredoTotp(encrypted)
  } catch (err) {
    console.error("Erro ao descriptografar API Key:", err)
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const provider = req.headers.get('x-provider') as "google" | "openai" | "anthropic";
    const modelName = req.headers.get('x-model');

    if (!provider || !["google", "openai", "anthropic"].includes(provider)) {
      return NextResponse.json(
        { error: 'Provedor inválido ou não especificado (header x-provider).' },
        { status: 400 }
      );
    }

    const apiKey = await obterApiKeyDescriptografada(provider);

    if (!apiKey) {
      return NextResponse.json(
        { error: `Nenhuma API Key configurada para o provedor ${provider}. Configure nas Configurações.` },
        { status: 401 }
      );
    }

    const { messages, documentContent } = await req.json();

    let model;

    switch (provider) {
      case 'openai': {
        const openai = createOpenAI({ apiKey });
        model = openai(modelName || 'gpt-4o');
        break;
      }
      case 'google': {
        const google = createGoogleGenerativeAI({ apiKey });
        model = google(modelName || 'gemini-3.5-flash');
        break;
      }
      case 'anthropic': {
        const anthropic = createAnthropic({ apiKey });
        model = anthropic(modelName || 'claude-3-5-sonnet-20241022');
        break;
      }
    }

    const systemPrompt = `Você é um assistente de IA especialista integrado em um editor de documentos estilo Notion.
Sua função é responder a perguntas, gerar resumos, explicar trechos ou auxiliar na edição com base estritamente no conteúdo do documento fornecido abaixo.

--- CONTEÚDO DO DOCUMENTO ATUAL ---
${documentContent || '(Nenhum conteúdo de documento fornecido)'}
--- FIM DO CONTEÚDO DO DOCUMENTO ---

ORIENTAÇÃO CRÍTICA PARA ADIÇÃO E EDIÇÃO NO DOCUMENTO:
Quando o usuário pedir para adicionar, editar, reescrever ou formatar o documento:
1. Responda brevemente no chat explicando em linguagem natural o que foi feito.
2. NUNCA duplique ou repita o documento inteiro existente se for apenas uma adição ou alteração parcial.
3. Se for uma ADIÇÃO de um novo trecho ao final ou ao início do documento:
   - Se for para adicionar ao final/fim do documento, use position="end":
     <proposed_edit position="end" summary="Resumo/Seção adicionada ao final">
     [Apenas o conteúdo do trecho novo a ser adicionado em Markdown]
     </proposed_edit>
   - Se for para adicionar no início/topo do documento, use position="start":
     <proposed_edit position="start" summary="Seção adicionada no início">
     [Apenas o conteúdo do trecho novo em Markdown]
     </proposed_edit>

4. Se for uma SUBSTITUIÇÃO ou MODIFICAÇÃO de um trecho/seção específica existente (ex: adicionar comentários em um tópico, reescrever um parágrafo, alterar uma tabela):
   VOCÊ É OBRIGADO a incluir no atributo original="..." o título ou a primeira linha do trecho original que está sendo modificado (ex: original="Features" ou original="## Features"):
   <proposed_edit original="[título ou primeira linha exata da seção original]" summary="Reescrita/Comentários na seção">
   [novo conteúdo substituto da seção em Markdown]
   </proposed_edit>

5. Use a tag <proposed_edit scope="full"> APENAS se o usuário pedir expressamente para reescrever ou traduzir o documento inteiro por completo.

Se for apenas uma conversa ou tirar dúvida sem alterar o documento, NÃO inclua as tags <proposed_edit>.

Seja claro, conciso, objetivo e prestativo.`;

    const modelMessages = await convertToModelMessages(messages);

    const result = await streamText({
      model,
      system: systemPrompt,
      messages: modelMessages,
    });

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    console.error('Erro na API de chat:', error);
    const message = error instanceof Error ? error.message : 'Erro interno no servidor de IA.';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
