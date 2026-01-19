# SOP/QMS Module Implementation Plan
**Project**: Smilelab MDR - Quality Management System
**Approach**: Practical & Compliant (Option 2)
**Start Date**: 2026-01-08
**Estimated Time**: 5-6 hours

---

## Overview

Implementing a two-tier user system with SOP/QMS module for EU MDR Annex XIII compliance.

### Goals
✅ Individual accountability for SOP acknowledgments (MDR requirement)
✅ Simple, practical document management
✅ Training tracking without overhead
✅ Keep production workflows unchanged

---

## Architecture: Two-Tier User System

### Tier 1: Production Accounts (Existing)
**Roles**: ADMIN, TECHNICIAN, QC_INSPECTOR, INVOICING
**Access**: Full system (orders, worksheets, invoices, materials, etc.)
**Creation**: Admin creates manually
**Examples**: admin@smilelab.si, tech@smilelab.si, qc@smilelab.si

### Tier 2: Staff Accounts (NEW)
**Role**: STAFF (or LAB_STAFF)
**Access**: ONLY SOP Library + Training Dashboard
**Creation**: Self-registration (no approval needed)
**Examples**: janez.novak@gmail.com, maja.kovac@gmail.com

---

## Implementation Phases

### Phase 1: Database Schema (1 hour)

#### New Role
```typescript
enum UserRole {
  ADMIN
  TECHNICIAN
  QC_INSPECTOR
  INVOICING
  STAFF        // NEW - for compliance-only users
}
```

#### SOP Tables
```typescript
model SOP {
  id              String    @id @default(uuid())
  code            String    @unique  // "SOP-001", "SOP-002"
  title           String
  category        SOPCategory

  // Content stored as HTML/Markdown
  content         String    @db.Text

  // Optional PDF for printing
  pdfPath         String?

  // Version tracking
  versionNumber   String    // "1.0", "1.1", "2.0"
  previousVersionId String? // Link to previous version

  // Status
  status          SOPStatus // DRAFT, APPROVED, ARCHIVED

  // Metadata
  createdBy       User      @relation("SOPCreator", fields: [createdById], references: [id])
  createdById     String
  approvedBy      User?     @relation("SOPApprover", fields: [approvedById], references: [id])
  approvedById    String?
  approvedAt      DateTime?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // MDR compliance (10-year retention)
  retentionUntil  DateTime?

  // Relations
  acknowledgments SOPAcknowledgment[]

  @@index([category])
  @@index([status])
}

model SOPAcknowledgment {
  id              String    @id @default(uuid())

  sopId           String
  sop             SOP       @relation(fields: [sopId], references: [id], onDelete: Cascade)

  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  acknowledgedAt  DateTime  @default(now())
  ipAddress       String?   // Audit trail

  @@unique([sopId, userId])
  @@index([userId])
}

enum SOPCategory {
  PRODUCTION          // Manufacturing procedures
  EQUIPMENT           // Machine operations
  MATERIAL            // Material handling
  QUALITY             // QC procedures
  DOCUMENTATION       // Record keeping
  PERSONNEL           // Training, HR
  RISK_MANAGEMENT     // Risk assessments
  OTHER
}

enum SOPStatus {
  DRAFT               // Being created/edited
  APPROVED            // Active, in use
  ARCHIVED            // Old version
}
```

#### User Table Update
```typescript
model User {
  // ... existing fields ...

  // New relations
  sopsCreated       SOP[]               @relation("SOPCreator")
  sopsApproved      SOP[]               @relation("SOPApprover")
  sopAcknowledgments SOPAcknowledgment[]
}
```

**Tasks:**
- [ ] Create migration for SOP tables
- [ ] Add STAFF role to UserRole enum
- [ ] Run migration on local database
- [ ] Test migration

---

### Phase 2: Authentication Enhancements (1.5 hours)

#### 2.1 Self-Registration Page
**Route**: `/register`
**Public**: Yes (no authentication required)

**Features:**
- Email, password, full name
- Automatically assigns STAFF role
- Email validation (check if already exists)
- Password strength requirements
- Optional: Email verification (skip for now, can add later)

**Flow:**
```
User → /register → Fill form → Submit
→ Creates User with role=STAFF
→ Redirects to /staff/dashboard
```

