# Providers — native Linux shots (2026-10-15)

对照：`01`–`13` PNGs（custom 嵌套全层）

## 01-default
- Find a vendor… + Import…
- Subscriptions（sign in, no key）：Claude · ChatGPT · ChatGPT API · Copilot · Gemini CLI · Antigravity · More in Plugins
- Vendors（the makers' own APIs）：Anthropic · OpenAI · Google Gemini · Vertex AI · DeepSeek · xAI · Kimi · Kimi Code · Zhipu GLM · Z.ai …

## 02-search-miss
- 无匹配：Nothing called “{q}”. **Add it as a custom provider** · **look for a plugin**

## 03–13 custom editor（嵌套）
| # | 帧 | 要点 |
|---|-----|------|
| 03 | default | Name / Base URL 五段 / API key Show / Icon / Headers / Extra body · Cancel+Add |
| 04 | OpenAI Responses | 段 on + tip「…/v1 — for a vendor that serves only the Responses API…」 |
| 05 | System One | 段 on |
| 06 | Detect 无 URL | tip「Type the base URL first…」 |
| 07 | Each picked model | 需先有模型 / 试探框 |
| 08 | key Hide | Show↔Hide |
| 09 | Built-in icons | Find an icon… + 图标网格 |
| 10 | icon search | 搜 `aws` → AWS 结果 |
| 11 | header JSON | `{ }` 填 value |
| 12 | scrolled | 表单可滚 · Extra body 可见 |
| 13 | header added | + Add header 多行 |

System One 空模型 Detect：橙字「A decision API is asked with one model…」

## demo 对齐（v0.1.23）
- 空态 / miss / custom 五段 + Detect/Each + Icon 内置网格 + Headers 行已回写
- 真探测与真文件选择仍为 mock 文案

| 14 | icon file recent | 系统文件选择 · Recent |
| 15 | icon file home | 系统文件选择 · Home |

| 16 | icon file other | 文件选择 Other locations |
| 17 | favicon need URL | From the website · 红字 type base URL first |
| 18 | Discard | Discard unsaved changes? · Cancel / 红 Discard |
| 19 | search→Plugins | miss 链 look for a plugin → Plugins Discover 搜同词 |

| 20–21 | Import Alma/Codex | Import… 应用列表嵌套 |
