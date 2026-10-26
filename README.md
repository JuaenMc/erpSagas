# 💼 SAGAS ERP — Backend API & Painel Administrativo

Servidor de API corporativo desenvolvido em **Express + TypeScript + Prisma ORM** e Painel Administrativo em **React + Vite**. Integra catálogo omnicanal, estoques matriciais multi-depósito, reserva transacional em checkout e precificação inteligente baseada em margens.

---

## 📜 Scripts Disponíveis

```bash
# Iniciar o Painel Administrativo Vite (Porta 3002)
npm run dev

# Iniciar o Servidor Backend Express com Hot-Reload (Porta 3001)
npm run dev:server

# Executar migrações do banco Neon PostgreSQL
npm run db:migrate

# Executar seed de catálogo e estoque inicial
npm run db:seed

# Executar a suíte de testes com Vitest
npm run test

# Executar testes com relatório detalhado de cobertura (V8)
npm run test:coverage

# Compilar aplicação para produção
npm run build
```

---

## 🌐 Endpoints Principais da API REST

A API roda por padrão em `http://localhost:3001/api`.

### 1. Sistema & Monitoramento
- **`GET /api/health`**
  - Retorna status de conectividade com o banco Neon, tempo de resposta (latência em ms), uptime do processo e uso de memória.

### 2. Produtos & Catálogo
- **`GET /api/products`**
  - Lista catálogo completo em formato DTO compatível com a loja e painel admin. Suporta paginação e busca por texto.
- **`GET /api/products/:id`**
  - Retorna detalhes completos do produto com grade Cor x Tamanho, galeria e estoques disponíveis.

### 3. Estoque Físico & Disponibilidade
- **`GET /api/stock`**
  - Visão geral de estoque físico, reservado para pedidos e disponível para venda por depósito.
- **`GET /api/stock/variation/:variationId`**
  - Saldo em tempo real de uma variação específica.

### 4. Pedidos & Checkout Transacional
- **`POST /api/orders`** *(Requer `X-ERP-API-KEY`)*
  - Cria pedido, valida estoque com bloqueio concorrente (`SELECT FOR UPDATE`), incrementa `stockReservedOrder` e gera `AuditLog`. Idempotente por `externalId`.
- **`POST /api/orders/:id/payment-confirmed`** *(Requer `X-ERP-API-KEY`)*
  - Confirma pagamento, efetiva baixa física definitiva (`SALE_OUT`), zera a reserva e atualiza status para `PAID`. Idempotente.
- **`POST /api/orders/:id/cancel`** *(Requer `X-ERP-API-KEY`)*
  - Cancela pedido pendente e libera o estoque reservado (`RESERVE_RELEASE`).
- **`GET /api/orders`**
  - Listagem com filtros por `status`, `channel`, `since`, `customerId` e `firebaseUid`.
- **`GET /api/orders/:id`**
  - Detalhes completos do pedido por ID UUID ou pelo número legível (ex: `SG-123456-789`).
- **`POST /api/orders/expire-pending`**
  - Job automático para cancelar pedidos sem pagamento e liberar reservas expiradas.

---

## 🛠️ Como Criar um Novo Endpoint

Para adicionar um novo módulo à API:

1. **Crie a rota em `server/routes/<modulo>.ts`:**
   ```typescript
   import { Router, Request, Response, NextFunction } from 'express';
   import { prisma } from '../index';

   const router = Router();

   router.get('/', async (req: Request, res: Response, next: NextFunction) => {
     try {
       const data = await prisma.suaTabela.findMany();
       return res.status(200).json({ success: true, data });
     } catch (err) {
       next(err);
     }
   });

   export default router;
   ```

2. **Registre no `server/index.ts`:**
   ```typescript
   import seuRouter from './routes/<modulo>';
   app.use('/api/<modulo>', seuRouter);
   ```

3. **Crie o teste de integração correspondente em `server/__tests__/<modulo>.test.ts`** utilizando `supertest`.

---

## 🧪 Como Rodar os Testes

```bash
# Execução direta
npm run test

# Execução com medição de cobertura
npm run test:coverage
```
