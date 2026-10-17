/** Pure display templates from pinned Magpie 63be477 gateway/client.js:173–340.
 * No request is executed; the demo renders/copies these strings only. */
export type FlavorId = 'openai' | 'responses' | 'anthropic' | 'gemini' | 'systemone';
export type CurlRequest = {url: string; headers: string[]; body: string};
export type GatewayFlavor = {name: string; base: (url: string) => string; baseEnv?: string; keyEnv?: string; decide?: boolean; note: string; curl: (base: string, model: string, key?: string) => CurlRequest; python: (base: string, model: string, key?: string) => string; node: (base: string, model: string, key?: string) => string};
export const GATEWAY_FLAVORS: Record<FlavorId, GatewayFlavor> = {
  openai: {
    name: "OpenAI", base: (u) => u + "/v1", baseEnv: "OPENAI_BASE_URL", keyEnv: "OPENAI_API_KEY",
    note: "Chat Completions, the API most tools speak. Anything with an OpenAI base-URL setting works.",
    curl: (b, m, k = "magpie") => ({ url: `${b}/chat/completions`, headers: [`Authorization: Bearer ${k}`],
      body: `{"model": "${m}",\n "messages": [{"role": "user", "content": "hi"}]}` }),
    python: (b, m, k = "magpie") => `from openai import OpenAI

client = OpenAI(base_url="${b}", api_key="${k}")
r = client.chat.completions.create(
    model="${m}",
    messages=[{"role": "user", "content": "hi"}],
)
print(r.choices[0].message.content)`,
    node: (b, m, k = "magpie") => `import OpenAI from "openai";

const client = new OpenAI({ baseURL: "${b}", apiKey: "${k}" });
const r = await client.chat.completions.create({
  model: "${m}",
  messages: [{ role: "user", content: "hi" }],
});
console.log(r.choices[0].message.content);`,
  },
  responses: {
    name: "Responses", base: (u) => u + "/v1", baseEnv: "OPENAI_BASE_URL", keyEnv: "OPENAI_API_KEY",
    note: "OpenAI's newer API: reasoning, built-in tool items, encrypted reasoning. Codex speaks this.",
    curl: (b, m, k = "magpie") => ({ url: `${b}/responses`, headers: [`Authorization: Bearer ${k}`],
      body: `{"model": "${m}", "input": "hi"}` }),
    python: (b, m, k = "magpie") => `from openai import OpenAI

client = OpenAI(base_url="${b}", api_key="${k}")
r = client.responses.create(model="${m}", input="hi")
print(r.output_text)`,
    node: (b, m, k = "magpie") => `import OpenAI from "openai";

const client = new OpenAI({ baseURL: "${b}", apiKey: "${k}" });
const r = await client.responses.create({ model: "${m}", input: "hi" });
console.log(r.output_text);`,
  },
  anthropic: {
    name: "Anthropic", base: (u) => u, baseEnv: "ANTHROPIC_BASE_URL", keyEnv: "ANTHROPIC_API_KEY",
    note: "Messages API. Claude Code reads ANTHROPIC_AUTH_TOKEN instead of the key; the Agents tab sets that for you.",
    curl: (b, m, k = "magpie") => ({ url: `${b}/v1/messages`, headers: [`x-api-key: ${k}`, "anthropic-version: 2023-06-01"],
      body: `{"model": "${m}", "max_tokens": 1024,\n "messages": [{"role": "user", "content": "hi"}]}` }),
    python: (b, m, k = "magpie") => `import anthropic

client = anthropic.Anthropic(
    base_url="${b}", api_key="${k}",
)
m = client.messages.create(
    model="${m}",
    max_tokens=1024,
    messages=[{"role": "user", "content": "hi"}],
)
print(m.content[0].text)`,
    node: (b, m, k = "magpie") => `import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ baseURL: "${b}", apiKey: "${k}" });
const m = await client.messages.create({
  model: "${m}",
  max_tokens: 1024,
  messages: [{ role: "user", content: "hi" }],
});
console.log(m.content[0].text);`,
  },
  gemini: {
    name: "Gemini", base: (u) => u, baseEnv: "GOOGLE_GEMINI_BASE_URL", keyEnv: "GEMINI_API_KEY",
    note: "Google's generateContent API, v1beta. Gemini CLI and the google-genai SDKs speak this.",
    curl: (b, m, k = "magpie") => ({ url: `${b}/v1beta/models/${m}:generateContent`, headers: [`x-goog-api-key: ${k}`],
      body: `{"contents": [{"parts": [{"text": "hi"}]}]}` }),
    python: (b, m, k = "magpie") => `from google import genai

client = genai.Client(api_key="${k}", http_options={"base_url": "${b}"})
r = client.models.generate_content(model="${m}", contents="hi")
print(r.text)`,
    node: (b, m, k = "magpie") => `import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: "${k}",
  httpOptions: { baseUrl: "${b}" },
});
const r = await ai.models.generateContent({ model: "${m}", contents: "hi" });
console.log(r.text);`,
  },
  // magpie's own System One API (ARNO on Discord: gateway添加system one
  // api 有想法吗): a decision model — Jev, Clef, Bailian's — answers typed
  // questions about a state; no SDK speaks it, so no shell variables
  systemone: {
    name: "System One", base: (u) => u + "/v1", decide: true,
    note: "TypeSafe's decision API: a Jev or Clef model answers typed questions (choice, noul, score) about a state, with how sure it is. Clef also reads images: add \"images\": [\"data:image/png;base64,…\"].",
    curl: (b, m, k = "magpie") => ({ url: `${b}/systemone`, headers: [`Authorization: Bearer ${k}`],
      body: `{"model": "${m}",\n "state": {"message": "My order never arrived, refund it"},\n "questions": {"team": {"type": "choice",\n   "instructions": "Which team should answer the message?",\n   "criteria": {"billing": "Payments and refunds", "shipping": "Deliveries", "other": "Anything else"}}}}` }),
    python: (b, m, k = "magpie") => `import requests

r = requests.post("${b}/systemone",
    headers={"Authorization": "Bearer ${k}"},
    json={
        "model": "${m}",
        "state": {"message": "My order never arrived, refund it"},
        "questions": {"team": {
            "type": "choice",
            "instructions": "Which team should answer the message?",
            "criteria": {"billing": "Payments and refunds", "shipping": "Deliveries", "other": "Anything else"},
        }},
    })
a = r.json()["answers"]["team"]
print(a["choice"], a["confidence"])`,
    node: (b, m, k = "magpie") => `const r = await fetch("${b}/systemone", {
  method: "POST",
  headers: { Authorization: "Bearer ${k}", "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "${m}",
    state: { message: "My order never arrived, refund it" },
    questions: { team: {
      type: "choice",
      instructions: "Which team should answer the message?",
      criteria: { billing: "Payments and refunds", shipping: "Deliveries", other: "Anything else" },
    } },
  }),
});
const a = (await r.json()).answers.team;
console.log(a.choice, a.confidence);`,
  },
};

