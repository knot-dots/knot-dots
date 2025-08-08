# Wegweiser Kommune → knot-dots Integration Plan

**Datum:** 2025-08-08  
**Ziel:** Integration der Wegweiser Kommune Indikatordaten in die knot-dots Datenstruktur

## 📋 Datenstruktur-Analyse

### knot-dots Indikator-Schema

```typescript
// Aus models.ts
const indicatorPayload = basePayload.extend({
  historicalValues: z.array(z.tuple([z.number().int().positive(), z.number()])),
  indicatorCategory: z.array(indicatorCategories),
  indicatorType: z.array(indicatorTypes), 
  measureType: z.array(measureTypes),
  quantity: z.string(),
  type: z.literal("indicator"),
  unit: z.string()
});

// basePayload enthält:
// - aiSuggestion: boolean
// - audience: array 
// - category: array (SDGs)
// - description?: string
// - title: string
// - topic: array
// - visibility: enum
```

### Wegweiser Kommune Indikator-Format

```json
{
  "id": 13,
  "name": "Bevölkerung", 
  "title": "Bevölkerung - Ist-Daten",
  "type": "COMMUNAL_DATA",
  "explanation": "Gesamtbevölkerung am 31.12. des ausgewählten Jahres.",
  "hint": "",
  "calculation": "",
  "source": "Statistische Ämter der Länder", 
  "unit": "Anzahl",
  "decimalPlaces": 0,
  "friendlyUrl": "bevoelkerung",
  "years": [2006, 2007, ..., 2023],
  "minimumRegionType": "KLEINE_GEMEINDE",
  "maximumRegionType": "LANDKREIS", 
  "topLowRegionsAvailable": false,
  "topics": ["Demografische Entwicklung"],
  "colorSchema": "RED_TO_BLUE"
}
```

### Wegweiser Statistikdaten-Format

```json
{
  "indicators": [{
    "id": 13,
    "friendlyUrl": "bevoelkerung",
    "name": "Bevölkerung",
    "unit": "Anzahl", 
    "minValue": 94290.0,
    "maxValue": 102464.0,
    "regionYearValues": [[100664.0]]  // [region][year] values
  }],
  "regions": [{
    "friendlyUrl": "guetersloh-gt",
    "name": "Gütersloh (GT)",
    "id": 1830,
    "ags": "05754008", 
    "type": "GEMEINDE"
  }]
}
```

## 🔄 Mapping-Schema

### Feld-Mappings

| knot-dots Feld | Wegweiser Feld | Transformation | Beispiel |
|----------------|----------------|----------------|----------|
| **title** | `name` | Direct mapping | "Bevölkerung" |
| **description** | `explanation` | Direct mapping | "Gesamtbevölkerung am 31.12..." |
| **unit** | `unit` | Direct mapping | "Anzahl" |
| **historicalValues** | `regionYearValues` + `years` | **Complex transform** | `[[2020, 100664], [2021, 101232]]` |
| **quantity** | `friendlyUrl` | Prefix with "wegweiser." | "wegweiser.bevoelkerung" |
| **topic** | `topics` | Map to knot-dots topics | `["topic.demographics"]` |
| **indicatorCategory** | `type` + logic | Map statistic types | `["indicator_category.custom"]` |
| **indicatorType** | Derived | Based on content | `["indicator_type.key"]` |
| **audience** | Static | Default to citizens | `["audience.citizens"]` |
| **category** | `topics` | Map to SDGs | Map "Demografische Entwicklung" → `["sdg.11"]` |

### Komplexe Transformationen

#### 1. Historical Values Transformation
```javascript
// Wegweiser: separate years array + regionYearValues matrix
// knot-dots: array of [year, value] tuples

function transformHistoricalValues(years, regionYearValues, regionIndex = 0) {
  const values = regionYearValues[regionIndex] || [];
  return years.map((year, index) => [year, values[index] || null])
            .filter(([year, value]) => value !== null);
}
```

#### 2. Topic Mapping
```javascript
const topicMapping = {
  "Demografische Entwicklung": ["topic.demographics"],
  "Beschäftigung / Arbeitsmarkt": ["topic.economy", "topic.employment"],
  "Kinderbetreuung": ["topic.education", "topic.family"],
  "Kommunale Finanzen": ["topic.finance"],
  "Soziale Lage": ["topic.social"],
  "Wirtschaft & Innovation": ["topic.economy", "topic.innovation"],
  // ... weitere Mappings
};
```

#### 3. SDG Mapping  
```javascript
const sdgMapping = {
  "Demografische Entwicklung": ["sdg.11"], // Sustainable Cities
  "Kinderbetreuung": ["sdg.04"],           // Quality Education
  "Wirtschaft & Innovation": ["sdg.08"],   // Decent Work
  "Umwelt": ["sdg.13", "sdg.15"],         // Climate + Life on Land
  // ... weitere Mappings
};
```

## 🏗️ Import-Workflow

### Phase 1: Metadaten-Import
```javascript
// 1. Lade alle Wegweiser Indikatoren
const indicators = await fetchWegweiserIndicators();

// 2. Transform zu knot-dots Format (ohne Daten)
const knotDotsIndicators = indicators.map(transformIndicatorMetadata);

// 3. Erstelle Container in knot-dots DB
for (const indicator of knotDotsIndicators) {
  await createContainer({
    payloadType: 'indicator',
    payload: indicator,
    organization: 'wegweiser-kommune'
  });
}
```

