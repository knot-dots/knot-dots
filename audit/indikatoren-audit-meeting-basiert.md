# Indikatoren-Audit: Meeting-basierte Erkenntnisse & Code-Analyse

**Datum:** 2025-08-13  
**Basis:** Meeting-Zusammenfassung + Codebase-Analyse  
**Team:** Helena, Sebastian 
**Audit-Ziel:** Identifikation von UX-Problemen und technischen Verbesserungspotenzialen

## 🎯 Zentrale Problemfelder

### 1. **Navigation & Workflow-Komplexität**

#### Problem (aus Meeting):
- "Navigation zu Indikatoren noch zu verschachtelt"
- "Kontext verliert sich" bei Indikator-Ziel-Bindung  
- "Zu viele Schritte" für einfache Aufgaben

#### Code-Befund:
```typescript
// Komplexe Tab-Navigation in EditableIndicatorDetailView
let currentTab: IndicatorTab = $derived.by(() => {
  const parseResult = tab.safeParse(paramsFromURL(page.url).get('tab'));
  return parseResult.success ? parseResult.data : tab.enum.all;
});
```

#### Impact:
- **User Journey unterbrochen**: Nutzer verlieren Kontext zwischen Screens
- **Kognitive Belastung**: Zu viele Navigationsschritte für Standard-Tasks
- **Workflow-Ineffizienz**: Power User werden ausgebremst

### 2. **Bearbeitungsbeschränkungen**

#### Problem (aus Meeting):
- "Benutzer können nur Basisdaten aktualisieren"
- "Nicht die gewünschte Entwicklung in Zielen bearbeiten"
- "Ziele direkt im Indikator anlegen fehlt"

#### Code-Befund:
```typescript
// Nur EditableHistoricalValues in Detail-View
{#if $applicationState.containerDetailView.editable && $ability.can('update', container)}
  <EditableHistoricalValues editable bind:container />
{/if}

// Ziele sind separate Container, nicht direkt bearbeitbar
let overallObjective = $derived(findOverallObjective(container, relatedContainers));
```

#### Impact:
- **Workflow-Bruch**: Umweg über Programme für Ziel-Erstellung
- **Benutzerfrustration**: Erwartete Funktionen nicht verfügbar  
- **Dateninkonsistenz**: Getrennte Bearbeitung führt zu Fehlern

### 3. **Berechnungsprobleme & Zielwerte**

#### Problem (aus Meeting):
- "Zielwerte müssen immer von 0 beginnen"
- "Immer Differenz zur aktuellen Prognose angeben, nicht absolute Zahlen"
- "Aktuelle Implementierung funktioniert nicht für alle Indikatoren"

#### Code-Befund:
```typescript
// Komplexe Zielwert-Aggregation in IndicatorChart
objectives = findLeafObjectives(relatedContainers.filter(isObjectiveContainer))
  .flatMap(({ payload }) => payload.wantedValues)
  .reduce((accumulator, currentValue) => {
    const groupIndex = accumulator.findIndex(([year]) => currentValue[0] == year);
    return groupIndex > -1
      ? [...accumulator.slice(0, groupIndex), [currentValue[0], currentValue[1] + accumulator[groupIndex][1]], ...]
      : [...accumulator, currentValue];
  }, [])
```

#### Impact:
- **Wissenschaftliche Ungenauigkeit**: Falsche Berechnungsergebnisse möglich
- **Benutzerverwirrung**: Nicht-intuitive Zielwert-Eingabe
- **Datenqualität**: Fehleranfällige manuelle Differenz-Berechnungen

### 4. **Interface-Usability**

#### Problem (aus Meeting):
- "Filtereinstellungen zu dumm" bei "gewünschte Entwicklung"
- "Suche für Indikatoren nicht sinnvoll"
- "Spalten in Tabellen nicht sichtbar wenn deaktiviert"

