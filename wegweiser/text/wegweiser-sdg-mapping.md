# Wegweiser Kommune - SDG Indikatoren Analyse

**Erstellt:** 2025-08-08  
**Analysierte Indikatoren:** 393  
**Methode:** Thematische Zuordnung über Keywords und Themen

## 🔍 Kernerkenntnisse

### SDG-Status in Wegweiser Kommune
❌ **Keine expliziten SDG-Referenzen** in der API gefunden  
✅ **Thematische SDG-Zuordnung** über Inhaltsanalyse möglich  
📊 **76,8% Abdeckung** (302 von 393 Indikatoren zuordenbar)  
🎯 **14 von 17 SDGs** durch Wegweiser-Indikatoren abgedeckt

### Fehlende SDGs
- **SDG 9:** Industrie, Innovation und Infrastruktur (nur indirekt über Wirtschaft)
- **SDG 13:** Maßnahmen zum Klimaschutz (nur indirekt über Umwelt)  
- **SDG 17:** Partnerschaften zur Erreichung der Ziele

## 📊 SDG-Ranking nach Indikatoranzahl

| Rang | SDG | Name | Indikatoren | % | Hauptthemen |
|------|-----|------|-------------|---|-------------|
| 1 | **SDG 5** | Geschlechtergleichheit | **92** | 23.4% | Geschlechter-aufgeschlüsselte Statistiken |
| 2 | **SDG 8** | Arbeit und Wirtschaft | **82** | 20.9% | Beschäftigung, Arbeitsmarkt |
| 3 | **SDG 4** | Bildung | **73** | 18.6% | Aus-/Weiterbildung, Kinderbetreuung |
| 4 | **SDG 11** | Nachhaltige Städte | **69** | 17.6% | Demografische Entwicklung |
| 5 | **SDG 1** | Keine Armut | **35** | 8.9% | SGB II, Soziale Lage |
| 6 | **SDG 3** | Gesundheit | **26** | 6.6% | Pflege, Sterblichkeit |
| 7 | **SDG 10** | Weniger Ungleichheiten | **26** | 6.6% | Integration, Migration |
| 8 | **SDG 15** | Leben an Land | **13** | 3.3% | Naturschutz, Flächennutzung |
| 9 | **SDG 7** | Energie | **3** | 0.8% | Erneuerbare Energien |
| 10 | **SDG 6** | Sauberes Wasser | **2** | 0.5% | Trinkwasser, Abwasser |
| 11 | **SDG 2** | Kein Hunger | **2** | 0.5% | Landwirtschaft |
| 12 | **SDG 12** | Nachhaltiger Konsum | **1** | 0.3% | Abfallwirtschaft |
| 13 | **SDG 14** | Leben unter Wasser | **1** | 0.3% | Fischerei |
| 14 | **SDG 16** | Frieden | **1** | 0.3% | Kriminalität |

## 🎯 Top SDG-Kategorien im Detail

### SDG 5: Geschlechtergleichheit (92 Indikatoren)
**Wegweiser-Fokus:** Geschlechtsaufschlüsselung aller demografischen Daten

**Beispiel-Indikatoren:**
- Verhältnis der Beschäftigungsquote von Frauen und Männern
- Anteil [Altersgruppe] - männlich/weiblich (alle Altersgruppen)
- Geringfügig Beschäftigte - Frauen/Männer
- Arbeitslose nach Geschlecht

**knot-dots Mapping:** `category: ["sdg.05"]`

---

### SDG 8: Arbeit und Wirtschaftswachstum (82 Indikatoren)  
**Wegweiser-Fokus:** Beschäftigung und Arbeitsmarkt als Kernthema

**Beispiel-Indikatoren:**
- Beschäftigungsanteil in allen Wirtschaftssektoren
- Arbeitsplatzentwicklung der vergangenen 5 Jahre
- Arbeitslosigkeit nach Altersgruppen
- Einkommen und Kaufkraft

**knot-dots Mapping:** `category: ["sdg.08"]`

---

