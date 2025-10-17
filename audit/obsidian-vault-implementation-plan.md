# Obsidian Vault Implementation Plan
## knot-dots OOUX Documentation

**Created:** 2025-10-13
**Purpose:** Plan the setup of an Obsidian vault for team-wide OOUX documentation access
**Goal:** Transform monolithic MD files into an interconnected knowledge base

---

## Executive Summary

**Current State:**
- 16 documentation files in `/audit` folder
- Large monolithic files (88KB OOUX-ORCA, 82KB Objekt-Steckbriefe)
- Linear reading, no cross-references
- Hard to navigate for team members

**Proposed State:**
- Structured Obsidian vault with ~50-80 interconnected notes
- Clear hierarchy: Overview → Objects → Attributes → Relationships
- Bidirectional links between related concepts
- Visual graph view showing documentation structure
- Easy team access via shared folder or Git

**Benefits:**
- ✅ Better discoverability (search + graph view)
- ✅ Non-linear exploration (follow links)
- ✅ Easier maintenance (small, focused files)
- ✅ Better onboarding (start from index, explore as needed)
- ✅ Version control (each note = one commit)

---

## Phase 1: Vault Structure Design

### Proposed Folder Structure

```
knot-dots-ooux-vault/
├── 📂 00-Index/
│   ├── README.md                          # Vault introduction
│   ├── Getting-Started.md                 # How to use this vault
│   ├── OOUX-Glossary.md                   # Terms and definitions
│   └── Navigation-Guide.md                # How to navigate the docs
│
├── 📂 01-Overview/
│   ├── Executive-Summary.md               # High-level overview
│   ├── OOUX-ORCA-Introduction.md          # What is OOUX/ORCA?
│   ├── System-Architecture.md             # Container-based architecture
│   └── Key-Insights.md                    # Central findings
│
├── 📂 02-Objects/
│   ├── _Objects-Overview.md               # MOC for all objects
│   ├── Primary-Objects/
│   │   ├── Program.md                     # PROGRAM object
│   │   ├── Goal.md                        # GOAL object
│   │   ├── Measure.md                     # MEASURE object
│   │   ├── Simple-Measure.md              # SIMPLE_MEASURE object
│   │   ├── Indicator.md                   # INDICATOR object
│   │   ├── Indicator-Template.md          # INDICATOR_TEMPLATE object
│   │   ├── Objective.md                   # OBJECTIVE object
│   │   ├── Effect.md                      # EFFECT object
│   │   ├── Task.md                        # TASK object
│   │   ├── Resource.md                    # RESOURCE object
│   │   ├── Rule.md                        # RULE object
│   │   ├── Knowledge.md                   # KNOWLEDGE object
│   │   ├── Text.md                        # TEXT object
│   │   ├── Organization.md                # ORGANIZATION object
│   │   ├── Organizational-Unit.md         # ORGANIZATIONAL_UNIT object
│   │   ├── User.md                        # USER object
│   │   └── Page.md                        # PAGE object
│   │
│   └── Secondary-Objects/
│       ├── Carousel-Section.md            # CAROUSEL section
│       ├── Text-Section.md                # TEXT section
│       ├── File-Upload-Section.md         # FILE_UPLOAD section
│       ├── Progress-Section.md            # PROGRESS section
│       ├── Badge-Section.md               # BADGE section
│       └── Property-Grid-Section.md       # PROPERTY_GRID section
│
├── 📂 03-Relationships/
│   ├── _Relationships-Overview.md         # MOC for all relationships
│   ├── Relationship-Types.md              # All 20+ predicates
│   ├── Hierarchical-Relationships.md      # is-part-of, etc.
│   ├── Strategic-Relationships.md         # contributes-to, etc.
│   ├── Organizational-Relationships.md    # is-member-of, etc.
│   └── Relationship-Matrix.md             # Object-to-object mapping
│
├── 📂 04-Attributes/
│   ├── _Attributes-Overview.md            # MOC for attributes
│   ├── Common-Attributes.md               # Shared across all objects
│   ├── Metadata-Attributes.md             # guid, revision, timestamps
│   ├── SDG-Categories.md                  # 17 SDG definitions
│   ├── Topics-Taxonomy.md                 # Topic hierarchy
│   └── Status-Enums.md                    # All status types
│
├── 📂 05-CTAs-Actions/
│   ├── _CTAs-Overview.md                  # MOC for actions
│   ├── CRUD-Operations.md                 # Create, Read, Update, Delete
│   ├── Custom-Actions.md                  # Publish, Archive, Duplicate, etc.
│   ├── Bulk-Operations.md                 # Multi-select actions
│   └── Permissions-Matrix.md              # Role-based access
│
├── 📂 06-Navigation/
│   ├── _Navigation-Overview.md            # MOC for navigation
│   ├── Workspace-Matrix.md                # Type × View combinations
│   ├── View-Patterns.md                   # Catalog, Level, Status, etc.
│   ├── Navigation-Complexity-Analysis.md  # User confusion analysis
│   ├── OOUX-Navigation-Philosophy.md      # UI chrome vs object-centric
│   └── Improvement-Recommendations.md     # Proposed solutions
│
├── 📂 07-User-Experience/
│   ├── _UX-Overview.md                    # MOC for UX
│   ├── User-Personas.md                   # Admin, Collaborator, etc.
│   ├── User-Journeys.md                   # Typical workflows
│   ├── Mental-Models.md                   # How users think
│   └── Accessibility.md                   # A11y considerations
│
├── 📂 08-Information-Architecture/
│   ├── _IA-Overview.md                    # MOC for IA
│   ├── Organizational-Hierarchy.md        # Org → OE structure
│   ├── Content-Hierarchy.md               # Program → Goal → Measure
│   ├── Filter-System.md                   # Filtering patterns
│   ├── Search-Functionality.md            # Full-text search
│   └── Overlay-System.md                  # Modal patterns
│
├── 📂 09-Technical-Implementation/
│   ├── _Technical-Overview.md             # MOC for tech
│   ├── Database-Schema.md                 # Container, Relation tables
│   ├── Frontend-Components.md             # Svelte component map
│   ├── API-Endpoints.md                   # REST API patterns
│   └── State-Management.md                # Svelte stores
│
├── 📂 10-Audits-Analysis/
│   ├── _Audits-Overview.md                # MOC for audits
│   ├── Accessibility-Audit.md             # Button accessibility
│   ├── Filter-Functionality-Audit.md      # Filter analysis
│   ├── Indikatoren-Audit.md               # Indicators analysis
│   ├── Multi-Select-Analysis.md           # Multi-select filtering
│   ├── Organization-Menu-Audit.md         # Org menu UX
│   └── Relation-Filter-Analysis.md        # Relation filtering
│
├── 📂 11-Recommendations/
│   ├── _Recommendations-Overview.md       # MOC for recommendations
│   ├── Priority-Roadmap.md                # Prioritized improvements
│   ├── Quick-Wins.md                      # High-impact, low-effort
│   ├── Medium-Term-Improvements.md        # 3-6 months
│   └── Long-Term-Vision.md                # 6-12 months
│
├── 📂 99-Templates/
│   ├── Object-Template.md                 # Template for new objects
│   ├── Relationship-Template.md           # Template for relationships
│   └── Audit-Template.md                  # Template for audits
│
└── 📂 Assets/
    ├── diagrams/                          # Mermaid diagrams
    ├── screenshots/                       # UI screenshots
    └── wireframes/                        # Proposed designs
```

