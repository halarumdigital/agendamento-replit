# Configuração de Planos no Stripe Dashboard

## Passo a Passo para Configurar Planos

### 1. Acesse o Stripe Dashboard
- Vá para [https://dashboard.stripe.com/products](https://dashboard.stripe.com/products)
- Faça login na sua conta Stripe

### 2. Criar Produtos e Preços
Para cada plano do seu sistema, você deve:

#### Plano Básico
1. Clique em "Adicionar produto"
2. Nome: "Plano Básico"
3. Descrição: "Plano básico para pequenas empresas"
4. Preço: R$ 29,90 (ou seu valor)
5. Cobrança: Recorrente - Mensal
6. Salve e **copie o Price ID** (começa com `price_`)

#### Plano Premium
1. Clique em "Adicionar produto"
2. Nome: "Plano Premium"
3. Descrição: "Plano premium com recursos avançados"
4. Preço: R$ 59,90 (ou seu valor)
5. Cobrança: Recorrente - Mensal
6. Salve e **copie o Price ID** (começa com `price_`)

#### Plano Empresarial
1. Clique em "Adicionar produto"
2. Nome: "Plano Empresarial"
3. Descrição: "Plano completo para grandes empresas"
4. Preço: R$ 99,90 (ou seu valor)
5. Cobrança: Recorrente - Mensal
6. Salve e **copie o Price ID** (começa com `price_`)

### 3. Configurar IDs no Banco de Dados

Após criar os produtos no Stripe, você precisa atualizar o banco de dados com os IDs.

#### Opção 1: Via SQL Manual
```sql
-- Atualizar Plano Básico
UPDATE plans 
SET stripe_price_id = 'price_SEU_ID_AQUI_BASICO'
WHERE name LIKE '%básico%' OR name LIKE '%basic%';

-- Atualizar Plano Premium  
UPDATE plans 
SET stripe_price_id = 'price_SEU_ID_AQUI_PREMIUM'
WHERE name LIKE '%premium%';

-- Atualizar Plano Empresarial
UPDATE plans 
SET stripe_price_id = 'price_SEU_ID_AQUI_EMPRESARIAL'
WHERE name LIKE '%empresarial%' OR name LIKE '%enterprise%';
```

#### Opção 2: Via Script de Configuração
Execute o script `setup-stripe-plans.js` (criado a seguir) para configurar os IDs automaticamente.

### 4. Verificar Configuração
Execute esta query para verificar se os planos estão configurados:

```sql
SELECT id, name, price, stripe_price_id 
FROM plans 
WHERE is_active = 1;
```

Todos os planos ativos devem ter um `stripe_price_id` configurado.

### 5. Testar Integração
1. Acesse `/assinatura` no sistema
2. Selecione um plano
3. Complete o processo de pagamento de teste
4. Verifique se a assinatura aparece no Stripe Dashboard

## Notas Importantes

- **Nunca compartilhe** seus Price IDs publicamente
- Use dados de teste do Stripe para desenvolvimento
- Configure webhooks no Stripe para receber notificações de pagamento
- Os Price IDs são diferentes entre ambiente de teste e produção

## Troubleshooting

### Erro: "Plano não possui ID do Stripe configurado"
- Verifique se o `stripe_price_id` foi configurado no banco
- Confirme se o Price ID está correto no Stripe Dashboard

### Assinatura não aparece como ativa
- Verifique se o pagamento foi processado
- Confirme se os webhooks estão configurados
- Verifique os logs do sistema para erros