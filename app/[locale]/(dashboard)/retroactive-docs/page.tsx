'use client';

/**
 * Retroactive Document Generator
 * Admin-only tool for generating Annex XIII PDFs from paper worksheets.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, FileDown, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product { name: string; code: string; quantity: number; teeth: string }
interface Material {
  name: string; code: string; manufacturer: string; lotNumber: string;
  expiryDate: string; quantity: string; unit: string; ceMarking: boolean; biocompatible: boolean;
  productIndex: number | null; // null = general, 0..n = index of product in products[]
  dbMaterialId: string;        // '' = none selected from DB
}
interface Dentist {
  id: string; dentistName: string; clinicName: string; licenseNumber?: string;
  address?: string; city?: string; postalCode?: string; email?: string; phone?: string;
}
interface DbMaterial {
  id: string; name: string; code: string; manufacturer: string; unit: string;
  ceMarking: boolean; biocompatible: boolean;
  lots: { id: string; lotNumber: string; expiryDate: string | null; quantityAvailable: number }[];
}
interface DbProduct { id: string; name: string; code: string }

const emptyProduct = (): Product => ({ name: '', code: '', quantity: 1, teeth: '' });
const emptyMaterial = (): Material => ({
  name: '', code: '', manufacturer: '', lotNumber: '', expiryDate: '',
  quantity: '', unit: 'g', ceMarking: true, biocompatible: true,
  productIndex: null, dbMaterialId: '',
});

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 border-b text-sm font-semibold hover:bg-gray-100 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        {title}
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && <div className="p-5 space-y-4">{children}</div>}
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RetroactiveDocsPage() {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [generating, setGenerating] = useState(false);

  // DB lookups
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [dbMaterials, setDbMaterials] = useState<DbMaterial[]>([]);
  const [dbProducts, setDbProducts] = useState<DbProduct[]>([]);
  const [selectedDentistId, setSelectedDentistId] = useState('');

  // Base fields
  const [worksheetNumber, setWorksheetNumber] = useState('DN-25');
  const [documentDate, setDocumentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [patientName, setPatientName] = useState('');
  const [manufactureDate, setManufactureDate] = useState('');
  const [deviceDescription, setDeviceDescription] = useState('');
  const [intendedUse, setIntendedUse] = useState('Zobna restavracija');

  // Dentist (manual override if not in DB)
  const [dentistName, setDentistName] = useState('');
  const [dentistLicense, setDentistLicense] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [dentistAddress, setDentistAddress] = useState('');
  const [dentistCity, setDentistCity] = useState('');
  const [dentistPostalCode, setDentistPostalCode] = useState('');
  const [dentistEmail, setDentistEmail] = useState('');
  const [dentistPhone, setDentistPhone] = useState('');

  // Products & Materials
  const [products, setProducts] = useState<Product[]>([emptyProduct()]);
  const [materials, setMaterials] = useState<Material[]>([emptyMaterial()]);

  // QC
  const [qcDate, setQcDate] = useState('');
  const [qcInspector, setQcInspector] = useState('');
  const [qcNotes, setQcNotes] = useState('');

  // Generated docs list
  const [generated, setGenerated] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
    fetch('/api/dentists?active=true&limit=200')
      .then((r) => r.json())
      .then((d) => setDentists(d.dentists ?? []));

    fetch('/api/materials?active=true&pageSize=200')
      .then((r) => r.json())
      .then((d) => setDbMaterials(d.data ?? []));

    fetch('/api/products?active=true&limit=200')
      .then((r) => r.json())
      .then((d) => setDbProducts(d.data ?? []));
  }, []);

  // Auto-fill dentist fields from DB selection
  const handleDentistSelect = (id: string) => {
    setSelectedDentistId(id);
    const d = dentists.find((x) => x.id === id);
    if (d) {
      setDentistName(d.dentistName);
      setDentistLicense(d.licenseNumber ?? '');
      setClinicName(d.clinicName);
      setDentistAddress(d.address ?? '');
      setDentistCity(d.city ?? '');
      setDentistPostalCode(d.postalCode ?? '');
      setDentistEmail(d.email ?? '');
      setDentistPhone(d.phone ?? '');
    }
  };

  // Auto-fill product from DB selection
  const handleDbProductSelect = (i: number, productId: string) => {
    const p = dbProducts.find((x) => x.id === productId);
    if (p) {
      setProducts((prev) => prev.map((item, idx) =>
        idx === i ? { ...item, name: p.name, code: p.code } : item
      ));
    }
  };

  // Auto-fill material fields from DB selection, clear LOT
  const handleDbMaterialSelect = (i: number, materialId: string) => {
    const m = dbMaterials.find((x) => x.id === materialId);
    if (m) {
      setMaterials((prev) => prev.map((item, idx) =>
        idx === i ? {
          ...item,
          dbMaterialId: materialId,
          name: m.name, code: m.code, manufacturer: m.manufacturer,
          unit: m.unit, ceMarking: m.ceMarking ?? true, biocompatible: m.biocompatible ?? true,
          lotNumber: '', expiryDate: '',
        } : item
      ));
    } else {
      setMaterials((prev) => prev.map((item, idx) =>
        idx === i ? { ...item, dbMaterialId: '' } : item
      ));
    }
  };

  // Auto-fill LOT fields from DB LOT selection
  const handleLotSelect = (i: number, lotId: string) => {
    const mat = materials[i];
    const dbMat = dbMaterials.find((x) => x.id === mat.dbMaterialId);
    const lot = dbMat?.lots.find((l) => l.id === lotId);
    if (lot) {
      setMaterials((prev) => prev.map((item, idx) =>
        idx === i ? {
          ...item,
          lotNumber: lot.lotNumber,
          expiryDate: lot.expiryDate ? lot.expiryDate.split('T')[0] : '',
        } : item
      ));
    }
  };

  const updateProduct = (i: number, field: keyof Product, value: any) =>
    setProducts((prev) => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));

  const updateMaterial = (i: number, field: keyof Material, value: any) =>
    setMaterials((prev) => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m));

  const handleGenerate = async () => {
    if (!worksheetNumber || !patientName || !manufactureDate || !dentistName || !clinicName) {
      toast({ title: 'Manjkajoči podatki', description: 'Izpolnite vsaj: DN številka, pacient, datum, zobozdravnik, klinika.', variant: 'destructive' });
      return;
    }
    if (products.every((p) => !p.name)) {
      toast({ title: 'Dodajte vsaj en produkt', variant: 'destructive' });
      return;
    }

    const filledProducts = products.filter((p) => p.name);

    setGenerating(true);
    try {
      const res = await fetch('/api/retroactive-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worksheetNumber, documentDate, patientName, manufactureDate, deviceDescription, intendedUse,
          dentistName, dentistLicense, clinicName, dentistAddress, dentistCity,
          dentistPostalCode, dentistEmail, dentistPhone,
          products: filledProducts,
          materials: materials
            .filter((m) => m.name)
            .map((m) => ({
              ...m,
              productName: m.productIndex !== null
                ? (filledProducts[m.productIndex]?.name || 'General')
                : 'General',
            })),
          qcDate: qcDate || null,
          qcInspector: qcInspector || null,
          qcNotes: qcNotes || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Generiranje ni uspelo');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MDR-${worksheetNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      setGenerated((prev) => [worksheetNumber, ...prev]);
      toast({ title: `MDR-${worksheetNumber}.pdf generiran`, description: 'PDF se je preneslo.' });

      // Reset for next entry — keep dentist
      setWorksheetNumber('DN-25');
      setPatientName('');
      setManufactureDate('');
      setDeviceDescription('');
      setProducts([emptyProduct()]);
      setMaterials([emptyMaterial()]);
      setQcDate('');
      setQcNotes('');
    } catch (err: any) {
      toast({ title: 'Napaka', description: err.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const selectClass = 'w-full border rounded-md px-3 py-2 text-sm bg-white';

  // Skip SSR — avoids hydration mismatches from password manager browser extensions
  if (!mounted) return (
    <div className="max-w-3xl mx-auto py-8 px-4 flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold">Generator retrospektivnih dokumentov</h1>
          <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">Samo admin</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Generira Annex XIII PDFe iz papirnih delovnih nalogov.
        </p>
        <div className="flex items-start gap-2 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">Dokumenti se shranijo v <code>documents/annex-xiii/</code> in se prenesejo v brskalnik. Ni vpisa v bazo podatkov.</p>
        </div>
      </div>

      {/* Generated so far */}
      {generated.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {generated.map((n) => (
            <Badge key={n} className="bg-green-100 text-green-700 border-green-200">✓ MDR-{n}</Badge>
          ))}
        </div>
      )}

      {/* 1. Worksheet info */}
      <Section title="1. Delovni nalog">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>DN številka <span className="text-red-500">*</span></Label>
            <Input value={worksheetNumber} onChange={(e) => setWorksheetNumber(e.target.value)} placeholder="DN-25001" />
          </div>
          <div className="space-y-1.5">
            <Label>Datum dokumenta <span className="text-red-500">*</span></Label>
            <Input type="date" value={documentDate} onChange={(e) => setDocumentDate(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Datum izdelave <span className="text-red-500">*</span></Label>
            <Input type="date" value={manufactureDate} onChange={(e) => setManufactureDate(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Ime pacienta <span className="text-red-500">*</span></Label>
          <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Ime Priimek" />
        </div>
        <div className="space-y-1.5">
          <Label>Opis naprave</Label>
          <Textarea value={deviceDescription} onChange={(e) => setDeviceDescription(e.target.value)} placeholder="npr. Cirkonijeva krona zob 16" rows={2} />
        </div>
        <div className="space-y-1.5">
          <Label>Namen uporabe</Label>
          <Input value={intendedUse} onChange={(e) => setIntendedUse(e.target.value)} />
        </div>
      </Section>

      {/* 2. Dentist */}
      <Section title="2. Zobozdravnik">
        <div className="space-y-1.5">
          <Label>Izbor iz baze</Label>
          <select className={selectClass} value={selectedDentistId} onChange={(e) => handleDentistSelect(e.target.value)}>
            <option value="">— izberite ali vnesite ročno —</option>
            {dentists.map((d) => (
              <option key={d.id} value={d.id}>{d.clinicName} — {d.dentistName}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Ime zobozdravnika <span className="text-red-500">*</span></Label>
            <Input value={dentistName} onChange={(e) => setDentistName(e.target.value)} placeholder="Dr. Ime Priimek" />
          </div>
          <div className="space-y-1.5">
            <Label>Licenčna številka</Label>
            <Input value={dentistLicense} onChange={(e) => setDentistLicense(e.target.value)} placeholder="ZS-XXXX" />
          </div>
          <div className="space-y-1.5">
            <Label>Naziv klinike <span className="text-red-500">*</span></Label>
            <Input value={clinicName} onChange={(e) => setClinicName(e.target.value)} placeholder="Zobozdravstvena ordinacija" />
          </div>
          <div className="space-y-1.5">
            <Label>Naslov</Label>
            <Input value={dentistAddress} onChange={(e) => setDentistAddress(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Mesto</Label>
            <Input value={dentistCity} onChange={(e) => setDentistCity(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Poštna številka</Label>
            <Input value={dentistPostalCode} onChange={(e) => setDentistPostalCode(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>E-pošta</Label>
            <Input value={dentistEmail} onChange={(e) => setDentistEmail(e.target.value)} type="email" />
          </div>
          <div className="space-y-1.5">
            <Label>Telefon</Label>
            <Input value={dentistPhone} onChange={(e) => setDentistPhone(e.target.value)} />
          </div>
        </div>
      </Section>

      {/* 3. Products */}
      <Section title="3. Produkti / Storitve">
        <div className="space-y-3">
          {products.map((p, i) => (
            <div key={i} className="p-3 border rounded-lg space-y-2 bg-gray-50/50">
              {/* DB product lookup */}
              {dbProducts.length > 0 && (
                <div className="space-y-1">
                  {i === 0 && <Label className="text-xs text-blue-600">Izberi iz cenika</Label>}
                  {i > 0 && <div className="h-4" />}
                  <select
                    className={selectClass}
                    defaultValue=""
                    onChange={(e) => handleDbProductSelect(i, e.target.value)}
                  >
                    <option value="">— izberi iz cenika ali vpiši ročno —</option>
                    {dbProducts.map((dp) => (
                      <option key={dp.id} value={dp.id}>{dp.name} ({dp.code})</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5 space-y-1">
                  <Label className="text-xs">Ime</Label>
                  <Input value={p.name} onChange={(e) => updateProduct(i, 'name', e.target.value)} placeholder="npr. Cirkonijeva krona" />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Koda</Label>
                  <Input value={p.code} onChange={(e) => updateProduct(i, 'code', e.target.value)} placeholder="ZRK" />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Kol.</Label>
                  <Input type="number" min={1} value={p.quantity} onChange={(e) => updateProduct(i, 'quantity', parseInt(e.target.value))} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Zobje (FDI)</Label>
                  <Input value={p.teeth} onChange={(e) => updateProduct(i, 'teeth', e.target.value)} placeholder="16, 17" />
                </div>
                <div className="col-span-1">
                  <Button type="button" variant="ghost" size="sm" className="w-full text-red-400 hover:text-red-600"
                    onClick={() => setProducts((prev) => prev.filter((_, idx) => idx !== i))}
                    disabled={products.length === 1}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setProducts((prev) => [...prev, emptyProduct()])}>
            <Plus className="h-4 w-4 mr-1" /> Dodaj produkt
          </Button>
        </div>
      </Section>

      {/* 4. Materials */}
      <Section title="4. Materiali + LOT številke">
        <div className="space-y-3">
          {materials.map((m, i) => {
            const dbMat = dbMaterials.find((x) => x.id === m.dbMaterialId);
            const availableLots = dbMat?.lots ?? [];
            const filledProducts = products.filter((p) => p.name);

            return (
              <div key={i} className="p-3 border rounded-lg space-y-2 bg-gray-50/50">
                {/* DB material lookup */}
                {dbMaterials.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs text-blue-600">Izberi iz baze materialov</Label>
                    <select className={selectClass} value={m.dbMaterialId} onChange={(e) => handleDbMaterialSelect(i, e.target.value)}>
                      <option value="">— izberi iz baze ali vpiši ročno —</option>
                      {dbMaterials.map((dm) => (
                        <option key={dm.id} value={dm.id}>{dm.name} — {dm.manufacturer}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* LOT selector (only if DB material selected and has LOTs) */}
                {availableLots.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs text-blue-600">Izberi LOT iz zaloge</Label>
                    <select className={selectClass} defaultValue="" onChange={(e) => handleLotSelect(i, e.target.value)}>
                      <option value="">— izberi LOT ali vpiši ročno —</option>
                      {availableLots.map((lot) => (
                        <option key={lot.id} value={lot.id}>
                          {lot.lotNumber}{lot.expiryDate ? ` (rok: ${lot.expiryDate.split('T')[0]})` : ''} — {lot.quantityAvailable} {m.unit}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Naziv materiala</Label>
                    <Input value={m.name} onChange={(e) => updateMaterial(i, 'name', e.target.value)} placeholder="npr. IPS e.max CAD" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Proizvajalec</Label>
                    <Input value={m.manufacturer} onChange={(e) => updateMaterial(i, 'manufacturer', e.target.value)} placeholder="npr. Ivoclar Vivadent" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">LOT številka</Label>
                    <Input value={m.lotNumber} onChange={(e) => updateMaterial(i, 'lotNumber', e.target.value)} placeholder="LOT-XXXXX" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Datum izteka <span className="text-gray-400 font-normal">(neobvezno)</span></Label>
                    <Input type="date" value={m.expiryDate} onChange={(e) => updateMaterial(i, 'expiryDate', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Količina</Label>
                    <Input value={m.quantity} onChange={(e) => updateMaterial(i, 'quantity', e.target.value)} placeholder="1" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Enota</Label>
                    <Input value={m.unit} onChange={(e) => updateMaterial(i, 'unit', e.target.value)} placeholder="g / kos / ml" />
                  </div>
                </div>

                {/* Product assignment + checkboxes + remove */}
                <div className="flex flex-wrap items-center gap-3">
                  {filledProducts.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-gray-500">Pripiši:</span>
                      <select
                        className="border rounded px-2 py-1 text-xs bg-white"
                        value={m.productIndex ?? ''}
                        onChange={(e) => updateMaterial(i, 'productIndex', e.target.value === '' ? null : parseInt(e.target.value))}
                      >
                        <option value="">Splošno</option>
                        {filledProducts.map((fp, pi) => (
                          <option key={pi} value={pi}>{fp.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input type="checkbox" checked={m.ceMarking} onChange={(e) => updateMaterial(i, 'ceMarking', e.target.checked)} />
                    CE oznaka
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input type="checkbox" checked={m.biocompatible} onChange={(e) => updateMaterial(i, 'biocompatible', e.target.checked)} />
                    Biokompatibilno
                  </label>
                  <Button type="button" variant="ghost" size="sm" className="ml-auto text-red-400 hover:text-red-600 h-7"
                    onClick={() => setMaterials((prev) => prev.filter((_, idx) => idx !== i))}
                    disabled={materials.length === 1}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Odstrani
                  </Button>
                </div>
              </div>
            );
          })}
          <Button type="button" variant="outline" size="sm" onClick={() => setMaterials((prev) => [...prev, emptyMaterial()])}>
            <Plus className="h-4 w-4 mr-1" /> Dodaj material
          </Button>
        </div>
      </Section>

      {/* 5. QC */}
      <Section title="5. Kontrola kakovosti" defaultOpen={false}>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Datum pregleda</Label>
            <Input type="date" value={qcDate} onChange={(e) => setQcDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Pregledovalec</Label>
            <Input value={qcInspector} onChange={(e) => setQcInspector(e.target.value)} placeholder="Ime odgovorne osebe" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Opombe QC</Label>
          <Textarea value={qcNotes} onChange={(e) => setQcNotes(e.target.value)} rows={2} placeholder="Po pregledu odobreno..." />
        </div>
      </Section>

      {/* Generate button */}
      <div className="sticky bottom-4">
        <Button
          type="button"
          size="lg"
          className="w-full shadow-lg"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating
            ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Generiranje...</>
            : <><FileDown className="h-5 w-5 mr-2" /> Generiraj MDR-{worksheetNumber}.pdf</>}
        </Button>
      </div>
    </div>
  );
}
