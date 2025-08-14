# Indikatoren-Funktionalität - Technische Zusammenfassung

**Datum:** 2025-08-13  
**Zweck:** Audit der Indikator-Funktionalitäten in knot-dots  
**Kontext:** Basierend auf Meeting-Notizen und Codebase-Analyse  

## 🎯 Überblick

Indikatoren sind zentrale Messgrößen im knot-dots-System zur quantitativen Erfassung von Zielerreichung und Wirkung. Sie bilden die Basis für datengestützte Steuerung nachhaltiger Entwicklung in Kommunen.

### Kernfunktionen
- **Datensammlung**: Historische Werte und Zeitreihen
- **Zielverknüpfung**: Verknüpfung mit Zielen über gewünschte Entwicklung  
- **Wirkungsmessung**: Messung von Maßnahmenwirkungen
- **Visualization**: Chart- und Tabellenansichten
- **Template-System**: Wiederverwendbare Indikatorvorlagen

## 📊 Datenmodell

### IndicatorContainer (`models.ts:478-486`)
```typescript
const indicatorPayload = basePayload.extend({
  historicalValues: z.array(z.tuple([z.number().int().positive(), z.number()])).default([]),
  indicatorCategory: z.array(indicatorCategories).default([]),
  indicatorType: z.array(indicatorTypes).default([]),
  quantity: z.string(),
  unit: z.string(),
  type: z.literal('indicator')
});
```

### Wichtige Eigenschaften
- **historicalValues**: `[Jahr, Wert]` Tupel für Zeitreihendaten
- **indicatorType**: `impact`, `key`, `performance` 
- **indicatorCategory**: `kpi`, `mpsc`, `sdg`, `custom`
- **quantity**: Messgegenstand (z.B. `co2`, `water_consumption`)
- **unit**: Maßeinheit (z.B. `percent`, `ton_per_capita`)

## 🔗 Relationsmodell

### Zentrale Prädikate
- **`is-measured-by`**: Ziel/Effekt ← gemessen durch → Indikator
- **`is-objective-for`**: Zielwert ← ist Ziel für → Indikator  
- **`is-part-of`**: Hierarchische Zugehörigkeit

### Objektverknüpfungen  
1. **Goal** ←`is-measured-by`→ **Indicator**
2. **Effect** ←`is-measured-by`→ **Indicator** 
3. **Objective** ←`is-objective-for`→ **Indicator**

## 🎨 UI-Komponenten

### Haupt-Ansichten

#### 1. **EditableIndicatorDetailView.svelte**
- Tab-basierte Navigation (Alle, Ziele, Maßnahmen)
- Chart/Tabellen-Umschaltung 
- Historische Werte bearbeiten
- Verknüpfte Container anzeigen

#### 2. **IndicatorChart.svelte** 
- **Observable Plot** Integration
- Zeitreihen-Visualisierung
- Ziellinien (`objectives`)  
- Maßnahmenwirkungen (`effects`) nach Status farbkodiert
- Stacked Area Charts für kumulierte Wirkungen

#### 3. **IndicatorProperties.svelte**
- Metadaten-Bearbeitung (Typ, Kategorie, Einheit)
- Organisationszuordnung
- Sichtbarkeit und Editorial State

### Zusätzliche Komponenten
- **IndicatorsOverlay**: Katalog-Ansicht mit Facetten-Filterung
- **IndicatorTable**: Tabellarische Darstellung  
- **EditableHistoricalValues**: Zeitreihen-Editor

## ⚙️ Kernfunktionalitäten

### 1. Historische Datenerfassung
```typescript
// Beispiel: CO2-Emissionen über Jahre
historicalValues: [
  [2020, 1000],  // Jahr 2020: 1000 Tonnen
  [2021, 950],   // Jahr 2021: 950 Tonnen  
  [2022, 900]    // Jahr 2022: 900 Tonnen
]
```

### 2. Zielwert-Integration
- **Objective Container** mit `wantedValues: [Jahr, Zielwert][]`
- Automatische Berechnung von Differenzen zur Baseline
- Visualisierung als blaue Linie im Chart

### 3. Maßnahmenwirkung-Tracking
- **Effect Container** mit `plannedValues` und `achievedValues`
- Farbkodierung nach Maßnahmenstatus:
  - 🔴 Idee (`status.idea`) 
  - 🟠 Planung (`status.in_planning`)
  - 🟡 Umsetzung (`status.in_implementation`)
  - 🟢 Abgeschlossen (`status.done`)

