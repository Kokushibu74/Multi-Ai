# Multi-AI Local Agent Runtime (prototype)

A zero-cost-first, loopback-only sidecar. It does not change the existing chat UI, PWA layout, or production Cloudflare Worker.

## Seven upstream integrations

| Upstream | Prototype use | Current state |
|---|---|---|
| Browser Use | Optional pinned local Python library | Readiness check only; browser actions gated |
| AgentMemory | Project-scoped local memory adapter | Working SQLite prototype; D1 remains production source of truth |
| Scientific Agent Skills | License-aware skills catalog | Catalog only; no skill files copied or executed |
| Diagram Design | Mermaid diagram generation | Working deterministic prototype |
| Anthropic Cybersecurity Skills | Defensive static source checks | Limited scanner; not a full security audit |
| Awesome Harness Engineering | Allowlisted dispatch, validation and task summaries | Working prototype |
| OpenViking | External knowledge/context sidecar boundary | Not installed or contacted; AGPL-3.0 review required |

This is a local integration prototype, not yet connected to the live Multi-AI chat. Browser Use, selected Scientific Skills and OpenViking need separately configured runtimes. The current UI and production API remain untouched.

## Requirements

- Python 3.10+; default runtime uses only the standard library.
- Windows 11, Linux or macOS.
- research.search reuses the existing Multi-AI /api/search endpoint.

Browser Use is optional and pinned to the upstream-recommended exact version browser-use==1.0.3. Installing it does not provide free model inference. A compatible local model and a reviewed read-only browser adapter are still required.

## Windows PowerShell setup

From the repository root:

\`\`\`powershell
cd agent-runtime
py -3 -m venv .venv
.\\.venv\\Scripts\\Activate.ps1
python -m pip install --upgrade pip
$env:MULTIAI_AGENT_TOKEN = python -c "import secrets; print(secrets.token_urlsafe(32))"
python server.py
\`\`\`

Keep the token private. The server binds only to 127.0.0.1:8765 and refuses public binding. Do not expose it with a public tunnel or router port-forward.

Optional Browser Use package:

\`\`\`powershell
python -m pip install -e ".[browser]"
\`\`\`

## API

- GET /health — loopback health check.
- GET /v1/capabilities — requires X-Agent-Token.
- POST /v1/tasks — requires X-Agent-Token.

Example:

\`\`\`powershell
$headers = @{ "X-Agent-Token" = $env:MULTIAI_AGENT_TOKEN }
$body = @{ project = "verity-news"; capability = "memory.add"; input = @{ text = "Keep RSS validation separate from customer alert delivery." } } | ConvertTo-Json -Depth 5
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8765/v1/tasks -Headers $headers -ContentType "application/json" -Body $body
\`\`\`

Capabilities: memory.add, memory.search, research.search, diagram.generate, security.audit, scientific.catalog, browser.status, knowledge.status, harness.status.

## Tests

\`\`\`powershell
python -m unittest -v test_server.py
python -m py_compile server.py test_server.py
\`\`\`

## Safety and data

- Local SQLite is written to agent-runtime/data/ (git-ignored).
- Task logs store summaries, not memory text, retrieved memory content or full audited source.
- No shell execution, arbitrary downloaded-code execution, GitHub writes, commits, deployments or private-network scans.
- No CORS is enabled. Keep the service on loopback.
- Production D1 is not changed. A reviewed D1 adapter and authenticated gateway are required before connecting to live chat.

## License notes

Upstream licenses checked: Browser Use MIT; AgentMemory Apache-2.0; Scientific Agent Skills MIT (declared in upstream LICENSE.md); Diagram Design MIT; Anthropic Cybersecurity Skills Apache-2.0; Awesome Harness Engineering CC0-1.0; OpenViking AGPL-3.0. This prototype references upstream projects and does not vendor their source or skill contents. Review OpenViking's AGPL obligations before operating or redistributing a hosted instance.

## Production phase (not performed)

1. Review this prototype and tests.
2. Add a D1-backed memory adapter to the canonical Worker source in the portfolio repository and keep the mirror synchronized.
3. Add an authenticated, allowlisted Worker-to-agent gateway; never expose the loopback service directly.
4. Configure Browser Use with a local/free model, network restrictions and explicit action approval.
5. Enable selected Scientific Agent Skills only after checking per-skill dependencies and external services.
6. Decide whether OpenViking's AGPL-3.0 obligations are acceptable before self-hosting.
7. Add integration tests and obtain approval before merge or deployment.
