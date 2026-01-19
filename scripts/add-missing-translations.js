#!/usr/bin/env node

/**
 * Add Missing Translations
 *
 * This script adds all missing translation keys identified in the codebase
 * to both English and Slovenian translation files.
 */

const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, '../messages/en.json');
const slPath = path.join(__dirname, '../messages/sl.json');

// Load existing translations
const enMessages = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const slMessages = JSON.parse(fs.readFileSync(slPath, 'utf8'));

// Missing translations to add
const missingTranslations = {
  // Dashboard Widgets
  dashboardWidgets: {
    qualityControlTitle: "Quality Control",
    qualityControlDescription: "Inspection statistics and approval tracking",
    totalInspections: "Total Inspections",
    passRate: "Pass Rate",
    todayInspections: "Today's Inspections",
    statusBreakdown: "Status Breakdown",
    passed: "Passed",
    failed: "Failed",

    ordersOverviewTitle: "Orders Overview",
    ordersOverviewDescription: "Current order status and tracking",
    totalOrders: "Total Orders",
    active: "Active",
    statusPENDING: "Pending",
    statusIN_PRODUCTION: "In Production",
    statusQC_PENDING: "QC Pending",
    statusQC_APPROVED: "QC Approved",
    statusINVOICED: "Invoiced",
    statusDELIVERED: "Delivered",
    statusCANCELLED: "Cancelled",

    mdrDocumentsTitle: "MDR Documents",
    mdrDocumentsDescription: "Compliance document tracking",
    totalDocuments: "Total Documents",
    generated: "Generated",
    documentStatus: "Document Status",
    retentionExpiring: "Retention Expiring",
    documentsRetained10Years: "Documents retained for 10 years",
    noDocumentsGenerated: "No documents generated yet",
    documentsAfterQC: "Documents generated after QC approval",

    recentActivityTitle: "Recent Activity",
    recentActivityDescription: "Latest system activities",
    noRecentActivity: "No recent activity",
    viewAllActivity: "View All Activity",

    materialInventoryTitle: "Material Inventory",
    materialInventoryDescription: "Stock levels and alerts",
    totalMaterials: "Total Materials",
    alertsWarnings: "Alerts & Warnings",
    viewButton: "View",
    allMaterialsGood: "All materials in good standing",
    viewAllMaterials: "View All Materials",

    invoicesTitle: "Invoices",
    invoicesDescription: "Invoice statistics and tracking",
    total: "Total",
    paid: "Paid",
    overdue: "Overdue",
    totalInvoices: "Total Invoices",
    paidRate: "Paid Rate",
    invoiceStatus: "Invoice Status",
    sent: "Sent",
    invoiceSystemComingSoon: "Invoice system coming soon"
  },

  // Common translations
  common: {
    loading: "Loading...",
    yes: "Yes",
    no: "No",
    saving: "Saving...",
    cancel: "Cancel",
    close: "Close",
    edit: "Edit",
    delete: "Delete",
    view: "View",
    actions: "Actions",
    status: "Status",
    code: "Code",
    title: "Title",
    category: "Category",
    version: "Version",
    acknowledged: "Acknowledged",
    pending: "Pending",
    completed: "Completed",
    active: "Active",
    inactive: "Inactive"
  },

  // Staff Portal
  staff: {
    bulkAcknowledgeError: "Failed to acknowledge SOPs",
    myTraining: "My Training",
    trainingHistoryDescription: "View your SOP acknowledgments and training records",
    sopsAcknowledged: "SOPs Acknowledged",
    sopsToAcknowledge: "SOPs to Acknowledge",
    pendingAcknowledgments: "Pending Acknowledgments",
    sopsRequireAcknowledgment: "SOPs requiring your acknowledgment",
    selectAll: "Select All",
    acknowledging: "Acknowledging...",
    completedTraining: "Completed Training",
    sopsYouAcknowledged: "SOPs you have acknowledged",
    noSOPsAcknowledged: "You haven't acknowledged any SOPs yet",
    acknowledgedOn: "Acknowledged on",
    categoryProduction: "Production",
    categoryEquipment: "Equipment",
    categoryMaterial: "Material",
    categoryQuality: "Quality",
    categoryDocumentation: "Documentation",
    categoryPersonnel: "Personnel",
    categoryRiskManagement: "Risk Management",
    categoryOther: "Other",
    sopLibrary: "SOP Library",
    sopLibraryDescription: "Review and acknowledge standard operating procedures",
    totalSOPs: "Total SOPs",
    searchPlaceholder: "Search by title or code...",
    allCategories: "All Categories",
    standardOperatingProcedures: "Standard Operating Procedures",
    clickToView: "Click any SOP to view details",
    loadingSOPs: "Loading SOPs...",
    noSOPsFound: "No SOPs found"
  },

  // Settings Page
  settings: {
    pageTitle: "Laboratory Configuration",
    pageDescription: "Manage laboratory information, address, contact details, and bank accounts",
    toastErrorTitle: "Error",
    toastConfigLoadFailed: "Failed to load configuration",
    toastSuccessTitle: "Success",
    toastConfigSaved: "Configuration saved successfully",
    toastBankSaveFailed: "Failed to save bank account",
    toastBankDeleteFailed: "Failed to delete bank account",
    toastPrimaryUpdateFailed: "Failed to update primary account",

    labInfoTitle: "Laboratory Information",
    labInfoDescription: "Basic laboratory details and identification",
    sectionLabDetails: "Laboratory Details",
    laboratoryName: "Laboratory Name",
    laboratoryNamePlaceholder: "Enter laboratory name",
    laboratoryId: "Laboratory ID",
    laboratoryIdPlaceholder: "LAB-001",
    laboratoryLicense: "Laboratory License",
    laboratoryLicensePlaceholder: "Enter license number",
    technicianIdNumber: "Technician ID Number",
    technicianIdNumberPlaceholder: "Enter technician ID",
    registrationNumber: "Registration Number",
    registrationNumberPlaceholder: "Enter registration number",
    taxId: "Tax ID / VAT Number",
    taxIdPlaceholder: "SI12345678",

    sectionAddress: "Address",
    streetAddress: "Street Address",
    streetAddressPlaceholder: "Enter street address",
    city: "City",
    cityPlaceholder: "Enter city",
    postalCode: "Postal Code",
    postalCodePlaceholder: "1000",
    country: "Country",
    countryPlaceholder: "Slovenia",
    region: "Region",
    regionPlaceholder: "Enter region",

    sectionContact: "Contact Information",
    phone: "Phone",
    phonePlaceholder: "+386 1 234 5678",
    email: "Email",
    emailPlaceholder: "info@smilelab.si",
    website: "Website",
    websitePlaceholder: "https://smilelab.si",

    sectionResponsiblePerson: "Responsible Person",
    responsiblePersonName: "Name",
    responsiblePersonNamePlaceholder: "Enter name",
    responsiblePersonTitle: "Title/Position",
    responsiblePersonTitlePlaceholder: "Laboratory Director",
    responsiblePersonLicense: "License Number",
    responsiblePersonLicensePlaceholder: "Enter license number",
    responsiblePersonEmail: "Email",
    responsiblePersonEmailPlaceholder: "director@smilelab.si",
    responsiblePersonPhone: "Phone",
    responsiblePersonPhonePlaceholder: "+386 1 234 5678",

    sectionFilesAssets: "Files & Assets",
    sectionFilesDescription: "Upload laboratory logo and signature",
    logo: "Laboratory Logo",
    replaceLogo: "Replace Logo",
    noLogoUploaded: "No logo uploaded",
    toastLogoUploadSuccess: "Logo uploaded successfully",
    toastLogoUploadFailed: "Failed to upload logo",
    logoFormatHint: "PNG or JPG, max 2MB",
    signature: "Responsible Person Signature",
    replaceSignature: "Replace Signature",
    noSignatureUploaded: "No signature uploaded",
    toastSignatureUploadSuccess: "Signature uploaded successfully",
    toastSignatureUploadFailed: "Failed to upload signature",
    signatureFormatHint: "PNG or JPG, max 1MB",

    sectionDefaultSettings: "Default Settings",
    defaultPaymentTerms: "Default Payment Terms (days)",
    defaultPaymentTermsPlaceholder: "30",
    defaultPaymentTermsDescription: "Number of days until payment is due",
    defaultTaxRate: "Default Tax Rate (%)",
    defaultTaxRatePlaceholder: "22",
    defaultTaxRateDescription: "Default VAT/tax rate for invoices",

    sectionInvoiceLegalTerms: "Legal Terms on Invoices",
    legalTermsText: "Legal Terms Text",
    legalTermsPlaceholder: "Enter legal terms to display on invoices...",

    saveConfiguration: "Save Configuration",

    bankAccountsTitle: "Bank Accounts",
    addBankAccount: "Add Bank Account",
    noBankAccounts: "No bank accounts configured",
    addFirstBankAccount: "Add your first bank account",
    tableHeaderPrimary: "Primary",
    tableHeaderBank: "Bank Name",
    tableHeaderIban: "IBAN",
    tableHeaderSwift: "SWIFT/BIC",
    tableHeaderType: "Account Type",
    tableHeaderActions: "Actions",

    dialogEditBankTitle: "Edit Bank Account",
    dialogAddBankTitle: "Add Bank Account",
    bankName: "Bank Name",
    bankNamePlaceholder: "NLB d.d. Ljubljana",
    iban: "IBAN",
    ibanPlaceholder: "SI56 0110 0100 0123 456",
    swiftBic: "SWIFT/BIC",
    swiftBicPlaceholder: "LJBASI2X",
    accountType: "Account Type",
    accountTypePlaceholder: "Business Checking",
    bankNotes: "Notes (Optional)",
    bankNotesPlaceholder: "Additional notes...",
    dialogDeleteBankTitle: "Delete Bank Account"
  },

  // Materials Management
  materials: {
    createTitle: "Create New Material",
    createSubtitle: "Add a new material to inventory",
    newMaterialCardTitle: "New Material",
    newMaterialCardDesc: "Create material profile",
    arrivalFormTitle: "Record Stock Arrival",
    arrivalFormMaterialLabel: "Material",
    arrivalCardTitle: "Record Arrival",
    arrivalCardDesc: "Track incoming stock",

    editTitle: "Edit Material",
    editSubtitle: "Update material information",
    editMaterialCardTitle: "Edit Material",
    editMaterialCardDesc: "Update material details",
    inactiveBadge: "Inactive",
    editMaterialButton: "Edit Material",
    recordArrivalButton: "Record Arrival",

    detailsInfoCardTitle: "Material Information",
    detailsManufacturer: "Manufacturer",
    detailsUnit: "Unit",
    detailsDescription: "Description",
    detailsBiocompatible: "Biocompatible",
    detailsCEMarked: "CE Marked",
    detailsISO10993: "ISO 10993 Compliant",
    detailsCENumber: "CE Number",

    listTitle: "Materials",
    listSubtitle: "Manage material inventory and LOT tracking",
    newButton: "New Material",

    lotsFIFOHeader: "LOT Tracking (FIFO)",
    lotsTableHeaderLOT: "LOT Number",
    lotsTableHeaderArrival: "Arrival Date",
    lotsTableHeaderExpiry: "Expiry Date",
    lotsTableHeaderSupplier: "Supplier",
    lotsTableHeaderReceived: "Received",
    lotsTableHeaderAvailable: "Available",
    lotsTableHeaderStatus: "Status",
    lotsEmptyMessage: "No LOTs recorded for this material",
    lotsBadgeFirst: "FIRST (FIFO)",
    lotsBadgeExpired: "EXPIRED",
    lotsNoExpiry: "No expiry",
    lotsDropdownViewTraceability: "View Traceability",
    lotsDropdownAdjustQuantity: "Adjust Quantity",
    lotsDropdownMarkExpired: "Mark as Expired",
    lotsDropdownMarkDepleted: "Mark as Depleted",
    lotsDropdownMarkRecalled: "Mark as Recalled",
    lotsDropdownRestoreAvailable: "Restore to Available",
    lotsDropdownDeleteLOT: "Delete LOT",

    toastStatusUpdateSuccessTitle: "Status updated",
    toastStatusUpdateErrorTitle: "Update failed",
    toastStatusUpdateErrorDesc: "Could not update LOT status",
    deleteLOTConfirmation: "Are you sure you want to delete this LOT?",
    toastDeleteLOTSuccessTitle: "LOT deleted",
    toastDeleteLOTSuccessDesc: "LOT has been removed",
    toastDeleteLOTErrorTitle: "Delete failed",
    toastDeleteLOTErrorDesc: "Could not delete LOT",

    tabLOTs: "LOT Tracking",
    tabStatistics: "Statistics",
    statsTotalLOTs: "Total LOTs",
    statsAvailableLOTs: "Available LOTs",
    statsTotalQuantityAvailable: "Total Quantity Available"
  },

  // Documents & Reports
  documents: {
    subtitle: "Generate reports and manage document library",
    tabs: {
      reports: "Generate Reports",
      worksheet: "Worksheet Documents",
      library: "Document Library"
    },
    reports: {
      priceList: {
        title: "Price List",
        description: "Complete pricing catalog",
        activeOnly: "Active products only",
        generate: "Generate Price List"
      },
      materialList: {
        title: "Material Inventory",
        description: "Stock levels and LOT tracking",
        activeOnly: "Active materials only",
        includeExpired: "Include expired LOTs",
        generate: "Generate Material List"
      },
      outstandingInvoices: {
        title: "Outstanding Invoices",
        description: "Unpaid invoices report",
        generate: "Generate Report"
      },
      clientDirectory: {
        title: "Client Directory",
        description: "Dentist and clinic listing",
        activeOnly: "Active clients only",
        generate: "Generate Directory"
      },
      qcReports: {
        title: "QC Reports",
        description: "Quality control statistics",
        dateFrom: "From Date",
        dateTo: "To Date",
        generate: "Generate QC Report"
      }
    },
    worksheetDocuments: {
      title: "Worksheet Documents",
      description: "Generate Annex XIII and delivery notes",
      worksheetNumberLabel: "Worksheet Number",
      worksheetNumberPlaceholder: "DN-001",
      generating: "Generating...",
      generate: "Generate Documents"
    },
    library: {
      title: "Document Library",
      description: "All generated documents with 10-year retention",
      searchPlaceholder: "Search documents...",
      filterByType: "Filter by Type",
      allTypes: "All Types",
      loading: "Loading documents...",
      noDocuments: "No documents found",
      documentTypes: {
        ANNEX_XIII: "Annex XIII",
        INVOICE: "Invoice",
        DELIVERY_NOTE: "Delivery Note",
        QC_REPORT: "QC Report",
        OTHER: "Other"
      },
      table: {
        type: "Type",
        documentNumber: "Document Number",
        worksheet: "Worksheet",
        client: "Client",
        generated: "Generated",
        retentionUntil: "Retention Until",
        size: "Size",
        actions: "Actions"
      }
    },
    toast: {
      error: {
        loadFailed: "Failed to load documents",
        downloadFailed: "Failed to download document",
        enterWorksheetNumber: "Please enter a worksheet number",
        generateFailed: "Failed to generate documents"
      },
      success: {
        downloaded: "Document downloaded successfully",
        reportGenerated: "Report generated successfully"
      }
    }
  },

  // Orders Management
  orders: {
    priorityNormal: "Normal",
    priorityHigh: "High",
    priorityUrgent: "Urgent",
    loadingOrder: "Loading order...",
    orderNotFound: "Order not found",
    viewManageDetails: "View and manage order details",
    editButton: "Edit",
    deleteButton: "Delete",
    editOrderTitle: "Edit Order",
    editOrderDescription: "Update order information",
    orderInformationTitle: "Order Information",
    orderNumberLabel: "Order Number",
    statusLabel: "Status",
    patientLabel: "Patient",
    orderDateLabel: "Order Date",
    dueDateLabel: "Due Date",
    priorityLabel: "Priority",
    impressionTypeLabel: "Impression Type",
    digitalScan: "Digital Scan",
    physicalImprint: "Physical Imprint",
    notesLabel: "Notes",
    dentistInformationTitle: "Dentist Information",
    clinicLabel: "Clinic",
    dentistLabel: "Dentist",
    emailLabel: "Email",
    phoneLabel: "Phone",
    worksheetTitle: "Worksheet",
    worksheetNumberLabel: "Worksheet Number",
    viewWorksheetButton: "View Worksheet",
    createRevisionButton: "Create Revision",
    deleteWorksheetConfirm: "Are you sure you want to delete this worksheet?",
    deleteWorksheetButton: "Delete Worksheet",
    noWorksheetMessage: "No worksheet created yet",
    createWorksheetButton: "Create Worksheet",
    metadataTitle: "Metadata",
    createdAtLabel: "Created At",
    lastUpdatedLabel: "Last Updated",
    deleteDialogTitle: "Delete Order",
    cancelButton: "Cancel"
  },

  // Pricing/Products
  pricing: {
    backToPricingList: "Back to Pricing List",
    addNewProductTitle: "Add New Product",
    addNewProductSubtitle: "Create a new product in catalog",
    loadingProduct: "Loading product...",
    productNotFound: "Product not found",
    editProductTitle: "Edit Product",
    import: "Import",
    export: "Export",
    addProduct: "Add Product",
    categoryFilter: "Category",
    loadingProducts: "Loading products...",
    noProductsFound: "No products found",
    tryAdjustingFilters: "Try adjusting your filters",
    tableHeaderCode: "Code",
    tableHeaderName: "Name",
    tableHeaderCategory: "Category",
    tableHeaderPrice: "Price",
    tableHeaderUnit: "Unit",
    tableHeaderStatus: "Status",
    inactive: "Inactive",
    openMenu: "Open menu",
    actionsMenu: "Actions",
    viewDetails: "View Details",
    deleteProductTitle: "Delete Product",
    deleteWarning: "This action cannot be undone",
    deleting: "Deleting...",

    categoryCROWN: "Crown",
    categoryBRIDGE: "Bridge",
    categoryFILLING: "Filling",
    categoryIMPLANT: "Implant",
    categoryDENTURE: "Denture",
    categoryINLAY: "Inlay",
    categoryONLAY: "Onlay",
    categoryVENEER: "Veneer",
    categorySPLINT: "Splint",
    categoryPROVISIONAL: "Provisional",
    categoryTEMPLATE: "Template",
    categoryABUTMENT: "Abutment",
    categorySERVICE: "Service",
    categoryREPAIR: "Repair",
    categoryMODEL: "Model",

    categoryLabel: "Category",
    selectCategoryPlaceholder: "Select a category",
    categoryCannotChange: "Category cannot be changed after creation",
    productCodeLabel: "Product Code",
    productCodeAutoGenerated: "Auto-generated (PROD-001, PROD-002, etc.)",
    productNameLabel: "Product Name",
    productNamePlaceholder: "Enter product name",
    descriptionLabel: "Description",
    descriptionPlaceholder: "Enter product description",
    priceLabel: "Price (€)",
    pricePlaceholder: "0.00",
    priceHistoryNote: "Price history maintained for records",
    unitLabel: "Unit of Measure",
    selectUnitPlaceholder: "Select unit",
    activeLabel: "Active",
    activeDescription: "Inactive products are hidden from selection",
    updateProduct: "Update Product",
    createProduct: "Create Product",

    importErrorInvalidFile: "Please upload a valid CSV file",
    importTitle: "Import Products",
    importDescription: "Upload a CSV file to import products",
    importTemplateHint: "Need a template? Download the CSV template",
    downloadTemplate: "Download Template",
    chooseAnother: "Choose another file",
    dropZoneTitle: "Drop CSV file here",
    dropZoneSubtitle: "or click to select file",
    productName: "Product Name",
    created: "Created",
    updated: "Updated",
    error: "Error",
    importErrors: "Errors",
    importing: "Importing..."
  },

  // Dentist specific
  dentist: {
    worksheetsNoLOT: "Worksheets without LOT tracking"
  }
};

