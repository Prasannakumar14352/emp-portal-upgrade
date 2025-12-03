import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "@/components/theme-provider";
import SystemLogs from './pages/SystemLogs';

createRoot(document.getElementById("root")!).render(
    <ThemeProvider>
        <App />
    </ThemeProvider>
);