**Total Estimated Notes:** ~70-80 interconnected markdown files

---

## Phase 2: Breaking Down Monolithic Files

### File: OOUX-ORCA-Dokumentation.md (88KB)

**Current Structure:**
1. Executive Summary
2. OOUX/ORCA Introduction
3. Objects (17 primary + 6 secondary)
4. Relationships
5. CTAs
6. Attributes
7. User Personas
8. User Journeys
9. Information Architecture
10. Recommendations

**Split Into:**
- `01-Overview/Executive-Summary.md`
- `01-Overview/OOUX-ORCA-Introduction.md`
- `02-Objects/Primary-Objects/[17 files].md`
- `02-Objects/Secondary-Objects/[6 files].md`
- `03-Relationships/_Relationships-Overview.md`
- `04-Attributes/_Attributes-Overview.md`
- `05-CTAs-Actions/_CTAs-Overview.md`
- `07-User-Experience/User-Personas.md`
- `07-User-Experience/User-Journeys.md`
- `08-Information-Architecture/_IA-Overview.md`
- `11-Recommendations/_Recommendations-Overview.md`

**Connection Pattern:**
```markdown
# Executive Summary

See also:
- [[OOUX-ORCA-Introduction]] for methodology details
- [[_Objects-Overview]] for all objects
- [[Key-Insights]] for main findings
- [[Priority-Roadmap]] for next steps
```

