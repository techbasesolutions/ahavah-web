# kibo-ui MCP cleanup — USER ACTION REQUIRED

`d:/Antigravity/ahavah-web/.mcp.json` currently points at the kibo-ui
remote MCP server:

```json
{
  "mcpServers": {
    "kibo-ui": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://www.kibo-ui.com/api/mcp/mcp"]
    }
  }
}
```

The endpoint is unreachable (SSE handshake fails) and produces a recurring
"kibo-ui connecting…" notice every Claude session opened in this project.

## Fix (one of)

**Option A — disable it:**

Replace the file contents with an empty server map:

```json
{
  "mcpServers": {}
}
```

**Option B — delete the file:**

```powershell
Remove-Item "d:/Antigravity/ahavah-web/.mcp.json"
```

Either works. Both stop the recurring connection error.

## Why Claude can't fix it

The auto-classifier blocks Claude from editing project-loaded MCP config
files (`.mcp.json` is a sensitive config surface — modifying it could
silently change which tools/servers are available to future sessions).
This is a one-line manual edit.

## After fixing

Reload the Claude session in this project; the `kibo-ui connecting…`
notice will stop on the next session start.
