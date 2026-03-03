# KnotDots MCP Server - Usage Examples

This document provides comprehensive examples for using the KnotDots MCP server tools.

## Table of Contents

1. [List Containers](#list-containers)
2. [Get Container](#get-container)
3. [Create Containers](#create-containers)
   - [Program](#create-program)
   - [Chapter](#create-chapter)
   - [Goal](#create-goal)
   - [Measure](#create-measure)
4. [Common Patterns](#common-patterns)

---

## List Containers

### List all goals

```json
{
  "payloadType": ["goal"]
}
```

### List measures in a specific organization

```json
{
  "payloadType": ["measure"],
  "organization": ["c55ce2e9-e64e-479e-91db-ad07c3f0bb27"]
}
```

### Search containers by term

```json
{
  "terms": ["sustainability"],
  "payloadType": ["program", "goal"]
}
```

---

## Get Container

### Get a specific container by GUID

```json
{
  "guid": "54ca1c4b-4ae9-4dc2-a15f-41febbac8177"
}
```

---

## Create Containers

### ⚠️ Important Notes

1. **Program & Measure**: The `description` field must be an array of strings
   - ❌ Wrong: `"description": "text here"`
   - ✅ Correct: `"description": ["text here"]`

2. **Chapter**: Must include `number` field, must NOT include `description` or `summary`

3. **Relations**: Most relations require all three fields: `object`, `predicate`, and `position`

4. **organizational_unit**: Use `null` (not undefined) if not applicable

---

## Create Program

### Basic program

```json
{
  "managed_by": "c55ce2e9-e64e-479e-91db-ad07c3f0bb27",
  "organization": "c55ce2e9-e64e-479e-91db-ad07c3f0bb27",
  "organizational_unit": null,
  "realm": "knot-dots",
  "payloadType": "program",
  "payload": {
    "type": "program",
    "title": "Sustainability Initiative 2026",
    "description": [
      "A comprehensive program to improve sustainability practices"
    ],
    "chapterType": ["goal", "measure", "knowledge"],
    "level": "level.local",
    "programStatus": "program_status.idea",
    "programType": "program_type.misc",
    "visibility": "organization",
    "aiSuggestion": false,
    "audience": ["audience.citizens"],
    "sdg": [],
    "category": {},
    "policyFieldBNK": [],
    "topic": []
  },
  "relation": []
}
```

### Program with custom fields (array format required)

```json
{
  "managed_by": "c55ce2e9-e64e-479e-91db-ad07c3f0bb27",
  "organization": "c55ce2e9-e64e-479e-91db-ad07c3f0bb27",
  "organizational_unit": null,
  "realm": "knot-dots",
  "payload": {
    "type": "program",
    "title": "Climate Action Program",
    "description": ["Long-term climate action strategy"],
    "chapterType": ["goal", "measure"],
    "level": "level.regional",
    "programStatus": "program_status.in_progress",
    "programType": "program_type.climate",
    "visibility": "organization",
    "customField": ["value1", "value2"]
  }
}
```

---

## Create Chapter

### Basic chapter (part of a program)

```json
{
  "managed_by": "c55ce2e9-e64e-479e-91db-ad07c3f0bb27",
  "organization": "c55ce2e9-e64e-479e-91db-ad07c3f0bb27",
  "organizational_unit": null,
  "realm": "knot-dots",
  "payloadType": "chapter",
  "payload": {
    "type": "chapter",
    "title": "Präambel",
    "number": "01",
    "visibility": "organization",
    "aiSuggestion": false,
    "audience": ["audience.citizens"],
    "sdg": [],
    "category": {},
    "policyFieldBNK": [],
    "topic": []
  },
  "relation": [
    {
      "object": "54ca1c4b-4ae9-4dc2-a15f-41febbac8177",
      "predicate": "is-part-of",
      "position": 0
    }
  ]
}
```

### Chapter with image

```json
{
  "managed_by": "c55ce2e9-e64e-479e-91db-ad07c3f0bb27",
  "organization": "c55ce2e9-e64e-479e-91db-ad07c3f0bb27",
  "organizational_unit": null,
  "realm": "knot-dots",
  "payload": {
    "type": "chapter",
    "title": "Introduction",
    "number": "01",
    "image": "https://example.com/image.jpg",
    "visibility": "organization"
  },
  "relation": []
}
```

---

## Create Goal

### Basic goal

```json
{
  "managed_by": "c55ce2e9-e64e-479e-91db-ad07c3f0bb27",
  "organization": "c55ce2e9-e64e-479e-91db-ad07c3f0bb27",
  "organizational_unit": null,
  "realm": "knot-dots",
  "payloadType": "goal",
  "payload": {
    "type": "goal",
    "title": "Reduce CO2 Emissions by 50%",
    "goalStatus": "goal_status.idea",
    "hierarchyLevel": 1,
    "visibility": "organization",
    "aiSuggestion": false,
    "audience": ["audience.citizens"],
    "sdg": [],
    "category": {},
    "policyFieldBNK": [],
    "topic": []
  },
  "relation": []
}
```

### Subordinate goal (child of another goal)

```json
{
  "managed_by": "c55ce2e9-e64e-479e-91db-ad07c3f0bb27",
  "organization": "c55ce2e9-e64e-479e-91db-ad07c3f0bb27",
  "organizational_unit": null,
  "realm": "knot-dots",
  "payload": {
    "type": "goal",
    "title": "Implement Solar Energy",
    "goalStatus": "goal_status.in_progress",
    "hierarchyLevel": 2,
    "visibility": "organization"
  },
  "relation": [
    {
      "object": "6a0e5ed4-cf78-40c3-abac-9d43fc7f768a",
      "predicate": "is-subordinate-goal-of",
      "position": 0
    }
  ]
}
```

### Goal as part of a chapter

```json
{
  "managed_by": "c55ce2e9-e64e-479e-91db-ad07c3f0bb27",
  "organization": "c55ce2e9-e64e-479e-91db-ad07c3f0bb27",
  "organizational_unit": null,
  "realm": "knot-dots",
  "payload": {
    "type": "goal",
    "title": "Transparency in AI Usage",
    "goalStatus": "goal_status.idea",
    "hierarchyLevel": 1,
    "description": "Ensure all AI-generated content is clearly marked",
    "visibility": "organization"
  },
  "relation": [
    {
      "object": "b186fe7f-1bfb-43c4-96ce-651817895a18",
      "predicate": "is-part-of",
      "position": 2
    }
  ]
}
```

---

## Create Measure

### Basic measure

```json
{
  "managed_by": "c55ce2e9-e64e-479e-91db-ad07c3f0bb27",
  "organization": "c55ce2e9-e64e-479e-91db-ad07c3f0bb27",
  "organizational_unit": null,
  "realm": "knot-dots",
  "payloadType": "measure",
  "payload": {
    "type": "measure",
    "title": "Install Solar Panels",
    "description": ["Install 100 solar panels on municipal buildings"],
    "hierarchyLevel": 1,
    "status": "status.idea",
    "template": false,
    "visibility": "organization",
    "aiSuggestion": false,
    "audience": ["audience.citizens"],
    "sdg": [],
    "category": {},
    "policyFieldBNK": [],
    "topic": [],
    "resource": []
  },
  "relation": []
}
```

### Measure with dates and resources

```json
{
  "managed_by": "c55ce2e9-e64e-479e-91db-ad07c3f0bb27",
  "organization": "c55ce2e9-e64e-479e-91db-ad07c3f0bb27",
  "organizational_unit": null,
  "realm": "knot-dots",
  "payload": {
    "type": "measure",
    "title": "Training Program on AI Ethics",
    "description": ["Quarterly training sessions for all staff members"],
    "hierarchyLevel": 1,
    "status": "status.in_progress",
    "template": false,
    "startDate": "2026-01-01",
    "endDate": "2026-12-31",
    "progress": 25,
    "visibility": "organization",
    "resource": [
      {
        "description": "Training budget",
        "amount": 5000,
        "unit": "EUR",
        "fulfillmentDate": "2026-03-01"
      }
    ]
  },
  "relation": [
    {
      "object": "10dd9611-1e59-424a-84de-2c67fcfd6a41",
      "predicate": "is-part-of",
      "position": 0
    }
  ]
}
```

### Measure with annotation and comment

```json
{
  "managed_by": "c55ce2e9-e64e-479e-91db-ad07c3f0bb27",
  "organization": "c55ce2e9-e64e-479e-91db-ad07c3f0bb27",
  "organizational_unit": null,
  "realm": "knot-dots",
  "payload": {
    "type": "measure",
    "title": "Mark AI-Generated Content",
    "description": ["Implement labeling system for all AI-generated materials"],
    "hierarchyLevel": 1,
    "status": "status.completed",
    "template": false,
    "annotation": "Applies to photos, videos, audio, and translations",
    "comment": "Successfully implemented in Q1 2026",
    "result": "All content now properly labeled",
    "visibility": "organization"
  }
}
```

---

## Common Patterns

### Creating a hierarchical structure

```javascript
// 1. Create a program
{
  "payload": {
    "type": "program",
    "title": "AI Ethics Program",
    ...
  }
}
// Returns: { guid: "program-guid", ... }

// 2. Create chapters in the program
{
  "payload": {
    "type": "chapter",
    "title": "Core Principles",
    "number": "01"
  },
  "relation": [{
    "object": "program-guid",
    "predicate": "is-part-of",
    "position": 0
  }]
}

// 3. Create goals in the chapter
{
  "payload": {
    "type": "goal",
    "title": "Transparency",
    ...
  },
  "relation": [{
    "object": "chapter-guid",
    "predicate": "is-part-of",
    "position": 0
  }]
}

// 4. Create measures for the goal
{
  "payload": {
    "type": "measure",
    "title": "Label AI Content",
    ...
  },
  "relation": [{
    "object": "goal-guid",
    "predicate": "is-part-of",
    "position": 0
  }]
}
```

### Creating subordinate goals (nested goals)

```javascript
// 1. Create parent goal
{
  "payload": {
    "type": "goal",
    "title": "Environmental Sustainability",
    "hierarchyLevel": 1,
    ...
  }
}
// Returns: { guid: "parent-goal-guid", ... }

// 2. Create child goal
{
  "payload": {
    "type": "goal",
    "title": "Renewable Energy",
    "hierarchyLevel": 2,
    ...
  },
  "relation": [{
    "object": "parent-goal-guid",
    "predicate": "is-subordinate-goal-of",
    "position": 0
  }]
}

// 3. Create grandchild goal
{
  "payload": {
    "type": "goal",
    "title": "Solar Power Implementation",
    "hierarchyLevel": 3,
    ...
  },
  "relation": [{
    "object": "child-goal-guid",
    "predicate": "is-subordinate-goal-of",
    "position": 0
  }]
}
```

---

## Common Errors and Solutions

### Error: "expected array, received string"

**Problem:** Program or measure `description` field is a string

**Solution:** Use array format

```json
// ❌ Wrong
"description": "This is the description"

// ✅ Correct
"description": ["This is the description"]
```

### Error: "expected string, received undefined" (for `number` field)

**Problem:** Chapter missing required `number` field

**Solution:** Add the number field

```json
{
  "type": "chapter",
  "title": "Introduction",
  "number": "01" // Required!
}
```

### Error: "expected number, received undefined" (for relation position)

**Problem:** Relation missing `position` field

**Solution:** Include all three required fields

```json
// ❌ Wrong
"relation": [{
  "predicate": "is-part-of",
  "object": "guid"
}]

// ✅ Correct
"relation": [{
  "object": "guid",
  "predicate": "is-part-of",
  "position": 0
}]
```

### Error: Chapter validation fails with description field

**Problem:** Chapter includes description or summary (not allowed)

**Solution:** Remove those fields from chapter payloads

```json
// ❌ Wrong
{
  "type": "chapter",
  "title": "Chapter 1",
  "number": "01",
  "description": "About this chapter"  // Not allowed!
}

// ✅ Correct
{
  "type": "chapter",
  "title": "Chapter 1",
  "number": "01"
}
```

---

## Payload Type Reference

| Type        | Required Fields                                                 | Special Notes                  |
| ----------- | --------------------------------------------------------------- | ------------------------------ |
| `program`   | type, title, chapterType, level, programStatus, programType     | description must be string[]   |
| `chapter`   | type, title, number                                             | No description/summary allowed |
| `measure`   | type, title, hierarchyLevel, status, template                   | description must be string[]   |
| `goal`      | type, title, goalStatus, hierarchyLevel                         | Standard basePayload           |
| `task`      | type, title, status, taskType                                   | Standard basePayload           |
| `indicator` | type, title, historicalValues, indicatorCategory, indicatorType | No description field           |

All types inherit base fields with defaults:

- `aiSuggestion`: false
- `audience`: ["audience.citizens"]
- `sdg`: []
- `category`: {}
- `policyFieldBNK`: []
- `topic`: []
- `visibility`: "organization"

---

## Available Enum Values

### Goal Status

- `goal_status.idea`
- `goal_status.in_progress`
- `goal_status.completed`

### Status (Measure, Task)

- `status.idea`
- `status.in_progress`
- `status.completed`
- `status.cancelled`

### Program Status

- `program_status.idea`
- `program_status.in_progress`
- `program_status.completed`

### Program Type

- `program_type.misc`
- `program_type.climate`
- `program_type.social`
- (and others - check API documentation)

### Level

- `level.local`
- `level.regional`
- `level.national`
- `level.international`

### Visibility

- `organization` (default)
- `public`
- `private`

### Audience

- `audience.citizens`
- `audience.administration`
- `audience.politics`

### Predicates (Relations)

- `is-part-of`
- `is-subordinate-goal-of`
- `is-copy-of`
- `achieves`
- (and others - check API documentation)
