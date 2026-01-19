# Smilelab MDR - Project Roadmap Summary

## Quick Reference
Two major workstreams planned for system completion:

---

## 📋 Workstream 1: SOP Library Population

**Document**: [SOP-LIBRARY-PLAN.md](./SOP-LIBRARY-PLAN.md)

**Goal**: Populate the SOP management system with comprehensive procedures for EU MDR compliance

**Timeline**: 6 weeks

**Phases**:
1. **Week 1**: Import existing printed SOPs
2. **Weeks 2-3**: Create equipment/machine SOPs
3. **Weeks 4-6**: Build ISO 13485 standard SOP library

**Key Decisions Needed**:
- [ ] Manual entry vs. PDF import feature?
- [ ] How many existing SOPs to digitize?
- [ ] Equipment inventory for machine SOPs
- [ ] Priority order for ISO standard SOPs

**Deliverables**:
- 30-40 comprehensive SOPs
- Complete compliance documentation
- Staff training and acknowledgment system

---

## 📄 Workstream 2: Unified PDF Generation

**Document**: [UNIFIED-PDF-GENERATION-PLAN.md](./UNIFIED-PDF-GENERATION-PLAN.md)

**Goal**: Extend PDF generation across all system screens with unified styling and branding

**Timeline**: 5 weeks

**Current State**:
- ✅ SOPs have PDF export

**Target State** (10+ document types):
- Price Lists
- Material Lists
- Dentist Information Sheets
- Dentist Lists
- Order Details
- Invoices (enhanced)
- Outstanding Invoices Reports
- QC Reports
- Annex XIII Certificates

**Key Architecture**:
```
Single CSS file → Global styles for ALL PDFs
Reusable header → Same branding across documents
Reusable footer → Consistent company info
Base generator → Rapid new PDF creation
```

**Implementation Phases**:
1. **Week 1**: Build unified infrastructure
2. **Week 2**: Critical business documents (Price Lists, Invoices)
3. **Week 3**: Client/Material documents
4. **Week 4**: Production documents
5. **Week 5**: Compliance documents

---

## Parallel Execution Strategy

Both workstreams can run in parallel:

```
┌─────────────────────────────────────────────────┐
│  Week 1-2: Infrastructure Setup                │
│  ├─ PDF: Build unified system                  │
│  └─ SOP: Import existing PDFs                  │
├─────────────────────────────────────────────────┤
│  Week 3-4: Core Implementation                 │
│  ├─ PDF: Critical documents (invoices, prices) │
│  └─ SOP: Equipment SOPs                        │
├─────────────────────────────────────────────────┤
│  Week 5-6: Extended Implementation             │
│  ├─ PDF: Production & compliance docs          │
│  └─ SOP: ISO standard procedures               │
└─────────────────────────────────────────────────┘
```

**Total Timeline**: 6 weeks to complete both workstreams

---

## Benefits Overview

### SOP Library Benefits
✅ EU MDR compliance documentation complete
✅ Staff training and acknowledgment tracking
✅ Version control and history
✅ Audit-ready procedure library

### Unified PDF Benefits
✅ One-click exports for all data
✅ Professional, branded documents
✅ Email-ready formats
✅ Global styling changes (change once, update everywhere)
✅ Faster development of new document types

---

## Priority Recommendations

### High Priority (Start Immediately)
1. **PDF Infrastructure** (Week 1)
   - Build base system
   - Migrate SOP to new architecture

2. **Critical PDFs** (Week 2)
   - Price List export
   - Enhanced Invoice PDFs
   - Outstanding Invoices report

3. **Existing SOP Import** (Week 1-2)
   - Digitize current printed SOPs
   - Get compliance docs into system

### Medium Priority (Weeks 3-4)
4. **Client/Material PDFs**
   - Dentist information sheets
   - Material inventory reports

5. **Equipment SOPs**
   - Document all lab equipment
   - Operating procedures

### Lower Priority (Weeks 5-6)
6. **Production PDFs**
   - Order details
   - QC reports

7. **ISO Standard SOPs**
   - Complete procedure library
   - Continuous improvement

---

## Next Steps

1. **Review Plans**: Read both detailed planning documents
2. **Make Decisions**:
   - PDF import feature for SOPs? (Yes/No)
   - Which PDFs are most urgent?
   - Equipment list for SOPs?
3. **Approve Roadmap**: Confirm timeline and priorities
4. **Start Week 1**: Begin infrastructure work

---

## Documentation Links

- 📋 [SOP Library Plan (Detailed)](./SOP-LIBRARY-PLAN.md)
- 📄 [Unified PDF Generation Plan (Detailed)](./UNIFIED-PDF-GENERATION-PLAN.md)

---

**Created**: 2026-01-10
**Status**: Planning Phase
**Next Review**: After Week 1 completion
