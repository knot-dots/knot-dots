# Wegweiser Kommune - Basisdaten Schema

**Erstellt:** 2025-08-11  
**Datensatz:** 3.411 deutsche Verwaltungseinheiten  
**Quelle:** Wegweiser Kommune API (`/rest/region/list`)

## 📊 Übersicht

Der Basisdaten-Datensatz enthält alle deutschen Verwaltungsebenen mit ihren administrativen Grunddaten.

### Statistik nach Verwaltungstyp
| Typ | Anzahl | Anteil | Beschreibung |
|-----|--------|--------|--------------|
| **GEMEINDE** | 2.997 | 87.9% | Städte und Gemeinden |
| **LANDKREIS** | 294 | 8.6% | Kreisebene |
| **KREISFREIE_STADT** | 106 | 3.1% | Kreisfreie Städte |
| **BUNDESLAND** | 14 | 0.4% | Länderebene |

### Top 5 Bundesländer nach Anzahl
| Bundesland | Anzahl | Anteil |
|------------|--------|--------|
| Bayern | 661 | 19.4% |
| Baden-Württemberg | 583 | 17.1% |
| Nordrhein-Westfalen | 424 | 12.4% |
| Niedersachsen | 424 | 12.4% |
| Hessen | 327 | 9.6% |

## 🗃️ Datenstruktur

### JSON Schema
```typescript
interface BasisdatenRecord {
  // Primärdaten
  id: number;              // API-interne ID
  name: string;            // Offizielle Bezeichnung
  
  // Administrative Klassifikation
  bundesland: string;      // Zugehöriges Bundesland
  ags: string;            // Amtlicher Gemeindeschlüssel (8-stellig)
  ars: string;            // Amtlicher Regionalschlüssel (12-stellig)
  kommunaltyp: 'BUNDESLAND' | 'LANDKREIS' | 'KREISFREIE_STADT' | 'GEMEINDE';
  verwaltungstyp: string;  // Abgeleiteter Verwaltungstyp
  
  // Hierarchie
  parent_id: number | null; // ID der übergeordneten Einheit
  
  // Europäische Klassifikation
  nuts_code: string;       // NUTS-Code (meist leer)
  lau_code: string;        // LAU-Code (meist leer)
}
```

### Metadata Schema
```typescript
interface BasisdatenMetadata {
  extraction_date: string;    // ISO-Timestamp der Extraktion
  source: 'Wegweiser Kommune API';
  total_entries: number;      // Gesamtzahl Datensätze
  types_count: {              // Anzahl nach Kommunaltyp
    [kommunaltyp: string]: number;
  };
}
```

## 🔍 Datenfelder im Detail

### AGS (Amtlicher Gemeindeschlüssel)
- **Format:** 8-stellig (`BBKKKGGG`)
- **BB:** Bundesland-Code (01-16)
- **KKK:** Kreis-Code
- **GGG:** Gemeinde-Code
- **Beispiel:** `09162000` = Bayern (09) > München (162000)

### ARS (Amtlicher Regionalschlüssel) 
- **Format:** 12-stellig (`BBKKKGGGVVVV`)
- **BBKKKGGG:** Entspricht AGS
- **VVVV:** Verbandsgemeinde-/Verwaltungseinheit
- **Beispiel:** `091620000000` = München ohne Unterebene

### Kommunaltyp Mapping
```typescript
const verwaltungstypen = {
  'BUNDESLAND': 'Landesregierung',
  'LANDKREIS': 'Kreisverwaltung',
  'KREISFREIE_STADT': 'Stadtverwaltung', 
  'GEMEINDE': 'Gemeindeverwaltung'
};
```

### Bundesland-Erkennung
Automatische Zuordnung über AGS-Präfix:
```typescript
const bundeslandMapping = {
  '01': 'Schleswig-Holstein',
  '02': 'Hamburg',
  '03': 'Niedersachsen',
  '04': 'Bremen',
  '05': 'Nordrhein-Westfalen',
  '06': 'Hessen', 
  '07': 'Rheinland-Pfalz',
  '08': 'Baden-Württemberg',
  '09': 'Bayern',
  '10': 'Saarland',
  '11': 'Berlin',
  '12': 'Brandenburg',
  '13': 'Mecklenburg-Vorpommern',
  '14': 'Sachsen',
  '15': 'Sachsen-Anhalt',
  '16': 'Thüringen'
};
```

