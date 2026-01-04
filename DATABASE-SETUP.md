# Database Setup Complete ✅

## What We Created

### 1. Prisma Schema (810 lines)
**File**: `prisma/schema.prisma`

**18 Models Created**:
- ✅ User (authentication, RBAC with 4 roles)
- ✅ Dentist (clinics and prescribers)
- ✅ Patient (GDPR-compliant with anonymization support)
- ✅ Order (sequential numbering: 001, 002, 003...)
- ✅ WorkSheet (DN-prefix: DN-001, DN-002..., 1:1 with Order)
- ✅ WorksheetTooth (FDI notation: 11-48, 51-85)
- ✅ WorksheetProduct (products per worksheet with price snapshot)
- ✅ WorksheetMaterial (material usage with LOT traceability)
- ✅ Product (product catalog with categories)
- ✅ ProductPriceHistory (price versioning over time)
- ✅ Material (material types with biocompatibility data)
- ✅ MaterialLot (LOT tracking, FIFO, expiry dates)
- ✅ QualityControl (QC approval/rejection workflow)
- ✅ Invoice (invoicing with payment tracking)
- ✅ EmailLog (email delivery tracking)
- ✅ Document (Annex XIII + invoices, 10-year retention)
- ✅ AuditLog (immutable activity logs)
- ✅ SystemConfig (system-wide settings)

**Key Design Features**:
- 🔗 **Material Traceability**: Material → MaterialLot → WorksheetMaterial → WorkSheet
- 📊 **FIFO Algorithm**: MaterialLot ordered by arrivalDate for oldest-first consumption
- 🦷 **FDI Teeth Notation**: Separate WorksheetTooth table with toothNumber validation
- 💰 **Price Versioning**: ProductPriceHistory tracks changes, WorksheetProduct snapshots price
- 🔒 **Immutable Audits**: AuditLog with onDelete: Restrict
- 📅 **10-Year Retention**: Document.retentionUntil calculated automatically
- 🔐 **Data Integrity**: Proper cascade rules (Restrict, Cascade, SetNull)
- ⚡ **Performance**: Indexes on all frequently queried fields

### 2. Prisma Client Singleton
**File**: `lib/prisma.ts`

Prevents connection pool exhaustion in development with hot-reloading.

### 3. Comprehensive Seed File (260 lines)
**File**: `prisma/seed.ts`

**Sample Data Included**:
- 4 users (ADMIN, TECHNICIAN, QC_INSPECTOR, INVOICING)
- 3 dentists (Ljubljana, Maribor, Koper)
- 3 patients (with GDPR-compliant data)
- 10 products (crowns, bridges, veneers, implants, dentures, inlays, onlays)
- 8 materials (ceramic, zirconia, metal alloys, titanium, composites, porcelain, acrylic)
- 20+ material lots (2-3 per material for FIFO testing)
- 8 system configuration settings

**Login Credentials**:
```
Admin:        admin@smilelab.si / admin123
Technician:   tech@smilelab.si / user123
QC Inspector: qc@smilelab.si / user123
Invoicing:    invoice@smilelab.si / user123
```

### 4. Environment Configuration
**File**: `.env.example`

Template for required environment variables (database, auth, email, PDF generation).

### 5. Package Updates
**File**: `package.json`

- Added `bcryptjs` for password hashing
- Added `ts-node` for running seed script
- Added `@types/bcryptjs` for TypeScript support
- Configured Prisma seed command

---

## Next Steps

### Step 1: Install Dependencies
```bash
npm install
```

This will install the new dependencies:
- `bcryptjs` (password hashing)
- `ts-node` (run TypeScript seed file)
- `@types/bcryptjs` (TypeScript types)

### Step 2: Set Up Environment Variables
```bash
cp .env.example .env.local
```

Edit `.env.local` and configure:

**Minimum Required**:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/smilelab_mdr"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://localhost:3000"
```

**Optional (for later)**:
- SMTP settings (email functionality)
- Puppeteer path (PDF generation)

### Step 3: Set Up PostgreSQL Database

**Option A: Using Docker (Recommended)**
```bash
# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: smilelab-postgres
    restart: always
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: smilelab_mdr
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
EOF

# Start PostgreSQL
docker-compose up -d

# Verify it's running
docker ps
```

**Option B: Using Local PostgreSQL**
```bash
# Install PostgreSQL (macOS)
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb smilelab_mdr

# Update DATABASE_URL in .env.local
DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/smilelab_mdr"
```

### Step 4: Generate Prisma Client
```bash
npx prisma generate
```

This creates the TypeScript types and Prisma Client based on your schema.

### Step 5: Run Initial Migration
```bash
npx prisma migrate dev --name init
```

This will:
1. Create the `prisma/migrations/` directory
2. Generate SQL for all 18 tables
3. Apply the migration to your database
4. Automatically run the seed script

**Expected Output**:
```
✔ Generated Prisma Client
✔ Applied migration: 20251226_init
✔ Running seed command...

🌱 Starting database seed...

👥 Creating users...
✅ Created 4 users

🦷 Creating dentists...
✅ Created 3 dentists

👤 Creating patients...
✅ Created 3 patients

📦 Creating products...
✅ Created 10 products

🧪 Creating materials...
✅ Created 8 materials

📦 Creating material lots...
✅ Created 20+ material lots

⚙️  Creating system configuration...
✅ Created system configuration

✅ Database seed completed successfully!
```

### Step 6: Verify Database
```bash
# Open Prisma Studio (database GUI)
npx prisma studio
```

Opens at `http://localhost:5555`

You can now browse all tables and verify the seeded data.

### Step 7: Test Development Server
```bash
npm run dev
```

Opens at `http://localhost:3000`

---

## Database Architecture Highlights

