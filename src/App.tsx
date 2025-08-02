import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthGuard from "./components/Layout/AuthGuard";
import Dashboard from "./pages/Dashboard";
import CampaignNew from "./pages/CampaignNew";
import CampaignReview from "./pages/CampaignReview";
import TeamFeedback from "./pages/TeamFeedback";
import VersionTracker from "./pages/VersionTracker";
import AIAssistant from "./pages/AIAssistant";
import AIRequestDetail from "./pages/AIRequestDetail";
import KnowledgeBase from "./pages/KnowledgeBase";
import SetupWizard from "./pages/SetupWizard";
import NotFound from "./pages/NotFound";

// Import new pages
import CampaignsOverview from "./pages/CampaignsOverview";
import CampaignDetail from "./pages/CampaignDetail";
import EmailCenter from "./pages/EmailCenter";
import EmailDetail from "./pages/EmailDetail";
import AutoresponsesManager from "./pages/AutoresponsesManager";
import CampaignSchedule from "./pages/CampaignSchedule";
import CampaignReports from "./pages/CampaignReports";
import Contacts from "./pages/Contacts";
import Templates from "./pages/Templates";
import NotificationCenter from "./pages/NotificationCenter";
import PlanovacPublikace from "./pages/PlanovacPublikace";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <TooltipProvider>
        <BrowserRouter>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<AuthGuard><Dashboard /></AuthGuard>} />
            <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
            
            {/* Campaign routes */}
            <Route path="/campaigns" element={<CampaignsOverview />} />
            <Route path="/campaign/new" element={<CampaignNew />} />
            <Route path="/campaign/:id" element={<CampaignDetail />} />
            <Route path="/campaign-review" element={<CampaignReview />} />
            <Route path="/campaigns/:id/schedule" element={<CampaignSchedule />} />
            <Route path="/campaigns/:id/reports" element={<CampaignReports />} />
            
            {/* Email routes */}
            <Route path="/emails" element={<EmailCenter />} />
            <Route path="/email/:id" element={<EmailDetail />} />
            
            {/* Other feature routes */}
            <Route path="/autoresponses" element={<AutoresponsesManager />} />
            <Route path="/schedule" element={<CampaignSchedule />} />
            <Route path="/planovac-publikace" element={<PlanovacPublikace />} />
            <Route path="/reports" element={<CampaignReports />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/notifications" element={<NotificationCenter />} />
            
            {/* Existing routes */}
            <Route path="/team-feedback" element={<TeamFeedback />} />
            <Route path="/version-tracker" element={<VersionTracker />} />
            <Route path="/ai-assistant" element={<AIAssistant />} />
            <Route path="/ai-assistant/:id" element={<AIRequestDetail />} />
            <Route path="/knowledge-base" element={<KnowledgeBase />} />
            <Route path="/setup-wizard" element={<SetupWizard />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