// Slovenian translations
const missingTranslationsSl = {
  // Dashboard Widgets
  dashboardWidgets: {
    qualityControlTitle: "Kontrola kakovosti",
    qualityControlDescription: "Statistika pregledov in sledenje odobritvam",
    totalInspections: "Skupaj pregledov",
    passRate: "Stopnja uspešnosti",
    todayInspections: "Današnji pregledi",
    statusBreakdown: "Razčlenitev stanja",
    passed: "Uspešno",
    failed: "Neuspešno",

    ordersOverviewTitle: "Pregled naročil",
    ordersOverviewDescription: "Trenutno stanje naročil in sledenje",
    totalOrders: "Skupaj naročil",
    active: "Aktivno",
    statusPENDING: "V čakanju",
    statusIN_PRODUCTION: "V proizvodnji",
    statusQC_PENDING: "Čaka na KK",
    statusQC_APPROVED: "KK odobreno",
    statusINVOICED: "Fakturirano",
    statusDELIVERED: "Dostavljeno",
    statusCANCELLED: "Preklicano",

    mdrDocumentsTitle: "MDR dokumenti",
    mdrDocumentsDescription: "Sledenje dokumentom skladnosti",
    totalDocuments: "Skupaj dokumentov",
    generated: "Ustvarjeno",
    documentStatus: "Status dokumenta",
    retentionExpiring: "Hramba poteče",
    documentsRetained10Years: "Dokumenti shranjeni 10 let",
    noDocumentsGenerated: "Še ni ustvarjenih dokumentov",
    documentsAfterQC: "Dokumenti ustvarjeni po odobritvi KK",

    recentActivityTitle: "Nedavna aktivnost",
    recentActivityDescription: "Zadnje sistemske aktivnosti",
    noRecentActivity: "Ni nedavne aktivnosti",
    viewAllActivity: "Prikaži vso aktivnost",

    materialInventoryTitle: "Zaloga materialov",
    materialInventoryDescription: "Ravni zalog in opozorila",
    totalMaterials: "Skupaj materialov",
    alertsWarnings: "Opozorila in alarmi",
    viewButton: "Poglej",
    allMaterialsGood: "Vsi materiali v redu",
    viewAllMaterials: "Prikaži vse materiale",

    invoicesTitle: "Računi",
    invoicesDescription: "Statistika računov in sledenje",
    total: "Skupaj",
    paid: "Plačano",
    overdue: "Zapadlo",
    totalInvoices: "Skupaj računov",
    paidRate: "Stopnja plačil",
    invoiceStatus: "Status računa",
    sent: "Poslano",
    invoiceSystemComingSoon: "Sistem računov kmalu na voljo"
  },

  // Common translations
  common: {
    loading: "Nalaganje...",
    yes: "Da",
    no: "Ne",
    saving: "Shranjevanje...",
    cancel: "Prekliči",
    close: "Zapri",
    edit: "Uredi",
    delete: "Izbriši",
    view: "Poglej",
    actions: "Akcije",
    status: "Status",
    code: "Koda",
    title: "Naslov",
    category: "Kategorija",
    version: "Verzija",
    acknowledged: "Potrjeno",
    pending: "V čakanju",
    completed: "Zaključeno",
    active: "Aktivno",
    inactive: "Neaktivno"
  },

  // Staff Portal
  staff: {
    bulkAcknowledgeError: "Neuspela množična potrditev",
    myTraining: "Moje usposabljanje",
    trainingHistoryDescription: "Pregled vaših potrditev SOP in evidenc usposabljanja",
    sopsAcknowledged: "Potrjeni SOP-i",
    sopsToAcknowledge: "SOP-i za potrditev",
    pendingAcknowledgments: "Potrditve v čakanju",
    sopsRequireAcknowledgment: "SOP-i, ki potrebujejo vašo potrditev",
    selectAll: "Izberi vse",
    acknowledging: "Potrjevanje...",
    completedTraining: "Zaključeno usposabljanje",
    sopsYouAcknowledged: "SOP-i, ki ste jih potrdili",
    noSOPsAcknowledged: "Še niste potrdili nobenega SOP-a",
    acknowledgedOn: "Potrjeno dne",
    categoryProduction: "Proizvodnja",
    categoryEquipment: "Oprema",
    categoryMaterial: "Material",
    categoryQuality: "Kakovost",
    categoryDocumentation: "Dokumentacija",
    categoryPersonnel: "Osebje",
    categoryRiskManagement: "Upravljanje tveganj",
    categoryOther: "Drugo",
    sopLibrary: "Knjižnica SOP",
    sopLibraryDescription: "Preglejte in potrdite standardne operativne postopke",
    totalSOPs: "Vsi SOP-i",
    searchPlaceholder: "Išči po naslovu ali kodi...",
    allCategories: "Vse kategorije",
    standardOperatingProcedures: "Standardni operativni postopki",
    clickToView: "Kliknite katerikoli SOP za ogled podrobnosti",
    loadingSOPs: "Nalaganje SOP-ov...",
    noSOPsFound: "Ni najdenih SOP-ov"
  },

  // Settings Page - all translations
  settings: {
    pageTitle: "Konfiguracija laboratorija",
    pageDescription: "Upravljajte informacije laboratorija, naslov, kontaktne podatke in bančne račune",
    toastErrorTitle: "Napaka",
    toastConfigLoadFailed: "Ni bilo mogoče naložiti konfiguracije",
    toastSuccessTitle: "Uspeh",
    toastConfigSaved: "Konfiguracija uspešno shranjena",
    toastBankSaveFailed: "Ni bilo mogoče shraniti bančnega računa",
    toastBankDeleteFailed: "Ni bilo mogoče izbrisati bančnega računa",
    toastPrimaryUpdateFailed: "Ni bilo mogoče posodobiti primarnega računa",

    labInfoTitle: "Informacije o laboratoriju",
    labInfoDescription: "Osnovni podatki in identifikacija laboratorija",
    sectionLabDetails: "Podatki laboratorija",
    laboratoryName: "Ime laboratorija",
    laboratoryNamePlaceholder: "Vnesite ime laboratorija",
    laboratoryId: "ID laboratorija",
    laboratoryIdPlaceholder: "LAB-001",
    laboratoryLicense: "Licenca laboratorija",
    laboratoryLicensePlaceholder: "Vnesite številko licence",
    technicianIdNumber: "ID številka tehnika",
    technicianIdNumberPlaceholder: "Vnesite ID tehnika",
    registrationNumber: "Registrska številka",
    registrationNumberPlaceholder: "Vnesite registrsko številko",
    taxId: "Davčna številka / ID za DDV",
    taxIdPlaceholder: "SI12345678",

    sectionAddress: "Naslov",
    streetAddress: "Ulica",
    streetAddressPlaceholder: "Vnesite ulico",
    city: "Mesto",
    cityPlaceholder: "Vnesite mesto",
    postalCode: "Poštna številka",
    postalCodePlaceholder: "1000",
    country: "Država",
    countryPlaceholder: "Slovenija",
    region: "Regija",
    regionPlaceholder: "Vnesite regijo",

    sectionContact: "Kontaktni podatki",
    phone: "Telefon",
    phonePlaceholder: "+386 1 234 5678",
    email: "E-pošta",
    emailPlaceholder: "info@smilelab.si",
    website: "Spletna stran",
    websitePlaceholder: "https://smilelab.si",

    sectionResponsiblePerson: "Odgovorna oseba",
    responsiblePersonName: "Ime",
    responsiblePersonNamePlaceholder: "Vnesite ime",
    responsiblePersonTitle: "Naziv/Pozicija",
    responsiblePersonTitlePlaceholder: "Direktor laboratorija",
    responsiblePersonLicense: "Številka licence",
    responsiblePersonLicensePlaceholder: "Vnesite številko licence",
    responsiblePersonEmail: "E-pošta",
    responsiblePersonEmailPlaceholder: "direktor@smilelab.si",
    responsiblePersonPhone: "Telefon",
    responsiblePersonPhonePlaceholder: "+386 1 234 5678",

    sectionFilesAssets: "Datoteke in sredstva",
    sectionFilesDescription: "Naložite logotip laboratorija in podpis",
    logo: "Logotip laboratorija",
    replaceLogo: "Zamenjaj logotip",
    noLogoUploaded: "Logotip ni naložen",
    toastLogoUploadSuccess: "Logotip uspešno naložen",
    toastLogoUploadFailed: "Nalaganje logotipa ni uspelo",
    logoFormatHint: "PNG ali JPG, max 2MB",
    signature: "Podpis odgovorne osebe",
    replaceSignature: "Zamenjaj podpis",
    noSignatureUploaded: "Podpis ni naložen",
    toastSignatureUploadSuccess: "Podpis uspešno naložen",
    toastSignatureUploadFailed: "Nalaganje podpisa ni uspelo",
    signatureFormatHint: "PNG ali JPG, max 1MB",

    sectionDefaultSettings: "Privzete nastavitve",
    defaultPaymentTerms: "Privzeti plačilni pogoji (dni)",
    defaultPaymentTermsPlaceholder: "30",
    defaultPaymentTermsDescription: "Število dni do zapadlosti plačila",
    defaultTaxRate: "Privzeta stopnja DDV (%)",
    defaultTaxRatePlaceholder: "22",
    defaultTaxRateDescription: "Privzeta stopnja DDV za račune",

    sectionInvoiceLegalTerms: "Pravni pogoji na računih",
    legalTermsText: "Besedilo pravnih pogojev",
    legalTermsPlaceholder: "Vnesite pravne pogoje za prikaz na računih...",

    saveConfiguration: "Shrani konfiguracijo",

    bankAccountsTitle: "Bančni računi",
    addBankAccount: "Dodaj bančni račun",
    noBankAccounts: "Ni konfiguriranih bančnih računov",
    addFirstBankAccount: "Dodajte vaš prvi bančni račun",
    tableHeaderPrimary: "Primarni",
    tableHeaderBank: "Ime banke",
    tableHeaderIban: "IBAN",
    tableHeaderSwift: "SWIFT/BIC",
    tableHeaderType: "Tip računa",
    tableHeaderActions: "Akcije",

    dialogEditBankTitle: "Uredi bančni račun",
    dialogAddBankTitle: "Dodaj bančni račun",
    bankName: "Ime banke",
    bankNamePlaceholder: "NLB d.d. Ljubljana",
    iban: "IBAN",
    ibanPlaceholder: "SI56 0110 0100 0123 456",
    swiftBic: "SWIFT/BIC",
    swiftBicPlaceholder: "LJBASI2X",
    accountType: "Tip računa",
    accountTypePlaceholder: "Poslovni račun",
    bankNotes: "Opombe (izbirno)",
    bankNotesPlaceholder: "Dodatne opombe...",
    dialogDeleteBankTitle: "Izbriši bančni račun"
  },

  // Materials Management - all translations
  materials: {
    createTitle: "Ustvari nov material",
    createSubtitle: "Dodaj nov material v zalogo",
    newMaterialCardTitle: "Nov material",
    newMaterialCardDesc: "Ustvari profil materiala",
    arrivalFormTitle: "Evidentiraj prihod zaloge",
    arrivalFormMaterialLabel: "Material",
    arrivalCardTitle: "Evidentiraj prihod",
    arrivalCardDesc: "Sledi prihodni zalogi",

    editTitle: "Uredi material",
    editSubtitle: "Posodobi informacije o materialu",
    editMaterialCardTitle: "Uredi material",
    editMaterialCardDesc: "Posodobi podatke materiala",
    inactiveBadge: "Neaktivno",
    editMaterialButton: "Uredi material",
    recordArrivalButton: "Evidentiraj prihod",

    detailsInfoCardTitle: "Informacije o materialu",
    detailsManufacturer: "Proizvajalec",
    detailsUnit: "Enota",
    detailsDescription: "Opis",
    detailsBiocompatible: "Biokompatibilen",
    detailsCEMarked: "CE oznaka",
    detailsISO10993: "ISO 10993 skladen",
    detailsCENumber: "CE številka",

    listTitle: "Materiali",
    listSubtitle: "Upravljaj zalogo materialov in LOT sledenje",
    newButton: "Nov material",

    lotsFIFOHeader: "LOT sledenje (FIFO)",
    lotsTableHeaderLOT: "LOT številka",
    lotsTableHeaderArrival: "Datum prihoda",
    lotsTableHeaderExpiry: "Datum poteka",
    lotsTableHeaderSupplier: "Dobavitelj",
    lotsTableHeaderReceived: "Prejeto",
    lotsTableHeaderAvailable: "Na voljo",
    lotsTableHeaderStatus: "Status",
    lotsEmptyMessage: "Ni evidentiranih LOT-ov za ta material",
    lotsBadgeFirst: "PRVI (FIFO)",
    lotsBadgeExpired: "POTEKLO",
    lotsNoExpiry: "Brez poteka",
    lotsDropdownViewTraceability: "Poglej sledljivost",
    lotsDropdownAdjustQuantity: "Prilagodi količino",
    lotsDropdownMarkExpired: "Označi kot poteklo",
    lotsDropdownMarkDepleted: "Označi kot porabljeno",
    lotsDropdownMarkRecalled: "Označi kot umaknjeno",
    lotsDropdownRestoreAvailable: "Obnovi kot na voljo",
    lotsDropdownDeleteLOT: "Izbriši LOT",

    toastStatusUpdateSuccessTitle: "Status posodobljen",
    toastStatusUpdateErrorTitle: "Posodobitev ni uspela",
    toastStatusUpdateErrorDesc: "Ni bilo mogoče posodobiti LOT statusa",
    deleteLOTConfirmation: "Ste prepričani, da želite izbrisati ta LOT?",
    toastDeleteLOTSuccessTitle: "LOT izbrisan",
    toastDeleteLOTSuccessDesc: "LOT je bil odstranjen",
    toastDeleteLOTErrorTitle: "Brisanje ni uspelo",
    toastDeleteLOTErrorDesc: "Ni bilo mogoče izbrisati LOT-a",

    tabLOTs: "LOT sledenje",
    tabStatistics: "Statistika",
    statsTotalLOTs: "Skupaj LOT-ov",
    statsAvailableLOTs: "Razpoložljivi LOT-i",
    statsTotalQuantityAvailable: "Skupna količina na voljo"
  },

  // Documents & Reports - all translations
  documents: {
    subtitle: "Generiraj poročila in upravljaj knjižnico dokumentov",
    tabs: {
      reports: "Generiraj poročila",
      worksheet: "Dokumenti delovnih nalogov",
      library: "Knjižnica dokumentov"
    },
    reports: {
      priceList: {
        title: "Cenik",
        description: "Celoten katalog cen",
        activeOnly: "Samo aktivni izdelki",
        generate: "Generiraj cenik"
      },
      materialList: {
        title: "Zaloga materialov",
        description: "Ravni zalog in LOT sledenje",
        activeOnly: "Samo aktivni materiali",
        includeExpired: "Vključi potekle LOT-e",
        generate: "Generiraj seznam materialov"
      },
      outstandingInvoices: {
        title: "Neporavnani računi",
        description: "Poročilo neplačanih računov",
        generate: "Generiraj poročilo"
      },
      clientDirectory: {
        title: "Imenik strank",
        description: "Seznam zobozdravnikov in klinik",
        activeOnly: "Samo aktivne stranke",
        generate: "Generiraj imenik"
      },
      qcReports: {
        title: "KK poročila",
        description: "Statistika kontrole kakovosti",
        dateFrom: "Od datuma",
        dateTo: "Do datuma",
        generate: "Generiraj KK poročilo"
      }
    },
    worksheetDocuments: {
      title: "Dokumenti delovnih nalogov",
      description: "Generiraj Prilogo XIII in dobavnice",
      worksheetNumberLabel: "Številka delovnega naloga",
      worksheetNumberPlaceholder: "DN-001",
      generating: "Generiranje...",
      generate: "Generiraj dokumente"
    },
    library: {
      title: "Knjižnica dokumentov",
      description: "Vsi generirani dokumenti z 10-letno hrambo",
      searchPlaceholder: "Išči dokumente...",
      filterByType: "Filtriraj po tipu",
      allTypes: "Vsi tipi",
      loading: "Nalaganje dokumentov...",
      noDocuments: "Ni najdenih dokumentov",
      documentTypes: {
        ANNEX_XIII: "Priloga XIII",
        INVOICE: "Račun",
        DELIVERY_NOTE: "Dobavnica",
        QC_REPORT: "KK poročilo",
        OTHER: "Drugo"
      },
      table: {
        type: "Tip",
        documentNumber: "Številka dokumenta",
        worksheet: "Delovni nalog",
        client: "Stranka",
        generated: "Generirano",
        retentionUntil: "Hramba do",
        size: "Velikost",
        actions: "Akcije"
      }
    },
    toast: {
      error: {
        loadFailed: "Nalaganje dokumentov ni uspelo",
        downloadFailed: "Prenos dokumenta ni uspel",
        enterWorksheetNumber: "Prosimo vnesite številko delovnega naloga",
        generateFailed: "Generiranje dokumentov ni uspelo"
      },
      success: {
        downloaded: "Dokument uspešno prenesen",
        reportGenerated: "Poročilo uspešno generirano"
      }
    }
  },

  // Orders Management - all translations
  orders: {
    priorityNormal: "Normalno",
    priorityHigh: "Visoko",
    priorityUrgent: "Nujno",
    loadingOrder: "Nalaganje naročila...",
    orderNotFound: "Naročilo ni najdeno",
    viewManageDetails: "Poglej in upravljaj podrobnosti naročila",
    editButton: "Uredi",
    deleteButton: "Izbriši",
    editOrderTitle: "Uredi naročilo",
    editOrderDescription: "Posodobi informacije naročila",
    orderInformationTitle: "Informacije o naročilu",
    orderNumberLabel: "Številka naročila",
    statusLabel: "Status",
    patientLabel: "Pacient",
    orderDateLabel: "Datum naročila",
    dueDateLabel: "Rok izvedbe",
    priorityLabel: "Prioriteta",
    impressionTypeLabel: "Tip odtisa",
    digitalScan: "Digitalno skeniranje",
    physicalImprint: "Fizični odtis",
    notesLabel: "Opombe",
    dentistInformationTitle: "Informacije o zobozdravniku",
    clinicLabel: "Klinika",
    dentistLabel: "Zobozdravnik",
    emailLabel: "E-pošta",
    phoneLabel: "Telefon",
    worksheetTitle: "Delovni nalog",
    worksheetNumberLabel: "Številka delovnega naloga",
    viewWorksheetButton: "Poglej delovni nalog",
    createRevisionButton: "Ustvari revizijo",
    deleteWorksheetConfirm: "Ste prepričani, da želite izbrisati ta delovni nalog?",
    deleteWorksheetButton: "Izbriši delovni nalog",
    noWorksheetMessage: "Še ni ustvarjen delovni nalog",
    createWorksheetButton: "Ustvari delovni nalog",
    metadataTitle: "Metapodatki",
    createdAtLabel: "Ustvarjeno",
    lastUpdatedLabel: "Nazadnje posodobljeno",
    deleteDialogTitle: "Izbriši naročilo",
    cancelButton: "Prekliči"
  },

  // Pricing/Products - all translations
  pricing: {
    backToPricingList: "Nazaj na cenik",
    addNewProductTitle: "Dodaj nov izdelek",
    addNewProductSubtitle: "Ustvari nov izdelek v katalogu",
    loadingProduct: "Nalaganje izdelka...",
    productNotFound: "Izdelek ni najden",
    editProductTitle: "Uredi izdelek",
    import: "Uvozi",
    export: "Izvozi",
    addProduct: "Dodaj izdelek",
    categoryFilter: "Kategorija",
    loadingProducts: "Nalaganje izdelkov...",
    noProductsFound: "Ni najdenih izdelkov",
    tryAdjustingFilters: "Poskusite prilagoditi filtre",
    tableHeaderCode: "Koda",
    tableHeaderName: "Ime",
    tableHeaderCategory: "Kategorija",
    tableHeaderPrice: "Cena",
    tableHeaderUnit: "Enota",
    tableHeaderStatus: "Status",
    inactive: "Neaktivno",
    openMenu: "Odpri meni",
    actionsMenu: "Akcije",
    viewDetails: "Poglej podrobnosti",
    deleteProductTitle: "Izbriši izdelek",
    deleteWarning: "Tega dejanja ni mogoče razveljaviti",
    deleting: "Brisanje...",

    categoryCROWN: "Krona",
    categoryBRIDGE: "Mostiček",
    categoryFILLING: "Polnilo",
    categoryIMPLANT: "Implantat",
    categoryDENTURE: "Proteza",
    categoryINLAY: "Zasek",
    categoryONLAY: "Nasadek",
    categoryVENEER: "Luska",
    categorySPLINT: "Opornica",
    categoryPROVISIONAL: "Provizorij",
    categoryTEMPLATE: "Predloga",
    categoryABUTMENT: "Nastavek",
    categorySERVICE: "Storitev",
    categoryREPAIR: "Popravilo",
    categoryMODEL: "Model",

    categoryLabel: "Kategorija",
    selectCategoryPlaceholder: "Izberite kategorijo",
    categoryCannotChange: "Kategorije ni mogoče spremeniti po ustvarjanju",
    productCodeLabel: "Koda izdelka",
    productCodeAutoGenerated: "Samodejno generirano (PROD-001, PROD-002, itd.)",
    productNameLabel: "Ime izdelka",
    productNamePlaceholder: "Vnesite ime izdelka",
    descriptionLabel: "Opis",
    descriptionPlaceholder: "Vnesite opis izdelka",
    priceLabel: "Cena (€)",
    pricePlaceholder: "0.00",
    priceHistoryNote: "Zgodovina cen vzdrževana za evidence",
    unitLabel: "Merska enota",
    selectUnitPlaceholder: "Izberite enoto",
    activeLabel: "Aktivno",
    activeDescription: "Neaktivni izdelki so skriti iz izbire",
    updateProduct: "Posodobi izdelek",
    createProduct: "Ustvari izdelek",

    importErrorInvalidFile: "Prosimo naložite veljavno CSV datoteko",
    importTitle: "Uvozi izdelke",
    importDescription: "Naložite CSV datoteko za uvoz izdelkov",
    importTemplateHint: "Potrebujete predlogo? Prenesite CSV predlogo",
    downloadTemplate: "Prenesi predlogo",
    chooseAnother: "Izberi drugo datoteko",
    dropZoneTitle: "Spusti CSV datoteko sem",
    dropZoneSubtitle: "ali klikni za izbiro datoteke",
    productName: "Ime izdelka",
    created: "Ustvarjeno",
    updated: "Posodobljeno",
    error: "Napaka",
    importErrors: "Napake",
    importing: "Uvažanje..."
  },

  // Dentist specific
  dentist: {
    worksheetsNoLOT: "Delovni nalogi brez LOT sledenja"
  }
};

// Deep merge function
function deepMerge(target, source) {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      target[key] = target[key] || {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

// Merge new translations into existing
const updatedEnMessages = deepMerge(enMessages, missingTranslations);
const updatedSlMessages = deepMerge(slMessages, missingTranslationsSl);

// Write updated translations
fs.writeFileSync(enPath, JSON.stringify(updatedEnMessages, null, 2), 'utf8');
fs.writeFileSync(slPath, JSON.stringify(updatedSlMessages, null, 2), 'utf8');

console.log('\n✅ Successfully added missing translations!');
console.log(`\nAdded translations for:`);
console.log(`  - Dashboard Widgets`);
console.log(`  - Common translations`);
console.log(`  - Staff Portal`);
console.log(`  - Settings Page`);
console.log(`  - Materials Management`);
console.log(`  - Documents & Reports`);
console.log(`  - Orders Management`);
console.log(`  - Pricing/Products`);
console.log(`\nBoth EN and SL translation files have been updated.\n`);
