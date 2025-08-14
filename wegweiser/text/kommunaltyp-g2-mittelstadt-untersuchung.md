# Wegweiser Kommune API - Kommunaltyp & G2.2 Mittelstadt Untersuchung

**Datum:** 2025-08-13  
**Untersuchung:** Kommunaltyp-Daten und "G2.2 Mittelstadt, stabil" Klassifikation  
**API-Quelle:** Bertelsmann Stiftung Wegweiser Kommune Data API  
**Status:** ✅ Abgeschlossen

## 🎯 Untersuchungsauftrag

Analyse der Wegweiser Kommune API nach verfügbaren Daten zu:
1. **Kommunaltyp-Klassifikationen** (administrative Verwaltungstypen)
2. **"G2.2 Mittelstadt, stabil"** Klassifikation (spezifische demografische Kategorie)

## 📊 Kommunaltyp-Daten: Vollständig verfügbar

### API-Endpunkte
- ✅ `/rest/region/list` - Alle deutschen Verwaltungsregionen
- ✅ `/rest/region/get/{friendlyUrl}` - Spezifische Region mit Details
- ✅ `/rest/region/filter` - Filterung nach Kommunaltyp

### Verfügbare Kommunaltypen
| Kommunaltyp | Anzahl | Anteil | Beschreibung |
|-------------|--------|--------|--------------|
| **GEMEINDE** | 2.997 | 87.9% | Städte und Gemeinden |
| **LANDKREIS** | 294 | 8.6% | Kreisebene |
| **KREISFREIE_STADT** | 106 | 3.1% | Kreisfreie Städte |
| **BUNDESLAND** | 16 | 0.4% | Länderebene |
| **Gesamt** | **3.413** | 100% | Alle deutschen Verwaltungseinheiten |

### Datenstruktur Kommunaltyp
```json
{
  "id": 123456,
  "name": "Beispielstadt",
  "ags": "05315000",
  "ars": "053150000000",
  "type": "KREISFREIE_STADT",
  "bundesland": "Nordrhein-Westfalen",
  "demographicType": 7
}
```

## 🔍 G2.2 Mittelstadt-Suche: Ergebnis

### ❌ Direkte Bezeichnung nicht gefunden
Die API verwendet **NICHT** die Klassifikation "G2.2 Mittelstadt, stabil". Diese Bezeichnung existiert nicht in:
- Demografietyp-Namen (`/rest/demographicTypes`)
- Suggest-API (`/rest/suggest/demographicType`)
- Regionsbeschreibungen
- Themen oder Indikatoren

### ✅ Alternatives Demografietyp-System (Typ 1-11)

Die Wegweiser Kommune API verwendet ein modernes **11-Kategorien-System** statt der gesuchten G2.2-Klassifikation:

| Typ | Bezeichnung | Relevanz für Mittelstadt |
|-----|-------------|--------------------------|
| **Typ 1** | Stark schrumpfende und alternde Gemeinden in strukturschwachen Regionen | ❌ |
| **Typ 2** | Alternde Städte und Gemeinden mit sozioökonomischen Herausforderungen | ❌ |
| **Typ 3** | **Kleine und mittlere Gemeinden** mit moderater Alterung und Schrumpfung | ⚠️ |
| **Typ 4** | **Stabile Städte und Gemeinden** in ländlichen Regionen | ✅ |
| **Typ 5** | Moderat wachsende Städte und Gemeinden mit regionaler Bedeutung | ⚠️ |
| **Typ 6** | Städte/Wirtschaftsstandorte mit sozioökonomischen Herausforderungen | ❌ |
| **Typ 7** | Großstädte und Hochschulstandorte mit heterogener sozioökonomischer Dynamik | ❌ |
| **Typ 8** | Wohlhabende Städte und Gemeinden in wirtschaftlich dynamischen Regionen | ❌ |
| **Typ 9** | Wachsende familiengeprägte ländliche Städte und Gemeinden | ❌ |
| **Typ 10** | Wohlhabende Städte und Gemeinden im Umfeld von Wirtschaftszentren | ❌ |
| **Typ 11** | Sehr wohlhabende Städte und Gemeinden in Regionen der Wissensgesellschaft | ❌ |

## 🎯 Empfohlene Entsprechung: Demografietyp 4

### Warum Typ 4 als G2.2-Ersatz?

**Demografietyp 4: "Stabile Städte und Gemeinden in ländlichen Regionen"**

✅ **Übereinstimmungen:**
- Enthält **"stabile"** Charakterisierung (→ "stabil")
- Bezieht sich auf **"Städte"** (→ könnte Mittelstädte einschließen)
- Ländlicher Fokus passt zu klassischen Mittelstädten
- Numerisch mittlere Position (Typ 4 von 11)

