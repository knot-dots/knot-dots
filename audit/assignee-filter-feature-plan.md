# Assignee/Verantwortlichen-Filter Feature Plan

**Datum:** 2025-08-14  
**Basis:** Filter-Functionality-Audit + Feature-Planung  
**Ziel:** Erweiterung des Filter-Systems um personenbezogene Filterung  
**Status:** Geplant

## 🎯 Feature-Übersicht

### Problemstellung
- **Limitierte Assignee-Filterung**: Aktuell nur bei Tasks verfügbar, nicht bei anderen Content-Typen
- **Fehlende "Verantwortlich für Ausarbeitung"**: Andere Content-Typen (Goals, Measures, Indicators, Rules) haben kein Assignee-Feld
- **Inkonsistente User Experience**: Verschiedene Verantwortlichkeits-Konzepte ohne einheitliche Filterung
- **Workflow-Ineffizienz**: Nutzer können nicht nach Verantwortlichkeiten über alle Content-Typen hinweg filtern

### Lösung
Systematische Erweiterung des bestehenden Filter-Systems um einheitliche Assignee/Verantwortlichen-Filterung über alle Content-Typen hinweg. Das System baut auf der bereits implementierten Task-Assignee-Funktionalität auf und erweitert diese um:

1. **Einheitliches Assignee-Feld** für alle Content-Typen (Goals, Measures, Indicators, Rules, Programs)
2. **Wiederverwendung** der bestehenden `AssigneeFilterDropDown.svelte` und `EditableAssignee.svelte` Komponenten
3. **Konsistente Filterung** über alle Seiten und Views hinweg
4. **"Verantwortlich für Ausarbeitung"** als primäres Konzept für Ownership

### Kern-Funktionen
- **Multi-User Assignment**: Mehrere Personen pro Container zuweisbar
- **Cross-Content Filtering**: Einheitliche Filterung über alle Content-Typen  
- **Real-time Updates**: Live-Aktualisierung der Facet Counts
- **Permission-Aware**: Respektiert bestehende Organisations-Berechtigungen
- **Mobile-Optimized**: Touch-freundliche Benutzeroberfläche

## 🏗️ Technische Architektur

### Bestehende Assignee-Implementation (Tasks)

**Aktuell implementiert:**
- **TaskPayload** mit `assignee: z.array(z.string().uuid()).default([])` (models.ts:645)
- **EditableAssignee.svelte** Komponente für Multi-User-Auswahl
- **AssigneeFilterDropDown.svelte** für Filterung mit Facet-Counts
- **TaskProperties.svelte** Integration mit CASL-Berechtigungen
- **Backend-Unterstützung** für Assignee-Queries in Tasks

**Wiederverwendbare Patterns:**
- Dynamic Member-Fetching via `fetchMembers()`
- Ability-based Permissions mit `$ability.can('read', container, 'assignee')`
- URL-basierte Filter-State in TasksPage
- Real-time Facet-Count-Updates

### Datenmodell-Erweiterung

#### Schema-Updates (`models.ts`)

**Aktueller Status:** Tasks haben bereits `assignee`-Feld implementiert
```typescript
// Bereits implementiert in taskPayload (Zeile 645)
const taskPayload = measureMonitoringBasePayload
  .extend({
    assignee: z.array(z.string().uuid()).default([]), // ✅ Bereits vorhanden
    // ... weitere task-spezifische Felder
  });
```

