# Sistema de Migrations - Agenday

Este diretório contém todas as migrations do banco de dados MySQL organizadas cronologicamente.

## Como usar

1. Para executar todas as migrations:
```bash
npm run migrate
```

2. Para criar uma nova migration:
```bash
npm run migration:create <nome-da-migration>
```

3. Para reverter a última migration:
```bash
npm run migration:rollback
```

## Estrutura

- `001_initial_setup.sql` - Criação das tabelas principais
- `002_admin_system.sql` - Sistema de administradores
- `003_company_system.sql` - Sistema de empresas
- `004_subscription_system.sql` - Sistema de assinaturas
- `005_appointment_system.sql` - Sistema de agendamentos
- `006_communication_system.sql` - Sistema de comunicação (WhatsApp, etc)
- `007_review_system.sql` - Sistema de avaliações
- `008_loyalty_system.sql` - Sistema de fidelidade
- `009_affiliate_system.sql` - Sistema de afiliados
- `010_support_system.sql` - Sistema de suporte
- `011_tour_system.sql` - Sistema de tour guiado

## Convenções

- Todas as migrations devem ter numeração sequencial
- Nome no formato: `XXX_descricao_clara.sql`
- Sempre incluir comandos de rollback quando possível
- Documentar mudanças significativas