⚠️ **Unterschiede:**
- Kein expliziter "Mittelstadt"-Bezug
- Ländlicher statt urbaner Fokus
- Keine G2.2-Kodierung

### Verfügbare Typ 4-Ressourcen

```bash
# API-Endpunkte für Demografietyp 4
GET /rest/demographicTypes/4
GET /rest/export/bevoelkerung+kommunen-im-demografietyp-4+2023+tabelle.xlsx

# Dokumentation
PDF: /documents/20125/132144/Typ+4.pdf/8759ee19-b579-cf2c-430e-e40a3ded6632
```

## 📋 Alternative Kandidaten

### Typ 3: "Kleine und mittlere Gemeinden"
- ✅ Explizite **"mittlere"** Bezeichnung
- ❌ Fokus auf "Schrumpfung" statt "Stabilität"
- ⚠️ Gemeinden vs. Städte

### Typ 5: "Moderat wachsende Städte mit regionaler Bedeutung"  
- ✅ **"Städte"** mit regionaler Bedeutung
- ✅ Moderates Wachstum (könnte Stabilität implizieren)
- ❌ Keine direkte Stabilitäts-Charakterisierung

## 🔧 Technische Implementation

### Datenextraktion für Typ 4
```python
# Demografietyp 4-Daten laden
import requests

base_url = "https://www.wegweiser-kommune.de/data-api"

# 1. Demografietyp-Details
response = requests.get(f"{base_url}/rest/demographicTypes/4")
typ4_details = response.json()

# 2. Alle Kommunen vom Typ 4
regions_url = typ4_details['regionsFile']
# -> Excel-Download mit allen Typ 4-Kommunen

# 3. Filterung nach Typ 4
filter_request = {
    "demographicTypes": [4],
    "regionTypes": ["GEMEINDE", "KREISFREIE_STADT"]  # Nur Städte
}
response = requests.post(f"{base_url}/rest/region/filter", json=filter_request)
typ4_regions = response.json()
```

### Datenbankintegration
```sql
-- knot-dots Container-Modell
INSERT INTO containers (payload_type, payload) VALUES 
('administrative_unit', JSON_OBJECT(
    'title', region.name,
    'ags', region.ags,
    'kommunaltyp', region.type,
    'demographicType', 4,  -- Typ 4 als G2.2-Ersatz
    'demographicTypeLabel', 'Stabile Städte und Gemeinden in ländlichen Regionen',
    'mittelstadt_equivalent', true  -- Flag für G2.2-Entsprechung
));
```

## 📈 Datenvolumen Typ 4

### Geschätzte Mengen
- **Kommunen Typ 4:** ~200-400 Einträge (basierend auf 11-Typen-Verteilung)
- **Geodaten:** Polygone für alle Typ 4-Kommunen verfügbar
- **Zeitreihen:** Demografische Indikatoren 2000-2020+
- **Prognosen:** Bevölkerungsentwicklung bis 2040

## 🎯 Fazit & Empfehlungen

### ✅ Kommunaltyp-Daten: Vollständig verfügbar
- Alle deutschen Verwaltungseinheiten klassifiziert
- API-Integration problemlos möglich
- Standardisierte AGS/ARS-Codes verfügbar

### ⚠️ G2.2 Mittelstadt: Nicht direkt verfügbar

**Situation:**
- "G2.2 Mittelstadt, stabil" existiert nicht in der aktuellen API
- Möglicherweise veraltete oder andere Datenquellen-Bezeichnung
- API verwendet modernes 11-Typen-Demografiesystem

**Empfohlene Lösung:**
1. **Demografietyp 4** als beste Entsprechung verwenden
2. Zusätzliche Filterung nach Bevölkerungsgröße (z.B. 20.000-100.000 Einwohner)
3. Dokumentation der Mapping-Entscheidung

### 🚀 Nächste Schritte

1. **Typ 4-Daten extrahieren** 
   - Excel-Download aller Typ 4-Kommunen
   - PDF-Dokumentation analysieren
   
2. **Bevölkerungsfilter anwenden**
   - Kombination Typ 4 + Größenfilter für echte "Mittelstädte"
   
3. **Validierung mit externen Quellen**
   - Abgleich mit anderen Mittelstadt-Definitionen
   - Plausibilitätsprüfung der Klassifikation

4. **knot-dots Integration**
   - Container-Import für Typ 4-Kommunen
   - Flag "mittelstadt_equivalent" setzen

---

**Technische Details:** Alle Untersuchungsergebnisse in `/wegweiser/data/demographic_types_20250813_164156.json`  
**Extraktionsskript:** `/wegweiser/investigate_demographic_types.py`