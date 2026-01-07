# Multi-Tenant SaaS Conversion Analysis

## Executive Summary

Converting the Smilelab MDR system to a multi-tenant SaaS platform is **feasible** but requires **significant architectural changes**. This document outlines the effort, approach, and considerations.

### Effort Estimate: **4-6 weeks** (160-240 hours)
### Complexity: **High** (affects core architecture, database, security)
### Risk Level: **Medium-High** (requires careful data isolation)

---

## 🏗️ Multi-Tenancy Architecture Options

### Option 1: Database Per Tenant (Recommended for Medical Data)
**Approach**: Each laboratory gets their own PostgreSQL database
**Pros**:
- ✅ Complete data isolation (critical for medical compliance)
- ✅ Easier EU MDR compliance (data sovereignty)
- ✅ Per-tenant backups and restoration
- ✅ Performance isolation
- ✅ Custom schema per tenant (if needed)

**Cons**:
- ❌ More complex infrastructure
- ❌ Higher hosting costs
- ❌ Migration complexity

**Effort**: 5-6 weeks

### Option 2: Shared Database with Tenant ID (Faster, Lower Cost)
**Approach**: Single database, all tables have `tenantId` column
**Pros**:
- ✅ Simpler infrastructure
- ✅ Lower hosting costs
- ✅ Easier to deploy
- ✅ Shared resources

**Cons**:
- ❌ Data leakage risk (critical issue for medical data)
- ❌ Requires perfect query filtering
- ❌ Performance degradation at scale
- ❌ Compliance challenges

**Effort**: 4-5 weeks

### Option 3: Hybrid (Database Per Tenant + Shared Management DB)
**Approach**: Shared DB for user management, separate DBs for tenant data
**Pros**:
- ✅ Best of both worlds
- ✅ Centralized user management
- ✅ Complete data isolation for medical data

**Cons**:
- ❌ Most complex architecture
- ❌ Highest effort

**Effort**: 6-8 weeks

---

## 📋 Required Changes by Category

### 1. Database Schema Changes (3-5 days)

#### Option 1 (Recommended): Database Per Tenant

**Central Management Database** (`saas_management`):
```prisma
model Tenant {
  id                String   @id @default(cuid())
  name              String   // Laboratory name
  subdomain         String   @unique // e.g., "dentro"
  customDomain      String?  @unique // e.g., "lab.dentro.si"

  // Database connection
  databaseUrl       String   @unique
  databaseName      String

  // Subscription
  plan              String   // STARTER, PROFESSIONAL, ENTERPRISE
  status            String   // ACTIVE, SUSPENDED, CANCELLED
  trialEndsAt       DateTime?
  subscriptionEndsAt DateTime?

  // Limits
  maxUsers          Int      @default(5)
  maxOrders         Int?     // null = unlimited
  storageLimit      Int      @default(10) // GB

  // Billing
  billingEmail      String
  taxNumber         String?

  // Features
  features          Json     // Custom features per plan

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  users             TenantUser[]
  subscriptions     Subscription[]
  invoices          BillingInvoice[]
}

model TenantUser {
  id                String   @id @default(cuid())
  tenantId          String
  email             String
  role              String   // TENANT_OWNER, TENANT_ADMIN, TENANT_USER

  tenant            Tenant   @relation(fields: [tenantId], references: [id])

  @@unique([tenantId, email])
}

model Subscription {
  id                String   @id @default(cuid())
  tenantId          String
  plan              String
  status            String
  amount            Decimal
  currency          String   @default("EUR")
  interval          String   // MONTHLY, YEARLY

  currentPeriodStart DateTime
  currentPeriodEnd   DateTime

  stripeSubscriptionId String? @unique

  tenant            Tenant   @relation(fields: [tenantId], references: [id])
}
```

**Tenant Database** (existing schema + tenant metadata):
```prisma
// Add to existing schema
model TenantSettings {
  id         String @id @default(cuid())
  tenantId   String @unique // Reference to central DB

  // Same as current LabConfiguration
  laboratoryName String
  // ... rest of fields
}
```

#### Option 2: Shared Database with Tenant ID