**Erforderliche Erweiterungen:**
```typescript
// Erweiterte Payload-Schemas für andere Content-Typen
const goalPayload = basePayload.extend({
  assignee: z.array(z.string().uuid()).default([]), // NEU
  // ... bestehende goal-spezifische Felder
  goalType: goalType.optional(),
});

const measurePayload = basePayload.extend({
  assignee: z.array(z.string().uuid()).default([]), // NEU
  // ... bestehende measure-spezifische Felder  
  measureType: z.array(measureTypes).default([])
});

const indicatorPayload = basePayload.extend({
  assignee: z.array(z.string().uuid()).default([]), // NEU
  // ... bestehende indicator-spezifische Felder
  historicalValues: z.array(z.tuple([z.number().int().positive(), z.number()])).default([])
});

const rulePayload = basePayload.extend({
  assignee: z.array(z.string().uuid()).default([]), // NEU
  // ... bestehende rule-spezifische Felder
  ruleStatus: ruleStatus.default(ruleStatus.enum['rule_status.idea'])
});

const programPayload = basePayload.extend({
  assignee: z.array(z.string().uuid()).default([]), // NEU
  // ... bestehende program-spezifische Felder
  programType: programTypes.default(programTypes.enum['program_type.misc'])
});

// Helper-Funktionen
export function isAssignedTo(user: { guid: string }) {
  return (container: AnyContainer) => {
    return 'assignee' in container.payload && 
           Array.isArray(container.payload.assignee) &&
           container.payload.assignee.includes(user.guid);
  };
}

export function getAssignedUsers(container: AnyContainer): string[] {
  if ('assignee' in container.payload && Array.isArray(container.payload.assignee)) {
    return container.payload.assignee;
  }
  return [];
}
```

#### Database Migration
```sql
-- /migrate/sql/[timestamp]_add_assignee_to_content_types.up.sql

-- Add assignee field to content types (Tasks already have it)
UPDATE container 
SET payload = payload || '{"assignee": []}'::jsonb 
WHERE payload->>'type' IN ('goal', 'measure', 'indicator', 'rule', 'program')
  AND valid_currently = true
  AND NOT deleted
  AND NOT payload ? 'assignee';

-- Note: Tasks already have assignee field, no update needed

-- Optimierte Indizes für Performance
CREATE INDEX CONCURRENTLY idx_container_assignee_gin 
ON container USING gin ((payload->'assignee'))
WHERE payload ? 'assignee' AND valid_currently = true AND NOT deleted;

-- Index für häufige Assignee-Abfragen
CREATE INDEX CONCURRENTLY idx_container_assignee_type 
ON container (((payload->'type')::text), ((payload->'assignee')::text))
WHERE valid_currently = true AND NOT deleted;
```

### Backend-Integration

#### Filter-Erweiterung (`db.ts`)
```typescript
export function getManyContainers(
  organizationGuids: string[],
  params: {
    assignees?: string[], // Neue Filteroption
    audience?: string[],
    categories?: string[],
    // ... weitere bestehende Filter
  },
  sort?: string
) {
  let whereClause = `
    WHERE c.valid_currently = true 
    AND NOT c.deleted
    ${organizationGuids.length > 0 ? 'AND c.organization = ANY($1)' : ''}
  `;

  // Assignee-Filter via JSONB-Query
  if (params.assignees?.length) {
    whereClause += ` AND payload->'assignee' ?| array[${params.assignees.map(escapeValue).join(',')}]`;
  }

  // ... bestehende Filter-Logik
}
```

#### Facet-Count-Berechnung
```typescript
export function computeFacetCount(
  facets: Map<string, Map<string, number>>,
  containers: Container[]
): Map<string, Map<string, number>> {
  // ... bestehende Logik

  // Assignee-Facet-Counts
  if (facets.has('assignee')) {
    const assigneeFacet = facets.get('assignee')!;
    
    containers.forEach(container => {
      if ('assignee' in container.payload && Array.isArray(container.payload.assignee)) {
        container.payload.assignee.forEach(userGuid => {
          assigneeFacet.set(userGuid, (assigneeFacet.get(userGuid) || 0) + 1);
        });
      }
    });
  }

  return facets;
}
```

### Frontend-Integration

#### Page-Component-Updates
```typescript
// MeasuresPage.svelte, GoalsPage.svelte, etc.
let facets = $derived.by(() => {
  const facets = new Map([
    ['assignee', new Map()], // NEU: Assignee-Facet
    ['audience', new Map(audience.options.map((v) => [v as string, 0]))],
    ['measureType', new Map(measureTypes.options.map((v) => [v as string, 0]))],
    // ... weitere bestehende Facets
  ]);

  return computeFacetCount(facets, data.containers);
});
```

#### Load-Function-Updates
```typescript
// /app/src/routes/measures/status/+page.server.ts
const containers = await locals.pool.connect(
  getManyContainers(
    currentOrganization.payload.default ? [] : [currentOrganization.guid],
    {
      assignees: url.searchParams.getAll('assignee'), // NEU
      audience: url.searchParams.getAll('audience'),
      categories: url.searchParams.getAll('category'),
      // ... weitere Filter
    },
    url.searchParams.get('sort') ?? defaultSort
  )
);
```

