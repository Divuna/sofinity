import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CampaignNew from "./pages/CampaignNew";
import CampaignReview from "./pages/CampaignReview";
import TeamFeedback from "./pages/TeamFeedback";
import VersionTracker from "./pages/VersionTracker";
import AIAssistant from "./pages/AIAssistant";
import KnowledgeBase from "./pages/KnowledgeBase";
import SetupWizard from "./pages/SetupWizard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Index />} />
          <Route path="/campaign/new" element={<CampaignNew />} />
          <Route path="/campaign-review" element={<CampaignReview />} />
          <Route path="/team-feedback" element={<TeamFeedback />} />
          <Route path="/version-tracker" element={<VersionTracker />} />
          <Route path="/ai-assistant" element={<AIAssistant />} />
          <Route path="/knowledge-base" element={<KnowledgeBase />} />
          <Route path="/setup-wizard" element={<SetupWizard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
