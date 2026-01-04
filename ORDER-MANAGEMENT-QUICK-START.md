# Order Management System - Quick Start Guide

## Prerequisites

1. **Database Running**: PostgreSQL with Prisma schema migrated
2. **Initial Data**: At least one dentist and one user in the database
3. **Environment**: `.env.local` configured with `DATABASE_URL` and `NEXTAUTH_SECRET`

## Setup Steps

### 1. Initialize Sequential Numbering

Create the initial SystemConfig entry for order numbering:

**Option A: Using Prisma Studio**
```bash
npx prisma studio
```
1. Navigate to `SystemConfig` table
2. Click "Add record"
3. Set:
   - `key`: `next_order_number`
   - `value`: `1`
   - `description`: `Next sequential order number`
4. Save

**Option B: Using SQL**
```sql
INSERT INTO system_config (id, key, value, description, updated_at)
VALUES (
  gen_random_uuid(),
  'next_order_number',
  '1',
  'Next sequential order number',
  CURRENT_TIMESTAMP
);
```

**Option C: Using Prisma Client**
```typescript
// In a seed script or one-time setup
await prisma.systemConfig.create({
  data: {
    key: 'next_order_number',
    value: '1',
    description: 'Next sequential order number',
  },
});
```

### 2. Start Development Server

```bash
npm run dev
```

Navigate to: `http://localhost:3000`

### 3. Login

Use your existing admin or technician credentials.

## Using the Order Management System

### Create Your First Order

1. **Navigate to Orders**
   - Click "Orders" in the navigation menu
   - Or go to: `http://localhost:3000/orders`

2. **Click "New Order"**
   - Button in top-right corner
   - Or go to: `http://localhost:3000/orders/new`

3. **Fill Out Form**
   - **Dentist**: Select from dropdown (required)
   - **Due Date**: Optional date picker
   - **Priority**: Normal (default), High, or Urgent
   - **Notes**: Optional text area

4. **Submit**
   - Click "Create Order"
   - You'll be redirected to the order detail page
   - Order number "001" will be automatically assigned

### View Orders List

**URL**: `http://localhost:3000/orders`

**Features**:
- See all orders in a table
- Sort by clicking column headers
- Filter by status, dentist, priority
- Search by order number
- Pagination (20 per page)

### Filter Orders

**Status Filter**:
- All Statuses (default)
- Pending
- In Production
- QC Pending
- QC Approved
- Invoiced
- Delivered
- Cancelled

**Dentist Filter**:
- All Dentists (default)
- Select specific dentist from dropdown

**Priority Filter**:
- All Priorities (default)
- Normal (0)
- High (1)
- Urgent (2)

**Search**:
- Type order number (e.g., "001") in search box
- Results filter automatically

**Clear Filters**:
- Click "Clear Filters" button to reset all filters

### View Order Details

**Method 1**: Click on order number in the table
**Method 2**: Use actions dropdown → "View Details"
**Method 3**: Direct URL: `http://localhost:3000/orders/[id]`

**Order Detail Page Shows**:
- Order number and status
- Order date and due date
- Priority level
- Created by user
- Notes
- Full dentist information
- Worksheet relationship (if exists)
- Metadata (created/updated timestamps)

### Edit an Order

**From Order Detail Page**:
1. Click "Edit" button (top-right)
2. Form appears with current values
3. Make changes
4. Click "Update Order"
5. Page refreshes with updated data

**From Orders List**:
1. Click actions menu (⋮) on order row
2. Select "Edit Order"
3. Follow same steps as above

**Note**: Order number cannot be changed

### Delete an Order

**Permission Required**: ADMIN role only

**From Order Detail Page**:
1. Click "Delete" button (top-right, red)
2. Confirm in dialog
3. Order is soft deleted
4. Redirected to orders list

**From Orders List**:
1. Click actions menu (⋮) on order row
2. Select "Delete Order"
3. Confirm in dialog
4. Order is soft deleted and removed from view

**Important**: Cannot delete orders that have an associated worksheet

### Soft Delete Explained

- Orders are never permanently deleted
- `deletedAt` timestamp is set
- Orders are hidden from normal views
- Can be restored by setting `deletedAt` to `NULL` in database
- Audit log preserves deletion record

## API Testing with cURL

### List Orders
```bash
curl -X GET 'http://localhost:3000/api/orders' \
  -H 'Cookie: next-auth.session-token=YOUR_SESSION_TOKEN'
```

### Create Order
```bash
curl -X POST 'http://localhost:3000/api/orders' \
  -H 'Content-Type: application/json' \
  -H 'Cookie: next-auth.session-token=YOUR_SESSION_TOKEN' \
  -d '{
    "dentistId": "DENTIST_ID_HERE",
    "dueDate": "2025-12-31T00:00:00.000Z",
    "priority": 1,
    "notes": "Test order"
  }'
```

### Get Order
```bash
curl -X GET 'http://localhost:3000/api/orders/ORDER_ID_HERE' \
  -H 'Cookie: next-auth.session-token=YOUR_SESSION_TOKEN'
```

### Update Order
```bash
curl -X PATCH 'http://localhost:3000/api/orders/ORDER_ID_HERE' \
  -H 'Content-Type: application/json' \
  -H 'Cookie: next-auth.session-token=YOUR_SESSION_TOKEN' \
  -d '{
    "status": "IN_PRODUCTION",
    "priority": 2
  }'
```

### Delete Order
```bash
curl -X DELETE 'http://localhost:3000/api/orders/ORDER_ID_HERE' \
  -H 'Cookie: next-auth.session-token=YOUR_SESSION_TOKEN'
```

## Testing Sequential Numbering