const plainWord = /^[\w%+=:./-]+$/;
const shQuote = (s: string) => (plainWord.test(s) ? s : `'${s.replaceAll("'", `'\\''`)}'`);
// in "…" for a header's spaces, unless it holds what bash expands there
const shHeader = (s: string) => (/[$`"\\!]/.test(s) ? `'${s.replaceAll("'", `'\\''`)}'` : `"${s}"`);
const psQuote = (s: string) => (plainWord.test(s) ? s : `'${s.replace(/['‘’‚‛]/g, "$&$&")}'`);
// "…" as the C runtime splits a command line: \" for a quote, and the
// backslashes before one doubled
const winArg = (s: string) => (plainWord.test(s) ? s : `"${s.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/, "$1$1")}"`);
const psHeader = (s: string) => (/[$`"“”„]/.test(s) ? `'${s.replace(/['‘’‚‛]/g, "$&$&")}'` : `"${s}"`);

export function curlSnippet({ url, headers, body }: CurlRequest, win: boolean) {
  headers = [...headers, "Content-Type: application/json"];
  // curl reads [ ] { } in a URL as a range unless told not to
  const g = /[[\]{}]/.test(url) ? " -g" : "";
  // A " inside an argument reaches curl.exe differently from Windows
  // PowerShell 5.1 and from PowerShell 7, and whole from neither as
  // written; after --% the line goes to curl.exe as it stands, on one line,
  // quoted as the C runtime reads a command line. (A %NAME% of a variable
  // the shell has is still put in there; a key would have to hold both.)
  if (win && headers.some((h) => h.includes('"'))) return `@'\n${body}\n'@ | curl.exe --%${g} ${winArg(url)} ${headers.map((h) => `-H ${winArg(h)}`).join(" ")} --data-binary "@-"`;
  if (win) return `@'\n${body}\n'@ | curl.exe${g} ${psQuote(url)} \`\n${headers.map((h) => `  -H ${psHeader(h)} \``).join("\n")}\n  --data-binary "@-"`;
  return `curl${g} ${shQuote(url)} \\\n${headers.map((h) => `  -H ${shHeader(h)} \\`).join("\n")}\n  -d '${body.replaceAll("'", `'\\''`).replaceAll("\n", "\n      ")}'`;
}

export function envSnippet(vars: [string, string][], win: boolean) {
  return vars.map(([k, v]) => (win ? `$env:${k}=${psHeader(v)}` : `export ${k}=${shQuote(v)}`)).join("\n");
}

