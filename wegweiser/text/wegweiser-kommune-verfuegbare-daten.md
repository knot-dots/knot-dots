# Wegweiser Kommune API - Verfügbare Daten Übersicht

**Datum:** 2025-08-08  
**Quelle:** Bertelsmann Stiftung Wegweiser Kommune Data API  
**API-Version:** OpenAPI 3.0.3  
**Base-URL:** `https://www.wegweiser-kommune.de/data-api`

## 🗺️ Geodaten (bereits extrahiert)

### Administrative Geometrien
- ✅ **Bundesländer** (16) - `geometries_bundeslaender.geojson`
- ✅ **Landkreise** (294) - `geometries_landkreise.geojson`  
- ✅ **Kreisfreie Städte** (106) - `geometries_kreisfreie_staedte.geojson`
- ✅ **Gemeinden** (2.997) - `geometries_gemeinden.geojson`

### Geometrie-Features
- MultiPolygon-Koordinaten in EPSG:4326
- Bounding Boxes für Kartenausschnitte
- Hierarchische Umrisse (outline regions)

## 📊 Statistische Daten

### Statistiktypen (StatisticType)
- **COMMUNAL_DATA** - Kommunale Ist-Daten
- **POPULATION_FORECAST** - Bevölkerungsprognosen
- **CARE_FORECAST** - Pflegeprognosen
- **AGE_MIGRATION** - Altersbedingte Wanderungen
- **GEOGRAPHIC_MIGRATION** - Geografische Wanderungen
- **DEMOGRAPHIC_TYPES** - Demografietypen
- **POPULATION_PYRAMID** - Bevölkerungspyramiden
- **AGE_STRUCTURE** - Altersstruktur
- **AGE_STRUCTURE_FORECAST** - Altersstruktur-Prognosen

### Themen (Topics)
Verfügbar über `/rest/topic/list` und `/rest/topic/sets`:

#### Hauptthemen-Sets
- **Demografische Entwicklung**
- **Soziale Lage**
- **Wirtschaft & Arbeit** 
- **Kommunale Finanzen**
- **Bildung**
- **Gesundheit**
- **Sicherheit**

### Indikatoren (Indicators)
Verfügbar über `/rest/indicator/list`:

#### Demografische Indikatoren
- Geburten (je 1.000 Einwohner:innen)
- Sterbefälle
- Natürlicher Saldo
- Wanderungssaldo
- Bevölkerungsentwicklung
- Altersstruktur (nach Altersgruppen)

#### Soziale Indikatoren
- SGB II-Empfänger
- Kinderarmut
- Altersarmut
- Arbeitslosigkeit
- Langzeitarbeitslosigkeit

#### Wirtschaftsindikatoren
- Beschäftigungsquote
- Einkommensteuer je Einwohner
- Bruttolöhne und -gehälter
- Unternehmensdichte

#### Kommunale Finanzindikatoren
- Schulden der Kernhaushalte
- Kassenkredite
- Steuereinnahmen
- Investitionen

#### Bildungsindikatoren
- Betreuungsquote U3
- Betreuungsquote 3-6 Jahre
- Schulabgänger ohne Hauptschulabschluss
- Hochschulreife

## 🏛️ Verwaltungsstrukturen

### Regionstypen (RegionType)
- **BUND** - Deutschland gesamt
- **BUNDESLAND** - 16 Bundesländer
- **LANDKREIS** - 294 Landkreise
- **KREISFREIE_STADT** - 106 Kreisfreie Städte
- **GEMEINDE** - 2.997 Gemeinden
- **KLEINE_GEMEINDE** - Gemeinden < 5.000 Einwohner

### Demografietypen
9 verschiedene Demografietypen zur Klassifizierung von Kommunen:
- Typ 1: Stabile ländliche Kommunen
- Typ 2: Demografisch alternde Kommunen
- Typ 3-9: Weitere spezifische Typen

### Administrative Codes
- **AGS** - 8-stelliger Amtlicher Gemeindeschlüssel
- **ARS** - 12-stelliger Amtlicher Regionalschlüssel
- Hierarchische Zuordnungen (parent regions)

## 📈 Zeitreihendaten

