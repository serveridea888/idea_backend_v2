# Integração Frontend — Newsletter

Documento de integração do frontend com o backend de newsletter.

## Configuração validada no backend

- Resend configurado com domínio amazonidea.com.br
- Remetente usado pelo backend: newsletter@amazonidea.com.br
- URL do frontend usada nos links dos e-mails: https://app.amazonidea.com.br

## Endpoints que o frontend precisa consumir

| Método | Rota | Auth | Uso |
| --- | --- | --- | --- |
| POST | /auth/login | Não | Login do admin |
| POST | /subscribers | Não | Inscrição na newsletter |
| POST | /subscribers/unsubscribe/:id | Não | Cancelamento público via link do e-mail |
| GET | /subscribers?page=1&limit=50 | Sim | Listagem de assinantes no admin |
| DELETE | /subscribers/:id | Sim | Remover assinante no admin |
| POST | /newsletter/send | Sim | Envio manual de newsletter |

## Contrato para o frontend

### 1. Login do admin

Request:

```json
{
  "email": "admin@amazonidea.com.br",
  "password": "SUA_SENHA"
}
```

Endpoint:

```text
POST /auth/login
```

Response:

```json
{
  "accessToken": "jwt",
  "admin": {
    "id": "uuid",
    "email": "admin@amazonidea.com.br",
    "name": "Admin"
  }
}
```

Usar o accessToken nas rotas protegidas com header Authorization: Bearer {token}.

### 2. Inscrição na newsletter

Endpoint:

```text
POST /subscribers
```

Request:

```json
{
  "email": "usuario@exemplo.com"
}
```

Response 201:

```json
{
  "id": "uuid",
  "email": "usuario@exemplo.com",
  "createdAt": "2026-03-16T00:00:00.000Z"
}
```

Implementação esperada no frontend:

- Formulário com campo de e-mail
- Estado de loading
- Mensagem de sucesso após inscrição
- Tratamento de erro de validação ou falha de rede

### 3. Descadastro público

O link enviado por e-mail aponta para esta rota visual do frontend:

```text
/unsubscribe/:id
```

Quando o usuário abrir essa página, o frontend deve chamar:

```text
POST /subscribers/unsubscribe/:id
```

Response 200:

```json
{
  "message": "Inscrição cancelada com sucesso."
}
```

Response 404:

```json
{
  "error": "Assinante não encontrado."
}
```

Implementação esperada no frontend:

- Página em /unsubscribe/:id
- Tela de confirmação de cancelamento
- Mensagem de sucesso ou erro após a chamada

### 4. Lista de assinantes no admin

Endpoint:

```text
GET /subscribers?page=1&limit=50
```

Header:

```text
Authorization: Bearer {token}
```

Response 200:

```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@email.com",
      "createdAt": "2026-03-16T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 50,
    "totalPages": 3
  }
}
```

Implementação esperada no frontend:

- Tabela de assinantes
- Paginação
- Exibição do total de inscritos
- Ação para remover assinante

### 5. Remoção de assinante no admin

Endpoint:

```text
DELETE /subscribers/:id
```

Header:

```text
Authorization: Bearer {token}
```

Response 204 sem corpo.

### 6. Envio manual de newsletter no admin

Endpoint:

```text
POST /newsletter/send
```

Header:

```text
Authorization: Bearer {token}
```

Request:

```json
{
  "subject": "Assunto da newsletter",
  "content": "<p>HTML do e-mail</p>"
}
```

Response 200:

```json
{
  "sent": 150
}
```

Implementação esperada no frontend:

- Campo de assunto
- Editor HTML ou textarea
- Confirmação antes do envio
- Loading durante envio
- Mensagem final com quantidade enviada

## Rotas do frontend que precisam existir

- /unsubscribe/:id
- /articles/:slug
- /news/:slug

Essas rotas são usadas nos links dentro dos e-mails enviados pelo backend.

## Variável de ambiente esperada no frontend

```env
NEXT_PUBLIC_API_URL=https://SEU_BACKEND
```

Exemplo de uso no frontend:

```ts
fetch(`${process.env.NEXT_PUBLIC_API_URL}/subscribers`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ email })
})
```
