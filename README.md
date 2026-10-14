# Code Instructor

A local-first AI assistant powered by Ollama. Ask about anything; programming is a specialty, not a restriction. For coding help, ask about any programming language, framework, markup or query language, shell, or coding tool. Type a language directly or choose one from the suggestions. Responses stream into the chat, and the ongoing conversation and selected language are saved in your browser.

## Requirements

- Node.js 18 or newer
- [Ollama](https://ollama.com/) installed and running
- At least one Ollama model; for example, `ollama pull qwen2.5-coder:7b`

## Start the app

```powershell
npm start
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). The app discovers available models from Ollama automatically. A coding-tuned model such as `qwen2.5-coder:7b` is recommended for code-heavy lessons, but you can choose any model already installed in Ollama.

The web app and Ollama connection are served locally. Conversation history is stored in this browser's local storage; long chats continue using a rolling recent-context window to fit the model's context limit. To use a different Ollama server, set `OLLAMA_URL` before starting the app; to change the web port, set `PORT`.

You can attach text/source files and images before sending. The app reads files locally in the browser, keeps preview metadata in the chat, and includes the file content with the prompt when sending to the model. Image uploads work only with Ollama models that advertise vision support; unsupported models show a clear message instead of silently failing.

Answers depend on the knowledge and capabilities of the selected local model. The assistant has no live web access and may not know recent events; it should say when it is unsure rather than present a guess as fact.
