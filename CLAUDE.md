# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Smilelab MDR Management System

Next.js 15 dental laboratory management application with EU MDR Annex XIII compliance.

## Commands

### Development
```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Database (Prisma)
```bash
npx prisma generate           # Generate Prisma Client
npx prisma migrate dev        # Create migration in dev
npx prisma migrate deploy     # Apply migrations in production
npx prisma db push            # Push schema without migration (dev only)
npx prisma db seed            # Run seed file
npx prisma studio             # Open Prisma Studio GUI
npx prisma format             # Format schema file
```

### Testing (when implemented)
```bash
npm run test              # Run all tests
npm run test:unit         # Unit tests only
npm run test:e2e          # E2E tests (Playwright)
npm run test:coverage     # Coverage report
```

## Architecture

### Directory Structure
```
app/                          # Next.js App Router
├── (auth)/                   # Authentication routes (login, register)
├── (dashboard)/              # Protected dashboard routes
│   ├── orders/              # Order management
│   ├── worksheets/          # Worksheet management with FDI selector
│   ├── pricing/             # Pricing list CRUD
│   ├── dentists/            # Dentist/clinic management
│   ├── materials/           # Material inventory & LOT tracking
│   ├── quality-control/     # QC workflow
│   ├── invoices/            # Invoice generation
│   └── dashboard/           # Main dashboard
├── api/                     # API routes
│   ├── auth/[...nextauth]/  # NextAuth endpoints
│   ├── orders/              # Order CRUD
│   ├── worksheets/          # Worksheet CRUD
│   └── ...                  # Other resource endpoints
├── layout.tsx               # Root layout
└── globals.css              # Global styles

components/                   # Reusable React components
├── ui/                      # ShadCN UI components
├── orders/                  # Order-specific components
├── worksheets/              # Worksheet components
│   └── TeethSelector.tsx    # **CRITICAL** - FDI teeth notation selector
├── pricing/
├── materials/
└── shared/                  # Shared components (nav, breadcrumbs, etc.)

lib/                         # Business logic and utilities
├── prisma.ts               # Prisma client singleton
├── auth.ts                 # NextAuth configuration
├── services/               # Service layer (database operations)
│   ├── order-service.ts
│   ├── worksheet-service.ts    # **CRITICAL** - Worksheet logic
│   ├── material-service.ts     # **CRITICAL** - FIFO LOT tracking
│   ├── pricing-service.ts
│   ├── email-service.ts
│   └── audit-service.ts
├── state-machines/         # Workflow state machines
│   └── worksheet-state-machine.ts
├── pdf/                    # PDF generation
│   ├── annex-xiii-generator.ts   # **CRITICAL** - MDR compliance
│   └── templates/          # Handlebars templates
└── utils/                  # Utility functions

prisma/
├── schema.prisma           # **CRITICAL** - Database schema (15+ models)
├── seed.ts                 # Seed data
└── migrations/             # Database migrations

