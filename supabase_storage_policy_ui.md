# Configuracao da Policy de Leitura (Bucket images)

Preencha os campos da tela "Adding new policy to images" assim:

- Policy name: Public read images
- Allowed operation: SELECT
- Target roles: anon, authenticated
- Policy definition: bucket_id = 'images'

## Regras importantes

- Nao marque INSERT
- Nao marque UPDATE
- Nao marque DELETE

## Resultado esperado

- Imagens do bucket images continuam publicas para leitura.
- Upload/remocao continuam bloqueados para clientes anon/authenticated.
- Upload/remocao so pelo backend com service role.
