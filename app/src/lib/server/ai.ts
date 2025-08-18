import { z } from 'zod';
import { env as privateEnv } from '$env/dynamic/private';
import { payloadTypes, sustainableDevelopmentGoals, topics } from '$lib/models';

const startJobResponseSchema = z.object({
	job_id: z.string().uuid(),
	status: z.enum(['processing'])
});

const jobStatusResponseSchema = z.object({
	status: z.enum(['processing', 'complete']),
	completed_projects: z.array(
		z.object({
			id: z.string().uuid(),
			project: z.discriminatedUnion('type', [
				z.object({
					description: z.string(),
					endDate: z.string().optional(),
					sdg: z.array(z.string()),
					startDate: z.string().optional(),
					status: z.string(),
					summary: z.string(),
					title: z.string(),
					topicArea: z.array(z.string()),
					type: z.literal(payloadTypes.enum.measure)
				}),
				z.object({
					description: z.string(),
					fulfillmentDate: z.string().optional(),
					goalType: z.string().optional(),
					sdg: z.array(z.string()),
					summary: z.string(),
					title: z.string(),
					topicArea: z.array(z.string()),
					type: z.literal(payloadTypes.enum.goal)
				})
			])
		})
	)
});

const projectPrompt = `You are an expert analyst of German public administration strategy documents.

Task: Extract ONLY concrete measures, projects, and activities from the provided text. Follow this structured approach:

**STEP 1: Create initial list**
First, create a numbered list of ALL potential measures you find, with brief titles:
\`\`\`
FOUND MEASURES:
1. Installation von 500 E-Ladestationen (Seite 15)
2. Ausbau der Ladeinfrastruktur (Seite 23) 
3. Sanierung Grundschule Nord (Seite 31)
...
\`\`\`

**STEP 2: Semantic duplicate analysis**
For each measure, identify core elements: WHO + WHAT + WHERE + WHEN
Then check for semantic duplicates (same core elements, different wording):

\`\`\`
SEMANTIC ANALYSIS:
#1: WHO=Stadt | WHAT=E-Ladestationen installieren | WHERE=Stadtgebiet | WHEN=bis 2025
#2: WHO=Stadt | WHAT=Ladeinfrastruktur ausbauen | WHERE=Stadtgebiet | WHEN=bis 2025
→ DUPLICATE: Same organization, same activity type, same location, same timeframe

#5: WHO=VHS Detmold-Lemgo | WHAT=BNE-Zertifizierung | WHERE=VHS | WHEN=bis 2030  
#8: WHO=VHS Detmold-Lemgo | WHAT=BNE-Zertifizierung | WHERE=VHS | WHEN=bis 2030
→ DUPLICATE: "Zertifizierung der VHS nach BNE" vs "BNE-Zertifikat" = same meaning
\`\`\`

**STEP 3: Output final JSON**
Create JSON array with semantically unique measures only.

🧠 SEMANTIC DUPLICATE EXAMPLES:
• "Sanierung Rathaus" vs "Energetische Modernisierung des Rathauses" = SAME
• "Bau Radweg Hauptstraße" vs "Errichtung Fahrradtrasse Hauptstraße" = SAME  
• "Installation Ladestationen" vs "Aufbau E-Ladesäulen" = SAME
• "Grundschule A sanieren" vs "Grundschule B sanieren" = DIFFERENT (different schools)

Focus: 
• MEASURES: Specific actions like "Installation von 500 Ladestationen", "Sanierung der Schulgebäude"
• EXCLUDE: Abstract goals, targets, outcomes, visions

Rules:
• Extract exact German wording; no paraphrasing
• When in doubt, DO NOT extract - be conservative
• Only actionable activities, not aspirational goals
• Different specific objects are separate (School A ≠ School B)
• Same core activity for same entity = extract once (use most detailed version)

Required JSON structure per measure:
{
  "title": "[exact German title]",
  "summary": "[brief 1-2 sentence summary in your words]", 
  "description": "[verbatim German description from document]",
  "status": "[status enum if mentioned]",
  "topicArea": ["[relevant topic enums]"],
  "sdg": ["[SDG references ONLY if explicitly mentioned - use main goal only, e.g. SDG 4.2 → sdg.04]"],
  "startDate": "[YYYY-MM-DD if mentioned]",
  "endDate": "[YYYY-MM-DD if mentioned]",
  "type": "measure"
}`;

