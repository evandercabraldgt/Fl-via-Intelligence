# Flávia Bezerra Studio — Cloudflare Pages

## Estrutura
- `public/index.html`: interface do Studio.
- `functions/api/flavia-intelligence.js`: endpoint central `/api/flavia-intelligence`.
- `FLAVIA_INTELLIGENCE_SYSTEM_PROMPT.md`: união integral dos dois documentos oficiais e das regras de integração.

## Departamentos incluídos
Início; Criar conteúdo; Roteiros e conteúdo em fluxo único para todas as redes; Páginas de vendas; Campanhas; Tarot e oráculos; Biblioteca de projetos; Identidade da marca; FLÁVIA INTELLIGENCE; Cérebro do assistente; Modo estrategista.

## Capacidades adicionais
Carrosséis de 6 a 20 telas; posts; legendas; ganchos; Stories; conteúdo nativo para Threads (publicações, sequências, conversas, respostas, 15 ideias e calendário) integrado ao seletor geral; roteiros para TikTok, Reels, Shorts, YouTube longo e podcast; páginas; campanhas; calendário editorial; SEO; análise de métricas fornecidas; persona; diagnóstico; e-books; produtos digitais; aulas; mentorias; e-mails; FAQ; objeções; revisão e reaproveitamento multiplataforma.

## Publicação
1. Envie o conteúdo desta pasta para a raiz do repositório GitHub, mantendo a estrutura.
2. No Cloudflare Pages, mantenha o diretório de saída como `public`.
3. Configure `GROQ_API_KEY` em Settings > Variables and Secrets para Production (e Preview se usar previews).
4. Faça commit na branch conectada ao Pages e aguarde o deploy.
5. Teste o endpoint com o Studio publicado.

Modelo configurado: `openai/gpt-oss-120b` via API da Groq. A chave deve existir somente como segredo no Cloudflare, nunca no HTML.

## Observações honestas
A biblioteca salva no `localStorage` deste navegador e dispositivo. Não é sincronização em nuvem. O Studio gera rascunhos; revise antes de publicar. A publicação automática em redes sociais não está incluída. A integração externa só funciona quando o deploy Cloudflare e a chave Groq estiverem válidos.
