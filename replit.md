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
- June 22, 2025. COMPLETED: Enhanced subscription payment interface with complete Stripe integration - added detailed pricing breakdown with total value display, implemented installment payment options (1x, 2x, 3x without interest) for both monthly and annual plans, created demo mode fallback for invalid Stripe keys, fixed SetupIntent payment flow for trial periods, improved payment flow user experience with clear pricing information and billing period selection
- June 22, 2025. COMPLETED: Migration from Replit Agent to Replit environment - fixed subscription flow to correctly redirect to payment page for plans with free trial periods, updated Stripe integration to use SetupIntent for payment method configuration, corrected plan descriptions to display number of professionals allowed
- June 22, 2025. COMPLETED: Tour system critical fixes - corrected invalid CSS selectors causing JavaScript errors, updated step 3 to target services menu link correctly, fixed step 4 to use proper href selector for settings menu, resolved tour synchronization issues
- June 22, 2025. COMPLETED: Tour visual styling simplified - removed outline and border effects, now uses only background color highlighting from global tour color configuration for cleaner visual experience
- June 22, 2025. COMPLETED: Tour step cleanup system fixed - resolved multiple highlight issue where previous tour steps remained highlighted when advancing to next step, implemented comprehensive cleanup function that removes all tour-highlighted classes and styles before applying new highlights, ensured proper visual progression with only one element highlighted at a time
- June 22, 2025. COMPLETED: Tour highlighting system fully implemented - fixed color blinking animations using exact global purple theme colors (hsl(294, 72%, 54%)), added strong visual indicators with box shadows, outlines, and CSS classes, implemented proper element detection and styling with enhanced visibility through ::before pseudo-elements
- June 22, 2025. COMPLETED: Tour visual design refined - updated animations to use global color scheme instead of hardcoded blue colors, implemented gentle movement animations with minimal scaling and subtle vertical translation, positioned tour modal in bottom-right corner to avoid blocking page interactions
- June 22, 2025. COMPLETED: Guided tour click-through functionality fixed - removed click prevention in tour elements, implemented proper z-index hierarchy, added smooth pulse animations, and enabled natural navigation while maintaining tour progression
- June 22, 2025. COMPLETED: Tour restart functionality added to dashboard - integrated "Reiniciar Tour" button with proper authentication, added guided tour component to correct dashboard, and implemented tour reset API endpoint
- June 22, 2025. COMPLETED: Company registration form fixed - added missing mandatory plan selection field, corrected form validation, and resolved non-functional "Cadastrar Empresa" button
- June 22, 2025. COMPLETED: Tour system MySQL compatibility fixes - removed unsupported .returning() methods, corrected API endpoint from /progress to /status, added comprehensive debugging, and ensured proper first-time user tour display
- June 22, 2025. COMPLETED: Full guided tour system implementation - created admin configuration panel for tour steps, company-side interactive tour component with step navigation and overlay, automatic first-time user detection, tour progress tracking, and database schema with tour_steps and company_tour_progress tables
- June 21, 2025. COMPLETED Evolution API v2.3.0 integration with QR code functionality - fixed WhatsApp instance creation and added working QR code generation using /instance/connect endpoint with proper payload structure
- June 21, 2025. Updated WhatsApp instance deletion to use correct Evolution API endpoint - fixed DELETE /instance/delete/{instanceName} to use base URL without /api/ prefix
- June 21, 2025. Implemented WhatsApp instance status refresh using Evolution API - added GET /instance/connectionState/{instanceName} endpoint for real-time status updates
- June 21, 2025. Fixed WhatsApp webhook configuration endpoint - corrected Evolution API URL to use /webhook/set/{instanceName} instead of /api/webhook/set/{instanceName}
- June 21, 2025. Fixed webhook payload format for Evolution API - updated to use proper webhook object structure with webhookByEvents and webhookBase64 properties
- June 21, 2025. Optimized webhook events configuration - reduced to essential events (QRCODE_UPDATED, MESSAGES_UPSERT) for better performance and Evolution API compatibility
- June 21, 2025. Fixed webhook payload structure for Evolution API - restored webhook object structure as required by Evolution API validation
- June 21, 2025. Corrected webhookBase64 parameter to true - Evolution API now properly accepts webhook configuration with base64 encoding enabled
- June 21, 2025. COMPLETED: Evolution API webhook configuration optimized - restored essential events (QRCODE_UPDATED, MESSAGES_UPSERT) with webhookByEvents and webhookBase64 set to true, maintaining proper Evolution API compatibility
- June 21, 2025. Fixed Evolution API URL correction in review invitation system - applied proper URL formatting to prevent HTML response errors when sending review invitations via WhatsApp
- June 21, 2025. COMPLETED: Evolution API global configuration setup - configured system URL (http://agenday.gilliard.dev) and Evolution API credentials in global settings for proper review invitation functionality
- June 21, 2025. Implemented complete WhatsApp instance management system - added full CRUD operations for WhatsApp instances with proper Evolution API integration using /instance/create endpoint, webhook configuration, and comprehensive error handling
- June 21, 2025. Applied Evolution API URL correction across entire codebase - fixed all WhatsApp messaging, campaign scheduling, and instance management to use proper /api/ endpoints instead of web interface URLs
- June 21, 2025. Resolved Evolution API URL configuration issues - implemented automatic endpoint detection and correction for proper API communication instead of web interface access
- June 21, 2025. Fixed admin settings FormDescription import error - admin configuration page now loads correctly
- June 21, 2025. Enhanced Evolution API connection diagnostics - added detailed URL correction logging and improved error messages for HTML responses
- June 21, 2025. Fixed WhatsApp instance creation errors - applied URL correction to all Evolution API endpoints to prevent "Unexpected token" JSON parsing errors
- June 21, 2025. Fixed WhatsApp review invitation error - enhanced Evolution API error handling with specific diagnostics and added admin test connection tool
- June 21, 2025. Added system URL configuration field to admin settings - review invitation links now use configured domain instead of localhost
- June 21, 2025. Implemented dynamic ticket categories - companies now see categories based on admin-configured ticket types instead of hardcoded values
- June 21, 2025. Added admin file upload capability for support ticket responses with support for images, PDF, DOC, DOCX, and TXT files (5MB limit)
- June 21, 2025. Fixed admin support panel to use dynamic status selection from database instead of hardcoded values
- June 21, 2025. Fixed support ticket image attachments - added proper static file serving and debug logging for image display
- June 21, 2025. Made support menu universally accessible - removed all permission requirements for company support functionality
- June 21, 2025. Moved copyright/version info from sidebar to fixed footer on all screens
- June 21, 2025. Created missing /api/company/plan-info endpoint to fix empty company sidebar menus
- June 19, 2025. Initial setup
```

## User Preferences
```
Preferred communication style: Simple, everyday language.
```