**Files:**
- `app/[locale]/(auth)/register/page.tsx`
- `app/api/auth/register/route.ts`

#### 2.2 Forgot Password
**Route**: `/forgot-password`
**Public**: Yes

**Features:**
- Enter email → Send password reset link
- Generate secure token (JWT or UUID)
- Email with reset link
- `/reset-password/[token]` page to set new password
- Token expires after 1 hour

**Flow:**
```
User → /forgot-password → Enter email → Submit
→ Generates reset token
→ Sends email with link: /reset-password/abc123
→ User clicks link → Sets new password
```

**Files:**
- `app/[locale]/(auth)/forgot-password/page.tsx`
- `app/[locale]/(auth)/reset-password/[token]/page.tsx`
- `app/api/auth/forgot-password/route.ts`
- `app/api/auth/reset-password/route.ts`

**Database:**
```typescript
model PasswordReset {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  used      Boolean  @default(false)
}
```

**Tasks:**
- [ ] Create PasswordReset table migration
- [ ] Build /register page UI
- [ ] Build /register API endpoint
- [ ] Build /forgot-password page UI
- [ ] Build /forgot-password API endpoint
- [ ] Build /reset-password/[token] page UI
- [ ] Build /reset-password API endpoint
- [ ] Create password reset email template (Slovenian)
- [ ] Test full registration flow
- [ ] Test password reset flow

---

### Phase 3: STAFF Dashboard & Authorization (0.5 hours)

#### Role-Based Dashboard Routing
When user logs in, redirect based on role:
```typescript
// middleware.ts or after login
if (user.role === 'STAFF') {
  redirect('/staff/dashboard')
} else {
  redirect('/dashboard')
}
```

#### STAFF Layout
**Route**: `/staff/*`
**Access**: STAFF role only

**Layout:**
```
/staff
├── dashboard        # My Training overview
├── sops             # SOP Library (read-only)
├── sops/[id]        # View individual SOP
└── profile          # User profile settings
```

**No sidebar navigation** - Simple top nav:
```
[Logo] Smilelab MDR - Staff Portal
  SOPs | My Training | Profile | Logout
```

**Files:**
- `app/[locale]/(staff)/layout.tsx`
- `app/[locale]/(staff)/dashboard/page.tsx`
- `middleware.ts` (update to allow /staff routes for STAFF role)

**Tasks:**
- [ ] Create /staff layout with simple navigation
- [ ] Create /staff/dashboard page (placeholder)
- [ ] Update middleware to allow STAFF access to /staff routes
- [ ] Block STAFF from accessing /dashboard and other routes

---

### Phase 4: SOP Management - Admin Side (2 hours)

#### 4.1 SOP CRUD API
**Routes:**
- `GET /api/sops` - List all SOPs (filterable by category, status)
- `GET /api/sops/[id]` - Get single SOP
- `POST /api/sops` - Create new SOP (ADMIN only)
- `PUT /api/sops/[id]` - Update SOP (creates new version if approved)
- `DELETE /api/sops/[id]` - Delete SOP (ADMIN only)
- `POST /api/sops/[id]/approve` - Approve SOP (ADMIN/QC only)
- `POST /api/sops/[id]/generate-pdf` - Generate PDF from HTML content

**Versioning Logic:**
- If SOP status is DRAFT → Just update
- If SOP status is APPROVED → Create new SOP record, link to previous via `previousVersionId`
- Increment version number (1.0 → 1.1 or 2.0)
- Set old version status to ARCHIVED

**Files:**
- `app/api/sops/route.ts`
- `app/api/sops/[id]/route.ts`
- `app/api/sops/[id]/approve/route.ts`
- `app/api/sops/[id]/generate-pdf/route.ts`
- `lib/services/sop-service.ts`

#### 4.2 SOP Management UI (Admin)
**Route**: `/settings/sops` (add to settings navigation)

**Features:**
- List all SOPs in table
- Filter by category, status
- Search by title/code
- Create new SOP button
- Edit SOP (opens modal or separate page)
- Delete SOP (with confirmation)
- View version history
- Approve/Archive actions

**Create/Edit SOP Form:**
- Code (auto-generated: SOP-001, SOP-002)
- Title
- Category (dropdown)
- Content (Rich text editor - TipTap or React-Quill)
- Status (DRAFT/APPROVED)
- Option to upload existing PDF (instead of creating content)

