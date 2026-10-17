import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../styles/app.css";
import "./product.css";
import ProductApp from "./ProductApp";
import { applyPreferences, readPreferences } from "./preferences";

applyPreferences(readPreferences());
document.body.classList.add("window", "tagma");
if (navigator.userAgent.includes("Windows")) document.documentElement.classList.add("win");
createRoot(document.getElementById("root")!).render(<StrictMode><ProductApp /></StrictMode>);