Add to **every** existing model:
```prisma
model User {
  id        String @id @default(cuid())
  tenantId  String // NEW FIELD
  email     String
  // ... rest of fields

  tenant    Tenant @relation(fields: [tenantId], references: [id])

  @@unique([tenantId, email]) // Ensure unique email per tenant
  @@index([tenantId]) // Critical for query performance
}

// Apply same pattern to:
// - Dentist, Patient, Order, WorkSheet
// - Product, Material, MaterialLot
// - QualityControl, Invoice, Document
// - And ALL other models (15+ models)
```

---

### 2. Authentication & Authorization Changes (4-6 days)

#### Current State:
```typescript
// Single-tenant authentication
signIn('credentials', { email, password })
```

#### Multi-Tenant State:
```typescript
// Tenant identification
// Option A: Subdomain-based (lab1.saas.com)
// Option B: Custom domain (lab.dentro.si)
// Option C: Login form with tenant selection

const tenant = getTenantFromRequest(req);
const db = getTenantDatabase(tenant.id);

signIn('credentials', {
  email,
  password,
  tenantId: tenant.id
})
```

**Changes Needed**:

1. **Tenant Resolution Middleware**:
```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const tenant = await resolveTenant(request);

  if (!tenant) {
    return NextResponse.redirect('/tenant-not-found');
  }

  // Attach tenant to request context
  request.headers.set('x-tenant-id', tenant.id);

  return NextResponse.next();
}
```

2. **Database Context per Request**:
```typescript
// lib/tenant-context.ts
import { headers } from 'next/headers';

export function getTenantDb() {
  const headersList = headers();
  const tenantId = headersList.get('x-tenant-id');

  if (!tenantId) throw new Error('No tenant context');

  // Option 1: Get tenant-specific database
  const dbUrl = getTenantDatabaseUrl(tenantId);
  return new PrismaClient({ datasources: { db: { url: dbUrl } } });

  // Option 2: Use shared DB with automatic filtering
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
      },
    },
  });
}
```

3. **Update All API Routes**:
```typescript
// Before:
const products = await prisma.product.findMany();

// After:
const db = getTenantDb();
const products = await db.product.findMany();
```

---

### 3. Routing & Domain Handling (2-3 days)

#### Subdomain-Based Routing:
```typescript
// app/middleware.ts
const hostname = request.headers.get('host');
const subdomain = hostname?.split('.')[0];

// dentro.saas.com → tenant: "dentro"
// lab1.saas.com → tenant: "lab1"
// saas.com → landing page

if (subdomain && subdomain !== 'www') {
  const tenant = await getTenantBySubdomain(subdomain);
  // Set tenant context
}
```

#### Custom Domain Routing:
```typescript
// Support custom domains (lab.dentro.si)
const customDomain = await getTenantByCustomDomain(hostname);

if (customDomain) {
  // Set tenant context
}
```

**DNS Configuration**:
- Wildcard DNS: `*.saas.com → Your server IP`
- Custom domain verification (DNS TXT records)

---

### 4. Tenant Onboarding Flow (3-4 days)

```
Landing Page → Sign Up Form → Create Tenant → Provision Database → Seed Initial Data → First Login
```

**New Pages**:
1. `/signup` - Multi-step registration
2. `/onboarding` - Guided setup wizard
3. `/plans` - Pricing and plans
4. `/admin` - Super admin dashboard (manage all tenants)

**Onboarding Process**:
```typescript
async function createTenant(data: SignupData) {
  // 1. Create tenant record
  const tenant = await managementDb.tenant.create({
    data: {
      name: data.laboratoryName,
      subdomain: data.subdomain,
      plan: data.plan,
      status: 'TRIAL',
      trialEndsAt: addDays(new Date(), 14),
    }
  });

  // 2. Provision database (Option 1)
  const dbUrl = await provisionTenantDatabase(tenant.id);
  await managementDb.tenant.update({
    where: { id: tenant.id },
    data: { databaseUrl: dbUrl }
  });

  // 3. Run migrations
  await runMigrations(dbUrl);

  // 4. Seed initial data
  await seedTenantDatabase(tenant.id, {
    ownerEmail: data.email,
    ownerPassword: data.password,
    laboratoryName: data.laboratoryName,
  });

  // 5. Send welcome email
  await sendWelcomeEmail(data.email, {
    tenantUrl: `https://${data.subdomain}.saas.com`,
    credentials: { email: data.email, password: '...' }
  });

  return tenant;
}
```

---

### 5. Billing & Subscription Management (5-7 days)

**Integration**: Stripe or Paddle

**Features**:
- Plan selection (Starter, Professional, Enterprise)
- Payment processing
- Subscription management
- Usage tracking
- Metered billing (optional: per order, per user)
- Invoicing

**Schema**:
```prisma
model BillingInvoice {
  id                String   @id @default(cuid())
  tenantId          String
  amount            Decimal
  currency          String
  status            String
  paidAt            DateTime?
  stripeInvoiceId   String?

  tenant            Tenant   @relation(fields: [tenantId], references: [id])
}

