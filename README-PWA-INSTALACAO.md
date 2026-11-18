# Flávia Bezerra Studio | versão PWA multiplataforma

Este pacote mantém a interface do Studio e a integração Cloudflare Pages + Groq, acrescentando a instalação como aplicativo web em iPhone/iPad, Android e computadores compatíveis.

## Publicação na Cloudflare Pages

1. Faça backup do repositório atual no GitHub.
2. Extraia este ZIP.
3. Envie o conteúdo extraído para a raiz do repositório conectado à Cloudflare Pages, preservando as pastas `public/` e `functions/`.
4. Faça commit na branch `main` e aguarde o deploy.
5. Na Cloudflare Pages, mantenha a variável secreta `GROQ_API_KEY` configurada em Production.

Configuração esperada do projeto Pages: Framework preset `None`; diretório de saída `public`; diretório raiz vazio. Não é necessário Netlify.

## Como instalar

- iPhone/iPad: abra o endereço no Safari, toque em Compartilhar e escolha Adicionar à Tela de Início.
- Android: abra no Chrome e use Instalar aplicativo ou o menu ⋮ > Instalar aplicativo/Adicionar à tela inicial.
- Windows e computadores com Chrome/Edge: use o ícone Instalar na barra de endereço ou o menu do navegador.
- macOS com Safari: use Arquivo > Adicionar ao Dock. Chrome/Edge também podem oferecer instalação.

O botão do Studio abre a instalação nativa quando o navegador disponibiliza essa função. Quando não disponibiliza, mostra instruções adequadas ao dispositivo. No iOS, a instalação é feita pelo menu Compartilhar do Safari.

## Observações

PWA é um aplicativo web instalável, não uma publicação na App Store ou Google Play. A inteligência continua dependendo de conexão com a internet. O service worker guarda apenas os arquivos básicos da interface e ignora as chamadas `/api/`, sem armazenar prompts ou respostas da IA.
