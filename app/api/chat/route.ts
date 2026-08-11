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

--- CONTEÚDO DO DOCUMENTO ---
${documentContent || '(Nenhum conteúdo de documento fornecido)'}
--- FIM DO CONTEÚDO DO DOCUMENTO ---

Seja claro, conciso, objetivo e prestativo. Sempre que relevante, faça referência ao conteúdo do documento.`;

    const modelMessages = await convertToModelMessages(messages);

    const result = await streamText({
      model,
      system: systemPrompt,
      messages: modelMessages,
    });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    console.error('Erro na API de chat:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro interno no servidor de IA.' },
      { status: 500 }
    );
  }
}
