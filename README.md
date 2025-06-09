# Sistema Administrativo em Português

Sistema completo de gerenciamento de empresas e planos de assinatura com interface responsiva.

## 🚀 Funcionalidades

- ✅ Autenticação de administrador
- ✅ Dashboard com estatísticas
- ✅ Gestão de empresas com validação CNPJ/CPF
- ✅ Criação e gerenciamento de planos de assinatura
- ✅ Configurações globais personalizáveis
- ✅ Interface responsiva para desktop e mobile

## 🛠️ Configuração do MySQL

### 1. Configurar Credenciais

Edite o arquivo `.env` na raiz do projeto com suas credenciais do MySQL:

```env
# Configurações do MySQL
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=seu_usuario
MYSQL_PASSWORD=sua_senha
MYSQL_DATABASE=admin_system

# Configuração de sessão
SESSION_SECRET=sua_chave_secreta_aqui
```

### 2. Criar Banco de Dados

Execute o script SQL fornecido no seu MySQL:

```bash
mysql -u seu_usuario -p < setup-database.sql
```

Ou execute manualmente os comandos do arquivo `setup-database.sql` no seu cliente MySQL.

### 3. Estrutura do Banco

O sistema criará automaticamente as seguintes tabelas:

- `sessions` - Gerenciamento de sessões
- `admins` - Usuários administradores
- `companies` - Empresas cadastradas
- `plans` - Planos de assinatura
- `global_settings` - Configurações do sistema

## 🔑 Credenciais de Acesso

**Administrador padrão:**
- Usuário: `admin`
- Senha: `admin123`

## 🏃‍♂️ Como Executar

1. Configure suas credenciais MySQL no arquivo `.env`
2. Execute o script de banco de dados
3. Inicie o sistema:

```bash
npm run dev
```

4. Acesse: `http://localhost:5000`
5. Clique em "Fazer Login como Administrador"
6. Use as credenciais fornecidas

## 📁 Estrutura do Projeto

```
├── client/          # Frontend React
├── server/          # Backend Express
├── shared/          # Schemas compartilhados
├── .env            # Configurações (crie baseado no .env.example)
├── setup-database.sql # Script de configuração do banco
└── README.md       # Este arquivo
```

## 🔧 Tecnologias Utilizadas

- **Frontend:** React, TypeScript, Tailwind CSS, Shadcn/UI
- **Backend:** Node.js, Express, TypeScript
- **Banco:** MySQL com Drizzle ORM
- **Autenticação:** Express Session
- **Validação:** Zod com validações brasileiras (CNPJ/CPF)

## 📝 Notas Importantes

- O sistema usa MySQL em vez de PostgreSQL
- As credenciais de administrador são fixas para demonstração
- Para produção, configure senhas seguras e hash adequado
- O sistema inclui validação completa de documentos brasileiros