model UsageRecord {
  id          String   @id @default(cuid())
  tenantId    String
  metric      String   // ORDERS, USERS, STORAGE
  quantity    Int
  period      DateTime
}
```

**Pricing Example**:
```yaml
Starter: €49/month
  - 5 users
  - 100 orders/month
  - 10GB storage
  - Basic support

Professional: €149/month
  - 15 users
  - 500 orders/month
  - 50GB storage
  - Priority support
  - Custom branding

Enterprise: Custom pricing
  - Unlimited users
  - Unlimited orders
  - Unlimited storage
  - Dedicated support
  - Custom integrations
```

---

### 6. Super Admin Dashboard (3-4 days)

**Features**:
- View all tenants
- Tenant analytics
- Subscription management
- Support tools
- Usage monitoring
- Billing overview

**Routes**:
```
/superadmin/
  /dashboard       - Overview
  /tenants         - All tenants
  /tenants/[id]    - Tenant details
  /analytics       - Platform analytics
  /billing         - Billing overview
```

---

### 7. Data Migration & Isolation (2-3 days)

**Row-Level Security (Option 2 - Shared DB)**:
```sql
-- PostgreSQL RLS
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_setting('app.tenant_id')::text);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

**Prisma Middleware (Option 2 - Shared DB)**:
```typescript
prisma.$use(async (params, next) => {
  const tenantId = getTenantIdFromContext();

  if (params.model && params.model !== 'Tenant') {
    // Automatically inject tenantId filter
    if (params.action === 'findMany' || params.action === 'findFirst') {
      params.args.where = {
        ...params.args.where,
        tenantId,
      };
    }

    if (params.action === 'create') {
      params.args.data = {
        ...params.args.data,
        tenantId,
      };
    }
  }

  return next(params);
});
```

---

### 8. UI/UX Changes (2-3 days)

**Changes Needed**:
1. **Tenant Branding**:
   - Custom logo upload
   - Custom color scheme
   - White-label options

2. **Tenant Settings Page**:
   - Subscription management
   - Billing information
   - Team management
   - Usage overview

3. **User Management**:
   - Invite users to tenant
   - Role management (per tenant)
   - User limits enforcement

---

## 💰 Pricing Model Options

### Option 1: Per-Seat Pricing
```
Base: €49/month (5 users)
Additional users: €10/user/month
```

### Option 2: Tier-Based
```
Starter: €49/month (5 users, 100 orders)
Professional: €149/month (15 users, 500 orders)
Enterprise: Custom (unlimited)
```

### Option 3: Usage-Based
```
Base: €29/month
+ €0.50 per order processed
+ €5 per user/month
+ €0.10 per GB storage
```

### Recommended: Hybrid
```
Starter: €49/month
  - 5 users included
  - 100 orders/month included
  - €10/user overage
  - €0.75/order overage

Professional: €149/month
  - 15 users included
  - 500 orders/month included
  - €8/user overage
  - €0.50/order overage
```

---

## 🔒 Security Considerations

### Critical for Medical Data:
1. **Data Isolation**: Database per tenant (Option 1)
2. **Encryption**: At-rest and in-transit
3. **Access Logging**: Comprehensive audit trails
4. **GDPR Compliance**: Data portability, right to be forgotten
5. **EU MDR Compliance**: 10-year retention per tenant
6. **Backup Strategy**: Per-tenant backups
7. **Data Export**: Allow tenants to export all their data

---

## 📊 Infrastructure Requirements

### Current (Single Tenant):
- 1 PostgreSQL database
- 1 Next.js application server
- Simple deployment

### Multi-Tenant (Option 1 - Database Per Tenant):
```
1. Central Management Database
   - Tenant metadata
   - User management
   - Billing data

2. Tenant Databases (auto-provisioned)
   - PostgreSQL instance per tenant
   - Or separate databases on shared instance

3. Application Layer
   - Dynamic database connections
   - Tenant resolution middleware
   - Request context management

4. Infrastructure
   - Load balancer (handles subdomains)
   - CDN (static assets)
   - File storage (S3-compatible for documents)
   - Background job queue (for provisioning)
```