#### Code-Befund:
```typescript
// Facettierte Filter in IndicatorsOverlay
let facets = $derived(
  computeFacetCount(
    new Map([
      ['indicatorType', new Map(indicatorTypes.options.map((v) => [v as string, 0]))],
      ['indicatorCategory', new Map(indicatorCategories.options.map((v) => [v as string, 0]))],
      // ... weitere statische Filter
    ]),
    containers
  )
);
```

#### Impact:
- **Such-Irrelevanz**: Filter passen nicht zu Nutzer-Kontext
- **Ineffiziente Katalog-Nutzung**: Bekannte Indikatoren schwer findbar
- **UI-Inkonsistenz**: Versteckte Tabellenspalten verwirren

## 🛠️ Technische Herausforderungen

### Bug: Maßnahmenziele-Zuordnung
**Problem**: "Maßnahmenziele werden den Zielen statt den Maßnahmen zugeordnet"

**Root Cause** (Code-Analyse):
```typescript
// Vermutlich in db.ts Relation-Queries
SELECT DISTINCT(c.*)
FROM container c
JOIN container_relation cr ON c.guid = cr.object
  AND cr.predicate IN ('is-measured-by', 'is-objective-for')
  // Möglicherweise falsche Prädikat-Zuordnung
```

### Chart-Komplexität
**Problem**: Wirkungsebenen-Darstellung zu komplex

**Code-Befund**: 150+ Zeilen komplexe Plot-Logic in `IndicatorChart.svelte`
```typescript
let effects = $derived.by(() => {
  // 50 Zeilen komplexe Status-basierte Aggregation
  if (measure?.payload.status == status.enum['status.done']) {
    return c.payload.achievedValues.map([year, value]) => ({...});
  } else if (measure?.payload.status == status.enum['status.in_implementation']) {
    // Weitere komplexe Berechnungen
  }
});
```

## 📋 Nächste Schritte - Implementierungsplan

### 🔥 **Kritisch (Helena + Stefan)**

#### 1. **Direkte Ziel-Erstellung aus Indikator**
```typescript
// Neue Funktion in IndicatorDetailView
function createObjectiveFromIndicator(indicator: IndicatorContainer) {
  const objective = containerOfType('objective', indicator.organization, ...);
  objective.relation.push({
    predicate: 'is-objective-for',
    object: indicator.guid
  });
}
```

#### 2. **Bug-Fix: Maßnahmenziele-Zuordnung**  
```sql
-- Korrektur in db.ts Relations-Query
WHERE cr.predicate = 'is-part-of-measure'  -- statt 'is-part-of'
  AND parent.payload.type = 'measure'
```

#### 3. **Absolute Zielwerte ermöglichen**
```typescript
// Erweiterte Objective-Logik
const objectivePayload = basePayload.extend({
  wantedValues: z.array(z.tuple([z.number().int().positive(), z.number()])),
  calculationMode: z.enum(['absolute', 'differential']).default('absolute')
});
```

### 🟡 **Wichtig (UX-Team)**

#### 4. **Navigation vereinfachen**
- **Kontext-persistente Overlays**: Ziel-Erstellung ohne Seitenwechsel
- **Querverweise-Buttons**: Direkte Navigation zwischen Indikator ↔ Ziel ↔ Maßnahme
- **Breadcrumb-Navigation**: Aktueller Kontext immer sichtbar

#### 5. **Intelligente Filter**
```typescript
// Kontext-bewusste Filter-Vorauswahl
function getContextualFilters(indicator: IndicatorContainer, context: 'goals' | 'measures') {
  return {
    indicatorCategory: indicator.payload.indicatorCategory,
    topic: indicator.payload.topic,
    organizationalUnit: indicator.organizational_unit
  };
}
```

#### 6. **Dashboard-ähnliche Indikator-Detailseite**
```svelte
<!-- Neue Layout-Struktur -->
<IndicatorDashboard>
  <IndicatorKPIs />
  <RelatedGoalsSection editable />
  <RelatedMeasuresSection editable />
  <HistoricalDataSection editable />
</IndicatorDashboard>
```

### 🟢 **Mittelfristig (Sebastian + Team)**