### Phase 2: Zeitreihen-Import (Optional)
```javascript
// Pro Kommune oder Auswahl von Kommunen
async function importRegionData(regionId, indicatorIds) {
  // 1. Lade Statistikdaten für Region
  const data = await fetchWegweiserStatistics(regionId, indicatorIds);
  
  // 2. Transform historical values  
  data.indicators.forEach(async (indicator) => {
    const historicalValues = transformHistoricalValues(
      data.years, 
      indicator.regionYearValues
    );
    
    // 3. Update bestehender knot-dots Indikator
    await updateIndicatorData(indicator.friendlyUrl, {
      historicalValues,
      region: data.regions[0] // Add region context
    });
  });
}
```

### Phase 3: Geodaten-Verknüpfung
```javascript
// Verknüpfe mit bereits extrahierten Geometrien
async function linkGeometries() {
  const geometries = await loadGeoJSON('geometries_gemeinden.geojson');
  
  // Match via AGS codes
  geometries.features.forEach(async (feature) => {
    const ags = feature.properties.ags;
    
    // Update indicators with geographic reference
    await addGeometryReference(ags, {
      type: 'Feature',
      geometry: feature.geometry,
      properties: {
        name: feature.properties.name,
        type: feature.properties.type,
        ags: ags
      }
    });
  });
}
```

## 🎯 Implementierungsplan

### Schritt 1: Mapping-Service erstellen
```typescript
// wegweiser-mapper.ts
export class WegweiserMapper {
  static transformIndicator(wegweiserIndicator: WegweiserIndicator): KnotDotsIndicator {
    return {
      title: wegweiserIndicator.name,
      description: wegweiserIndicator.explanation,
      unit: wegweiserIndicator.unit,
      quantity: `wegweiser.${wegweiserIndicator.friendlyUrl}`,
      topic: this.mapTopics(wegweiserIndicator.topics),
      category: this.mapToSDGs(wegweiserIndicator.topics),
      indicatorCategory: this.mapIndicatorCategory(wegweiserIndicator.type),
      indicatorType: this.deriveIndicatorType(wegweiserIndicator),
      audience: ['audience.citizens'],
      visibility: 'public',
      historicalValues: [], // Initially empty
      aiSuggestion: false,
      type: 'indicator' as const
    };
  }
}
```

### Schritt 2: Import-Service erstellen
```typescript
// wegweiser-importer.ts  
export class WegweiserImporter {
  async importIndicators(organizationId: string) {
    const indicators = await this.wegweiserApi.getIndicators();
    
    for (const indicator of indicators) {
      const mapped = WegweiserMapper.transformIndicator(indicator);
      
      await this.containerService.create({
        payloadType: 'indicator',
        payload: mapped,
        organization: organizationId
      });
    }
  }
  
  async importRegionData(regionAgs: string, indicatorIds: string[]) {
    // Implementation für Zeitreihen-Import
  }
}
```

### Schritt 3: CLI-Tool für Import
```bash
# Import aller Indikator-Metadaten
npm run wegweiser:import:indicators

# Import Zeitreihendaten für spezifische Region  
npm run wegweiser:import:data -- --region=05754008 --indicators=bevoelkerung,einwohnerdichte

# Import mit Geometrie-Verknüpfung
npm run wegweiser:import:full -- --with-geometries
```

## 📊 Datenvolumen & Performance

### Geschätzte Datenmengen
- **Indikatoren**: ~500 Indikatoren → 500 Container
- **Zeitreihen**: ~11.000 Kommunen × 500 Indikatoren × 18 Jahre = ~99M Datenpunkte  
- **Speicherbedarf**: ~2-5 GB für vollständigen Import

### Performance-Optimierungen
- **Batch-Import**: 100 Container pro Transaktion
- **Lazy Loading**: Zeitreihen nur bei Bedarf nachladen
- **Caching**: Mapping-Tabellen im Memory
- **Indexierung**: AGS-Codes für geografische Suche

## 🔧 Konfiguration & Anpassung

### Mapping-Konfiguration
```json
// config/wegweiser-mappings.json
{
  "topics": {
    "Demografische Entwicklung": ["topic.demographics"],
    "Kinderbetreuung": ["topic.education", "topic.family"]
  },
  "sdgs": {
    "Demografische Entwicklung": ["sdg.11"]
  },
  "indicatorTypes": {
    "population": ["indicator_type.key"],
    "financial": ["indicator_type.performance"]
  }
}
```

## 🎯 Nächste Schritte

### Immediate (Diese Woche)
1. ✅ Analyse abgeschlossen
2. 🔄 Mapping-Service implementieren
3. 🔄 Einfachen Metadaten-Import testen

### Short-term (Nächste 2 Wochen)  
1. Vollständiger Indikatoren-Import
2. Basis-Zeitreihen für Testdaten
3. Geometrie-Verknüpfung

### Long-term (1-2 Monate)
1. Performance-Optimierung 
2. Vollständiger Datenimport
3. UI-Integration für Wegweiser-Indikatoren

---

**Fazit**: Die Integration ist technisch gut machbar. Die Hauptherausforderung liegt in der sauberen Transformation der historischen Zeitreihendaten und der effizienten Handhabung der großen Datenmengen.