**Files:**
- `app/[locale]/(dashboard)/settings/sops/page.tsx`
- `app/[locale]/(dashboard)/settings/sops/new/page.tsx`
- `app/[locale]/(dashboard)/settings/sops/[id]/edit/page.tsx`
- `components/sops/SOPList.tsx`
- `components/sops/SOPForm.tsx`
- `components/sops/RichTextEditor.tsx`

**Tasks:**
- [ ] Create SOP service layer
- [ ] Build SOP API endpoints
- [ ] Install rich text editor (TipTap recommended)
- [ ] Build SOP list page
- [ ] Build SOP create form
- [ ] Build SOP edit form
- [ ] Implement versioning logic
- [ ] Add PDF generation (use existing PDF service)
- [ ] Add file upload for existing PDFs
- [ ] Test CRUD operations

---

### Phase 5: SOP Library - Staff Side (1 hour)

#### 5.1 SOP Viewing API
**Routes:**
- `GET /api/staff/sops` - List approved SOPs only
- `GET /api/staff/sops/[id]` - View SOP content
- `POST /api/staff/sops/[id]/acknowledge` - Acknowledge SOP

**Files:**
- `app/api/staff/sops/route.ts`
- `app/api/staff/sops/[id]/route.ts`
- `app/api/staff/sops/[id]/acknowledge/route.ts`

#### 5.2 Staff Dashboard
**Route**: `/staff/dashboard`

**Widgets:**
- **Pending Acknowledgments**: SOPs assigned but not yet acknowledged
- **Completed Training**: SOPs already acknowledged with dates
- **SOP Categories**: Quick access to SOP library by category

**Files:**
- `app/[locale]/(staff)/dashboard/page.tsx`
- `components/staff/PendingAcknowledgments.tsx`
- `components/staff/CompletedTraining.tsx`

#### 5.3 SOP Library (Staff View)
**Route**: `/staff/sops`

**Features:**
- Browse SOPs by category
- Search SOPs
- Click to view SOP content
- See if already acknowledged (checkmark)

**Files:**
- `app/[locale]/(staff)/sops/page.tsx`
- `components/staff/SOPLibrary.tsx`

#### 5.4 SOP Detail Page (Staff View)
**Route**: `/staff/sops/[id]`

**Features:**
- Display SOP title, category, version
- Render HTML content (or show PDF)
- "I Acknowledge" button (if not yet acknowledged)
- Download PDF button
- Acknowledgment confirmation modal

**Flow:**
```
Staff → View SOP → Read content → Click "I Acknowledge"
→ Confirmation: "I confirm I have read and understood this SOP"
→ Submit → Logged with timestamp and IP
→ Shows "Acknowledged on [date]"
```

**Files:**
- `app/[locale]/(staff)/sops/[id]/page.tsx`
- `components/staff/SOPDetail.tsx`
- `components/staff/AcknowledgeButton.tsx`

**Tasks:**
- [ ] Build staff API endpoints
- [ ] Create staff dashboard
- [ ] Build SOP library view
- [ ] Build SOP detail page
- [ ] Implement acknowledgment flow
- [ ] Add confirmation modal
- [ ] Test acknowledgment logging

---

### Phase 6: Admin Training Overview (0.5 hours)

#### Training Dashboard (Admin)
**Route**: `/settings/training`

**Features:**
- See all staff members
- See which SOPs each staff has acknowledged
- Filter by staff member or SOP
- Export training records to CSV/PDF

**View:**
```
Training Matrix

Staff Member    | SOP-001 | SOP-002 | SOP-003 | Total
----------------|---------|---------|---------|-------
Janez Novak     | ✓ 1/5   | ✗       | ✓ 1/2   | 2/3
Maja Kovač      | ✓ 1/8   | ✓ 1/3   | ✗       | 2/3
```

**Files:**
- `app/[locale]/(dashboard)/settings/training/page.tsx`
- `app/api/admin/training/route.ts`
- `components/admin/TrainingMatrix.tsx`

**Tasks:**
- [ ] Build training overview API
- [ ] Create training matrix UI
- [ ] Add filtering and search
- [ ] Add CSV export

---

## File Storage Structure

