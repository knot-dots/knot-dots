# Wegweiser Kommune API - Geodatenextraktion Analyse

**Datum:** 2025-08-08  
**Projekt:** knot-dots  
**Zweck:** Extraktion von Bundesländer-Geometrien aus der Wegweiser Kommune API

## Überblick

Die Wegweiser Kommune API der Bertelsmann Stiftung stellt statistische Daten und Geodaten für deutsche Kommunen bereit. Diese Analyse dokumentiert unsere Erkenntnisse zur Extraktion von Bundesländer-Geometrien und identifizierte Dateninkonsistenzen.

## API-Struktur

### Basis-URL
```
https://www.wegweiser-kommune.de/data-api
```

### Relevante Endpoints für Geodaten

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/rest/region/list` | GET | Kommunenmetadaten nach Typ |
| `/rest/map/data` | POST | Geometrien mit Statistikdaten |
| `/rest/map/data/{friendlyUrl}` | GET | Geometrien über Friendly URL |
| `/rest/map/bbox` | POST | Bounding Box Berechnung |

### Regionstypen (RegionType)
- `BUND` - Deutschland gesamt
- `BUNDESLAND` - Bundesländer
- `LANDKREIS` - Landkreise
- `KREISFREIE_STADT` - Kreisfreie Städte
- `GEMEINDE` - Gemeinden
- `KLEINE_GEMEINDE` - Gemeinden < 5.000 Einwohner

### Geometrie-Ebenen (LayerType)
- `STATE` - Bundesland-Ebene
- `DISTRICT` - Landkreis-Ebene  
- `COMMUNE` - Gemeinde-Ebene

## Extraktion der Bundesländer-Geometrien

### Implementierung
Erfolgreich implementiertes Python-Script `extract_bundeslaender.py`:
- Verwendet `requests` für API-Aufrufe
- Extrahiert Metadaten über `/rest/region/list`
- Holt Geometrien über `/rest/map/data` (POST)
- Speichert Ergebnisse als GeoJSON

### Ergebnisse
✅ **Erfolgreich extrahiert:**
- 16 vollständige Bundesländer-Geometrien
- 528 KB GeoJSON-Datei (`bundeslaender.geojson`)
- MultiPolygon-Geometrien in EPSG:4326
- Vollständige Metadaten (Namen, AGS-Codes, IDs)
- Deutschland Bounding Box: `[5.866, 47.270, 15.042, 55.055]`

## ⚠️ Identifizierte Dateninkonsistenzen

### Problem: Inkorrekte Klassifizierung der Stadtstaaten

Die API zeigt **inkonsistente Klassifizierung** der deutschen Stadtstaaten Berlin, Hamburg und Bremen:

#### Korrekt klassifiziert als `BUNDESLAND`:
- ✅ **Bremen, BL** (AGS: 04000000)

#### Inkorrekt klassifiziert als `KREISFREIE_STADT`:
- ❌ **Berlin** (AGS: 11000000) 
- ❌ **Hamburg** (AGS: 02000000)
- ❌ **Bremen** (AGS: 04000000) - *Duplikat!*

### Analyse der Inkonsistenz

1. **Rechtlicher Status:** Berlin, Hamburg und Bremen sind verfassungsrechtlich Bundesländer (Stadtstaaten)
2. **API-Klassifizierung:** Nur Bremen wird korrekt als `BUNDESLAND` geführt
3. **Doppelte Existenz:** Bremen existiert sowohl als "Bremen, BL" (Bundesland) als auch als "Bremen" (Kreisfreie Stadt)
4. **Auswirkungen:** 
   - Bei Abfrage nach `BUNDESLAND`: Nur 14 statt 16 Ergebnisse
   - Bei Abfrage nach `KREISFREIE_STADT`: Berlin, Hamburg, Bremen enthalten

### Validation der Extraktion

```bash
# API-Abfrage BUNDESLAND
curl "https://www.wegweiser-kommune.de/data-api/rest/region/list?types=BUNDESLAND&max=20"
# Ergebnis: 14 Einträge (ohne Berlin, Hamburg)

# API-Abfrage KREISFREIE_STADT  
curl "https://www.wegweiser-kommune.de/data-api/rest/region/list?types=KREISFREIE_STADT&max=100"
# Ergebnis: Enthält Berlin, Hamburg, Bremen
```

## Empfehlungen

### Für die API-Nutzung
1. **Workaround:** Stadtstaaten sowohl über `BUNDESLAND` als auch `KREISFREIE_STADT` abfragen
2. **Deduplizierung:** Bremen-Duplikate anhand AGS-Code identifizieren und bereinigen
3. **Validierung:** Erwartete 16 Bundesländer gegen tatsächliche Ergebnisse prüfen

### Für die Bertelsmann Stiftung
1. **Datenbereinigung:** Berlin (AGS: 11000000) und Hamburg (AGS: 02000000) sollten als `BUNDESLAND` klassifiziert werden
2. **Konsistenz:** Einheitliche Klassifizierung aller Stadtstaaten als `BUNDESLAND`
3. **Dokumentation:** Klarstellung der Klassifizierungslogik in der API-Dokumentation

## Technische Details

### Extrahierte Geometrien
- **Format:** GeoJSON FeatureCollection
- **Koordinatensystem:** EPSG:4326 (WGS84)
- **Geometrietyp:** MultiPolygon
- **Eigenschaften pro Feature:**
  - `id`: Datenbankindex
  - `name`: Bundeslandname
  - `ags`: 8-stelliger Amtlicher Gemeindeschlüssel
  - `friendlyUrl`: URL-konforme Bezeichnung
  - `type`: Regionstyp (BUNDESLAND/KREISFREIE_STADT)
  - `demographicType`: Demografietypnummer

### Vollständige Bundesländerliste
1. Baden-Württemberg (AGS: 08000000)
2. Bayern (AGS: 09000000)
3. Berlin (AGS: 11000000) ⚠️ *als KREISFREIE_STADT klassifiziert*
4. Brandenburg (AGS: 12000000)
5. Bremen (AGS: 04000000) ✅ *korrekt als BUNDESLAND*
6. Hamburg (AGS: 02000000) ⚠️ *als KREISFREIE_STADT klassifiziert*
7. Hessen (AGS: 06000000)
8. Mecklenburg-Vorpommern (AGS: 13000000)
9. Niedersachsen (AGS: 03000000)
10. Nordrhein-Westfalen (AGS: 05000000)
11. Rheinland-Pfalz (AGS: 07000000)
12. Saarland (AGS: 10000000)
13. Sachsen (AGS: 14000000)
14. Sachsen-Anhalt (AGS: 15000000)
15. Schleswig-Holstein (AGS: 01000000)
16. Thüringen (AGS: 16000000)

## Fazit

Die Extraktion der Bundesländer-Geometrien war technisch erfolgreich und liefert verwendbare Geodaten. Die identifizierten Inkonsistenzen in der API-Klassifizierung beeinträchtigen nicht die Vollständigkeit der Geometriedaten, sollten aber bei der weiteren Nutzung der API berücksichtigt werden.

Die API stellt trotz der Klassifizierungsprobleme wertvolle und detaillierte Geodaten für Deutschland bereit, die für Visualisierungen und Analysen genutzt werden können.