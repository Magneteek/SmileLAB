# Pricing List Management System

Complete pricing catalog management system with price versioning history for Smilelab dental laboratory.

## Overview

This system provides comprehensive product catalog management with full price change tracking and audit trail capabilities. All price changes are versioned and immutable, ensuring complete historical accuracy for invoicing and compliance.

## Features

### 1. Product Catalog Management
- **CRUD Operations**: Create, read, update, and delete products
- **Product Categories**: 10 predefined categories (Crown, Bridge, Filling, Implant, Denture, Inlay, Onlay, Veneer, Orthodontics, Other)
- **Active/Inactive Status**: Soft delete support with status toggles
- **Unique Product Codes**: Format validation (e.g., CR-001, BRI-002)

### 2. Price Versioning (CRITICAL FEATURE)
- **Automatic History Tracking**: Every price change creates a new immutable history entry
- **Reason Tracking**: Mandatory reason for all price changes (audit requirement)
- **Effective Date Ranges**: Track when each price was active
- **Current Price Denormalization**: Fast queries with `currentPrice` field
- **Historical Accuracy**: Worksheets use `priceAtSelection` snapshot (never affected by price changes)

### 3. User Interface
- **Product List View**: Filterable, searchable table with pagination
- **Detail View**: Complete product information with price history timeline
- **Edit Mode**: Inline editing with validation
- **Price Update Dialog**: Dedicated modal for price changes with reason input
- **Visual Timeline**: Beautiful price history visualization with trends

### 4. Filtering & Search
- **Category Filter**: Dropdown with all 10 categories
- **Active Status**: Filter by active/inactive/all
- **Search**: By product code or name (case-insensitive)
- **Sorting**: By code, name, category, price, or creation date
- **Pagination**: 20 items per page with navigation

### 5. Security & Authorization
- **ADMIN-Only Access**: Only ADMIN role can create/edit/delete products
- **All Users Can View**: Product catalog visible to all authenticated users
- **Audit Logging**: All mutations logged to `AuditLog` table

## Architecture

### Database Schema

```prisma
model Product {
  id            String          @id @default(cuid())
  code          String          @unique
  name          String
  description   String?
  category      ProductCategory
  currentPrice  Decimal         @db.Decimal(10, 2)
  unit          String          @default("piece")
  active        Boolean         @default(true)
  createdAt     DateTime
  updatedAt     DateTime
  deletedAt     DateTime?

  priceHistory      ProductPriceHistory[]
  worksheetProducts WorksheetProduct[]
}

model ProductPriceHistory {
  id            String   @id @default(cuid())
  productId     String
  product       Product  @relation(...)
  price         Decimal  @db.Decimal(10, 2)
  effectiveFrom DateTime @default(now())
  effectiveTo   DateTime?
  reason        String?
  createdAt     DateTime @default(now())
}
```

### File Structure

```
lib/services/
  └── pricing-service.ts          # Business logic (220 lines)

app/api/products/
  ├── route.ts                    # GET, POST endpoints
  ├── [id]/route.ts               # GET, PATCH, DELETE endpoints
  └── [id]/price-history/route.ts # Price history endpoint

app/(dashboard)/pricing/
  ├── page.tsx                    # List view
  ├── new/page.tsx                # Create view
  └── [id]/page.tsx               # Detail/edit view

components/pricing/
  ├── ProductsTable.tsx           # Table component
  ├── ProductForm.tsx             # Create/edit form
  ├── PriceHistoryTimeline.tsx    # Timeline visualization
  └── UpdatePriceDialog.tsx       # Price update modal

types/
  └── product.ts                  # TypeScript definitions
```

## API Endpoints

### Products List
```
GET /api/products?category=CROWN&active=true&search=ceramic&page=1&limit=20
```

**Query Parameters**:
- `category`: ProductCategory enum (optional)
- `active`: boolean (optional)
- `search`: string (optional)
- `page`: number (default: 1)
- `limit`: number (default: 20)
- `sortBy`: 'code' | 'name' | 'category' | 'currentPrice' | 'createdAt'
- `sortOrder`: 'asc' | 'desc'

