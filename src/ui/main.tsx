import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App.tsx";
import "./styles.css";

const queryClient = new QueryClient();
const file = new URLSearchParams(window.location.search).get("file");
const root = document.getElementById("root")!;

if (!file) {
  root.textContent = "Missing ?file= parameter";
} else {
  createRoot(root).render(
    <QueryClientProvider client={queryClient}>
      <App file={file} />
    </QueryClientProvider>,
  );
}
