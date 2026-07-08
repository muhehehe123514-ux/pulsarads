# ⚡ PulsarAds — Backend de pagamentos (Mercado Pago)

Libera o plano **Pro/Max** do cliente **automaticamente** quando o pagamento é aprovado — sem você precisar gerar código à mão. O site continua no GitHub Pages; só os pagamentos passam por aqui.

## Como funciona
1. No site, o cliente clica em **Pagar com Mercado Pago**.
2. O site chama `POST /api/create-preference` → o backend cria a cobrança e devolve o link do checkout do Mercado Pago.
3. O cliente paga. O Mercado Pago avisa o backend em `POST /api/webhook`.
4. Pagamento aprovado → o backend libera o plano (`grants.json`).
5. O site consulta `GET /api/status?user=...` e desbloqueia na hora.

## Deploy no Render (grátis) — passo a passo
1. Suba este repositório no GitHub (já está: `muhehehe123514-ux/pulsarads`).
2. Em **render.com** → **New +** → **Web Service** → conecte o repo.
3. Configure:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. Em **Environment**, adicione as 3 variáveis (veja `.env.example`):
   - `MP_ACCESS_TOKEN` → seu Access Token de **produção** do Mercado Pago
   - `FRONTEND_ORIGIN` → `https://muhehehe123514-ux.github.io`
   - `PUBLIC_URL` → a URL que o Render te der (ex.: `https://pulsarads-backend.onrender.com`)
5. Deploy. Quando ficar verde, copie a URL do serviço.
6. No site, abra `js/config.js` e cole a URL em `window.PULSAR_BACKEND`. Commit + push.
7. No painel do Mercado Pago, em **Webhooks/Notificações**, aponte para `PUBLIC_URL/api/webhook` (evento: pagamentos). *(O backend também já manda `notification_url` em cada cobrança, então costuma funcionar sem esse passo.)*

## Onde pego o Access Token?
mercadopago.com → **Seu negócio** → **Configurações** → **Gerenciar credenciais** → **Credenciais de produção** → copie o **Access Token** (começa com `APP_USR-`).

## Rodar local (teste)
```bash
cd backend
npm install
cp .env.example .env   # preencha os valores
npm start
```

## Banco de dados permanente (contas e planos que nunca se perdem)
As contas (login) e o plano ficam num **Upstash Redis** (grátis, permanente). Sem ele, o backend usa um arquivo local que reseta a cada deploy.
1. Crie conta grátis em **upstash.com** (login com GitHub).
2. **Create Database** → Redis → região mais perto (ex.: São Paulo/US) → Free.
3. Na página do banco, copie **UPSTASH_REDIS_REST_URL** e **UPSTASH_REDIS_REST_TOKEN**.
4. No Render → seu serviço → **Environment**, adicione essas duas variáveis. Salve (redeploy automático).
5. Confira em `GET /` que aparece `"db":"upstash"`.

## Observações honestas
- No plano **free do Render**, o disco é efêmero (o `grants.json` reseta em novos deploys e o serviço "dorme" após inatividade — a 1ª chamada depois de dormir demora uns segundos). Como o **navegador do cliente também guarda o plano** ao confirmar, isso é suficiente nesta escala. Pra algo robusto (multi-dispositivo garantido, histórico), troque o `grants.json` por um banco (ex.: Postgres free do Render).
- O modelo de contas do site é por navegador (localStorage). O backend casa o pagamento com o **usuário** informado no checkout, então o cliente precisa pagar com o mesmo usuário que usa no site.