types/                      # TypeScript type definitions
├── order.ts
├── worksheet.ts
├── material.ts
└── index.ts
```

### Tech Stack Decisions

**Framework**: Next.js 15 with App Router
- TypeScript strict mode enabled
- React 19 with experimental features
- Server Components by default, Client Components as needed

**Database**: PostgreSQL 15+ with Prisma ORM
- 15+ models for complete dental lab workflow
- Material traceability architecture (Material → LOT → Device)
- Immutable audit logs (onDelete: Restrict)
- 10-year document retention tracking

**UI**: ShadCN UI + Tailwind CSS
- Radix UI primitives for accessibility
- Custom theme for medical/professional aesthetic
- Responsive design (desktop + tablet focus)

**Authentication**: NextAuth.js with JWT
- 4 roles: ADMIN, TECHNICIAN, QC_INSPECTOR, INVOICING
- Role-based access control (RBAC)
- Session-based with JWT tokens

**PDF Generation**: Puppeteer + Handlebars
- EU MDR Annex XIII documents
- Invoice generation
- 10-year retention in PostgreSQL

**Email**: Nodemailer with Gmail SMTP
- Invoice delivery
- Order confirmations
- Email tracking via EmailLog table

### Critical Implementation Details

#### 1. FDI Teeth Notation System
**Component**: `components/worksheets/TeethSelector.tsx`

The FDI two-digit notation system (ISO 3950):
- **Permanent teeth**: 11-18 (upper right), 21-28 (upper left), 31-38 (lower left), 41-48 (lower right)
- **Primary teeth**: 51-55, 61-65, 71-75, 81-85

Implementation requirements:
- Visual jaw representation (4 quadrants)
- Multi-tooth selection
- Work type assignment per tooth (crown, bridge, filling, implant, denture)
- SVG or Canvas-based rendering
- State management for selections
- Validation (only valid FDI numbers)

**No existing libraries** - custom implementation required.

#### 2. Material LOT Tracking (FIFO)
**Service**: `lib/services/material-service.ts`

FIFO (First In, First Out) algorithm for material consumption:
- Stock arrivals create MaterialLot records with expiry dates
- `getAvailableMaterials()`: Query AVAILABLE status, not expired, ordered by arrival date ASC
- `consumeMaterial(worksheetId, materialId, quantity)`:
  1. Find oldest available LOT
  2. Deduct quantity
  3. Update status to DEPLETED if quantity reaches zero
  4. Create WorksheetMaterial record (traceability)
- Expiry alerts: Materials expiring within 30 days

**Database Path**: Material → MaterialLot → WorksheetMaterial → WorkSheet → Patient

#### 3. Worksheet State Machine
**File**: `lib/state-machines/worksheet-state-machine.ts`

State flow: `DRAFT → IN_PRODUCTION → QC_PENDING → QC_APPROVED → INVOICED → DELIVERED`

Transition rules:
- QC approval required before invoice generation
- QC rejection returns to `IN_PRODUCTION` with notes
- Annex XIII auto-generated on QC approval
- All transitions create audit log entries

#### 4. EU MDR Annex XIII Generation
**Service**: `lib/pdf/annex-xiii-generator.ts`

Manufacturer's Statement for custom-made dental devices must include:
- Device identification (DN-XXX number)
- Manufacture date
- Patient name/ID (anonymized per GDPR)
- Prescriber (dentist) name and license number
- Device description and intended use
- Materials used with manufacturer details
- LOT numbers for all materials (traceability)
- CE marking status
- Biocompatibility data (ISO 10993 references)
- Manufacturer's declaration of conformity
- Responsible person signature
- 10-year retention tracking (`retentionUntil` field)

#### 5. Authentication & Authorization

**User Roles**:
- `ADMIN`: Full system access, user management
- `TECHNICIAN`: Create/edit orders and worksheets, assign materials
- `QC_INSPECTOR`: Quality control approval/rejection
- `INVOICING`: Generate invoices, send emails

**Route Protection**: Middleware in `middleware.ts` checks session and role permissions.

**API Route Pattern**:
```typescript
// Example protected API route
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Check role-specific permissions
  if (!['ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
    return new Response('Forbidden', { status: 403 });
  }

  // ... route logic
}
```

### Database Schema Highlights

**Key Models**:
- `User`: Authentication, roles, audit tracking
- `Dentist`: Clinics and prescribers
- `Patient`: Patient records (anonymized)
- `Order`: Sequential numbering (001, 002, 003...)
- `WorkSheet`: DN-prefix (DN-001, DN-002...), one-to-one with Order
- `WorksheetTooth`: FDI teeth data for worksheets
- `WorksheetProduct`: Products selected for worksheet
- `WorksheetMaterial`: Materials used (links to MaterialLot for traceability)
- `Product`: Product catalog
- `ProductPriceHistory`: Price versioning over time
- `Material`: Material types (ceramic, metal, resin, etc.)
- `MaterialLot`: Stock arrivals with LOT numbers, expiry dates, FIFO tracking
- `QualityControl`: QC records (approval/rejection with notes)
- `Invoice`: Invoice generation with PDF storage
- `EmailLog`: Email delivery tracking
- `Document`: Annex XIII documents with 10-year retention
- `AuditLog`: Immutable activity logs

**Critical Relationships**:
```
Order ↔ WorkSheet (1:1)
WorkSheet ↔ WorksheetTooth (1:many)
WorkSheet ↔ WorksheetProduct (1:many)
WorkSheet ↔ WorksheetMaterial (1:many)
Material → MaterialLot (1:many)
MaterialLot ↔ WorksheetMaterial (1:many)
```

### Coding Standards

**TypeScript**:
- Strict mode enabled
- Explicit types for all function parameters and return values
- Use `type` for object shapes, `interface` for extensible contracts
- Avoid `any` - use `unknown` if type is truly unknown

**React**:
- Server Components by default
- Client Components only when needed (`'use client'`)
- Use React Hook Form for forms
- Zod for validation schemas
- Error boundaries for error handling

**Prisma**:
- Use Prisma Client for all database operations
- Never write raw SQL unless absolutely necessary
- Use transactions for multi-table operations
- Use `select` to minimize data fetching
- Use `include` for relations only when needed

**Services Layer Pattern**:
```typescript
// Example service pattern
export class WorksheetService {
  async create(data: CreateWorksheetDto, userId: string): Promise<Worksheet> {
    // Business logic validation
    // State machine checks
    // Database operations in transaction
    // Audit log creation
    return worksheet;
  }
}
```

**Error Handling**:
```typescript
// API route error handling
try {
  const result = await service.operation();
  return Response.json(result);
} catch (error) {
  console.error('Operation failed:', error);

  if (error instanceof ValidationError) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  if (error instanceof NotFoundError) {
    return Response.json({ error: 'Resource not found' }, { status: 404 });
  }

  return Response.json({ error: 'Internal server error' }, { status: 500 });
}
```

### Testing Strategy (Not Yet Implemented)

**E2E Tests (Playwright)**: Target 85%+ coverage
- Critical workflow: Order → Worksheet → QC → Invoice → Email
- FDI teeth selector interactions
- Material LOT FIFO selection
- State machine transitions
- Document generation

**Unit Tests (Jest)**:
- All service layer functions
- State machine logic
- FIFO algorithm
- Validation utilities
- PDF generation

**Integration Tests**:
- API routes
- Database operations
- Authentication flows

### Performance Considerations

**Database Queries**:
- Use Prisma's `select` to fetch only needed fields
- Index frequently queried fields (orderNumber, worksheetNumber, lotNumber)
- Use pagination for list views (limit 20 per page)
- Avoid N+1 queries - use `include` wisely

**PDF Generation**:
- Generate PDFs asynchronously
- Cache generated PDFs in database
- Optimize Puppeteer for memory usage
- Use headless Chrome efficiently

**State Management**:
- Server state via Prisma queries
- Client state with React hooks
- Form state with React Hook Form
- No global state library needed (yet)

### Deployment

**Target Environment**: Digital Ocean Droplet (4GB RAM / 2 vCPU)
- Docker Compose with PostgreSQL container
- Nginx reverse proxy with SSL (Let's Encrypt)
- EU region (Amsterdam) for GDPR compliance
- Automated backups to Digital Ocean Spaces

**Environment Variables** (.env.local):
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/smilelab_mdr"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Email (Gmail SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Puppeteer (PDF generation)
PUPPETEER_EXECUTABLE_PATH="/usr/bin/chromium-browser"
```

