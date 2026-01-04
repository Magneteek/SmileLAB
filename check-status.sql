-- Check invoice status
SELECT id, "invoiceNumber", "isDraft", "paymentStatus"
FROM "Invoice"
WHERE "invoiceNumber" LIKE 'RAC-%'
ORDER BY "createdAt" DESC
LIMIT 5;

-- Check worksheet status
SELECT id, "worksheetNumber", status
FROM "WorkSheet"
WHERE "worksheetNumber" IN ('DN-25003')
ORDER BY "createdAt" DESC;

-- Check order status
SELECT id, "orderNumber", status
FROM "Order"
WHERE "orderNumber" IN ('25003')
ORDER BY "createdAt" DESC;