const projectInfoPrompt = `# Maßnahmen-Extraktion aus deutschen Verwaltungsstrategien

## MISSION
Extrahiere **ausschließlich konkrete Maßnahmen, Projekte und Aktivitäten** aus deutschen Verwaltungsstrategiedokumenten. Ignoriere Ziele, Visionen und abstrakte Zielsetzungen.

## WICHTIGE ABGRENZUNG: Maßnahme vs. Ziel

### ✅ MASSNAHMEN (Extrahieren)
- **Konkrete Aktivitäten**: "Installation von 500 Ladestationen"
- **Spezifische Projekte**: "Bau eines neuen Radwegs entlang der Hauptstraße"
- **Umsetzbare Handlungen**: "Durchführung einer Bürgerbefragung zum Klimaschutz"
- **Messbare Aktionen**: "Sanierung von 20 städtischen Gebäuden"
- **Operative Tätigkeiten**: "Einrichtung einer Beratungsstelle für Energieeffizienz"

### ❌ ZIELE (Nicht extrahieren)
- **Abstrakte Zielsetzungen**: "CO2-neutral werden bis 2030"
- **Ergebnisse/Outcomes**: "Reduzierung der Emissionen um 50%"
- **Allgemeine Absichten**: "Verbesserung der Lebensqualität"
- **Zustandsbeschreibungen**: "Eine klimafreundliche Stadt"
- **KPIs/Kennzahlen**: "Steigerung der Recyclingquote auf 80%"

## ERKENNUNGSMERKMALE FÜR ECHTE MASSNAHMEN

### Sprachliche Indikatoren:
- **Verben**: "durchführen", "installieren", "bauen", "einrichten", "sanieren", "entwickeln"
- **Konkrete Objekte**: Spezifische Infrastruktur, Systeme, Programme
- **Quantifizierte Aktivitäten**: Anzahl, Mengen, spezifische Orte

### Strukturelle Merkmale:
- Stehen oft unter Überschriften wie "Maßnahmen", "Projekte", "Aktivitäten"
- Haben konkrete Zeitpläne und Verantwortlichkeiten
- Beschreiben WAS getan wird, nicht WAS erreicht werden soll

## JSON OUTPUT STRUKTUR

\`\`\`json
[
  {
    "title": "Installation von 500 öffentlichen E-Ladestationen",
    "summary": "Aufbau eines flächendeckenden Netzes von Elektrofahrzeug-Ladestationen im Stadtgebiet",
    "description": "Vollständige, wörtliche Beschreibung der Maßnahme aus dem Dokument...",
    "status": "status.in_planning",
    "topicArea": ["topic.mobility", "topic.climate_change_mitigation_and_adaptation"],
    "sdg": ["sdg.07", "sdg.11"],
    "startDate": "2024-01-01",
    "endDate": "2026-12-31",
    "type": "measure"
  },
  {
    "title": "Energetische Sanierung der Grundschulen",
    "summary": "Umfassende energetische Modernisierung aller 15 städtischen Grundschulgebäude",
    "description": "Vollständige Beschreibung aus dem Dokument...",
    "status": "status.in_implementation",
    "topicArea": ["topic.education", "topic.energy", "topic.construction_and_housing"],
    "sdg": ["sdg.07", "sdg.04"],
    "startDate": "2023-06-01",
    "endDate": "2025-08-31",
    "type": "measure"
  }
]
\`\`\`

## FELDSPEZIFIKATIONEN

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| \`title\` | String | ✅ | Exakter deutscher Titel der Maßnahme |
| \`summary\` | String | ✅ | Kurze Zusammenfassung (1-2 Sätze) |
| \`description\` | String | ✅ | Vollständige, wörtliche Beschreibung |
| \`status\` | String | ⚪ | Aktueller Umsetzungsstand |
| \`topicArea\` | Array | ✅ | Relevante Themenbereiche |
| \`sdg\` | Array | ✅ | Nur explizit genannte UN-Nachhaltigkeitsziele im Format ["sdg.XX"]. Bei Unterzielen (z.B. "SDG 4.2") nur Hauptziel extrahieren ("sdg.04") |
| \`startDate\` | String | ⚪ | Format: "YYYY-MM-DD" |
| \`endDate\` | String | ⚪ | Format: "YYYY-MM-DD" |
| \`type\` | String | ✅ | Immer \`"measure"\` |

## MAPPING TABELLEN

### Status Mapping
| German | English Enum |
|--------|--------------|
| Idee | \`status.idea\` |
| in Planung | \`status.in_planning\` |
| in Umsetzung | \`status.in_implementation\` |
| in Betrieb | \`status.in_operation\` |
| abgeschlossen | \`status.done\` |
| abgelehnt | \`status.rejected\` |

### Topic Area Mapping
| German Term | English Enum |
|-------------|--------------|
| Bürgerbeteiligung | \`topic.citizen_participation\` |
| Stadtbild | \`topic.cityscape\` |
| Katastrophenschutz | \`topic.civil_protection\` |
| Klimaschutz und -anpassung | \`topic.climate_change_mitigation_and_adaptation\` |
| Bauen und Wohnen | \`topic.construction_and_housing\` |
| Kultur | \`topic.culture\` |
| Demografie | \`topic.demographics\` |
| Digitale Kommune | \`topic.digital_municipality\` |
| Digitale Stadtplanung | \`topic.digital_urban_planning\` |
| Wirtschaft | \`topic.economy\` |
| Bildung | \`topic.education\` |
| Energie | \`topic.energy\` |
| Umwelt | \`topic.environment\` |
| Gesundheit | \`topic.health\` |
| Arbeit und Soziales | \`topic.labor_and_social_affairs\` |
| Freizeit | \`topic.leisure\` |
| Wohnen | \`topic.living\` |
| Mobilität | \`topic.mobility\` |
| Lebensqualität | \`topic.quality_of_life\` |
| Resilienz | \`topic.resilience\` |
| Sicherheit | \`topic.security\` |
| Soziale Gerechtigkeit | \`topic.social_justice\` |
| Tourismus | \`topic.tourism\` |
| Abfall und Emissionen | \`topic.waste_and_emissions\` |
| Wasser | \`topic.water\` |

## EXTRAKTIONSREGELN

### 🚫 DUPLIKAT-VERMEIDUNG (KRITISCH)
**Vor der finalen Ausgabe:** Prüfe aktiv auf Duplikate und entferne sie!

- **Gleiche Maßnahme, mehrfach erwähnt**: Nur einmal extrahieren, detaillierteste Version verwenden
- **Ähnliche Titel**: Wenn 2+ Maßnahmen sehr ähnliche Titel haben → prüfen ob es dieselbe ist
- **Teil-Projekte vs. Haupt-Projekt**: Nur das Haupt-Projekt extrahieren, nicht die Unter-Aktivitäten
- **Merge-Regel**: Bei ähnlichen Maßnahmen die Version mit vollständigster Beschreibung nehmen

**Was ist eine separate Maßnahme?**
- ✅ Unterschiedliche Aktivitäten: "Bau Radweg A" vs. "Bau Radweg B"
- ✅ Verschiedene Objekte: "Sanierung Schule 1" vs. "Sanierung Schule 2"  
- ❌ Gleiche Aktivität in verschiedenen Abschnitten erwähnt
- ❌ Allgemeine + spezifische Beschreibung derselben Maßnahme

**Beispiel für Duplikat-Vermeidung:**
\`\`\`
Gefunden im Dokument:
1. "Ausbau der E-Ladeinfrastruktur" (Seite 15, kurze Erwähnung)
2. "Installation von 200 E-Ladestationen bis 2025" (Seite 23, detailliert)

→ Nur extrahieren: #2 (detaillierteste Version)
\`\`\`

### ✅ EXTRAHIEREN
- Nur konkrete, umsetzbare Maßnahmen und Projekte
- Vollständige \`description\` wörtlich aus dem Dokument
- Präzise \`summary\` in eigenen Worten (1-2 Sätze)
- Relevante Themenbereiche basierend auf Maßnahmeninhalt
- Explizit genannte Start- und Enddaten
- **NUR explizit erwähnte SDGs** - keine eigenständige Zuordnung durch das Modell
- **SDG-Unterziele vereinfachen**: "SDG 4.2" → extrahiere als "sdg.04", "SDG 11.3" → extrahiere als "sdg.11"

### ❌ NICHT EXTRAHIEREN
- Abstrakte Ziele oder Zielsetzungen
- Visionen oder Leitbilder
- KPIs oder Erfolgskennzahlen
- Allgemeine Handlungsfelder
- Ergebnis-Beschreibungen ohne konkrete Aktivität
- **SDGs die nicht explizit im Text erwähnt sind** - keine Inferenz oder Ableitung

### ZWEIFELSFÄLLE
**Im Zweifelsfall nicht extrahieren!** Lieber zu konservativ als zu liberal. Die Kriterien müssen eindeutig erfüllt sein:
- Beschreibt eine konkrete Aktivität
- Hat operationalen, umsetzbaren Charakter
- Ist mehr als nur eine Absichtserklärung

## QUALITÄTSKONTROLLE
- [ ] **KEINE DUPLIKATE**: Jede Maßnahme nur einmal im Array
- [ ] **Titel-Vergleich**: Keine sehr ähnlichen Titel (>70% Übereinstimmung)
- [ ] Alle Objekte beschreiben konkrete Maßnahmen (keine Ziele)
- [ ] \`description\` ist verbatim aus dem Dokument
- [ ] \`summary\` ist präzise und verständlich
- [ ] \`type\` ist immer \`"measure"\`
- [ ] Topic Areas sind relevant und korrekt zugeordnet
- [ ] Gültiges JSON-Format`;

