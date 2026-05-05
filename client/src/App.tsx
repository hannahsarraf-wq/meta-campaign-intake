import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Drafts from "./pages/Drafts";
import CampaignIntake from "./pages/CampaignIntake";
import SavedCampaigns from "./pages/SavedCampaigns";
import PushHistory from "./pages/PushHistory";
import Login from "./pages/Login";

// Pages that share the sidebar layout
function IntakePage() {
  return (
    <DashboardLayout>
      <CampaignIntake />
    </DashboardLayout>
  );
}

function DraftsPage() {
  return (
    <DashboardLayout>
      <Drafts />
    </DashboardLayout>
  );
}

function SavedCampaignsPage() {
  return (
    <DashboardLayout>
      <SavedCampaigns />
    </DashboardLayout>
  );
}

function PushHistoryPage() {
  return (
    <DashboardLayout>
      <PushHistory />
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/intake" component={IntakePage} />
      <Route path="/drafts" component={DraftsPage} />
      <Route path="/saved-campaigns" component={SavedCampaignsPage} />
      <Route path="/push-history" component={PushHistoryPage} />
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
