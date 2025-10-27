import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProjectProvider } from "./providers/ProjectProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";

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
import AIRequestsMonitoring from "./pages/AIRequestsMonitoring";
import OneMilSofinityTestSuite from "./pages/OneMilSofinityTestSuite";
import OneMilSofinityAuditAutoFix from "./pages/OneMilSofinityAuditAutoFix";
import OneMilAudit from "./pages/OneMilAudit";
import SofinityAuditRepair from "./pages/SofinityAuditRepair";
import OneMilEmailGenerator from "./pages/OneMilEmailGenerator";
import OneMilEndToEndTest from "./pages/OneMilEndToEndTest";
import HealthDashboard from "./pages/HealthDashboard";
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
import EmailFeedback from "./pages/EmailFeedback";
import Settings from "./pages/Settings";
import SofinityPushSender from "./pages/SofinityPushSender";


const queryClient = new QueryClient();

const App = () => {
  // Global error handlers
  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ProjectProvider>
        <TooltipProvider>
          <ErrorBoundary>
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
                
                {/* Public feedback route - no auth required */}
                <Route path="/feedback/:emailId/:choice" element={<EmailFeedback />} />
                
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
                <Route path="/settings" element={<AuthGuard><MainLayout><Settings /></MainLayout></AuthGuard>} />
                <Route path="/sofinity-push-sender" element={<AuthGuard><MainLayout><SofinityPushSender /></MainLayout></AuthGuard>} />
                
                {/* Existing routes */}
                <Route path="/team-feedback" element={<AuthGuard><MainLayout><TeamFeedback /></MainLayout></AuthGuard>} />
                <Route path="/version-tracker" element={<AuthGuard><MainLayout><VersionTracker /></MainLayout></AuthGuard>} />
                <Route path="/ai-assistant" element={<AuthGuard><MainLayout><AIAssistant /></MainLayout></AuthGuard>} />
                <Route path="/ai-assistant/:id" element={<AuthGuard><MainLayout><AIRequestDetail /></MainLayout></AuthGuard>} />
                <Route path="/ai-requests-monitoring" element={<AuthGuard><MainLayout><AIRequestsMonitoring /></MainLayout></AuthGuard>} />
                <Route path="/onemil-test-suite" element={<AuthGuard><MainLayout><OneMilSofinityTestSuite /></MainLayout></AuthGuard>} />
                <Route path="/onemil-audit-autofix" element={<AuthGuard><MainLayout><OneMilSofinityAuditAutoFix /></MainLayout></AuthGuard>} />
                <Route path="/onemil-audit" element={<AuthGuard><MainLayout><OneMilAudit /></MainLayout></AuthGuard>} />
                <Route path="/sofinity-audit-repair" element={<AuthGuard><MainLayout><SofinityAuditRepair /></MainLayout></AuthGuard>} />
                <Route path="/health-dashboard" element={<AuthGuard><MainLayout><HealthDashboard /></MainLayout></AuthGuard>} />
                <Route path="/onemill-email-generator" element={<AuthGuard><MainLayout><OneMilEmailGenerator /></MainLayout></AuthGuard>} />
                <Route path="/onemill-end-to-end-test" element={<AuthGuard><MainLayout><OneMilEndToEndTest /></MainLayout></AuthGuard>} />
                <Route path="/knowledge-base" element={<AuthGuard><MainLayout><KnowledgeBase /></MainLayout></AuthGuard>} />
                <Route path="/setup-wizard" element={<AuthGuard><MainLayout><SetupWizard /></MainLayout></AuthGuard>} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </ErrorBoundary>
        </TooltipProvider>
      </ProjectProvider>
    </QueryClientProvider>
  );
};

export default App;