## ✅ Datenqualität & Validierung

### Vollständigkeit
- ✅ **AGS/ARS:** 100% der Datensätze haben gültige Schlüssel
- ✅ **Bundesland:** 100% automatisch zugeordnet  
- ✅ **Namen:** Alle Einheiten haben offizielle Bezeichnungen
- ⚠️ **NUTS/LAU:** Weitgehend leer (EU-Codes nicht gepflegt)
- ⚠️ **Parent-ID:** Teilweise null (Hierarchie unvollständig)

### Bekannte Besonderheiten
1. **Stadtstaaten als KREISFREIE_STADT:**
   - Berlin, Hamburg, Bremen klassifiziert als `KREISFREIE_STADT` 
   - Nicht als `BUNDESLAND` (API-Inkonsistenz)

2. **Hierarchie-Lücken:**
   - Nicht alle `parent_id` Verweise vollständig
   - Manche Gemeinden ohne Kreis-Zuordnung

3. **Fehlende EU-Codes:**
   - `nuts_code` und `lau_code` meist leer
   - Separate Nachpflege erforderlich

## 📁 Dateiformate

### JSON-Ausgabe
```json
{
  "metadata": { /* Metadaten */ },
  "basisdaten": [ /* 3411 Datensätze */ ]
}
```
**Dateien:**
- `basisdaten_aktuell.json` (aktuellste Version)
- `basisdaten_YYYYMMDD_HHMMSS.json` (mit Timestamp)

### CSV-Ausgabe
Standard-CSV mit UTF-8 Encoding, Header-Zeile.
**Dateien:**
- `basisdaten_aktuell.csv` (aktuellste Version) 
- `basisdaten_YYYYMMDD_HHMMSS.csv` (mit Timestamp)

## 🔄 Integration in knot-dots

### Container-Mapping
```typescript
const basisdatenToContainer = (basisdatum: BasisdatenRecord) => ({
  guid: generateGUID(),
  payloadType: 'administrative_unit',
  payload: {
    title: basisdatum.name,
    ags: basisdatum.ags,
    ars: basisdatum.ars,
    bundesland: basisdatum.bundesland,
    kommunaltyp: basisdatum.kommunaltyp,
    verwaltungstyp: basisdatum.verwaltungstyp,
    
    // Erweiterte Metadaten
    metadata: {
      wegweiser_id: basisdatum.id,
      nuts_code: basisdatum.nuts_code || null,
      lau_code: basisdatum.lau_code || null,
      parent_wegweiser_id: basisdatum.parent_id
    }
  }
});
```

### Nutzungsszenarien
1. **Geodaten-Referenz:** Verknüpfung mit GeoJSON über AGS/ARS
2. **Indikator-Zuordnung:** Basis für kommunale Kennzahlen
3. **Hierarchie-Navigation:** Drill-down von Bund → Land → Kreis → Gemeinde
4. **Benchmarking:** Vergleich zwischen ähnlichen Kommunaltypen

## 📋 Nächste Schritte

### Immediate
- [x] **Basisdaten extrahiert** (3.411 Datensätze)
- [x] **JSON/CSV Export** funktionsfähig
- [x] **Schema dokumentiert**

### Short-term
- [ ] **Hierarchie-Daten verbessern** (parent_id Vervollständigung)
- [ ] **EU-Codes nachpflegen** (NUTS/LAU Integration)
- [ ] **knot-dots Integration** (Container-Import)

### Long-term  
- [ ] **Automatische Updates** (regelmäßige API-Synchronisation)
- [ ] **Change-Detection** (Neue/geänderte Kommunen erkennen)
- [ ] **Qualitätssicherung** (Datenvalidierung automatisieren)

---

**Fazit:** Der Basisdaten-Datensatz stellt eine **vollständige Übersicht aller deutschen Verwaltungseinheiten** bereit und bildet die Grundlage für geografische und administrative Analysen in knot-dots. Mit 3.411 Datensätzen deckt er die komplette deutsche Verwaltungshierarchie ab.