```
public/uploads/sops/
├── SOP-001-v1.0.pdf
├── SOP-001-v2.0.pdf
├── SOP-002-v1.0.pdf
├── SOP-003-v1.0.pdf
└── ...
```

**Naming Convention**: `{code}-v{version}.pdf`

---

## Translations (Slovenian)

Add to `messages/sl.json`:

```json
{
  "sops": {
    "title": "Standardi in Postopki",
    "library": "Knjižnica SOPov",
    "myTraining": "Moje Usposabljanje",
    "acknowledge": "Potrdi Prebrano",
    "acknowledged": "Potrjeno",
    "acknowledgedOn": "Potrjeno dne",
    "confirmAcknowledgment": "Potrjujem, da sem prebral in razumel ta SOP",
    "pendingAcknowledgments": "Nerešeni SOPi",
    "completedTraining": "Zaključeno Usposabljanje"
  },
  "auth": {
    "register": "Registracija",
    "forgotPassword": "Pozabljeno Geslo",
    "resetPassword": "Ponastavi Geslo",
    "sendResetLink": "Pošlji Povezavo"
  }
}
```

---

## Testing Checklist

### Registration & Authentication
- [ ] Register new staff account
- [ ] Login with staff account → redirects to /staff/dashboard
- [ ] Login with admin account → redirects to /dashboard
- [ ] Forgot password flow works
- [ ] Reset password with valid token
- [ ] Reset password with expired token (should fail)

### SOP Management (Admin)
- [ ] Create new SOP with HTML content
- [ ] Create new SOP by uploading PDF
- [ ] Edit DRAFT SOP (should update in place)
- [ ] Edit APPROVED SOP (should create new version)
- [ ] Approve SOP
- [ ] Generate PDF from HTML content
- [ ] Delete SOP
- [ ] View version history

### SOP Library (Staff)
- [ ] Browse SOPs by category
- [ ] Search SOPs
- [ ] View SOP content (HTML rendering)
- [ ] Download PDF
- [ ] Acknowledge SOP
- [ ] See acknowledged status on list
- [ ] Can't acknowledge twice

### Training Overview (Admin)
- [ ] View training matrix
- [ ] Filter by staff member
- [ ] Filter by SOP
- [ ] Export to CSV

### Authorization
- [ ] STAFF can't access /dashboard
- [ ] STAFF can't access /orders, /worksheets, etc.
- [ ] STAFF can only access /staff routes
- [ ] ADMIN can access everything

---

## Deployment Plan

### Local Development
1. Create migrations
2. Run migrations: `npx prisma migrate dev`
3. Build and test locally: `npm run dev`
4. Test all workflows

### Production Deployment
1. Commit all changes
2. Push to GitHub
3. SSH to server
4. Pull changes: `git pull origin main`
5. Run migrations: `npx prisma migrate deploy`
6. Build: `npm run build`
7. Restart: `pm2 restart smilelab-mdr`
8. Test on production

---

## Future Enhancements (Not in Scope)

- Email notifications when new SOPs assigned
- SOP quiz/comprehension tests
- Automatic SOP review reminders (annual review)
- Mobile app for SOP viewing
- Barcode/QR codes on equipment linking to SOPs
- Integration with worksheet workflow (enforce SOP acknowledgment before production)

---

## Estimated Time Breakdown

| Phase | Task | Time |
|-------|------|------|
| 1 | Database schema & migrations | 1h |
| 2 | Registration & forgot password | 1.5h |
| 3 | Staff dashboard & authorization | 0.5h |
| 4 | SOP management (admin) | 2h |
| 5 | SOP library (staff) | 1h |
| 6 | Training overview (admin) | 0.5h |
| **Total** | | **6.5 hours** |

**Realistic estimate with testing**: **7-8 hours**

---

## Success Criteria

✅ Staff can self-register and access SOP library only
✅ Admins can create/edit/approve SOPs with version control
✅ SOPs stored as HTML + optional PDF
✅ Staff can acknowledge SOPs (logged with timestamp)
✅ Admins can see training matrix
✅ Password reset works via email
✅ 10-year retention compliance (retentionUntil field)
✅ Audit trail for all acknowledgments

---

**Created**: 2026-01-08
**Last Updated**: 2026-01-08
**Status**: Ready to implement