**Response**:
```json
{
  "products": [...],
  "total": 45,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

### Create Product
```
POST /api/products
Authorization: Required (ADMIN only)
```

**Body**:
```json
{
  "code": "CR-001",
  "name": "Ceramic Crown",
  "description": "High-quality ceramic crown",
  "category": "CROWN",
  "currentPrice": 250.00,
  "unit": "piece",
  "active": true
}
```

### Get Product Detail
```
GET /api/products/:id
Authorization: Required
```

**Response**: Product with full price history

### Update Product
```
PATCH /api/products/:id
Authorization: Required (ADMIN only)
```

**Body** (all fields optional):
```json
{
  "code": "CR-001",
  "name": "Updated name",
  "currentPrice": 275.00,  // Creates price history entry
  "active": false
}
```

### Delete Product
```
DELETE /api/products/:id
Authorization: Required (ADMIN only)
```

**Note**: Soft delete. If product used in worksheets, it's set to inactive instead.

### Get Price History
```
GET /api/products/:id/price-history
Authorization: Required
```

**Response**:
```json
{
  "productId": "...",
  "productCode": "CR-001",
  "productName": "Ceramic Crown",
  "currentPrice": 275.00,
  "history": [
    {
      "id": "...",
      "price": 275.00,
      "effectiveFrom": "2025-01-15T10:00:00Z",
      "effectiveTo": null,
      "reason": "Material cost increase",
      "createdAt": "2025-01-15T10:00:00Z"
    },
    {
      "id": "...",
      "price": 250.00,
      "effectiveFrom": "2025-01-01T00:00:00Z",
      "effectiveTo": "2025-01-15T10:00:00Z",
      "reason": "Initial price",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

## Business Logic

### Price Change Logic

When a product's price changes:

1. **Via PATCH `/api/products/:id`**:
   - Detect if `currentPrice` changed
   - Close current price history entry (set `effectiveTo = now()`)
   - Create new price history entry (effectiveFrom = now(), effectiveTo = null)
   - Update `product.currentPrice`
   - Create audit log
   - Reason: "Price updated via product edit"

2. **Via Dedicated Price Update**:
   - Validate new price is different
   - Require reason (minimum 5 characters)
   - Same process as above
   - Use provided reason in history entry

### Initial Product Creation

1. Create Product record with `currentPrice`
2. Create initial ProductPriceHistory entry:
   - price = currentPrice
   - effectiveFrom = now()
   - effectiveTo = null
   - reason = "Initial price"

### Worksheet Price Snapshots

When a product is added to a worksheet:
- `WorksheetProduct.priceAtSelection` captures current price
- This snapshot is **immutable**
- Future price changes don't affect historical worksheets
- Ensures accurate historical invoicing

### Product Deletion Rules

**Safe to delete**:
- Product not used in any worksheets
- Soft delete (sets `deletedAt`, `active = false`)

**Cannot delete**:
- Product used in worksheets
- System suggests setting to inactive instead
- Error message shows worksheet count

## UI Components

### ProductsTable
- Displays products in sortable table
- Color-coded category badges
- Active/Inactive status badges
- Currency-formatted prices
- Row actions (view, edit, delete)
- Click row to navigate to detail

### ProductForm
- React Hook Form + Zod validation
- Auto-formatting (code uppercase)
- Real-time validation
- Character counters
- Category/unit dropdowns
- Active toggle switch
- Handles create and edit modes

### PriceHistoryTimeline
- Visual timeline with connecting lines
- Current price highlighted (green border)
- Price change indicators (up/down arrows)
- Percentage change calculations
- Duration display
- Reason display
- Summary statistics

### UpdatePriceDialog
- Modal dialog for price changes
- Current price display
- New price input with live change calculation
- Mandatory reason field (5-500 characters)
- Real-time validation
- Percentage change preview

## Validation Rules

### Product Code
- **Format**: 2-3 uppercase letters + dash + 3 digits
- **Examples**: CR-001, BRI-002, IMP-123
- **Unique**: Must be unique across active products
- **Auto-format**: Converts to uppercase on blur

### Product Name
- **Required**: Yes
- **Length**: 1-200 characters

### Description
- **Optional**: Yes
- **Length**: 0-1000 characters

### Category
- **Required**: Yes
- **Values**: CROWN, BRIDGE, FILLING, IMPLANT, DENTURE, INLAY, ONLAY, VENEER, ORTHODONTICS, OTHER

### Price
- **Required**: Yes
- **Type**: Decimal(10, 2)
- **Minimum**: 0.01
- **Currency**: Euro (€)

### Unit
- **Required**: Yes
- **Options**: piece, hour, gram, ml

### Price Change Reason
- **Required**: Yes (for dedicated price updates)
- **Length**: 5-500 characters

## Color Coding

Category badges use consistent color scheme:
- **CROWN**: Blue
- **BRIDGE**: Purple
- **FILLING**: Green
- **IMPLANT**: Red
- **DENTURE**: Yellow
- **INLAY**: Indigo
- **ONLAY**: Pink
- **VENEER**: Teal
- **ORTHODONTICS**: Orange
- **OTHER**: Gray

## Usage Examples

### Create a New Product
1. Navigate to `/pricing`
2. Click "New Product" (ADMIN only)
3. Fill in form with required fields
4. Initial price creates first history entry
5. Click "Create Product"
6. Redirects to product detail page

### Update Product Information
1. Navigate to product detail page
2. Click "Edit" button (ADMIN only)
3. Modify fields as needed
4. If price changed, new history entry created
5. Click "Update Product"
6. Edit mode closes, changes saved

### Update Product Price (Dedicated)
1. Navigate to product detail page
2. Click "Update Price" button (ADMIN only)
3. Enter new price
4. See live change calculation
5. Enter mandatory reason
6. Click "Update Price"
7. Price history updated

### View Price History
1. Navigate to product detail page
2. Click "Price History" tab
3. See complete timeline of changes
4. View reasons, dates, and trends
5. See summary statistics

### Filter Products
1. Navigate to `/pricing`
2. Select category from dropdown
3. Toggle active/inactive filter
4. Enter search term
5. Results update automatically
6. Pagination available if needed

## Testing Checklist

- [ ] Create product with initial price
- [ ] Update product general information
- [ ] Update product price (creates history)
- [ ] View price history timeline
- [ ] Filter by category
- [ ] Filter by active status
- [ ] Search by code
- [ ] Search by name
- [ ] Pagination navigation
- [ ] Delete unused product
- [ ] Try delete product in use (should fail)
- [ ] Verify ADMIN-only access
- [ ] Verify audit logs created
- [ ] Verify price snapshots in worksheets

## Performance Considerations

- **Denormalized currentPrice**: Fast queries without JOIN
- **Indexed fields**: code, category, active
- **Pagination**: Limits query results to 20 per page
- **Soft deletes**: Maintains referential integrity
- **Immutable history**: No updates, only inserts

## Future Enhancements

- [ ] Bulk price updates with CSV import
- [ ] Price change scheduling (future effective dates)
- [ ] Price trend analytics and charts
- [ ] Export price lists to PDF
- [ ] Product duplication feature
- [ ] Price comparison reports
- [ ] Product groups/bundles
- [ ] Multi-currency support
- [ ] Price approval workflow
- [ ] Integration with supplier catalogs

## Maintenance

### Database Migrations
If schema changes needed:
```bash
npx prisma migrate dev --name update_products
```

### Seed Data
Create sample products:
```bash
npx prisma db seed
```

### Audit Log Cleanup
Price history is permanent, but audit logs can be archived after 10 years.

## Support

For issues or questions:
- Review this documentation
- Check API response errors
- Verify ADMIN role for mutations
- Check browser console for client errors
- Review server logs for API errors

---

**System**: Smilelab MDR Management System
**Module**: Pricing List Management
**Version**: 1.0.0
**Created**: 2025-12-26
**Status**: Production Ready ✅