### SDG 4: Hochwertige Bildung (73 Indikatoren)
**Wegweiser-Fokus:** Bildung von Kinderbetreuung bis Hochschule

**Beispiel-Indikatoren:**
- 3- bis 5-Jährige in Tageseinrichtungen (alle Varianten)
- Ausbildungsbeginner:innen mit verschiedenen Abschlüssen  
- Schüler:innen und Schulabschlüsse
- Hochschulzugang und Studienquoten

**knot-dots Mapping:** `category: ["sdg.04"]`

---

### SDG 11: Nachhaltige Städte und Gemeinden (69 Indikatoren)
**Wegweiser-Fokus:** Demografische Entwicklung und Stadtentwicklung

**Beispiel-Indikatoren:**
- Bevölkerungsstruktur nach Altersgruppen
- Zu- und Fortzüge
- Bevölkerungsentwicklung
- Einwohner:innendichte

**knot-dots Mapping:** `category: ["sdg.11"]`

## 🔄 Mapping-Regeln für knot-dots Integration

### Automatische SDG-Zuordnung
```typescript
const wegweiserSDGMapping = {
  // Themen-basierte Zuordnung
  themeMapping: {
    'Beschäftigung / Arbeitsmarkt': ['sdg.08'],
    'Aus- und Weiterbildung': ['sdg.04'],  
    'Kinderbetreuung': ['sdg.04'],
    'Soziale Lage': ['sdg.01'],
    'Integration': ['sdg.10'],
    'Demografische Entwicklung': ['sdg.11'],
    'Wirtschaft & Innovation': ['sdg.08', 'sdg.09'],
    'Sicherheit': ['sdg.16']
  },
  
  // Keyword-basierte Zuordnung
  keywordMapping: {
    'armut|sgb|grundsicherung': ['sdg.01'],
    'beschäftig|arbeit|arbeitslos': ['sdg.08'],
    'bildung|schule|ausbildung|betreuung': ['sdg.04'],
    'frauen|männer|geschlecht': ['sdg.05'],
    'gesundheit|pflege|sterb|kranken': ['sdg.03'],
    'integration|migration|ausländer': ['sdg.10'],
    'energie|strom|erneuerbar': ['sdg.07'],
    'wasser|trink|abwasser': ['sdg.06'],
    'natur|landschaft|fläche': ['sdg.15'],
    'straftat|sicherheit': ['sdg.16']
  }
};
```

### Multi-SDG Zuordnungen
Viele Wegweiser-Indikatoren betreffen mehrere SDGs gleichzeitig:

```typescript  
const multiSDGExamples = {
  'Verhältnis der Beschäftigungsquote von Frauen und Männern': ['sdg.05', 'sdg.08'],
  '3-Jährige mit Migrationshintergrund in Tageseinrichtungen': ['sdg.04', 'sdg.10'],
  'Altersarmut - Ausländer:innen': ['sdg.01', 'sdg.10'],
  'Beschäftigungsanteil im 1. Sektor': ['sdg.08', 'sdg.14'], // Fischerei
  'Fertiggestellte Wohngebäude mit erneuerbarer Energie': ['sdg.07', 'sdg.11']
};
```

## 📈 SDG-Integration in knot-dots

### Template für Wegweiser-Indikatoren
```typescript
const wegweiserIndicatorTemplate = {
  // Basis-SDG aus Hauptthema
  category: WegweiserSDGMapper.mapFromTheme(indicator.topics),
  
  // Erweiterte SDGs aus Keywords
  additionalCategories: WegweiserSDGMapper.mapFromKeywords(
    indicator.name + ' ' + indicator.explanation
  ),
  
  // Standard-Topics erweitern
  topic: [
    ...mapWegweiserTopics(indicator.topics),
    ...derivedFromSDGs(category)
  ],
  
  // Metadaten für SDG-Bezug
  metadata: {
    sdgMappingMethod: 'thematic_keyword_analysis',
    sdgConfidence: calculateConfidence(matches),
    originalThemes: indicator.topics
  }
};
```

