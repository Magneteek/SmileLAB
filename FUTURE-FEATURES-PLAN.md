# Future Features Implementation Plan
**Project**: Smilelab MDR Management System
**Created**: 2026-01-08
**Status**: Planning Phase

---

## Priority 1: SOP/Process Documentation Module (8-10 hours)
**Status**: Ready to implement
**Priority**: Critical for full MDR compliance
**Start Date**: TBD

### Description
Complete Quality Management System (QMS) documentation module for EU MDR Annex XIII compliance.

### Core Features
- **SOP Library**: Create, edit, and version-control Standard Operating Procedures
- **Process Documentation**: Step-by-step procedures for all production workflows
- **Machine Operations**: Equipment operation manuals and maintenance logs
- **Risk Management**: Risk assessment templates and tracking
- **Training Records**: Staff training documentation and acknowledgment
- **Digital Signatures**: Legal acknowledgment of SOP reading/understanding
- **Audit Trail**: Immutable logs of all SOP changes and access

### Technical Requirements
- New database models: SOP, SOPVersion, SOPAcknowledgment, MachineOperation, TrainingRecord
- PDF generation for SOP documents
- Version control system (similar to Git-style versioning)
- Role-based access (who can create/edit/approve SOPs)
- Search and filter functionality
- Link SOPs to workflow steps (Orders → Worksheets → QC)

### Compliance Requirements (EU MDR Annex XIII)
- 10-year retention for all SOP versions
- Audit trail for all changes
- Staff training tracking
- Risk management integration
- Process validation records
- Material handling procedures
- Quality control procedures

### User Workflows
1. **Admin**: Create/edit/approve SOPs
2. **Technician**: View SOPs, acknowledge reading, follow checklists
3. **QC Inspector**: Verify compliance with SOPs during inspection
4. **Auditor**: Review SOP history and compliance records

### Estimated Breakdown
- Database schema & migrations: 1.5h
- SOP CRUD operations (API + UI): 3h
- Version control system: 2h
- Digital signature & acknowledgment: 1.5h
- Training record tracking: 1h
- Integration with existing workflows: 1h

---

## Priority 2: AI Chat Assistant (12-15 hours)
**Status**: Planning
**Priority**: High - Major UX improvement
**Start Date**: TBD

### Description
Natural language interface for common tasks using Claude API or local LLM.

### Core Features
- **Natural Language Commands**: Create orders, search records, query data
- **Contextual Understanding**: Maintain conversation context
- **Quick Actions**: Direct execution of commands via chat
- **Smart Suggestions**: Proactive suggestions based on context
- **Voice Input**: Optional voice-to-text for hands-free operation
- **Multi-language**: Support Slovenian and English

### Example Commands
```
User: "Create an order for Dr. Novak with patient Kris Krajnc for 3 crowns"
AI: "I've created Order #156 for Dr. Novak, patient: Kris Krajnc, with 3 crowns. Would you like to create a worksheet now?"

User: "Show me all overdue invoices"
AI: "You have 3 overdue invoices totaling €1,245.50: INV-023 (€450), INV-028 (€320.50), INV-031 (€475). Would you like me to send reminders?"

User: "What materials are expiring this month?"
AI: "5 material lots expiring in January 2026: Ceramic ZX-201 (Jan 15), Metal Alloy CoCr-445 (Jan 22)..."

User: "Mark invoice INV-025 as paid"
AI: "Invoice INV-025 marked as PAID with payment date today (2026-01-08). Updated accounts receivable."
```

### Technical Requirements
- Claude API integration (claude-3-5-sonnet-20241022)
- Function calling for tool use (create order, search, update)
- Chat UI component (streaming responses)
- Conversation history storage
- Rate limiting and cost management
- Security: Validate all AI-generated actions before execution

### User Workflows
1. **Order Creation**: Natural language → Parse entities → Confirm → Execute
2. **Search**: Query in plain language → Fetch results → Display
3. **Updates**: Command to modify records → Confirm → Execute
4. **Reporting**: Ask for stats/reports → Generate → Display

### Estimated Breakdown
- Claude API integration: 2h
- Chat UI component: 2h
- Function calling framework: 3h
- Entity extraction & validation: 2h
- Security & confirmation flows: 2h
- Multi-language support: 2h
- Testing & refinement: 2h

---

## Priority 3: Quick Material/LOT Entry (3-4 hours)
**Status**: Planning
**Priority**: Medium - UX improvement
**Start Date**: TBD

### Description
Streamlined material and LOT entry system for faster data input.

### Core Features
- **Quick-Add Modal**: One-screen form for LOT addition
- **QR Code Generation**: Auto-generate QR codes for LOT tracking
- **Barcode Scanning**: Scan supplier barcodes for auto-fill
- **Material Templates**: Pre-fill common suppliers and materials
- **Mobile-Optimized**: Tablet-friendly for receiving dock use
- **Bulk Import**: Import multiple LOTs from supplier documents
- **Photo Capture**: Take photos of material packaging/labels

### Current Pain Points (to solve)
- Too many clicks to add a LOT
- Manual entry error-prone
- No mobile-friendly interface
- No supplier integration

### Technical Requirements
- Responsive modal component
- QR code generation library (qrcode.js)
- Camera/barcode scanner integration (react-qr-reader)
- Material templates in database
- CSV import for bulk LOTs
- Image upload and storage

### User Workflows
1. **Quick Add**: Click "Quick Add LOT" → One form → Submit
2. **Scan Entry**: Scan supplier barcode → Auto-fill fields → Confirm
3. **Bulk Import**: Upload CSV → Preview → Import all
4. **Mobile Entry**: Use tablet at dock → Scan/photo → Quick entry

### Estimated Breakdown
- Quick-add modal UI: 1h
- QR code generation: 0.5h
- Barcode scanning integration: 1h
- Material templates: 0.5h
- CSV bulk import: 1h

---

## Implementation Order

**Phase 1** (Current): SOP/QMS Documentation Module
**Phase 2** (Next): Quick Material/LOT Entry
**Phase 3** (Future): AI Chat Assistant

**Rationale**:
1. SOP module is critical for MDR compliance (legal requirement)
2. Material entry improvements provide immediate productivity gains
3. AI assistant is transformative but requires stable foundation first

---

## Additional Future Ideas (Lower Priority)

### Invoice Payment Tracking
- Mark invoices as PAID with payment date
- OVERDUE status automation
- Payment history timeline
- Accounts receivable dashboard
- **Effort**: 3-4 hours

### Photo Attachments for Orders
- Upload multiple photos per order/worksheet
- Gallery view
- Include in PDFs
- **Effort**: 4-5 hours

### Contract Generation
- Template-based contract creation
- Digital signatures
- Version control
- **Effort**: 6-8 hours

### Calendar View
- Order due dates
- Delivery schedule
- Material expiry dates
- QC scheduled dates
- **Effort**: 4-6 hours

---

## Notes

- All features should follow existing authentication and role-based access patterns
- Maintain 10-year retention requirements for MDR compliance
- Keep mobile responsiveness in mind (new requirement as of 2026-01-08)
- Test thoroughly before production deployment
- Update CLAUDE.md documentation after each feature

**Last Updated**: 2026-01-08 by Claude Sonnet 4.5
