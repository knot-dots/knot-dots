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

**CRITICAL: Follow this EXACT methodology to ensure consistent, reproducible results.**

## TASK
Extract ONLY concrete, actionable measures from the provided document. You must produce a deterministic output that another AI would generate identically from the same input.

## MANDATORY 4-STEP PROCESS

### STEP 1: Document Scan with Fixed Pattern
Scan the document systematically from top to bottom. For each potential measure found, record:
\`\`\`
CANDIDATE LIST:
Page X, Section Y: [Exact German text]
Classification: [MEASURE/GOAL/UNCLEAR]
Action Verb: [umsetzen/durchführen/erstellen/etc. or NONE]
Concrete Object: [Schule/System/Konzept/etc. or NONE]
\`\`\`

### STEP 2: Apply STRICT Classification Rules

#### ✅ EXTRACT AS MEASURE (Use action verb form):
- **Has action verb**: "durchführen", "umsetzen", "erstellen", "entwickeln", "etablieren", "sanieren", "bauen", "einrichten"
- **Format requirement**: Always use infinitive verb form: "XYZ umsetzen" NOT "Umsetzung von XYZ"
- **Concrete activities**: Installing, building, conducting, establishing something specific
- **Specific projects**: Named initiatives with clear deliverables
- **Operational tasks**: Day-to-day activities or programs

#### ❌ EXCLUDE (Goals, not measures):
- **Abstract outcomes**: "CO2-neutral werden", "Qualität verbessern"
- **KPIs/Targets**: "50% Reduktion erreichen", "Rate steigern auf 80%"
- **State descriptions**: "Eine attraktive Stadt", "Lebensqualität"
- **General intentions**: "Verbesserung der...", "Steigerung der..."

### STEP 3: Semantic Duplicate Detection (MANDATORY)
For each measure, extract core semantic elements:
\`\`\`
SEMANTIC FINGERPRINT:
WHO: [Organization/Department]
WHAT: [Core action - normalized]
WHERE: [Location - if specified]
WHEN: [Timeline - if specified]
OBJECT: [What is being acted upon]
\`\`\`

**Duplicate Detection Rules:**
- Same WHO + WHAT + OBJECT = DUPLICATE (keep most detailed version)
- Different specific objects = SEPARATE (Schule A ≠ Schule B)
- Same concept, different wording = DUPLICATE

**Examples:**
\`\`\`
"Umsetzung des Klimaschutzkonzepts" → "Klimaschutzkonzept umsetzen"
"Durchführung von Bürgerbefragungen" → "Bürgerbefragungen durchführen"
"BNE-Zertifizierung der VHS" → "VHS nach BNE-Standards zertifizieren"
\`\`\`

### STEP 4: Quality Control Checklist
Before finalizing, verify EACH measure:
- [ ] Contains action verb in infinitive form?
- [ ] Refers to concrete, actionable activity?
- [ ] Is NOT an abstract goal or outcome?
- [ ] Is semantically unique (no duplicates)?
- [ ] Uses original German terminology?

## OUTPUT FORMAT REQUIREMENTS

**MANDATORY JSON Structure:**
\`\`\`json
{
  "output": {
    "projects": [
      {
        "title": "Exact German measure in infinitive verb form"
      }
    ]
  }
}
\`\`\`

## CONSISTENCY REQUIREMENTS

### Language Style (MANDATORY):
- **ALWAYS use action verb form**: "Konzept umsetzen" NOT "Umsetzung des Konzepts"
- **ALWAYS preserve exact German terminology** from source
- **ALWAYS use infinitive verbs**: umsetzen, durchführen, erstellen, entwickeln
- **NO paraphrasing or interpretation** - use source wording

### Common Verb Normalizations:
\`\`\`
"Umsetzung von X" → "X umsetzen"
"Durchführung von X" → "X durchführen"
"Erstellung eines X" → "X erstellen"
"Entwicklung von X" → "X entwickeln"
"Etablierung einer X" → "X etablieren"
\`\`\`

### Quality Targets (for self-assessment):
- Action verb rate: >50% of measures should contain action verbs
- Concrete object rate: >30% should reference specific objects/systems
- Zero semantic duplicates allowed
- Zero abstract goals allowed

## ERROR PREVENTION

### Common Mistakes to AVOID:
1. **Nominalization**: "Durchführung der Sanierung" instead of "Sanierung durchführen"
2. **Goal extraction**: "Verbesserung der Luftqualität" (goal) vs "Luftmessstationen installieren" (measure)
3. **Semantic duplicates**: Same concept with different wording
4. **Vague actions**: "Maßnahmen ergreifen" instead of specific action

### Self-Check Questions:
- Could another person execute this measure based on the title alone?
- Does it describe WHAT to do, not WHAT to achieve?
- Is it written as a concrete action using German infinitive verbs?

## REPRODUCIBILITY REQUIREMENT
Another AI given this same prompt and document should produce an identical JSON output. Any deviation suggests prompt non-compliance.

**Remember: Consistency is more valuable than completeness. When in doubt, exclude rather than include.**`;