---

### File: OOUX-Objekt-Steckbriefe.md (82KB)

**Current Structure:**
- Detailed steckbriefe for each object (17 primary)

**Split Into:**
- Individual object files in `02-Objects/Primary-Objects/`
- Each object gets its own dedicated file with full details

**Example: Measure.md**
```markdown
# Measure Object

#object #primary #container

## Overview

**Type:** Core Object
**Payload Type:** `measure`

Concrete action measures for achieving goals. Tracks start/end dates, status, resources.

## Quick Links
- Parent: [[Program]]
- Related: [[Goal]] | [[Task]] | [[Effect]]
- View: [[Workspace-Matrix#Measures]]

## Attributes

### Core Attributes
- **title**: String (required)
- **description**: String
- **status**: [[Status-Enums#Measure-Status]]
- **startDate**: Date
- **endDate**: Date
- **measureType**: Array<[[Topics-Taxonomy]]>

[Full attribute list...]

## Relationships

### Outgoing
- **is-part-of** → [[Program]]
- **contributes-to** → [[Goal]]
- **is-consistent-with** → [[Measure]]

### Incoming
- **is-part-of** ← [[Task]], [[Effect]]

See [[Relationship-Matrix]] for full mapping.

## CTAs / Actions

- Create, Read, Update, Delete (CRUD)
- Publish, Archive, Duplicate
- See [[CRUD-Operations]] and [[Custom-Actions]]

## UI Patterns

**Recommended Views:**
- [[View-Patterns#Status-View]] (Kanban) ⭐
- [[View-Patterns#Monitoring-View]] (Timeline) ⭐
- [[View-Patterns#Catalog-View]]
- [[View-Patterns#Table-View]]

**Components:**
- `MeasureCard.svelte`
- `EditableMeasure.svelte`
- `MeasureProperties.svelte`

## User Stories

1. As a **Collaborator**, I want to create a Measure to track implementation.
2. As an **Admin**, I want to link Measures to Goals to show contribution.
3. As a **Public user**, I want to see Measure progress to understand city actions.

## Related Documentation

- [[Navigation-Complexity-Analysis#Measures-Workspace]]
- [[OOUX-Navigation-Philosophy#Measure-Navigation]]
- [[Filter-Functionality-Audit#Measure-Filters]]

## Changelog

- 2025-10-10: Initial documentation
- 2025-10-13: Added workspace matrix details
```

---

### File: navigation-complexity-analysis.md (22KB)

**Split Into:**
- `06-Navigation/Navigation-Complexity-Analysis.md` (keep as is, but add links)
- Extract sections into:
  - `06-Navigation/Mental-Model-Conflicts.md`
  - `06-Navigation/OOUX-Best-Practices.md`
  - `11-Recommendations/Navigation-Improvements.md`

---

### File: ooux-navigation-philosophy.md (33KB)

**Split Into:**
- `06-Navigation/OOUX-Navigation-Philosophy.md` (keep main content)
- Extract sections:
  - `06-Navigation/UI-Chrome-vs-Object-Navigation.md`
  - `06-Navigation/Multi-Tenant-OOUX-Patterns.md`
  - `06-Navigation/Hybrid-Navigation-Model.md`
  - `11-Recommendations/Navigation-Redesigns.md`

---

### Smaller Audit Files (Keep as-is, add to folder)

Move to `10-Audits-Analysis/`:
- `accessibility-audit-buttons.md`
- `filter-functionality-audit.md`
- `indikatoren-audit-meeting-basiert.md`
- `multi-select-filtering-analysis.md`
- `organization-menu-ux-audit.md`
- `relation-filter-analysis.md`

Add cross-references to relevant object/navigation files.

---

## Phase 3: Creating MOC (Map of Content) Files

### What are MOCs?

**MOC = Map of Content** — Index files that provide overview and navigation to related notes.

### Example: _Objects-Overview.md

