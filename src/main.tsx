import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/app.css";
import "./styles/routing.css";
import "./styles/shell-patch.css";
import "./styles/library.css";
import "./styles/sessions.css";
import "./styles/plugins.css";
import "./styles/context.css";
import { bootDemoTheme } from "./applyTheme";
import App from "./App";
import { prepareLanguage } from "./i18n";

// Magpie theme.js: saved theme before first paint (bootPrefs → dataset.theme)
bootDemoTheme();

const mount = () => createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
// Load only a saved non-default language before the first UI paint.
void prepareLanguage().then(mount, mount);