const projectInfoPrompt = `# MISSION
Convert the provided list of identified measures into structured JSON objects. Create the final clean JSON array.

## JSON INPUT STRUCTURE - EXAMPLE:
\`\`\`json
{
  "output": {
    "projects": [
      {
        "title": "measure 1 title'"
      },
      {
        "title": "measure 2 title"
      },
      {
        "title": "measure 3 title"
      }
    ]
  }
}
\`\`\`

## JSON OUTPUT STRUCTURE - EXAMPLE CONTENT

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

## FIELD SPECIFICATIONS

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| \`title\` | String | ✅ | Exact German title of the measure |
| \`summary\` | String | ✅ | Short summary (1-2 sentences) |
| \`description\` | String | ✅ | Complete, verbatim description |
| \`status\` | String | ⚪ | Current implementation status |
| \`topicArea\` | Array | ✅ | Relevant topic areas |
| \`sdg\` | Array | ✅ | Only explicitly mentioned UN Sustainable Development Goals in the format ["sdg.XX"]. For sub-goals (e.g., "SDG 4.2"), extract only the main goal ("sdg.04") |
| \`startDate\` | String | ⚪ | Format: "YYYY-MM-DD" |
| \`endDate\` | String | ⚪ | Format: "YYYY-MM-DD" |
| \`type\` | String | ✅ | Always \`"measure"\` |

## MAPPING TABLES

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

## EXTRACTION RULES

### 🚫 DUPLICATE AVOIDANCE (CRITICAL)

**Before the final output:** Actively check for and remove duplicates\\!

  - **Same measure, mentioned multiple times**: Extract only once, use the most detailed version.
  - **Similar titles**: If 2+ measures have very similar titles → check if they are the same.
  - **Sub-projects vs. Main project**: Extract only the main project, not the sub-activities.
  - **Merge rule**: For similar measures, take the version with the most complete description.

**What is a separate measure?**

  - ✅ Different activities: "Bau Radweg A" vs. "Bau Radweg B"
  - ✅ Different objects: "Sanierung Schule 1" vs. "Sanierung Schule 2"
  - ❌ Same activity mentioned in different sections
  - ❌ General + specific description of the same measure


## QUALITY CONTROL

  - [ ] ALWAYS keep the given project title from the projects json as "Title".
  - [ ] **NO DUPLICATES**: Each measure appears only once in the array.
  - [ ] All objects describe concrete measures (not goals).
  - [ ] \`description\` is verbatim from the document.
  - [ ] \`summary\` is concise and understandable.
  - [ ] \`type\` is always \`"measure"\`.
  - [ ] Topic Areas are relevant and correctly assigned.
  - [ ] Valid JSON format.`;

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

**CRITICAL: Follow this EXACT methodology to ensure consistent, reproducible results.**

## TASK
Extract ONLY concrete, achievable goals from the provided document. You must produce a deterministic output that another AI would generate identically from the same input.

## MANDATORY 4-STEP PROCESS

