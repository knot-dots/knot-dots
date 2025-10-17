# OOUX Objekt-Dokumentation Template

## 1. Objekt-Übersicht

**Objektname:** [Name des Objekts]

**Objekttyp:** [ ] Core Object | [ ] Supporting Object | [ ] Pivot Object

**Beschreibung:** 
[Kurze Beschreibung des Objekts und seiner Rolle in der Plattform]

**Business Value:**
[Warum ist dieses Objekt wichtig? Welchen Wert liefert es?]

---

## 2. Core Content & Attribute

### 2.1 Primäre Attribute

| Attribut | Typ | Required | Default | Beschreibung |
|----------|-----|----------|---------|--------------|
| [z.B. ID] | String/Number/etc. | ✓ / ✗ | - | [Beschreibung] |
| [z.B. Name] | String | ✓ | - | [Beschreibung] |
| [z.B. Status] | Enum | ✓ | "draft" | [Beschreibung] |

### 2.2 Metadata-Attribute

| Attribut | Typ | Required | Default | Beschreibung |
|----------|-----|----------|---------|--------------|
| created_at | DateTime | ✓ | now() | Erstellungszeitpunkt |
| updated_at | DateTime | ✓ | now() | Letzte Änderung |
| created_by | Reference(User) | ✓ | current_user | Ersteller |

### 2.3 Conditional Logic Attribute

| Attribut | Condition | Auswirkung | Abhängigkeiten |
|----------|-----------|------------|----------------|
| [z.B. is_published] | true/false | Beeinflusst Sichtbarkeit | status = "active" |
| [z.B. approval_required] | true | Zeigt Approval-Flow | role = "contributor" |

### 2.4 Attribute - Mögliche Werte

**[Attributname]:**
- Typ: [Enum/String/Number/etc.]
- Mögliche Werte:
  - `wert1` - [Beschreibung/Bedeutung]
  - `wert2` - [Beschreibung/Bedeutung]
  - `wert3` - [Beschreibung/Bedeutung]
- Validierung: [Regex/Range/Custom Rules]
- Fehlermeldung: [Text bei ungültiger Eingabe]

---

## 3. Relationships (MCSFD-Analyse)

### Relationship 1: [Beziehungsname]

**Verbundenes Objekt:** [Zielobjekt]

**Mechanics (M):** 
- [ ] Has One/Many
- [ ] Belongs To
- [ ] Many-to-Many
- [ ] Nested
- [ ] Referenced

**Cardinality (C):**
- Von diesem Objekt: [1:1 | 1:n | n:m]
- Zum Zielobjekt: [1:1 | 1:n | n:m]
- Minimum: [Anzahl]
- Maximum: [Anzahl | unbegrenzt]

**Sorting (S):**
- Standard-Sortierung: [Feld, Richtung]
- Verfügbare Sortieroptionen:
  - [Option 1: z.B. "Datum aufsteigend"]
  - [Option 2: z.B. "Name alphabetisch"]
  - [Option 3: z.B. "Priorität"]