```markdown
# Objects Overview

#moc #objects

This is the central hub for all objects in the knot-dots system.

## Quick Navigation

- [[_Objects-Overview#Primary-Objects|Primary Objects (17)]]
- [[_Objects-Overview#Secondary-Objects|Secondary Objects (6)]]
- [[_Objects-Overview#Object-Hierarchy|Object Hierarchy]]

## Primary Objects

### Strategic Planning
- [[Program]] — Top-level strategy documents
- [[Goal]] — Strategic and operational goals (6 levels)
- [[Measure]] — Concrete action measures
- [[Simple-Measure]] — Simplified progress tracking

### Performance Tracking
- [[Indicator]] — Measurable KPIs with history
- [[Indicator-Template]] — Reusable indicator definitions
- [[Objective]] — Target values for indicators
- [[Effect]] — Planned and achieved impacts

### Operational Management
- [[Task]] — Action items and todos
- [[Resource]] — Budgets, personnel, materials
- [[Rule]] — Regulations and compliance

### Knowledge Management
- [[Knowledge]] — Best practices, lessons learned
- [[Text]] — Generic content blocks
- [[Page]] — Landing pages

### Organizational Structure
- [[Organization]] — Top-level tenant entities
- [[Organizational-Unit]] — Sub-organizations (4 levels)
- [[User]] — System users with roles

## Secondary Objects (Sections)

Page building blocks:
- [[Carousel-Section]] — Image/content carousels
- [[Text-Section]] — Rich text blocks
- [[File-Upload-Section]] — Document attachments
- [[Progress-Section]] — Progress bars
- [[Badge-Section]] — Visual badges/tags
- [[Property-Grid-Section]] — Key-value displays

## Object Hierarchy

```
Organization
└── Organizational Unit (up to 4 levels)
    └── Program
        ├── Goal (up to 6 levels)
        │   ├── Measure
        │   │   ├── Task
        │   │   └── Effect
        │   └── Indicator
        │       └── Objective
        ├── Rule
        └── Knowledge
```

## Common Patterns

All objects share:
- [[Common-Attributes]] (guid, revision, organization, etc.)
- [[CRUD-Operations]] (Create, Read, Update, Delete)
- [[Permissions-Matrix]] (Role-based access)
- [[Relationship-Types]] (20+ predicates)

## Visual Graph

Open Graph View in Obsidian to see object relationships visually.

## Related Documentation

- [[Relationship-Matrix]] — How objects connect
- [[Workspace-Matrix]] — How objects are displayed
- [[Database-Schema]] — Technical implementation
```

---

### Other MOC Files

Each major folder gets a MOC:

- `_Relationships-Overview.md`
- `_Attributes-Overview.md`
- `_CTAs-Overview.md`
- `_Navigation-Overview.md`
- `_UX-Overview.md`
- `_IA-Overview.md`
- `_Technical-Overview.md`
- `_Audits-Overview.md`
- `_Recommendations-Overview.md`

---

## Phase 4: Adding Cross-References

### Internal Link Patterns

**Obsidian Link Syntax:**
```markdown
[[Page-Name]]                     # Link to page
[[Page-Name|Display Text]]        # Link with custom text
[[Page-Name#Heading]]             # Link to specific heading
[[Page-Name#^block-id]]           # Link to specific block
```

**Tag Syntax:**
```markdown
#object #primary #container        # Tags for categorization
```

### Link Types to Add

#### 1. **Upward Links** (to parent/overview)
```markdown
Part of: [[_Objects-Overview]]
Category: #object #primary
```

#### 2. **Lateral Links** (to related concepts)
```markdown
See also:
- [[Goal]] — Related object type
- [[Workspace-Matrix#Measures]] — How to view
- [[CRUD-Operations]] — Available actions
```

#### 3. **Downward Links** (to details)
```markdown
## Attributes
See full details in:
- [[Common-Attributes]]
- [[Metadata-Attributes]]
- [[Status-Enums#Measure-Status]]
```

#### 4. **Reference Links** (to code/implementation)
```markdown
## Implementation
- Component: `MeasureCard.svelte`
- Route: `/measures/status`
- API: `POST /api/containers`
```

---

### Example: Cross-Reference Pattern in Program.md

