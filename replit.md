# Admin Management System

## Overview

This is a comprehensive business management system built with Express.js and MySQL, featuring an admin panel for managing companies and subscription plans. The system includes a full-featured appointment scheduling system with WhatsApp integration, client management, professional reviews, and subscription management capabilities.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **UI Components**: Radix UI components with shadcn/ui
- **Styling**: Tailwind CSS with custom design system
- **State Management**: TanStack Query for server state management
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **API**: RESTful API with JSON responses
- **Session Management**: Express-session with MySQL store
- **Authentication**: Bcrypt for password hashing, session-based auth

### Database Architecture
- **Primary Database**: MySQL with connection pooling
- **ORM**: Drizzle ORM for type-safe database operations
- **Migrations**: SQL-based migrations and JavaScript migration scripts
- **Schema**: Shared TypeScript schema definitions

## Key Components

### Core Entities
1. **Admin System**
   - Admin users with role-based access
   - Company management and oversight
   - Subscription plan administration

2. **Company Management**
   - Multi-tenant architecture supporting multiple companies
   - CNPJ/CPF validation for Brazilian businesses
   - Company profiles with contact information and settings

3. **Subscription Management**
   - Flexible plan system with custom permissions
   - Integration with Stripe for payment processing
   - Plan-based feature restrictions

4. **Appointment System**
   - Professional and service management
   - Client booking and management
   - Status tracking and notifications

5. **Communication System**
   - WhatsApp integration via Evolution API
   - Automated reminders and notifications
   - Message campaigns and templates

6. **Review System**
   - Professional reviews and ratings
   - Review invitations via WhatsApp
   - Public review display

### Advanced Features
- **AI Integration**: OpenAI API integration for automated responses
- **Points System**: Loyalty program with point accumulation
- **Task Management**: Recurring task system with reminders
- **SMTP Configuration**: Custom email settings per company
- **Custom Domains**: Support for custom domain configurations

## Data Flow

### Authentication Flow
1. Admin/Company login with email/password
2. Bcrypt password verification
3. Session creation and storage in MySQL
4. Middleware-based route protection

### Company Operations Flow
1. Admin creates companies with subscription plans
2. Companies access their dedicated dashboard
3. Plan-based permission checking for feature access
4. Real-time data updates via API calls

### Appointment Scheduling Flow
1. Client books appointment through company's interface
2. System validates availability and plan limits
3. Automated notifications sent via WhatsApp/SMS
4. Appointment status updates and reminders

### Communication Flow
1. WhatsApp integration through Evolution API
2. Automated message campaigns based on triggers
3. Two-way communication handling
4. Message history and conversation tracking

## External Dependencies

### Payment Processing
- **Stripe**: Subscription billing and payment processing
- Plan-based feature restrictions
- Automatic subscription status updates

### Communication Services
- **Evolution API**: WhatsApp Business API integration
- **SendGrid**: Email delivery service
- **SMTP**: Custom email configuration support

### AI Services
- **OpenAI API**: GPT-4 integration for intelligent responses
- Configurable temperature and token limits
- Custom prompts per company

### Development Tools
- **Replit**: Development environment and deployment
- **Drizzle Kit**: Database schema management
- **TypeScript**: Type safety across the stack

## Deployment Strategy

### Environment Configuration
- MySQL database connection via environment variables
- Session secret for secure cookie signing
- External API keys for integrations
- SMTP configuration for email services

### Build Process
1. Frontend build via Vite (React → static files)
2. Backend build via esbuild (TypeScript → JavaScript)
3. Static asset serving through Express

### Database Setup
- Automated table creation on startup
- Migration scripts for schema updates
- Connection pooling for performance
- Session storage in database

### Scaling Considerations
- Connection pooling for database efficiency
- Session-based authentication for multi-instance support
- File upload handling with static serving
- Background job processing for notifications

## Changelog
```
Changelog:
- June 21, 2025. Made support menu universally accessible - removed all permission requirements for company support functionality
- June 21, 2025. Moved copyright/version info from sidebar to fixed footer on all screens
- June 21, 2025. Created missing /api/company/plan-info endpoint to fix empty company sidebar menus
- June 19, 2025. Initial setup
```

## User Preferences
```
Preferred communication style: Simple, everyday language.
```