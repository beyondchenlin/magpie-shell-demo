import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/app.css";
import "./styles/routing.css";
import "./styles/shell-patch.css";
import "./styles/library.css";
import "./styles/plugins.css";
import "./styles/context.css";
import { bootDemoTheme } from "./applyTheme";
import App from "./App";

// Magpie theme.js: saved theme before first paint (bootPrefs → dataset.theme)
bootDemoTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