```markdown
# Program Object

#object #primary #strategic

Part of: [[_Objects-Overview#Primary-Objects]]

## Overview

Top-level strategy documents. Contains [[Goal|Goals]], [[Measure|Measures]], and [[Rule|Rules]] organized in chapters.

## Relationships

### Can Contain (is-part-of)
- [[Goal]]
- [[Measure]]
- [[Simple-Measure]]
- [[Rule]]
- [[Knowledge]]
- [[Text]]

### Related Concepts
- [[Workspace-Matrix#Programs]] — View patterns
- [[View-Patterns#Level-View]] — Recommended view ⭐
- [[Organizational-Hierarchy]] — Scope vs content

## Attributes

Core attributes:
- `title` (String, required)
- `programType` — See [[Topics-Taxonomy#Program-Types]]
- `level` — See [[Common-Attributes#Level]]
- `category` — See [[SDG-Categories]]

Full list: [[Common-Attributes]]

## User Journeys

Appears in:
- [[User-Journeys#Strategic-Planner]] — Primary entry point
- [[User-Journeys#Public-Stakeholder]] — Transparency access

## Navigation

From [[Navigation-Complexity-Analysis]]:
> Programs are best viewed in **Catalog** or **Level** view for hierarchical exploration.

Improvement proposals: [[Navigation-Redesigns#Program-Navigation]]

## Audits

Mentioned in:
- [[Organization-Menu-Audit]] — Org-scoped programs
- [[Filter-Functionality-Audit#Program-Filters]]

---

**Last Updated:** 2025-10-13
**Maintainer:** UX Team
```

---

## Phase 5: Creating Index & Getting Started

### README.md (Vault Entry Point)

```markdown
# knot-dots OOUX Documentation

Welcome to the knot-dots Object-Oriented UX documentation vault.

## What is this?

This is a comprehensive OOUX/ORCA analysis of the knot-dots platform, structured as an interconnected knowledge base using Obsidian.

## Quick Start

**New to OOUX?** Start here:
1. [[Getting-Started]] — How to use this vault
2. [[OOUX-ORCA-Introduction]] — What is OOUX?
3. [[Executive-Summary]] — High-level overview

**Looking for something specific?**
- Objects: [[_Objects-Overview]]
- Navigation: [[_Navigation-Overview]]
- Recommendations: [[_Recommendations-Overview]]
- Audits: [[_Audits-Overview]]

**Explore visually:**
- Open **Graph View** (Ctrl/Cmd + G) to see connections
- Use **Quick Switcher** (Ctrl/Cmd + O) to jump to any note

## Key Insights

- [[Key-Insights#Container-Architecture]] — Flexible container model
- [[Key-Insights#Workspace-Matrix]] — 28 active workspace combinations
- [[Key-Insights#Navigation-Complexity]] — Multi-tenant challenges
- [[Key-Insights#Hybrid-OOUX-Model]] — UI chrome vs object navigation

## Structure

```
00-Index/           # Start here
01-Overview/        # High-level summaries
02-Objects/         # All 17 primary + 6 secondary objects
03-Relationships/   # How objects connect
04-Attributes/      # Properties and enums
05-CTAs-Actions/    # User actions and permissions
06-Navigation/      # Navigation patterns and problems
07-User-Experience/ # Personas, journeys, mental models
08-Information-Architecture/ # Structure and organization
09-Technical-Implementation/ # Code and database
10-Audits-Analysis/ # Detailed audits and analyses
11-Recommendations/ # Improvement proposals
```

## Contributing

To update this documentation:
1. Find the relevant note using search or graph view
2. Edit the markdown file
3. Add cross-references using `[[Page-Name]]` syntax
4. Commit changes to Git

## Glossary

[[OOUX-Glossary]] — Common terms and definitions

---

**Version:** 1.0
**Last Updated:** 2025-10-13
**Maintainer:** UX Team
**Questions?** Contact [team contact]
```

---

### Getting-Started.md

