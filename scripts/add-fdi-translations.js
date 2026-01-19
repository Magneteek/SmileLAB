#!/usr/bin/env node

/**
 * Add FDI Teeth Selector Translations
 *
 * Adds comprehensive translations for the FDI teeth selector including:
 * - Jaw names (Upper/Lower)
 * - All 52 tooth names (32 permanent + 20 primary)
 * - Work types (Crown, Bridge, Filling, etc.)
 */

const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, '../messages/en.json');
const slPath = path.join(__dirname, '../messages/sl.json');

// Load existing translations
const enMessages = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const slMessages = JSON.parse(fs.readFileSync(slPath, 'utf8'));

// FDI Teeth Selector Translations
const fdiTranslationsEn = {
  fdi: {
    // Jaw names
    upperJaw: "Upper Jaw (Maxilla)",
    lowerJaw: "Lower Jaw (Mandible)",

    // Work types
    workTypes: {
      CROWN: "Crown",
      BRIDGE: "Bridge",
      FILLING: "Filling",
      IMPLANT: "Implant",
      DENTURE: "Denture",
      INLAY: "Inlay",
      ONLAY: "Onlay",
      VENEER: "Veneer",
      SPLINT: "Splint",
      PROVISIONAL: "Provisional",
      TEMPLATE: "Template"
    },

    // Permanent teeth (11-48)
    teeth: {
      // Upper Right (Quadrant 1: 11-18)
      "11": "Upper Right Central Incisor",
      "12": "Upper Right Lateral Incisor",
      "13": "Upper Right Canine",
      "14": "Upper Right First Premolar",
      "15": "Upper Right Second Premolar",
      "16": "Upper Right First Molar",
      "17": "Upper Right Second Molar",
      "18": "Upper Right Third Molar",

      // Upper Left (Quadrant 2: 21-28)
      "21": "Upper Left Central Incisor",
      "22": "Upper Left Lateral Incisor",
      "23": "Upper Left Canine",
      "24": "Upper Left First Premolar",
      "25": "Upper Left Second Premolar",
      "26": "Upper Left First Molar",
      "27": "Upper Left Second Molar",
      "28": "Upper Left Third Molar",

      // Lower Left (Quadrant 3: 31-38)
      "31": "Lower Left Central Incisor",
      "32": "Lower Left Lateral Incisor",
      "33": "Lower Left Canine",
      "34": "Lower Left First Premolar",
      "35": "Lower Left Second Premolar",
      "36": "Lower Left First Molar",
      "37": "Lower Left Second Molar",
      "38": "Lower Left Third Molar",

      // Lower Right (Quadrant 4: 41-48)
      "41": "Lower Right Central Incisor",
      "42": "Lower Right Lateral Incisor",
      "43": "Lower Right Canine",
      "44": "Lower Right First Premolar",
      "45": "Lower Right Second Premolar",
      "46": "Lower Right First Molar",
      "47": "Lower Right Second Molar",
      "48": "Lower Right Third Molar",

      // Primary teeth (51-85)
      // Upper Right (Quadrant 5: 51-55)
      "51": "Upper Right Primary Central Incisor",
      "52": "Upper Right Primary Lateral Incisor",
      "53": "Upper Right Primary Canine",
      "54": "Upper Right Primary First Molar",
      "55": "Upper Right Primary Second Molar",

      // Upper Left (Quadrant 6: 61-65)
      "61": "Upper Left Primary Central Incisor",
      "62": "Upper Left Primary Lateral Incisor",
      "63": "Upper Left Primary Canine",
      "64": "Upper Left Primary First Molar",
      "65": "Upper Left Primary Second Molar",

      // Lower Left (Quadrant 7: 71-75)
      "71": "Lower Left Primary Central Incisor",
      "72": "Lower Left Primary Lateral Incisor",
      "73": "Lower Left Primary Canine",
      "74": "Lower Left Primary First Molar",
      "75": "Lower Left Primary Second Molar",

      // Lower Right (Quadrant 8: 81-85)
      "81": "Lower Right Primary Central Incisor",
      "82": "Lower Right Primary Lateral Incisor",
      "83": "Lower Right Primary Canine",
      "84": "Lower Right Primary First Molar",
      "85": "Lower Right Primary Second Molar"
    },

    // UI labels
    selectWorkType: "Select work type",
    selectedTeeth: "Selected Teeth",
    clickToSelect: "Click teeth to select",
    shiftClickRange: "Shift+click to select range",
    noTeethSelected: "No teeth selected"
  },

  // Worksheet specific
  worksheet: {
    selectedTeethInfo: "Selected Teeth ({count})",
    fdiNotation: "FDI Notation",
    workType: "Work Type",
    teethSelection: "Teeth Selection",

    // History
    history: "History",
    editHistory: "Edit History",
    auditTrail: "Complete audit trail of all changes ({count} entries)",
    statusChange: "STATUS CHANGE",
    statusChangedFrom: "Status changed from",
    statusChangedTo: "to",
    notes: "Notes:",
    worksheetCreated: "Worksheet created",
    created: "CREATE"
  },

  // Quality Control
  qualityControl: {
    inspectionTitle: "Quality Control Inspection - {worksheetNumber}",
    reviewAndApprove: "Review and approve worksheet before invoicing",
    teeth: "Teeth",
    fdiNotation: "FDI notation"
  }
};

