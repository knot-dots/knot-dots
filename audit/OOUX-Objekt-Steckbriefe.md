# OOUX Objekt-Steckbriefe: knot-dots Plattform

**Erstellt am:** 2025-10-10
**Basis:** OOUX-ORCA-Dokumentation v1.0
**Zweck:** Detaillierte Steckbriefe für alle primären und sekundären Objekte

---

## Inhaltsverzeichnis

### Primäre Objekte
1. [PROGRAM](#1-program)
2. [GOAL](#2-goal)
3. [MEASURE](#3-measure)
4. [SIMPLE_MEASURE](#4-simple_measure)
5. [INDICATOR](#5-indicator)
6. [INDICATOR_TEMPLATE](#6-indicator_template)
7. [OBJECTIVE](#7-objective)
8. [EFFECT](#8-effect)
9. [TASK](#9-task)
10. [RESOURCE](#10-resource)
11. [RULE](#11-rule)
12. [KNOWLEDGE](#12-knowledge)
13. [TEXT](#13-text)
14. [ORGANIZATION](#14-organization)
15. [ORGANIZATIONAL_UNIT](#15-organizational_unit)
16. [USER](#16-user)
17. [PAGE](#17-page)

### Sekundäre Objekte (Sections)
18. [CAROUSEL SECTION](#18-carousel-section)
19. [TEXT SECTION](#19-text-section)
20. [FILE UPLOAD SECTION](#20-file-upload-section)
21. [PROGRESS SECTION](#21-progress-section)
22. [BADGE SECTION](#22-badge-section)
23. [PROPERTY GRID SECTION](#23-property-grid-section)

---

# Primäre Objekte

---

## 1. PROGRAM

### 1.1 Objekt-Übersicht

**Objektname:** PROGRAM (Programm)

**Objekttyp:** ☑ Core Object | ☐ Supporting Object | ☐ Pivot Object

**Beschreibung:**
Übergeordnete Strategiedokumente oder Handlungsprogramme (z.B. Nachhaltigkeitsstrategie, Mobilitätskonzept, ISEK). Programme dienen als Haupteinstiegspunkt für strategische Planung und strukturieren Ziele, Maßnahmen und Regeln in hierarchischer Form.

**Business Value:**
- Zentrale Organisationseinheit für kommunale Strategiearbeit
- Strukturierung und Bündelung von strategischen Inhalten
- Haupteinstiegspunkt für Stakeholder und politische Entscheidungsträger
- Dokumentation von Strategie-PDFs und begleitenden Materialien
- Langfristige Planungsgrundlage für nachhaltige Entwicklung

---

### 1.2 Core Content & Attribute

#### 1.2.1 Primäre Attribute

| Attribut | Typ | Required | Default | Beschreibung |
|----------|-----|----------|---------|--------------|
| title | String | ✓ | - | Titel des Programms (z.B. "Nachhaltigkeitsstrategie 2030") |
| programType | Enum | ✓ | "misc" | Typ des Programms (siehe mögliche Werte) |
| level | Enum | ✓ | "level.local" | Verwaltungsebene (lokal, regional, national, etc.) |
| chapterType | Array<Enum> | ✗ | [goal, knowledge, measure, rule, simple_measure, text] | Erlaubte Kapiteltypen |
| image | URL | ✗ | - | Cover-Bild URL (S3-Storage) |
| pdf | Array<[URL, String]> | ✗ | [] | Array von PDF-Dokumenten mit Labels |
| audience | Array<Enum> | ✓ | ["audience.citizens"] | Zielgruppen |
| category | Array<Enum> | ✗ | [] | SDG-Kategorien (17 SDGs) |
| topic | Array<Enum> | ✗ | [] | Themenfelder (Mobilität, Energie, etc.) |
| policyFieldBNK | Array<Enum> | ✗ | [] | Politikfelder nach BNK-Standard |
| visibility | Enum | ✓ | "organization" | Sichtbarkeitsebene |
| aiSuggestion | Boolean | ✗ | false | Von KI vorgeschlagen |
| editorialState | Enum | ✗ | - | Redaktioneller Status |

#### 1.2.2 Metadata-Attribute

| Attribut | Typ | Required | Default | Beschreibung |
|----------|-----|----------|---------|--------------|
| guid | UUID | ✓ | auto | Eindeutige ID |
| revision | Integer | ✓ | auto | Versionsnummer |
| organization | UUID | ✓ | - | Zugehörige Organisation |
| organizational_unit | UUID/null | ✗ | null | Zugehörige Organisationseinheit |
| managed_by | UUID | ✓ | - | Verwaltender Container |
| realm | String | ✓ | - | Keycloak Realm |
| valid_from | Timestamp | ✓ | now() | Gültig ab |
| valid_currently | Boolean | ✓ | true | Aktuell gültig |

#### 1.2.3 Attribute - Mögliche Werte

**programType:**
- Typ: Enum
- Mögliche Werte:
  - `program_type.misc` - Sonstiges (Default)
  - `program_type.mobility` - Mobilität
  - `program_type.sustainability` - Nachhaltigkeit
  - `program_type.smart_city` - Smart City
  - `program_type.isek` - ISEK (Integriertes Stadtentwicklungskonzept)
  - `program_type.report` - Bericht
  - `program_type.set_of_rules` - Regelwerk
  - `program_type.package_of_measures` - Maßnahmenpaket
  - `program_type.funding_program` - Förderprogramm
  - `program_type.guide` - Leitfaden

**level:**
- Typ: Enum
- Mögliche Werte:
  - `level.global` - Global
  - `level.multi_lateral` - Multilateral
  - `level.national` - National
  - `level.state` - Bundesland
  - `level.regional` - Regional
  - `level.local` - Lokal (Default)

**visibility:**
- Typ: Enum
- Mögliche Werte:
  - `public` - Öffentlich (für alle sichtbar)
  - `organization` - Organisation (Default, für alle Mitglieder)
  - `members` - Mitglieder (nur für direkt zugeordnete Mitglieder)
  - `creator` - Ersteller (nur für Ersteller + Admins)

---

### 1.3 Relationships (MCSFD-Analyse)

#### Relationship 1: is-part-of-program (Kapitel)

**Verbundenes Objekt:** Goal, Measure, Simple_Measure, Rule, Knowledge, Text

**Mechanics (M):**
- ☑ Has Many
- ☐ Belongs To
- ☐ Many-to-Many
- ☑ Nested (hierarchisch)
- ☐ Referenced

**Cardinality (C):**
- Von Program: 1:n (ein Program hat mehrere Kapitel)
- Zu Kapiteln: n:1 (mehrere Kapitel gehören zu einem Program)
- Minimum: 0
- Maximum: unbegrenzt

**Sorting (S):**
- Standard-Sortierung: Position (position-Feld aufsteigend)
- Verfügbare Sortieroptionen:
  - Position (Drag & Drop-Reihenfolge)
  - Alphabetisch (nach Titel)
  - Nach Typ (nach chapterType gruppiert)

**Filtering (F):**
- Verfügbare Filter:
  - Nach Typ (chapterType: Goal, Measure, etc.)
  - Nach Status (für Measures: idea, in_planning, etc.)
  - Nach Kategorie (SDGs)
  - Nach Thema (topics)
- Standard-Filter: Alle chapterTypes anzeigen

**Dependencies (D):**
- Abhängig von: chapterType-Einstellung im Program
- Auswirkungen bei Löschung: Cascade-Delete (alle Kapitel werden gelöscht)
- Validierungsregeln: Kapitel müssen erlaubtem chapterType entsprechen
- Business Rules: Nur Admins/Heads können chapterType ändern

**Darstellung:**
- ☑ Liste (in Tabellenansicht)
- ☐ Grid/Cards
- ☐ Tabelle
- ☐ Tree/Hierarchie
- ☐ Timeline
- ☑ Andere: Kapitel-basierte Ansicht (Preview-Modus mit EditableChapter-Komponenten)

---

#### Relationship 2: managed-by

**Verbundenes Objekt:** Organization, Organizational_Unit

**Mechanics (M):**
- ☐ Has One/Many
- ☑ Belongs To
- ☐ Many-to-Many
- ☐ Nested
- ☑ Referenced

**Cardinality (C):**
- Von Program: n:1 (ein Program gehört zu einer Organization/OE)
- Zu Organization: 1:n
- Minimum: 1 (muss immer zugeordnet sein)
- Maximum: 1

**Sorting (S):**
- Standard-Sortierung: Nicht sortierbar (single reference)

**Filtering (F):**
- Verfügbare Filter:
  - Nach Organization
  - Nach Organizational_Unit
  - Nach übergeordneten/untergeordneten OEs
- Standard-Filter: Aktuelle Organization/OE

**Dependencies (D):**
- Abhängig von: Existenz der Organization/OE
- Auswirkungen bei Löschung: Restrict (Program kann nicht gelöscht werden, wenn Organization existiert)
- Validierungsregeln: managed_by muss existierende Organization/OE sein
- Business Rules: Nur Admins können managed_by ändern

**Darstellung:**
- ☐ Liste
- ☐ Grid/Cards
- ☐ Tabelle
- ☐ Tree/Hierarchie
- ☐ Timeline
- ☑ Andere: Property Grid (Metadaten-Anzeige)

---

#### Relationship 3: is-member-of (Mitglieder)

**Verbundenes Objekt:** User

**Mechanics (M):**
- ☑ Has Many
- ☐ Belongs To
- ☑ Many-to-Many
- ☐ Nested
- ☑ Referenced

**Cardinality (C):**
- Von Program: 1:n (ein Program kann mehrere Mitglieder haben)
- Zu User: n:m (User können Mitglieder mehrerer Programme sein)
- Minimum: 0
- Maximum: unbegrenzt

**Sorting (S):**
- Standard-Sortierung: Alphabetisch nach Namen
- Verfügbare Sortieroptionen:
  - Nach Name (alphabetisch)
  - Nach Rolle (Admin, Collaborator, Head, Member)
  - Nach Hinzufügedatum

**Filtering (F):**
- Verfügbare Filter:
  - Nach Rolle (is-admin-of, is-collaborator-of, is-head-of, is-member-of)
  - Nach Status (aktiv/inaktiv)
- Standard-Filter: Alle Mitglieder

**Dependencies (D):**
- Abhängig von: User-Account existiert in Keycloak
- Auswirkungen bei Löschung: Set Null (User-Relation wird entfernt)
- Validierungsregeln: User muss in Organization existieren
- Business Rules: Nur Admins/Heads können Mitglieder einladen

**Darstellung:**
- ☑ Liste (Members-Overlay)
- ☐ Grid/Cards
- ☑ Tabelle (mit Rollen-Anzeige)
- ☐ Tree/Hierarchie
- ☐ Timeline
- ☐ Andere

---

### 1.4 Actions & Interaktionen

#### 1.4.1 CRUD-Operationen

| Action | Verfügbar | Berechtigung | Bedingungen | Validierung |
|--------|-----------|--------------|-------------|-------------|
| Create | ✓ | Sysadmin, Admin, Head | In eigener Org/OE | title required |
| Read | ✓ | Basiert auf visibility | - | - |
| Update | ✓ | Sysadmin, Admin, Head, Collaborator (nur in managed programs) | - | title required, chapterType nur von Admins änderbar |
| Delete | ✓ | Sysadmin, Admin, Head | Keine is-part-of Dependencies als Object | Soft Delete (valid_currently=false) |

#### 1.4.2 Custom Actions

| Action-Name | Beschreibung | Trigger | Berechtigung | Side Effects |
|-------------|--------------|---------|--------------|--------------|
| Upload Image | Cover-Bild hochladen | File-Upload in UI | Admin, Head | S3-Upload, image-URL wird gesetzt |
| Upload PDF | Strategie-PDF hochladen | File-Upload in UI | Admin, Head | S3-Upload, pdf-Array wird erweitert |
| Create Chapter | Neues Kapitel hinzufügen | Plus-Button in UI | Admin, Head, Collaborator | Neues Container-Objekt wird erstellt mit is-part-of-program Relation |
| Reorder Chapters | Kapitel neu sortieren | Drag & Drop | Admin, Head, Collaborator | position-Werte werden aktualisiert |
| Invite Members | Mitglieder einladen | Members-Overlay | Admin, Head | User-Relation wird erstellt, Keycloak-Gruppe aktualisiert |
| Change Chapter Types | Erlaubte Kapiteltypen ändern | Edit chapterType | Admin | chapterType-Array wird aktualisiert |

#### 1.4.3 Bulk-Operations

- ☐ Bulk Create
- ☐ Bulk Update
- ☐ Bulk Delete
- ☑ Bulk Export (implizit via API)
- ☐ Custom

Bedingungen: Bulk-Operationen sind aktuell nicht in der UI implementiert, können aber über API durchgeführt werden.

---

### 1.5 States & Lifecycle

#### 1.5.1 Objekt-States

Programme haben keinen expliziten Status-Lifecycle, nutzen aber editorial_state:

```
[draft]
    ↓ [Bearbeitung abgeschlossen]
[requires_post_qualification]
    ↓ [Nachqualifizierung starten]
[in_post_qualification]
    ↓ [Freigabe]
[approved]
```

Alternativ:
```
[approved]
    ↓ [Ablehnung]
[rejected]
```

#### 1.5.2 State-Details

| State | Beschreibung | Verfügbare Actions | Berechtigungen | Automatische Übergänge |
|-------|--------------|-------------------|----------------|----------------------|
| draft | Entwurf, noch in Bearbeitung | Create, Update, Delete, Upload | Admin, Head, Collaborator | - |
| requires_post_qualification | Benötigt Nachqualifizierung | Update, Upload | Admin, Head | - |
| in_post_qualification | In Nachqualifizierung | Update | Admin, Head | - |
| approved | Freigegeben | Read, Update (eingeschränkt) | Alle (basierend auf visibility) | - |
| rejected | Abgelehnt | Read, Delete | Admin, Head | - |

---

### 1.6 UI/UX Spezifikationen

#### 1.6.1 Darstellungs-Ansichten

**List View:**
- Angezeigt: Title, Program Type, Level, SDG-Badges, Topics, Anzahl Kapitel
- Primary Action: Klick öffnet Detail View (Overlay)
- Quick Actions: Edit (wenn berechtigt), Delete (wenn berechtigt), Duplicate

**Detail View:**
- Layout: Zwei Modi verfügbar
  - **Preview-Modus** (`view_mode.preview`): Kapitel-basierte Ansicht mit EditableChapter-Komponenten
  - **Tabellen-Modus** (`view_mode.table`): Alle Kapitel in Tabellenform mit drag-enabled Sortierung
- Sections:
  - Header: Title, Type, Level (EditableProgramType)
  - Metadata: ProgramProperties-Komponente (Badges, Audience, etc.)
  - Chapters: Liste der Kapitel (EditableChapter oder EditableRow)
  - Files: PDF-Upload-Section, Image-Upload
- Tab-Struktur: Keine Tabs, alle Sections in einer Ansicht

**Edit View:**
- Form-Struktur: Inline-Editing in Detail View
- Required Indicators: Stern (*) bei Pflichtfeldern
- Validation Timing: On-submit (Auto-Save nach 2000ms Inaktivität via autoSave-Funktion)

#### 1.6.2 Access Patterns

Wie greifen User auf dieses Objekt zu?
- ☑ Direkt über Navigation (ProgramsPage)
- ☑ Über Suche (Volltext-Suche in Titel, Beschreibung)
- ☑ Über Related Objects (von Measures/Goals via is-part-of-program)
- ☑ Über Dashboard/Shortcuts (Workspaces)
- ☐ Andere

---

### 1.7 Business Rules & Constraints

#### 1.7.1 Validierungsregeln

| Regel | Typ | Fehlermeldung | Severity |
|-------|-----|---------------|----------|
| Title required | Required | "Titel ist erforderlich" | Error |
| Program Type valid | Enum | "Ungültiger Programmtyp" | Error |
| Level valid | Enum | "Ungültige Verwaltungsebene" | Error |
| Image URL valid | Format | "Ungültige Bild-URL" | Error |
| PDF URL valid | Format | "Ungültige PDF-URL" | Error |
| Chapter Type must be allowed | Logic | "Kapiteltyp nicht erlaubt" | Error |

#### 1.7.2 Business Constraints

- Nur ein Standard-Program pro Organization möglich (wenn default=true)
- chapterType kann nur von Admins geändert werden (verhindert Breaking Changes)
- managed_by kann nur von Admins geändert werden
- Programme können nicht gelöscht werden, wenn Kapitel existieren (mit is-part-of-program)
- Minimum 0, Maximum unbegrenzt Kapitel

#### 1.7.3 Permissions Matrix

| Role | Create | Read | Update | Delete | Upload | Invite Members |
|------|--------|------|--------|--------|--------|----------------|
| Sysadmin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Admin | ✓ | ✓ | ✓ | ✓ (ohne Deps) | ✓ | ✓ |
| Head | ✓ | ✓ | ✓ | ✓ (ohne Deps) | ✓ | ✓ |
| Collaborator | ✗ | ✓ | ✓ (eingeschränkt) | ✗ | ✓ | ✗ |
| Member | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Public | ✗ | ✓ (wenn visibility=public) | ✗ | ✗ | ✗ | ✗ |

---

### 1.8 Technische Implementierung

**Datenmodell:**
- Container mit payload.type = "program"
- Payload-Schema: programPayload (Zod-Schema in models.ts)

**Komponenten:**
- `EditableProgram.svelte` - Programm-Auswahl-Dropdown
- `EditableProgramDetailView.svelte` - Hauptansicht mit Kapitel-Management
- `EditableProgramType.svelte` - Programm-Typ-Auswahl
- `ProgramProperties.svelte` - Metadaten-Anzeige
- `ProgramsPage.svelte` - Listen-Ansicht aller Programme
- `ProgramWorkspaces.svelte` - Workspace-Ansicht

**API-Endpunkte:**
- `GET /container?payloadType=program` - Programme abrufen
- `POST /container` - Neues Programm erstellen
- `PUT /container/{guid}` - Programm aktualisieren
- `DELETE /container/{guid}` - Programm löschen (soft delete)
- `POST /container/{guid}/relation` - Kapitel-Reihenfolge ändern

---

### 1.9 Analytics & Metrics

**Relevante Metriken:**
- Anzahl Programme pro Organization
- Anzahl Kapitel pro Programm
- Durchschnittliche Anzahl Mitglieder pro Programm
- Anzahl Downloads (PDFs)
- Häufigste Program Types
- Completion Rate (Programme mit Status "approved")

**Tracking:**
- Erstellungsdatum (valid_from)
- Letzte Änderung (revision)
- Ersteller (is-creator-of Relation)
- Anzahl Revisionen

---

## 2. GOAL

### 2.1 Objekt-Übersicht

**Objektname:** GOAL (Ziel)

**Objekttyp:** ☑ Core Object | ☐ Supporting Object | ☐ Pivot Object

**Beschreibung:**
Strategische oder operative Ziele mit hierarchischer Strukturierung (6 Ebenen). Goals repräsentieren Visionen, Leitbilder, strategische Ziele, operative Ziele, Schlüsselergebnisse und Meilensteine.

**Business Value:**
- Definition und Strukturierung von strategischen Zielen
- Hierarchische Zielverfolgung (OKR-ähnlich)
- Fortschrittsmessung und Visualisierung
- Verknüpfung mit Maßnahmen und Indikatoren
- Langfristige Strategieverfolgung

---

### 2.2 Core Content & Attribute

#### 2.2.1 Primäre Attribute

| Attribut | Typ | Required | Default | Beschreibung |
|----------|-----|----------|---------|--------------|
| title | String | ✓ | - | Titel des Ziels |
| goalType | Enum | ✗ | - | Typ des Ziels (Vision, Leitbild, etc.) |
| hierarchyLevel | Integer (1-6) | ✓ | 1 | Hierarchieebene (1=höchste Ebene) |
| progress | Number (0-100) | ✗ | - | Fortschritt in Prozent |
| fulfillmentDate | Date | ✗ | - | Ziel-Erfüllungsdatum |
| description | String | ✗ | - | Ausführliche Beschreibung |
| summary | String (max 200) | ✗ | - | Kurzzusammenfassung |
| audience | Array<Enum> | ✓ | ["audience.citizens"] | Zielgruppen |
| category | Array<Enum> | ✗ | [] | SDG-Kategorien |
| topic | Array<Enum> | ✗ | [] | Themenfelder |
| policyFieldBNK | Array<Enum> | ✗ | [] | Politikfelder BNK |
| visibility | Enum | ✓ | "organization" | Sichtbarkeit |
| aiSuggestion | Boolean | ✗ | false | Von KI vorgeschlagen |
| editorialState | Enum | ✗ | - | Redaktioneller Status |

#### 2.2.2 Metadata-Attribute

Identisch mit PROGRAM (siehe 1.2.2)

#### 2.2.3 Attribute - Mögliche Werte

**goalType:**
- Typ: Enum
- Mögliche Werte:
  - `goal_type.vision` - Vision
  - `goal_type.model` - Leitbild
  - `goal_type.long_term_goal` - Langfristziel
  - `goal_type.topic_area` - Themenfeld
  - `goal_type.policy_field` - Politikfeld
  - `goal_type.strategic_goal` - Strategisches Ziel
  - `goal_type.objective` - Zielvorgabe
  - `goal_type.key_result` - Schlüsselergebnis (OKR)
  - `goal_type.key_performance_indicator` - Leistungsindikator (KPI)
  - `goal_type.operational_goal` - Operatives Ziel
  - `goal_type.milestone` - Meilenstein

**hierarchyLevel:**
- Typ: Integer (1-6)
- Bedeutung:
  - 1: Höchste Ebene (Vision, Leitbild)
  - 2-3: Strategische Ebene
  - 4-5: Operative Ebene
  - 6: Detail-Ebene (Meilensteine)
- Validierung: Muss zwischen 1 und 6 liegen

---

### 2.3 Relationships (MCSFD-Analyse)

#### Relationship 1: is-part-of-program (Programm-Zuordnung)

**Verbundenes Objekt:** Program

**Mechanics (M):**
- ☐ Has One/Many
- ☑ Belongs To
- ☐ Many-to-Many
- ☑ Nested
- ☑ Referenced

**Cardinality (C):**
- Von Goal: n:1 (ein Goal gehört zu einem Program)
- Zu Program: 1:n
- Minimum: 0 (kann auch standalone sein)
- Maximum: 1

**Sorting (S):**
- Standard-Sortierung: Position (position-Feld)
- Verfügbare Sortieroptionen:
  - Position (Kapitel-Reihenfolge)
  - Alphabetisch

**Filtering (F):**
- Verfügbare Filter:
  - Nach Program
  - Nach Programm-Typ
- Standard-Filter: Aktuelles Programm

**Dependencies (D):**
- Abhängig von: Program existiert
- Auswirkungen bei Löschung: Cascade (Goal wird gelöscht wenn Program gelöscht wird)
- Validierungsregeln: Program muss "goal" in chapterType haben
- Business Rules: managed_by wird vom Program übernommen

**Darstellung:**
- ☑ Liste (in Program-Kapiteln)
- ☐ Grid/Cards
- ☐ Tabelle
- ☑ Tree/Hierarchie (in hierarchischer Ansicht)
- ☐ Timeline
- ☐ Andere

---

#### Relationship 2: is-sub-target-of (Zielhierarchie)

**Verbundenes Objekt:** Goal

**Mechanics (M):**
- ☑ Has Many (Parent-Goal hat mehrere Sub-Goals)
- ☑ Belongs To (Sub-Goal gehört zu Parent-Goal)
- ☐ Many-to-Many
- ☑ Nested (rekursive Hierarchie)
- ☑ Referenced

**Cardinality (C):**
- Von Goal (Child): n:1 (ein Ziel kann ein Oberziel haben)
- Zu Goal (Parent): 1:n (ein Ziel kann mehrere Unterziele haben)
- Minimum: 0
- Maximum: unbegrenzt

**Sorting (S):**
- Standard-Sortierung: Position + Hierarchy Level
- Verfügbare Sortieroptionen:
  - Nach Hierarchieebene
  - Nach Position
  - Alphabetisch

**Filtering (F):**
- Verfügbare Filter:
  - Nach Hierarchieebene
  - Nach Goal Type
  - Nach Progress-Status
- Standard-Filter: Alle anzeigen

**Dependencies (D):**
- Abhängig von: Parent-Goal existiert
- Auswirkungen bei Löschung: Set Null (Sub-Goals werden zu Top-Level-Goals)
- Validierungsregeln: Keine zirkulären Referenzen
- Business Rules: Sub-Goals erben Organisation und Programm-Zuordnung

**Darstellung:**
- ☐ Liste
- ☐ Grid/Cards
- ☐ Tabelle
- ☑ Tree/Hierarchie (rekursive Hierarchie)
- ☐ Timeline
- ☐ Andere

---

#### Relationship 3: is-measured-by (Indikator-Zuordnung)

**Verbundenes Objekt:** Indicator

**Mechanics (M):**
- ☑ Has Many
- ☐ Belongs To
- ☑ Many-to-Many
- ☐ Nested
- ☑ Referenced

**Cardinality (C):**
- Von Goal: 1:n (ein Goal kann mehrere Indikatoren haben)
- Zu Indicator: n:m (Indikatoren können mehrere Goals messen)
- Minimum: 0
- Maximum: unbegrenzt

**Sorting (S):**
- Standard-Sortierung: Alphabetisch nach Indikator-Titel
- Verfügbare Sortieroptionen:
  - Nach Indikator-Typ
  - Nach Kategorie
  - Nach letzter Aktualisierung

**Filtering (F):**
- Verfügbare Filter:
  - Nach Indikator-Typ (Impact, Performance, Key)
  - Nach Kategorie (KPI, MPSC, SDG, Custom)
  - Nach Messeinheit
- Standard-Filter: Alle anzeigen

**Dependencies (D):**
- Abhängig von: Indicator existiert
- Auswirkungen bei Löschung: Set Null (Relation wird entfernt)
- Validierungsregeln: Indicator muss in gleicher Organization sein
- Business Rules: Nur Admins/Collaborators können Indikatoren zuordnen

**Darstellung:**
- ☑ Liste (Indicator-Carousel)
- ☑ Grid/Cards (in Detail-View)
- ☐ Tabelle
- ☐ Tree/Hierarchie
- ☐ Timeline
- ☐ Andere

---

#### Relationship 4: contributes-to (Beitrags-Beziehung)

**Verbundenes Objekt:** Goal (höherer Ebene), Indicator, Measure

**Mechanics (M):**
- ☐ Has One/Many
- ☑ Belongs To
- ☑ Many-to-Many
- ☐ Nested
- ☑ Referenced

**Cardinality (C):**
- Von Goal: n:m (Goals können zu mehreren anderen Goals beitragen)
- Zu Goal/Indicator/Measure: n:m
- Minimum: 0
- Maximum: unbegrenzt

**Sorting (S):**
- Standard-Sortierung: Alphabetisch
- Verfügbare Sortieroptionen:
  - Nach Typ
  - Nach Relevanz

**Filtering (F):**
- Verfügbare Filter:
  - Nach Objekttyp (Goal, Indicator, Measure)
  - Nach Status
- Standard-Filter: Alle Typen

**Dependencies (D):**
- Abhängig von: Ziel-Objekt existiert
- Auswirkungen bei Löschung: Set Null
- Validierungsregeln: Keine zirkulären Abhängigkeiten
- Business Rules: Visualisiert Wirkungsketten

**Darstellung:**
- ☑ Liste (Relations-Overlay)
- ☐ Grid/Cards
- ☐ Tabelle
- ☑ Tree/Hierarchie (Wirkungsketten-Visualisierung)
- ☐ Timeline
- ☐ Andere

---

### 2.4 Actions & Interaktionen

#### 2.4.1 CRUD-Operationen

| Action | Verfügbar | Berechtigung | Bedingungen | Validierung |
|--------|-----------|--------------|-------------|-------------|
| Create | ✓ | Sysadmin, Admin, Head, Collaborator (in Programs) | - | title required, hierarchyLevel 1-6 |
| Read | ✓ | Basiert auf visibility | - | - |
| Update | ✓ | Sysadmin, Admin, Head, Collaborator | - | title required, hierarchyLevel 1-6, progress 0-100 |
| Delete | ✓ | Sysadmin, Admin, Head | Keine is-part-of/is-sub-target-of als Object | Soft Delete |

#### 2.4.2 Custom Actions

| Action-Name | Beschreibung | Trigger | Berechtigung | Side Effects |
|-------------|--------------|---------|--------------|--------------|
| Update Progress | Fortschritt aktualisieren | Progress-Slider in UI | Admin, Head, Collaborator | progress-Wert wird aktualisiert, Auto-Save |
| Add Sub-Goal | Unterziel hinzufügen | Plus-Button in Hierarchie | Admin, Head, Collaborator | Neues Goal mit is-sub-target-of Relation, hierarchyLevel+1 |
| Link Indicator | Indikator verknüpfen | Indicator-Carousel Plus-Button | Admin, Head, Collaborator | is-measured-by Relation erstellt |
| Set Fulfillment Date | Erfüllungsdatum setzen | Date-Picker | Admin, Head, Collaborator | fulfillmentDate wird gesetzt |
| Change Goal Type | Zieltyp ändern | Dropdown | Admin, Head | goalType wird aktualisiert |

#### 2.4.3 Bulk-Operations

- ☐ Bulk Create
- ☑ Bulk Update (Progress für mehrere Goals)
- ☐ Bulk Delete
- ☑ Bulk Export
- ☐ Custom

---

### 2.5 States & Lifecycle

Goals haben keinen expliziten Status-Lifecycle, nutzen aber Progress und Editorial State:

#### 2.5.1 Progress-basierter Lifecycle

```
[Nicht begonnen] (progress = 0 oder undefined)
    ↓ [Fortschritt eingeben]
[In Arbeit] (progress > 0 && progress < 100)
    ↓ [Fortschritt aktualisieren]
[Abgeschlossen] (progress = 100)
```

#### 2.5.2 Editorial State Lifecycle

```
[draft]
    ↓ [Fertigstellung]
[requires_post_qualification]
    ↓ [Nachqualifizierung]
[in_post_qualification]
    ↓ [Freigabe]
[approved]
```

---

### 2.6 UI/UX Spezifikationen

#### 2.6.1 Darstellungs-Ansichten

**List View:**
- Angezeigt: Title, Goal Type, Hierarchy Level, Progress Bar, SDG-Badges, Topics, Fulfillment Date
- Primary Action: Klick öffnet Detail View
- Quick Actions: Edit Progress, Edit, Delete, Add Sub-Goal

**Detail View:**
- Layout: Vertikal mit Sections
- Sections:
  - Header: Title, Goal Type, Hierarchy Level
  - Progress Section: EditableProgress-Komponente
  - Metadata: Property Grid (Fulfillment Date, Audience, etc.)
  - Badges: SDGs, Topics, Policy Fields
  - Description: Text Section (EditableFormattedText)
  - Sub-Goals: Hierarchie-Ansicht oder Liste
  - Objectives: Carousel Section (EditableObjectiveCarousel)
  - Indicators: Carousel oder Liste
  - Relations: Contributes-to, Is-consistent-with
- Tab-Struktur: Keine Tabs, scrollbare Single-Page

**Edit View:**
- Form-Struktur: Inline-Editing
- Required Indicators: Title (*)
- Validation Timing: On-submit (Auto-Save nach 2000ms)

#### 2.6.2 Access Patterns

- ☑ Direkt über Navigation (Goals-Page)
- ☑ Über Suche (Volltext)
- ☑ Über Related Objects (von Program-Kapiteln, Sub-Goals)
- ☑ Über Dashboard/Shortcuts
- ☑ Andere: Hierarchische Ansicht (Tree-View)

---

### 2.7 Business Rules & Constraints

#### 2.7.1 Validierungsregeln

| Regel | Typ | Fehlermeldung | Severity |
|-------|-----|---------------|----------|
| Title required | Required | "Titel ist erforderlich" | Error |
| Hierarchy Level 1-6 | Range | "Hierarchieebene muss zwischen 1 und 6 liegen" | Error |
| Progress 0-100 | Range | "Fortschritt muss zwischen 0 und 100% liegen" | Error |
| Fulfillment Date valid | Date | "Ungültiges Datum" | Error |
| No circular is-sub-target-of | Logic | "Zirkuläre Zielhierarchie nicht erlaubt" | Error |

#### 2.7.2 Business Constraints

- Sub-Goals erben hierarchyLevel = Parent.hierarchyLevel + 1
- Goals in Programs müssen "goal" in chapterType haben
- Progress kann nur von berechtigten Nutzern geändert werden
- Fulfillment Date sollte in der Zukunft liegen (Warnung, kein Error)

#### 2.7.3 Permissions Matrix

| Role | Create | Read | Update | Delete | Update Progress | Add Sub-Goal |
|------|--------|------|--------|--------|----------------|--------------|
| Sysadmin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Head | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Collaborator | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ |
| Member | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |

---

### 2.8 Technische Implementierung

**Datenmodell:**
- Container mit payload.type = "goal"
- Payload-Schema: goalPayload (Zod)

**Komponenten:**
- `EditableGoal.svelte` - Goal-Auswahl
- `EditableGoalType.svelte` - Goal-Typ-Auswahl
- `EditableProgress.svelte` - Fortschrittsbalken
- `EditableObjectiveCarousel.svelte` - Zielvorgaben-Carousel

**API-Endpunkte:**
- `GET /container?payloadType=goal`
- `POST /container` (type=goal)
- `PUT /container/{guid}`
- `DELETE /container/{guid}`

---

### 2.9 Analytics & Metrics

**Relevante Metriken:**
- Durchschnittlicher Progress pro Goal Type
- Anzahl Goals pro Hierarchy Level
- Completion Rate (Goals mit progress=100)
- Anzahl Sub-Goals pro Parent-Goal
- Time-to-Complete (Erstellt bis Abgeschlossen)

---

## 3. MEASURE

### 3.1 Objekt-Übersicht

**Objektname:** MEASURE (Maßnahme)

**Objekttyp:** ☑ Core Object | ☐ Supporting Object | ☐ Pivot Object

**Beschreibung:**
Konkrete Handlungsmaßnahmen zur Zielerreichung mit umfassendem Tracking von Status, Zeitrahmen, Ressourcen, Effekten und Aufgaben. Measures sind komplexe Aktionsobjekte mit Lebenszyklusmanagement.

**Business Value:**
- Umsetzung strategischer Ziele in konkrete Aktionen
- Ressourcenplanung und Budget-Tracking
- Wirkungsmessung und Impact-Analyse
- Projektmanagement für kommunale Initiativen
- Wiederverwendbare Vorlagen (Templates)

---

### 3.2 Core Content & Attribute

#### 3.2.1 Primäre Attribute

| Attribut | Typ | Required | Default | Beschreibung |
|----------|-----|----------|---------|--------------|
| title | String | ✓ | - | Titel der Maßnahme |
| description | String | ✗ | - | Ausführliche Beschreibung |
| summary | String (max 200) | ✗ | - | Kurzzusammenfassung |
| status | Enum | ✓ | "status.idea" | Umsetzungsstatus |
| startDate | Date | ✗ | - | Startdatum |
| endDate | Date | ✗ | - | Enddatum |
| measureType | Array<Enum> | ✗ | [] | Maßnahmen-Typen (App, KI, etc.) |
| annotation | String | ✗ | - | Anmerkungen in Planungsphase |
| comment | String | ✗ | - | Kommentare während Umsetzung |
| result | String | ✗ | - | Ergebnisbeschreibung nach Abschluss |
| resource | Array<Object> | ✗ | [] | Ressourcen-Array mit Beschreibung, Menge, Einheit, Datum |
| template | Boolean | ✗ | false | Als Vorlage markiert |
| audience | Array<Enum> | ✓ | ["audience.citizens"] | Zielgruppen |
| category | Array<Enum> | ✗ | [] | SDG-Kategorien |
| topic | Array<Enum> | ✗ | [] | Themenfelder |
| policyFieldBNK | Array<Enum> | ✗ | [] | Politikfelder BNK |
| visibility | Enum | ✓ | "organization" | Sichtbarkeit |
| aiSuggestion | Boolean | ✗ | false | Von KI vorgeschlagen |
| editorialState | Enum | ✗ | - | Redaktioneller Status |

#### 3.2.2 Resource-Objekt-Struktur

```typescript
{
  description: String,  // z.B. "Personalkosten"
  amount: Number,       // z.B. 50000
  unit: String,         // z.B. "Euro"
  fulfillmentDate: Date // Wann wird Ressource benötigt
}
```

#### 3.2.3 Attribute - Mögliche Werte

**status:**
- Typ: Enum
- Mögliche Werte:
  - `status.idea` - Idee (Default)
  - `status.in_planning` - In Planung
  - `status.in_implementation` - In Umsetzung
  - `status.in_operation` - In Betrieb
  - `status.done` - Abgeschlossen
  - `status.rejected` - Abgelehnt

**measureType:**
- Typ: Array<Enum>
- Mögliche Werte:
  - `measure_type.app` - App
  - `measure_type.artificial_intelligence` - Künstliche Intelligenz
  - `measure_type.cyber_security` - Cybersecurity
  - `measure_type.data_visualization` - Datenvisualisierung
  - `measure_type.digital_platform` - Digitale Plattform
  - `measure_type.digital_twin` - Digitaler Zwilling
  - `measure_type.management_tools` - Management-Tools
  - `measure_type.network_infrastructure` - Netzinfrastruktur
  - `measure_type.planning` - Planung
  - `measure_type.sensory` - Sensorik
  - `measure_type.smart_grid` - Smart Grid
  - `measure_type.user_participation` - Bürgerbeteiligung
  - `measure_type.virtual_reality` - Virtual Reality

---

### 3.3 Relationships (MCSFD-Analyse)

#### Relationship 1: is-part-of-program (Programm-Zuordnung)

**Verbundenes Objekt:** Program

**Mechanics (M):**
- ☐ Has One/Many
- ☑ Belongs To
- ☐ Many-to-Many
- ☑ Nested
- ☑ Referenced

**Cardinality (C):**
- Von Measure: n:1
- Zu Program: 1:n
- Minimum: 0
- Maximum: 1

**Sorting (S):**
- Standard-Sortierung: Position
- Verfügbare Sortieroptionen:
  - Position
  - Alphabetisch
  - Nach Status
  - Nach Startdatum

**Filtering (F):**
- Verfügbare Filter:
  - Nach Program
  - Nach Status
  - Nach Measure Type
- Standard-Filter: Aktuelles Programm

**Dependencies (D):**
- Abhängig von: Program existiert und erlaubt "measure" in chapterType
- Auswirkungen bei Löschung: Cascade
- Validierungsregeln: Program muss measure erlauben
- Business Rules: managed_by = Program.guid

**Darstellung:**
- ☑ Liste (in Program-Kapiteln)
- ☑ Grid/Cards
- ☑ Tabelle
- ☐ Tree/Hierarchie
- ☐ Timeline
- ☐ Andere

---

#### Relationship 2: is-part-of-measure (Measure-Monitoring-Elemente)

**Verbundenes Objekt:** Effect, Resource, Task, Goal

**Mechanics (M):**
- ☑ Has Many
- ☐ Belongs To
- ☐ Many-to-Many
- ☑ Nested
- ☑ Referenced

**Cardinality (C):**
- Von Measure: 1:n (eine Measure hat mehrere Monitoring-Elemente)
- Zu Monitoring-Elementen: n:1
- Minimum: 0
- Maximum: unbegrenzt

**Sorting (S):**
- Standard-Sortierung: Position
- Verfügbare Sortieroptionen:
  - Nach Typ (Effect, Resource, Task, Goal)
  - Alphabetisch
  - Nach Status (bei Tasks)

**Filtering (F):**
- Verfügbare Filter:
  - Nach Typ
  - Nach Status (bei Tasks)
  - Nach Assignee (bei Tasks)
- Standard-Filter: Alle Typen

**Dependencies (D):**
- Abhängig von: Measure existiert
- Auswirkungen bei Löschung: Cascade (alle is-part-of-measure Elemente werden gelöscht)
- Validierungsregeln: Elemente müssen in gleicher Organization sein
- Business Rules: managed_by = Measure.guid

**Darstellung:**
- ☑ Liste (EditablePartOfMeasureCarousel)
- ☑ Grid/Cards (Carousel-Ansicht)
- ☐ Tabelle
- ☐ Tree/Hierarchie
- ☐ Timeline
- ☐ Andere

---

#### Relationship 3: contributes-to (Zielbeitrag)

**Verbundenes Objekt:** Goal

**Mechanics (M):**
- ☐ Has One/Many
- ☑ Belongs To
- ☑ Many-to-Many
- ☐ Nested
- ☑ Referenced

**Cardinality (C):**
- Von Measure: n:m (eine Measure kann zu mehreren Goals beitragen)
- Zu Goal: n:m (ein Goal kann von mehreren Measures unterstützt werden)
- Minimum: 0
- Maximum: unbegrenzt

**Sorting (S):**
- Standard-Sortierung: Alphabetisch
- Verfügbare Sortieroptionen:
  - Nach Goal Type
  - Nach Hierarchy Level
  - Nach Progress

**Filtering (F):**
- Verfügbare Filter:
  - Nach Goal Type
  - Nach Hierarchy Level
  - Nach SDG-Kategorie
- Standard-Filter: Alle Goals

**Dependencies (D):**
- Abhängig von: Goal existiert
- Auswirkungen bei Löschung: Set Null
- Validierungsregeln: Keine
- Business Rules: Visualisiert Wirkungsketten

**Darstellung:**
- ☑ Liste (Relations-Overlay)
- ☐ Grid/Cards
- ☐ Tabelle
- ☑ Tree/Hierarchie (Wirkungsketten)
- ☐ Timeline
- ☐ Andere

---

#### Relationship 4: is-consistent-with / is-inconsistent-with (Querbeziehungen)

**Verbundenes Objekt:** Measure

**Mechanics (M):**
- ☐ Has One/Many
- ☐ Belongs To
- ☑ Many-to-Many
- ☐ Nested
- ☑ Referenced

**Cardinality (C):**
- Von Measure: n:m
- Zu Measure: n:m
- Minimum: 0
- Maximum: unbegrenzt

**Sorting (S):**
- Standard-Sortierung: Alphabetisch
- Verfügbare Sortieroptionen:
  - Nach Status
  - Nach Measure Type

**Filtering (F):**
- Verfügbare Filter:
  - Nur Konsistente (is-consistent-with)
  - Nur Inkonsistente (is-inconsistent-with)
- Standard-Filter: Alle

**Dependencies (D):**
- Abhängig von: Andere Measure existiert
- Auswirkungen bei Löschung: Set Null
- Validierungsregeln: Keine Selbstreferenz
- Business Rules: Symmetrische Beziehung (wenn A konsistent mit B, dann B konsistent mit A)

**Darstellung:**
- ☑ Liste (Relations-Overlay)
- ☑ Grid/Cards
- ☐ Tabelle
- ☐ Tree/Hierarchie
- ☐ Timeline
- ☐ Andere

---

### 3.4 Actions & Interaktionen

#### 3.4.1 CRUD-Operationen

| Action | Verfügbar | Berechtigung | Bedingungen | Validierung |
|--------|-----------|--------------|-------------|-------------|
| Create | ✓ | Sysadmin, Admin, Head, Collaborator | - | title required |
| Read | ✓ | Basiert auf visibility | - | - |
| Update | ✓ | Sysadmin, Admin, Head, Collaborator | - | title required, status valid, dates valid |
| Delete | ✓ | Sysadmin, Admin, Head | Keine is-part-of-measure als Object | Soft Delete |

#### 3.4.2 Custom Actions

| Action-Name | Beschreibung | Trigger | Berechtigung | Side Effects |
|-------------|--------------|---------|--------------|--------------|
| Update Status | Status ändern | Status-Dropdown | Admin, Head, Collaborator | status wird aktualisiert, Phase-spezifische Felder (annotation/comment/result) werden sichtbar |
| Add Resource | Ressource hinzufügen | Plus-Button in Resource-Section | Admin, Head, Collaborator | resource-Array wird erweitert |
| Add Task | Aufgabe hinzufügen | Plus-Button in Task-Carousel | Admin, Head, Collaborator | Neue Task mit is-part-of-measure Relation |
| Add Effect | Effekt hinzufügen | Plus-Button in Effect-Carousel | Admin, Head, Collaborator | Neuer Effect mit is-part-of-measure Relation |
| Link Goal | Ziel verknüpfen | Relate-Dialog | Admin, Head, Collaborator | contributes-to Relation erstellt |
| Save as Template | Als Vorlage speichern | Template-Button | Admin, Head | template=true, Kopie wird erstellt |
| Use Template | Aus Vorlage erstellen | Template-Auswahl | Admin, Head, Collaborator | Kopie mit is-copy-of Relation, status=idea, dates zurückgesetzt |

#### 3.4.3 Bulk-Operations

- ☐ Bulk Create
- ☑ Bulk Update (Status für mehrere Measures)
- ☐ Bulk Delete
- ☑ Bulk Export
- ☐ Custom

---

### 3.5 States & Lifecycle

#### 3.5.1 Objekt-States

```
[idea]
    ↓ [Planung starten]
[in_planning] (annotation-Feld wird relevant)
    ↓ [Umsetzung starten]
[in_implementation] (comment-Feld wird relevant)
    ↓ [In Betrieb nehmen]
[in_operation] (result-Feld wird relevant)
    ↓ [Abschließen]
[done]
```

Alternativ:
```
[idea/in_planning/in_implementation]
    ↓ [Ablehnen]
[rejected]
```

#### 3.5.2 State-Details

| State | Beschreibung | Verfügbare Actions | Berechtigungen | Phase-spezifische Felder |
|-------|--------------|-------------------|----------------|--------------------------|
| idea | Idee, noch nicht in Planung | Create, Update, Delete, Relate | Admin, Head, Collaborator | - |
| in_planning | In Planungsphase | Update, Delete, Relate, Add Resources | Admin, Head, Collaborator | annotation (Anmerkungen) |
| in_implementation | In Umsetzung | Update, Relate, Add Tasks/Effects | Admin, Head, Collaborator | comment (Kommentare) |
| in_operation | In Betrieb | Update, Relate | Admin, Head, Collaborator | result (Ergebnisse) |
| done | Abgeschlossen | Read, Update (eingeschränkt) | Alle | result (Ergebnisse) |
| rejected | Abgelehnt | Read, Delete | Admin, Head | - |

---

### 3.6 UI/UX Spezifikationen

#### 3.6.1 Darstellungs-Ansichten

**List View:**
- Angezeigt: Title, Status (Badge), Measure Type, Duration (Start-End), SDG-Badges, Topics, Resources (Anzahl), Tasks (Anzahl)
- Primary Action: Klick öffnet Detail View
- Quick Actions: Edit Status, Edit, Delete, Duplicate

**Detail View:**
- Layout: Multi-Section scrollbare Ansicht
- Sections:
  - Header: Title, Status, Measure Type
  - Metadata: Property Grid (Start Date, End Date, Audience, etc.)
  - Badges: SDGs, Topics, Policy Fields, Measure Types
  - Description: Text Section (EditableFormattedText)
  - Annotation: Text Section (sichtbar in Planungsphase)
  - Comment: Text Section (sichtbar während Umsetzung)
  - Result: Text Section (sichtbar nach Abschluss)
  - Resources: Editable Resource-Liste
  - Effects: Carousel Section (EditablePartOfMeasureCarousel)
  - Tasks: Carousel Section (EditableTaskCarousel)
  - Goals: Carousel Section (verknüpfte Ziele via contributes-to)
  - Relations: Liste der Querbeziehungen (is-consistent-with, is-inconsistent-with)
- Tab-Struktur: Keine Tabs

**Edit View:**
- Form-Struktur: Inline-Editing
- Required Indicators: Title (*)
- Validation Timing: On-submit (Auto-Save nach 2000ms)

#### 3.6.2 Access Patterns

- ☑ Direkt über Navigation (Measures-Page)
- ☑ Über Suche
- ☑ Über Related Objects (von Program, Goals)
- ☑ Über Dashboard/Shortcuts (Measure-Monitoring-Board)
- ☑ Andere: Template-Katalog

---

### 3.7 Business Rules & Constraints

#### 3.7.1 Validierungsregeln

| Regel | Typ | Fehlermeldung | Severity |
|-------|-----|---------------|----------|
| Title required | Required | "Titel ist erforderlich" | Error |
| Status valid | Enum | "Ungültiger Status" | Error |
| End Date after Start Date | Logic | "Enddatum muss nach Startdatum liegen" | Error |
| Resource amount valid | Number | "Ungültige Menge" | Error |
| Resource date valid | Date | "Ungültiges Datum" | Error |

#### 3.7.2 Business Constraints

- Resources: Minimum 0, Maximum unbegrenzt
- Tasks/Effects/Goals: Nur in verwalteten Measures (managed_by = current measure)
- Template-Measures können kopiert werden (Copy-Funktion)
- Status-Änderungen nur in aufsteigender Reihenfolge (außer rejected)

#### 3.7.3 Permissions Matrix

| Role | Create | Read | Update | Delete | Add Resources | Add Tasks/Effects | Save as Template |
|------|--------|------|--------|--------|---------------|-------------------|------------------|
| Sysadmin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Head | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Collaborator | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ |
| Member | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |

---

### 3.8 Technische Implementierung

**Datenmodell:**
- Container mit payload.type = "measure"
- Payload-Schema: measurePayload (Zod)

**Komponenten:**
- `EditableMeasure.svelte`
- `EditableMeasureDetailView.svelte`
- `EditableMeasureType.svelte`
- `EditablePartOfMeasureCarousel.svelte`
- `EditableResource.svelte`
- `MeasureMonitoring.svelte`

**API-Endpunkte:**
- `GET /container?payloadType=measure`
- `POST /container` (type=measure)
- `PUT /container/{guid}`
- `DELETE /container/{guid}`

---

### 3.9 Analytics & Metrics

**Relevante Metriken:**
- Anzahl Measures pro Status
- Durchschnittliche Duration (Start bis Ende)
- Resource-Budget gesamt/pro Measure
- Task-Completion-Rate
- Effect-Achievement-Rate
- Template-Usage-Count

---

## 4. SIMPLE_MEASURE

### 4.1 Objekt-Übersicht

**Objektname:** SIMPLE_MEASURE (Einfache Maßnahme)

**Objekttyp:** ☑ Core Object | ☐ Supporting Object | ☐ Pivot Object

**Beschreibung:**
Vereinfachte Version einer Maßnahme mit Fokus auf Fortschrittsverfolgung. Reduziert Komplexität durch Weglassen der Measure-Monitoring-Elemente (Effects, Resources, Tasks werden nicht als separate Container verwaltet).

**Business Value:**
- Schnelles Erfassen von einfachen Maßnahmen
- Reduzierte Komplexität für kleinere Projekte
- Fortschrittsverfolgung ohne umfangreiches Projektmanagement
- Dateianhänge für Dokumentation
- Leichtgewichtige Alternative zu MEASURE

---

### 4.2 Core Content & Attribute

#### 4.2.1 Primäre Attribute

| Attribut | Typ | Required | Default | Beschreibung |
|----------|-----|----------|---------|--------------|
| title | String | ✓ | - | Titel der Maßnahme |
| description | String | ✗ | - | Ausführliche Beschreibung |
| status | Enum | ✓ | "status.idea" | Umsetzungsstatus |
| progress | Number (0-100) | ✓ | 0 | Fortschritt in Prozent |
| startDate | Date | ✗ | - | Startdatum |
| endDate | Date | ✗ | - | Enddatum |
| measureType | Array<Enum> | ✗ | [] | Maßnahmen-Typen |
| annotation | String | ✗ | - | Anmerkungen |
| file | Array<[URL, String]> | ✗ | [] | Dateianhänge mit Labels |
| resource | Array<Object> | ✗ | [] | Inline-Ressourcen (nicht als separate Container) |
| audience | Array<Enum> | ✓ | ["audience.citizens"] | Zielgruppen |
| category | Array<Enum> | ✗ | [] | SDG-Kategorien |
| topic | Array<Enum> | ✗ | [] | Themenfelder |
| policyFieldBNK | Array<Enum> | ✗ | [] | Politikfelder BNK |
| visibility | Enum | ✓ | "organization" | Sichtbarkeit |
| aiSuggestion | Boolean | ✗ | false | Von KI vorgeschlagen |
| editorialState | Enum | ✗ | - | Redaktioneller Status |

#### 4.2.2 Unterschiede zu MEASURE

**Fehlt in SIMPLE_MEASURE:**
- ❌ summary (Kurzzusammenfassung)
- ❌ comment (separate Kommentar-Phase)
- ❌ result (separate Ergebnis-Phase)
- ❌ template (Template-Flag)

**Zusätzlich in SIMPLE_MEASURE:**
- ✅ progress (Fortschrittsbalken 0-100%)
- ✅ file (Dateianhänge direkt im Payload)

**Konzeptionelle Unterschiede:**
- SIMPLE_MEASURE hat **keine is-part-of-measure Beziehungen** (keine separaten Effect/Resource/Task-Container)
- Resources sind **inline im Payload** (nicht als separate Container)
- Fokus auf **Progress-Tracking** statt umfassendem Projektmanagement

---

### 4.3 Relationships (MCSFD-Analyse)

#### Relationship 1: is-part-of-program (Programm-Zuordnung)

Identisch mit MEASURE (siehe 3.3, Relationship 1)

---

#### Relationship 2: contributes-to (Zielbeitrag)

Identisch mit MEASURE (siehe 3.3, Relationship 3)

---

#### Relationship 3: is-consistent-with / is-inconsistent-with

Identisch mit MEASURE (siehe 3.3, Relationship 4)

---

### 4.4 Actions & Interaktionen

#### 4.4.1 CRUD-Operationen

| Action | Verfügbar | Berechtigung | Bedingungen | Validierung |
|--------|-----------|--------------|-------------|-------------|
| Create | ✓ | Sysadmin, Admin, Head, Collaborator | - | title required |
| Read | ✓ | Basiert auf visibility | - | - |
| Update | ✓ | Sysadmin, Admin, Head, Collaborator | - | title required, progress 0-100 |
| Delete | ✓ | Sysadmin, Admin, Head | Keine Dependencies | Soft Delete |

#### 4.4.2 Custom Actions

| Action-Name | Beschreibung | Trigger | Berechtigung | Side Effects |
|-------------|--------------|---------|--------------|--------------|
| Update Progress | Fortschritt aktualisieren | Progress-Slider | Admin, Head, Collaborator | progress-Wert aktualisiert |
| Update Status | Status ändern | Status-Dropdown | Admin, Head, Collaborator | status aktualisiert |
| Upload File | Datei hochladen | File-Upload-Zone | Admin, Head, Collaborator | file-Array erweitert, S3-Upload |
| Add Resource | Inline-Ressource hinzufügen | Plus-Button | Admin, Head, Collaborator | resource-Array erweitert |
| Link Goal | Ziel verknüpfen | Relate-Dialog | Admin, Head, Collaborator | contributes-to Relation |

#### 4.4.3 Bulk-Operations

- ☐ Bulk Create
- ☑ Bulk Update (Status, Progress)
- ☐ Bulk Delete
- ☑ Bulk Export
- ☐ Custom

---

### 4.5 States & Lifecycle

#### 4.5.1 Objekt-States

Identisch mit MEASURE, aber vereinfacht:

```
[idea]
    ↓
[in_planning]
    ↓
[in_implementation] (Progress wird aktualisiert)
    ↓
[in_operation]
    ↓
[done] (Progress = 100%)
```

---

### 4.6 UI/UX Spezifikationen

#### 4.6.1 Darstellungs-Ansichten

**List View:**
- Angezeigt: Title, Status Badge, Progress Bar, Measure Type, Duration, SDG-Badges
- Primary Action: Klick öffnet Detail View
- Quick Actions: Edit Progress, Edit Status, Edit, Delete

**Detail View:**
- Layout: Simplified Multi-Section
- Sections:
  - Header: Title, Status, Measure Type
  - Progress Section: EditableProgress (prominent)
  - Metadata: Property Grid (Dates, Audience, etc.)
  - Badges: SDGs, Topics, Policy Fields, Measure Types
  - Description: Text Section
  - Annotation: Text Section
  - Resources: Inline-Liste (nicht als Carousel)
  - Files: File Upload Section
  - Goals: Liste der verknüpften Ziele
- Tab-Struktur: Keine Tabs

**Edit View:**
- Form-Struktur: Inline-Editing
- Required Indicators: Title (*), Progress (Slider)
- Validation Timing: On-submit (Auto-Save)

#### 4.6.2 Access Patterns

- ☑ Direkt über Navigation (Measures-Page, gefiltert)
- ☑ Über Suche
- ☑ Über Related Objects (von Program)
- ☑ Über Dashboard/Shortcuts
- ☐ Andere

---

### 4.7 Business Rules & Constraints

#### 4.7.1 Validierungsregeln

| Regel | Typ | Fehlermeldung | Severity |
|-------|-----|---------------|----------|
| Title required | Required | "Titel ist erforderlich" | Error |
| Progress 0-100 | Range | "Fortschritt muss zwischen 0 und 100% liegen" | Error |
| Status valid | Enum | "Ungültiger Status" | Error |
| File URL valid | Format | "Ungültige Datei-URL" | Error |

#### 4.7.2 Business Constraints

- Progress sollte mit Status konsistent sein (done → progress=100)
- Keine is-part-of-measure Beziehungen erlaubt
- File-Uploads über S3-Storage

#### 4.7.3 Permissions Matrix

Identisch mit MEASURE (siehe 3.7.3)

---

### 4.8 Technische Implementierung

**Datenmodell:**
- Container mit payload.type = "simple_measure"
- Payload-Schema: simpleMeasurePayload (Zod)

**Komponenten:**
- `EditableSimpleMeasure.svelte`
- `EditableSimpleMeasureDetailView.svelte`
- `EditableProgress.svelte`
- File-Upload-Komponenten

**API-Endpunkte:**
- `GET /container?payloadType=simple_measure`
- `POST /container` (type=simple_measure)
- `PUT /container/{guid}`
- `DELETE /container/{guid}`

---

### 4.9 Analytics & Metrics

**Relevante Metriken:**
- Durchschnittlicher Progress pro Status
- Anzahl Simple Measures pro Status
- File-Upload-Count
- Completion Rate (Progress=100 + Status=done)

---

## 5. INDICATOR

### 5.1 Objekt-Übersicht

**Objektname:** INDICATOR (Indikator)

**Objekttyp:** ☑ Core Object | ☐ Supporting Object | ☐ Pivot Object

**Beschreibung:**
Messbare Kennzahlen zur Zielerreichung und Wirkungsmessung mit historischen Werten. Indikatoren quantifizieren Fortschritt und Impact durch Zeitreihen-Daten.

**Business Value:**
- Quantifizierung von Zielerreichung
- Datenbasierte Entscheidungsgrundlagen
- SDG-Monitoring und Berichterstattung
- Langfristige Trendanalyse
- Vergleichbarkeit über Zeit und Organisationen

---

### 5.2 Core Content & Attribute

#### 5.2.1 Primäre Attribute

| Attribut | Typ | Required | Default | Beschreibung |
|----------|-----|----------|---------|--------------|
| title | String | ✓ | - | Titel des Indikators |
| quantity | String | ✓ | - | Messgröße (z.B. "quantity.co2") |
| unit | String | ✓ | - | Messeinheit (z.B. "unit.ton_per_capita") |
| historicalValues | Array<[Year, Value]> | ✗ | [] | Zeitreihe historischer Messwerte [[2020, 5.2], [2021, 4.8], ...] |
| description | String | ✗ | - | Ausführliche Beschreibung |
| summary | String (max 200) | ✗ | - | Kurzzusammenfassung |
| indicatorType | Array<Enum> | ✗ | [] | Indikator-Typen (Impact, Performance, Key) |
| indicatorCategory | Array<Enum> | ✗ | [] | Kategorien (KPI, MPSC, SDG, Custom) |
| measureType | Array<Enum> | ✗ | [] | Zugehörige Maßnahmen-Typen |
| audience | Array<Enum> | ✓ | ["audience.citizens"] | Zielgruppen |
| category | Array<Enum> | ✗ | [] | SDG-Kategorien |
| topic | Array<Enum> | ✗ | [] | Themenfelder |
| policyFieldBNK | Array<Enum> | ✗ | [] | Politikfelder BNK |
| visibility | Enum | ✓ | "organization" | Sichtbarkeit |
| aiSuggestion | Boolean | ✗ | false | Von KI vorgeschlagen |
| editorialState | Enum | ✗ | - | Redaktioneller Status |

#### 5.2.2 historicalValues-Struktur

```typescript
[
  [2020, 5.2],  // [Jahr (Integer), Wert (Number)]
  [2021, 4.8],
  [2022, 4.5]
]
```

- Sortiert nach Jahr (aufsteigend)
- Jahr: Positive Integer (YYYY)
- Wert: Number (kann positiv/negativ, Dezimalzahl sein)

#### 5.2.3 Attribute - Mögliche Werte

**indicatorType:**
- `indicator_type.impact` - Wirkungsindikator
- `indicator_type.performance` - Leistungsindikator
- `indicator_type.key` - Schlüsselindikator

**indicatorCategory:**
- `indicator_category.kpi` - Key Performance Indicator
- `indicator_category.mpsc` - Monitoring Public Service Consumption
- `indicator_category.sdg` - Sustainable Development Goals
- `indicator_category.custom` - Benutzerdefiniert

**quantity (Auswahl):**
- `quantity.co2` - CO2-Emissionen
- `quantity.co2_emissions_households` - CO2-Emissionen Haushalte
- `quantity.co2_emissions_industry` - CO2-Emissionen Industrie
- `quantity.co2_emissions_transport` - CO2-Emissionen Verkehr
- `quantity.renewable_energy` - Erneuerbare Energien
- `quantity.broadband_coverage` - Breitbandabdeckung
- `quantity.charging_stations` - Ladestationen
- `quantity.cycle_path` - Radwege
- `quantity.custom` - Benutzerdefiniert
- (+ weitere 10+ Quantities)

**unit (Auswahl):**
- `unit.ton_per_capita` - Tonnen pro Kopf
- `unit.percent` - Prozent
- `unit.euro` - Euro
- `unit.kilometer` - Kilometer
- `unit.kilowatt_hour` - Kilowattstunde
- (+ weitere 15+ Units)

---

### 5.3 Relationships (MCSFD-Analyse)

#### Relationship 1: is-measured-by (Umkehrung: Messung von Goals/Effects)

**Verbundenes Objekt:** Goal, Effect

**Mechanics (M):**
- ☑ Has Many (ein Indicator misst mehrere Goals/Effects)
- ☐ Belongs To
- ☑ Many-to-Many
- ☐ Nested
- ☑ Referenced

**Cardinality (C):**
- Von Indicator: 1:n (ein Indicator misst mehrere Objekte)
- Zu Goal/Effect: n:m
- Minimum: 0
- Maximum: unbegrenzt

**Sorting (S):**
- Standard-Sortierung: Alphabetisch
- Verfügbare Sortieroptionen:
  - Nach Typ (Goal vs. Effect)
  - Nach Status
  - Nach Progress

**Filtering (F):**
- Verfügbare Filter:
  - Nach Objekttyp
  - Nach Status
  - Nach Kategorie
- Standard-Filter: Alle

**Dependencies (D):**
- Abhängig von: Goal/Effect existiert
- Auswirkungen bei Löschung: Set Null
- Validierungsregeln: Keine
- Business Rules: Indicator kann Goals und Effects gleichzeitig messen

**Darstellung:**
- ☑ Liste (Relations-Overlay)
- ☐ Grid/Cards
- ☐ Tabelle
- ☐ Tree/Hierarchie
- ☐ Timeline
- ☐ Andere

---

#### Relationship 2: is-objective-for (Zielvorgabe)

**Verbundenes Objekt:** Objective

**Mechanics (M):**
- ☑ Has Many (ein Indicator kann mehrere Objectives haben)
- ☐ Belongs To
- ☑ Many-to-Many
- ☐ Nested
- ☑ Referenced

**Cardinality (C):**
- Von Indicator: 1:n
- Zu Objective: n:1 (ein Objective gehört zu einem Indicator)
- Minimum: 0
- Maximum: unbegrenzt

**Sorting (S):**
- Standard-Sortierung: Alphabetisch
- Verfügbare Sortieroptionen:
  - Nach Zieljahr
  - Nach Zielwert

**Filtering (F):**
- Verfügbare Filter:
  - Nach Zeitraum
  - Nach Zielerreichung (Ist vs. Soll)
- Standard-Filter: Alle

**Dependencies (D):**
- Abhängig von: Objective existiert
- Auswirkungen bei Löschung: Cascade (Objectives werden gelöscht)
- Validierungsregeln: Objective muss zu Indicator passen (gleiche unit)
- Business Rules: Objectives definieren Soll-Werte, Indicator liefert Ist-Werte

**Darstellung:**
- ☑ Liste (Objective-Carousel)
- ☑ Grid/Cards
- ☐ Tabelle
- ☐ Timeline (Zeitreihen-Visualisierung)
- ☑ Andere: Chart (Ist-Soll-Vergleich)

---

#### Relationship 3: is-affected-by (Indirekte Wirkung)

**Verbundenes Objekt:** Indicator

**Mechanics (M):**
- ☐ Has One/Many
- ☐ Belongs To
- ☑ Many-to-Many
- ☐ Nested
- ☑ Referenced

**Cardinality (C):**
- Von Indicator: n:m
- Zu Indicator: n:m
- Minimum: 0
- Maximum: unbegrenzt

**Sorting (S):**
- Standard-Sortierung: Alphabetisch
- Verfügbare Sortieroptionen:
  - Nach Kategorie
  - Nach Korrelation (wenn berechnet)

**Filtering (F):**
- Verfügbare Filter:
  - Nach Indicator-Typ
  - Nach Kategorie
- Standard-Filter: Alle

**Dependencies (D):**
- Abhängig von: Andere Indicators existieren
- Auswirkungen bei Löschung: Set Null
- Validierungsregeln: Keine Selbstreferenz
- Business Rules: Modelliert indirekte Wirkungen und Abhängigkeiten

**Darstellung:**
- ☑ Liste (Relations-Overlay)
- ☐ Grid/Cards
- ☐ Tabelle
- ☑ Tree/Hierarchie (Wirkungsnetzwerk)
- ☐ Timeline
- ☐ Andere

---

### 5.4 Actions & Interaktionen

#### 5.4.1 CRUD-Operationen

| Action | Verfügbar | Berechtigung | Bedingungen | Validierung |
|--------|-----------|--------------|-------------|-------------|
| Create | ✓ | Sysadmin, Admin, Head, Collaborator | - | title, quantity, unit required |
| Read | ✓ | Basiert auf visibility | - | - |
| Update | ✓ | Sysadmin, Admin, Head, Collaborator | - | quantity, unit required, indicatorCategory nicht änderbar |
| Delete | ✓ | Sysadmin, Admin, Head | Keine Objectives als Object | Soft Delete |

#### 5.4.2 Custom Actions

| Action-Name | Beschreibung | Trigger | Berechtigung | Side Effects |
|-------------|--------------|---------|--------------|--------------|
| Add Historical Value | Historischen Wert hinzufügen | Plus-Button in Chart | Admin, Head, Collaborator | historicalValues-Array erweitert, sortiert nach Jahr |
| Edit Historical Value | Wert ändern | Inline-Edit in Tabelle | Admin, Head, Collaborator | historicalValues aktualisiert |
| Delete Historical Value | Wert löschen | Delete-Button | Admin, Head, Collaborator | historicalValues-Array reduziert |
| Add Objective | Zielvorgabe hinzufügen | Plus-Button in Objective-Carousel | Admin, Head, Collaborator | Neues Objective mit is-objective-for Relation |
| Link Goal | Goal verknüpfen | Relate-Dialog | Admin, Head, Collaborator | is-measured-by Relation (vom Goal aus) |
| Save as Template | Als Vorlage speichern | Template-Button | Admin, Head | Neuer Indicator_Template ohne historicalValues |
| Import Data | CSV-Import | Import-Button | Admin, Head | historicalValues aus CSV |

#### 5.4.3 Bulk-Operations

- ☑ Bulk Create (CSV-Import)
- ☑ Bulk Update (historicalValues)
- ☐ Bulk Delete
- ☑ Bulk Export (CSV mit Zeitreihen)
- ☐ Custom

---

### 5.5 States & Lifecycle

Indicators haben keinen expliziten Status-Lifecycle, aber einen Daten-Lifecycle:

#### 5.5.1 Daten-Lifecycle

```
[Erstellt] (ohne historicalValues)
    ↓ [Erste Daten erfassen]
[Mit Daten] (historicalValues.length > 0)
    ↓ [Regelmäßige Updates]
[Aktiv gepflegt] (letzte Aktualisierung < 1 Jahr)
    ↓ [Keine Updates mehr]
[Veraltet] (letzte Aktualisierung > 1 Jahr)
```

---

### 5.6 UI/UX Spezifikationen

#### 5.6.1 Darstellungs-Ansichten

**List View:**
- Angezeigt: Title, Quantity, Unit, Letzter Wert (Jahr + Wert), Trend (↑/↓), Indicator Type, Kategorie
- Primary Action: Klick öffnet Detail View
- Quick Actions: Add Value, Edit, Delete, Save as Template

**Detail View:**
- Layout: Data-Focused Layout
- Sections:
  - Header: Title, Quantity, Unit, Indicator Type
  - Chart: Zeitreihen-Visualisierung (Line Chart mit historicalValues)
  - Objectives: Overlay-Chart mit Ist-Soll-Vergleich
  - Metadata: Property Grid (Kategorien, Topics, etc.)
  - Badges: SDGs, Topics, Indicator Types, Categories
  - Description: Text Section
  - Historical Values: Editable Tabelle (Jahr, Wert, Edit, Delete)
  - Objectives: Carousel Section
  - Relations: Goals/Effects die gemessen werden, Affected-by Indicators
- Tab-Struktur: Mögliche Tabs für Chart/Tabelle/Objectives

**Edit View:**
- Form-Struktur: Inline-Editing + Modal für Historical Values
- Required Indicators: Title (*), Quantity (*), Unit (*)
- Validation Timing: On-submit (Auto-Save)

#### 5.6.2 Access Patterns

- ☑ Direkt über Navigation (Indicators-Page, Indicator-Katalog)
- ☑ Über Suche (nach Quantity, Unit, Kategorie)
- ☑ Über Related Objects (von Goals, Effects, Objectives)
- ☑ Über Dashboard/Shortcuts (Indicator-Board)
- ☑ Andere: Catalog (vordefinierte Indicators)

---

### 5.7 Business Rules & Constraints

#### 5.7.1 Validierungsregeln

| Regel | Typ | Fehlermeldung | Severity |
|-------|-----|---------------|----------|
| Title required | Required | "Titel ist erforderlich" | Error |
| Quantity required | Required | "Messgröße ist erforderlich" | Error |
| Unit required | Required | "Messeinheit ist erforderlich" | Error |
| Historical Value year valid | Format | "Jahr muss positive Ganzzahl sein" | Error |
| Historical Value unique year | Uniqueness | "Jahr bereits vorhanden" | Error |
| indicatorCategory not editable | Logic | "Kategorie kann nach Erstellung nicht geändert werden" | Error |

#### 5.7.2 Business Constraints

- indicatorCategory kann nach Erstellung nicht mehr geändert werden
- historicalValues müssen nach Jahr sortiert sein (aufsteigend)
- Jahre müssen unique sein (keine Duplikate)
- Objectives müssen gleiche unit wie Indicator haben

#### 5.7.3 Permissions Matrix

| Role | Create | Read | Update | Delete | Add Value | Add Objective | Save as Template |
|------|--------|------|--------|--------|-----------|---------------|------------------|
| Sysadmin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Head | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Collaborator | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ |
| Member | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |

---

### 5.8 Technische Implementierung

**Datenmodell:**
- Container mit payload.type = "indicator"
- Payload-Schema: indicatorPayload (Zod)

**Komponenten:**
- `EditableIndicator.svelte`
- `EditableIndicatorDetailView.svelte`
- `EditableIndicatorType.svelte`
- `EditableIndicatorCategory.svelte`
- Chart-Komponenten (Line Chart für Zeitreihen)

**API-Endpunkte:**
- `GET /container?payloadType=indicator`
- `POST /container` (type=indicator)
- `PUT /container/{guid}`
- `DELETE /container/{guid}`

---

### 5.9 Analytics & Metrics

**Relevante Metriken:**
- Anzahl Indicators pro Kategorie
- Durchschnittliche Anzahl historicalValues pro Indicator
- Data Coverage (Jahre mit Daten)
- Data Freshness (Zeit seit letztem Update)
- Objective-Achievement-Rate (Ist vs. Soll)

---

## 6. INDICATOR_TEMPLATE

### 6.1 Objekt-Übersicht

**Objektname:** INDICATOR_TEMPLATE (Indikator-Vorlage)

**Objekttyp:** ☐ Core Object | ☑ Supporting Object | ☐ Pivot Object

**Beschreibung:**
Wiederverwendbare Indikator-Vorlagen ohne historische Werte. Dient zur Standardisierung und schnellen Erstellung neuer Indikatoren.

**Business Value:**
- Standardisierung von Indikatoren über Organisationen hinweg
- Schnelle Wiederverwendung etablierter Messgrößen
- Konsistenz in Messmethodik
- Reduzierung von Duplikaten
- Best-Practice-Sharing

---

### 6.2 Core Content & Attribute

#### 6.2.1 Primäre Attribute

| Attribut | Typ | Required | Default | Beschreibung |
|----------|-----|----------|---------|--------------|
| title | String | ✓ | - | Titel des Indikators |
| unit | String | ✓ | - | Messeinheit |
| description | String | ✗ | - | Ausführliche Beschreibung |
| summary | String (max 200) | ✗ | - | Kurzzusammenfassung |
| indicatorType | Array<Enum> | ✗ | [] | Indikator-Typen |
| indicatorCategory | Array<Enum> | ✗ | [] | Kategorien |
| measureType | Array<Enum> | ✗ | [] | Zugehörige Maßnahmen-Typen |
| audience | Array<Enum> | ✓ | ["audience.citizens"] | Zielgruppen |
| category | Array<Enum> | ✗ | [] | SDG-Kategorien |
| topic | Array<Enum> | ✗ | [] | Themenfelder |
| policyFieldBNK | Array<Enum> | ✗ | [] | Politikfelder BNK |
| visibility | Enum | ✓ | "organization" | Sichtbarkeit |
| aiSuggestion | Boolean | ✗ | false | Von KI vorgeschlagen |
| editorialState | Enum | ✗ | - | Redaktioneller Status |

#### 6.2.2 Unterschiede zu INDICATOR

**Fehlt in INDICATOR_TEMPLATE:**
- ❌ historicalValues (keine Zeitreihen-Daten)
- ❌ quantity (wird erst beim Erstellen aus Template festgelegt)

**Zweck:**
- Template definiert nur **Struktur** und **Metadaten**
- Beim Erstellen aus Template wird quantity festgelegt
- Historische Werte werden neu erfasst

---

### 6.3 Relationships (MCSFD-Analyse)

#### Relationship 1: is-copy-of (Template-Verwendung)

**Verbundenes Objekt:** Indicator

**Mechanics (M):**
- ☐ Has One/Many
- ☐ Belongs To
- ☑ Many-to-Many
- ☐ Nested
- ☑ Referenced

**Cardinality (C):**
- Von Indicator_Template: 1:n (ein Template wird von vielen Indicators verwendet)
- Zu Indicator: n:1 (ein Indicator stammt von einem Template)
- Minimum: 0
- Maximum: unbegrenzt

**Sorting (S):**
- Standard-Sortierung: Erstellungsdatum (neueste zuerst)

**Filtering (F):**
- Verfügbare Filter:
  - Nach Template (alle Indicators von diesem Template)
- Standard-Filter: Alle

**Dependencies (D):**
- Abhängig von: Template existiert
- Auswirkungen bei Löschung: Set Null (is-copy-of Relation bleibt, aber Template ist gelöscht)
- Validierungsregeln: Keine
- Business Rules: Tracking von Template-Usage

**Darstellung:**
- ☑ Liste (Usage-Statistik)
- ☐ Grid/Cards
- ☐ Tabelle
- ☐ Tree/Hierarchie
- ☐ Timeline
- ☐ Andere

---

### 6.4 Actions & Interaktionen

#### 6.4.1 CRUD-Operationen

| Action | Verfügbar | Berechtigung | Bedingungen | Validierung |
|--------|-----------|--------------|-------------|-------------|
| Create | ✓ | Sysadmin, Admin, Head | - | title, unit required |
| Read | ✓ | Alle (Templates sind meist public/organization-visible) | - | - |
| Update | ✓ | Sysadmin, Admin, Head | - | title, unit required |
| Delete | ✓ | Sysadmin, Admin, Head | - | Soft Delete |

#### 6.4.2 Custom Actions

| Action-Name | Beschreibung | Trigger | Berechtigung | Side Effects |
|-------------|--------------|---------|--------------|--------------|
| Use Template | Neuen Indicator aus Template erstellen | "Verwenden"-Button | Admin, Head, Collaborator | Neuer Indicator mit is-copy-of Relation, quantity muss festgelegt werden |
| Save from Indicator | Indicator als Template speichern | "Als Vorlage speichern" | Admin, Head | Neuer Indicator_Template ohne quantity/historicalValues |

#### 6.4.3 Bulk-Operations

- ☑ Bulk Create (CSV-Import von Templates)
- ☐ Bulk Update
- ☐ Bulk Delete
- ☑ Bulk Export
- ☐ Custom

---

### 6.5 States & Lifecycle

Indicator_Templates haben einen einfachen Lifecycle:

```
[Erstellt]
    ↓ [Freigabe]
[Verfügbar] (visibility=public/organization)
    ↓ [Veraltet]
[Deprecated] (nicht mehr empfohlen, aber verwendbar)
```

---

### 6.6 UI/UX Spezifikationen

#### 6.6.1 Darstellungs-Ansichten

**List View (Catalog):**
- Angezeigt: Title, Unit, Indicator Type, Category, Usage Count
- Primary Action: "Verwenden"-Button öffnet Create-Dialog
- Quick Actions: Vorschau, Edit, Delete

**Detail View:**
- Layout: Simplified (kein Chart, keine Historical Values)
- Sections:
  - Header: Title, Unit, Indicator Type
  - Metadata: Property Grid
  - Badges: SDGs, Topics, Categories
  - Description: Text Section
  - Usage Statistics: Anzahl erstellter Indicators aus diesem Template
- Tab-Struktur: Keine

**Edit View:**
- Form-Struktur: Standard-Formular
- Required Indicators: Title (*), Unit (*)
- Validation Timing: On-submit

#### 6.6.2 Access Patterns

- ☑ Direkt über Navigation (Indicator-Katalog, Templates-Tab)
- ☑ Über Suche (Template-Suche)
- ☑ Über Related Objects (beim Erstellen neuer Indicators)
- ☐ Über Dashboard/Shortcuts
- ☐ Andere

---

### 6.7 Business Rules & Constraints

#### 6.7.1 Validierungsregeln

| Regel | Typ | Fehlermeldung | Severity |
|-------|-----|---------------|----------|
| Title required | Required | "Titel ist erforderlich" | Error |
| Unit required | Required | "Messeinheit ist erforderlich" | Error |

#### 6.7.2 Business Constraints

- Templates sollten public oder organization-visible sein
- Löschen nur wenn keine aktiven Indicators daraus erstellt wurden (Empfehlung)

#### 6.7.3 Permissions Matrix

| Role | Create | Read | Update | Delete | Use Template |
|------|--------|------|--------|--------|--------------|
| Sysadmin | ✓ | ✓ | ✓ | ✓ | ✓ |
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ |
| Head | ✓ | ✓ | ✓ | ✓ | ✓ |
| Collaborator | ✗ | ✓ | ✗ | ✗ | ✓ |
| Member | ✗ | ✓ | ✗ | ✗ | ✓ |

---

### 6.8 Technische Implementierung

**Datenmodell:**
- Container mit payload.type = "indicator_template"
- Payload-Schema: indicatorTemplatePayload (Zod)

**Komponenten:**
- `IndicatorCatalog.svelte` (zeigt Templates)
- Template-Auswahl-Dialoge

**API-Endpunkte:**
- `GET /container?payloadType=indicator_template`
- `POST /container` (type=indicator_template)
- `PUT /container/{guid}`
- `DELETE /container/{guid}`

---

### 6.9 Analytics & Metrics

**Relevante Metriken:**
- Usage Count (Anzahl Indicators aus Template)
- Most-Used Templates
- Template-Coverage (Anteil Indicators aus Templates)

---

*Fortsetzung folgt mit den restlichen Objekten...*

---

## 7. OBJECTIVE

### 7.1 Objekt-Übersicht

**Objektname:** OBJECTIVE (Zielvorgabe / Soll-Zustand)

**Objekttyp:** ☐ Core Object | ☑ Supporting Object | ☐ Pivot Object

**Beschreibung:**
Quantitative Zielvorgaben für Indikatoren über Zeit. Objectives definieren Soll-Werte (Ziele) für Indikatoren und ermöglichen Ist-Soll-Vergleiche.

**Business Value:**
- Definition messbarer Ziele
- Soll-Ist-Vergleich und Gap-Analyse
- Fortschrittsmessung gegen definierte Targets
- Politische Zielsetzungen quantifizieren
- Transparenz über Zielerreichung

---

### 7.2 Core Content & Attribute

#### 7.2.1 Primäre Attribute

| Attribut | Typ | Required | Default | Beschreibung |
|----------|-----|----------|---------|--------------|
| title | String | ✓ | - | Titel der Zielvorgabe |
| wantedValues | Array<[Year, Value]> | ✗ | [] | Zeitreihe der Soll-Werte [[2025, 4.0], [2030, 3.0], ...] |
| description | String | ✗ | - | Ausführliche Beschreibung |
| audience | Array<Enum> | ✓ | ["audience.citizens"] | Zielgruppen |
| visibility | Enum | ✓ | "organization" | Sichtbarkeit |
| aiSuggestion | Boolean | ✗ | false | Von KI vorgeschlagen |
| editorialState | Enum | ✗ | - | Redaktioneller Status |

**Hinweis:** Objectives haben **keine** category, summary, topic (vereinfachter als andere Objekte)

#### 7.2.2 wantedValues-Struktur

```typescript
[
  [2025, 4.0],  // [Jahr (Integer), Zielwert (Number)]
  [2030, 3.0],
  [2035, 2.5]
]
```

- Sortiert nach Jahr (aufsteigend)
- Jahr: Positive Integer (YYYY), meist Zukunftsjahre
- Wert: Number (muss zur unit des verknüpften Indicators passen)

---

### 7.3 Relationships (MCSFD-Analyse)

#### Relationship 1: is-objective-for (Indikator-Zuordnung)

**Verbundenes Objekt:** Indicator

**Mechanics (M):**
- ☐ Has One/Many
- ☑ Belongs To
- ☐ Many-to-Many
- ☐ Nested
- ☑ Referenced

**Cardinality (C):**
- Von Objective: n:1 (ein Objective gehört zu einem Indicator)
- Zu Indicator: 1:n (ein Indicator kann mehrere Objectives haben)
- Minimum: 1 (Objective muss zu Indicator gehören)
- Maximum: 1

**Sorting (S):**
- Standard-Sortierung: Alphabetisch
- Verfügbare Sortieroptionen:
  - Nach Zieljahr (früheste/späteste)
  - Nach Zielwert

**Filtering (F):**
- Verfügbare Filter:
  - Nach Indicator
  - Nach Zeitraum
- Standard-Filter: Aktueller Indicator

**Dependencies (D):**
- Abhängig von: Indicator existiert
- Auswirkungen bei Löschung: Cascade (Objective wird gelöscht wenn Indicator gelöscht wird)
- Validierungsregeln: wantedValues müssen zur unit des Indicators passen
- Business Rules: Objective definiert Soll-Werte, Indicator liefert Ist-Werte

**Darstellung:**
- ☑ Liste (Objective-Carousel unter Indicator)
- ☑ Grid/Cards
- ☐ Tabelle
- ☐ Tree/Hierarchie
- ☑ Timeline (Zeitreihen-Visualisierung)
- ☑ Andere: Chart (Ist-Soll-Overlay)

---

#### Relationship 2: is-part-of (Goal-Zuordnung, optional)

**Verbundenes Objekt:** Goal

**Mechanics (M):**
- ☐ Has One/Many
- ☑ Belongs To
- ☐ Many-to-Many
- ☑ Nested
- ☑ Referenced

**Cardinality (C):**
- Von Objective: n:1
- Zu Goal: 1:n
- Minimum: 0 (optional)
- Maximum: 1

**Sorting (S):**
- Standard-Sortierung: Position

**Filtering (F):**
- Verfügbare Filter:
  - Nach Goal
- Standard-Filter: Aktuelles Goal

**Dependencies (D):**
- Abhängig von: Goal existiert
- Auswirkungen bei Löschung: Cascade
- Validierungsregeln: Keine
- Business Rules: Objectives können Goals zugeordnet werden für thematische Gruppierung

**Darstellung:**
- ☑ Liste (in Goal-Detail-View)
- ☑ Grid/Cards (Carousel)
- ☐ Tabelle
- ☐ Tree/Hierarchie
- ☐ Timeline
- ☐ Andere

---

### 7.4 Actions & Interaktionen

#### 7.4.1 CRUD-Operationen

| Action | Verfügbar | Berechtigung | Bedingungen | Validierung |
|--------|-----------|--------------|-------------|-------------|
| Create | ✓ | Sysadmin, Admin, Head, Collaborator | Muss zu Indicator gehören | title required, wantedValues valid |
| Read | ✓ | Basiert auf visibility | - | - |
| Update | ✓ | Sysadmin, Admin, Head, Collaborator | - | title required, wantedValues valid |
| Delete | ✓ | Sysadmin, Admin, Head | - | Soft Delete |

#### 7.4.2 Custom Actions

| Action-Name | Beschreibung | Trigger | Berechtigung | Side Effects |
|-------------|--------------|---------|--------------|--------------|
| Add Wanted Value | Soll-Wert hinzufügen | Plus-Button in Chart | Admin, Head, Collaborator | wantedValues-Array erweitert |
| Edit Wanted Value | Wert ändern | Inline-Edit | Admin, Head, Collaborator | wantedValues aktualisiert |
| Delete Wanted Value | Wert löschen | Delete-Button | Admin, Head, Collaborator | wantedValues-Array reduziert |
| Compare with Indicator | Ist-Soll-Vergleich | Chart-Toggle | Alle (Read) | Chart zeigt beide Zeitreihen |

#### 7.4.3 Bulk-Operations

- ☐ Bulk Create
- ☑ Bulk Update (wantedValues)
- ☐ Bulk Delete
- ☑ Bulk Export
- ☐ Custom

---

### 7.5 States & Lifecycle

Objectives haben keinen Status, aber einen Achievement-Lifecycle:

```
[Definiert] (wantedValues festgelegt)
    ↓ [Ist-Werte erfasst]
[Messbar] (Indicator hat historicalValues)
    ↓ [Zieljahr erreicht]
[Erreicht / Verfehlt] (Vergleich Ist vs. Soll)
```

---

### 7.6 UI/UX Spezifikationen

#### 7.6.1 Darstellungs-Ansichten

**List View:**
- Angezeigt: Title, Nächstes Zieljahr, Nächster Zielwert, Achievement-Status (✓/✗ wenn messbar)
- Primary Action: Klick öffnet Detail View (meist im Kontext des Indicators)
- Quick Actions: Edit, Delete

**Detail View:**
- Layout: Integrated in Indicator-Detail-View
- Sections:
  - Header: Title
  - Chart: Zeitreihen-Visualisierung (wantedValues + Indicator.historicalValues)
  - Wanted Values: Editable Tabelle (Jahr, Zielwert, Edit, Delete)
  - Description: Text Section
  - Achievement Analysis: Gap-Analyse (Ist vs. Soll)
- Tab-Struktur: Teil des Indicator-Tabs

**Edit View:**
- Form-Struktur: Inline-Editing + Modal für Wanted Values
- Required Indicators: Title (*)
- Validation Timing: On-submit (Auto-Save)

#### 7.6.2 Access Patterns

- ☐ Direkt über Navigation (Objectives werden nicht standalone navigiert)
- ☐ Über Suche
- ☑ Über Related Objects (von Indicator, Goal)
- ☐ Über Dashboard/Shortcuts
- ☑ Andere: Immer im Kontext eines Indicators

---

### 7.7 Business Rules & Constraints

#### 7.7.1 Validierungsregeln

| Regel | Typ | Fehlermeldung | Severity |
|-------|-----|---------------|----------|
| Title required | Required | "Titel ist erforderlich" | Error |
| Wanted Value year valid | Format | "Jahr muss positive Ganzzahl sein" | Error |
| Wanted Value unique year | Uniqueness | "Jahr bereits vorhanden" | Error |
| Wanted Values match Indicator unit | Logic | "Werte müssen zur Indikator-Einheit passen" | Warning |

#### 7.7.2 Business Constraints

- Objectives müssen zu einem Indicator gehören (is-objective-for)
- wantedValues sollten Zukunftsjahre sein (Warnung bei Vergangenheit)
- Jahre müssen unique sein

#### 7.7.3 Permissions Matrix

| Role | Create | Read | Update | Delete | Add Wanted Value |
|------|--------|------|--------|--------|------------------|
| Sysadmin | ✓ | ✓ | ✓ | ✓ | ✓ |
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ |
| Head | ✓ | ✓ | ✓ | ✓ | ✓ |
| Collaborator | ✓ | ✓ | ✓ | ✗ | ✓ |
| Member | ✗ | ✓ | ✗ | ✗ | ✗ |

---

### 7.8 Technische Implementierung

**Datenmodell:**
- Container mit payload.type = "objective"
- Payload-Schema: objectivePayload (Zod)

**Komponenten:**
- `EditableObjectiveCarousel.svelte` - Carousel unter Goals
- Chart-Komponenten (Ist-Soll-Overlay)

**API-Endpunkte:**
- `GET /container?payloadType=objective`
- `POST /container` (type=objective)
- `PUT /container/{guid}`
- `DELETE /container/{guid}`

---

### 7.9 Analytics & Metrics

**Relevante Metriken:**
- Achievement Rate (% erreichte Objectives)
- Average Gap (Durchschnittliche Abweichung Ist-Soll)
- On-Track Count (Objectives, die on-track sind)

---

## 8. EFFECT

### 8.1 Objekt-Übersicht

**Objektname:** EFFECT (Wirkung / Effekt)

**Objekttyp:** ☐ Core Object | ☑ Supporting Object | ☐ Pivot Object

**Beschreibung:**
Geplante und erreichte Wirkungen von Maßnahmen. Effects ermöglichen die Messung und Dokumentation von Maßnahmen-Impact durch Soll-Ist-Vergleiche.

**Business Value:**
- Wirkungsmessung von Maßnahmen
- Impact-Analyse und Erfolgskontrolle
- Transparenz über Maßnahmen-Effektivität
- Datenbasierte Maßnahmen-Optimierung
- Berichterstattung über Outcomes

---

### 8.2 Core Content & Attribute

#### 8.2.1 Primäre Attribute

| Attribut | Typ | Required | Default | Beschreibung |
|----------|-----|----------|---------|--------------|
| title | String | ✓ | - | Titel der Wirkung |
| plannedValues | Array<[Year, Value]> | ✗ | [] | Zeitreihe geplanter Werte |
| achievedValues | Array<[Year, Value]> | ✗ | [] | Zeitreihe erreichter Werte |
| audience | Array<Enum> | ✓ | ["audience.citizens"] | Zielgruppen |
| visibility | Enum | ✓ | "organization" | Sichtbarkeit |

**Hinweis:** Effects sind sehr schlank - keine description, summary, category, topic, etc.

#### 8.2.2 plannedValues / achievedValues-Struktur

```typescript
plannedValues: [
  [2024, 100],  // [Jahr, Geplanter Wert]
  [2025, 150],
  [2026, 200]
]

achievedValues: [
  [2024, 95],   // [Jahr, Tatsächlicher Wert]
  [2025, 160]   // Noch keine Daten für 2026
]
```

- Sortiert nach Jahr (aufsteigend)
- plannedValues: Prognosen/Planwerte
- achievedValues: Tatsächlich gemessene Werte

---

### 8.3 Relationships (MCSFD-Analyse)

#### Relationship 1: is-part-of-measure (Maßnahmen-Zuordnung)

**Verbundenes Objekt:** Measure, Simple_Measure

**Mechanics (M):**
- ☐ Has One/Many
- ☑ Belongs To
- ☐ Many-to-Many
- ☑ Nested
- ☑ Referenced

**Cardinality (C):**
- Von Effect: n:1 (ein Effect gehört zu einer Measure)
- Zu Measure: 1:n (eine Measure kann mehrere Effects haben)
- Minimum: 1 (muss zu Measure gehören)
- Maximum: 1

**Sorting (S):**
- Standard-Sortierung: Position
- Verfügbare Sortieroptionen:
  - Position (innerhalb Measure)
  - Alphabetisch

**Filtering (F):**
- Verfügbare Filter:
  - Nach Measure
  - Nach Achievement-Status
- Standard-Filter: Aktuelle Measure

**Dependencies (D):**
- Abhängig von: Measure existiert
- Auswirkungen bei Löschung: Cascade (Effect wird gelöscht wenn Measure gelöscht wird)
- Validierungsregeln: Keine
- Business Rules: managed_by = Measure.guid

**Darstellung:**
- ☑ Liste (EditablePartOfMeasureCarousel)
- ☑ Grid/Cards (Carousel-Ansicht)
- ☐ Tabelle
- ☐ Tree/Hierarchie
- ☐ Timeline
- ☐ Andere

---

#### Relationship 2: is-measured-by (Indikator-Zuordnung)

**Verbundenes Objekt:** Indicator

**Mechanics (M):**
- ☐ Has One/Many
- ☑ Belongs To
- ☑ Many-to-Many
- ☐ Nested
- ☑ Referenced

**Cardinality (C):**
- Von Effect: n:m (ein Effect kann von mehreren Indicators gemessen werden)
- Zu Indicator: n:m (ein Indicator kann mehrere Effects messen)
- Minimum: 0
- Maximum: unbegrenzt

**Sorting (S):**
- Standard-Sortierung: Alphabetisch
- Verfügbare Sortieroptionen:
  - Nach Indicator Type
  - Nach Unit

**Filtering (F):**
- Verfügbare Filter:
  - Nach Indicator Type
  - Nach Kategorie
- Standard-Filter: Alle

**Dependencies (D):**
- Abhängig von: Indicator existiert
- Auswirkungen bei Löschung: Set Null
- Validierungsregeln: Keine
- Business Rules: Indicator sollte gleiche unit wie Effect-Werte haben

**Darstellung:**
- ☑ Liste (Relations-Overlay)
- ☐ Grid/Cards
- ☐ Tabelle
- ☐ Tree/Hierarchie
- ☐ Timeline
- ☐ Andere

---

### 8.4 Actions & Interaktionen

#### 8.4.1 CRUD-Operationen

| Action | Verfügbar | Berechtigung | Bedingungen | Validierung |
|--------|-----------|--------------|-------------|-------------|
| Create | ✓ | Sysadmin, Admin, Head, Collaborator | Muss zu Measure gehören | title required |
| Read | ✓ | Basiert auf visibility | - | - |
| Update | ✓ | Sysadmin, Admin, Head, Collaborator | - | title required, values valid |
| Delete | ✓ | Sysadmin, Admin, Head | - | Soft Delete |

#### 8.4.2 Custom Actions

| Action-Name | Beschreibung | Trigger | Berechtigung | Side Effects |
|-------------|--------------|---------|--------------|--------------|
| Add Planned Value | Geplanten Wert hinzufügen | Plus-Button | Admin, Head, Collaborator | plannedValues-Array erweitert |
| Add Achieved Value | Erreichter Wert hinzufügen | Plus-Button | Admin, Head, Collaborator | achievedValues-Array erweitert |
| Edit Value | Wert ändern | Inline-Edit | Admin, Head, Collaborator | Array aktualisiert |
| Delete Value | Wert löschen | Delete-Button | Admin, Head, Collaborator | Array reduziert |
| Link Indicator | Indikator verknüpfen | Relate-Dialog | Admin, Head, Collaborator | is-measured-by Relation |

#### 8.4.3 Bulk-Operations

- ☐ Bulk Create
- ☑ Bulk Update (Values)
- ☐ Bulk Delete
- ☑ Bulk Export
- ☐ Custom

---

### 8.5 States & Lifecycle

Effects haben keinen Status, aber einen Mess-Lifecycle:

```
[Geplant] (nur plannedValues)
    ↓ [Messung beginnen]
[In Messung] (achievedValues werden erfasst)
    ↓ [Vollständig gemessen]
[Abgeschlossen] (alle plannedValues haben entsprechende achievedValues)
```

---

### 8.6 UI/UX Spezifikationen

#### 8.6.1 Darstellungs-Ansichten

**List View:**
- Angezeigt: Title, Letzter geplanter/erreichter Wert, Achievement-Trend (↑/↓)
- Primary Action: Klick öffnet Detail View (im Measure-Kontext)
- Quick Actions: Add Value, Edit, Delete

**Detail View:**
- Layout: Integrated in Measure-Detail-View
- Sections:
  - Header: Title
  - Chart: Soll-Ist-Vergleich (plannedValues vs. achievedValues)
  - Planned Values: Editable Tabelle
  - Achieved Values: Editable Tabelle
  - Linked Indicators: Liste der is-measured-by Relationen
- Tab-Struktur: Teil des Measure-Monitoring-Tabs

**Edit View:**
- Form-Struktur: Inline-Editing + Modal für Values
- Required Indicators: Title (*)
- Validation Timing: On-submit (Auto-Save)

#### 8.6.2 Access Patterns

- ☐ Direkt über Navigation (Effects werden nicht standalone navigiert)
- ☐ Über Suche
- ☑ Über Related Objects (von Measure)
- ☐ Über Dashboard/Shortcuts
- ☑ Andere: Measure-Monitoring-Board

---

### 8.7 Business Rules & Constraints

#### 8.7.1 Validierungsregeln

| Regel | Typ | Fehlermeldung | Severity |
|-------|-----|---------------|----------|
| Title required | Required | "Titel ist erforderlich" | Error |
| Value year valid | Format | "Jahr muss positive Ganzzahl sein" | Error |
| Unique years | Uniqueness | "Jahr bereits vorhanden" | Error |

#### 8.7.2 Business Constraints

- Effects müssen zu einer Measure gehören
- plannedValues und achievedValues sollten gleiche Jahre abdecken (für Vergleichbarkeit)

#### 8.7.3 Permissions Matrix

Identisch mit OBJECTIVE (siehe 7.7.3)

---

### 8.8 Technische Implementierung

**Datenmodell:**
- Container mit payload.type = "effect"
- Payload-Schema: effectPayload (Zod)

**Komponenten:**
- `EditablePartOfMeasureCarousel.svelte` - zeigt Effects
- Chart-Komponenten (Soll-Ist-Vergleich)

**API-Endpunkte:**
- `GET /container?payloadType=effect`
- `POST /container` (type=effect)
- `PUT /container/{guid}`
- `DELETE /container/{guid}`

---

### 8.9 Analytics & Metrics

**Relevante Metriken:**
- Achievement Rate (% erreichte Planned Values)
- Average Deviation (Durchschnittliche Abweichung)
- On-Track Count

---

*Aufgrund der Länge setze ich die Dokumentation in mehreren Teilen fort. Möchten Sie, dass ich fortfahre mit:*

- TASK
- RESOURCE
- RULE
- KNOWLEDGE
- TEXT
- ORGANIZATION
- ORGANIZATIONAL_UNIT
- USER
- PAGE
- Sekundäre Objekte (Sections)

*Oder soll ich anders vorgehen (z.B. kürzere Steckbriefe für die verbleibenden Objekte)?*