export async function startJob(pdf: File) {
	const formData = new FormData();
	formData.append('file', pdf);
	formData.append('project_prompt', projectPrompt);
	formData.append('project_info_prompt', projectInfoPrompt);
	const response = await fetch((privateEnv.AI_URL as string) + '/start-job', {
		body: formData,
		method: 'POST'
	});
	return startJobResponseSchema.safeParse(await response.json());
}

export async function pollJobStatus(id: string) {
	const response = await fetch((privateEnv.AI_URL as string) + '/status/' + id);
	const payload = await response.json();
	return jobStatusResponseSchema.safeParse(payload);
}

const goalPrompt = `You are an expert analyst of German public administration strategy documents.

Task: Extract ONLY visions and goals from the provided text. Follow this structured approach:

**STEP 1: Create initial list**
First, create a numbered list of ALL potential measures you find, with brief titles:
\`\`\`
FOUND GOALS:
1. Ausbau der Ladeinfrastruktur (Seite 23) 
3. Energetische Sanierung öffentlicher Gebäude (Seite 31)
...
\`\`\`

**STEP 2: Semantic duplicate analysis**
For each measure, identify core elements: WHO + WHAT + WHERE + WHEN
Then check for semantic duplicates (same core elements, different wording):

\`\`\`
SEMANTIC ANALYSIS:
#1: WHO=Stadt | WHAT=E-Ladestationen installieren | WHERE=Stadtgebiet | WHEN=bis 2025
#2: WHO=Stadt | WHAT=Ladeinfrastruktur ausbauen | WHERE=Stadtgebiet | WHEN=bis 2025
→ DUPLICATE: Same organization, same goal type, same location, same timeframe

#5: WHO=VHS Detmold-Lemgo | WHAT=BNE-Zertifizierung | WHERE=VHS | WHEN=bis 2030  
#8: WHO=VHS Detmold-Lemgo | WHAT=BNE-Zertifizierung | WHERE=VHS | WHEN=bis 2030
→ DUPLICATE: "Zertifizierung der VHS nach BNE" vs "BNE-Zertifikat" = same meaning
\`\`\`

**STEP 3: Output final JSON**
Create JSON array with semantically unique goals only.

🧠 SEMANTIC DUPLICATE EXAMPLES:
• "Sanierung Rathaus" vs "Energetische Modernisierung des Rathauses" = SAME
• "Bau Radweg Hauptstraße" vs "Errichtung Fahrradtrasse Hauptstraße" = SAME  
• "Installation Ladestationen" vs "Aufbau E-Ladesäulen" = SAME
• "Grundschule A sanieren" vs "Grundschule B sanieren" = DIFFERENT (different schools)

Focus: 
• GOALS: Abstract goals, targets, outcomes, visions like "Ausbau der Ladeinfrastruktur", "Energetische Sanierung der Schulgebäude"
• EXCLUDE: measures, projects, specific actions

Rules:
• Extract exact German wording; no paraphrasing
• When in doubt, DO NOT extract - be conservative
• Only actionable activities, not aspirational goals
• Different specific objects are separate (School A ≠ School B)
• Same core activity for same entity = extract once (use most detailed version)

Required JSON structure per measure:
{
  "title": "[exact German title]",
  "summary": "[brief 1-2 sentence summary in your words]", 
  "description": "[verbatim German description from document]",
  "topicArea": ["[relevant topic enums]"],
  "sdg": ["[SDG references ONLY if explicitly mentioned - use main goal only, e.g. SDG 4.2 → sdg.04]"],
  "fulfillmentDate": "[YYYY-MM-DD if mentioned]",
  "goal_type": "[relevant goal type enum]"
  "type": "goal"
}`;

