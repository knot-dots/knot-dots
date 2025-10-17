# OOUX/ORCA Dokumentation: knot-dots Plattform

**Erstellt am:** 2025-10-10
**Methodik:** Object-Oriented UX (OOUX) - ORCA Framework
**Version:** 1.0

---

## Inhaltsverzeichnis

1. [Executive Summary](#executive-summary)
2. [Einführung in OOUX/ORCA](#einführung-in-ooux-orca)
3. [Kern-Objekte (Objects)](#kern-objekte-objects)
4. [Beziehungen (Relationships)](#beziehungen-relationships)
5. [Handlungsaufforderungen (CTAs - Calls to Action)](#handlungsaufforderungen-ctas)
6. [Attribute (Attributes)](#attribute-attributes)
7. [User Personas und Rollen](#user-personas-und-rollen)
8. [User Journeys](#user-journeys)
9. [Informationsarchitektur](#informationsarchitektur)
   - [Haupt-Navigation](#haupt-navigation)
   - [Ansichts-Modi](#ansichts-modi)
   - [Navigation Architecture: Workspace-Matrix & View-Patterns](#navigation-architecture-workspace-matrix--view-patterns)
   - [Overlay-System](#overlay-system)
   - [Filter-System](#filter-system)
   - [Suchfunktion](#suchfunktion)
10. [Erkenntnisse und Empfehlungen](#erkenntnisse-und-empfehlungen)

---

## Executive Summary

Die knot-dots Plattform ist ein komplexes Multi-Tenant-System zur Verfolgung und Verwaltung von administrativen Maßnahmen in nachhaltigen Kommunen. Die OOUX/ORCA-Analyse identifiziert **17 primäre Kern-Objekte** sowie **6 sekundäre Objekttypen (Sections)**, die in einem hochgradig vernetzten System mit **20+ Beziehungstypen** interagieren.

### Zentrale Erkenntnisse:

1. **Container-basierte Architektur**: Das Kernkonzept ist ein flexibles "Container"-Objekt mit verschiedenen Payload-Typen, das alle Entitäten vereint
2. **Komplexe Hierarchien**: Das System unterstützt mehrere Hierarchieebenen (Programme → Maßnahmen → Ziele → Aufgaben)
3. **Workspace-Matrix-Navigation**: 9 Objekttypen × 6 View-Pattern ergeben 54 mögliche Workspace-Kombinationen, von denen 28 aktiv implementiert sind
4. **Granulare Berechtigungen**: Vier Benutzerrollen (Admin, Collaborator, Head, Member) mit feingranularen Zugriffsrechten
5. **Revisionsverfolgung**: Vollständige Historie aller Änderungen durch Revisions-System
6. **Multi-Tenancy**: Organisation-basierte Isolation mit Organisationseinheiten

---

## Einführung in OOUX/ORCA

### Was ist OOUX/ORCA?

OOUX (Object-Oriented UX) ist eine Methodik zur Strukturierung digitaler Erlebnisse um erkennbare, greifbare Objekte herum. ORCA steht für die vier Säulen dieser Methodik:

- **O**bjects (Objekte): Die "Dinge" im System, die für Nutzer und Business wertvoll sind
- **R**elationships (Beziehungen): Wie Objekte miteinander verbunden sind
- **C**TAs (Calls-to-Action): Aktionen, die Nutzer auf Objekte ausführen können
- **A**ttributes (Attribute): Eigenschaften, die Objekte definieren

### Die vier Phasen des ORCA-Prozesses:

1. **Discovery (Entdeckung)**: Identifikation von Objekten, Beziehungen und Aktionen
2. **Requirements (Anforderungen)**: Detaillierte Analyse und Dokumentation
3. **Prioritization (Priorisierung)**: Bewertung und Ranking der Elemente
4. **Representation (Darstellung)**: Prototyping und Testing

Diese Dokumentation folgt primär den Phasen 1 und 2.

---

## Kern-Objekte (Objects)

Das knot-dots System basiert auf einem **einheitlichen Container-Konzept** mit unterschiedlichen Payload-Typen. Jeder Container hat gemeinsame Eigenschaften (GUID, Revision, Organisation, etc.) und einen spezifischen Payload-Typ.

### 1. PROGRAM (Programm)

**Beschreibung**: Übergeordnete Strategiedokumente oder Handlungsprogramme (z.B. Nachhaltigkeitsstrategie, Mobilitätskonzept).

**Zweck**:
- Strukturierung von Zielen, Maßnahmen und Regeln
- Haupteinstiegspunkt für strategische Planung
- Kann PDF-Dokumente und Bilder enthalten

**Typen**:
- Sonstiges (misc)
- Mobilität
- Nachhaltigkeit
- Smart City
- ISEK (Integriertes Stadtentwicklungskonzept)
- Bericht
- Regelwerk
- Maßnahmenpaket
- Förderprogramm
- Leitfaden

**Business Value**: Zentrale Organisationseinheit für kommunale Strategiearbeit

---

### 2. GOAL (Ziel)

**Beschreibung**: Strategische oder operative Ziele mit Hierarchieebenen.

**Zweck**:
- Definition von Visionen, Leitbildern, strategischen Zielen
- Hierarchische Strukturierung (6 Ebenen)
- Fortschrittsverfolgung

**Typen**:
- Vision
- Leitbild
- Langfristziel
- Themenfeld
- Politikfeld
- Strategisches Ziel
- Operatives Ziel
- Schlüsselergebnis (Key Result)
- Meilenstein
- Leistungsindikator (KPI)

**Besonderheiten**:
- Hierarchieebenen (1-6)
- Fortschritt in Prozent
- Erfüllungsdatum

---

### 3. MEASURE (Maßnahme)

**Beschreibung**: Konkrete Handlungsmaßnahmen zur Zielerreichung.

**Zweck**:
- Umsetzung von Zielen
- Tracking von Start-/Enddatum, Status, Ressourcen
- Kann als Vorlage verwendet werden

**Status-Optionen**:
- Idee
- In Planung
- In Umsetzung
- In Betrieb
- Abgeschlossen
- Abgelehnt

**Typen**:
- App, KI, Cybersecurity, Datenvisualisierung, Digitale Plattform, Digitaler Zwilling, Management-Tools, Netzinfrastruktur, Planung, Sensorik, Smart Grid, Bürgerbeteiligung, Virtual Reality

---

### 4. SIMPLE_MEASURE (Einfache Maßnahme)

**Beschreibung**: Vereinfachte Version einer Maßnahme mit Fortschrittsanzeige.

**Zweck**:
- Schnelles Erfassen von Maßnahmen
- Fortschrittsverfolgung (0-100%)
- Dateianhänge möglich

**Unterschied zu MEASURE**: Weniger komplex, fokussiert auf Progress-Tracking

---

### 5. INDICATOR (Indikator)

**Beschreibung**: Messbare Kennzahlen zur Zielerreichung und Wirkungsmessung.

**Zweck**:
- Quantifizierung von Fortschritt
- Historische Werteverfolgung
- SDG-Mapping

**Kategorien**:
- KPI (Key Performance Indicator)
- MPSC (Modellprojekte Smart Cities)
- SDG (Sustainable Development Goals)
- Custom (Benutzerdefiniert)

**Typen**:
- Impact (Wirkungsindikator)
- Performance (Leistungsindikator)
- Key (Schlüsselindikator)

**Messgrößen**: CO2, Breitbandabdeckung, Ladestationen, Radwege, Erneuerbare Energien, etc.

---

### 6. INDICATOR_TEMPLATE (Indikator-Vorlage)

**Beschreibung**: Wiederverwendbare Indikator-Vorlagen ohne historische Werte.

**Zweck**:
- Standardisierung von Indikatoren
- Schnelle Wiederverwendung

---

### 7. OBJECTIVE (Zielvorgabe/Soll-Zustand)

**Beschreibung**: Quantitative Zielvorgaben für Indikatoren.

**Zweck**:
- Definition von Soll-Werten über Zeit
- Verknüpfung mit Indikatoren
- Messung der Zielerreichung

---

### 8. EFFECT (Wirkung/Effekt)

**Beschreibung**: Geplante und erreichte Wirkungen von Maßnahmen.

**Zweck**:
- Wirkungsmessung von Maßnahmen
- Vergleich Soll/Ist
- Teil des Measure-Monitoring

**Attribute**:
- Geplante Werte (Zeitreihe)
- Erreichte Werte (Zeitreihe)

---

### 9. TASK (Aufgabe)

**Beschreibung**: Konkrete Arbeitsaufgaben mit Zuständigkeiten.

**Zweck**:
- Aufgabenverwaltung
- Priorisierung
- Zuordnung zu Personen

**Kategorien**:
- Standard
- Programmmanagement
- Bugfix
- Design
- Funktion
- Formulierung

**Status**:
- Idee
- In Planung
- In Bearbeitung
- Erledigt
- Abgelehnt

**Besonderheiten**:
- Priorisierung möglich
- Mehrere Assignees
- Nutzen-Bewertung (niedrig/mittel/hoch)
- Aufwandsschätzung

---

### 10. RESOURCE (Ressource)

**Beschreibung**: Benötigte oder zugewiesene Ressourcen (Personal, Budget, Material).

**Zweck**:
- Ressourcenplanung
- Budget-Tracking
- Kapazitätsmanagement

**Attribute**:
- Menge (amount)
- Einheit (unit)
- Erfüllungsdatum

---

### 11. RULE (Regel/Vorschrift)

**Beschreibung**: Rechtliche oder organisatorische Regelungen.

**Zweck**:
- Compliance-Management
- Verknüpfung von Regeln mit Maßnahmen
- Gültigkeitszeiträume

**Status**:
- Idee
- In Planung
- Verabschiedet
- Abgelehnt

**Zeitbezug**:
- Gültig von (validFrom)
- Gültig bis (validUntil)

---

### 12. KNOWLEDGE (Wissen)

**Beschreibung**: Wissensdokumentation und Best Practices.

**Zweck**:
- Wissensmanagement
- Dokumentation von Erfahrungen
- Organisationslernen

---

### 13. TEXT (Text)

**Beschreibung**: Freie Textinhalte für Dokumentation.

**Zweck**:
- Flexible Inhalte in Programmen
- Dokumentation
- Ergänzende Informationen

---

### 14. ORGANIZATION (Organisation)

**Beschreibung**: Mandanten/Organisationen im Multi-Tenant-System.

**Zweck**:
- Datenisolation
- Zugriffskontrolle
- Mandantenverwaltung

**Kategorien**:
- Business
- Regierung
- Non-Profit
- Politisch

**Besonderheiten**:
- Hat eigene Keycloak-Gruppe
- Kann als Standard-Organisation markiert werden
- Konfigurierbare Boards

---

### 15. ORGANIZATIONAL_UNIT (Organisationseinheit)

**Beschreibung**: Sub-Organisationen innerhalb einer Organisation (z.B. Ämter, Abteilungen).

**Zweck**:
- Hierarchische Organisationsstruktur
- Feinere Zugriffskontrolle
- Abteilungs-/Bereichszuordnung

**Besonderheiten**:
- Mehrere Ebenen möglich
- Vererbung von Berechtigungen

---

### 16. USER (Benutzer)

**Beschreibung**: Systemnutzer mit Keycloak-Integration.

**Zweck**:
- Authentifizierung
- Autorisierung
- Personalisierung

**Attribute**:
- Vor-/Nachname
- E-Mail
- Realm (Keycloak)
- Settings (Features, Präferenzen)

---

### 17. PAGE (Seite)

**Beschreibung**: Statische Content-Seiten (z.B. Impressum, Datenschutz).

**Zweck**:
- CMS-Funktionalität
- Rechtliche Pflichtseiten
- Informationsseiten

**Besonderheiten**:
- URL-Slug
- Markdown-Body
- Öffentliche Sichtbarkeit

---

## Sekundäre Objekttypen: Sections (Abschnitte)

**Beschreibung**: Wiederverwendbare inhaltliche Bausteine, die innerhalb von Primär-Objekten verwendet werden können. Sections sind modulare UI-Komponenten zur flexiblen Strukturierung von Inhalten.

**Charakteristika**:
- Sections sind **keine eigenständigen Container** im Datenmodell
- Sie sind **UI-Komponenten**, die Daten aus Primär-Objekten darstellen
- Können innerhalb von Detail-Views editierbar oder schreibgeschützt sein
- Reagieren auf den Zustand des übergeordneten Objekts
- Ermöglichen kontextuelle Aktionen (Erstellen, Verknüpfen, Navigieren)

---

### 18. CAROUSEL SECTION (Karussell-Abschnitt)

**Beschreibung**: Horizontale scrollbare Galerie von verknüpften Objekten in Kartenansicht.

**Zweck**:
- Darstellung von verknüpften Objekten (Objectives, Resources, Tasks, Goals)
- Schneller Überblick über zugehörige Inhalte
- Kontextuelle Navigation

**Komponenten**:
- `EditableObjectiveCarousel`: Anzeige von Zielvorgaben unter Goals
- `EditablePartOfMeasureCarousel`: Anzeige von Resources/Goals unter Measures
- `EditableTaskCarousel`: Anzeige von Aufgaben

**Features**:
- Inline-Erstellung neuer Objekte (Plus-Button)
- Card-basierte Darstellung mit Hover-Effekten
- Navigation zu Detail-View per Klick
- Filtert `relatedContainers` basierend auf Beziehungen (`is-part-of`, `is-part-of-measure`)

**Verwendung in**:
- Goal (für Objectives)
- Measure/Simple Measure (für Resources, Goals, Tasks)
- Program (indirekt via Chapters)

---

### 19. TEXT SECTION (Text-Abschnitt)

**Beschreibung**: Formatierter Rich-Text-Bereich für längere Textinhalte.

**Zweck**:
- Ausführliche Beschreibungen, Erläuterungen
- Kommentare und Anmerkungen
- Dokumentation von Ergebnissen

**Komponente**: `EditableFormattedText`

**Unterstützte Felder**:
- **Description**: Allgemeine Beschreibung (alle Objekttypen)
- **Body**: Hauptinhalt (Text, Page, Knowledge)
- **Annotation**: Anmerkungen in Planungsphase (Measure)
- **Comment**: Kommentare während Umsetzung (Measure)
- **Result**: Ergebnisbeschreibung nach Abschluss (Measure)

**Features**:
- Markdown/HTML-Formatierung
- Inline-Bearbeitung im Edit-Modus
- Readonly-Ansicht für nicht-editierbare Objekte

**Verwendung in**: Alle Objekttypen mit Textfeldern

---

### 20. FILE UPLOAD SECTION (Datei-Upload-Abschnitt)

**Beschreibung**: Bereich zum Hochladen und Verwalten von Dateien.

**Zweck**:
- Anhängen von Dokumenten (PDFs, Bilder)
- Verknüpfung externer Ressourcen
- Dokumentation und Nachweise

**Features**:
- Drag & Drop Upload
- Dateivorschau
- S3-kompatible Storage-Integration
- Mehrere Dateien pro Objekt

**Unterstützte Dateitypen**:
- PDF-Dokumente
- Bilder (PNG, JPG)
- Weitere Dateiformate

**Verwendung in**:
- Program (PDFs, Bilder)
- Simple Measure (Dateien-Array)
- Andere Objekttypen nach Bedarf

---

### 21. PROGRESS SECTION (Fortschritts-Abschnitt)

**Beschreibung**: Visueller Fortschrittsbalken zur Darstellung des Umsetzungsstands.

**Zweck**:
- Visualisierung des Fortschritts (0-100%)
- Schnelle Erfassung des Umsetzungsstands
- Motivationselement für Teams

**Komponente**: `EditableProgress`

**Darstellungsformen**:
- Kompakt: Nur Balken
- Erweitert: Balken + Prozentzahl
- Editierbar: Mit Eingabefeld

**Verwendung in**:
- Goal (mit `progress`-Attribut)
- Simple Measure (Fortschrittsverfolgung)

---

### 22. BADGE SECTION (Badge-Abschnitt)

**Beschreibung**: Visuelle Tags zur Kategorisierung und Filterung.

**Zweck**:
- Schnelle Kategorisierung
- Visuelle Identifikation
- Filterung und Suche

**Komponente**: `Badges`

**Badge-Typen**:
- **SDGs**: Sustainable Development Goals (17 Ziele, farb-codiert)
- **Topics**: Themenfelder (Mobilität, Energie, Klima, etc.)
- **Policy Fields BNK**: Politikfelder nach BNK-Standard
- **Audience**: Zielgruppen (Verwaltung, Bürger, Unternehmen, etc.)
- **Status**: Umsetzungsstatus (Idee, in Planung, etc.)
- **Types**: Objekt-spezifische Typen

**Features**:
- Farb-codiert für schnelle Erkennung
- Klickbar für Filterung (in manchen Ansichten)
- Mehrfachauswahl möglich
- Internationalisiert

**Verwendung in**: Fast alle Objekttypen mit Kategorisierungsfeldern

---

### 23. PROPERTY GRID SECTION (Eigenschaften-Tabelle)

**Beschreibung**: Strukturierte tabellarische Darstellung von Metadaten.

**Zweck**:
- Übersichtliche Darstellung von Eigenschaften
- Strukturierte Metadaten
- Schneller Zugriff auf Details

**Komponente**: `PropertyGrid`

**Angezeigte Eigenschaften**:
- Datumsangaben (Start, Ende, Erfüllung)
- Status-Informationen
- Kategorien und Typen
- Zuständigkeiten
- Organisationseinheit
- Sichtbarkeitseinstellungen

**Darstellungsformat**:
- Label-Value-Paare
- Grid-Layout für übersichtliche Darstellung
- Bedingte Anzeige (nur wenn Werte vorhanden)

**Verwendung in**: Detail-Views aller Objekttypen

---

### Gemeinsame Eigenschaften aller Sections

**Technische Implementierung**:
- Svelte-Komponenten in `app/src/lib/components/`
- Naming-Pattern: `Editable[FeatureName].svelte` (z.B. `EditableObjectiveCarousel.svelte`)
- Props: `container`, `editable`, `relatedContainers`
- Verwendung von `$derived` für reaktive Filterung
- Conditional Rendering basierend auf Objekttyp und Berechtigungen

**Beziehung zu Primär-Objekten**:
- Sections **zeigen Relationen** zu anderen Containern an (via `is-part-of`, `is-part-of-measure`)
- Sections **ermöglichen Navigation** zu verknüpften Objekten (Card-Klick öffnet Overlay)
- Sections **unterstützen Inline-Erstellung** neuer Objekte (Plus-Button in Carousels)
- Sections **filtern Related Containers** basierend auf Beziehungsprädikaten

**Verwendungs-Matrix**:

| Section-Typ | Program | Goal | Measure | Indicator | Organization |
|-------------|---------|------|---------|-----------|--------------|
| Carousel    | ✓       | ✓    | ✓       | -         | -            |
| Text        | ✓       | ✓    | ✓       | ✓         | ✓            |
| File Upload | ✓       | -    | ✓       | -         | ✓            |
| Progress    | -       | ✓    | ✓       | -         | -            |
| Badge       | ✓       | ✓    | ✓       | ✓         | -            |
| Property Grid| ✓      | ✓    | ✓       | ✓         | ✓            |

**Business Value**:
- **Konsistente UX** durch wiederverwendbare Komponenten
- **Flexible Content-Strukturierung** ohne Datenmodell-Änderungen
- **Modularer Aufbau** erleichtert Wartung und Erweiterung
- **Kontextuelle Bearbeitung** verbessert User Experience
- **Schnelle Feature-Iteration** durch Komponentenarchitektur
- **Reduzierte Code-Duplikation** durch Wiederverwendung

---

## Beziehungen (Relationships)

Das knot-dots System verwendet ein **Predicate-basiertes Beziehungsmodell** mit 20 definierten Beziehungstypen.

### Beziehungsstruktur

Jede Beziehung besteht aus:
- **subject**: Das Subjekt (Container A)
- **predicate**: Der Beziehungstyp
- **object**: Das Objekt (Container B)
- **position**: Position in geordneten Listen

### Hierarchische Beziehungen

#### 1. **is-part-of** (ist Teil von)
- **Zweck**: Allgemeine Hierarchie
- **Beispiel**: Ziel ist Teil von Programm
- **Kardinalität**: Many-to-One
- **Besonderheit**: Rekursiv durchsuchbar

#### 2. **is-part-of-measure** (ist Teil von Maßnahme)
- **Zweck**: Maßnahmen-spezifische Hierarchie
- **Beispiel**: Task ist Teil von Measure
- **Verwendet für**: Effects, Resources, Tasks unter Measures

#### 3. **is-part-of-program** (ist Teil von Programm)
- **Zweck**: Programm-Kapitel-Zuordnung
- **Beispiel**: Measure ist Teil von Program
- **Besonderheit**: Positions-basierte Sortierung für Kapitelreihenfolge

#### 4. **is-subtask-of** (ist Teilaufgabe von)
- **Zweck**: Task-Hierarchie
- **Beispiel**: Sub-Task ist Teilaufgabe von Main-Task

#### 5. **is-sub-target-of** (ist Unterziel von)
- **Zweck**: Zielhierarchie
- **Beispiel**: Operatives Ziel ist Unterziel von Strategischem Ziel

#### 6. **is-superordinate-of** (ist übergeordnet zu)
- **Zweck**: Übergeordnete Beziehung
- **Beispiel**: Organisationseinheit ist übergeordnet zu Untereinheit

---

### Inhaltliche Beziehungen

#### 7. **contributes-to** (trägt bei zu)
- **Zweck**: Beitragsverhältnis
- **Beispiel**: Measure trägt bei zu Goal
- **Verwendung**: Wirkungsketten abbilden
- **Visualisierung**: Türkis/Blau in UI

#### 8. **is-consistent-with** (ist konsistent mit)
- **Zweck**: Positive Querbeziehung
- **Beispiel**: Measure A ist konsistent mit Measure B
- **Verwendung**: Synergie-Identifikation
- **Visualisierung**: Grün in UI

#### 9. **is-inconsistent-with** (ist inkonsistent mit)
- **Zweck**: Konflikt-Kennzeichnung
- **Beispiel**: Goal A widerspricht Goal B
- **Verwendung**: Zielkonflikte identifizieren

#### 10. **is-prerequisite-for** (ist Voraussetzung für)
- **Zweck**: Abhängigkeiten modellieren
- **Beispiel**: Measure A ist Voraussetzung für Measure B

---

### Mess- und Zielbezogene Beziehungen

#### 11. **is-measured-by** (wird gemessen durch)
- **Zweck**: Indikator-Zuordnung
- **Beispiel**: Effect wird gemessen durch Indicator
- **Verwendung**: Wirkungsmessung

#### 12. **is-objective-for** (ist Zielvorgabe für)
- **Zweck**: Soll-Wert-Zuordnung
- **Beispiel**: Objective ist Zielvorgabe für Indicator

#### 13. **is-affected-by** (wird beeinflusst durch)
- **Zweck**: Indirekte Wirkungsbeziehung
- **Beispiel**: Indicator wird beeinflusst durch andere Indicators

#### 14. **is-concrete-target-of** (ist konkretes Ziel von)
- **Zweck**: Ziel-Konkretisierung
- **Verwendung**: Spezifischere Ziele definieren

---

### Verwaltungs-Beziehungen

#### 15. **is-admin-of** (ist Admin von)
- **Zweck**: Admin-Rechte
- **Subjekt**: User
- **Objekt**: Organization/Organizational_Unit/Container
- **Berechtigungen**: Volle Kontrolle (CRUD, Einladungen)

#### 16. **is-collaborator-of** (ist Mitarbeiter von)
- **Zweck**: Bearbeitungsrechte ohne Admin-Privilegien
- **Berechtigungen**: Create, Update, Relate

#### 17. **is-head-of** (ist Leitung von)
- **Zweck**: Führungsrolle
- **Berechtigungen**: Ähnlich Admin, aber organisationsbezogen

#### 18. **is-member-of** (ist Mitglied von)
- **Zweck**: Basis-Mitgliedschaft
- **Berechtigungen**: Lesen von organization-visible Content

#### 19. **is-creator-of** (ist Ersteller von)
- **Zweck**: Urheberschaft festhalten
- **Verwendung**: Audit-Trail, Berechtigungsprüfung

---

### Sonstige Beziehungen

#### 20. **is-copy-of** (ist Kopie von)
- **Zweck**: Kopie-Referenz
- **Verwendung**: Vorlagen-System, Duplikationsverfolgung

#### 21. **is-duplicate-of** (ist Duplikat von)
- **Zweck**: Duplikate kennzeichnen
- **Verwendung**: Daten-Bereinigung

#### 22. **is-equivalent-to** (ist äquivalent zu)
- **Zweck**: Gleichwertigkeit kennzeichnen
- **Verwendung**: Zusammenführung von redundanten Inhalten

---

### Beziehungs-Matrix

| Von ↓ / Zu → | Program | Goal | Measure | Indicator | Task | Effect | Organization | Org. Unit |
|--------------|---------|------|---------|-----------|------|--------|--------------|-----------|
| **Program** | - | is-part-of | is-part-of-program | - | - | - | managed-by | belongs-to |
| **Goal** | is-part-of-program | is-sub-target-of | contributes-to | is-measured-by | - | - | managed-by | belongs-to |
| **Measure** | is-part-of-program | contributes-to | is-consistent-with | - | is-part-of-measure | is-part-of-measure | managed-by | belongs-to |
| **Indicator** | - | is-objective-for | - | is-affected-by | - | is-measured-by | managed-by | belongs-to |
| **Task** | - | contributes-to | is-part-of-measure | - | is-subtask-of | - | managed-by | belongs-to |
| **Effect** | - | - | is-part-of-measure | is-measured-by | - | - | managed-by | belongs-to |
| **User** | is-member-of | - | - | - | assigned-to | - | is-admin-of | is-head-of |

---

## Handlungsaufforderungen (CTAs)

CTAs sind die Aktionen, die Nutzer auf Objekte ausführen können. Das System definiert granulare Berechtigungen durch CASL (Ability-Based Access Control).

### Primäre CTAs (CRUD-Operationen)

#### 1. CREATE (Erstellen)
**Anwendbar auf**: Alle Container-Typen außer Organization (wird über Keycloak erstellt)

**Berechtigungen**:
- **Sysadmin**: Alle Typen
- **Admin/Head**: In eigener Organisation/OE
- **Collaborator**: Program-Kapitel und Measure-Monitoring-Elemente in verwalteten Containern

**UI-Einstiegspunkte**:
- "Neu anlegen"-Button (je nach Kontext)
- "Aus Vorlage erstellen"-Button (bei Measures)
- Import-Funktion (CSV für Programme)

**Workflow**:
1. Typ auswählen
2. Pflichtfelder ausfüllen (title/name)
3. Optional: Beziehungen definieren
4. Speichern → Neue Revision wird erstellt

---

#### 2. READ (Lesen)
**Anwendbar auf**: Alle Objekte

**Sichtbarkeits-Ebenen**:
- **public**: Jeder (auch unauthentifiziert)
- **organization**: Alle Mitglieder der Organisation
- **members**: Nur Mitglieder des verwaltenden Containers
- **creator**: Nur Ersteller (+ Admins der Organisation)

**UI-Repräsentation**:
- Listen-Ansichten (Katalog, Tabelle, Hierarchie)
- Detail-Ansichten (Overlay, Vollseite)
- Preview-Modus

**Filterung nach**:
- Typ, Status, Kategorie
- Themen, SDGs, Policy Fields
- Organisationseinheit
- Volltext-Suche

---

#### 3. UPDATE (Aktualisieren)
**Anwendbar auf**: Alle Container-Typen

**Berechtigungen**:
- **Sysadmin**: Alle Container, inklusive Organization/OE-Zuordnung
- **Admin/Head**: Container in eigener Org/OE
- **Collaborator**: Container in verwalteten Programmen/Maßnahmen

**Einschränkungen**:
- Organization/OE nicht änderbar (außer Admins)
- indicatorCategory nicht änderbar nach Erstellung
- chapterType nur von Admins änderbar

**Versionierung**:
- Jede Änderung erstellt neue Revision
- Alte Revisionen bleiben erhalten
- valid_currently-Flag kennzeichnet aktuelle Version

**UI-Komponenten**:
- Inline-Editing (EditableTitle, EditableDescription)
- Formular-Overlays
- Auto-Save oder explizites Speichern

---

#### 4. DELETE (Löschen)
**Anwendbar auf**: Alle Container (außer solche mit Abhängigkeiten)

**Berechtigungen**:
- **Sysadmin**: Alle
- **Admin/Head**: Container in eigener Org/OE (ohne Abhängigkeiten)

**Bedingungen**:
- Keine is-part-of oder is-part-of-measure Beziehungen als Object
- Keine aktiven Referenzen

**Varianten**:
- **Soft Delete**: Setzt valid_currently=false, deleted=true
- **Recursive Delete**: Löscht auch alle child-Elemente (nur Sysadmin)

**Workflow**:
1. Prüfung auf Abhängigkeiten
2. Bestätigung
3. Soft-Delete-Revision erstellen
4. Beziehungen deaktivieren

---

### Sekundäre CTAs (Spezifische Aktionen)

#### 5. RELATE (Verknüpfen)
**Zweck**: Beziehungen zwischen Containern herstellen

**Berechtigungen**:
- **Sysadmin**: Alle Beziehungstypen
- **Admin/Collaborator/Head**: In verwalteten Containern

**UI-Komponenten**:
- "Verknüpfen"-Dialog
- Drag-and-Drop in Hierarchien
- Relationen-Overlay

**Beziehungstypen**:
- Hierarchisch (is-part-of, is-subtask-of)
- Inhaltlich (contributes-to, is-consistent-with)
- Mess-bezogen (is-measured-by, is-objective-for)

**Workflow**:
1. Objekt auswählen
2. Beziehungstyp wählen
3. Ziel-Objekt suchen/auswählen
4. Position festlegen (bei geordneten Beziehungen)
5. Speichern

---

#### 6. INVITE-MEMBERS (Mitglieder einladen)
**Zweck**: Nutzer zu Organisation/Container hinzufügen

**Berechtigungen**:
- **Sysadmin**: Überall
- **Admin/Head**: In eigener Org/OE/Container

**Rollen zuweisen**:
- Admin
- Collaborator
- Head (nur für OE)
- Member

**Workflow**:
1. E-Mail-Adresse eingeben
2. Rolle auswählen
3. Einladung senden (Keycloak-Integration)
4. User-Relation wird erstellt

**UI**: Members-Overlay mit Liste und Einladungsformular

---

#### 7. PRIORITIZE (Priorisieren)
**Anwendbar auf**: Tasks

**Berechtigungen**:
- **Sysadmin**: Alle Tasks
- **Admin/Collaborator/Head**: Tasks in verwalteten Containern

**Mechanismus**:
- Ganzzahlige Prioritätswerte
- Separate task_priority-Tabelle
- Drag-and-Drop-Sortierung in UI

**UI**: Kanban-Board, sortierbare Listen

---

#### 8. COPY (Kopieren)
**Anwendbar auf**: Measures (als Templates), Indicators

**Zweck**:
- Measures: Template-System für Wiederverwendung
- Indicators: Template für neue Indikatoren

**Workflow**:
1. Objekt auswählen
2. "Als Vorlage speichern" oder "Kopieren"
3. Neue Kopie wird erstellt mit:
   - Titel-Präfix "Kopie von:"
   - is-copy-of Beziehung
   - Zurückgesetzte Werte (historicalValues, status, etc.)
   - Neue GUID

---

#### 9. UPLOAD (Hochladen)
**Anwendbar auf**: Programs (PDF, Images), Simple_Measures (Files)

**Zweck**:
- Programme: Strategie-PDFs, Cover-Bilder
- Maßnahmen: Anhänge, Dokumente

**Integration**: S3-kompatibler Storage

**UI**: Drag-and-Drop-Upload-Zone

---

#### 10. ASSIGN (Zuweisen)
**Anwendbar auf**: Tasks

**Zweck**: Verantwortliche festlegen

**Mechanismus**:
- Mehrfach-Zuweisung möglich
- User-GUIDs in payload.assignee-Array

**UI**: Dropdown mit User-Suche, Multi-Select

---

#### 11. EXPORT (Exportieren)
**Anwendbar auf**: Alle Container

**Formate**:
- Implizit: JSON (über API)
- Potentiell: CSV, PDF

**Verwendung**: Berichterstattung, Datenaustausch

---

### CTA-Matrix nach Objekttyp

| Objekt | Create | Read | Update | Delete | Relate | Invite | Copy | Upload | Assign | Prioritize |
|--------|--------|------|--------|--------|--------|--------|------|--------|--------|------------|
| Program | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - | ✓ | - | - |
| Goal | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - | - | - | - |
| Measure | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - | - | - |
| Simple_Measure | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - | - |
| Indicator | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - | - | - |
| Objective | ✓ | ✓ | ✓ | ✓ | ✓ | - | - | - | - | - |
| Effect | ✓ | ✓ | ✓ | ✓ | ✓ | - | - | - | - | - |
| Task | ✓ | ✓ | ✓ | ✓ | ✓ | - | - | - | ✓ | ✓ |
| Resource | ✓ | ✓ | ✓ | ✓ | ✓ | - | - | - | - | - |
| Rule | ✓ | ✓ | ✓ | ✓ | ✓ | - | - | - | - | - |
| Knowledge | ✓ | ✓ | ✓ | ✓ | ✓ | - | - | - | - | - |
| Text | ✓ | ✓ | ✓ | ✓ | ✓ | - | - | - | - | - |
| Organization | - | ✓ | ✓ | - | - | ✓ | - | ✓ | - | - |
| Org. Unit | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - | ✓ | - | - |
| Page | ✓ | ✓ | ✓ | ✓ | - | - | - | - | - | - |

---

## Attribute (Attributes)

Attribute definieren die Eigenschaften von Objekten. Das System unterscheidet zwischen **gemeinsamen Attributen** (Container-Ebene) und **payload-spezifischen Attributen**.

### Gemeinsame Container-Attribute

Jedes Container-Objekt hat folgende Basis-Attribute:

| Attribut | Typ | Beschreibung | Pflicht | Editierbar |
|----------|-----|--------------|---------|------------|
| **guid** | UUID | Eindeutige ID | Ja | Nein |
| **revision** | Integer | Versionsnummer | Ja | Nein |
| **organization** | UUID | Zugehörige Organisation | Ja | Admin only |
| **organizational_unit** | UUID/null | Zugehörige OE | Nein | Admin only |
| **managed_by** | UUID | Verwaltender Container (Program/Measure/Organization) | Ja | Admin/Head |
| **realm** | String | Keycloak Realm | Ja | Nein |
| **valid_from** | Timestamp | Gültig ab | Ja | Nein |
| **valid_currently** | Boolean | Aktuell gültig | Ja | Nein |
| **relation[]** | Array | Beziehungen | Nein | Ja |
| **user[]** | Array | Nutzer-Beziehungen | Nein | Ja |
| **payload** | JSON | Typ-spezifischer Inhalt | Ja | Ja |

---

### Base Payload Attribute

Die meisten Content-Typen teilen diese Basis-Attribute:

| Attribut | Typ | Beschreibung | Pflicht | Verwendet von |
|----------|-----|--------------|---------|---------------|
| **type** | Enum | Payload-Typ | Ja | Alle |
| **title** | String | Titel | Ja | Alle außer Org/OE |
| **description** | String | Beschreibung (Markdown) | Nein | Alle außer Objectives/Effects |
| **summary** | String (max 200) | Kurzbeschreibung | Nein | Alle außer Objectives/Effects |
| **visibility** | Enum | Sichtbarkeit | Ja | Alle |
| **audience** | Array | Zielgruppe | Nein | Alle außer Objectives/Resources/Tasks/Pages |
| **category** | Array | SDG-Kategorien | Nein | Strategische Inhalte |
| **topic** | Array | Themenfelder | Nein | Strategische Inhalte |
| **policyFieldBNK** | Array | BNK-Politikfelder | Nein | Strategische Inhalte |
| **editorialState** | Enum | Redaktionsstatus | Nein | Strategische Inhalte |
| **aiSuggestion** | Boolean | KI-generiert | Nein | Strategische Inhalte |

#### Visibility (Sichtbarkeit)
- **public**: Öffentlich
- **organization**: Organisationsweit
- **members**: Nur Mitglieder
- **creator**: Nur Ersteller

#### Audience (Zielgruppen)
- Verwaltung
- Bürger
- Unternehmen
- Gesamte Gruppe
- Stadtgesellschaft
- Freiwilligenarbeit/Vereine/NGOs

#### Editorial State (Redaktionsstatus)
- Entwurf
- Benötigt Nachqualifizierung
- In Nachqualifizierung
- Freigegeben
- Abgelehnt

---

### Program-spezifische Attribute

| Attribut | Typ | Beschreibung | Editierbar von |
|----------|-----|--------------|----------------|
| **programType** | Enum | Programmtyp | Alle mit Update-Recht |
| **level** | Enum | Ebene (global/national/lokal) | Alle mit Update-Recht |
| **chapterType[]** | Array | Erlaubte Kapiteltypen | Admin/Head |
| **image** | URL | Cover-Bild | Alle mit Update-Recht |
| **pdf[]** | Array<[URL, Name]> | PDF-Dokumente | Alle mit Update-Recht |

#### Program Types
- Sonstiges, Mobilität, Nachhaltigkeit, Smart City, ISEK, Bericht, Regelwerk, Maßnahmenpaket, Förderprogramm, Leitfaden

#### Levels
- Global, Multilateral, National, Bundesland, Regional, Lokal

---

### Goal-spezifische Attribute

| Attribut | Typ | Beschreibung |
|----------|-----|--------------|
| **goalType** | Enum | Zieltyp (Vision, Strategisches Ziel, etc.) |
| **hierarchyLevel** | Integer (1-6) | Hierarchieebene |
| **progress** | Number (0-100) | Fortschritt in Prozent |
| **fulfillmentDate** | Date | Geplantes Erfüllungsdatum |

---

### Measure-spezifische Attribute

| Attribut | Typ | Beschreibung |
|----------|-----|--------------|
| **status** | Enum | Status (Idee → Abgeschlossen) |
| **measureType[]** | Array | Maßnahmentypen |
| **startDate** | Date | Startdatum |
| **endDate** | Date | Enddatum |
| **resource[]** | Array<Object> | Ressourcenplanung |
| **annotation** | String | Anmerkungen |
| **comment** | String | Kommentare |
| **result** | String | Ergebnis |
| **template** | Boolean | Als Vorlage verwendbar |

#### Resource Object
```typescript
{
  description: string,
  amount: number,
  unit: string,
  fulfillmentDate: date
}
```

---

### Simple_Measure-spezifische Attribute

| Attribut | Typ | Beschreibung |
|----------|-----|--------------|
| **status** | Enum | Status |
| **measureType[]** | Array | Maßnahmentypen |
| **progress** | Number (0-100) | Fortschritt |
| **startDate** | Date | Startdatum |
| **endDate** | Date | Enddatum |
| **file[]** | Array<[URL, Name]> | Dateianhänge |
| **resource[]** | Array<Object> | Ressourcen |
| **annotation** | String | Anmerkungen |

---

### Indicator-spezifische Attribute

| Attribut | Typ | Beschreibung |
|----------|-----|--------------|
| **quantity** | String | Messgröße (CO2, Breitband, etc.) |
| **unit** | String | Einheit (kg, %, km, etc.) |
| **historicalValues** | Array<[year, value]> | Historische Messwerte |
| **indicatorCategory[]** | Array | Kategorien (KPI, SDG, MPSC, Custom) |
| **indicatorType[]** | Array | Typen (Impact, Performance, Key) |
| **measureType[]** | Array | Maßnahmentypen |

---

### Objective-spezifische Attribute

| Attribut | Typ | Beschreibung |
|----------|-----|--------------|
| **wantedValues** | Array<[year, value]> | Soll-Werte über Zeit |

---

### Effect-spezifische Attribute

| Attribut | Typ | Beschreibung |
|----------|-----|--------------|
| **plannedValues** | Array<[year, value]> | Geplante Werte |
| **achievedValues** | Array<[year, value]> | Erreichte Werte |

---

### Task-spezifische Attribute

| Attribut | Typ | Beschreibung |
|----------|-----|--------------|
| **taskStatus** | Enum | Status |
| **taskCategory** | Enum | Kategorie |
| **assignee[]** | Array<UUID> | Zugewiesene Nutzer |
| **fulfillmentDate** | Date | Fälligkeitsdatum |
| **effort** | String | Aufwandsschätzung |
| **benefit** | Enum | Nutzen (niedrig/mittel/hoch) |

---

### Resource-spezifische Attribute

| Attribut | Typ | Beschreibung |
|----------|-----|--------------|
| **amount** | Number | Menge |
| **unit** | String | Einheit |
| **fulfillmentDate** | Date | Fälligkeitsdatum |

---

### Rule-spezifische Attribute

| Attribut | Typ | Beschreibung |
|----------|-----|--------------|
| **ruleStatus** | Enum | Status (Idee → Verabschiedet) |
| **validFrom** | Date | Gültig ab |
| **validUntil** | Date | Gültig bis |

---

### Organization-spezifische Attribute

| Attribut | Typ | Beschreibung |
|----------|-----|--------------|
| **name** | String | Name (statt title) |
| **organizationCategory** | Enum | Kategorie (Business/Regierung/Non-Profit/Politisch) |
| **default** | Boolean | Standard-Organisation |
| **boards[]** | Array | Aktivierte Boards (Indicators, Measure Monitoring, Tasks, OEs) |
| **image** | URL | Logo |

---

### Organizational_Unit-spezifische Attribute

| Attribut | Typ | Beschreibung |
|----------|-----|--------------|
| **name** | String | Name (statt title) |
| **level** | Integer | Hierarchieebene |
| **boards[]** | Array | Aktivierte Boards |
| **image** | URL | Logo/Bild |

---

### Page-spezifische Attribute

| Attribut | Typ | Beschreibung |
|----------|-----|--------------|
| **slug** | String | URL-Slug |
| **body** | String | Markdown-Inhalt |

---

### Text-spezifische Attribute

| Attribut | Typ | Beschreibung |
|----------|-----|--------------|
| **body** | String | Markdown-Inhalt |

---

### Attribut-Gruppen nach Zweck

#### Zeitbezogene Attribute
- **startDate** / **endDate**: Measures, Simple_Measures
- **fulfillmentDate**: Goals, Tasks, Resources
- **validFrom** / **validUntil**: Rules
- **historicalValues**: Indicators (Zeitreihen)
- **plannedValues** / **achievedValues**: Effects (Zeitreihen)
- **wantedValues**: Objectives (Zeitreihen)

#### Status-Attribute
- **status**: Measures, Simple_Measures
- **taskStatus**: Tasks
- **ruleStatus**: Rules
- **editorialState**: Alle strategischen Inhalte

#### Kategorisierungs-Attribute
- **category** (SDGs): Strategische Inhalte
- **topic**: Strategische Inhalte
- **policyFieldBNK**: Strategische Inhalte
- **measureType**: Measures, Simple_Measures, Indicators
- **indicatorType**: Indicators
- **indicatorCategory**: Indicators
- **goalType**: Goals
- **taskCategory**: Tasks

#### Fortschritts-Attribute
- **progress**: Goals, Simple_Measures (0-100%)
- **historicalValues**: Indicators (Ist-Werte)
- **achievedValues**: Effects (Ist-Werte)

#### Datei-Attribute
- **image**: Programs, Organizations, Organizational_Units
- **pdf**: Programs
- **file**: Simple_Measures

---

## User Personas und Rollen

### Rollenhierarchie

```
Sysadmin (Systemadministrator)
    ↓
Admin (Organisationsadministrator)
    ↓
Head (Abteilungsleitung)
    ↓
Collaborator (Mitarbeiter)
    ↓
Member (Mitglied)
    ↓
Public (Öffentlichkeit)
```

---

### Persona 1: Sysadmin (Systemadministrator)

**Rolle**: Technischer Administrator der gesamten Plattform

**Zuständigkeiten**:
- Plattform-Konfiguration
- Organisation-Management
- System-Monitoring
- Daten-Migration

**Berechtigungen**:
- Volle CRUD-Rechte auf alle Objekte
- Delete-recursively
- Änderung von Organization/OE-Zuordnungen
- Invite-Members überall
- Prioritize Tasks überall

**Typische User Journeys**:
1. Neue Organisation anlegen und konfigurieren
2. Organisations-Übergreifende Berichte erstellen
3. Datenimport aus CSV durchführen
4. Systemweite Berechtigungen prüfen

**Technisches Profil**: IT-Kenntnisse, Datenbankverständnis

**Pain Points**:
- Komplexität des Berechtigungssystems
- Fehlende Bulk-Operations
- Unklare Auswirkungen von Delete-recursively

---

### Persona 2: Nachhaltigkeitsmanager (Admin)

**Name**: Dr. Martina Weber
**Alter**: 45
**Position**: Nachhaltigkeitsmanagerin einer Mittelstadt (50.000 Einwohner)

**Kontext**:
- Verantwortlich für die Nachhaltigkeitsstrategie 2030
- Koordiniert 5 Fachabteilungen
- Berichtet an Bürgermeister und Stadtrat
- Budget: 2 Mio. Euro/Jahr für Maßnahmen

**Ziele**:
- Nachhaltigkeitsstrategie digital abbilden
- Fortschritte transparent machen
- Abteilungsübergreifende Zusammenarbeit fördern
- SDG-Berichterstattung vereinfachen

**Berechtigungen**:
- Admin der Organisation "Stadt Musterstadt"
- CRUD auf alle Container der Organisation
- Invite-Members
- Organisation-Settings ändern

**Typische User Journeys**:

**Journey 1: Neue Nachhaltigkeitsstrategie anlegen**
1. Programm "Nachhaltigkeitsstrategie 2030" erstellen
2. PDF der Strategie hochladen
3. Hierarchische Zielstruktur aufbauen (Vision → Strategische Ziele → Operative Ziele)
4. SDGs und Themen zuordnen
5. Indikatoren verknüpfen
6. Maßnahmen aus Fachabteilungen einbinden
7. Fachabteilungen als Collaborators einladen

**Journey 2: Quartalsweise Fortschrittskontrolle**
1. Dashboard der Strategie aufrufen
2. Indikatorwerte aktualisieren (historicalValues)
3. Maßnahmen-Status prüfen und aktualisieren
4. Ampel-Status (contributes-to Beziehungen) bewerten
5. Bericht für Stadtrat exportieren

**Journey 3: Neue Maßnahme aufnehmen**
1. Maßnahme erstellen (aus Fachbereich)
2. Zu Zielen verknüpfen (contributes-to)
3. Indikatoren für Wirkungsmessung zuordnen
4. Ressourcen (Budget, Personal) hinterlegen
5. Fachbereich als Collaborator zuweisen
6. Veröffentlichen (visibility: organization)

**Herausforderungen**:
- Viele manuelle Verknüpfungen
- Schwierigkeiten, Übersicht bei 100+ Maßnahmen zu behalten
- Inkonsistente Datenpflege durch Fachabteilungen
- Komplexität der Indikator-Systematik

**Needs**:
- Dashboard mit Übersicht über alle Programme
- Erinnerungen für Daten-Updates
- Templates für wiederkehrende Maßnahmen
- Einfachere SDG-Zuordnung

---

### Persona 3: Fachbereichsleitung (Head)

**Name**: Thomas Müller
**Alter**: 52
**Position**: Leiter Tiefbauamt

**Kontext**:
- Verantwortlich für Mobilitäts-Maßnahmen
- Team: 12 Mitarbeiter
- Verwaltung von Organisationseinheit "Tiefbauamt"

**Ziele**:
- Maßnahmen des Amtes strukturieren
- Team-Aufgaben koordinieren
- Ressourcen planen
- Berichterstattung an Nachhaltigkeitsmanagement

**Berechtigungen**:
- Head of "Tiefbauamt" (Organizational Unit)
- CRUD auf Container der OE
- Invite-Members in OE
- Update managed_by Container

**Typische User Journeys**:

**Journey 1: Radwegenetz-Ausbau planen**
1. Measure "Radwegenetz Ausbau 2025" erstellen
2. Zu Ziel "Nachhaltige Mobilität" verknüpfen
3. Simple_Measures für Einzelstrecken anlegen (is-part-of-measure)
4. Tasks für Planungsschritte erstellen und Team-Mitgliedern zuweisen
5. Ressourcen (Budget, Planerstunden) erfassen
6. Meilenstein-Dates setzen

**Journey 2: Wöchentliches Team-Meeting vorbereiten**
1. Alle Tasks der OE "Tiefbauamt" filtern
2. Nach Priorität sortieren
3. Überfällige Tasks identifizieren
4. Status-Updates von Assignees prüfen
5. Neue Tasks aus Besprechung erstellen

**Herausforderungen**:
- Zeitaufwendige Datenpflege
- Unklare Zuständigkeiten bei abteilungsübergreifenden Maßnahmen
- Schwierig, Gesamt-Fortschritt zu kommunizieren

**Needs**:
- Automatische Status-Aktualisierung
- Gantt-Chart für Maßnahmen-Zeitplanung
- Erinnerungen für Meilensteine

---

### Persona 4: Projektmitarbeiter (Collaborator)

**Name**: Lisa Schmidt
**Alter**: 29
**Position**: Klimaschutzmanagerin

**Kontext**:
- Angestellt im Nachhaltigkeits-Referat
- Zuständig für Klimaschutz-Maßnahmen
- Collaborator mehrerer Programme

**Ziele**:
- Klimaschutz-Maßnahmen dokumentieren
- Wirkungsmessung durchführen
- Mit anderen Fachbereichen zusammenarbeiten

**Berechtigungen**:
- Collaborator of "Klimaschutzkonzept 2030"
- Create, Update, Relate in verwalteten Programmen
- Kein Delete

**Typische User Journeys**:

**Journey 1: Neue Klimaschutz-Maßnahme dokumentieren**
1. Measure erstellen (managed_by: Klimaschutzkonzept)
2. Beschreibung und Zielgruppe definieren
3. Zu strategischen Zielen verknüpfen (contributes-to)
4. Indikatoren auswählen oder neu erstellen
5. Effects (geplante Wirkungen) anlegen
6. Ressourcen-Bedarf dokumentieren
7. Visibility auf "organization" setzen

**Journey 2: Monatliches Maßnahmen-Monitoring**
1. Alle eigenen Maßnahmen filtern (managed_by: Klimaschutzkonzept)
2. Status aktualisieren
3. Effect achievedValues eintragen
4. Tasks als "erledigt" markieren
5. Annotationen zu Herausforderungen ergänzen

**Herausforderungen**:
- Viele Klicks für wiederkehrende Tätigkeiten
- Unklare Indikator-Zuordnung
- Keine Benachrichtigungen bei verknüpften Änderungen

**Needs**:
- Batch-Update von Status
- Indikator-Katalog mit Suchfunktion
- Notifications bei Änderungen in verknüpften Objekten

---

### Persona 5: Bürger (Member/Public)

**Name**: Anna Becker
**Alter**: 38
**Position**: Engagierte Bürgerin

**Kontext**:
- Mitglied im Nachhaltigkeitsbeirat
- Interessiert an Transparenz
- Kein Login (Public) oder einfaches Member-Konto

**Ziele**:
- Fortschritte der Stadt einsehen
- Eigene Ideen einbringen
- Maßnahmen kommentieren

**Berechtigungen**:
- Public: Lesen von public-Inhalten
- Member: Lesen von organization-Inhalten (wenn eingeladen)

**Typische User Journeys**:

**Journey 1: Nachhaltigkeitsstrategie einsehen**
1. Website aufrufen (ohne Login)
2. "Programme" durchsuchen
3. "Nachhaltigkeitsstrategie 2030" öffnen
4. Ziele und Maßnahmen erkunden
5. Indikator-Dashboards ansehen
6. PDF der Strategie herunterladen

**Herausforderungen**:
- Komplexe Fachbegriffe
- Unklare Navigation
- Keine Kommentarfunktion

**Needs**:
- Einfache Sprache
- Visuelle Darstellung (Diagramme)
- Möglichkeit, Feedback zu geben

---

### Berechtigungen-Übersicht

| Aktion | Sysadmin | Admin | Head | Collaborator | Member | Public |
|--------|----------|-------|------|--------------|--------|--------|
| Create (eigene Org) | ✓ | ✓ | ✓ | ✓* | - | - |
| Read (public) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Read (organization) | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| Read (members) | ✓ | ✓ | ✓ | ✓ | - | - |
| Update (eigene Org) | ✓ | ✓ | ✓ | ✓* | - | - |
| Delete (eigene Org) | ✓ | ✓ | ✓ | - | - | - |
| Delete-recursively | ✓ | - | - | - | - | - |
| Invite-Members | ✓ | ✓ | ✓ | - | - | - |
| Relate | ✓ | ✓ | ✓ | ✓* | - | - |
| Change Org/OE | ✓ | ✓ | ✓ | - | - | - |
| Prioritize Tasks | ✓ | ✓ | ✓ | ✓* | - | - |

\* Nur in verwalteten Containern (managed_by)

---

## User Journeys

### Journey-Map 1: Strategie-Erstellung (End-to-End)

**Persona**: Nachhaltigkeitsmanager (Admin)
**Ziel**: Neue Nachhaltigkeitsstrategie komplett digital abbilden

#### Phase 1: Vorbereitung
**Touchpoints**: Login, Dashboard, Program-Übersicht

**Schritte**:
1. Login über Keycloak
2. Dashboard aufrufen
3. "Programme" im Hauptmenü wählen
4. "Neues Programm" Button klicken

**Emotionaler Zustand**: Motiviert, leicht nervös wegen Komplexität

**Pain Points**:
- Unklare Navigation bei erstem Login
- Viele leere Felder im Dashboard

---

#### Phase 2: Programm-Setup
**Touchpoints**: Create-Overlay, Formular-Felder

**Schritte**:
1. Formular ausfüllen:
   - Titel: "Nachhaltigkeitsstrategie 2030"
   - Typ: Nachhaltigkeitsstrategie
   - Ebene: Lokal
   - Beschreibung (Markdown)
   - Themen: Umwelt, Klimaschutz, Mobilität, etc.
   - SDGs auswählen (mehrere)
   - Visibility: Organization
2. PDF hochladen (Drag & Drop)
3. Cover-Bild hochladen
4. Kapiteltypen auswählen (Goals, Measures, Rules)
5. Speichern

**Emotionaler Zustand**: Konzentriert, zufrieden bei einfacher Bedienung

**Pain Points**:
- SDG-Auswahl umständlich (17 Icons)
- Unklarer Unterschied zwischen summary und description

**Opportunities**:
- Auto-Suggest für Themen basierend auf Titel
- Template-Funktion für wiederkehrende Programme

---

#### Phase 3: Zielstruktur aufbauen
**Touchpoints**: Hierarchie-Ansicht, Create-Overlay

**Schritte**:
1. "Kapitel hinzufügen" in Programm
2. Goal "Vision 2030" erstellen (Hierarchieebene 1)
3. Weitere Goals als Unterziele anlegen (is-part-of)
   - Strategische Ziele (Ebene 2)
   - Operative Ziele (Ebene 3)
4. Für jedes Ziel:
   - Titel, Beschreibung
   - Goal-Type auswählen
   - Erfüllungsdatum setzen
   - SDGs zuordnen
   - Verknüpfung zum übergeordneten Ziel (is-sub-target-of)

**Emotionaler Zustand**: Flow-Zustand bei repetitiver Arbeit

**Pain Points**:
- Viele Klicks für jedes Ziel
- Keine Duplikationsfunktion
- Hierarchieebenen manuell setzen (sollte automatisch sein)

**Opportunities**:
- Bulk-Create für Ziele
- Automatische Hierarchieebenen-Berechnung
- Drag-and-Drop Reordering

---

#### Phase 4: Indikatoren verknüpfen
**Touchpoints**: Indikator-Katalog, Relate-Overlay

**Schritte**:
1. Zu Ziel navigieren
2. "Indikator verknüpfen" wählen
3. Optionen:
   - A: Aus Katalog auswählen (bestehende)
   - B: Neuen Indikator erstellen
4. Bei Neu-Erstellung:
   - Titel (z.B. "CO2-Emissionen pro Kopf")
   - Quantity: CO2
   - Unit: Tonnen pro Kopf
   - Indikator-Typ: Impact
   - Kategorie: SDG, Custom
   - Historische Werte eintragen (Jahr, Wert)
5. Beziehung is-measured-by erstellen

**Emotionaler Zustand**: Unsicher bei Indikator-Auswahl

**Pain Points**:
- Indikator-Katalog unübersichtlich
- Unklare Unterscheidung indicator types vs. categories
- Historische Werte manuell eintragen (sollte Import möglich sein)

**Opportunities**:
- KI-gestützte Indikator-Vorschläge basierend auf Ziel-Titel
- CSV-Import für historische Werte
- Indikator-Templates (SDG-Standard-Indikatoren)

---

#### Phase 5: Maßnahmen einpflegen
**Touchpoints**: Measures-Katalog, Relate-Overlay

**Schritte**:
1. Measure "Ausbau PV-Anlagen" erstellen
2. Formular ausfüllen:
   - Beschreibung
   - Measure-Typen: Erneuerbare Energien
   - Start-/Enddatum
   - Status: In Planung
   - Ressourcen:
     - Budget: 500.000 Euro
     - Personal: 2 FTE
3. Verknüpfung zum Programm (is-part-of-program)
4. Verknüpfung zu Zielen (contributes-to)
5. Effekte anlegen:
   - Effect "CO2-Reduktion" erstellen
   - Geplante Werte: 2025: 100t, 2026: 200t, 2027: 300t
   - Verknüpfung zu Indikator "CO2-Emissionen"
6. Tasks für Umsetzung erstellen
   - "Ausschreibung vorbereiten"
   - "Standorte identifizieren"
   - Zuweisen an Kollegen

**Emotionaler Zustand**: Produktiv, aber ermüdet bei vielen Maßnahmen

**Pain Points**:
- Repetitive Verknüpfungen
- Effekte und Tasks sollten direkt in Maßnahme erstellbar sein
- Unklare Unterscheidung Measure vs. Simple_Measure

**Opportunities**:
- "Quick-Add" für Tasks direkt in Measure-Formular
- Auto-Link zu passenden Zielen (KI-gestützt)
- Batch-Import von Maßnahmen aus Excel

---

#### Phase 6: Team einladen
**Touchpoints**: Members-Overlay

**Schritte**:
1. Zu Programm navigieren
2. "Mitglieder verwalten" öffnen
3. E-Mail-Adressen eintragen:
   - lisa.schmidt@stadt.de → Collaborator
   - thomas.mueller@stadt.de → Head (wenn OE)
4. Einladung senden (Keycloak erstellt Account)

**Emotionaler Zustand**: Zufrieden, Delegation beginnt

**Pain Points**:
- Nur einzeln einladbar (keine Bulk-Invite)
- Unklarer Unterschied Head vs. Collaborator

**Opportunities**:
- CSV-Upload für Massen-Einladungen
- Rollen-Tooltips mit Berechtigungs-Übersicht

---

#### Phase 7: Veröffentlichen
**Touchpoints**: Visibility-Dropdown

**Schritte**:
1. Programm-Settings öffnen
2. Visibility ändern: "members" → "organization"
3. Optional: Public setzen für Transparenz
4. Speichern

**Emotionaler Zustand**: Stolz, Erleichterung

**Moments of Delight**:
- Vorschau-Modus zeigt, wie Bürger es sehen
- Bestätigungs-Nachricht "Strategie veröffentlicht"

---

### Journey-Map 2: Maßnahmen-Monitoring (Recurring)

**Persona**: Projektmitarbeiter (Collaborator)
**Ziel**: Monatliche Aktualisierung von Maßnahmen-Status und Wirkungen

#### Phase 1: Überblick verschaffen
**Touchpoints**: Dashboard, Filter

**Schritte**:
1. Login
2. Dashboard zeigt:
   - Anzahl zugewiesene Tasks
   - Maßnahmen in "Meine Programme"
   - Überfällige Updates
3. Filter setzen:
   - managed_by: "Klimaschutzkonzept 2030"
   - Status: "In Umsetzung"
   - Typ: Measure

**Emotionaler Zustand**: Routiniert, leicht gestresst bei vielen Aufgaben

**Pain Points**:
- Keine personalisierten Erinnerungen
- Unklare Priorisierung

**Opportunities**:
- Smart-Dashboard mit priorisierten Aufgaben
- E-Mail-Digest "Was ist diese Woche zu tun?"

---

#### Phase 2: Status aktualisieren
**Touchpoints**: Measures-Liste, Inline-Editing

**Schritte**:
1. Measure "PV-Anlagen Schulen" öffnen
2. Status ändern: "In Planung" → "In Umsetzung"
3. Annotation ergänzen: "3 von 5 Schulen in Ausschreibung"
4. Progress auf 60% setzen (bei Simple_Measure)
5. Speichern

**Emotionaler Zustand**: Zufrieden bei schneller Bearbeitung

**Pain Points**:
- Viele Klicks für mehrere Maßnahmen
- Keine History sichtbar ("Was war letzten Monat?")

**Opportunities**:
- Batch-Update: Mehrere Maßnahmen gleichzeitig ändern
- Change-Log anzeigen

---

#### Phase 3: Wirkungen dokumentieren
**Touchpoints**: Effect-Detail, Zeitreihen-Eingabe

**Schritte**:
1. Zu Effect "CO2-Reduktion" navigieren
2. Achieved Values aktualisieren:
   - 2025: 80t (geplant waren 100t)
3. Indikator aktualisieren:
   - Historical Values: 2025: 4.2t/Kopf (vorher 4.5t)
4. Speichern

**Emotionaler Zustand**: Unsicher bei Datenqualität

**Pain Points**:
- Manuelle Eingabe fehleranfällig
- Keine Validierung (ist 80t realistisch?)
- Kein Vergleich Soll/Ist im selben View

**Opportunities**:
- Daten-Import aus Fachsystemen
- Visualisierung Soll/Ist als Diagramm
- Plausibilitäts-Checks

---

#### Phase 4: Tasks abhaken
**Touchpoints**: Task-Board

**Schritte**:
1. Zu "Meine Tasks" navigieren
2. Tasks sortiert nach Priorität
3. Task "Ausschreibung fertigstellen" öffnen
4. Status ändern: "In Bearbeitung" → "Erledigt"
5. Comment ergänzen: "Ausschreibung am 15.05. veröffentlicht"

**Emotionaler Zustand**: Befriedigung

**Moments of Delight**:
- Task verschwindet aus Liste
- Fortschrittsbalken der Maßnahme aktualisiert sich automatisch

---

### Journey-Map 3: Strategie-Review (Quartalsweise)

**Persona**: Nachhaltigkeitsmanager (Admin)
**Ziel**: Gesamtfortschritt bewerten und Stadtrat berichten

#### Phase 1: Daten-Review
**Touchpoints**: Program-Dashboard, Indikator-Übersicht

**Schritte**:
1. Programm "Nachhaltigkeitsstrategie 2030" öffnen
2. Dashboard zeigt:
   - Zielerreichung (aggregiert aus Indikatoren)
   - Maßnahmen-Status (Ampel)
   - Offene Tasks
3. Indikatoren einzeln prüfen:
   - Aktualität der Werte
   - Abweichungen von Soll-Werten

**Emotionaler Zustand**: Analytisch, teilweise frustriert bei Datenlücken

**Pain Points**:
- Unvollständige Daten von Fachbereichen
- Keine automatischen Aggregationen
- Unklare Verantwortlichkeiten für Indikatoren

**Opportunities**:
- Daten-Qualitäts-Score pro Fachbereich
- Automatische Erinnerungen an Daten-Lieferanten
- Ziel-Ampel basierend auf Indikator-Trends

---

#### Phase 2: Anpassungen vornehmen
**Touchpoints**: Goal-Edit, Measure-Edit

**Schritte**:
1. Ziel "Klimaneutralität 2030" öffnen
2. Erfüllungsdatum anpassen: 2030 → 2035 (realistischer)
3. Neue Maßnahme hinzufügen: "Wasserstoff-Bus-Flotte"
4. Maßnahme "Kohle-Ausstieg" als "abgeschlossen" markieren

**Emotionaler Zustand**: Pragmatisch, leicht enttäuscht bei Ziel-Verschiebung

**Pain Points**:
- Änderungen nicht transparent nachvollziehbar
- Keine Versionierung sichtbar
- Kein Change-Log für Stadtrat

**Opportunities**:
- Revision-History mit Begründungen
- Änderungs-Protokoll exportierbar
- "Was hat sich geändert seit letztem Quartal?"-View

---

#### Phase 3: Bericht erstellen
**Touchpoints**: Export-Funktion, Dashboard

**Schritte**:
1. Dashboard aufrufen
2. Zeitraum wählen: Q1 2025
3. Export als:
   - PDF (für Stadtrat)
   - CSV (für weitere Analyse)
4. Bericht enthält:
   - Übersicht Ziele und Fortschritt
   - Maßnahmen-Status
   - Indikator-Entwicklung
   - Highlights und Herausforderungen

**Emotionaler Zustand**: Zufrieden bei gutem Bericht

**Pain Points**:
- PDF-Layout nicht anpassbar
- Keine automatischen Texte ("Was lief gut?")
- Charts nicht exportierbar

**Opportunities**:
- Template-System für Berichte
- KI-generierte Zusammenfassungen
- Interaktive Online-Berichte (statt PDF)

---

### Journey-Map 4: Bürger-Transparenz (Öffentliche Nutzung)

**Persona**: Bürger (Public)
**Ziel**: Fortschritte der Stadt nachvollziehen

#### Phase 1: Entdeckung
**Touchpoints**: Website, Suchmaschine

**Schritte**:
1. Google-Suche: "Musterstadt Nachhaltigkeitsstrategie"
2. Landing auf knot-dots Programm-Seite
3. Übersicht der Strategie

**Emotionaler Zustand**: Neugierig, leicht überfordert

**Pain Points**:
- Unklare Navigation
- Fachsprache
- Kein Onboarding

**Opportunities**:
- "Willkommen"-Tour für neue Besucher
- Einfache Sprache-Toggle
- Video-Erklärung

---

#### Phase 2: Exploration
**Touchpoints**: Hierarchie-View, Filter

**Schritte**:
1. Ziele durchstöbern
2. "Nachhaltige Mobilität" anklicken
3. Zugehörige Maßnahmen sehen
4. Indikator "Radwegeanteil" öffnen
5. Zeitreihen-Diagramm betrachten

**Emotionaler Zustand**: Interessiert, positiv überrascht

**Moments of Delight**:
- Schöne Visualisierungen
- Aktuelle Daten
- Transparenz

---

#### Phase 3: Vertiefung
**Touchpoints**: Measure-Detail, PDF-Download

**Schritte**:
1. Maßnahme "Radschnellwege" öffnen
2. Beschreibung lesen
3. Status: "In Umsetzung" (grün)
4. Zeitplan: 2024-2026
5. Verknüpfte Dokumente: PDF herunterladen

**Emotionaler Zustand**: Informiert, leicht frustriert (keine Interaktion möglich)

**Pain Points**:
- Keine Kommentarfunktion
- Keine Like/Follow-Funktion
- Keine Benachrichtigungen

**Opportunities**:
- Bürger-Feedback-Modul
- Newsletter-Abo für Fortschritte
- FAQ zu Maßnahmen

---

## Informationsarchitektur

### Haupt-Navigation

Die knot-dots Plattform ist primär objekt-orientiert strukturiert:

```
Dashboard (Home)
│
├── Programme
│   ├── Katalog (Card-View)
│   ├── Hierarchie (Tree-View)
│   ├── Tabelle (Table-View)
│   └── [Program-Detail]
│       ├── Übersicht
│       ├── Kapitel (Goals, Measures, etc.)
│       ├── Mitglieder
│       └── Einstellungen
│
├── Ziele (Goals)
│   ├── Katalog
│   ├── Hierarchie (nach Ebenen)
│   └── Tabelle
│
├── Maßnahmen (Measures)
│   ├── Katalog
│   ├── Status-Board (Kanban)
│   ├── Monitoring (Gantt-ähnlich)
│   ├── Vorlagen (Templates)
│   └── Tabelle
│
├── Indikatoren
│   ├── Katalog
│   └── Indikator-Board (Dashboards)
│
├── Aufgaben (Tasks)
│   ├── Katalog
│   ├── Status-Board (Kanban)
│   └── Tabelle
│
├── Wissen (Knowledge)
│   ├── Katalog
│   ├── Hierarchie
│   └── Tabelle
│
├── Regeln (Rules)
│   ├── Katalog
│   ├── Status
│   └── Tabelle
│
├── Meine Arbeit (Me)
│   ├── Meine Aufgaben
│   ├── Meine Maßnahmen
│   └── Profil
│
└── Einstellungen
    ├── Organisation
    ├── Organisationseinheiten
    └── Nutzer
```

---

### Ansichts-Modi

Alle Container-Typen unterstützen multiple Views:

#### 1. Katalog-Ansicht (Catalog)
- **Layout**: Card-Grid (responsive)
- **Vorteile**: Visuell, Übersicht, schnelles Scannen
- **Use Cases**: Exploration, Browsing
- **Sortierung**: Alphabetisch, Letzte Änderung
- **Filter**: Typ, Status, Kategorie, Themen, SDGs, etc.

#### 2. Hierarchie-Ansicht (Level)
- **Layout**: Tree-View mit Einrückungen
- **Vorteile**: Beziehungen sichtbar, Navigation zu Eltern/Kindern
- **Use Cases**: Strategien, Ziel-Hierarchien
- **Besonderheit**: Collapse/Expand, Drag-and-Drop-Reordering

#### 3. Tabellen-Ansicht (Table)
- **Layout**: Sortierbare Tabelle
- **Vorteile**: Datenorientiert, Export-freundlich, Vergleich
- **Use Cases**: Reporting, Bulk-Updates (Zukunft)
- **Spalten**: Konfigurierbar

#### 4. Status-Board (Status)
- **Layout**: Kanban-ähnlich (Spalten nach Status)
- **Vorteile**: Workflow-Übersicht, Drag-and-Drop
- **Use Cases**: Maßnahmen-Tracking, Task-Management
- **Spalten**: Idee | In Planung | In Umsetzung | Abgeschlossen

#### 5. Monitoring-Ansicht
- **Layout**: Gantt-ähnlich (nur Measures)
- **Vorteile**: Zeitliche Einordnung
- **Use Cases**: Projektmanagement
- **Achsen**: Zeit (X) vs. Maßnahmen (Y)

---

### Navigation Architecture: Workspace-Matrix & View-Patterns

#### Konzept: Was sind Workspaces?

In der knot-dots Plattform sind **Workspaces** keine eigenständigen Objekte, sondern **Navigationsmechanismen** – sie sind Pivot-Points, die den Zugriff auf die tatsächlichen Core-Objekte strukturieren.

**Workspace = Context (Type) × Presentation (View)**

Ein Workspace wird durch die Kombination zweier Dimensionen definiert:

1. **Type-Axis (Horizontal)**: *Was* wird angezeigt? (Welche Objekttypen?)
2. **View-Axis (Vertical)**: *Wie* wird es dargestellt? (Welches Layout-Muster?)

**OOUX-Klassifikation**: Workspaces sind **Navigation Pivot Points** und gehören zur Kategorie "Relationships" (R) und "CTAs" (C) im ORCA-Framework – sie definieren, wie Nutzer zu Objekten navigieren und welche Aktionen kontextabhängig verfügbar sind.

---

#### Workspace-Matrix: Vollständige Mapping-Tabelle

Die folgende Matrix zeigt alle verfügbaren Workspace-Kombinationen:

| **Type ↓ / View →** | **Page** | **Catalog** | **Level** | **Status** | **Monitoring** | **Table** |
|---------------------|----------|-------------|-----------|------------|----------------|-----------|
| **All** (Alle Objekte) | ✓ `/all/page` | ✓ `/all/catalog` | ✓ `/all/level` | ✓ `/all/status` | ✗ | ✓ `/all/table` |
| **Programs** | ✗ | ✓ `/programs/catalog` | ✓ `/programs/level` | ✗ | ✗ | ✓ `/programs/table` |
| **Goals** (Ziele) | ✗ | ✓ `/goals/catalog` | ✓ ⭐ `/goals/level` | ✗ | ✗ | ✓ `/goals/table` |
| **Measures** (Maßnahmen) | ✗ | ✓ `/measures/catalog` | ✗ | ✓ ⭐ `/measures/status` | ✓ ⭐ `/measures/monitoring` | ✓ `/measures/table` |
| **Rules** (Regeln) | ✗ | ✓ `/rules/catalog` | ✗ | ✓ `/rules/status` | ✗ | ✓ `/rules/table` |
| **Tasks** (Aufgaben) | ✗ | ✓ `/tasks/catalog` | ✗ | ✓ ⭐ `/tasks/status` | ✗ | ✓ `/tasks/table` |
| **Knowledge** (Wissen) | ✗ | ✓ `/knowledge/catalog` | ✓ `/knowledge/level` | ✗ | ✗ | ✓ `/knowledge/table` |
| **Indicators** | ✗ | ✓ ⭐ `/indicators` | ✗ | ✗ | ✗ | ✗ |
| **Objectives & Effects** | ✗ | ✗ | ✓ ⭐ `/objectives-and-effects` | ✗ | ✗ | ✗ |

**Legende:**
- ✓ = Workspace verfügbar
- ✗ = Workspace nicht vorhanden
- ⭐ = Empfohlener Workspace für diesen Objekttyp

---

#### View-Pattern Definitionen

##### 1. **Page View** (`/all/page`)
- **Layout**: Landing-Page-Stil mit Übersichtskarten
- **Zweck**: Haupteinstiegspunkt, Dashboard-ähnlich
- **Verfügbar für**: Nur "All"
- **Komponenten**:
  - Hero-Section mit Kontext-Information
  - Aggregierte Statistiken
  - Quick-Access zu häufig genutzten Objekten
- **User Journey**: Orientierung, Exploration starten
- **Primary CTA**: Navigation zu spezifischen Workspaces

##### 2. **Catalog View** (`/{type}/catalog`)
- **Layout**: Responsive Card-Grid (flexbox/grid)
- **Zweck**: Visuelles Browsing und Exploration
- **Verfügbar für**: All, Programs, Goals, Measures, Rules, Tasks, Knowledge, Indicators
- **Darstellung**:
  - Cards mit Thumbnail/Icon
  - Titel, Kurzinfo, Status-Badge
  - Quick-Actions (View, Edit, Delete)
- **Sortierung**: Alphabetisch, Letzte Änderung, Erstelldatum
- **Filter**: Typ, Status, Kategorie, Themen, SDGs
- **User Journey**: Discovery, schnelles Scannen
- **Primary CTA**: Objekt-Detail öffnen (Overlay)

##### 3. **Level View** (`/{type}/level`)
- **Layout**: Hierarchische Tree-View mit Einrückungen
- **Zweck**: Strukturen und Beziehungen visualisieren
- **Verfügbar für**: All, Programs, Goals, Knowledge, Objectives-and-Effects
- **Empfohlen für**: Goals (Zielhierarchien), Objectives-and-Effects (Wirkungsketten)
- **Features**:
  - Expand/Collapse-Funktionalität
  - Drag-and-Drop für Neuordnung
  - Parent-Child-Beziehungen sichtbar
  - Hierarchieebenen farblich codiert
- **User Journey**: Strukturanalyse, Zusammenhänge verstehen
- **Primary CTA**: Navigation in Hierarchie, Beziehungen verwalten

##### 4. **Status View** (`/{type}/status`)
- **Layout**: Kanban-Board (Spalten nach Status)
- **Zweck**: Workflow-Management und Status-Tracking
- **Verfügbar für**: All, Measures, Rules, Tasks
- **Empfohlen für**: Measures, Tasks (aktive Arbeit)
- **Spalten**:
  - **Measures**: Idee | In Planung | In Umsetzung | In Betrieb | Abgeschlossen
  - **Tasks**: Offen | In Arbeit | Review | Erledigt
  - **Rules**: Status-spezifisch
- **Features**:
  - Drag-and-Drop zwischen Status-Spalten
  - Visuelles Status-Update
  - Anzahl pro Spalte
- **User Journey**: Aktive Arbeit managen, Fortschritt visualisieren
- **Primary CTA**: Status ändern (Drag-and-Drop), Detail-Bearbeitung

##### 5. **Monitoring View** (`/measures/monitoring`)
- **Layout**: Gantt-Chart-ähnlich (Timeline-basiert)
- **Zweck**: Zeitliche Planung und Projektmanagement
- **Verfügbar für**: Nur Measures
- **Empfohlen für**: Measures (Projektplanung)
- **Darstellung**:
  - X-Achse: Zeitstrahl
  - Y-Achse: Maßnahmen
  - Balken: Start-/Enddatum visualisiert
  - Farbcodierung: Status
- **Features**:
  - Zoom-Level (Monat, Quartal, Jahr)
  - Überlappende Maßnahmen erkennbar
  - Meilenstein-Marker
- **User Journey**: Ressourcenplanung, Zeitmanagement
- **Primary CTA**: Zeitplan anpassen, Konflikte identifizieren

##### 6. **Table View** (`/{type}/table`)
- **Layout**: Sortierbare Datentabelle
- **Zweck**: Datenorientierte Analyse und Export
- **Verfügbar für**: All, Programs, Goals, Measures, Rules, Tasks, Knowledge
- **Darstellung**:
  - Spalten: Konfigurierbar
  - Sortierung: Multi-Column-Sort
  - Pagination: Server-seitig
- **Features**:
  - Column-Visibility-Toggle
  - Inline-Editing (Zukunft)
  - CSV/Excel-Export
  - Bulk-Selection
- **User Journey**: Reporting, Datenanalyse, Vergleich
- **Primary CTA**: Export, Bulk-Operations (Zukunft)

---

#### Context Rules & Availability Logic

##### Workspace-Verfügbarkeit basierend auf Organisationskontext

Die Verfügbarkeit bestimmter Workspaces ist **kontextabhängig** und wird durch Organisations- und Organisationseinheiten-Einstellungen gesteuert:

**1. Tasks-Workspace**
- **Bedingung**: Verfügbar, wenn Organisation/OE **nicht** als "default" gekennzeichnet ist
- **Logik**: `!('default' in context.payload) || !context.payload.default`
- **Code-Referenz**: `WorkspacesMenu.svelte:173-183`
- **Grund**: Tasks sind nur für aktive, konfigurierte Organisationen relevant

**2. Indicators & Objectives-and-Effects Workspaces**
- **Bedingung**: Verfügbar, wenn Organisation/OE Board "board.indicators" aktiviert hat
- **Logik**: `context.payload.boards.includes(boards.enum['board.indicators'])`
- **Code-Referenz**: `WorkspacesMenu.svelte:184-202`
- **Grund**: Opt-in-Feature für fortgeschrittene Nutzer

##### View-Fallback-Mechanismus

Wenn ein Workspace nicht für einen bestimmten Type verfügbar ist, greift ein **Fallback-Mechanismus**:

**Fallback-Hierarchie (Type-Wechsel):**
- **Page** → Fallback: `/all/level`
- **Catalog** → Fallback: Type-spezifischer Default (z.B. `/programs/catalog`)
- **Level** → Fallback: Type-spezifischer Default (z.B. `/goals/level`)
- **Status** → Fallback: `/measures/status`
- **Monitoring** → Fallback: `/measures/monitoring`
- **Table** → Fallback: `/all/table`

**Beispiel**: Nutzer ist in `/measures/status` und wechselt zu "Programs":
- Gewünscht: `/programs/status` (nicht verfügbar)
- Fallback: `/programs/catalog` (verfügbar)

**Code-Referenz**: `WorkspacesMenu.svelte:136, 143, 150, etc.`

---

#### State Management & Navigation Behavior

##### URL-Parameter-Behandlung

**Preserved Parameters:**
- `fragment` (z.B. `#view=123-456-789`) → bleibt erhalten
- Custom query params (kontextabhängig)

**Cleared Parameters:**
- `related-to` → wird beim Workspace-Wechsel entfernt
- **Grund**: Relation-Filter sind workspace-spezifisch und sollten nicht über Kontexte hinweg beibehalten werden
- **Code-Referenz**: `WorkspacesMenu.svelte:266`

**Beispiel:**
```
Aktuell: /measures/status?related-to=abc-def#view=xyz
User wechselt zu "Goals"
Resultat: /goals/level#view=xyz
```

##### Workspace-Komponente: `WorkspacesMenu.svelte`

**UI-Pattern**: Dual-Dropdown-System
- **Linker Dropdown**: Type-Selektor (All, Programs, Goals, etc.)
- **Rechter Dropdown**: View-Selektor (Page, Catalog, Level, etc.)

**Features**:
- **Visual Cues**:
  - ⭐ Stern-Icon für empfohlene Workspaces
  - Ausgegraut: Nicht verfügbare Kombinationen (still clickable → Fallback)
  - Highlight: Aktuell ausgewählter Workspace
- **Icon-basierte Navigation**: Jeder Type und View hat ein dediziertes Icon
- **Responsive**: Ab 24rem Container-Width sichtbar

---

#### Recommended Workspace-Patterns per Object Type

| **Object Type** | **Recommended View** | **Reason** | **Alternative Views** |
|----------------|---------------------|------------|----------------------|
| **Programs** | Catalog, Level | Übersicht, Hierarchie | Table (Reporting) |
| **Goals** | Level ⭐ | Zielhierarchien natürlich hierarchisch | Catalog (Exploration), Table |
| **Measures** | Status ⭐, Monitoring ⭐ | Workflow-Management, Zeitplanung | Catalog, Table |
| **Rules** | Status, Catalog | Compliance-Tracking | Table |
| **Tasks** | Status ⭐ | Kanban-Workflow ideal für Tasks | Catalog, Table |
| **Knowledge** | Level, Catalog | Wissensstrukturen hierarchisch | Table |
| **Indicators** | Catalog ⭐ | Dashboard-ähnlich, KPI-Übersicht | - |
| **Objectives & Effects** | Level ⭐ | Wirkungsketten hierarchisch | - |

---

#### User Journey Implications

##### Typische Nutzer-Pfade

**1. Strategic Planner Journey**
```
Home → Programs (Catalog) → Program-Detail → Goals (Level) → Goal-Detail → Measures (Status)
```
- **Workspace-Nutzung**: Catalog → Level → Status
- **Grund**: Von Übersicht über Struktur zu operativer Arbeit

**2. Operational Manager Journey**
```
Home → Measures (Status) → Measure-Detail → Tasks (Status) → Task-Detail
```
- **Workspace-Nutzung**: Status (primär)
- **Grund**: Fokus auf aktiver Arbeit und Fortschritt

**3. Data Analyst Journey**
```
Home → Indicators (Catalog) → Indicator-Detail → Measures (Table) → Export
```
- **Workspace-Nutzung**: Catalog → Table
- **Grund**: Datensammlung und Analyse

**4. Public Stakeholder Journey**
```
Home → All (Page) → Programs (Catalog) → Program-Detail → Goals (Level)
```
- **Workspace-Nutzung**: Page → Catalog → Level
- **Grund**: Transparenz, explorative Navigation

##### Workspace-Switching-Muster

**Vertikale Navigation (View-Wechsel)**:
- User bleibt beim gleichen Object-Type
- Ändert nur die Darstellung
- **Use Case**: "Ich möchte Measures als Gantt-Chart statt Kanban sehen"
- **Beispiel**: `/measures/status` → `/measures/monitoring`

**Horizontale Navigation (Type-Wechsel)**:
- User wechselt Object-Type
- Behält View-Präferenz (wenn verfügbar)
- **Use Case**: "Ich möchte von Programs zu Goals wechseln, aber Level-View behalten"
- **Beispiel**: `/programs/level` → `/goals/level`

**Diagonale Navigation (Type + View)**:
- User wechselt sowohl Type als auch View
- **Use Case**: "Ich möchte von der Measures-Statusübersicht zur Program-Katalog-Ansicht"
- **Beispiel**: `/measures/status` → `/programs/catalog`

---

#### Design Patterns & Best Practices

##### Workspace Selection Logic

**Empfehlungsalgorithmus** (WorkspacesMenu.svelte:217-226):
```typescript
recommended: ['measures', 'rules', 'tasks'].includes(selectedType) // für Status-View
recommended: ['all', 'goals', 'knowledge', 'objectives-and-effects'].includes(selectedType) // für Level-View
recommended: selectedType == 'measures' // für Monitoring-View
recommended: selectedType == 'indicators' // für Catalog-View
```

##### Accessibility Considerations

- **Visually Hidden Labels**: Bei kleinen Viewports wird der Text ausgeblendet, Icons bleiben sichtbar
- **Code-Referenz**: `WorkspacesMenu.svelte:383-389`
- **Responsive Design**: `@container (min-width: 60rem)` → Text wieder sichtbar

##### Performance Optimizations

- **Client-Side Navigation**: `goto(url)` ohne Full-Page-Reload
- **URL-basiertes State Management**: Workspace-State ist vollständig in URL kodiert
- **Bookmarkable**: Jeder Workspace hat eine eindeutige, teilbare URL

---

#### Technical Implementation Notes

**Frontend-Architektur**:
- **Component**: `app/src/lib/components/WorkspacesMenu.svelte`
- **Routing**: SvelteKit File-based Routing (`/routes/{type}/{view}/+page.svelte`)
- **State Management**: Svelte Stores + URL State

**Data Structures**:
```typescript
// Type → View Mapping
workspacesLeft: Record<string, Record<string, string>>
// Example: workspacesLeft.measures.status = '/measures/status'

// View → Type Mapping
workspacesRight: Record<string, Record<string, string>>
// Example: workspacesRight.status.measures = '/measures/status'
```

**Navigation Logic**:
1. User klickt Workspace-Option
2. Event-Handler prüft: `selected !== page.url.pathname`
3. URL wird konstruiert: `url.pathname = detail.selected`
4. Relation-Filter entfernen: `url.searchParams.delete('related-to')`
5. Navigation: `goto(url)`

---

### Overlay-System

Detailansichten werden als Overlays geöffnet (nicht neue Seite):

**Overlay-Typen**:
- **view**: Detail-Ansicht (read-only)
- **create**: Neues Objekt erstellen
- **relate**: Beziehungen verwalten
- **members**: Mitglieder verwalten
- **table**: Tabellen-Overlay
- **view-help**: Hilfe-Dialog

**URL-Pattern**: `#view={guid}` (Fragment-basiert für Back-Button)

**Vorteile**:
- Kontext bleibt erhalten
- Schnellere Navigation
- Mehrere Overlays stapelbar (z.B. Measure → Related Goal)

---

### Filter-System

**Globale Filter** (in allen Listen):
- **Typ** (payloadType): Checkboxen
- **Status**: Dropdown oder Checkboxen
- **Themen** (topics): Multi-Select
- **SDGs** (categories): Icon-Grid mit Multi-Select
- **Organisationseinheit**: Dropdown (mit Hierarchie)
- **Volltext**: Suchfeld (PostgreSQL Full-Text-Search)

**Spezifische Filter**:
- **Measures**: measureTypes, Zeitraum (startDate-endDate)
- **Tasks**: Zugewiesen an, Priorität, Kategorie
- **Indicators**: indicatorTypes, indicatorCategories, Einheit

**Filter-Persistence**:
- URL-Parameter: `?type=measure&status=in_implementation`
- Ermöglicht Bookmarks und Teilen

---

### Suchfunktion

**Technologie**: PostgreSQL Full-Text-Search (German Dictionary)

**Scope**:
- Titel, Beschreibung, Summary
- JSONB-Payload durchsuchbar

**Features**:
- Prefix-Matching (auto-complete)
- Stemming (deutsch)
- Ranking nach Relevanz

**UI**:
- Globale Suchleiste im Header
- Typ-Filter kombinierbar
- Ergebnisse als Liste mit Snippet

---

## Erkenntnisse und Empfehlungen

### Stärken des aktuellen Systems

#### 1. Flexible Container-Architektur
**Erkenntnis**: Das einheitliche Container-Modell mit Payload-Types ist elegant und erweiterbar.

**Vorteil**:
- Neue Typen leicht hinzufügbar
- Gemeinsame CRUD-Logik
- Einheitliche Berechtigungen

**Empfehlung**: Beibehalten und weiter nutzen

---

#### 2. Granulare Berechtigungen
**Erkenntnis**: CASL-basierte Ability-System ist mächtig und flexibel.

**Vorteil**:
- Feingranulare Kontrolle (Feld-Ebene)
- Rollenbasiert und kontextabhängig
- Organisation/OE-basierte Isolation

**Herausforderung**: Komplexität für neue Nutzer

**Empfehlung**:
- Berechtigungs-Übersicht in UI einbauen ("Was kann ich?")
- Tooltips bei eingeschränkten Aktionen ("Warum kann ich nicht löschen?")

---

#### 3. Revisions-System
**Erkenntnis**: Vollständige Historie durch Revisions-Tracking ist wertvoll.

**Vorteil**:
- Audit-Trail
- Wiederherstellung möglich
- Änderungsnachvollziehbarkeit

**Herausforderung**: UI zeigt keine Versionen

**Empfehlung**:
- "Versionen anzeigen"-Funktion in Detail-Ansichten
- Diff-View zwischen Revisionen
- Wiederherstellungs-Funktion für Admins

---

### Herausforderungen und Verbesserungspotenziale

#### 1. Komplexität der Objektbeziehungen
**Problem**: 20+ Beziehungstypen sind schwer zu durchschauen.

**User Impact**:
- Unsicherheit, welche Beziehung die richtige ist
- Fehlerhafte Verknüpfungen
- Redundanz (is-part-of vs. is-part-of-program)

**Empfehlungen**:
1. **Beziehungs-Wizard**: Geführter Dialog zur Auswahl der richtigen Beziehung
   - "Was möchten Sie tun?" → Kontext-sensitive Optionen
2. **Visuelle Beziehungs-Karte**: Graph-Visualisierung aller Beziehungen eines Objekts
3. **Smart-Linking**: KI-gestützte Vorschläge basierend auf Kontext
   - "Dieses Ziel könnte zu folgenden Maßnahmen passen..."
4. **Beziehungs-Templates**: Häufige Muster als Shortcuts
   - "Maßnahme mit Standard-Monitoring anlegen" → erstellt automatisch Effects, Tasks

---

#### 2. Datenpflege-Aufwand
**Problem**: Monatliche Updates von vielen Objekten sind zeitaufwendig.

**User Impact**:
- Vernachlässigte Daten
- Veraltete Indikatorwerte
- Frustration bei Projektmitarbeitern

**Empfehlungen**:
1. **Bulk-Operations**:
   - Multi-Select in Listen
   - Batch-Status-Update
   - Bulk-Edit-Modus
2. **Daten-Import-Schnittstellen**:
   - CSV-Import für Indikatorwerte
   - API für Fachsysteme (z.B. Energie-Monitoring)
   - Automatische Synchronisation
3. **Smart-Reminders**:
   - E-Mail-Benachrichtigungen bei fehlenden Updates
   - Dashboard-Warnungen bei veralteten Daten
   - Personalisierte Todo-Listen
4. **Templates & Duplikation**:
   - "Aus Vorlage erstellen" für Maßnahmen
   - "Vorjahreswerte kopieren" für Indikatoren
   - Wiederkehrende Tasks automatisch erstellen

---

#### 3. Fehlende Visualisierungen
**Problem**: Daten primär tabellarisch, wenig Diagramme.

**User Impact**:
- Schwer, Trends zu erkennen
- Wenig überzeugende Berichte
- Geringe Nutzung durch Öffentlichkeit

**Empfehlungen**:
1. **Indikator-Dashboards**:
   - Zeitreihen-Diagramme (Line Charts)
   - Soll/Ist-Vergleich (Bar Charts)
   - SDG-Fortschritts-Wheel
2. **Maßnahmen-Visualisierung**:
   - Gantt-Chart für Zeitplanung
   - Contribution-Matrix (Measures x Goals)
   - Impact-Bubble-Chart (Aufwand vs. Wirkung)
3. **Strategie-Übersicht**:
   - Interaktive Mindmap der Zielstruktur
   - Sankey-Diagramme für Wirkungsketten
   - Ampel-Status auf allen Ebenen
4. **Exportierbare Visualisierungen**:
   - Charts als PNG/SVG
   - Einbettbare Widgets für externe Websites
   - Interaktive Online-Berichte statt PDFs

---

#### 4. Unklare Indikator-Systematik
**Problem**: Unterscheidung indicatorTypes, indicatorCategories, quantities unklar.

**User Impact**:
- Inkonsistente Kategorisierung
- Dubletten bei Indikatoren
- Schwierige Suche

**Empfehlungen**:
1. **Indikator-Katalog**:
   - Vordefinierte SDG-Indikatoren als Templates
   - Suchfunktion mit Filtern (Thema, Einheit, SDG)
   - "Empfohlene Indikatoren" basierend auf Zielen
2. **Guided Creation**:
   - Schritt-für-Schritt-Wizard
   - Tooltips mit Erklärungen
   - Beispiele für jede Kategorie
3. **Deduplizierung**:
   - "Ähnliche Indikatoren"-Warnung bei Erstellung
   - Merge-Funktion für Dubletten
4. **Standardisierung**:
   - Best-Practice-Guide für Indikatoren
   - Qualitätskriterien (SMART-Check)

---

#### 5. Multi-Tenancy vs. Kollaboration
**Problem**: Strenge Organisation-Isolation verhindert Kooperation.

**User Impact**:
- Keine Verknüpfung zwischen Kommunen möglich
- Redundante Maßnahmen in verschiedenen Städten
- Kein Wissensaustausch

**Empfehlungen**:
1. **Cross-Org-Sharing**:
   - "Public Catalog" für Maßnahmen-Templates
   - Best-Practice-Pool
   - Opt-in Sharing einzelner Container
2. **Inter-Org-Relations**:
   - is-inspired-by Beziehung zu fremden Containern
   - "Kopieren aus anderer Organisation"
3. **Benchmark-Funktion**:
   - Anonymisierte Vergleiche (z.B. CO2/Kopf mit ähnlichen Städten)
4. **Kollaborations-Räume**:
   - Temporäre "Projekt-Organisationen" für Kooperationen
   - Regional-Dashboards (z.B. Metropolregion)

---

#### 6. Fehlende KI-Features
**Problem**: aiSuggestion-Flag existiert, aber wenig Nutzung.

**Potenzial**:
- Reduktion manueller Arbeit
- Qualitätsverbesserung
- Nutzer-Guidance

**Empfehlungen**:
1. **Smart-Create**:
   - Titel eingeben → KI schlägt Beschreibung vor
   - Maßnahme anlegen → KI schlägt passende Ziele/Indikatoren vor
   - SDG-Auto-Tagging basierend auf Inhalt
2. **Content-Verbesserung**:
   - "Zusammenfassung generieren" aus Beschreibung
   - "In einfache Sprache übersetzen" für Bürger-View
   - Konsistenz-Checks ("Dieses Ziel widerspricht Maßnahme X")
3. **Automatische Berichte**:
   - KI-generierte Quartals-Zusammenfassungen
   - "Was lief gut/schlecht?" basierend auf Daten
   - Recommendations for Action
4. **Predictive Analytics**:
   - Trend-Prognosen für Indikatoren
   - Risiko-Erkennung (z.B. Maßnahme wird Ziel verfehlen)
   - Ressourcen-Optimierung

---

#### 7. Mobile Experience
**Problem**: Keine spezifische Mobile-Optimierung ersichtlich.

**User Impact**:
- Umständliche Nutzung auf Smartphones
- Eingeschränkte Nutzung im Außendienst

**Empfehlungen**:
1. **Mobile-First-Views**:
   - Vereinfachte Card-Designs
   - Touch-optimierte Buttons
   - Progressive Web App (PWA)
2. **Mobile-spezifische Funktionen**:
   - Quick-Status-Update (Swipe-Gesten)
   - Foto-Upload für Maßnahmen-Dokumentation
   - Offline-Modus für Daten-Erfassung vor Ort
3. **Responsive Dashboards**:
   - Charts optimiert für kleine Screens
   - Prioritäts-basierte Content-Reihenfolge

---

#### 8. Onboarding & Dokumentation
**Problem**: Hohe Einstiegshürde für neue Nutzer.

**User Impact**:
- Lange Einarbeitungszeit
- Fehlerhafte Nutzung
- Support-Aufwand

**Empfehlungen**:
1. **Interactive Tutorials**:
   - "Erste Schritte"-Tour beim ersten Login
   - Kontext-sensitive Hilfe (Tooltips, Popovers)
   - Video-Tutorials für komplexe Workflows
2. **Sample-Daten**:
   - Demo-Organisation mit Beispiel-Strategie
   - Playground-Modus zum Ausprobieren
3. **Dokumentation**:
   - In-App-Hilfe-Center
   - Suchbare FAQs
   - Use-Case-basierte Guides (nicht Feature-basiert)
4. **Rollen-spezifisches Onboarding**:
   - Admin: "So richten Sie Ihre Organisation ein"
   - Collaborator: "So dokumentieren Sie Maßnahmen"
   - Public: "So nutzen Sie die Plattform als Bürger"

---

### Priorisierte Roadmap

Basierend auf Impact vs. Aufwand:

#### Quick Wins (High Impact, Low Effort)
1. **Bulk-Status-Update**: Multi-Select + Dropdown
2. **Indikator-Templates**: Vordefinierte SDG-Indikatoren
3. **Revisions-Anzeige**: Einfacher "History"-Tab
4. **Tooltips für Berechtigungen**: "Warum kann ich nicht...?"
5. **CSV-Import für Indikator-Werte**

#### Mittelfristig (3-6 Monate)
1. **Visualisierungs-Dashboard**: Charts für Indikatoren und Maßnahmen
2. **KI-Features**: Auto-Suggest, SDG-Tagging, Zusammenfassungen
3. **Beziehungs-Wizard**: Geführte Verknüpfungen
4. **Mobile-Optimierung**: PWA, Offline-Modus
5. **Smart-Reminders**: Automatische Update-Erinnerungen

#### Langfristig (6-12 Monate)
1. **Cross-Org-Collaboration**: Public Catalog, Benchmarking
2. **Automatische Berichte**: KI-generierte Quartalsberichte
3. **Predictive Analytics**: Trend-Prognosen, Risiko-Erkennung
4. **Advanced Visualisierungen**: Sankey, Mindmaps, Contribution-Matrix
5. **API-Integrationen**: Fachsysteme anbinden

---

## Anhang

### Glossar

**Container**: Basis-Entität des Systems mit GUID, Revision und Payload
**Payload**: Typ-spezifischer Inhalt eines Containers
**Predicate**: Beziehungstyp zwischen zwei Containern
**Revision**: Versionsnummer eines Containers (inkrementell)
**Realm**: Keycloak-Mandant
**CASL**: Ability-basiertes Berechtigungssystem
**SDG**: Sustainable Development Goals (UN-Nachhaltigkeitsziele)
**BNK**: Berichterstattung Nachhaltige Kommunen
**OE**: Organisationseinheit

---

### Datenmodell-Diagramm

```
┌─────────────────┐
│   CONTAINER     │ (Basis für alle Objekte)
├─────────────────┤
│ guid            │
│ revision        │
│ organization    │────┐
│ org_unit        │    │
│ managed_by      │    │
│ realm           │    │
│ valid_from      │    │
│ valid_currently │    │
│ payload (JSON)  │    │
└─────────────────┘    │
         │             │
         │has          │belongs to
         ↓             ↓
┌─────────────────┐ ┌──────────────┐
│   RELATION      │ │ ORGANIZATION │
├─────────────────┤ ├──────────────┤
│ subject (UUID)  │ │ guid         │
│ predicate       │ │ name         │
│ object (UUID)   │ │ boards[]     │
│ position        │ │ default      │
└─────────────────┘ └──────────────┘
         ↑                 │
         │                 │has
         │                 ↓
         │          ┌─────────────────┐
         │          │ ORGANIZATIONAL  │
         │          │      UNIT       │
         │          ├─────────────────┤
         │          │ guid            │
         │          │ name            │
         │          │ level           │
         │          └─────────────────┘
         │
    links to
         │
    ┌────┴────┐
    ↓         ↓
┌────────┐ ┌──────────┐
│ PROGRAM│ │  GOAL    │
│ MEASURE│ │ INDICATOR│
│  etc.  │ │   etc.   │
└────────┘ └──────────┘
```

---

### OOUX Objektkarten (Beispiele)

#### Objektkarte: MEASURE

```
┌────────────────────────────────────────────┐
│               MEASURE                      │
│        (Maßnahme)                         │
├────────────────────────────────────────────┤
│ CORE ATTRIBUTES:                           │
│ • title (Pflicht)                         │
│ • description                             │
│ • status (Idee → Abgeschlossen)          │
│ • startDate / endDate                     │
│ • measureType[]                           │
│                                            │
│ RELATIONSHIPS:                             │
│ • is-part-of-program → PROGRAM            │
│ • contributes-to → GOAL                   │
│ • is-consistent-with → MEASURE            │
│ • is-part-of-measure ← EFFECT, TASK       │
│                                            │
│ CTAs:                                      │
│ • Create, Read, Update, Delete            │
│ • Relate (zu Goals, Programmen)           │
│ • Copy (als Template)                     │
│ • Invite Members                          │
│                                            │
│ STATES:                                    │
│ • Idee                                    │
│ • In Planung                              │
│ • In Umsetzung                            │
│ • In Betrieb                              │
│ • Abgeschlossen                           │
│ • Abgelehnt                               │
└────────────────────────────────────────────┘
```

#### Objektkarte: INDICATOR

```
┌────────────────────────────────────────────┐
│             INDICATOR                      │
│          (Indikator)                      │
├────────────────────────────────────────────┤
│ CORE ATTRIBUTES:                           │
│ • title (Pflicht)                         │
│ • quantity (CO2, Breitband, etc.)         │
│ • unit (kg, %, km)                        │
│ • historicalValues[] (Zeitreihe)          │
│ • indicatorType[] (Impact, Performance)   │
│ • indicatorCategory[] (KPI, SDG)          │
│                                            │
│ RELATIONSHIPS:                             │
│ • is-measured-by ← GOAL, EFFECT           │
│ • is-objective-for ← OBJECTIVE            │
│ • is-affected-by ↔ INDICATOR              │
│                                            │
│ CTAs:                                      │
│ • Create, Read, Update, Delete            │
│ • Update Historical Values                │
│ • Copy (as Template)                      │
│ • Visualize (Chart)                       │
│                                            │
│ METADATA:                                  │
│ • Datenquelle                             │
│ • Aktualisierungs-Frequenz                │
│ • Verantwortlich                          │
└────────────────────────────────────────────┘
```

---

### Change Log dieser Dokumentation

| Version | Datum | Änderungen |
|---------|-------|------------|
| 1.0 | 2025-10-10 | Initiale Version basierend auf OOUX/ORCA Methodik |

---

**Ende der OOUX/ORCA Dokumentation**

---

## Zusammenfassung

Diese OOUX/ORCA-Dokumentation hat das knot-dots System systematisch analysiert:

- **17 Kern-Objekte** identifiziert und dokumentiert
- **20+ Beziehungstypen** kategorisiert und erklärt
- **11 primäre CTAs** mit Berechtigungen und Workflows beschrieben
- **100+ Attribute** inventarisiert und gruppiert
- **5 User Personas** mit Rollen und Berechtigungen definiert
- **4 detaillierte User Journeys** durchgespielt
- **Informationsarchitektur** mit Navigation und Views skizziert
- **8 Hauptherausforderungen** identifiziert mit konkreten Empfehlungen

Die Analyse zeigt ein mächtiges, aber komplexes System mit großem Potenzial für Verbesserungen in:
1. Nutzerführung (Wizards, Smart-Linking)
2. Automatisierung (KI, Bulk-Ops, Reminders)
3. Visualisierung (Charts, Dashboards)
4. Kollaboration (Cross-Org, Benchmarking)

Die priorisierte Roadmap bietet Quick Wins und langfristige Innovationen zur Steigerung der Nutzerakzeptanz und Effizienz.
