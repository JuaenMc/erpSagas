# 📖 SAGAS ERP — Documentação Completa da API REST

A API do SAGAS ERP expõe endpoints padronizados para sincronização omnicanal, catálogo com grade de moda, reservas transacionais de estoque e faturamento.

- **Base URL (Desenvolvimento):** `http://localhost:3001/api`
- **Base URL (Produção):** `https://api.sagas.moda/api`
- **Formato dos Dados:** `application/json` (UTF-8)

---

## 🔒 Autenticação & Segurança

Endpoints que alteram o estado do sistema (`POST`, `PUT`, `PATCH`, `DELETE`) exigem o cabeçalho de autenticação interna:

```http
X-ERP-API-KEY: sagas_erp_sec_SUA_CHAVE_AQUI
Content-Type: application/json
```

---

## 📑 Sumário de Endpoints

| Método | Endpoint | Autenticação | Descrição |
| :--- | :--- | :---: | :--- |
| `GET` | `/health` | Pública | Status da API, latência do banco Neon, uptime e memória |
| `GET` | `/products` | Pública | Lista de produtos formatada em DTO plano |
| `GET` | `/products/:id` | Pública | Detalhes do produto com variações e fotos |
| `GET` | `/stock` | Pública | Resumo do estoque físico e disponível por depósito |
| `GET` | `/stock/variation/:id` | Pública | Saldo em tempo real de uma variação |
| `GET` | `/orders` | Pública | Listagem de pedidos com filtros |
| `GET` | `/orders/:id` | Pública | Detalhes do pedido por ID ou número |
| `POST` | `/orders` | Obrigatória | Criação transacional de pedido e reserva de estoque |
| `POST` | `/orders/:id/payment-confirmed` | Obrigatória | Baixa física definitiva por pagamento aprovado |
| `POST` | `/orders/:id/cancel` | Obrigatória | Cancelamento e liberação de estoque reservado |
| `POST` | `/orders/expire-pending` | Obrigatória | Rotina de expiração de pedidos pendentes |

---

## 🔌 Detalhamento dos Endpoints com Exemplos de cURL

### 1. `GET /api/health`
Verifica a integridade da aplicação e a conectividade com o banco de dados Neon PostgreSQL.

**Exemplo de Chamada:**
```bash
curl -X GET http://localhost:3001/api/health
```

**Resposta de Sucesso (200 OK):**
```json
{
  "status": "ok",
  "db": "connected",
  "latencyMs": 42,
  "uptimeSeconds": 1820,
  "memoryUsage": {
    "rssMb": 85.4,
    "heapUsedMb": 48.2,
    "heapTotalMb": 64.0
  },
  "environment": "development",
  "timestamp": "2026-10-26T12:00:00.000Z",
  "service": "SAGAS ERP Backend API",
  "version": "1.0.0"
}
```

---

### 2. `GET /api/products`
Retorna produtos ativos com variações em formato DTO plano.

**Query Parameters Suportados:**
- `page` (padrão: 1)
- `limit` (padrão: 50)
- `search` (filtro por título ou SKU)

**Exemplo de Chamada:**
```bash
curl -X GET "http://localhost:3001/api/products?limit=5"
```

**Resposta de Sucesso (200 OK):**
```json
{
  "success": true,
  "count": 5,
  "total": 32,
  "data": [
    {
      "id": "prod-001",
      "name": "Vestido Midi Floral Primavera",
      "title": "Vestido Midi Floral Primavera",
      "masterSku": "VEST-FLORAL-01",
      "price": 89.90,
      "costPrice": 32.00,
      "stock": 45,
      "sizes": ["P", "M", "G"],
      "colors": ["Rosê", "Menta"],
      "images": ["https://images.unsplash.com/..."],
      "coverImageUrl": "https://images.unsplash.com/...",
      "category": "Vestidos",
      "type": "VARIABLE",
      "variations": [
        {
          "id": "var-001-m",
          "sku": "VEST-FLORAL-01-M-ROSE",
          "size": "M",
          "color": "Rosê",
          "stock": 15,
          "price": 89.90,
          "barcodeEan13": "7891234567890"
        }
      ]
    }
  ]
}
```

---

### 3. `POST /api/orders`
Cria pedido no ERP e reserva o estoque atomicamente via `SELECT FOR UPDATE`. Idempotente por `externalId`.

**Exemplo de Chamada:**
```bash
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -H "X-ERP-API-KEY: sagas_erp_sec_SUA_CHAVE_AQUI" \
  -d '{
    "externalId": "mobile-checkout-10029",
    "channel": "APP_SAGAS",
    "customer": {
      "name": "Ana Paula Silveira",
      "email": "ana.silveira@gmail.com",
      "phone": "11987654321",
      "firebaseUid": "firebase-uid-ana-01"
    },
    "items": [
      {
        "variationId": "var-001-m",
        "quantity": 1,
        "unitPrice": 89.90
      }
    ],
    "shipping": {
      "cost": 15.00
    },
    "paymentMethod": "PIX"
  }'
```

**Resposta de Sucesso (201 Created):**
```json
{
  "success": true,
  "orderId": "39faf0f4-f10d-40fa-bcee-00dcadb8db5b",
  "orderNumber": "SG-883298-567",
  "status": "PENDING_PAYMENT",
  "totalAmount": 104.90,
  "estimatedMarginPct": 38.5,
  "expiresAt": "2026-10-26T12:30:00.000Z",
  "message": "Pedido criado com sucesso e estoque reservado."
}
```

---

### 4. `POST /api/orders/:id/payment-confirmed`
Efetiva a baixa de estoque físico definitivo (`SALE_OUT`) e altera o status do pedido para `PAID`.

**Exemplo de Chamada:**
```bash
curl -X POST http://localhost:3001/api/orders/39faf0f4-f10d-40fa-bcee-00dcadb8db5b/payment-confirmed \
  -H "Content-Type: application/json" \
  -H "X-ERP-API-KEY: sagas_erp_sec_SUA_CHAVE_AQUI" \
  -d '{
    "externalPaymentId": "mp_pix_9876543210",
    "paidAt": "2026-10-26T12:05:00.000Z"
  }'
```

**Resposta de Sucesso (200 OK):**
```json
{
  "success": true,
  "orderId": "39faf0f4-f10d-40fa-bcee-00dcadb8db5b",
  "orderNumber": "SG-883298-567",
  "status": "PAID",
  "message": "Pagamento confirmado com sucesso e estoque baixado definitivamente."
}
```

---

### 5. `POST /api/orders/:id/cancel`
Cancela um pedido pendente e devolve a quantidade reservada para o estoque disponível.

**Exemplo de Chamada:**
```bash
curl -X POST http://localhost:3001/api/orders/39faf0f4-f10d-40fa-bcee-00dcadb8db5b/cancel \
  -H "Content-Type: application/json" \
  -H "X-ERP-API-KEY: sagas_erp_sec_SUA_CHAVE_AQUI" \
  -d '{
    "reason": "Expirado tempo de pagamento via PIX"
  }'
```

**Resposta de Sucesso (200 OK):**
```json
{
  "success": true,
  "orderId": "39faf0f4-f10d-40fa-bcee-00dcadb8db5b",
  "orderNumber": "SG-883298-567",
  "status": "CANCELLED",
  "message": "Pedido cancelado e estoque reservado liberado com sucesso."
}
```

