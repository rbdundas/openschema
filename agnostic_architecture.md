# Agnostic Core Architecture: "OpenSchema Flow"

This document outlines the design and scaffolding for a domain-agnostic business process modeling (BPMN) engine and schema builder. By abstracting concepts like "Policy", "Carrier", and "FNOL Claim" into generic elements like `Entity`, `Process`, and `Step`, we can build, test, and host the platform under employment agreements without violating the non-compete or IP assignment clauses.

This website will be the initial website for designing an Open Schema / Open Source business process modeling engine. For now, the database should be a file-based JSON file, and the website will be a monolithic Node.js application or Bun application. It should be self-contained and easy to deploy on Google Cloud Platform using Docker.

The website domain name will be openschema.foundation and will document architecture and shema structure, including fields and types, for common objects in business, i.e. an employee, a client, general ledger, etc. Once completely built, the data architecture will serve as the foundation from which open source applications will be built. For example, referencing the schema should provide the information necessary to generate a complete OpenAPI specification, SQL schema, or other data interchange formats, as well as the UI components and user interaction. The website will include both the schema and the business process workflows. No code will be written within these standards. This will be a portal of communication between developers building tools and schema for business processes.

Any AI code generation tools will be called as external APIs, and the website will not itself generate any code. It will serve as a documentation and design portal. Open Schema is intended to be a free and open source business process modeling engine that can be used by any business to model and automate their business processes. It is not intended to be a commercial product, but rather a tool that can be used by any business to improve their business processes.

When released, this website will publish the first iteration of what will be an industry standard for business process modeling and automation. The intent will be to provide a free and open source alternative to existing proprietary business process modeling tools. The website will serve as a repository for the schema and business process workflows, as well as documentation on how to use them and how to collaborate and share designs, and will be the reference site for all open source applications built upon this standard. 

---

## 1. Architectural Abstraction Layer

To avoid hardcoded industry domains, the application operates on four primary primitives:

```
  +------------------+                   +--------------------+
  |      Entity      | 1               * |     Process        |
  |  (Dynamic Types) |<------------------| (BPMN 2.0 Schema)  |
  +------------------+                   +--------------------+
           | 1                                     | 1
           |                                       |
           | *                                     | *
  +------------------+                   +--------------------+
  |    EntityData    |                   |     ProcessRun     |
  |  (JSON Key/Val)  |                   |  (Execution State) |
  +------------------+                   +--------------------+
                                                   | 1
                                                   |
                                                   | *
                                         +--------------------+
                                         |      StepRun       |
                                         |  (Audit & Billing) |
                                         +--------------------+
```

### The Core Primitives

1. **Entity (The Data Container):**
   * Instead of a `Policy` table, a `Client` table, and a `Claims` table, we use a single generic `Entity` model.
   * Entities have an `EntityType` (e.g., `"contact"`, `"contract"`, `"ticket"`) and a flexible custom schema (e.g., JSONB) to hold arbitrary properties.
2. **Process (The Workflow Blueprint):**
   * Represents the workflow blueprint modeled in BPMN 2.0 (using React Flow).
   * It is associated with a specific `EntityType` and contains a list of generic step definitions.
3. **ProcessRun (The Workflow Execution):**
   * Represents a single active run of a `Process` associated with a specific `Entity` instance.
   * Tracks overall progress, status (e.g., `active`, `suspended`, `completed`), and execution variables.
4. **StepRun (The Activity Record):**
   * Tracks the execution of an individual node in the workflow.
   * Records start time, completion time, assignee, action taken, and cost metrics (for workforce performance evaluation).

---

## 2. Generic Database Schema Scaffolding

Using PostgreSQL (with JSONB support) or Prisma, the schema is defined without any reference to insurance terminology.