### Material Traceability (EU MDR Compliance)

**Forward Traceability** (Given LOT → Find all devices):
```sql
-- Find all worksheets using a specific LOT
SELECT w.worksheetNumber, w.deviceDescription
FROM WorkSheet w
JOIN WorksheetMaterial wm ON wm.worksheetId = w.id
JOIN MaterialLot ml ON ml.id = wm.materialLotId
WHERE ml.lotNumber = 'LOT-CER-001-2024-001';
```

**Reverse Traceability** (Given device → Find all LOTs):
```sql
-- Find all materials/LOTs used in a specific worksheet
SELECT m.name, ml.lotNumber, wm.quantityUsed
FROM Material m
JOIN MaterialLot ml ON ml.materialId = m.id
JOIN WorksheetMaterial wm ON wm.materialLotId = ml.id
WHERE wm.worksheetId = 'worksheet-id-here';
```

### FIFO Material Consumption

**Query Pattern** (in service layer):
```typescript
// Get oldest available LOT for a material
const oldestLot = await prisma.materialLot.findFirst({
  where: {
    materialId: materialId,
    status: 'AVAILABLE',
    quantityAvailable: { gt: 0 },
    expiryDate: { gt: new Date() }, // Not expired
  },
  orderBy: {
    arrivalDate: 'asc', // FIFO: oldest first
  },
});
```

### State Machine Workflow

**WorkSheet Status Flow**:
```
DRAFT
  ↓ (technician creates worksheet)
IN_PRODUCTION
  ↓ (work completed, submitted for QC)
QC_PENDING
  ↓ (QC inspector reviews)
  ├─ QC_APPROVED → INVOICED → DELIVERED
  └─ QC_REJECTED → IN_PRODUCTION (rework)
```

### Price Versioning

**Price History Tracking**:
- ProductPriceHistory: All price changes with effective dates
- WorksheetProduct.priceAtSelection: Immutable snapshot when product added to worksheet
- Prevents retroactive price changes affecting historical worksheets

---

## Schema Optimization Features

### Indexes (Performance)
- ✅ Unique indexes: orderNumber, worksheetNumber, email, patientCode
- ✅ Composite unique: (materialId, lotNumber)
- ✅ Foreign key indexes: All relation fields
- ✅ Status indexes: All enum status fields
- ✅ Date indexes: orderDate, manufactureDate, arrivalDate, expiryDate

### Data Integrity
- ✅ Cascade deletes: Dependent data (WorksheetTooth, WorksheetProduct, etc.)
- ✅ Restrict deletes: Critical relations (User, Material, MaterialLot, AuditLog)
- ✅ SetNull deletes: Optional relations (Patient)

### GDPR Compliance
- ✅ Soft delete support: `deletedAt` field on User, Dentist, Patient
- ✅ Anonymization flag: Patient.anonymized
- ✅ Consent tracking: Patient.consentGiven
- ✅ Right to be forgotten: Soft delete + anonymization

### EU MDR Compliance
- ✅ Material traceability: Complete forward/reverse path
- ✅ 10-year retention: Document.retentionUntil
- ✅ Immutable audits: AuditLog with onDelete: Restrict
- ✅ CE marking: Material.ceMarked, Material.ceNumber
- ✅ Biocompatibility: Material.biocompatible, Material.iso10993Cert
- ✅ Manufacturer data: Material.manufacturer, MaterialLot.supplierName

---

## Common Queries (Examples)

### Get orders with worksheets and QC status
```typescript
const orders = await prisma.order.findMany({
  include: {
    dentist: true,
    worksheet: {
      include: {
        qualityControls: true,
      },
    },
  },
});
```

### Get materials expiring soon (30 days)
```typescript
const expiringMaterials = await prisma.materialLot.findMany({
  where: {
    status: 'AVAILABLE',
    expiryDate: {
      lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  },
  include: {
    material: true,
  },
  orderBy: {
    expiryDate: 'asc',
  },
});
```

### Get low stock materials
```typescript
const lowStock = await prisma.materialLot.findMany({
  where: {
    status: 'AVAILABLE',
    quantityAvailable: { lt: 20 },
  },
  include: {
    material: true,
  },
});
```

---

## Files Created Summary

```
prisma/
├── schema.prisma        (810 lines) ✅
└── seed.ts             (260 lines) ✅

lib/
└── prisma.ts           (20 lines) ✅

.env.example            ✅
package.json            (updated) ✅
```

**Total Lines of Code**: ~1,090 lines

---

## Troubleshooting

### Migration fails
```bash
# Reset database and try again
npx prisma migrate reset
```

### Seed fails
```bash
# Run seed manually
npx prisma db seed
```

### Connection errors
```bash
# Check PostgreSQL is running
docker ps
# OR
brew services list

# Test connection
psql postgresql://postgres:password@localhost:5432/smilelab_mdr
```

### Type errors
```bash
# Regenerate Prisma Client
npx prisma generate
```

---

## Next Development Tasks

After database setup is complete, the next critical tasks are:

1. **Authentication System** (AUTH-001 to AUTH-010)
   - NextAuth.js configuration
   - Login/register pages
   - Route protection middleware
   - RBAC implementation

2. **Order Management** (ORDER-001 to ORDER-012)
   - Order service layer
   - API routes (CRUD)
   - Order pages (list, new, detail)
   - Order components (table, form)

3. **Worksheet Management** (WS-001 to WS-018)
   - **FDI Teeth Selector** (most complex component) ⚠️
   - Worksheet service with state machine
   - Material LOT assignment (FIFO)
   - Worksheet pages and forms

Refer to `progress-tracker-initial.json` for complete task list and dependencies.

---

**Status**: Database Foundation Complete ✅
**Next Session**: Authentication System Implementation