## 📍 Implementierungs-Roadmap

### Phase 1: Foundation (2-3 Wochen)
**Priorität: HOCH**

#### 1.1 Schema-Migration & Backend
- [x] ~~Database Migration für Assignee-Felder~~ (Tasks bereits implementiert)
- [ ] Erweiterte Zod-Schemas in `models.ts` für Goal/Measure/Indicator/Rule/Program
- [ ] Backend Filter-Integration in `db.ts` erweitern
- [ ] Performance-Tests für JSONB-Queries mit mehreren Content-Typen

#### 1.2 Bestehende Task-Integration als Basis
- [x] ~~Task-Assignee-Funktionalität analysiert~~ (AssigneeFilterDropDown.svelte, EditableAssignee.svelte)
- [ ] Bestehende Filter-Integration in TasksPage erweitern auf andere Seiten
- [ ] Unit Tests für Cross-Content-Type Assignee-Filter-Logik

#### 1.3 Basic API Extension
- [ ] Load-Functions für Task-Pages erweitern
- [ ] Facet-Count-Berechnung für Assignees
- [ ] Authorization-Layer Anpassungen

**Deliverables:**
- Erweiterte Zod-Schemas mit Assignee-Feldern für alle Content-Typen
- Backend-Filter-Unterstützung für Cross-Content-Type Assignee-Queries  
- Solid Foundation basierend auf bestehender Task-Assignee-Implementation

### Phase 2: Content Type Expansion (3-4 Wochen)
**Priorität: HOCH**

#### 2.1 Goals & Measures Integration
- [ ] `GoalsPage.svelte` Assignee-Filter Integration
- [ ] `MeasuresPage.svelte` Erweiterung
- [ ] Measure-Monitoring-Views mit Assignees
- [ ] Goal-Level-Views mit Verantwortlichkeiten

#### 2.2 Programs & Rules
- [ ] Program-Management mit Assignee-Filterung
- [ ] Rule-Status-Board Integration
- [ ] Konsistente UI/UX über alle Content-Typen

#### 2.3 Indicators & Effects
- [ ] Indikatoren-Assignee für Datenverantwortliche
- [ ] Effect-Container Zuweisungen
- [ ] Integration in Indikator-Detail-Views

**Deliverables:**
- Vollständige Assignee-Filterung über alle Haupt-Content-Typen
- Konsistente User Experience
- Umfassende Test-Coverage

### Phase 3: Advanced Features & UX (2-3 Wochen)  
**Priorität: MITTEL**

#### 3.1 Universal Views Enhancement
- [ ] `/all/table` mit Assignee-Spalten und Filtern
- [ ] `/all/catalog` Card-Views mit Assignee-Anzeige
- [ ] `/all/level` Hierarchie-Views
- [ ] `/objectives-and-effects` Multi-Level-Integration

#### 3.2 Cross-Context Features
- [ ] "Meine zugewiesenen Inhalte" Dashboard
- [ ] Filter-Persistenz zwischen Views
- [ ] Bulk-Assignment-Funktionalitäten
- [ ] Quick-Filters: "Mir zugewiesen", "Mein Team", "Unassigned"

#### 3.3 Enhanced UI Components
- [ ] Assignee-Avatars in Dropdown-Komponenten
- [ ] Auto-Complete für große Teams
- [ ] Recent/Frequent Assignees
- [ ] Visual Assignment-Indicators in Listen

**Deliverables:**
- Premium User Experience für Assignee-Management  
- Advanced Workflow-Features
- Mobile-optimierte Benutzeroberfläche

### Phase 4: Analytics & Optimization (1-2 Wochen)
**Priorität: NIEDRIG**

#### 4.1 Usage Analytics
- [ ] Tracking für Assignee-Filter-Nutzung
- [ ] Performance-Monitoring für komplexe Queries
- [ ] User-Adoption-Metriken
- [ ] A/B Testing für UI-Varianten

#### 4.2 Advanced Features
- [ ] Machine Learning für Assignment-Vorschläge
- [ ] Integration mit Keycloak-Teams/Gruppen
- [ ] Export/Import von Assignment-Daten
- [ ] API für externe System-Integration

