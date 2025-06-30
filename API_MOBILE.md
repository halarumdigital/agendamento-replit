# API Mobile - Agenday

Esta documentação descreve a API REST completa para consumo em aplicativos móveis.

## Base URL
```
http://localhost:5000/api/mobile
```

## Autenticação

### 1. Login de Empresa
```http
POST /api/mobile/auth/login
Content-Type: application/json

{
  "email": "empresa@exemplo.com",
  "password": "senha123"
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": {
    "company": {
      "id": 1,
      "fantasyName": "Clínica Exemplo",
      "email": "empresa@exemplo.com",
      "phone": "11999999999",
      "address": "Rua Exemplo, 123"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "permissions": {
      "appointments": true,
      "professionals": true,
      "services": true,
      "mercadopagoPayments": false
    }
  }
}
```

### 2. Login de Profissional
```http
POST /api/mobile/auth/professional-login
Content-Type: application/json

{
  "email": "profissional@exemplo.com",
  "password": "senha123"
}
```

### 3. Logout
```http
POST /api/mobile/auth/logout
Authorization: Bearer {token}
```

## Agendamentos

### 1. Listar Agendamentos
```http
GET /api/mobile/appointments?date=2025-06-30&professionalId=1&status=agendado
Authorization: Bearer {token}
```

**Parâmetros de Query:**
- `date` (opcional): Data específica (YYYY-MM-DD)
- `professionalId` (opcional): ID do profissional
- `status` (opcional): Status do agendamento
- `page` (opcional): Página (padrão: 1)
- `limit` (opcional): Itens por página (padrão: 50)

**Resposta:**
```json
{
  "success": true,
  "data": {
    "appointments": [
      {
        "id": 1,
        "clientName": "João Silva",
        "clientPhone": "11999999999",
        "clientEmail": "joao@exemplo.com",
        "appointmentDate": "2025-06-30",
        "appointmentTime": "14:00",
        "duration": 60,
        "status": "agendado",
        "totalPrice": "150.00",
        "notes": "Primeira consulta",
        "professional": {
          "id": 1,
          "name": "Dr. Magnus",
          "specialization": "Clínico Geral"
        },
        "service": {
          "id": 1,
          "name": "Consulta",
          "price": "150.00",
          "duration": 60
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 25,
      "pages": 1
    }
  }
}
```

### 2. Criar Agendamento
```http
POST /api/mobile/appointments
Authorization: Bearer {token}
Content-Type: application/json

{
  "clientName": "João Silva",
  "clientPhone": "11999999999",
  "clientEmail": "joao@exemplo.com",
  "professionalId": 1,
  "serviceId": 1,
  "appointmentDate": "2025-06-30",
  "appointmentTime": "14:00",
  "notes": "Primeira consulta"
}
```

### 3. Atualizar Agendamento
```http
PUT /api/mobile/appointments/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "confirmado",
  "notes": "Cliente confirmou presença"
}
```

### 4. Cancelar Agendamento
```http
DELETE /api/mobile/appointments/{id}
Authorization: Bearer {token}
```

## Profissionais

### 1. Listar Profissionais
```http
GET /api/mobile/professionals
Authorization: Bearer {token}
```

### 2. Obter Profissional por ID
```http
GET /api/mobile/professionals/{id}
Authorization: Bearer {token}
```

### 3. Agenda do Profissional
```http
GET /api/mobile/professionals/{id}/schedule?date=2025-06-30
Authorization: Bearer {token}
```

## Serviços

### 1. Listar Serviços
```http
GET /api/mobile/services
Authorization: Bearer {token}
```

### 2. Serviços por Profissional
```http
GET /api/mobile/professionals/{id}/services
Authorization: Bearer {token}
```

## Clientes

### 1. Listar Clientes
```http
GET /api/mobile/clients?search=João&page=1&limit=20
Authorization: Bearer {token}
```

### 2. Criar Cliente
```http
POST /api/mobile/clients
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "João Silva",
  "phone": "11999999999",
  "email": "joao@exemplo.com",
  "birthDate": "1990-01-15",
  "address": "Rua Exemplo, 456"
}
```

