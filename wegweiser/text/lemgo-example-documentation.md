# Lemgo Bevölkerungsdaten - knot-dots Integration Beispiel

**Erstellt:** 2025-08-08  
**Datenquelle:** Wegweiser Kommune API (Bertelsmann Stiftung)  
**Region:** Lemgo, Nordrhein-Westfalen (AGS: 05766044)

## 📊 Datensatz-Übersicht

### Basis-Informationen
- **Indikator:** Einwohnerzahl Lemgo
- **Zeitraum:** 2006 - 2023 (18 Jahre)
- **Datenpunkte:** 18 jährliche Messungen
- **Format:** knot-dots kompatibles JSON

### Bevölkerungsentwicklung
- **Start (2006):** 41.958 Einwohner
- **Ende (2023):** 40.531 Einwohner  
- **Veränderung:** -1.427 Einwohner (-3,40%)
- **Maximum:** 41.958 Einwohner (2006)
- **Minimum:** 40.345 Einwohner (2021)

## 🗂️ knot-dots Datenstruktur

### Vollständiger Datensatz
```json
{
  "aiSuggestion": false,
  "audience": ["audience.citizens"],
  "category": ["sdg.11"],
  "title": "Einwohnerzahl Lemgo",
  "description": "Gesamtbevölkerung von Lemgo am 31.12. des jeweiligen Jahres. Datenquelle: Wegweiser Kommune (Bertelsmann Stiftung)",
  "topic": ["topic.demographics"],
  "visibility": "public",
  "historicalValues": [
    [2006, 41958],
    [2007, 41867],
    [2008, 41811],
    [2009, 41619],
    [2010, 41424],
    [2011, 40949],
    [2012, 40808],
    [2013, 40717],
    [2014, 40709],
    [2015, 41276],
    [2016, 41087],
    [2017, 40871],
    [2018, 40696],
    [2019, 40619],
    [2020, 40456],
    [2021, 40345],
    [2022, 40594],
    [2023, 40531]
  ],
  "indicatorCategory": ["indicator_category.custom"],
  "indicatorType": ["indicator_type.key"],
  "measureType": [],
  "quantity": "wegweiser.bevoelkerung.05766044",
  "type": "indicator",
  "unit": "unit.count",
  "source": "Wegweiser Kommune (Bertelsmann Stiftung)",
  "regionAgs": "05766044",
  "regionName": "Lemgo",
  "regionType": "GEMEINDE"
}
```

## 🔄 Mapping-Demonstration

### Wegweiser Kommune → knot-dots Transformation

| Aspekt | Wegweiser Format | knot-dots Format | Transformation |
|--------|------------------|------------------|----------------|
| **Titel** | `name: "Bevölkerung"` | `title: "Einwohnerzahl Lemgo"` | Erweitert um Regionsname |
| **Beschreibung** | `explanation: "Gesamtbevölkerung am 31.12..."` | `description: "..."` | Erweitert um Quelle |
| **Zeitreihen** | `years: [2006,...]` + `regionYearValues: [[41958,...]]` | `historicalValues: [[2006,41958],...]` | Matrix → Tupel-Array |
| **Themen** | `topics: ["Demografische Entwicklung"]` | `topic: ["topic.demographics"]` | Normalisiert |
| **SDGs** | Nicht vorhanden | `category: ["sdg.11"]` | Abgeleitet von Thema |
| **Einheit** | `unit: "Anzahl"` | `unit: "unit.count"` | Normalisiert |
| **ID** | `friendlyUrl: "bevoelkerung"` | `quantity: "wegweiser.bevoelkerung.05766044"` | Eindeutige Kennung |

## 📈 Datenanalyse

### Bevölkerungstrends
- **Langfristtrend:** Rückläufig (-84 Einw./Jahr Ø)
- **Stärkster Rückgang:** 2011 (-475 Einwohner) 
- **Größter Zuwachs:** 2015 (+567 Einwohner)
- **COVID-19 Einfluss:** 2020-2021 weitere Rückgänge
- **Jüngste Erholung:** 2022 leichter Anstieg

### Statistische Kennwerte
- **Durchschnitt:** 41.019 Einwohner
- **Standardabweichung:** ~550 Einwohner
- **Trend-Richtung:** Negativ (-3,40% über 17 Jahre)
- **Volatilität:** Moderat (größte Schwankung: 1,6k)

## 🎯 Integration in knot-dots

### Als Container
```javascript
{
  guid: "lemgo-population-2006-2023",
  organization: "wegweiser-kommune", 
  payloadType: "indicator",
  revision: 1,
  payload: { /* Datensatz wie oben */ }
}
```

### Mögliche Visualisierungen
1. **Liniendiagramm:** Bevölkerungsentwicklung 2006-2023
2. **Balkendiagramm:** Jährliche Veränderungen  
3. **Trendanalyse:** Prognose basierend auf historischen Daten
4. **Vergleich:** Mit anderen Kommunen ähnlicher Größe

### Typische Abfragen
```javascript
// Aktueller Wert
getCurrentValue("wegweiser.bevoelkerung.05766044") // → 40,531

// Historischer Verlauf
getHistoricalValues("wegweiser.bevoelkerung.05766044", 2010, 2023)

// Trend-Berechnung  
calculateTrend("wegweiser.bevoelkerung.05766044", 5) // Letzten 5 Jahre
```

## 📋 Verwendung als Template

### Für andere Kommunen
```javascript
const template = {
  title: `Einwohnerzahl ${regionName}`,
  quantity: `wegweiser.bevoelkerung.${regionAgs}`,
  regionAgs: regionAgs,
  regionName: regionName,
  // ... Rest bleibt gleich
};
```

### Für andere Indikatoren
```javascript
// Beispiel: Arbeitslosigkeit
const unemploymentTemplate = {
  title: `Arbeitslosenquote ${regionName}`,
  quantity: `wegweiser.arbeitslosigkeit.${regionAgs}`,
  unit: "unit.percent",
  topic: ["topic.economy", "topic.employment"],
  category: ["sdg.08"], // Decent Work and Economic Growth
  // ...
};
```

## 🔗 Dateien

- **Datensatz:** `knowledge/lemgo-population-example.json`
- **Analyse-Script:** `knowledge/lemgo-analysis.py`
- **Dokumentation:** `knowledge/lemgo-example-documentation.md`

## 🚀 Nächste Schritte

1. **Import-Script testen:** Datensatz in lokale knot-dots Instanz importieren
2. **Mapping erweitern:** Weitere Indikatoren für Lemgo hinzufügen
3. **Batch-Import:** Mehrere Kommunen gleichzeitig verarbeiten
4. **UI-Integration:** Anzeige in knot-dots Frontend testen

---

**Fazit:** Dieser Beispieldatensatz demonstriert erfolgreich die Integration von Wegweiser Kommune Daten in das knot-dots Format und zeigt das Potenzial für umfassende demografische Analysen auf kommunaler Ebene.