**Deliverables:**
- Datengetriebene Feature-Optimierung
- Enterprise-Level Assignment-Features
- Integration-Ready APIs

## 🎨 UI/UX-Design

### Wiederverwendung bestehender Komponenten

#### AssigneeFilterDropDown.svelte Enhancement
```svelte
<!-- Erweiterte Assignee-Filter-Komponente -->
<FilterDropDown
  bind:selected={selectedAssignees}
  options={availableUsers}
  label="Verantwortliche"
  placeholder="Personen auswählen..."
  facets={assigneeFacets}
  multiSelect={true}
>
  {#each availableUsers as user}
    <div class="assignee-option">
      <UserAvatar {user} size="sm" />
      <span class="user-name">{user.name}</span>
      <span class="user-role">{user.role}</span>
    </div>
  {/each}
</FilterDropDown>
```

### Konsistente Integration
- **Wiederverwendung** der bewährten Filter-Patterns
- **Einheitliches Styling** mit bestehenden Filter-Komponenten
- **Responsive Design** für alle Bildschirmgrößen
- **Accessibility** mit Screen-Reader-Support

### User Experience Features
- **Quick Filters**: "Mir zugewiesen", "Mein Team", "Unassigned"
- **Visual Indicators**: Avatar-Displays in Ergebnislisten
- **Batch Operations**: Mehrfach-Zuweisungen in Tabellenansichten
- **Smart Suggestions**: Häufig verwendete Assignees priorisieren

## 🔧 Spezifische Code-Änderungen

### Key Files to Modify

#### 1. Database Layer
**File:** `/migrate/sql/[timestamp]_add_assignee_support.up.sql`
**File:** `/migrate/sql/[timestamp]_add_assignee_support.down.sql`

#### 2. Models & Schema
**File:** `/app/src/lib/models.ts`
- Assignee-Felder zu Payload-Schemas hinzufügen
- Helper-Funktionen für Assignee-Operations
- Type-Guards für Assignee-fähige Container

#### 3. Database Queries  
**File:** `/app/src/lib/server/db.ts`
- `getManyContainers()` Assignee-Filter-Support
- `computeFacetCount()` Assignee-Facet-Berechnung
- Performance-optimierte JSONB-Queries

#### 4. Page Components
**Files:** 
- `/app/src/lib/components/MeasuresPage.svelte`
- `/app/src/lib/components/GoalsPage.svelte`
- `/app/src/lib/components/AllPage.svelte`
- `/app/src/lib/components/RulesPage.svelte`

#### 5. Load Functions
**Files:** Alle relevanten `+page.server.ts` Files
- URL-Parameter für Assignee-Filter
- Server-seitige Filter-Anwendung
- Facet-Daten für Frontend

#### 6. UI Components Enhancement
**File:** `/app/src/lib/components/AssigneeFilterDropDown.svelte`
- Enhanced mit Avatars und Role-Display
- Performance-Optimierung für große Teams
- Mobile-Touch-Optimierung

### Component Integration Pattern
```svelte
<!-- Typisches Page-Component Pattern -->
<script lang="ts">
  let facets = $derived.by(() => {
    return computeFacetCount(
      new Map([
        ['assignee', new Map()], // NEU
        ['audience', new Map(audience.options.map((v) => [v as string, 0]))],
        // ... weitere Facets
      ]),
      containers
    );
  });
</script>

<Header {facets} search />
<ContentView {containers} />
```

## 📊 Erfolgsmessung

### Quantitative Metriken

#### Adoption & Usage
- **Adoption Rate**: % der aktiven Nutzer die Assignee-Filter verwenden  
- **Filter Usage**: Durchschnittliche Anzahl Assignee-Filter pro Session
- **Content Coverage**: % der Container mit Assignee-Zuweisungen
- **Query Performance**: Durchschnittliche Response-Zeit für Assignee-Queries

#### Performance Indicators
- **Database Performance**: Query-Zeiten für komplexe Assignee-Filter
- **UI Responsiveness**: Dropdown-Ladezeiten bei großen Teams
- **Mobile Performance**: Touch-Response-Zeiten auf mobilen Geräten

### Qualitative Indikatoren

