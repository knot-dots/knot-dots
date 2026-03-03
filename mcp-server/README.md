# KnotDots MCP Server

A Model Context Protocol (MCP) server for interacting with the KnotDots container management API.

## Features

- ✅ **List Containers**: Query and filter containers by type, organization, search terms
- ✅ **Get Container**: Retrieve detailed information about specific containers
- ✅ **Create Container**: Create new containers with comprehensive validation
- ✅ **Client-side Validation**: Catches common errors before API calls
- ✅ **Helpful Error Messages**: Clear guidance on fixing payload issues
- ✅ **Type-specific Documentation**: Detailed requirements for each container type

## Installation

```bash
npm install
npm run build
```

## Configuration

Set the required environment variables:

```bash
export KNOTDOTS_API_KEY="your-api-key"
export KNOTDOTS_API_URL="http://localhost:5173"  # Optional, defaults to localhost
```

## Running the Server

```bash
npm start
```

## Available Tools

### 1. `list_containers`

List and filter containers from KnotDots.

**Parameters:**

- `payloadType` (array of strings): Filter by types (e.g., ["goal", "measure"])
- `organization` (array of strings): Filter by organization GUIDs
- `terms` (array of strings): Search terms

**Example:**

```json
{
  "payloadType": ["goal"],
  "organization": ["c55ce2e9-e64e-479e-91db-ad07c3f0bb27"]
}
```

### 2. `get_container`

Get detailed information about a specific container.

**Parameters:**

- `guid` (string, required): The GUID of the container

**Example:**

```json
{
  "guid": "54ca1c4b-4ae9-4dc2-a15f-41febbac8177"
}
```

### 3. `create_container`

Create a new container with automatic validation.

**Parameters:**

- `managed_by` (string, required): GUID of managing entity
- `organization` (string, required): GUID of organization
- `organizational_unit` (string or null): GUID of organizational unit
- `realm` (string, required): Realm (typically "knot-dots")
- `payloadType` (string, optional): Type for validation
- `payload` (object, required): Container payload
- `relation` (array, optional): Relations to other containers

**Example:**

```json
{
  "managed_by": "c55ce2e9-e64e-479e-91db-ad07c3f0bb27",
  "organization": "c55ce2e9-e64e-479e-91db-ad07c3f0bb27",
  "organizational_unit": null,
  "realm": "knot-dots",
  "payloadType": "goal",
  "payload": {
    "type": "goal",
    "title": "My Goal",
    "goalStatus": "goal_status.idea",
    "hierarchyLevel": 1,
    "visibility": "organization"
  },
  "relation": []
}
```

## Validation Features

The server includes client-side validation that catches common errors before making API calls:

### ✅ Validated Requirements

- **Program payloads**:
  - Ensures `description` is an array: `["text"]` not `"text"`
  - RequiresFields: `chapterType`, `level`, `programStatus`, `programType`
- **Chapter payloads**:
  - Requires `number` field (string)
  - Blocks invalid `description` or `summary` fields
- **Measure payloads**:
  - Ensures `description` is an array
  - Requires: `hierarchyLevel`, `status`, `template`
- **Goal payloads**:
  - Requires: `goalStatus`, `hierarchyLevel`

- **Relations**:
  - Ensures all three fields are present: `object`, `predicate`, `position`

### 📝 Helpful Error Messages

Instead of cryptic API errors, you get clear guidance:

```
❌ "Invalid input: expected array, received string"

✅ "Validation Error: Program 'description' must be an array of strings, e.g., ['text here']"
```

## Documentation

- **[EXAMPLES.md](./EXAMPLES.md)**: Comprehensive examples for all container types
- **[AUDIT.md](./AUDIT.md)**: Technical audit documenting schema issues and fixes

## Common Patterns

### Creating a Hierarchical Structure

```javascript
// 1. Create Program
create_container({
  payload: { type: "program", title: "My Program", ... }
})
// → Returns: { guid: "program-guid" }

// 2. Create Chapter in Program
create_container({
  payload: { type: "chapter", title: "Chapter 1", number: "01" },
  relation: [{
    object: "program-guid",
    predicate: "is-part-of",
    position: 0
  }]
})

// 3. Create Goal in Chapter
create_container({
  payload: { type: "goal", title: "Goal 1", ... },
  relation: [{
    object: "chapter-guid",
    predicate: "is-part-of",
    position: 0
  }]
})
```

### Creating Nested Goals

```javascript
// 1. Parent Goal
create_container({
  payload: {
    type: "goal",
    title: "Parent Goal",
    hierarchyLevel: 1,
    ...
  }
})

// 2. Child Goal
create_container({
  payload: {
    type: "goal",
    title: "Child Goal",
    hierarchyLevel: 2,
    ...
  },
  relation: [{
    object: "parent-goal-guid",
    predicate: "is-subordinate-goal-of",
    position: 0
  }]
})
```

## Troubleshooting

### ❗ Common Errors

#### "expected array, received string"

**Problem:** Using string instead of array for `description` in programs/measures

**Solution:**

```json
// ❌ Wrong
"description": "text"

// ✅ Correct
"description": ["text"]
```

#### "expected string, received undefined" (number field)

**Problem:** Chapter missing required `number` field

**Solution:**

```json
{
  "type": "chapter",
  "title": "My Chapter",
  "number": "01" // ← Add this!
}
```

#### "expected number, received undefined" (position field)

**Problem:** Relation missing `position` field

**Solution:**

```json
// ❌ Wrong
{
  "predicate": "is-part-of",
  "object": "guid"
}

// ✅ Correct
{
  "object": "guid",
  "predicate": "is-part-of",
  "position": 0
}
```

## Payload Type Reference

| Type      | Required Fields                                             | Notes                        |
| --------- | ----------------------------------------------------------- | ---------------------------- |
| `program` | type, title, chapterType, level, programStatus, programType | description must be string[] |
| `chapter` | type, title, number                                         | No description/summary       |
| `measure` | type, title, hierarchyLevel, status, template               | description must be string[] |
| `goal`    | type, title, goalStatus, hierarchyLevel                     | Standard                     |
| `task`    | type, title, status, taskType                               | Standard                     |

## Development

### Building

```bash
npm run build
```

### Watch Mode

```bash
npm run dev
```

### Testing

You can test the server using the MCP Inspector or by integrating it into an MCP-compatible client like Claude Desktop or VS Code Copilot.

## Architecture

```
┌─────────────────┐
│  MCP Client     │  (e.g., Claude, VS Code)
└────────┬────────┘
         │
         │ stdio
         │
┌────────▼────────┐
│  MCP Server     │  (this server)
│  - Validation   │
│  - Helpers      │
└────────┬────────┘
         │
         │ HTTP/JSON
         │
┌────────▼────────┐
│  KnotDots API   │
└─────────────────┘
```

## Version History

### 0.1.0 (2026-03-03)

- ✅ Added comprehensive client-side validation
- ✅ Improved error messages with actionable guidance
- ✅ Added `payloadType` parameter for validation
- ✅ Fixed relation schema to require all fields
- ✅ Fixed `organizational_unit` null handling
- ✅ Added detailed documentation and examples
- ✅ Type-specific payload validation

### 0.0.1 (Initial)

- Basic MCP server implementation
- List, get, and create operations

## Contributing

See [AUDIT.md](./AUDIT.md) for technical details on schema validation and known issues.

## License

Private package for KnotDots project.

## Support

For issues related to:

- **Schema validation**: See [AUDIT.md](./AUDIT.md)
- **Usage examples**: See [EXAMPLES.md](./EXAMPLES.md)
- **API issues**: Contact KnotDots API team
