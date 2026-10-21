# ✦ Multi AI — Personal AI Chat with Memory

A mobile-friendly, multilingual AI chat interface for **Bangla, English, and Banglish**, with voice input/output, free community-model fallback, portfolio-aware answers, and optional persistent memory stored encrypted in this GitHub repository.

> **Status:** the static interface is hosted by GitHub Pages. Persistent memory requires the Node backend and its environment variables to be configured. Never put a GitHub token in browser code.

## ✨ Features

- **Multi-provider chat:** Kilo AI and LLM7 community endpoints, with Auto fallback.
- **Voice:** browser speech recognition and speech synthesis where supported.
- **Portfolio knowledge:** built-in facts about [Shihabul Islam's portfolio](https://kokushibu74.github.io/), projects, GitHub and public contact links.
- **Persistent memory:** say `মনে রাখো, ...` or `Remember: ...`; ask `আমি কী মনে রাখতে বলেছিলাম?` to recall memories saved for this browser.
- **Encrypted storage:** memory payloads are encrypted using AES-256-GCM before the backend writes `data/memory.enc.json` to GitHub. The encryption key stays in the backend's environment variables.
- **Per-browser memory scope:** a random browser ID separates each visitor's memory list. Clearing browser storage loses that ID, so the old list will no longer be associated automatically.
- **Responsive UI:** desktop and mobile layouts; the portfolio chatbot embeds this interface in a floating window.

## 🌐 GitHub Pages deployment

1. Open [Repository Pages settings](https://github.com/Kokushibu74/Multi-Ai/settings/pages).
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Check [Actions](https://github.com/Kokushibu74/Multi-Ai/actions) and wait for the Pages workflow to succeed.
4. The expected URL is [https://kokushibu74.github.io/Multi-Ai/](https://kokushibu74.github.io/Multi-Ai/).

GitHub Pages is static hosting; it does not run Flask or Node.js server code.

## ⚙️ Backend deployment (Render)

The API lives in `server.js` and uses Node.js. Deploy this repository as a **Web Service** on Render:

- **Repository:** `https://github.com/Kokushibu74/Multi-Ai`
- **Branch:** `main`
- **Runtime:** Node
- **Build command:** `npm install`
- **Start command:** `npm start`
- **Plan:** Free, if available in your account/region

Set these environment variables in the Render dashboard. Do not commit real values.

| Variable | Required | Description |
|---|---:|---|
| `GITHUB_TOKEN` | For persistent memory | Fine-grained GitHub token with **Contents: Read and write** access to this repository only |
| `GITHUB_OWNER` | No | Defaults to `Kokushibu74` |
| `GITHUB_REPO` | No | Defaults to `Multi-Ai` |
| `GITHUB_BRANCH` | No | Defaults to `main` |
| `MEMORY_ENCRYPTION_KEY` | For persistent memory | Exactly 64 hexadecimal characters (32 bytes), generated privately; never share it in chat or commit it |
| `ALLOWED_ORIGINS` | No | Comma-separated allowed origins; defaults to the portfolio origin |

Generate an encryption key privately in Termux/Linux/macOS with `openssl rand -hex 32`. In PowerShell, you can generate one with:
```powershell
-join (1..32 | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
```
Use a cryptographically secure generator where possible. Save the key only in Render environment variables and a private password manager. If you lose it, encrypted memory cannot be decrypted.

After deployment, set the `API_BASE` constant near the top of the script in `index.html` to your actual Render service URL, then commit that update. Do not use a placeholder URL.

## 🧠 Memory commands

Examples:
- `মনে রাখো, আমার পোর্টফোলিওর লিংক kokushibu74.github.io`
- `Remember: I prefer concise answers in Bangla.`
- `আমি কী মনে রাখতে বলেছিলাম?`
- `Show my memories`

Memory is scoped to the browser's random client ID and stored as encrypted data in `data/memory.enc.json`. The repository file should remain encrypted; do not replace it with plain-text notes. The backend can still answer normal chat questions when memory is not configured, but it cannot persist memory until the two required environment variables are set.

## 🛡️ Security notes

- Never put `GITHUB_TOKEN`, `MEMORY_ENCRYPTION_KEY`, or any private API key in `index.html`.
- Use a fine-grained token limited to this repository and revoke it if exposed.
- Memory is encrypted at rest in GitHub, but prompts are still sent to the selected AI provider. Do not save passwords, financial credentials, government ID numbers, or other highly sensitive information.
- The public chat endpoint can be used by visitors. Free providers may rate-limit or change their terms; add stricter rate limits before promoting it widely.
- Keep `data/memory.enc.json` encrypted. Its contents are not meant to be manually edited.
- GitHub Pages does not support server-side secrets or server code.

## 🧑‍💻 Portfolio knowledge included

The assistant is given these public facts:
- Owner: **Shihabul Islam** — Bangladesh
- Portfolio: [kokushibu74.github.io](https://kokushibu74.github.io/)
- GitHub: [Kokushibu74](https://github.com/Kokushibu74)
- Email: [mdshihab74@gmail.com](mailto:mdshihab74@gmail.com)
- WhatsApp: [Chat](https://wa.me/8801620107233)
- YouTube: [Lo-Fi World](https://www.youtube.com/@Lo-Fi_World-x3w)
- Known projects: MEMO WhatsApp AI Assistant and Termux Tool OS

The assistant should not invent unlisted experience, qualifications, project features, or promises.

## 🔌 API endpoints

- `GET /health` — service health and memory configuration status
- `GET /api/knowledge` — portfolio knowledge supplied to the assistant
- `POST /api/chat` — chat through the selected community provider
- `GET /api/memory?clientId=...` — list memory items for one browser ID
- `POST /api/memory` — save an item
- `DELETE /api/memory/:memoryId` — delete an item

Example chat request:
```json
{
  "clientId": "a-random-client-id-long-enough",
  "provider": "auto",
  "messages": [{"role": "user", "content": "Tell me about Shihab's portfolio."}]
}
```

## 🧰 Local development

```bash
npm install
npm start
```

The backend listens on `PORT` (default `3000`). Persistent memory will remain unavailable until `GITHUB_TOKEN` and `MEMORY_ENCRYPTION_KEY` are set.

## License

No license is specified yet. Add a `LICENSE` file if you want to grant others explicit reuse rights.
