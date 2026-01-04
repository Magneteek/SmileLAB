# Dentist Management System - Quick Start Guide

## API Usage Examples

### 1. List All Active Dentists (for Dropdowns)

```typescript
// GET /api/dentists?simple=true
const response = await fetch('/api/dentists?simple=true');
const dentists = await response.json();

// Returns:
[
  {
    id: "clx123...",
    clinicName: "Dental Clinic Ljubljana",
    dentistName: "Dr. Jane Smith",
    email: "clinic@example.com",
    paymentTerms: 30
  }
]
```

### 2. List All Dentists with Filtering

```typescript
// GET /api/dentists?active=true&city=Ljubljana&search=Smith&page=1
const response = await fetch('/api/dentists?active=true&city=Ljubljana&search=Smith&page=1');
const data = await response.json();

// Returns:
{
  dentists: [...],
  total: 50,
  page: 1,
  limit: 20,
  totalPages: 3
}
```

### 3. Get Single Dentist

```typescript
// GET /api/dentists/[id]
const response = await fetch('/api/dentists/clx123...');
const dentist = await response.json();

// Returns dentist with order/worksheet counts
{
  id: "clx123...",
  clinicName: "...",
  // ... all fields
  _count: {
    orders: 42,
    worksheets: 38
  }
}
```

### 4. Get Dentist Statistics

```typescript
// GET /api/dentists/[id]?stats=true
const response = await fetch('/api/dentists/clx123...?stats=true');
const stats = await response.json();

// Returns complete statistics
{
  totalOrders: 42,
  activeOrders: 3,
  completedOrders: 39,
  totalWorksheets: 38,
  activeWorksheets: 2,
  completedWorksheets: 36,
  totalRevenue: 45800.50,
  averageOrderValue: 1174.37,
  ordersThisMonth: 5,
  ordersThisYear: 28,
  lastOrderDate: "2024-12-26T...",
  lastWorksheetDate: "2024-12-25T..."
}
```

### 5. Create New Dentist

```typescript
// POST /api/dentists
const response = await fetch('/api/dentists', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clinicName: "Dental Clinic Ljubljana",
    dentistName: "Dr. Jane Smith",
    licenseNumber: "12345",
    email: "clinic@example.com",
    phone: "+386 1 234 5678",
    address: "Dunajska cesta 100",
    city: "Ljubljana",
    postalCode: "1000",
    country: "Slovenia",
    paymentTerms: 30,
    notes: "Prefers ceramic crowns",
    active: true
  })
});

const dentist = await response.json();
```

### 6. Update Dentist

```typescript
// PATCH /api/dentists/[id]
const response = await fetch('/api/dentists/clx123...', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: "newemail@example.com",
    paymentTerms: 60,
    notes: "Updated notes"
  })
});

const updatedDentist = await response.json();
```

### 7. Delete Dentist

```typescript
// DELETE /api/dentists/[id]
const response = await fetch('/api/dentists/clx123...', {
  method: 'DELETE'
});

// Success: { success: true, message: "Dentist deleted" }
// Error (active orders): { error: "Cannot delete dentist with 3 active order(s)..." }
```

### 8. Get Dentist's Orders

```typescript
// GET /api/dentists/[id]/orders?page=1&limit=20
const response = await fetch('/api/dentists/clx123.../orders?page=1');
const data = await response.json();

// Returns:
{
  orders: [...],
  total: 42,
  page: 1,
  limit: 20,
  totalPages: 3
}
```

## Component Usage Examples

### 1. Using DentistsTable

```tsx
import { DentistsTable } from '@/components/dentists/DentistsTable';

function MyPage() {
  const [dentists, setDentists] = useState([]);
  const [sortBy, setSortBy] = useState('clinicName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleDelete = async (id: string) => {
    // Delete logic
  };

  return (
    <DentistsTable
      dentists={dentists}
      onSort={handleSort}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onDelete={handleDelete}
    />
  );
}
```

### 2. Using DentistForm

```tsx
import { DentistForm } from '@/components/dentists/DentistForm';

function NewDentistPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data) => {
    setIsSubmitting(true);

    const response = await fetch('/api/dentists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    // Handle response
    setIsSubmitting(false);
  };

  return (
    <DentistForm
      onSubmit={handleSubmit}
      onCancel={() => router.push('/dentists')}
      isSubmitting={isSubmitting}
    />
  );
}
```

### 3. Using DentistStats

```tsx
import { DentistStats } from '@/components/dentists/DentistStats';

function DentistDetailPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch(`/api/dentists/${id}?stats=true`)
      .then(res => res.json())
      .then(setStats);
  }, [id]);

  if (!stats) return <div>Loading...</div>;

  return <DentistStats stats={stats} />;
}
```

## Integration with Orders

### Order Creation - Dentist Selector

