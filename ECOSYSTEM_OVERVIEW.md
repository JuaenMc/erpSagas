# 🛍️ SAGAS Brasil — Plataforma Omnichannel de Moda & Gestão ERP

> Ecossistema integrado de alta performance composto por **ERP Multi-Canal (Backend + Admin)** e **Loja Virtual D2C Mobile & Web (Capacitor + React)**, projetado especificamente para o setor de confecção e varejo de moda no Brasil.

---

## 🏗️ Visão Geral da Arquitetura

O ecossistema é dividido em dois projetos perfeitamente sincronizados através de contratos de API REST atômicos e idempotentes:

```
c:/projetos_sagas/
├── erpSagas/               # SAGAS ERP — Núcleo de Gestão Omnichannel
│   ├── prisma/             # Schema Prisma (25 Módulos, Neon PostgreSQL Serverless)
│   ├── server/             # API REST Express + TypeScript + Prisma Client
│   │   ├── dto/            # Data Transfer Objects (Product DTO, Order DTO)
│   │   ├── routes/         # Rotas atômicas (/api/products, /api/stock, /api/orders)
│   │   └── __tests__/      # Testes Unitários & Integração (Vitest + Supertest)
│   └── src/                # Painel Administrativo Vite + React + Tailwind
│
└── sagas/                  # SAGAS Mobile & Web Store (D2C)
    ├── android/            # Projeto Nativo Android (Capacitor 8.5)
    ├── dist/               # Build compilado e APK Android gerado
    ├── e2e/                # Especificações de Testes End-to-End
    └── src/                # Interface da Loja (Catálogo, Carrinho, Checkout PIX)
```

---

## ⚡ Stack Tecnológica

| Camada | Tecnologias Utilizadas |
| :--- | :--- |
| **Backend & API** | Node.js 20+, TypeScript, Express, Prisma ORM 6.19 |
| **Banco de Dados** | Neon PostgreSQL Serverless (Pooler PgBouncer + Direct URL) |
| **App Mobile Nativo** | Capacitor 8.5, Android SDK 35/36, Gradle 8.14, OpenJDK 17/21+ |
| **Frontend Web & Admin** | React 19, Vite 8, TailwindCSS 4, Lucide Icons, Motion |
| **Testes Automatizados** | Vitest 5, V8 Coverage, Supertest, Playwright |
| **Pagamentos & Auth** | Mercado Pago SDK (PIX / Cartão), Firebase Auth / Firestore |

---

## 📋 Pré-Requisitos

1. **Node.js** `>= 20.10.0` e **npm** `>= 10.0.0`
2. **PostgreSQL** ou conta ativa no **Neon Database** (string de conexão Neon pronta)
3. **Android Studio** (com SDK Platform 35+ e Android SDK Build-Tools) para compilação mobile

---

## 🚀 Setup Rápido (Rodando Tudo em 5 Comandos)

Execute os passos abaixo a partir da raiz `c:\projetos_sagas`:

```powershell
# 1. Instalar dependências e preparar o banco de dados no ERP
cd erpSagas
npm install --legacy-peer-deps
npx prisma generate && npx prisma db push && npm run db:seed

# 2. Iniciar o servidor Backend da API ERP (Porta 3001)
npm run dev:server

# 3. Em outro terminal, iniciar o Painel Administrativo ERP (Porta 3002)
npm run dev

# 4. Em um terceiro terminal, instalar dependências e iniciar a Loja D2C (Porta 3000)
cd ../sagas
npm install --legacy-peer-deps
npm run dev

# 5. Compilar o APK Android Mobile de Desenvolvimento
npm run build:apk
```

---

## 🔐 Matriz de Variáveis de Ambiente

### `erpSagas/.env` (Backend & ERP Admin)

| Variável | Descrição | Exemplo |
| :--- | :--- | :--- |
| `DATABASE_URL` | URL do pooler Neon PostgreSQL com SSL | `postgresql://neondb_owner:***@ep-***-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require` |
| `DATABASE_URL_UNPOOLED` | URL direta para migrações Prisma | `postgresql://neondb_owner:***@ep-***.us-east-2.aws.neon.tech/neondb?sslmode=require` |
| `PORT` | Porta HTTP da API Express | `3001` |
| `ERP_INTERNAL_API_KEY` | Chave de autenticação em headers (`X-ERP-API-KEY`) | `sagas_erp_sec_SUA_CHAVE_AQUI` |
| `CORS_ORIGINS` | Origens autorizadas para consumo da API | `http://localhost:3000,http://localhost:3002,capacitor://localhost,https://localhost` |
| `NODE_ENV` | Modo de execução | `development` ou `production` |

### `sagas/.env.local` (Loja Web & App Mobile)

| Variável | Descrição | Exemplo |
| :--- | :--- | :--- |
| `VITE_BACKEND_URL` | Endpoint da API do ERP para Web | `http://localhost:3001` |
| `VITE_BACKEND_URL_MOBILE` | Endpoint da API para o Emulador/Dispositivo | `http://10.0.2.2:3001` (Emulador) ou IP da máquina |
| `VITE_ERP_API_KEY` | Chave interna para criação de pedidos no ERP | `sagas_erp_sec_SUA_CHAVE_AQUI` |
| `VITE_MERCADOPAGO_PUBLIC_KEY` | Chave pública do Mercado Pago Checkout | `APP_USR-...` |
| `MERCADOPAGO_ACCESS_TOKEN` | Token privado de transações PIX | `APP_USR-...` |

---

## 🧪 Suíte de Testes Automatizados

Para rodar todos os testes unitários e de integração com relatório de cobertura no ERP:

```powershell
cd erpSagas
npm run test:coverage
```

- **46 testes automatizados** cobrindo:
  - Cálculo de margem líquida para App D2C, Shopee, Mercado Livre e TikTok Shop
  - Ponto de equilíbrio (Break-Even) e Preço Ideal Sugerido
  - Mapeamento robusto de DTO (`toStoreProductDto`)
  - Transações atômicas de checkout com bloqueio concorrente (`SELECT FOR UPDATE`)
  - Idempotência de criação e pagamento
  - Baixa física definitiva de estoque (`SALE_OUT`) e cancelamento com liberação de reserva (`RESERVE_RELEASE`)

---

## 📱 Compilação e Distribuição Mobile (APK)

O artefato compilado encontra-se em:
- `sagas/android/app/build/outputs/apk/debug/app-debug.apk`
- `sagas/dist/android/app/build/outputs/apk/app-debug.apk`

Instalação direta no smartphone conectado via USB:
```powershell
adb install -r sagas/android/app/build/outputs/apk/debug/app-debug.apk
```