**Hosting Costs Estimate**:
```
Current: $50-100/month (single tenant)

Multi-Tenant SaaS:
- Central services: $200/month
- Per-tenant database: $10-30/month/tenant
- Storage: $0.02/GB/month
- Bandwidth: Variable

10 tenants: ~$500/month
50 tenants: ~$1,500/month
100 tenants: ~$2,500/month
```

---

## ⏱️ Implementation Timeline

### Phase 1: Foundation (Week 1-2)
- [ ] Choose multi-tenancy approach
- [ ] Design database schema
- [ ] Set up central management database
- [ ] Implement tenant resolution
- [ ] Basic authentication updates

### Phase 2: Core Multi-Tenancy (Week 2-3)
- [ ] Database per tenant provisioning
- [ ] Tenant onboarding flow
- [ ] Update all API routes
- [ ] Implement database context
- [ ] Data isolation testing

### Phase 3: Billing & Subscriptions (Week 3-4)
- [ ] Stripe integration
- [ ] Plan management
- [ ] Usage tracking
- [ ] Invoice generation
- [ ] Payment processing

### Phase 4: Admin & Polish (Week 4-5)
- [ ] Super admin dashboard
- [ ] Tenant management UI
- [ ] Analytics dashboard
- [ ] Documentation
- [ ] Testing

### Phase 5: Migration & Launch (Week 5-6)
- [ ] Migrate existing data to multi-tenant structure
- [ ] Performance testing
- [ ] Security audit
- [ ] Load testing
- [ ] Production deployment

---

## 🎯 Effort Breakdown

| Task | Hours | Complexity |
|------|-------|------------|
| Database schema design | 16 | High |
| Tenant resolution & routing | 20 | Medium |
| Authentication updates | 24 | High |
| API route updates (all routes) | 40 | Medium |
| Database context implementation | 16 | High |
| Tenant onboarding flow | 24 | Medium |
| Billing integration (Stripe) | 32 | Medium |
| Super admin dashboard | 24 | Low |
| UI/UX updates | 16 | Low |
| Testing & QA | 24 | Medium |
| Documentation | 8 | Low |
| **Total** | **244 hours** | **~6 weeks** |

---

## 💡 Recommendations

### For Medical Compliance: **Use Option 1 (Database Per Tenant)**

**Reasons**:
1. Complete data isolation (no risk of data leakage)
2. Easier GDPR compliance (per-tenant data export/deletion)
3. Better EU MDR compliance (data sovereignty)
4. Per-tenant backups and disaster recovery
5. Performance isolation
6. Easier to handle tenant-specific regulations

**Trade-offs**:
- Higher infrastructure costs (~$10-30/tenant/month)
- More complex provisioning
- Requires robust database management

### ROI Analysis:

**Investment**:
- Development: 6 weeks @ €5,000/week = €30,000
- Infrastructure setup: €2,000
- **Total**: €32,000

**Revenue Potential**:
```
10 customers @ €149/month = €1,490/month = €17,880/year
50 customers @ €149/month = €7,450/month = €89,400/year
100 customers @ €149/month = €14,900/month = €178,800/year

Break-even: ~18 customers (1.8 years)
Profitable: 25+ customers
```

---

## 🚀 Quick Start vs Full SaaS

### Minimum Viable Multi-Tenant (2-3 weeks):
- Shared database with tenantId
- Simple subdomain routing
- Basic tenant signup
- Manual provisioning
- Basic authentication

### Full SaaS Platform (6 weeks):
- Database per tenant
- Automated provisioning
- Stripe billing
- Super admin dashboard
- Usage analytics
- Custom domains

---

## 📝 Next Steps

1. **Decision**: Choose Option 1 (Database Per Tenant) for medical compliance
2. **Budget**: Allocate €30-40K for development + infrastructure
3. **Timeline**: Plan for 6-8 week development cycle
4. **Team**: 1-2 developers full-time
5. **Launch Strategy**: Beta with 3-5 pilot tenants

---

**Questions to Consider**:
- What's your target market size? (dental labs in Slovenia/EU)
- What's acceptable monthly hosting cost per tenant?
- Do you need custom domains or subdomains only?
- What's your go-to-market timeline?
- Do you have capacity for ongoing support of multiple tenants?