```tsx
import { useState, useEffect } from 'react';

function OrderForm() {
  const [dentists, setDentists] = useState([]);
  const [selectedDentistId, setSelectedDentistId] = useState('');

  // Load active dentists for dropdown
  useEffect(() => {
    fetch('/api/dentists?simple=true')
      .then(res => res.json())
      .then(setDentists);
  }, []);

  // When dentist selected, populate payment terms
  const handleDentistChange = (dentistId: string) => {
    setSelectedDentistId(dentistId);

    const dentist = dentists.find(d => d.id === dentistId);
    if (dentist) {
      // Set payment terms from dentist
      form.setValue('paymentTerms', dentist.paymentTerms);
    }
  };

  return (
    <Select value={selectedDentistId} onValueChange={handleDentistChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select dentist" />
      </SelectTrigger>
      <SelectContent>
        {dentists.map((dentist) => (
          <SelectItem key={dentist.id} value={dentist.id}>
            {dentist.clinicName} - Dr. {dentist.dentistName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

## Common Patterns

### 1. Filtering Active Dentists Only

```typescript
const { data } = await fetch('/api/dentists?active=true');
```

### 2. Searching Across Multiple Fields

```typescript
// Searches: clinicName, dentistName, email
const { data } = await fetch('/api/dentists?search=Smith');
```

### 3. City-Based Filtering

```typescript
const { data } = await fetch('/api/dentists?city=Ljubljana');
```

### 4. Pagination

```typescript
const { data } = await fetch('/api/dentists?page=2&limit=20');
```

### 5. Sorting

```typescript
const { data } = await fetch('/api/dentists?sortBy=city&sortOrder=desc');
```

### 6. Combined Filters

```typescript
const params = new URLSearchParams({
  active: 'true',
  city: 'Ljubljana',
  search: 'Dental',
  page: '1',
  limit: '20',
  sortBy: 'clinicName',
  sortOrder: 'asc'
});

const { data } = await fetch(`/api/dentists?${params.toString()}`);
```

## Error Handling

### Validation Errors (400)

```typescript
try {
  const response = await fetch('/api/dentists', {
    method: 'POST',
    body: JSON.stringify(invalidData)
  });

  if (!response.ok) {
    const error = await response.json();

    if (response.status === 400) {
      // Zod validation errors
      console.log(error.details); // Array of validation errors
    }
  }
} catch (error) {
  console.error(error);
}
```

### Conflict Errors (409)

```typescript
// Email already exists
{
  error: "A dentist with email clinic@example.com already exists: Existing Clinic Name"
}

// Cannot delete (active orders)
{
  error: "Cannot delete dentist with 3 active order(s). Please complete or cancel all orders first..."
}
```

### Not Found (404)

```typescript
{
  error: "Dentist not found"
}
```

## Database Queries

### Get Dentist with Related Data

```typescript
const dentist = await prisma.dentist.findUnique({
  where: { id },
  include: {
    orders: {
      where: { status: 'PENDING' },
      orderBy: { orderDate: 'desc' }
    },
    worksheets: {
      where: { status: 'IN_PRODUCTION' }
    },
    _count: {
      select: {
        orders: true,
        worksheets: true
      }
    }
  }
});
```

### Find Dentists by City

```typescript
const dentists = await prisma.dentist.findMany({
  where: {
    city: 'Ljubljana',
    active: true,
    deletedAt: null
  },
  orderBy: {
    clinicName: 'asc'
  }
});
```

### Search Across Fields

```typescript
const dentists = await prisma.dentist.findMany({
  where: {
    OR: [
      { clinicName: { contains: searchQuery, mode: 'insensitive' } },
      { dentistName: { contains: searchQuery, mode: 'insensitive' } },
      { email: { contains: searchQuery, mode: 'insensitive' } }
    ],
    deletedAt: null
  }
});
```

## URLs & Routes

### Pages
- List: `/dentists`
- Create: `/dentists/new`
- Detail: `/dentists/[id]`
- Edit: `/dentists/[id]?edit=true`

### API
- List: `GET /api/dentists`
- Simple List: `GET /api/dentists?simple=true`
- Get: `GET /api/dentists/[id]`
- Stats: `GET /api/dentists/[id]?stats=true`
- Create: `POST /api/dentists`
- Update: `PATCH /api/dentists/[id]`
- Delete: `DELETE /api/dentists/[id]`
- Orders: `GET /api/dentists/[id]/orders`

## Tips & Best Practices

1. **Always use simple=true for dropdowns** - Faster, less data
2. **Check for active orders before delete** - Prevent data integrity issues
3. **Use payment terms from dentist** - Populate invoice defaults
4. **Cache active dentists list** - Reduce API calls in order forms
5. **Show helpful error messages** - Guide users to resolve issues
6. **Validate email uniqueness** - Prevent duplicate entries
7. **Use soft delete** - Maintain data integrity and history
8. **Include counts in detail view** - Show relationship metrics
9. **Filter inactive by default** - Focus on active dentists
10. **Search across multiple fields** - Better user experience

---

This quick start guide provides all the essential patterns and examples for using the dentist management system effectively.