### STEP 1: Document Scan with Fixed Pattern
Scan the document systematically from top to bottom. For each potential goal found, record:
\`\`\`
CANDIDATE LIST:
Page X, Section Y: [Exact German text]
Classification: [GOAL/MEASURE/UNCLEAR]
Outcome Indicator: [Reduktion/Erhöhung/Verbesserung/etc. or NONE]
Target Object: [CO2-Ausstoß/Lebensqualität/Rate/etc. or NONE]
\`\`\`

### STEP 2: Apply STRICT Classification Rules

#### ✅ EXTRACT AS GOAL (Use outcome/state form):
- **Abstract outcomes**: "CO2-neutral werden", "Qualität verbessern", "attraktive Stadt werden"
- **KPIs/Targets**: "50% Reduktion erreichen", "Rate steigern auf 80%", "100% erneuerbare Energie"
- **State descriptions**: "Eine nachhaltige Stadt", "Klimaneutralität", "Lebensqualität"
- **General intentions**: "Verbesserung der...", "Steigerung der...", "Erhöhung der..."
- **Vision statements**: "Klimaneutrale Kommune bis 2030"

#### ❌ EXCLUDE (Measures, not goals):
- **Action verbs**: "durchführen", "umsetzen", "erstellen", "entwickeln", "etablieren", "sanieren", "bauen", "einrichten"
- **Concrete activities**: Installing, building, conducting, establishing something specific
- **Specific projects**: Named initiatives with clear deliverables
- **Operational tasks**: Day-to-day activities or programs

### STEP 3: Semantic Duplicate Detection (MANDATORY)
For each goal, extract core semantic elements:
\`\`\`
SEMANTIC FINGERPRINT:
WHO: [Organization/Department]
WHAT: [Core outcome - normalized]
WHERE: [Location - if specified]
WHEN: [Timeline - if specified]
OBJECT: [What is being achieved]
\`\`\`

**Duplicate Detection Rules:**
- Same WHO + WHAT + OBJECT = DUPLICATE (keep most detailed version)
- Different specific targets = SEPARATE (50% Reduktion ≠ 80% Reduktion)
- Same concept, different wording = DUPLICATE

**Examples:**
\`\`\`
"Klimaneutralität erreichen" → "Klimaneutralität erreichen"
"CO2-Emissionen um 50% reduzieren" → "CO2-Emissionen um 50% reduzieren"
"Verbesserung der Luftqualität" → "Luftqualität verbessern"
\`\`\`

### STEP 4: Quality Control Checklist
Before finalizing, verify EACH goal:
- [ ] Describes desired outcome or end state?
- [ ] Refers to abstract, achievable target?
- [ ] Is NOT a concrete action or measure?
- [ ] Is semantically unique (no duplicates)?
- [ ] Uses original German terminology?

## OUTPUT FORMAT REQUIREMENTS

**MANDATORY JSON Structure:**
\`\`\`json
{
  "output": {
    "projects": [
      {
        "title": "Exact German goal description"
      }
    ]
  }
}
\`\`\`

## CONSISTENCY REQUIREMENTS

### Language Style (MANDATORY):
- **ALWAYS use outcome/state form**: "CO2-neutral werden" NOT "CO2-Neutralität umsetzen"
- **ALWAYS preserve exact German terminology** from source
- **ALWAYS use outcome verbs**: erreichen, werden, verbessern, reduzieren, steigern
- **NO paraphrasing or interpretation** - use source wording

### Common Outcome Normalizations:
\`\`\`
"Erreichung von X" → "X erreichen"
"Verbesserung von X" → "X verbessern"
"Reduktion des X" → "X reduzieren"
"Steigerung von X" → "X steigern"
"Erhöhung der X" → "X erhöhen"
\`\`\`

### Quality Targets (for self-assessment):
- Outcome indicator rate: >50% of goals should contain outcome indicators
- Target object rate: >30% should reference specific outcomes/states
- Zero semantic duplicates allowed
- Zero concrete measures allowed

## ERROR PREVENTION

### Common Mistakes to AVOID:
1. **Action extraction**: "Installation von Ladestationen" (measure) instead of "Flächendeckende E-Mobilität" (goal)
2. **Measure extraction**: "Sanierung durchführen" (measure) vs "Energieeffizienz verbessern" (goal)
3. **Semantic duplicates**: Same outcome with different wording
4. **Vague outcomes**: "Verbesserungen erzielen" instead of specific target

### Self-Check Questions:
- Does this describe WHAT to achieve, not WHAT to do?
- Is it a desired end state or outcome?
- Is it written as a target using German outcome verbs?

## REPRODUCIBILITY REQUIREMENT
Another AI given this same prompt and document should produce an identical JSON output. Any deviation suggests prompt non-compliance.

**Remember: Consistency is more valuable than completeness. When in doubt, exclude rather than include.**`;

