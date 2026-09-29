import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import StorePage from "./pages/Store";
import DashboardPage from "./pages/Dashboard";
import TrackingPage from "./pages/Tracking";
import Home from "./pages/Home";

function Router() {
  return (
    <Switch>
      {/* 1. Public Merchant E-Commerce Storefront */}
      <Route path="/" component={StorePage} />
      <Route path="/store" component={StorePage} />

      {/* 2. Public / Merchant Order Tracking */}
      <Route path="/tracking" component={TrackingPage} />
      <Route path="/store/tracking" component={TrackingPage} />

      {/* 3. Factory Management & ERP Operations Dashboard */}
      <Route path="/admin" component={DashboardPage} />
      <Route path="/dashboard" component={DashboardPage} />

      {/* 4. Legacy Comprehensive Workspace View */}
      <Route path="/legacy" component={Home} />

      {/* 404 Error Route */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="top-center" richColors />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
