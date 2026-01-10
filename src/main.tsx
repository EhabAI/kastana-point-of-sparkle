import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize theme from localStorage before render
const savedTheme = localStorage.getItem('kastana-theme');
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
  localStorage.setItem('kastana-theme', 'light');
}

createRoot(document.getElementById("root")!).render(<App />);
