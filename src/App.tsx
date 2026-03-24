import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { VotesProvider } from "@/context/VotesContext";
import Index from "./pages/Index.tsx";
import GenderSelect from "./pages/GenderSelect.tsx";
import VotingPage from "./pages/VotingPage.tsx";
import CandidatePage from "./pages/CandidatePage.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminPage from './pages/AdminPage';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <VotesProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/select" element={<GenderSelect />} />
            <Route path="/vote/:gender" element={<VotingPage />} />
            <Route path="/candidate/:id" element={<CandidatePage />} />
            <Route path="*" element={<NotFound />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </BrowserRouter>
      </VotesProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