### Compliance Requirements

**EU MDR Annex XIII**:
- Material traceability (forward and reverse)
- 10-year document retention
- Manufacturer's Statement for all custom-made devices
- CE marking tracking
- Biocompatibility data inclusion

**GDPR**:
- Patient data anonymization
- Right to be forgotten (soft delete)
- Data minimization
- Audit logs for data access
- EU data residency (Amsterdam region)

**ISO 13485** (Quality Management):
- Immutable audit trails
- Quality control gate enforcement
- Document version control
- Traceability reports

### Known Limitations & Future Work

**Current Limitations**:
- No offline-first support (planned for Phase 4)
- No 3D file import (planned for Phase 5)
- No dentist portal (planned for Phase 5)
- No automated backups (manual for now)
- No email templates customization UI

**Future Integrations**:
- CAD/CAM software integration (API-first)
- 3D file viewer and import
- Dentist self-service portal
- Real-time dashboard updates (WebSocket)
- Advanced reporting and analytics

### Development Workflow

1. **Check Progress**: Review `progress-tracker-initial.json` for next task
2. **Create Feature Branch**: `git checkout -b feature/task-id-description`
3. **Implement**: Follow service layer → API routes → UI pages pattern
4. **Test Manually**: Run dev server, test all user flows
5. **Update Progress**: Mark task as completed in progress tracker
6. **Commit**: `git commit -m "feat: description (TASK-ID)"`
7. **Merge**: Once tested, merge to develop branch

### Critical Files to Never Break

1. **prisma/schema.prisma** - Database schema (800 lines)
   - Changes require migrations
   - Breaking changes affect entire system

2. **components/worksheets/TeethSelector.tsx** - FDI selector (400 lines)
   - Most complex custom component
   - No library equivalent

3. **lib/services/worksheet-service.ts** - Core business logic (400 lines)
   - Orchestrates entire workflow
   - State machine integration

4. **lib/pdf/annex-xiii-generator.ts** - MDR compliance (300 lines)
   - Legal requirement
   - Template changes need regulatory review

5. **lib/services/material-service.ts** - FIFO tracking (300 lines)
   - Traceability requirement
   - Complex algorithm

### Common Tasks

**Add New API Endpoint**:
1. Define types in `types/`
2. Create service function in `lib/services/`
3. Create API route in `app/api/`
4. Add error handling and validation
5. Create audit log entry if needed

**Add New UI Page**:
1. Create page in `app/(dashboard)/`
2. Create components in `components/`
3. Use ShadCN UI components
4. Implement form with React Hook Form + Zod
5. Connect to API routes

**Add New Database Model**:
1. Update `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name description`
3. Update types in `types/`
4. Create service layer
5. Update seed data if needed

**Generate PDF Document**:
1. Create Handlebars template in `lib/pdf/templates/`
2. Create generator function (Puppeteer setup)
3. Save PDF to database (Document table)
4. Set retention period (10 years for MDR)

---

**Project UUID**: ec615192-0f63-48d1-96d5-44834d460e3d
**Status**: Initial Setup Complete - Ready for Implementation
**Next Critical Task**: Create Prisma schema (DB-001)