```markdown
# Getting Started with the OOUX Vault

## What You'll Need

1. **Obsidian** (free): [Download here](https://obsidian.md/)
2. **Access to this vault** (Git repo or shared folder)

## Setup Steps

### 1. Install Obsidian

Download and install from https://obsidian.md/

### 2. Open Vault

- Launch Obsidian
- Click "Open folder as vault"
- Navigate to `/knot-dots/audit/` folder
- Click "Open"

### 3. Recommended Settings

**Core Plugins (Enable):**
- Backlinks
- Graph view
- Outgoing links
- Quick switcher
- Search
- Tags pane

**Community Plugins (Optional):**
- Dataview (for dynamic queries)
- Excalidraw (for diagrams)
- Table of Contents

## How to Navigate

### Method 1: Start from Index

Read in order:
1. [[README]]
2. [[Executive-Summary]]
3. [[_Objects-Overview]]

### Method 2: Search

Press `Ctrl/Cmd + O` → Type keyword → Press Enter

### Method 3: Graph View

Press `Ctrl/Cmd + G` to see visual connections

### Method 4: Follow Links

Click any `[[Linked Text]]` to jump to that note

### Method 5: Backlinks

See "Backlinks" pane (bottom right) to find references TO current page

## Key Keyboard Shortcuts

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Quick Switcher | Ctrl + O | Cmd + O |
| Search | Ctrl + Shift + F | Cmd + Shift + F |
| Graph View | Ctrl + G | Cmd + G |
| Back | Ctrl + Alt + ← | Cmd + Alt + ← |
| Forward | Ctrl + Alt + → | Cmd + Alt + → |
| Command Palette | Ctrl + P | Cmd + P |

## Reading Paths

### For Developers

1. [[System-Architecture]]
2. [[Database-Schema]]
3. [[Frontend-Components]]
4. [[API-Endpoints]]

### For UX Designers

1. [[User-Personas]]
2. [[User-Journeys]]
3. [[Mental-Models]]
4. [[Navigation-Complexity-Analysis]]
5. [[OOUX-Navigation-Philosophy]]

### For Product Managers

1. [[Executive-Summary]]
2. [[Priority-Roadmap]]
3. [[Quick-Wins]]
4. [[_Recommendations-Overview]]

### For Stakeholders

1. [[Executive-Summary]]
2. [[Key-Insights]]
3. [[Long-Term-Vision]]

## Tips & Tricks

### Use Tags

Filter by tags:
- `#object` — Object documentation
- `#relationship` — Relationship patterns
- `#navigation` — Navigation topics
- `#audit` — Audit reports
- `#recommendation` — Improvement proposals

### Use Queries (with Dataview plugin)

```dataview
LIST FROM #object AND #primary
```

Shows all primary objects.

### Use Canvas (for visual planning)

Create a new Canvas to arrange notes visually for presentations.

## Questions?

- Check [[OOUX-Glossary]] for terminology
- Use search (Ctrl/Cmd + Shift + F) to find mentions
- Contact UX team for clarification

---

