import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import NewSession from "@/pages/new-session";
import SessionDetail from "@/pages/session-detail";
import Coaches from "@/pages/coaches";
import Swimmers from "@/pages/swimmers";
import Squads from "@/pages/squads";
import Locations from "@/pages/locations";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/new-session" component={NewSession} />
          <Route path="/sessions/:id" component={SessionDetail} />
          <Route path="/coaches" component={Coaches} />
          <Route path="/swimmers" component={Swimmers} />
          <Route path="/squads" component={Squads} />
          <Route path="/locations" component={Locations} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
