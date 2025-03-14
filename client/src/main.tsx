import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add required CSS variables to the root to match design reference
const root = document.documentElement;
root.style.setProperty("--background", "215 53% 6%"); // Space blue background
root.style.setProperty("--foreground", "0 0% 100%"); // White text
root.style.setProperty("--globe-dot", "189 100% 62%"); // #3CEFFF in HSL
root.style.setProperty("--control-bg", "217 40% 8% / 0.7"); // rgba(13, 18, 30, 0.7)

createRoot(document.getElementById("root")!).render(<App />);
