# Problem-Analyse: Reduzierende Indikatorwerte

**Datum:** 2025-08-20  
**Kontext:** Bug-Report zu falscher Darstellung reduzierender Werte in Charts  
**Status:** Problem identifiziert  

## 🐛 Problembeschreibung

Reduzierende Indikatorwerte (negative Effekte) werden in Charts als positive Werte dargestellt anstatt korrekt vom Gesamtziel abgezogen zu werden. Dies führt zu irreführenden Visualisierungen.

## 🔍 Technische Analyse

### Betroffene Dateien
- `app/src/lib/components/IndicatorChart.svelte` (Zeilen 141-157)
- `app/src/lib/components/EffectChart.svelte` (Zeilen 33-38)

### Kernproblem in IndicatorChart.svelte

```typescript
let trendWithEffects = $derived(
    effects[0]?.value < 0
        ? [
            // PROBLEM: Negative Werte werden zu positiven umgewandelt
            ...effects.map(({ date, value, status }) => ({ 
                date, 
                value: Math.abs(value), // ← Hier liegt das Problem
                status 
            })),
            ...container.payload.historicalValues.map(([key, value]) => ({
                date: new Date(key, 0),
                value: value - Math.abs(
                    effects
                        .filter(({ date }) => date.getFullYear() == key)
                        .reduce((accumulator, currentValue) => accumulator + currentValue.value, 0)
                ),
                status: 'trend'
            }))
        ]
        : [...effects, ...trend.map((t) => ({ ...t, status: 'trend' }))]
);
```

### Problemursachen

1. **Math.abs() Konvertierung**: Negative Werte werden automatisch zu positiven Werten umgewandelt
2. **Falsche Chart-Darstellung**: Stacked Area Charts zeigen reduzierende Effekte als positive Balken
3. **Inkorrekte Trend-Berechnung**: Historische Werte werden um absolute Beträge reduziert statt um tatsächliche negative Werte

### Chart-Konfiguration Problematik

```javascript
Plot.areaY(trendWithEffects, {
    x: 'date',
    y: 'value',
    fill: 'status',
    interval: 'year',
    order: effects[0]?.value < 0
        ? ['trend', 'status.idea', 'status.in_planning', 'status.in_implementation', 'status.done']
        : ['trend', 'status.done', 'status.in_implementation', 'status.in_planning', 'status.idea'],
    reduce: 'sum'
})
```

**Problem**: Die Reihenfolge wird umgekehrt, aber die Werte bleiben positiv.

## 📊 Auswirkungen

### Visualisierung
- ❌ Reduzierende Maßnahmen erscheinen als **positive Beiträge**
- ❌ Kein visueller Unterschied zwischen steigenden und fallenden Trends
- ❌ Misleading Stacked Areas für kumulative Effekte

### Dateninterpretation  
- ❌ Nutzer können nicht erkennen, welche Maßnahmen tatsächlich reduzierend wirken
- ❌ Gesamtwirkung wird falsch dargestellt
- ❌ Zielerreichung kann nicht korrekt bewertet werden

### Funktionierender Bereich
- ✅ **Ziel-Ebene Trendwerte funktionieren korrekt** (ObjectiveChart.svelte)
- ✅ Datenmodell unterstützt negative Werte in `historicalValues`

## 🛠️ Lösungsansatz

### Kurzfristige Korrektur
1. **Entfernung von Math.abs()**: Negative Werte nativ unterstützen
2. **Chart-Konfiguration anpassen**: Observable Plot für negative Werte konfigurieren
3. **Trend-Berechnung korrigieren**: Echte Addition statt Absolutwert-Subtraktion

### Beispiel-Korrekturen

```typescript
// VORHER (fehlerhaft):
value: Math.abs(value)

// NACHHER (korrekt):
value: value  // Negative Werte beibehalten
```

```typescript
// VORHER (fehlerhaft):
value: value - Math.abs(effects.reduce(...))

// NACHHER (korrekt):  
value: value + effects.reduce(...)  // Negative werden automatisch subtrahiert
```

### Langfristige Verbesserungen
1. **Einheitliche Chart-Logik**: Konsistente Behandlung positiver/negativer Werte
2. **Visuelle Differenzierung**: Unterschiedliche Darstellung für reduzierende vs. steigernde Effekte
3. **Testing**: Unit Tests für Chart-Berechnungen mit negativen Werten

## 📋 Handlungsempfehlungen

### Priorität 1 (Kritisch)
- [ ] **IndicatorChart.svelte korrigieren**: Math.abs() entfernen und Chart-Logik anpassen
- [ ] **EffectChart.svelte prüfen**: Ähnliche Problematik untersuchen
- [ ] **Manuelle Tests**: Charts mit reduzierenden Indikatoren testen

### Priorität 2 (Wichtig)
- [ ] **Regression Tests**: Sicherstellen dass Ziel-Ebene weiterhin funktioniert
- [ ] **Observable Plot Konfiguration**: Negative Werte korrekt visualisieren
- [ ] **Dokumentation**: Chart-Verhalten für negative Werte dokumentieren

### Priorität 3 (Wünschenswert)
- [ ] **Unit Tests**: Automatisierte Tests für Chart-Berechnungen
- [ ] **Visuelle Indikatoren**: Bessere UX für reduzierende vs. steigernde Effekte
- [ ] **Code Review**: Ähnliche Probleme in anderen Chart-Komponenten finden

## 🔗 Verwandte Komponenten

### Direkt betroffen
- `IndicatorChart.svelte:141-157` - Hauptproblem
- `EffectChart.svelte:33-38` - Ähnliche Logik

### Potenziell betroffen  
- `ObjectiveChart.svelte` - Funktioniert korrekt (Referenz)
- `IndicatorTable.svelte` - Tabellarische Darstellung prüfen
- `EditableHistoricalValues.svelte` - Eingabevalidierung

### Datenmodell
- `models.ts` - `historicalValues: z.array(z.tuple([z.number().int().positive(), z.number()]))` 
- Unterstützt negative Werte im zweiten Tuple-Element ✅

## 💡 Fazit

Das Problem liegt in der **Chart-Visualisierung**, nicht im **Datenmodell**. Die Korrektur erfordert:

1. Entfernung der `Math.abs()` Konvertierung
2. Anpassung der Observable Plot Konfiguration  
3. Korrektur der Trend-Berechnungslogik

**Impact**: Hoch - Betrifft Kernfunktionalität der Indikator-Visualisierung  
**Complexity**: Mittel - Lokalisierte Änderungen in Chart-Komponenten  
**Risk**: Niedrig - Gut testbar und isoliert