### 3. Histórico de Agendamentos do Cliente
```http
GET /api/mobile/clients/{id}/appointments
Authorization: Bearer {token}
```

## Dashboard/Estatísticas

### 1. Resumo do Dashboard
```http
GET /api/mobile/dashboard
Authorization: Bearer {token}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "today": {
      "appointments": 12,
      "revenue": "1800.00",
      "confirmed": 10,
      "pending": 2
    },
    "thisWeek": {
      "appointments": 67,
      "revenue": "10050.00"
    },
    "thisMonth": {
      "appointments": 280,
      "revenue": "42000.00"
    },
    "nextAppointments": [
      {
        "id": 123,
        "clientName": "Maria Santos",
        "time": "15:30",
        "service": "Consulta"
      }
    ]
  }
}
```

### 2. Relatórios
```http
GET /api/mobile/reports?type=revenue&period=month&year=2025&month=6
Authorization: Bearer {token}
```

## Notificações

### 1. Listar Notificações
```http
GET /api/mobile/notifications
Authorization: Bearer {token}
```

### 2. Marcar como Lida
```http
PUT /api/mobile/notifications/{id}/read
Authorization: Bearer {token}
```

## WhatsApp/Comunicação

### 1. Enviar Mensagem
```http
POST /api/mobile/whatsapp/send
Authorization: Bearer {token}
Content-Type: application/json

{
  "phone": "11999999999",
  "message": "Olá! Confirmando seu agendamento para amanhã às 14h."
}
```

### 2. Status da Instância WhatsApp
```http
GET /api/mobile/whatsapp/status
Authorization: Bearer {token}
```

## Pagamentos (Mercado Pago)

### 1. Gerar Link de Pagamento
```http
POST /api/mobile/payments/generate-link
Authorization: Bearer {token}
Content-Type: application/json

{
  "appointmentId": 123,
  "amount": "150.00",
  "description": "Consulta médica - Dr. Magnus"
}
```

### 2. Verificar Status do Pagamento
```http
GET /api/mobile/payments/{paymentId}/status
Authorization: Bearer {token}
```

## Configurações

### 1. Configurações da Empresa
```http
GET /api/mobile/settings/company
Authorization: Bearer {token}
```

### 2. Atualizar Configurações
```http
PUT /api/mobile/settings/company
Authorization: Bearer {token}
Content-Type: application/json

{
  "fantasyName": "Nova Clínica",
  "phone": "11888888888",
  "mercadopagoEnabled": true
}
```

## Códigos de Status HTTP

- `200` - Sucesso
- `201` - Criado com sucesso
- `400` - Erro de validação
- `401` - Não autenticado
- `403` - Não autorizado (permissão negada)
- `404` - Não encontrado
- `422` - Erro de validação de dados
- `500` - Erro interno do servidor

## Estrutura de Resposta Padrão

### Sucesso
```json
{
  "success": true,
  "data": { ... },
  "message": "Operação realizada com sucesso"
}
```

### Erro
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados inválidos",
    "details": {
      "field": "email",
      "message": "Email é obrigatório"
    }
  }
}
```

## Autenticação por Token JWT

Todos os endpoints (exceto login) requerem o header:
```
Authorization: Bearer {token}
```

O token JWT contém:
- ID da empresa/profissional
- Permissões
- Expiração (24 horas)

## Rate Limiting

- Máximo 1000 requisições por hora por token
- Máximo 100 requisições por minuto por IP

## Versionamento

A API suporta versionamento através do header:
```
Accept: application/json; version=1.0
```

## WebSocket (Tempo Real)

Para atualizações em tempo real de agendamentos:
```javascript
const socket = io('ws://localhost:5000', {
  auth: {
    token: 'seu_jwt_token'
  }
});

socket.on('appointment_created', (data) => {
  console.log('Novo agendamento:', data);
});

socket.on('appointment_updated', (data) => {
  console.log('Agendamento atualizado:', data);
});
```

## Offline Support

A API suporta operações offline através de:
- Cache local de dados essenciais
- Sincronização automática quando online
- Queue de operações pendentes
