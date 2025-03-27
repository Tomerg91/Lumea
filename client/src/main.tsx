import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/use-auth";
import App from "./App";
import "./index.css";
import { queryClient } from "./lib/queryClient";

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </QueryClientProvider>
);
