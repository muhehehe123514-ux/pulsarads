# PulsarAds — Contexto de IA

## 🎯 Regra Máxima
**TODA implementação deve ser 100% GRATUITA.** Nunca usar APIs pagas, créditos pagos ou SaaS com trial. Preferir sempre:
- APIs públicas gratuitas (Meta Ad Library, Pollinations, Tesseract OCR)
- Ferramentas open-source do GitHub
- Serviços com plano free generoso (Upstash Redis free, Netlify free)

## 🎨 Design System (NÃO MUDAR)
- **Tema:** Dark space theme
- **Cores principais:** Violet (`#7c3aed`) + Cyan (`#38bdf8`)
- **Fundo:** Dark (`#0a0a0f`, `#13131a`)
- **Bordas:** `rgba(255,255,255,0.08)`
- **Tipografia:** Inter (body) + Space Grotesk (display)
- **Raio:** 12px para cards, 10px para botões
- **Sombras:** suaves com glow violet/cyan

## 🏗️ Arquitetura
- **Frontend:** HTML + JS vanilla + CSS puro
- **Backend:** Node.js + Express (`server.js`)
- **Extensão Chrome:** Manifest V3 (`extension/`)
- **Banco:** Upstash Redis (via `@upstash/redis-sdk`)
- **Pagamento:** Mercado Pago (plano free)
- **OCR:** Tesseract.js (gratuito)
- **Imagens:** Pollinations.ai (gratuito)

## 📂 Estrutura