### Verfügbare Jahrgänge
- **Ist-Daten**: Abhängig von Indikator (meist 2000-2020)
- **Prognosedaten**: Bis 2040
- **Historische Daten**: Teilweise bis 1990er Jahre

### Datenformate
- Jährliche Werte
- Vergleichsjahre für Entwicklungsanalysen
- Mehrjährige Durchschnitte

## 🎯 Filterbare Metadaten

### Bevölkerungsgrößen-Filter
- Bereiche: z.B. "50.000-100.000 Einwohner"
- Einzelwerte
- Dynamische Vorschläge über `/rest/suggest/populationRange`

### Geografische Filter
- Nach Bundesländern
- Nach Landkreisen
- Nach AGS/ARS-Präfixen
- Bounding Box-Filter für Kartenausschnitte

## 📋 Export-Formate

### Verfügbare Formate (ExportFormat)
- **csv** - Kommaseparierte Werte
- **json** - JSON-Format
- **xls** / **xlsx** - Excel-Formate
- **pdf** - PDF-Dokumente
- **png** / **jpg** / **gif** - Bildformate
- **svg** - Vektorgrafiken

### Export-Optionen
- Zeichensatz-Auswahl (UTF-8, ISO-8859-1)
- Download vs. Inline-Anzeige
- Rohdaten ohne Formatierung
- Bildgrößen-Kontrolle (256-2048px)

## 🔍 Such- und Vorschlagsfunktionen

### Autocomplete-Endpoints
- `/rest/suggest/ags` - AGS/ARS-Schlüssel
- `/rest/suggest/demographicType` - Demografietypen
- `/rest/suggest/populationRange` - Bevölkerungsbereiche
- `/rest/suggest/regionType` - Verwaltungstypen

### Suchfunktionen
- Volltext-Suche in Indikatorennamen
- Regionen-Suche nach Namen
- Kombinierte Themen/Indikator-Suche

## 🗓️ Versionierung & Metadaten

### API-Versionierung
- Statistikdaten-Version über `/rest/statistics/version`
- IDs können sich zwischen Versionen ändern
- Friendly URLs bleiben stabil

### Datenquellen
- Statistische Ämter der Länder
- Bundesamt für Kartographie und Geodäsie
- ZEFIR (Zentrum für interdisziplinäre Regionalforschung)
- Weitere spezialisierte Datenquellen

## 🚀 Noch nicht extrahierte Daten

### Statistische Zeitreihen
- Alle Indikatoren mit Jahresdaten
- Bevölkerungsprognosen bis 2040
- Historische Entwicklungsverläufe

### Thematische Datensätze
- Vollständige Themen-Hierarchien
- Indikator-Beschreibungen und Metadaten
- Berechnungsformeln und Einheiten

### Vergleichsdaten
- Kommunen mit höchsten/niedrigsten Werten
- Peer-Group-Vergleiche
- Benchmarking-Daten

### Spezielle Statistiken
- Bevölkerungspyramiden (altersaufgelöst)
- Wanderungsströme zwischen Kommunen
- Demografietyp-Analysen

## 💾 Datenvolumen (Schätzung)

### Bereits extrahiert
- **Geometrien**: ~8 MB (4 GeoJSON-Dateien)

### Verfügbar für Extraktion
- **Statistische Daten**: ~500 MB - 2 GB
- **Themen/Indikatoren-Metadaten**: ~10 MB
- **Zeitreihendaten**: ~1-5 GB
- **Export-Dokumente**: Variable Größe

## 🔧 API-Limits & Nutzung

### Rate Limiting
- Keine expliziten Limits dokumentiert
- Höfliche Nutzung empfohlen (delays zwischen requests)
- Batch-Verarbeitung möglich

### Rechtlicher Rahmen
- Offene API der Bertelsmann Stiftung
- Verwendung für Forschung/Bildung
- Quellenangabe erforderlich

---

**Fazit:** Die Wegweiser Kommune API bietet einen umfassenden Datenschatz zu deutschen Kommunen mit Geometrien, statistischen Zeitreihen, demografischen Analysen und vielfältigen Export-Möglichkeiten. Die bereits extrahierten Geometrien sind nur ein kleiner Teil der verfügbaren Daten.