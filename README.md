# Multi AI — GitHub Pages Edition

A static, mobile-friendly web version of the original Termux Flask prototype. It includes chat, provider fallback, and browser speech recognition/speech synthesis.

## Deploy on GitHub Pages

1. Open **Settings → Pages** in this repository.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select branch **main** and folder **/(root)**, then Save.
4. After GitHub finishes publishing, open the Pages URL shown on that screen. For this repository it is typically `https://kokushibu74.github.io/Multi-Ai/`.

The repository must contain `index.html` at its root. Pages is static hosting, so the Flask server is not run by GitHub Pages.

## AI providers

- **Kilo AI**: `https://api.kilo.ai/api/gateway/chat/completions`, model `kilo-auto/free`
- **LLM7**: `https://api.llm7.io/v1/chat/completions`, model `gpt-oss:20b`
- **Auto** tries Kilo first, then LLM7.

These are community/free endpoints used without a user-supplied API key in the original prototype. Availability, quotas, model names, and browser CORS support are controlled by those services and can change. If the browser blocks direct requests with a CORS error, GitHub Pages alone cannot fix it; a server-side proxy is required. No API keys are collected or stored by this site.

## Notes

- Live voice support depends on browser support for the Web Speech API; Chrome is recommended.
- This is a static website; conversation history stays in the current page session and is cleared when the page is refreshed.
- Public keyless endpoints may be abused or rate-limited. Avoid sending secrets or sensitive personal information.
