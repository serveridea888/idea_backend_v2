# Newsletter — Gaps no Frontend

> Documento de referência para integrar o sistema de newsletter (Resend) no frontend.
> O backend já fornece todos os endpoints necessários.

---

## Endpoints Disponíveis no Backend

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| `POST` | `/subscribers` | ❌ Público | Inscrever email na newsletter |
| `POST` | `/subscribers/unsubscribe/:id` | ❌ Público | Cancelar inscrição via link do email |
| `GET` | `/subscribers` | ✅ Admin | Listar assinantes (paginado) |
| `DELETE` | `/subscribers/:id` | ✅ Admin | Remover assinante |
| `POST` | `/newsletter/send` | ✅ Admin | Enviar newsletter manual |

---

## 1. Página de Unsubscribe

**Rota frontend:** `/unsubscribe/:subscriberId`

Os emails enviados pelo backend contêm um link de cancelamento no formato:
```
http://localhost:3000/unsubscribe/{subscriberId}
```

> ✅ **Endpoint público já implementado no backend:** `POST /subscribers/unsubscribe/:id` (sem autenticação)

### Request:
```ts
POST /subscribers/unsubscribe/{subscriberId}
```

### Response (200):
```json
{ "message": "Inscrição cancelada com sucesso." }
```

### Response (404) — ID inválido:
```json
{ "error": "Assinante não encontrado." }
```

### O que implementar:
- [ ] Criar página `/unsubscribe/[id]`
- [ ] Ao acessar, exibir mensagem de confirmação: _"Deseja cancelar sua inscrição na newsletter?"_
- [ ] Botão "Confirmar cancelamento" chama `POST /subscribers/unsubscribe/:id`
- [ ] Mensagem de sucesso: _"Sua inscrição foi cancelada."_
- [ ] Tratamento se o ID não existir (404): _"Inscrição não encontrada ou já cancelada."_

---

## 2. Formulário de Inscrição (Subscribe)

**Rota frontend:** Componente presente na home ou footer

### Request:
```ts
POST /subscribers
Content-Type: application/json

{
  "email": "usuario@email.com"
}
```

### Response (201):
```json
{
  "id": "uuid",
  "email": "usuario@email.com",
  "createdAt": "2026-03-16T00:00:00.000Z"
}
```

### O que implementar:
- [ ] Input de email + botão "Inscrever-se"
- [ ] Validação de email no frontend (formato)
- [ ] Estado de loading durante a request
- [ ] Mensagem de sucesso: _"Inscrição realizada! Verifique seu email."_
- [ ] Tratamento de erro (email inválido, falha de conexão)
- [ ] Email já inscrito retorna 200 (upsert) — tratar como sucesso normalmente

---

## 3. Painel Admin — Lista de Assinantes

**Rota frontend:** `/admin/subscribers` (ou equivalente no dashboard)

### Request:
```ts
GET /subscribers?page=1&limit=50
Authorization: Bearer {token}
```

### Response (200):
```json
{
  "data": [
    { "id": "uuid", "email": "user@email.com", "createdAt": "..." }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 50,
    "totalPages": 3
  }
}
```

### O que implementar:
- [ ] Tabela de assinantes com email e data de inscrição
- [ ] Paginação
- [ ] Botão de remover assinante (`DELETE /subscribers/:id`)
- [ ] Confirmação antes de remover
- [ ] Exibir total de inscritos

---

## 4. Painel Admin — Envio Manual de Newsletter

**Rota frontend:** `/admin/newsletter` (ou modal/seção no dashboard)

### Request:
```ts
POST /newsletter/send
Authorization: Bearer {token}
Content-Type: application/json

{
  "subject": "Assunto do email",
  "content": "<h1>Conteúdo HTML</h1><p>Texto da newsletter</p>"
}
```

### Response (200):
```json
{
  "sent": 150
}
```

### O que implementar:
- [ ] Campo de assunto (subject)
- [ ] Editor de conteúdo HTML (pode ser rich text editor como TipTap, ou textarea simples)
- [ ] Botão "Enviar Newsletter"
- [ ] Confirmação antes do envio: _"Enviar para X assinantes?"_ (buscar total via `GET /subscribers`)
- [ ] Estado de loading durante envio
- [ ] Mensagem de sucesso: _"Newsletter enviada para X assinantes"_
- [ ] Tratamento de erro

---

## 5. Notificação Automática (Sem ação no frontend)

Quando um artigo é publicado (`PUT /articles/:id` com `status: "PUBLISHED"`), o backend **automaticamente** envia uma newsletter para todos os assinantes. Não precisa de nenhuma implementação no frontend para isso funcionar.

---

## Prioridade de Implementação

| # | Item | Prioridade |
|---|------|-----------|
| 1 | Formulário de subscribe | 🔴 Alta |
| 2 | Página de unsubscribe | 🔴 Alta |
| 3 | Lista de assinantes (admin) | 🟡 Média |
| 4 | Envio manual de newsletter (admin) | 🟡 Média |

---

## Variáveis de Ambiente do Frontend

```env
NEXT_PUBLIC_API_URL=http://localhost:3333
```

> Todas as chamadas ao backend usam essa URL base.
