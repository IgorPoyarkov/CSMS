import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./scss/global.scss";
import App from "./App.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 15 секунд «свежести» убирают повторные запросы при быстром переходе
      // между экранами: кэш отдаётся сразу, фоновый рефетч не запускается.
      // Справочники и долгоживущие данные переопределяют staleTime у себя.
      staleTime: 15_000,
      gcTime: 5 * 60_000,
      // Вкладка не должна дёргать API при возврате фокуса: данные обновляют
      // мутации через invalidateQueries и кнопки «Обновить».
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
