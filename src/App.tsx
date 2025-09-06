import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthGuard from "./components/Layout/AuthGuard";
import { MainLayout } from "./components/Layout/MainLayout";
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
import Projects from "./pages/Projects";
import Offers from "./pages/Offers";
import OffersAPI from "./pages/OffersAPI";
import OpravoDataHub from "./pages/OpravoDataHub";
import OpravoAPIDebug from "./pages/OpravoAPIDebug";
import ProjectDetail from "./pages/ProjectDetail";
import Prispevky from "./pages/Prispevky";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
        <BrowserRouter>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<AuthGuard><MainLayout><Dashboard /></MainLayout></AuthGuard>} />
            
            {/* Campaign routes */}
            <Route path="/campaigns" element={<AuthGuard><CampaignsOverview /></AuthGuard>} />
            <Route path="/campaign/new" element={<AuthGuard><MainLayout><CampaignNew /></MainLayout></AuthGuard>} />
            <Route path="/campaigns/:id" element={<AuthGuard><MainLayout><CampaignDetail /></MainLayout></AuthGuard>} />
            <Route path="/campaign-review" element={<AuthGuard><MainLayout><CampaignReview /></MainLayout></AuthGuard>} />
            <Route path="/campaigns/:id/schedule" element={<AuthGuard><MainLayout><CampaignSchedule /></MainLayout></AuthGuard>} />
            <Route path="/campaigns/:id/reports" element={<AuthGuard><MainLayout><CampaignReports /></MainLayout></AuthGuard>} />
            
            {/* Email routes */}
            <Route path="/emails" element={<AuthGuard><EmailCenter /></AuthGuard>} />
            <Route path="/emails/:id" element={<AuthGuard><MainLayout><EmailDetail /></MainLayout></AuthGuard>} />
            
            {/* Other feature routes */}
            <Route path="/autoresponses" element={<AuthGuard><MainLayout><AutoresponsesManager /></MainLayout></AuthGuard>} />
            <Route path="/schedule" element={<AuthGuard><MainLayout><CampaignSchedule /></MainLayout></AuthGuard>} />
            <Route path="/planovac-publikace" element={<AuthGuard><MainLayout><PlanovacPublikace /></MainLayout></AuthGuard>} />
            <Route path="/reports" element={<AuthGuard><MainLayout><CampaignReports /></MainLayout></AuthGuard>} />
            <Route path="/contacts" element={<AuthGuard><Contacts /></AuthGuard>} />
            <Route path="/templates" element={<AuthGuard><MainLayout><Templates /></MainLayout></AuthGuard>} />
            <Route path="/notifications" element={<AuthGuard><MainLayout><NotificationCenter /></MainLayout></AuthGuard>} />
            <Route path="/projekty" element={<AuthGuard><MainLayout><Projects /></MainLayout></AuthGuard>} />
            <Route path="/projekty/detail" element={<AuthGuard><ProjectDetail /></AuthGuard>} />
            <Route path="/projects" element={<AuthGuard><MainLayout><Projects /></MainLayout></AuthGuard>} />
            <Route path="/projects/:id" element={<AuthGuard><ProjectDetail /></AuthGuard>} />
            <Route path="/offers" element={<AuthGuard><MainLayout><Offers /></MainLayout></AuthGuard>} />
            <Route path="/offers-api" element={<AuthGuard><MainLayout><OffersAPI /></MainLayout></AuthGuard>} />
            <Route path="/opravo-data-hub" element={<AuthGuard><MainLayout><OpravoDataHub /></MainLayout></AuthGuard>} />
            <Route path="/opravo-api-debug" element={<AuthGuard><MainLayout><OpravoAPIDebug /></MainLayout></AuthGuard>} />
            <Route path="/prispevky" element={<AuthGuard><MainLayout><Prispevky /></MainLayout></AuthGuard>} />
            
            {/* Existing routes */}
            <Route path="/team-feedback" element={<AuthGuard><MainLayout><TeamFeedback /></MainLayout></AuthGuard>} />
            <Route path="/version-tracker" element={<AuthGuard><MainLayout><VersionTracker /></MainLayout></AuthGuard>} />
            <Route path="/ai-assistant" element={<AuthGuard><MainLayout><AIAssistant /></MainLayout></AuthGuard>} />
            <Route path="/ai-assistant/:id" element={<AuthGuard><MainLayout><AIRequestDetail /></MainLayout></AuthGuard>} />
            <Route path="/knowledge-base" element={<AuthGuard><MainLayout><KnowledgeBase /></MainLayout></AuthGuard>} />
            <Route path="/setup-wizard" element={<AuthGuard><MainLayout><SetupWizard /></MainLayout></AuthGuard>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
  </QueryClientProvider>
);

export default App;