#### 7. **Berechnungsmodell dokumentieren & vereinheitlichen**
```typescript
// Neue Abstraktions-Schicht
class IndicatorCalculationEngine {
  calculateTrend(historicalValues: [number, number][]): TrendData
  calculateObjectiveProgress(current: number, target: number): ProgressData
  aggregateEffects(effects: EffectData[]): AggregatedEffects
}
```

#### 8. **Linien-basierte Darstellung (statt Kacheln)**
```svelte
<!-- Neue Darstellungskomponente -->
<IndicatorLineView>
  <IndicatorHeader />
  <GoalsRow />
  <MeasuresRow />
  <DataRow />
</IndicatorLineView>
```

#### 9. **PNK-Projekt Integration**
- Sektorale Indikatoren-Unterstützung
- Ist-Daten-fokussierte Workflows  
- Vereinfachte Darstellung ohne Komplexitäts-Overhead

## 🎯 User Stories (Priorisiert)

### **Epic 1: Vereinfachte Ziel-Indikator-Verknüpfung**
```gherkin
Als kommunaler Nachhaltigkeitsmanager
Möchte ich direkt aus einem Indikator heraus ein Ziel erstellen
Damit der Workflow effizienter wird und ich den Kontext nicht verliere

Akzeptanzkriterien:
- Button "Ziel erstellen" in Indikator-Detail-View
- Automatische is-objective-for Relation
- Kontext-erhaltende Overlay-Navigation
```

### **Epic 2: Absolute Zielwerte**  
```gherkin
Als Fachkraft für Klimaschutz
Möchte ich absolute Zielwerte (z.B. "1000 Tonnen CO2 bis 2030") eingeben
Statt immer Differenzen zur aktuellen Prognose berechnen zu müssen

Akzeptanzkriterien:
- Toggle zwischen "Absolut" und "Differenziell"
- Automatische Baseline-Berechnung im Hintergrund
- Klare Anzeige des gewählten Modus
```

### **Epic 3: Power-User Tabellenansicht**
```gherkin
Als erfahrener Tool-Nutzer  
Möchte ich alle Indikator-Daten in einer bearbeitbaren Tabelle verwalten
Damit ich effizient Bulk-Operationen durchführen kann

Akzeptanzkriterien:
- Inline-Editing für historische Werte
- Bulk-Import/Export Funktionalität
- Immer sichtbare Spalten auch bei Deaktivierung
```

## 🔍 Code-Verbesserungen

### Architektur-Refactoring
1. **Separation of Concerns**: Chart-Logic aus Components in Services
2. **Business Logic Abstraktion**: CalculationEngine für komplexe Berechnungen
3. **State Management**: Bessere Reaktivität zwischen verknüpften Containern

### Performance-Optimierungen
1. **Lazy Loading**: Charts nur bei Bedarf rendern
2. **Memoization**: Teure Aggregations-Berechnungen cachen  
3. **Virtual Scrolling**: Für große Indikator-Listen

### Test-Coverage
1. **Unit Tests**: Berechnungslogik isoliert testen
2. **Integration Tests**: Relation-Queries validieren
3. **E2E Tests**: Kritische User-Workflows absichern

## 🎯 Erfolgsmessung

### Quantitative Metriken
- **Task-Completion-Time**: Ziel-Indikator-Verknüpfung < 30 Sekunden
- **Error-Rate**: Berechnungsfehler < 1%  
- **User-Satisfaction**: SUS-Score > 80

### Qualitative Indikatoren  
- **Kontext-Erhaltung**: Nutzer verlieren seltener den Überblick
- **Workflow-Effizienz**: Weniger Support-Tickets zu Navigation
- **Feature-Adoption**: Neue Funktionen werden aktiv genutzt

---

**Fazit:** Das Meeting bestätigt die Code-Analyse - technisch solide Basis, aber UX-seitig signifikanter Verbesserungsbedarf. Die priorisierten Maßnahmen adressieren die kritischsten Workflow-Probleme und schaffen die Grundlage für bessere Benutzerfreundlichkeit.