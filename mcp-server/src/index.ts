import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";

const API_URL = process.env.KNOTDOTS_API_URL || "http://localhost:5173";
const API_KEY = process.env.KNOTDOTS_API_KEY;

if (!API_KEY) {
  console.error("KNOTDOTS_API_KEY environment variable is required");
  process.exit(1);
}

const server = new Server(
  {
    name: "knot-dots-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

const LIST_CONTAINERS_TOOL: Tool = {
  name: "list_containers",
  description: "List and filter containers (dots) from KnotDots",
  inputSchema: {
    type: "object",
    properties: {
      payloadType: {
        type: "array",
        items: { type: "string" },
        description:
          "Filter by payload types (e.g., 'measure', 'goal', 'task')",
      },
      organization: {
        type: "array",
        items: { type: "string" },
        description: "Filter by organization GUIDs",
      },
      terms: {
        type: "array",
        items: { type: "string" },
        description: "Search terms",
      },
    },
  },
};

const GET_CONTAINER_TOOL: Tool = {
  name: "get_container",
  description:
    "Get detailed information about a specific container by its GUID",
  inputSchema: {
    type: "object",
    properties: {
      guid: {
        type: "string",
        description: "The GUID of the container",
      },
    },
    required: ["guid"],
  },
};

const CREATE_CONTAINER_TOOL: Tool = {
  name: "create_container",
  description: `Create a new container (dot) in KnotDots.

IMPORTANT PAYLOAD REQUIREMENTS BY TYPE:

PROGRAM:
  - Required: type, title, chapterType, level, programStatus, programType
  - Special: description field must be string[] not string (e.g., ["text"])
  - Example: { type: "program", title: "My Program", description: ["Program description"], 
               chapterType: ["goal"], level: "level.local", programStatus: "program_status.idea",
               programType: "program_type.misc", visibility: "organization" }

CHAPTER:
  - Required: type, title, number (string)
  - Special: Do NOT include description or summary fields (omitted)
  - Example: { type: "chapter", title: "Chapter 1", number: "01", visibility: "organization" }

MEASURE:
  - Required: type, title, hierarchyLevel, status, template
  - Special: description field must be string[] not string
  - Example: { type: "measure", title: "My Measure", description: ["Measure description"],
               hierarchyLevel: 1, status: "status.idea", template: false, visibility: "organization" }

GOAL:
  - Required: type, title, goalStatus, hierarchyLevel
  - Example: { type: "goal", title: "My Goal", goalStatus: "goal_status.idea", 
               hierarchyLevel: 1, visibility: "organization" }

All types inherit base fields with defaults:
  - aiSuggestion: false
  - audience: ["audience.citizens"]
  - sdg: []
  - category: {}
  - policyFieldBNK: []
  - topic: []
  - visibility: "organization"`,
  inputSchema: {
    type: "object",
    properties: {
      managed_by: {
        type: "string",
        description:
          "GUID of the managing entity (typically same as organization)",
      },
      organization: {
        type: "string",
        description: "GUID of the organization",
      },
      organizational_unit: {
        type: ["string", "null"],
        description: "GUID of the organizational unit or null",
      },
      realm: {
        type: "string",
        description: "The realm for the container (typically 'knot-dots')",
      },
      payloadType: {
        type: "string",
        description:
          "The type of container payload (e.g., 'program', 'chapter', 'measure', 'goal'). Must match payload.type",
      },
      payload: {
        type: "object",
        description:
          "The container payload. Must include 'type' field and type-specific required fields. See tool description for examples.",
        required: ["type"],
      },
      relation: {
        type: "array",
        items: {
          type: "object",
          properties: {
            object: {
              type: "string",
              description: "GUID of the related container",
            },
            predicate: {
              type: "string",
              description:
                "Relationship type (e.g., 'is-part-of', 'is-subordinate-goal-of')",
            },
            position: {
              type: "number",
              description: "Order/position in the relationship (0-based)",
            },
          },
          required: ["object", "predicate", "position"],
        },
        description:
          "Optional relations to other containers. Most relations require object, predicate, and position.",
      },
    },
    required: ["managed_by", "organization", "realm", "payload"],
  },
};

/**
 * Validates and prepares a payload before sending to the API
 * Provides helpful error messages for common mistakes
 */
function validatePayload(
  payload: any,
  payloadType?: string,
): { valid: boolean; error?: string } {
  if (!payload || typeof payload !== "object") {
    return { valid: false, error: "Payload must be an object" };
  }

  if (!payload.type) {
    return { valid: false, error: "Payload must include a 'type' field" };
  }

  if (payloadType && payload.type !== payloadType) {
    return {
      valid: false,
      error: `Payload type '${payload.type}' does not match payloadType parameter '${payloadType}'`,
    };
  }

  // Type-specific validation
  switch (payload.type) {
    case "program":
      if (!payload.title) {
        return { valid: false, error: "Program requires 'title' field" };
      }
      if (payload.description && !Array.isArray(payload.description)) {
        return {
          valid: false,
          error:
            "Program 'description' must be an array of strings, e.g., ['text here']",
        };
      }
      if (!payload.chapterType) {
        return {
          valid: false,
          error: "Program requires 'chapterType' field (array)",
        };
      }
      if (!payload.level) {
        return {
          valid: false,
          error: "Program requires 'level' field (e.g., 'level.local')",
        };
      }
      if (!payload.programStatus) {
        return {
          valid: false,
          error:
            "Program requires 'programStatus' field (e.g., 'program_status.idea')",
        };
      }
      if (!payload.programType) {
        return {
          valid: false,
          error:
            "Program requires 'programType' field (e.g., 'program_type.misc')",
        };
      }
      break;

    case "chapter":
      if (!payload.title) {
        return { valid: false, error: "Chapter requires 'title' field" };
      }
      if (!payload.number) {
        return {
          valid: false,
          error: "Chapter requires 'number' field (string, e.g., '01')",
        };
      }
      if (payload.description !== undefined || payload.summary !== undefined) {
        return {
          valid: false,
          error: "Chapter should not include 'description' or 'summary' fields",
        };
      }
      break;

    case "measure":
      if (!payload.title) {
        return { valid: false, error: "Measure requires 'title' field" };
      }
      if (payload.description && !Array.isArray(payload.description)) {
        return {
          valid: false,
          error:
            "Measure 'description' must be an array of strings, e.g., ['text here']",
        };
      }
      if (payload.hierarchyLevel === undefined) {
        return {
          valid: false,
          error: "Measure requires 'hierarchyLevel' field (number 1-6)",
        };
      }
      if (!payload.status) {
        return {
          valid: false,
          error: "Measure requires 'status' field (e.g., 'status.idea')",
        };
      }
      if (payload.template === undefined) {
        return {
          valid: false,
          error: "Measure requires 'template' field (boolean)",
        };
      }
      break;

    case "goal":
      if (!payload.title) {
        return { valid: false, error: "Goal requires 'title' field" };
      }
      if (!payload.goalStatus) {
        return {
          valid: false,
          error: "Goal requires 'goalStatus' field (e.g., 'goal_status.idea')",
        };
      }
      if (payload.hierarchyLevel === undefined) {
        return {
          valid: false,
          error: "Goal requires 'hierarchyLevel' field (number 1-6)",
        };
      }
      break;
  }

  return { valid: true };
}

/**
 * Prepares the container data for API submission
 * Ensures organizational_unit is null not undefined
 */
function prepareContainerData(args: any): any {
  return {
    ...args,
    organizational_unit:
      args.organizational_unit === undefined ? null : args.organizational_unit,
    relation: args.relation || [],
  };
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [LIST_CONTAINERS_TOOL, GET_CONTAINER_TOOL, CREATE_CONTAINER_TOOL],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "list_containers") {
      const url = new URL(`${API_URL}/container`);
      if (args) {
        Object.entries(args).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach((v) => url.searchParams.append(key, v));
          } else if (value) {
            url.searchParams.append(key, String(value));
          }
        });
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `API responded with ${response.status}: ${await response.text()}`,
        );
      }

      const data = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    }

    if (name === "get_container") {
      const { guid } = args as { guid: string };
      const response = await fetch(`${API_URL}/container/${guid}`, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `API responded with ${response.status}: ${await response.text()}`,
        );
      }

      const data = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    }

    if (name === "create_container") {
      if (!args) {
        return {
          content: [
            {
              type: "text",
              text: "Error: Missing arguments for create_container",
            },
          ],
          isError: true,
        };
      }

      // Validate payload before sending to API
      const validation = validatePayload(
        args.payload,
        args.payloadType as string | undefined,
      );
      if (!validation.valid) {
        return {
          content: [
            { type: "text", text: `Validation Error: ${validation.error}` },
          ],
          isError: true,
        };
      }

      // Prepare data with proper null handling
      const containerData = prepareContainerData(args);

      const response = await fetch(`${API_URL}/container`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(containerData),
      });

      if (!response.ok) {
        throw new Error(
          `API responded with ${response.status}: ${await response.text()}`,
        );
      }

      const data = await response.json();
      return {
        content: [
          {
            type: "text",
            text: `Container created successfully: ${JSON.stringify(data, null, 2)}`,
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error: any) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("KnotDots MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
