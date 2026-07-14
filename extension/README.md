# 🪞 PulsarAds Espelho (extensão do navegador)

Faz o que você pediu: **pesquisou oferta no PulsarAds → os anúncios reais aparecem com imagens, sozinhos**. Por baixo dos panos, esta extensão abre a **Biblioteca de Anúncios do Facebook** (que é **pública**) em abas de fundo, lê os anúncios (imagens, foto de perfil, nome do anunciante, copy, data) e devolve pro site. Ninguém precisa ir lá favoritar nada.

Funciona no **Chrome** e no **Edge** (é Manifest V3, o padrão dos dois).

## Instalar no CHROME (1 minuto, uma vez só)
1. Abra **chrome://extensions**
2. Ligue o **Modo do desenvolvedor** (canto superior direito).
3. Clique em **Carregar sem compactação** (Load unpacked) e escolha a pasta `extension` que você acabou de extrair do ZIP baixado no PulsarAds.
4. Pronto. Abra o PulsarAds → 🔥 Explorador de Ofertas → pesquise. No topo aparece **"⚡ Skill de espelhamento ativa"** e os anúncios reais vêm sozinhos, com imagens.

## Instalar no EDGE
Igualzinho, só que em **edge://extensions**.

> Dica: deixe uma aba do Facebook aberta e logada no mesmo Chrome — assim a Biblioteca de Anúncios abre sem pedir consentimento de cookies e a leitura fica mais completa.

## Como funciona (honesto)
- A Biblioteca de Anúncios do Facebook é **pública** — qualquer um vê os anúncios ativos. A extensão só lê o que já está visível ali, no **seu** navegador, e traz pro site. Não faz login, não mexe na sua conta, não posta nada.
- Sem a extensão, o site continua funcionando com o botão **🪞 Espelhar anúncio** (bookmarklet) — a extensão só automatiza esse passo.

## Avisos
- É uma extensão "sem compactação" (dev). Se o Edge/Chrome pedir pra reativar após atualizar o navegador, é só repetir o passo 3.
- O Facebook muda o layout de vez em quando; se um dia parar de trazer os dados, me avise que eu ajusto o leitor.
- Abrir muitas buscas seguidas pode fazer o Facebook pedir verificação — a extensão limita a quantidade por pesquisa.