**Filtering (F):**
- Verfügbare Filter:
  - [Filter 1: z.B. "Status = aktiv/archiviert"]
  - [Filter 2: z.B. "Kategorie = ...]
  - [Filter 3: z.B. "Datum-Range"]
- Standard-Filter: [Welcher Filter ist vorausgewählt?]

**Dependencies (D):**
- Abhängig von: [Welche Bedingungen müssen erfüllt sein?]
- Auswirkungen bei Löschung: [Cascade | Set Null | Restrict | etc.]
- Validierungsregeln: [z.B. "Mindestens 1 Item erforderlich"]
- Business Rules: [z.B. "Nur Owner kann zuweisen"]

**Darstellung:**
- [ ] Liste
- [ ] Grid/Cards
- [ ] Tabelle
- [ ] Tree/Hierarchie
- [ ] Timeline
- [ ] Andere: [beschreiben]

---

### Relationship 2: [Beziehungsname]

[Wiederhole Struktur von oben für weitere Relationships]

---

## 4. Actions & Interaktionen

### 4.1 CRUD-Operationen

| Action | Verfügbar | Berechtigung | Bedingungen | Validierung |
|--------|-----------|--------------|-------------|-------------|
| Create | ✓ / ✗ | [Role/Permission] | [z.B. "nicht in read-only Mode"] | [Required fields, etc.] |
| Read | ✓ / ✗ | [Role/Permission] | [Bedingungen] | - |
| Update | ✓ / ✗ | [Role/Permission] | [z.B. "nur Owner"] | [Welche Felder?] |
| Delete | ✓ / ✗ | [Role/Permission] | [z.B. "keine Dependencies"] | [Soft/Hard Delete?] |

### 4.2 Custom Actions

| Action-Name | Beschreibung | Trigger | Berechtigung | Side Effects |
|-------------|--------------|---------|--------------|--------------|
| [z.B. "Publish"] | [Beschreibung] | Button/Event | [Role] | [Status-Änderung, Notification, etc.] |
| [z.B. "Archive"] | [Beschreibung] | Button/Event | [Role] | [Was passiert?] |
| [z.B. "Duplicate"] | [Beschreibung] | Button/Event | [Role] | [Neue Instanz mit...] |

### 4.3 Bulk-Operations

- [ ] Bulk Create
- [ ] Bulk Update
- [ ] Bulk Delete
- [ ] Bulk Export
- [ ] Custom: [beschreiben]

Bedingungen: [Wann verfügbar? Limitierungen?]

---

## 5. States & Lifecycle

### 5.1 Objekt-States

```
[State 1: z.B. "draft"] 
    ↓ [Transition: z.B. "submit"]
[State 2: z.B. "pending_review"]
    ↓ [Transition: z.B. "approve"]
[State 3: z.B. "published"]
    ↓ [Transition: z.B. "archive"]
[State 4: z.B. "archived"]
```

### 5.2 State-Details

| State | Beschreibung | Verfügbare Actions | Berechtigungen | Automatische Übergänge |
|-------|--------------|-------------------|----------------|----------------------|
| [State] | [Was bedeutet dieser State?] | [Welche Actions?] | [Wer darf was?] | [z.B. nach 30 Tagen] |

---

## 6. UI/UX Spezifikationen

### 6.1 Darstellungs-Ansichten

**List View:**
- Angezeigt: [Welche Attribute werden in der Liste angezeigt?]
- Primary Action: [Hauptaktion beim Klick]
- Quick Actions: [Verfügbare Inline-Actions]

**Detail View:**
- Layout: [Beschreibung des Layouts]
- Sections: [Welche Bereiche gibt es?]
- Tab-Struktur: [Falls vorhanden]

**Edit View:**
- Form-Struktur: [Wie ist das Formular aufgebaut?]
- Required Indicators: [Wie werden Pflichtfelder markiert?]
- Validation Timing: [On-blur, on-submit, real-time?]

### 6.2 Access Patterns

Wie greifen User auf dieses Objekt zu?
- [ ] Direkt über Navigation
- [ ] Über Suche
- [ ] Über Related Objects
- [ ] Über Dashboard/Shortcuts
- [ ] Andere: [beschreiben]

---

## 7. Business Rules & Constraints

### 7.1 Validierungsregeln

| Regel | Typ | Fehlermeldung | Severity |
|-------|-----|---------------|----------|
| [z.B. "Name unique"] | Uniqueness | "Name bereits vergeben" | Error |
| [z.B. "Email format"] | Format | "Ungültiges Email-Format" | Error |
| [z.B. "Date in future"] | Logic | "Datum muss in der Zukunft liegen" | Warning |

### 7.2 Business Constraints

- [Constraint 1: z.B. "Maximale Anzahl pro User: 10"]
- [Constraint 2: z.B. "Nur ein aktives Objekt zur Zeit"]
- [Constraint 3: z.B. "Erfordert Premium-Subscription"]

### 7.3 Permissions Matrix

| Role | Create | Read | Update | Delete | Custom Actions |
|------|--------|------|--------|--------|----------------|
| Admin | ✓ | ✓ | ✓ | ✓ | alle |
| Editor | ✓ | ✓ | ✓ (eigene) | ✗ | [spezifizieren] |
| Viewer | ✗ | ✓ | ✗ | ✗ | keine |
---

## 8. Änderungshistorie

| Datum | Version | Autor | Änderung |
|-------|---------|-------|----------|
| [Datum] | 1.0 | [Name] | Initiale Dokumentation |
| | | | |

---