// Slovenian translations
const fdiTranslationsSl = {
  fdi: {
    // Jaw names
    upperJaw: "Zgornja čeljust (Maksila)",
    lowerJaw: "Spodnja čeljust (Mandibula)",

    // Work types - fixed translations
    workTypes: {
      CROWN: "Krona",
      BRIDGE: "Mostiček",  // Fixed: was "Mostič"
      FILLING: "Polnilo",
      IMPLANT: "Implantat",
      DENTURE: "Proteza",
      INLAY: "Zasek",
      ONLAY: "Nasadek",
      VENEER: "Luska",  // Fixed: was "Luščina"
      SPLINT: "Opornica",
      PROVISIONAL: "Provizorij",
      TEMPLATE: "Predloga"
    },

    // Permanent teeth (11-48)
    teeth: {
      // Upper Right (Kvadrant 1: 11-18)
      "11": "Zgornji desni osrednji sekalec",
      "12": "Zgornji desni stranski sekalec",
      "13": "Zgornji desni podočnik",
      "14": "Zgornji desni prvi meljak",
      "15": "Zgornji desni drugi meljak",
      "16": "Zgornji desni prvi kočnik",
      "17": "Zgornji desni drugi kočnik",
      "18": "Zgornji desni tretji kočnik",

      // Upper Left (Kvadrant 2: 21-28)
      "21": "Zgornji levi osrednji sekalec",
      "22": "Zgornji levi stranski sekalec",
      "23": "Zgornji levi podočnik",
      "24": "Zgornji levi prvi meljak",
      "25": "Zgornji levi drugi meljak",
      "26": "Zgornji levi prvi kočnik",
      "27": "Zgornji levi drugi kočnik",
      "28": "Zgornji levi tretji kočnik",

      // Lower Left (Kvadrant 3: 31-38)
      "31": "Spodnji levi osrednji sekalec",
      "32": "Spodnji levi stranski sekalec",
      "33": "Spodnji levi podočnik",
      "34": "Spodnji levi prvi meljak",
      "35": "Spodnji levi drugi meljak",
      "36": "Spodnji levi prvi kočnik",
      "37": "Spodnji levi drugi kočnik",
      "38": "Spodnji levi tretji kočnik",

      // Lower Right (Kvadrant 4: 41-48)
      "41": "Spodnji desni osrednji sekalec",
      "42": "Spodnji desni stranski sekalec",
      "43": "Spodnji desni podočnik",
      "44": "Spodnji desni prvi meljak",
      "45": "Spodnji desni drugi meljak",
      "46": "Spodnji desni prvi kočnik",
      "47": "Spodnji desni drugi kočnik",
      "48": "Spodnji desni tretji kočnik",

      // Primary teeth (51-85)
      // Upper Right (Kvadrant 5: 51-55)
      "51": "Zgornji desni mlečni osrednji sekalec",
      "52": "Zgornji desni mlečni stranski sekalec",
      "53": "Zgornji desni mlečni podočnik",
      "54": "Zgornji desni mlečni prvi kočnik",
      "55": "Zgornji desni mlečni drugi kočnik",

      // Upper Left (Kvadrant 6: 61-65)
      "61": "Zgornji levi mlečni osrednji sekalec",
      "62": "Zgornji levi mlečni stranski sekalec",
      "63": "Zgornji levi mlečni podočnik",
      "64": "Zgornji levi mlečni prvi kočnik",
      "65": "Zgornji levi mlečni drugi kočnik",

      // Lower Left (Kvadrant 7: 71-75)
      "71": "Spodnji levi mlečni osrednji sekalec",
      "72": "Spodnji levi mlečni stranski sekalec",
      "73": "Spodnji levi mlečni podočnik",
      "74": "Spodnji levi mlečni prvi kočnik",
      "75": "Spodnji levi mlečni drugi kočnik",

      // Lower Right (Kvadrant 8: 81-85)
      "81": "Spodnji desni mlečni osrednji sekalec",
      "82": "Spodnji desni mlečni stranski sekalec",
      "83": "Spodnji desni mlečni podočnik",
      "84": "Spodnji desni mlečni prvi kočnik",
      "85": "Spodnji desni mlečni drugi kočnik"
    },

    // UI labels
    selectWorkType: "Izberi tip dela",
    selectedTeeth: "Izbrani zobje",
    clickToSelect: "Kliknite zobe za izbiro",
    shiftClickRange: "Shift+klik za izbiro območja",
    noTeethSelected: "Ni izbranih zob"
  },

  // Worksheet specific
  worksheet: {
    selectedTeethInfo: "Izbrani zobje ({count})",
    fdiNotation: "FDI notacija",
    workType: "Tip dela",
    teethSelection: "Izbira zob",

    // History
    history: "Zgodovina",
    editHistory: "Zgodovina urejanja",
    auditTrail: "Popolna revizijska sled vseh sprememb ({count} vnosov)",
    statusChange: "SPREMEMBA STATUSA",
    statusChangedFrom: "Status spremenjen iz",
    statusChangedTo: "v",
    notes: "Opombe:",
    worksheetCreated: "Delovni nalog ustvarjen",
    created: "USTVARJENO"
  },

  // Quality Control
  qualityControl: {
    inspectionTitle: "Kontrola kakovosti - {worksheetNumber}",
    reviewAndApprove: "Preglejte in odobrite delovni nalog pred fakturiranjem",
    teeth: "Zobje",
    fdiNotation: "FDI notacija"
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
const updatedEnMessages = deepMerge(enMessages, fdiTranslationsEn);
const updatedSlMessages = deepMerge(slMessages, fdiTranslationsSl);

// Write updated translations
fs.writeFileSync(enPath, JSON.stringify(updatedEnMessages, null, 2), 'utf8');
fs.writeFileSync(slPath, JSON.stringify(updatedSlMessages, null, 2), 'utf8');

console.log('\n✅ Successfully added FDI teeth selector translations!');
console.log(`\nAdded:`);
console.log(`  - Jaw names (Upper/Lower)`);
console.log(`  - 52 tooth names (32 permanent + 20 primary)`);
console.log(`  - Work types (Crown, Bridge, Filling, etc.)`);
console.log(`  - Fixed: "Mostič" → "Mostiček", "Luščina" → "Luska"`);
console.log(`  - Worksheet history translations`);
console.log(`  - Quality control page translations`);
console.log(`\nBoth EN and SL translation files have been updated.\n`);