**Next:** [[README]] or [[Executive-Summary]]
```

---

## Phase 6: Obsidian Configuration

### .obsidian/workspace.json

Obsidian will auto-generate this, but we can provide a default:

```json
{
  "main": {
    "id": "main",
    "type": "split",
    "children": [
      {
        "id": "editor",
        "type": "leaf",
        "state": {
          "type": "markdown",
          "state": {
            "file": "00-Index/README.md",
            "mode": "source"
          }
        }
      }
    ]
  },
  "left": {
    "id": "left-sidebar",
    "type": "split",
    "children": [
      {
        "id": "file-explorer",
        "type": "leaf",
        "state": {
          "type": "file-explorer"
        }
      },
      {
        "id": "search",
        "type": "leaf",
        "state": {
          "type": "search"
        }
      }
    ]
  },
  "right": {
    "id": "right-sidebar",
    "type": "split",
    "children": [
      {
        "id": "backlinks",
        "type": "leaf",
        "state": {
          "type": "backlink"
        }
      },
      {
        "id": "outgoing-links",
        "type": "leaf",
        "state": {
          "type": "outgoing-link"
        }
      },
      {
        "id": "tags",
        "type": "leaf",
        "state": {
          "type": "tag"
        }
      }
    ]
  }
}
```

---

## Phase 7: Implementation Roadmap

### Week 1: Setup & Structure

**Tasks:**
- [ ] Create folder structure (`00-Index/` through `99-Templates/`)
- [ ] Move existing audit files to `10-Audits-Analysis/`
- [ ] Create README.md and Getting-Started.md
- [ ] Create OOUX-Glossary.md

**Deliverable:** Empty vault structure with index files

---

### Week 2: Split OOUX-ORCA-Dokumentation.md

**Tasks:**
- [ ] Create overview files in `01-Overview/`
- [ ] Create 17 primary object files in `02-Objects/Primary-Objects/`
- [ ] Create 6 secondary object files in `02-Objects/Secondary-Objects/`
- [ ] Create relationship overview in `03-Relationships/`
- [ ] Create attribute files in `04-Attributes/`

**Deliverable:** Core OOUX content split into ~30 files

---

### Week 3: Split OOUX-Objekt-Steckbriefe.md

**Tasks:**
- [ ] Extract detailed object steckbriefe
- [ ] Merge with object files from Week 2
- [ ] Add relationship details to each object
- [ ] Add CTA/action details to each object

**Deliverable:** Complete object documentation (~17 enhanced files)

---

### Week 4: Navigation & UX Content

**Tasks:**
- [ ] Split navigation-complexity-analysis.md
- [ ] Split ooux-navigation-philosophy.md
- [ ] Create navigation files in `06-Navigation/`
- [ ] Create UX files in `07-User-Experience/`
- [ ] Create IA files in `08-Information-Architecture/`

**Deliverable:** Navigation and UX documentation (~15 files)

---

### Week 5: MOCs & Cross-References

**Tasks:**
- [ ] Create all MOC (_Overview.md) files (~9 files)
- [ ] Add [[internal links]] to all object files
- [ ] Add [[internal links]] to all navigation files
- [ ] Add tags to all files
- [ ] Review graph view for missing connections

**Deliverable:** Fully interconnected vault

---

### Week 6: Polish & Team Onboarding

**Tasks:**
- [ ] Create templates in `99-Templates/`
- [ ] Add diagrams to `Assets/diagrams/`
- [ ] Test vault with team members
- [ ] Create quick reference guide
- [ ] Set up Git repo (if shared via Git)

**Deliverable:** Production-ready vault

---

## Team Access Options

### Option 1: Shared Folder (Simple)

**Setup:**
- Put vault in shared network drive or Dropbox/Google Drive
- Each team member opens vault in their own Obsidian

**Pros:**
- Simple setup
- Real-time sync (if using Dropbox/Drive)

**Cons:**
- No version control
- Potential merge conflicts
- No change history

---

### Option 2: Git Repository (Recommended)

**Setup:**
```bash
cd /home/basti/projects/knot-dots
git mv audit audit-obsidian-vault
cd audit-obsidian-vault
git add .
git commit -m "Convert audit docs to Obsidian vault"
```

Each team member:
```bash
git pull
# Open folder in Obsidian
```

**Pros:**
- Full version control
- Change history and blame
- Branch for experiments
- Easy rollback

**Cons:**
- Requires Git knowledge
- Need to pull/push manually
- .obsidian/ folder may cause conflicts (add to .gitignore)

**Recommended .gitignore:**
```
.obsidian/workspace.json
.obsidian/workspace-mobile.json
.obsidian/cache
```

---

### Option 3: Obsidian Publish (Premium)

**Setup:**
- Subscribe to Obsidian Publish ($8/month/site)
- Publish vault online
- Team accesses via web

**Pros:**
- No setup for team
- Web access (no software needed)
- Beautiful published view

**Cons:**
- Costs money
- Read-only for team (only vault owner edits)

---

## Success Metrics

### Quantitative

- [ ] All 17 primary objects documented as separate files
- [ ] At least 50 interconnected notes
- [ ] Every note has 3+ internal links
- [ ] Graph view shows cohesive structure (not isolated islands)

### Qualitative

- [ ] Team members can find object documentation in <30 seconds
- [ ] New hires understand OOUX concepts after 1 hour of vault exploration
- [ ] Updates to objects take <5 minutes (edit one focused file vs. scrolling through 88KB doc)

---

## Next Steps

1. **Review this plan** with team
2. **Choose access method** (Git recommended)
3. **Create folder structure** (Week 1)
4. **Start splitting files** (Week 2-4)
5. **Team alpha test** (Week 5)
6. **Launch to full team** (Week 6)

---

## Questions to Resolve

1. **Git vs. Shared Folder?** Recommendation: Git for version control
2. **Who maintains vault?** Recommendation: UX team owns, devs contribute
3. **Update frequency?** Recommendation: Update with every major feature/change
4. **Public vs. internal?** Recommendation: Internal only (contains strategy details)

---

**Ready to start?** Proceed to Week 1 implementation or let's discuss the plan!
