# ⚡ PulsarAds

> **O pulso do tráfego pago.** A central gratuita, aberta e sem cadastro para afiliados, infoprodutores e gestores de tráfego.

🌐 **Site no ar:** https://muhehehe123514-ux.github.io/pulsarads/

## O que tem dentro

Tudo roda **100% no navegador** — site estático, sem backend. Contas, sessão e dados ficam no localStorage (senhas guardadas como hash PBKDF2, nunca em texto puro).

**Três planos** (pagamento via PIX com QR Code na tela; ativação por código que embute plano + duração):

| Plano | Preço | O que muda |
|---|---|---|
| 🌱 Grátis | R$ 0 | Muita ferramenta liberada, com limite de **~15 usos das ferramentas a cada 5h**. Explorador, Biblioteca e Modelar bloqueados. |
| ⚡ Pro | R$ 40/mês | Abre 🔥 Explorador, 📚 Biblioteca e ✨ Modelar; limite de **~70 usos a cada 5h**. |
| 🚀 Max | R$ 130/mês | Usos **ilimitados**, sem espera. |

O limite não é por tempo, e sim por **número de usos das ferramentas** (cada função acionada conta 1), que recarrega sozinho a cada 5h — parecido com o limite de mensagens do Claude/ChatGPT. Pelo painel Admin o dono gera códigos escolhendo plano e duração (de **1 dia** a **vitalício**) e pode **revogar** o acesso quando quiser.

| Ferramenta | O que faz |
|---|---|
| 📡 Meta Ads ao vivo | Marketing API oficial (token próprio): campanhas, gasto, compras, ROAS ao vivo, funil de conversão por campanha e pausar/ativar |
| 🔥 Explorador de Ofertas | Filtros por nicho/país/idioma/mídia + bateria de pesquisas automáticas na biblioteca de anúncios do Facebook, com fila e pesquisas salvas (exclusivo Pro/Max) |
| 💰 Rastreador de Vendas | Vendas, lucro, ticket e ROAS puxados automaticamente da conta conectada do Facebook Ads, por campanha |
| ✨ Modelar Oferta | Novos ângulos e promessas fortes → headline → página de vendas editável com **paletas de cor, várias fontes**, preview celular/tablet, upload de imagem por clique, avatar nos depoimentos, adicionar/remover seções e link de checkout nos botões — download + publicação no Netlify |
| 🖼️ Imagem → Texto | OCR pt-BR no navegador (Tesseract.js) com seleção de trechos; aceita **colar imagem com Ctrl+V** |
| 🧭 Modelador Low Ticket | Oferta com mecanismo, copy Gancho-Agita-Solução, funil de valor (bump+upsell+downsell), campanha, regras de escala e checklist |
| 🎯 UTMs Dinâmicas | Macros de rastreamento do Meta ({{campaign.name}}…), Google (ValueTrack) e TikTok, no padrão Utmify |
| ✍️ Gerador de Headlines | 10 títulos persuasivos por clique, baseados em frameworks de copywriting |
| 🔁 Reescritor de Copy | Variações com sinônimos e conectores, mantendo a estrutura |
| 🧱 Frameworks de Copy | Copies completas em AIDA, PAS e BAB a partir de 4 campos |
| 🚦 Palavras Sensíveis | Verifica a copy contra termos que costumam reprovar anúncios, com sugestões seguras |
| 🔤 Texto Estilizado | Converte texto em estilos Unicode (negrito, itálico, manuscrito…) para bios e posts |
| 🔢 Contador de Caracteres | Valida o texto contra os limites do Meta, Google, TikTok e X |
| 🔗 Gerador de UTMs | Links rastreáveis com histórico local |
| 📈 Simulador de Escala | Projeção de cliques, vendas, receita e ROAS ao escalar o orçamento (com perda de eficiência configurável) |
| 🛰️ Radar de Concorrentes | Busca pronta nas bibliotecas oficiais de anúncios (Meta, Google, TikTok) |
| 🎨 Estúdio de Criativos | Banners 1080×1080 e stories 1080×1920 via Canvas, download em PNG |
| 🔊 Gerador de Áudio | Narração da copy com Web Speech API (vozes em pt-BR) |
| 🎙️ Transcritor por Voz | Ditado em tempo real (Chrome/Edge) |
| 🧹 Limpador de Metadados | Remove EXIF de imagens localmente, sem upload |

## Stack

HTML + CSS + JavaScript puro. Zero dependências, zero build. Gráficos em SVG desenhados à mão seguindo boas práticas de dataviz (paleta validada para daltonismo e contraste em dark mode).

## Rodar localmente

Abra o `index.html` no navegador. Pronto. 🎉

## Licença

MIT — use, modifique e compartilhe à vontade.
