-- Fix worksheets that are stuck in INVOICED status due to canceled invoices
-- Run this to fix old data from before the status reversion fix

-- This query finds all worksheets that:
-- 1. Have status = INVOICED
-- 2. Are only referenced by CANCELLED invoices
-- And updates them back to QC_APPROVED

-- Step 1: Find affected worksheets (for verification)
SELECT
  ws.id,
  ws."worksheetNumber",
  ws.status as "currentStatus",
  i."invoiceNumber",
  i."paymentStatus" as "invoiceStatus"
FROM
  "work_sheets" ws
  JOIN "invoice_line_items" ili ON ili."worksheetId" = ws.id
  JOIN "invoices" i ON i.id = ili."invoiceId"
WHERE
  ws.status = 'INVOICED'
  AND i."paymentStatus" = 'CANCELLED';

-- Step 2: Update worksheets to QC_APPROVED (uncomment to run)
-- UPDATE "work_sheets"
-- SET
--   status = 'QC_APPROVED',
--   "updatedAt" = NOW()
-- WHERE id IN (
--   SELECT DISTINCT ws.id
--   FROM
--     "work_sheets" ws
--     JOIN "invoice_line_items" ili ON ili."worksheetId" = ws.id
--     JOIN "invoices" i ON i.id = ili."invoiceId"
--   WHERE
--     ws.status = 'INVOICED'
--     AND i."paymentStatus" = 'CANCELLED'
--     -- Only update if ALL invoices for this worksheet are cancelled
--     AND NOT EXISTS (
--       SELECT 1
--       FROM "invoice_line_items" ili2
--       JOIN "invoices" i2 ON i2.id = ili2."invoiceId"
--       WHERE
--         ili2."worksheetId" = ws.id
--         AND i2."paymentStatus" != 'CANCELLED'
--     )
-- );
