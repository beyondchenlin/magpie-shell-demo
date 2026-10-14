import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/app.css";
import "./styles/routing.css";
import "./styles/shell-patch.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
