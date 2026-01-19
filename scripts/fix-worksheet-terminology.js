#!/usr/bin/env node

/**
 * Fix Worksheet Terminology
 *
 * Changes "delavni list" → "delovni nalog" everywhere in Slovenian translations
 * Also adds remaining missing translations (sign-out dialog, etc.)
 */

const fs = require('fs');
const path = require('path');

const slPath = path.join(__dirname, '../messages/sl.json');
const enPath = path.join(__dirname, '../messages/en.json');

// Load existing translations
let slMessages = JSON.parse(fs.readFileSync(slPath, 'utf8'));
let enMessages = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// Convert to string to do global replacements
let slContent = JSON.stringify(slMessages, null, 2);

// Replace all instances of "delovni list" with "delovni nalog"
slContent = slContent.replace(/delovni list/gi, 'delovni nalog');
slContent = slContent.replace(/Delovni list/g, 'Delovni nalog');
slContent = slContent.replace(/Delovnih listov/g, 'Delovnih nalogov');
slContent = slContent.replace(/delovnega lista/g, 'delovnega naloga');
slContent = slContent.replace(/Informacije delovnega lista/g, 'Informacije delovnega naloga');

// Parse back to JSON
slMessages = JSON.parse(slContent);

// Update specific dashboard translations in Slovenian
slMessages.dashboard.createWorksheet = "Izdaj delovni nalog";
slMessages.dashboard.createWorksheetDesc = "Začni proizvodnjo";

// Update nav translation
slMessages.nav.worksheets = "Delovni nalogi";

// Add remaining missing translations

// English - Auth signout dialog
enMessages.auth = enMessages.auth || {};
enMessages.auth.signOutConfirmTitle = "Sign Out";
enMessages.auth.signOutConfirmMessage = "Are you sure you want to sign out?";
enMessages.auth.signOutButton = "Sign Out";
enMessages.auth.staySignedInButton = "Stay Signed In";

// Slovenian - Auth signout dialog
slMessages.auth = slMessages.auth || {};
slMessages.auth.signOutConfirmTitle = "Odjava";
slMessages.auth.signOutConfirmMessage = "Ali ste prepričani, da se želite odjaviti?";
slMessages.auth.signOutButton = "Odjavi se";
slMessages.auth.staySignedInButton = "Ostani prijavljen";

// Add staff portal translations
enMessages.staff = enMessages.staff || {};
enMessages.staff.staffPortal = "Staff Portal";
enMessages.staff.staffMember = "Staff Member";
enMessages.staff.dashboard = "Dashboard";
enMessages.staff.backToSOPs = "Back to SOPs";

slMessages.staff = slMessages.staff || {};
slMessages.staff.staffPortal = "Portal za osebje";
slMessages.staff.staffMember = "Član osebja";
slMessages.staff.dashboard = "Nadzorna plošča";
slMessages.staff.backToSOPs = "Nazaj na SOP-e";

// Add SOP detail page translations
enMessages.sop = enMessages.sop || {};
enMessages.sop.detailPage = enMessages.sop.detailPage || {};
enMessages.sop.detailPage.backToSOPs = "Back to SOPs";
enMessages.sop.detailPage.downloadPDF = "Download PDF";
enMessages.sop.detailPage.sopInformation = "SOP Information";
enMessages.sop.detailPage.title = "Title";
enMessages.sop.detailPage.category = "Category";
enMessages.sop.detailPage.version = "Version";
enMessages.sop.detailPage.approvalStatus = "Approval & Status";
enMessages.sop.detailPage.approvedBy = "Approved by";
enMessages.sop.detailPage.youAcknowledged = "You acknowledged";
enMessages.sop.detailPage.sopContent = "SOP Content";
enMessages.sop.detailPage.readBeforeAcknowledging = "Read and understand this procedure before acknowledging";