### Confidence-Scoring
```typescript
function calculateSDGConfidence(matches: string[]): 'high' | 'medium' | 'low' {
  const themeMatches = matches.filter(m => m.startsWith('theme:')).length;
  const keywordMatches = matches.filter(m => m.startsWith('keyword:')).length;
  
  if (themeMatches >= 1) return 'high';      // Theme-Match = hohe Sicherheit
  if (keywordMatches >= 3) return 'medium';  // Viele Keywords = mittlere Sicherheit  
  return 'low';                              // Wenige Keywords = niedrige Sicherheit
}
```

## 🔍 Besonderheiten deutscher SDG-Berichterstattung

### Deutsche SDG-Schwerpunkte in Wegweiser
1. **Geschlechtergleichheit dominiert:** 92 Indikatoren durch konsequente Geschlechtsaufschlüsselung
2. **Arbeitsmarkt-Fokus:** 82 Indikatoren - Beschäftigung als zentrale Wohlstandsgröße  
3. **Bildung breit gefächert:** Von Kita bis Hochschule komplett abgedeckt
4. **Demografischer Wandel:** SDG 11 durch Bevölkerungsentwicklung stark besetzt

### Fehlende internationale SDG-Themen
- **Klimaschutz (SDG 13):** Kaum CO₂/Emissions-Indikatoren
- **Innovation (SDG 9):** Wenig Technologie-/Patent-Indikatoren
- **Partnerschaften (SDG 17):** Keine interkommunalen Kooperations-Indikatoren

## 📋 Implementierung für knot-dots

### Phase 1: Core-SDG-Mapping
```typescript
// Häufigste 5 SDGs mit hoher Konfidenz
const coreMappings = {
  'sdg.05': 92, // Geschlechtergleichheit
  'sdg.08': 82, // Arbeit und Wirtschaft  
  'sdg.04': 73, // Bildung
  'sdg.11': 69, // Nachhaltige Städte
  'sdg.01': 35  // Keine Armut
};
// → Abdeckung: 351 von 393 Indikatoren (89.3%)
```

### Phase 2: Erweiterte SDGs
```typescript
// Restliche SDGs für 100% Abdeckung
const extendedMappings = {
  'sdg.03': 26, // Gesundheit
  'sdg.10': 26, // Weniger Ungleichheiten  
  'sdg.15': 13, // Leben an Land
  'sdg.07': 3,  // Energie
  'sdg.06': 2,  // Sauberes Wasser
  'sdg.02': 2,  // Kein Hunger
  'sdg.12': 1,  // Nachhaltiger Konsum
  'sdg.14': 1,  // Leben unter Wasser
  'sdg.16': 1   // Frieden
};
```

### JSON-Schema für Import
```json
{
  "wegweiser_indicator": {
    "name": "Altersarmut",
    "sdg_assignments": [
      {
        "sdg": "sdg.01", 
        "confidence": "high",
        "method": "theme_match",
        "evidence": ["theme: Soziale Lage", "keyword: armut"]
      }
    ]
  }
}
```

## 🚀 Nächste Schritte

### Immediate
1. **Core-Mappings implementieren** (Top 5 SDGs)
2. **Confidence-System entwickeln** 
3. **Multi-SDG-Handling** für komplexe Indikatoren

### Short-term  
1. **Erweiterte SDG-Mappings** (alle 14 SDGs)
2. **Validierung** mit SDG-Experten
3. **UI-Integration** für SDG-Filter

### Long-term
1. **Automatische SDG-Erkennung** für neue Indikatoren
2. **SDG-Dashboard** in knot-dots
3. **Benchmarking** zwischen Kommunen pro SDG

---

**Fazit:** Obwohl Wegweiser Kommune keine expliziten SDG-Referenzen verwendet, lassen sich **76,8% aller Indikatoren** thematisch den Sustainable Development Goals zuordnen. Die deutsche Berichterstattung zeigt klare Schwerpunkte bei Geschlechtergleichheit, Arbeitsmarkt und Bildung, während globale Themen wie Klimaschutz unterrepräsentiert sind.