const goalInfoPrompt = `# MISSION
Convert the provided list of identified goals into structured JSON objects. Create the final clean JSON array.

## JSON INPUT STRUCTURE - EXAMPLE:
\`\`\`json
{
  "output": {
    "projects": [
      {
        "title": "goal 1 title'"
      },
      {
        "title": "goal 2 title"
      },
      {
        "title": "goal 3 title"
      }
    ]
  }
}
\`\`\`

## JSON OUTPUT STRUCTURE - EXAMPLE CONTENT

\`\`\`json
[
  {
    "title": "CO2-Emissionen um 50% bis 2030 reduzieren",
    "summary": "Halbierung der städtischen Treibhausgasemissionen gegenüber dem Basisjahr 2020",
    "description": "Vollständige, wörtliche Beschreibung des Ziels aus dem Dokument...",
    "topicArea": ["topic.climate_change_mitigation_and_adaptation", "topic.environment"],
    "sdg": ["sdg.13", "sdg.11"],
    "fulfillmentDate": "2030-12-31",
    "type": "goal"
  },
  {
    "title": "Klimaneutralität bis 2035 erreichen",
    "summary": "Vollständige Klimaneutralität der kommunalen Verwaltung und des Stadtgebiets",
    "description": "Vollständige Beschreibung aus dem Dokument...",
    "topicArea": ["topic.climate_change_mitigation_and_adaptation", "topic.energy"],
    "sdg": ["sdg.13", "sdg.07"],
    "fulfillmentDate": "2035-12-31",
    "type": "goal"
  }
]
\`\`\`

## FIELD SPECIFICATIONS

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| \`title\` | String | ✅ | Exact German title of the goal |
| \`summary\` | String | ✅ | Short summary (1-2 sentences) |
| \`description\` | String | ✅ | Complete, verbatim description |
| \`status\` | String | ⚪ | Current achievement status |
| \`topicArea\` | Array | ✅ | Relevant topic areas |
| \`sdg\` | Array | ✅ | Only explicitly mentioned UN Sustainable Development Goals in the format ["sdg.XX"]. For sub-goals (e.g., "SDG 4.2"), extract only the main goal ("sdg.04") |
| \`startDate\` | String | ⚪ | Format: "YYYY-MM-DD" |
| \`fulfillmentDate\` | String | ⚪ | Format: "YYYY-MM-DD" |
| \`type\` | String | ✅ | Always \`"goal"\` |

## Topic Area Mapping

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

## EXTRACTION RULES

### 🚫 DUPLICATE AVOIDANCE (CRITICAL)

**Before the final output:** Actively check for and remove duplicates\\!

  - **Same goal, mentioned multiple times**: Extract only once, use the most detailed version.
  - **Similar titles**: If 2+ goals have very similar titles → check if they are the same.
  - **Sub-goals vs. Main goal**: Extract only the main goal, not the sub-targets.
  - **Merge rule**: For similar goals, take the version with the most complete description.

**What is a separate goal?**

  - ✅ Different outcomes: "50% CO2-Reduktion" vs. "80% CO2-Reduktion"
  - ✅ Different target areas: "Klimaneutralität Verwaltung" vs. "Klimaneutralität Stadtgebiet"
  - ❌ Same outcome mentioned in different sections
  - ❌ General + specific description of the same goal

**Example of Duplicate Avoidance:**

\`\`\`
Found in the document:
1. "Klimaneutralität erreichen" (brief mention)
2. "Klimaneutralität der Stadt bis 2035 erreichen" (detailed)

→ Only extract: #2 (the most detailed version)
\`\`\`

## QUALITY CONTROL

  - [ ] ALWAYS keep the given project title from the projects json as "Title".
  - [ ] **NO DUPLICATES**: Each goal appears only once in the array.
  - [ ] All objects describe concrete goals (not measures).
  - [ ] \`description\` is verbatim from the document.
  - [ ] \`summary\` is concise and understandable.
  - [ ] \`type\` is always \`"goal"\`.
  - [ ] Topic Areas are relevant and correctly assigned.
  - [ ] Valid JSON format.`;

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