const goalInfoPrompt = `# Ziel-Extraktion aus deutschen Verwaltungsstrategien

## MISSION
Extrahiere **ausschließlich Ziele, Visionen und Leitbilder** aus deutschen Verwaltungsstrategiedokumenten. Ignoriere Maßnahmen und andere konkrete Aktivitäten.

## WICHTIGE ABGRENZUNG: Ziel vs. Maßnahme

### ✅ ZIELE (Extrahieren)
- **Abstrakte Zielsetzungen**: "CO2-neutral werden bis 2030"
- **Ergebnisse/Outcomes**: "Reduzierung der Emissionen um 50%"
- **Allgemeine Absichten**: "Verbesserung der Lebensqualität"
- **Zustandsbeschreibungen**: "Eine klimafreundliche Stadt"
- **KPIs/Kennzahlen**: "Steigerung der Recyclingquote auf 80%"

### ❌ MASSNAHMEN (Nicht extrahieren)
- **Konkrete Aktivitäten**: "Installation von 500 Ladestationen"
- **Spezifische Projekte**: "Bau eines neuen Radwegs entlang der Hauptstraße"
- **Umsetzbare Handlungen**: "Durchführung einer Bürgerbefragung zum Klimaschutz"
- **Messbare Aktionen**: "Sanierung von 20 städtischen Gebäuden"
- **Operative Tätigkeiten**: "Einrichtung einer Beratungsstelle für Energieeffizienz"

## ERKENNUNGSMERKMALE FÜR ECHTE Ziele

### Sprachliche Indikatoren:
- **Verben**: "verbessern", "erreichen", "einsparen", "erweitern", "reduzieren", "steigern"
- **Konkrete Objekte**: Themenfelder, Handlungsfelder, Programme
- **Messbare Kriterien**: Rückgang von Emissionen, Erweiterung von Infrastruktur

### Strukturelle Merkmale:
- Stehen oft unter Überschriften wie "Operatives Ziel", "Strategisches Ziel", "Leitbild", "Vision"
- Haben manchmal ein Erfüllungsdatum
- Beschreiben WAS erreicht werden soll, nicht WAS getan wird

## JSON OUTPUT STRUKTUR

\`\`\`json
[
  {
    "title": "Ausbau der Ladeinfrastruktur",
    "summary": "Aufbau eines flächendeckenden Netzes von Elektrofahrzeug-Ladestationen im Stadtgebiet",
    "description": "Vollständige, wörtliche Beschreibung der Maßnahme aus dem Dokument...",
    "topicArea": ["topic.mobility", "topic.climate_change_mitigation_and_adaptation"],
    "sdg": ["sdg.07", "sdg.11"],
    "fulfillmentDate": "2024-01-01",
    "goal_type": "strategic_goal"
    "type": "goal"
  },
  {
    "title": "Energetische Sanierung der Grundschulen",
    "summary": "Umfassende energetische Modernisierung aller 15 städtischen Grundschulgebäude",
    "description": "Vollständige Beschreibung aus dem Dokument...",
    "topicArea": ["topic.education", "topic.energy", "topic.construction_and_housing"],
    "sdg": ["sdg.07", "sdg.04"],
    "fulfillmentDate": "2023-06-01",
    "goal_type": "operational_goal"
    "type": "goal"
  }
]
\`\`\`

## FELDSPEZIFIKATIONEN

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| \`title\` | String | ✅ | Exakter deutscher Titel der Maßnahme |
| \`summary\` | String | ✅ | Kurze Zusammenfassung (1-2 Sätze) |
| \`description\` | String | ✅ | Vollständige, wörtliche Beschreibung |
| \`status\` | String | ⚪ | Aktueller Umsetzungsstand |
| \`topicArea\` | Array | ✅ | Relevante Themenbereiche |
| \`sdg\` | Array | ✅ | Nur explizit genannte UN-Nachhaltigkeitsziele im Format ["sdg.XX"]. Bei Unterzielen (z.B. "SDG 4.2") nur Hauptziel extrahieren ("sdg.04") |
| \`fulfillmentDate\` | String | ⚪ | Format: "YYYY-MM-DD" |
| \`type\` | String | ✅ | Immer \`"goal"\` |

## MAPPING TABELLEN

### Status Mapping
| German | English Enum |
|--------|--------------|
| Idee | \`status.idea\` |
| in Planung | \`status.in_planning\` |
| in Umsetzung | \`status.in_implementation\` |
| in Betrieb | \`status.in_operation\` |
| abgeschlossen | \`status.done\` |
| abgelehnt | \`status.rejected\` |

### Topic Area Mapping
| German Term | English Enum |
|-------------|--------------|
| Bürgerbeteiligung | \`topic.citizen_participation\` |
| Stadtbild | \`topic.cityscape\` |
| Katastrophenschutz | \`topic.civil_protection\` |
| Klimaschutz und -anpassung | \`topic.climate_change_mitigation_and_adaptation\` |
| Bauen und Wohnen | \`topic.construction_and_housing\` |
| Kultur | \`topic.culture\` |
| Demografie | \`topic.demographics\` |
| Digitale Kommune | \`topic.digital_municipality\` |
| Digitale Stadtplanung | \`topic.digital_urban_planning\` |
| Wirtschaft | \`topic.economy\` |
| Bildung | \`topic.education\` |
| Energie | \`topic.energy\` |
| Umwelt | \`topic.environment\` |
| Gesundheit | \`topic.health\` |
| Arbeit und Soziales | \`topic.labor_and_social_affairs\` |
| Freizeit | \`topic.leisure\` |
| Wohnen | \`topic.living\` |
| Mobilität | \`topic.mobility\` |
| Lebensqualität | \`topic.quality_of_life\` |
| Resilienz | \`topic.resilience\` |
| Sicherheit | \`topic.security\` |
| Soziale Gerechtigkeit | \`topic.social_justice\` |
| Tourismus | \`topic.tourism\` |
| Abfall und Emissionen | \`topic.waste_and_emissions\` |
| Wasser | \`topic.water\` |

### Goal Type Mapping
| German Term | English Enum |
|-------------|--------------|
| Strategisches Ziel | \`goal_type.strategic_goal\` |
| Operatives Ziel | \`goal_type.operational_goal\` |
| Vision | \`goal_type.vision\` |
| Leitbild | \`goal_type.model\` | 

## EXTRAKTIONSREGELN

### 🚫 DUPLIKAT-VERMEIDUNG (KRITISCH)
**Vor der finalen Ausgabe:** Prüfe aktiv auf Duplikate und entferne sie!

- **Gleiches Ziel, mehrfach erwähnt**: Nur einmal extrahieren, detaillierteste Version verwenden
- **Ähnliche Titel**: Wenn 2+ Ziel sehr ähnliche Titel haben → prüfen ob es dasselbe ist
- **Merge-Regel**: Bei ähnlichen Zielen die Version mit vollständigster Beschreibung nehmen

**Was ist ein separates Ziel?**
- ✅ Unterschiedliche Ziele: "Bau Radweg A" vs. "Bau Radweg B"
- ✅ Verschiedene Objekte: "Sanierung Schule 1" vs. "Sanierung Schule 2"  
- ❌ Gleiches Ziel in verschiedenen Abschnitten erwähnt
- ❌ Allgemeine + spezifische Beschreibung desselben Ziels

**Beispiel für Duplikat-Vermeidung:**
\`\`\`
Gefunden im Dokument:
1. "Ausbau der E-Ladeinfrastruktur" (Seite 15, kurze Erwähnung)
2. "Installation von 200 E-Ladestationen bis 2025" (Seite 23, detailliert)

→ Nur extrahieren: #2 (detaillierteste Version)
\`\`\`

### ✅ EXTRAHIEREN
- Nur Ziele 
- Vollständige \`description\` wörtlich aus dem Dokument
- Präzise \`summary\` in eigenen Worten (1-2 Sätze)
- Relevante Themenbereiche basierend auf Maßnahmeninhalt
- Explizit genannte Erfüllungsdaten
- **NUR explizit erwähnte SDGs** - keine eigenständige Zuordnung durch das Modell
- **SDG-Unterziele vereinfachen**: "SDG 4.2" → extrahiere als "sdg.04", "SDG 11.3" → extrahiere als "sdg.11"

### ❌ NICHT EXTRAHIEREN
- Maßnahmen
- Ergebnis-Beschreibungen mit konkreter Aktivität
- **SDGs die nicht explizit im Text erwähnt sind** - keine Inferenz oder Ableitung

### ZWEIFELSFÄLLE
**Im Zweifelsfall nicht extrahieren!** Lieber zu konservativ als zu liberal. Die Kriterien müssen eindeutig erfüllt sein:
- Beschreibt keine konkrete Aktivität
- Ist nicht mehr als nur eine Absichtserklärung

## QUALITÄTSKONTROLLE
- [ ] **KEINE DUPLIKATE**: Jedes Ziel nur einmal im Array
- [ ] **Titel-Vergleich**: Keine sehr ähnlichen Titel (>70% Übereinstimmung)
- [ ] Alle Objekte beschreiben konkrete Ziele (keine Maßnahmen)
- [ ] \`description\` ist verbatim aus dem Dokument
- [ ] \`summary\` ist präzise und verständlich
- [ ] \`type\` ist immer \`"goal"\`
- [ ] Topic Areas sind relevant und korrekt zugeordnet
- [ ] Gültiges JSON-Format`;

export async function startGoalsJob(pdf: File) {
	const formData = new FormData();
	formData.append('file', pdf);
	formData.append('project_prompt', goalPrompt);
	formData.append('project_info_prompt', goalInfoPrompt);
	const response = await fetch((privateEnv.AI_URL as string) + '/start-goals', {
		body: formData,
		method: 'POST'
	});
	return startJobResponseSchema.safeParse(await response.json());
}