slMessages.sop = slMessages.sop || {};
slMessages.sop.detailPage = slMessages.sop.detailPage || {};
slMessages.sop.detailPage.backToSOPs = "Nazaj na SOP-e";
slMessages.sop.detailPage.downloadPDF = "Prenesi PDF";
slMessages.sop.detailPage.sopInformation = "Informacije o SOP";
slMessages.sop.detailPage.title = "Naslov";
slMessages.sop.detailPage.category = "Kategorija";
slMessages.sop.detailPage.version = "Verzija";
slMessages.sop.detailPage.approvalStatus = "Odobritev in status";
slMessages.sop.detailPage.approvedBy = "Odobril";
slMessages.sop.detailPage.youAcknowledged = "Potrdili ste";
slMessages.sop.detailPage.sopContent = "Vsebina SOP";
slMessages.sop.detailPage.readBeforeAcknowledging = "Preberite in razumejte ta postopek pred potrditvijo";

// SOP categories - English
enMessages.sop.category = enMessages.sop.category || {};
enMessages.sop.category.EQUIPMENT = "Equipment";
enMessages.sop.category.PERSONNEL = "Personnel";
enMessages.sop.category.PRODUCTION = "Production";
enMessages.sop.category.MATERIAL = "Material";
enMessages.sop.category.QUALITY = "Quality";
enMessages.sop.category.DOCUMENTATION = "Documentation";
enMessages.sop.category.RISK_MANAGEMENT = "Risk Management";
enMessages.sop.category.OTHER = "Other";

// SOP categories - Slovenian
slMessages.sop.category = slMessages.sop.category || {};
slMessages.sop.category.EQUIPMENT = "Oprema";
slMessages.sop.category.PERSONNEL = "Osebje";
slMessages.sop.category.PRODUCTION = "Proizvodnja";
slMessages.sop.category.MATERIAL = "Material";
slMessages.sop.category.QUALITY = "Kakovost";
slMessages.sop.category.DOCUMENTATION = "Dokumentacija";
slMessages.sop.category.RISK_MANAGEMENT = "Upravljanje tveganj";
slMessages.sop.category.OTHER = "Drugo";

// Settings page - SOP section translations
enMessages.settings = enMessages.settings || {};
enMessages.settings.sopSection = "Standard Operating Procedures";
enMessages.settings.sopSectionDesc = "Create and manage SOPs for EU MDR compliance with versioning and approval workflows";
enMessages.settings.goToSOPs = "Go to SOPs";
enMessages.settings.currentPage = "Current Page";

slMessages.settings = slMessages.settings || {};
slMessages.settings.sopSection = "Standardni operativni postopki";
slMessages.settings.sopSectionDesc = "Ustvarjajte in upravljajte SOP-e za skladnost z EU MDR z verzioniranjem in potekom odobritev";
slMessages.settings.goToSOPs = "Pojdi na SOP-e";
slMessages.settings.currentPage = "Trenutna stran";

// Settings bank account type translations
enMessages.settings.bankAccount = enMessages.settings.bankAccount || {};
enMessages.settings.bankAccount.type = "Type";
enMessages.settings.bankAccount.actions = "Actions";

slMessages.settings.bankAccount = slMessages.settings.bankAccount || {};
slMessages.settings.bankAccount.type = "Tip";
slMessages.settings.bankAccount.actions = "Akcije";

// Write updated translations
fs.writeFileSync(enPath, JSON.stringify(enMessages, null, 2), 'utf8');
fs.writeFileSync(slPath, JSON.stringify(slMessages, null, 2), 'utf8');

console.log('\n✅ Successfully fixed worksheet terminology and added remaining translations!');
console.log(`\nChanges made:`);
console.log(`  - "delovni list" → "delovni nalog" (everywhere in Slovenian)`);
console.log(`  - Dashboard: "Ustvari delovni list" → "Izdaj delovni nalog"`);
console.log(`  - Navigation: "Delovni listi" → "Delovni nalogi"`);
console.log(`  - Added sign-out dialog translations`);
console.log(`  - Added staff portal page translations`);
console.log(`  - Added SOP detail page translations`);
console.log(`  - Added SOP category translations`);
console.log(`  - Added settings page SOP section translations`);
console.log(`\nBoth EN and SL translation files have been updated.\n`);
