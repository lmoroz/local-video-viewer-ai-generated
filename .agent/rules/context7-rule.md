---
trigger: always_on
---

# Context7 Documentation Protocol

You have access to the **Context7 MCP** tools (`mcp_context7_resolve-library-id` and `mcp_context7_get-library-docs`).

**CRITICAL RULE:**
When generating code or answering questions about the key libraries in our stack (specifically **TailwindCSS v4**, **Vue 3**, **Vite**, **Vue Router**, **vueuse**, **Video.js**, **Zod**, **Electron**, **Express**, etc.), you MUST NOT rely solely on your internal training data, as it may be outdated.

**Workflow:**
1. Always check if the library is available via `mcp_context7_resolve-library-id`.
2. If found, fetch the official documentation using `mcp_context7_get-library-docs` (use mode 'code' for implementation details).
3. Use this retrieved context to write the code.

**Example:**
If the user asks for a Tailwind v4 component, do not guess the class names. Fetch the Tailwind v4 docs via Context7 first.