### Test 1: Create Multiple Orders
1. Create first order → Should get number "001"
2. Create second order → Should get number "002"
3. Create third order → Should get number "003"

### Test 2: Check SystemConfig
```sql
SELECT * FROM system_config WHERE key = 'next_order_number';
```
Should show value "4" after creating 3 orders.

### Test 3: Concurrent Creation (Advanced)
Open two browser tabs and try to create orders simultaneously.
Both should get unique sequential numbers (no duplicates).

## Verifying Audit Logs

### Check Audit Logs in Database
```sql
SELECT
  al.timestamp,
  al.action,
  u.name as user_name,
  al.entity_type,
  al.entity_id,
  al.old_values,
  al.new_values
FROM audit_logs al
JOIN users u ON al.user_id = u.id
WHERE al.entity_type = 'Order'
ORDER BY al.timestamp DESC
LIMIT 20;
```

### Expected Audit Log Entries

**CREATE**:
```json
{
  "action": "CREATE",
  "oldValues": null,
  "newValues": {
    "orderNumber": "001",
    "dentistId": "xxx",
    "dueDate": "2025-12-31T00:00:00.000Z",
    "priority": 1,
    "notes": "Test order"
  }
}
```

**UPDATE**:
```json
{
  "action": "UPDATE",
  "oldValues": {
    "status": "PENDING",
    "priority": 0
  },
  "newValues": {
    "status": "IN_PRODUCTION",
    "priority": 2
  }
}
```

**DELETE**:
```json
{
  "action": "DELETE",
  "oldValues": {
    "orderNumber": "001",
    "dentistId": "xxx",
    "status": "PENDING"
  },
  "newValues": null,
  "reason": "Soft deleted"
}
```

## Common Issues & Solutions

### Issue: "Dentist not found or inactive"
**Solution**: Ensure you have at least one active dentist in the database.

```sql
-- Check active dentists
SELECT id, clinic_name, dentist_name, active, deleted_at
FROM dentists
WHERE active = true AND deleted_at IS NULL;

-- Create a test dentist if none exist
INSERT INTO dentists (id, clinic_name, dentist_name, email, phone, address, city, postal_code)
VALUES (
  gen_random_uuid(),
  'Test Clinic',
  'Dr. Test',
  'test@example.com',
  '123-456-7890',
  '123 Main St',
  'Ljubljana',
  '1000'
);
```

### Issue: "Unauthorized" error
**Solution**: Ensure you're logged in with a valid session.
- Navigate to `/login`
- Use ADMIN or TECHNICIAN credentials
- Try again

### Issue: "Forbidden - insufficient permissions"
**Solution**: Check your user role.
- Creating orders: Requires ADMIN or TECHNICIAN
- Deleting orders: Requires ADMIN only

```sql
-- Check your user role
SELECT id, name, email, role FROM users WHERE email = 'your-email@example.com';

-- Update role if needed (use with caution)
UPDATE users SET role = 'ADMIN' WHERE email = 'your-email@example.com';
```

### Issue: Sequential numbering not working
**Solution**: Check SystemConfig entry exists.

```sql
-- Check if entry exists
SELECT * FROM system_config WHERE key = 'next_order_number';

-- Create if missing
INSERT INTO system_config (id, key, value, description, updated_at)
VALUES (gen_random_uuid(), 'next_order_number', '1', 'Next sequential order number', CURRENT_TIMESTAMP);
```

### Issue: "Cannot delete order with associated worksheet"
**Solution**: This is expected behavior. Delete the worksheet first, then the order.

```sql
-- Check if order has worksheet
SELECT w.id, w.worksheet_number
FROM worksheets w
WHERE w.order_id = 'ORDER_ID_HERE';

-- Soft delete worksheet first
UPDATE worksheets SET deleted_at = CURRENT_TIMESTAMP WHERE order_id = 'ORDER_ID_HERE';
```

## Keyboard Shortcuts

While on the orders list page:
- **Click row**: Navigate to order detail
- **⋮ menu**: Open actions dropdown
- **Escape**: Close dialogs/dropdowns

## Performance Notes

### Pagination
- Default: 20 orders per page
- Adjust in `app/(dashboard)/orders/page.tsx` if needed
- Database queries use `skip` and `take` for efficiency

### Indexing
The following database indexes optimize order queries:
- `orders.order_number` (unique)
- `orders.dentist_id`
- `orders.status`
- `orders.order_date`
- `orders.deleted_at`

## Next Steps After Testing

1. **Create Dentists**: Populate dentists table for realistic testing
2. **Create Users**: Add technician and QC inspector users
3. **Test Workflow**: Order → Worksheet → QC → Invoice
4. **Customize**: Adjust UI colors, labels, etc. in components
5. **Dashboard Widget**: Add order statistics to main dashboard

## Getting Help

**Check Logs**:
```bash
# Server logs in terminal running npm run dev
# Browser console for client-side errors
```

**Database Debug**:
```bash
npx prisma studio
# Visual database browser at http://localhost:5555
```

**Reset Test Data**:
```sql
-- CAUTION: This deletes all orders and audit logs
DELETE FROM audit_logs WHERE entity_type = 'Order';
DELETE FROM orders;
UPDATE system_config SET value = '1' WHERE key = 'next_order_number';
```

---

**Quick Reference**:
- Orders List: `/orders`
- New Order: `/orders/new`
- Order Detail: `/orders/[id]`
- API Base: `/api/orders`

**Roles**:
- ADMIN: Full access (create, edit, delete)
- TECHNICIAN: Create, edit (no delete)
- QC_INSPECTOR: View only
- INVOICING: View only

**Status Flow**:
PENDING → IN_PRODUCTION → QC_PENDING → QC_APPROVED → INVOICED → DELIVERED
