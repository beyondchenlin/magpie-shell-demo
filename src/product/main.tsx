import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../styles/app.css";
import "../styles/routing.css";
import "../styles/shell-patch.css";
import "../styles/library.css";
import "../styles/sessions.css";
import "../styles/plugins.css";
import "../styles/context.css";
import "./product.css";
import ProductApp from "./ProductApp";
import { RespectReducedMotion } from "../components/SegThumb";
import { applyPreferences, readPreferences } from "./preferences";

applyPreferences(readPreferences());
document.body.classList.add("window", "tagma");
if (navigator.userAgent.includes("Windows")) document.documentElement.classList.add("win");
createRoot(document.getElementById("root")!).render(<StrictMode><RespectReducedMotion.Provider value={true}><ProductApp /></RespectReducedMotion.Provider></StrictMode>);