### 4. Template-System
- **IndicatorTemplateContainer**: Wiederverwendbare Vorlagen
- Ohne `historicalValues` und `quantity`
- Kopier-Funktionalität für neue Indikatoren

## 🔍 Identifizierte UX-Probleme

### Navigation & Workflow
1. **Kontext-Verlust**: Zu viele Schritte zwischen Indikator-Erstellung und Ziel-Verknüpfung
2. **Verschachtelte Navigation**: Weg zu Indikatoren zu komplex
3. **Filter-Logik**: Voreingestellte Filter beim Übergang wenig hilfreich

### Datenerfassung  
4. **Zielwert-Berechnung**: Problematisch bei verschiedenen Indikatortypen
5. **Baseline-Zwang**: Nutzer müssen immer Differenzen statt absolute Werte eingeben
6. **Hierarchie-Problem**: Maßnahmenziele werden fälschlicherweise unter Ziele statt Maßnahmen einsortiert

### Darstellung
7. **Tabellen-Deaktivierung**: Spalten in deaktivierten Zuständen nicht sichtbar
8. **Kachel vs. Linien**: Aktuelle Kachel-Darstellung könnte durch Linien-Layout ersetzt werden
9. **Bearbeitbarkeit**: Zentrale Tabellenansicht nur lesend, nicht bearbeitbar

## 🛠️ Technische Integration

### Database Layer (`db.ts`)
```sql
-- Indikator-Suche über Relations  
SELECT DISTINCT(c.*)
FROM container c
JOIN container_relation cr ON c.guid = cr.object
  AND cr.predicate = 'is-measured-by'
  AND cr.subject IN (${effects})
```

### Permissions & Abilities  
```typescript
$ability.can('update', container, 'indicatorCategory')
$ability.can('read', container, 'payload.editorialState')  
```

### Chart-Konfiguration
```javascript
Plot.areaY(trendWithEffects, {
  x: 'date', y: 'value', 
  fill: 'status',
  order: ['trend', 'status.done', 'status.in_implementation', ...]
})
```

## 📋 Verbesserungspotenziale

### Workflow-Optimierung
1. **Direkte Ziel-Erstellung**: Aus Indikatoren heraus Ziele anlegen
2. **Automatische Verknüpfung**: Vorgeschlagene Wirkungsverbindungen
3. **Querverweise**: Button-basierte Navigation zwischen Ebenen
4. **Kontextuelle Filter**: Intelligentere Vorfilterung nach Kontext

### Benutzerfreundlichkeit  
5. **Absolute Zielwerte**: Option für direkte Zieleingabe statt nur Differenzen
6. **Tabellenediting**: Bearbeitbare zentrale Datenansicht
7. **Spalten-Persistenz**: Immer sichtbare Tabellenspalten auch bei Deaktivierung

### Darstellungsverbesserung
8. **Linien-Layout**: Übereinander gestapelte Daten-Darstellung  
9. **Überschriften-System**: Bessere Strukturierung im Indikatorenkatalog
10. **Neue-Indikatoren**: Prominente Anzeige neu erstellter Indikatoren

## 🎯 Anwendungsszenarien  

### Kommunale Steuerung
- **Klimaschutz**: CO2-Reduktion über Jahre verfolgen
- **Verkehrswende**: Radwegekilometer, ÖPNV-Nutzung  
- **Soziale Gerechtigkeit**: Kinderarmut, Beschäftigungsquoten

### Wirkungsmanagement
- **OKR-System**: Key Results als messbare Indikatoren
- **Strategieumsetzung**: Zielerreichung quantifiziert
- **Maßnahmen-Controlling**: Geplant vs. erreichte Wirkung

## 📖 Fazit

Das Indikator-System in knot-dots ist **technisch gut strukturiert** mit einem flexiblen Container-Modell, Observable Plot-Integration und umfassender Permissions-Logik. 

**Stärken:**
- Robustes Datenmodell mit Zeitreihen-Support
- Mächtige Visualisierungs-Engine  
- Template-System für Wiederverwertung
- Granulare Berechtigungssteuerung

**Verbesserungsbedarf:**
- **UX-Workflows** vereinfachen (weniger Schritte, besserer Kontext)
- **Zielwert-Logik** überarbeiten (absolute Werte ermöglichen) 
- **Navigation** optimieren (direkte Verknüpfungen, Querverweise)
- **Darstellung** modernisieren (Linien-Layout, bessere Tabellen)

Das System eignet sich bereits gut für **Power User**, braucht aber **UX-Verbesserungen** für breitere Nutzerfreundlichkeit.