```sql
-- Represents the type of object being modeled (e.g. Agreement, Asset, Ticket, Customer)
CREATE TABLE entity_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE, -- e.g., "customer", "agreement", "incident"
    schema_definition JSONB NOT NULL,   -- JSON schema for validation of properties
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Represents an instance of an entity
CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type_id UUID REFERENCES entity_types(id),
    name VARCHAR(255) NOT NULL,
    properties JSONB NOT NULL DEFAULT '{}', -- Raw key-value data complying with the entity type schema
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Represents a BPMN 2.0 workflow blueprint
CREATE TABLE processes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    entity_type_id UUID REFERENCES entity_types(id), -- What type of object this process acts upon
    bpmn_xml TEXT,                                   -- BPMN 2.0 XML representation
    flow_definition JSONB NOT NULL,                 -- Frontend React Flow representation (nodes, edges)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Represents an execution instance of a workflow
CREATE TABLE process_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID REFERENCES processes(id),
    entity_id UUID REFERENCES entities(id),          -- The target data record being processed
    status VARCHAR(50) NOT NULL DEFAULT 'running',   -- running, completed, paused, error
    current_node_id VARCHAR(100) NOT NULL,          -- Active node in the BPMN flow
    variables JSONB NOT NULL DEFAULT '{}',           -- Execution variables for the workflow run
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Represents the audit log and state of an individual process step
CREATE TABLE step_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_run_id UUID REFERENCES process_runs(id),
    node_id VARCHAR(100) NOT NULL,                  -- ID of the node in flow_definition
    node_type VARCHAR(50) NOT NULL,                 -- user_input, webhook, script, condition, ai_parse
    assignee_id VARCHAR(100),                        -- Generic identifier of the user or agent
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    cost_per_hour NUMERIC(10, 2) DEFAULT 0.00,       -- Billing/cost rate of the assignee at run time
    metadata JSONB DEFAULT '{}'                      -- Input/output variables and logging details
);
```

---

## 3. Designing Agnostic Flow Nodes

Your visual builder (React Flow) can support custom node types that are fully industry-agnostic:

*   **Form Node (User Action):** Pauses execution and prompts an assignee to fill out fields specified by a schema.
*   **API Webhook Node:** Calls a generic URL with a payload, parses the JSON response, and sets workflow variables.
*   **Conditional Gate Node:** Evaluates expressions based on the `Entity`'s current properties or workflow variables (e.g., `properties.value > 10000`) to route execution.
*   **AI Extraction Node:** Directs the document ingestion engine to parse a file against a specific JSON schema format and write the resulting output keys straight back to the `Entity`.

---

## 4. Ingestion Engine Decoupling

Your ingestion engine parses raw text/PDFs into rule sets using LLMs. To keep this agnostic:
1. Define a generic `IngestionPipeline` configuration:
   ```json
   {
     "pipeline_id": "standard-contract-parser",
     "target_entity_type": "agreement",
     "extraction_schema": {
       "type": "object",
       "properties": {
         "signee": { "type": "string" },
         "effective_date": { "type": "string", "format": "date" },
         "total_value": { "type": "number" }
       }
     }
   }
   ```
2. When a file is received, the AI matches text against the `extraction_schema` instead of looking specifically for "Named Insured" or "Coverage Limit". 

---

## 5. Security & Privacy Strategy (Password Gate)

To host your staging environment or documentation privately, use one of these low-profile approaches:

1. **Basic Authentication (Nginx/Express):**
   * Place the entire application path behind a basic authentication gate so search engine web crawlers cannot index the page.
   * Example using Express middleware (`basic-auth`):
     ```javascript
     const basicAuth = require('basic-auth');
     
     const authMiddleware = (req, res, next) => {
       const user = basicAuth(req);
       if (!user || user.name !== 'admin' || user.pass !== 'super-secure-pass') {
         res.set('WWW-Authenticate', 'Basic realm="Protected Scaffolding"');
         return res.sendStatus(401);
       }
       next();
     };
     
     app.use(authMiddleware);
     ```
2. **Private GitHub Repository / Docs:**
   * Keep documentation inside private wikis or folders, serving web pages on localhost during your current employment.
   * If previewing to close advisers, host it via private hosting services (e.g., password-gated Vercel deployments).

---

## 6. Future Transition to Insurance Domain

Once you are clear of any employment-related constraints:
*   You will create an **Insurance Pack** or a **Catalyst Schema** module.
*   This module will simply load predefined `entity_types` (like "Policy", "Claim", "Coverage") and predefined standard BPO `processes` (like "First Notice of Loss Workflow") directly into the agnostic DB tables.
*   The codebase itself remains clean, modular, and legal to build.

## 7. WYSIWYG Document Editor for Schema Development

Update the visual builder to use Type.js for schema development, allowing for the use of LLMs to assist in schema creation and updates via a WYSIWYG interface.

This will involve creating a new set of components that wrap the Type.js library and expose it through the existing visual builder interface. It will also involve creating a new set of LLM prompts that can be used to generate and update JSON Schema definitions via the Type.js interface. The Type.js library is a React component library that provides a visual interface for defining and editing JSON Schema structures. It is a free and open source library that can be used by any business to model and automate their business processes. You can find more information about Type.js at https://github.com/typejs/typejs.

Install React Flow (https://reactflow.dev/) and replace the BPMN diagram with the React Flow interface. Refer to React Flow documentation for more information on how to use the library. The React Flow library is a free and open source library that can be used by any business to model and automate their business processes.