#### User Experience  
- **User Feedback**: Verbesserung der Workflow-Effizienz (NPS-Score)
- **Support Reduction**: Weniger "Wer ist verantwortlich?"-Tickets
- **Team Collaboration**: Bessere Ownership-Klarheit in Teams
- **Workflow Efficiency**: Reduzierte Zeit für Assignment-Management

#### Business Impact
- **Task Completion**: Verbesserte Task-Completion-Raten
- **Accountability**: Klarere Verantwortlichkeiten in Projekten
- **Team Coordination**: Bessere Koordination zwischen Team-Mitgliedern

### Success Criteria
- [ ] **80%+ Adoption** Rate innerhalb 3 Monaten nach Rollout
- [ ] **<500ms Query Response** für Assignee-gefilterte Anfragen
- [ ] **95%+ User Satisfaction** in Post-Release Umfragen
- [ ] **50%+ Reduction** in Assignment-bezogenen Support-Tickets

## 🚀 Rollout-Strategie

### Phase 1: Internal Beta (1 Woche)
- **Zielgruppe**: Interne Entwicklungs-Teams
- **Scope**: Task-Assignee-Filterung  
- **Ziel**: Basic Functionality Validation

### Phase 2: Power User Preview (2 Wochen)
- **Zielgruppe**: Erfahrene Nutzer aus 3-5 Pilot-Organisationen
- **Scope**: Goals & Measures Assignee-Filterung
- **Ziel**: Real-World Usage Feedback

### Phase 3: Full Feature Release (1 Woche)
- **Zielgruppe**: Alle aktiven Organisationen
- **Scope**: Complete Assignee-Filter-Suite
- **Ziel**: Mainstream Adoption

### Phase 4: Mobile & Advanced Features (2 Wochen)
- **Zielgruppe**: Mobile-First Nutzer
- **Scope**: Mobile UX + Advanced Assignment Features  
- **Ziel**: Platform Completeness

## 🔄 Wartung & Weiterentwicklung

### Monitoring & Maintenance
- **Performance Monitoring**: Kontinuierliche Query-Performance-Überwachung
- **Usage Analytics**: Monatliche Adoption- und Usage-Reports
- **Bug Tracking**: Dedicated Assignee-Filter Issue-Pipeline
- **User Feedback**: Regelmäßige UX-Feedback-Collection

### Future Enhancements
- **AI-Powered Assignments**: Machine Learning für intelligente Zuweisungsvorschläge
- **Team-Based Filtering**: Filterung nach Teams/Gruppen statt nur Einzelpersonen
- **External Integration**: API für externe System-Anbindung (JIRA, etc.)
- **Advanced Analytics**: Assignment-Pattern-Analysis und Recommendations

## 🎯 Fazit

Die geplante Assignee/Verantwortlichen-Filter-Erweiterung baut optimal auf der bestehenden, robusten Filter-Architektur von knot-dots auf. Durch die systematische Phasen-weise Implementation wird das Risiko minimiert und gleichzeitig ein signifikanter Mehrwert für die Nutzer geschaffen.

### Technische Stärken
- **Bestehende Infrastruktur**: Wiederverwendung bewährter Filter-Patterns
- **Performance-Optimiert**: JSONB-Indizes für effiziente Queries
- **Skalierbar**: Unterstützt große Organisationen mit vielen Nutzern
- **Maintainable**: Konsistente Code-Patterns und Abstractions

### Business Value
- **Produktivitätssteigerung**: Effizientere Aufgaben- und Verantwortlichkeitsverwaltung
- **Transparenz**: Klare Ownership-Strukturen in allen Content-Typen
- **Collaboration**: Verbesserte Team-Koordination und Kommunikation
- **Scalability**: Unterstützt Organisationswachstum und Team-Expansion

### Nächste Schritte
1. **Stakeholder-Alignment**: Review und Approval des Feature-Plans
2. **Technical Spike**: Performance-Validierung mit Production-ähnlichen Datenmengen
3. **Design System Update**: UI-Component-Library-Erweiterung
4. **Sprint Planning**: Detaillierte Task-Breakdown für Phase 1

Das Feature etabliert knot-dots als führende Plattform für transparente, personalisierte Nachhaltigkeits-Governance in kommunalen und organisationalen Kontexten.