import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import GuildView from "@/pages/GuildView";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Layout>
          <Dashboard />
        </Layout>
      </Route>
      <Route path="/guilds/:guildId">
        <Layout>
          <GuildView />
        </Layout>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [authenticated, setAuthenticated] = useState<boolean>(
    () => sessionStorage.getItem('astral_auth') === '1'
  );

  useEffect(() => {
    if (!authenticated) {
      sessionStorage.removeItem('astral_auth');
    }
  }, [authenticated]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {authenticated ? (
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        ) : (
          <Login onSuccess={() => setAuthenticated(true)} />
        )}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
