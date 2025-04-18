import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const RECURSE_API_BASE = "https://www.recurse.com/api/v1";
const RECURSE_PAT = process.env.RECURSE_PAT;

if (!RECURSE_PAT) {
  console.error("RECURSE_PAT environment variable is not set. Please set it to your personal access token.");
  process.exit(1);
}

// Helper function for making authenticated requests to the Recurse API
async function makeRecurseRequest(endpoint, method = "GET", params = {}) {
  const url = `${RECURSE_API_BASE}${endpoint}`;
  const headers = {
    Authorization: `Bearer ${RECURSE_PAT}`,
  };

  console.log("Making Recurse API request to:", url);

  try {
    const config = { 
      method, 
      url, 
      headers,
      params: method === "GET" ? params : undefined,
      data: method !== "GET" ? params : undefined
    };
    
    const response = await axios(config);
    const data = response.data;
    console.log("Recurse API response:", data);
    return data;
  } catch (error) {
    console.error(`Error making Recurse API request to ${url}:`, error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    }
    return null;
  }
}

// Format content for MCP response
function formatMcpResponse(data, errorMessage = null) {
  if (errorMessage || !data) {
    return {
      content: [
        {
          type: "text",
          text: errorMessage || "Failed to retrieve data from Recurse Center API",
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

const server = new McpServer({
  name: "recurse-center",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Register Recurse Center API tools

// Profiles Search
server.tool(
  "search-profiles",
  "Search for Recurse Center community members",
  {
    query: z.string().optional().describe("Search by name, skills, profile questions"),
    batch_id: z.number().optional().describe("Filter to people who have a stint for this batch ID"),
    location_id: z.number().optional().describe("Filter to people who live near this location"),
    role: z.enum(["recurser", "resident", "facilitator", "faculty"]).optional().describe("Filter by role type"),
    scope: z.enum(["current", "overlap"]).optional().describe("Narrow search to current RC members or those who overlapped with you"),
    limit: z.number().min(1).max(50).optional().describe("Limit number of results (default: 20, max: 50)"),
    offset: z.number().optional().describe("Offset for pagination"),
  },
  async (params) => {
    const data = await makeRecurseRequest("/profiles", "GET", params);
    
    if (!data) {
      return formatMcpResponse(null, "Failed to search profiles");
    }
    
    return formatMcpResponse(data);
  }
);

// Get Profile by ID or Email
server.tool(
  "get-profile",
  "Get a Recurse Center community member's profile by ID or email",
  {
    identifier: z.string().describe("Person ID or email address"),
  },
  async ({ identifier }) => {
    const data = await makeRecurseRequest(`/profiles/${encodeURIComponent(identifier)}`);
    
    if (!data) {
      return formatMcpResponse(null, `Failed to get profile for ${identifier}`);
    }
    
    return formatMcpResponse(data);
  }
);

// Get Current User Profile
server.tool(
  "get-my-profile",
  "Get the current user's Recurse Center profile",
  {},
  async () => {
    const data = await makeRecurseRequest("/profiles/me");
    
    if (!data) {
      return formatMcpResponse(null, "Failed to get your profile");
    }
    
    return formatMcpResponse(data);
  }
);

// List All Batches
server.tool(
  "list-batches",
  "List all Recurse Center batches",
  {},
  async () => {
    const data = await makeRecurseRequest("/batches");
    
    if (!data) {
      return formatMcpResponse(null, "Failed to list batches");
    }
    
    return formatMcpResponse(data);
  }
);

// Get Batch by ID
server.tool(
  "get-batch",
  "Get information about a specific Recurse Center batch",
  {
    batch_id: z.number().describe("Batch ID to retrieve"),
  },
  async ({ batch_id }) => {
    const data = await makeRecurseRequest(`/batches/${batch_id}`);
    
    if (!data) {
      return formatMcpResponse(null, `Failed to get batch with ID ${batch_id}`);
    }
    
    return formatMcpResponse(data);
  }
);

// Locations Search
server.tool(
  "search-locations",
  "Search for locations in the Recurse Center directory",
  {
    query: z.string().describe("Search location by name"),
    limit: z.number().min(1).max(50).optional().describe("Number of results to return (default: 10, max: 50)"),
  },
  async (params) => {
    const data = await makeRecurseRequest("/locations", "GET", params);
    
    if (!data) {
      return formatMcpResponse(null, "Failed to search locations");
    }
    
    return formatMcpResponse(data);
  }
);

// Get Hub Visits
server.tool(
  "get-hub-visits",
  "Get Recurse Center hub visits",
  {
    date: z.string().optional().describe("Only show visits on this date (YYYY-MM-DD)"),
    start_date: z.string().optional().describe("Start date for range (YYYY-MM-DD)"),
    end_date: z.string().optional().describe("End date for range (YYYY-MM-DD)"),
    person_id: z.number().optional().describe("Filter to a specific person"),
    page: z.number().optional().describe("Page number (defaults to 1)"),
    per_page: z.number().max(200).optional().describe("Results per page (defaults to 100, max 200)"),
  },
  async (params) => {
    const data = await makeRecurseRequest("/hub_visits", "GET", params);
    
    if (!data) {
      return formatMcpResponse(null, "Failed to get hub visits");
    }
    
    return formatMcpResponse(data);
  }
);

// Update Hub Visit
server.tool(
  "update-hub-visit",
  "Create or update a hub visit for a person on a specific date",
  {
    person_id: z.number().describe("Person ID"),
    date: z.string().describe("Visit date (YYYY-MM-DD)"),
    notes: z.string().optional().describe("Notes for the visit"),
    app_data: z.string().optional().describe("JSON string of application-specific data"),
  },
  async ({ person_id, date, notes, app_data }) => {
    const params = {};
    if (notes !== undefined) params.notes = notes;
    if (app_data !== undefined) params.app_data = app_data;
    
    const data = await makeRecurseRequest(`/hub_visits/${person_id}/${date}`, "PATCH", params);
    
    if (!data) {
      return formatMcpResponse(null, `Failed to update hub visit for person ${person_id} on ${date}`);
    }
    
    return formatMcpResponse(data);
  }
);

// Delete Hub Visit
server.tool(
  "delete-hub-visit",
  "Delete a hub visit for a person on a specific date",
  {
    person_id: z.number().describe("Person ID"),
    date: z.string().describe("Visit date (YYYY-MM-DD)"),
  },
  async ({ person_id, date }) => {
    const response = await makeRecurseRequest(`/hub_visits/${person_id}/${date}`, "DELETE");
    
    return formatMcpResponse({ success: true }, "Hub visit deleted successfully");
  }
);

// Update Hub Visit Notes
server.tool(
  "update-hub-visit-notes",
  "Replace or remove notes for a hub visit",
  {
    person_id: z.number().describe("Person ID"),
    date: z.string().describe("Visit date (YYYY-MM-DD)"),
    notes: z.string().describe("New notes content (empty string to remove)"),
  },
  async ({ person_id, date, notes }) => {
    const data = await makeRecurseRequest(`/hub_visits/${person_id}/${date}/notes`, "PATCH", { notes });
    
    if (!data) {
      return formatMcpResponse(null, `Failed to update hub visit notes for person ${person_id} on ${date}`);
    }
    
    return formatMcpResponse(data);
  }
);

let transport = null;

app.get("/sse", (req, res) => {
  transport = new SSEServerTransport("/messages", res);
  server.connect(transport);
});

app.post("/messages", (req, res) => {
  if (transport) {
    console.log("Received message");
    transport.handlePostMessage(req, res);
  }
});

app.listen(9000, () => {
  console.log("Recurse Center MCP server running on port 9000");
});