import { useState, useEffect, useMemo } from 'react';
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient, apiRequest } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Route, Switch, useLocation } from "wouter";
import LoadingScreen from "@/components/LoadingScreen";
import LoginPage from "@/pages/login-page";
import RegistrationPage from "@/pages/registration-page";
import { MonthCalendarView } from '@/pages/month-calendar-view';
import { DayCalendarView } from '@/pages/day-calendar-view';
import { DayListView } from '@/pages/day-list-view';
import { SessionDetail } from '@/pages/session-detail-view';
import { AddSession } from '@/pages/add-session';
import { ManageCoaches } from '@/pages/manage-coaches';
import { ManageSquads } from '@/pages/manage-squads';
import { ManageSwimmers } from '@/pages/manage-swimmers';
import { ManageLocations } from '@/pages/manage-locations';
import { ManageInvitations } from '@/pages/manage-invitations';
import { ManageCompetitions } from '@/pages/manage-competitions';
import { CompetitionDetailModal } from '@/components/CompetitionDetailModal';
import { Button } from './components/ui/button';
import { Switch as ToggleSwitch } from './components/ui/switch';
import { Label } from './components/ui/label';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs';
import {
  Users,
  MapPin,
  UserCog,
  Plus,
  LogOut,
  Menu,
  CalendarDays,
  List,
  Mail,
  Trophy,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from './components/ui/sheet';
import { cn } from './lib/utils';
import type { Session, Squad, Location, Coach, Swimmer } from './lib/typeAdapters';
import { 
  adaptSession, 
  adaptSquad, 
  adaptLocation, 
  adaptCoach, 
  adaptSwimmer,
  adaptSessionToBackend
} from './lib/typeAdapters';
import type {
  SwimmingSession as BackendSession,
  Squad as BackendSquad,
  Location as BackendLocation,
  Coach as BackendCoach,
  Swimmer as BackendSwimmer,
  Competition,
  CompetitionCoaching,
} from '@shared/schema';

type View = 'month' | 'day';
type MobileView = 'calendar' | 'list';
type ManagementView = 'calendar' | 'coaches' | 'squads' | 'swimmers' | 'locations' | 'invitations' | 'competitions' | 'addSession';

// Landing page with loading screen logic - ONLY for "/" route
function LandingPage() {
  const [redirectAfterDelay, setRedirectAfterDelay] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Show loading screen for 2 seconds, then enable redirect
  useEffect(() => {
    const timer = setTimeout(() => {
      setRedirectAfterDelay(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // After 2s delay AND auth check completes, redirect based on auth status
  useEffect(() => {
    if (redirectAfterDelay && !isLoading) {
      if (isAuthenticated) {
        setLocation('/app');
      } else {
        setLocation('/login');
      }
    }
  }, [redirectAfterDelay, isLoading, isAuthenticated, setLocation]);

  // Always show loading screen (this component is ONLY rendered on "/" route)
  return <LoadingScreen />;
}

function CalendarApp() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null);
  const [view, setView] = useState<View>('month');
  const [mobileView, setMobileView] = useState<MobileView>('calendar');
  const [managementView, setManagementView] = useState<ManagementView>('calendar');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showMySessionsOnly, setShowMySessionsOnly] = useState(false);

  // Fetch all data from backend APIs
  const { data: backendSessions = [] } = useQuery<BackendSession[]>({ 
    queryKey: ['/api/sessions'],
  });
  
  const { data: backendSquads = [] } = useQuery<BackendSquad[]>({ 
    queryKey: ['/api/squads'],
  });
  
  const { data: backendLocations = [] } = useQuery<BackendLocation[]>({ 
    queryKey: ['/api/locations'],
  });
  
  const { data: backendCoaches = [] } = useQuery<BackendCoach[]>({ 
    queryKey: ['/api/coaches'],
  });
  
  const { data: backendSwimmers = [] } = useQuery<BackendSwimmer[]>({ 
    queryKey: ['/api/swimmers'],
  });

  // Fetch competitions
  const { data: competitions = [] } = useQuery<Competition[]>({ 
    queryKey: ['/api/competitions'],
  });

  // Fetch all competition coaching assignments
  const { data: competitionCoaching = [] } = useQuery<CompetitionCoaching[]>({ 
    queryKey: ['/api/competitions/coaching/all'],
  });

  // Adapt backend data to frontend types
  const sessions = useMemo(
    () => backendSessions.map(s => adaptSession(s)),
    [backendSessions]
  );
  
  const squads = useMemo(
    () => backendSquads.map(s => adaptSquad(s)),
    [backendSquads]
  );
  
  const locations = useMemo(
    () => backendLocations.map(l => adaptLocation(l)),
    [backendLocations]
  );
  
  const coaches = useMemo(
    () => backendCoaches.map(c => adaptCoach(c)),
    [backendCoaches]
  );
  
  const swimmers = useMemo(
    () => backendSwimmers.map(s => adaptSwimmer(s)),
    [backendSwimmers]
  );

  // Find current coach based on authenticated user
  const currentCoachId = coaches.find(c => c.userId === user?.id)?.id;
  
  const currentCoach = coaches.find(c => c.id === currentCoachId);
  
  // Filter sessions based on toggle
  const filteredSessions = useMemo(() => {
    if (showMySessionsOnly && currentCoachId) {
      return sessions.filter(session => 
        session.leadCoachId === currentCoachId || 
        session.secondCoachId === currentCoachId ||
        session.helperId === currentCoachId
      );
    }
    return sessions;
  }, [showMySessionsOnly, sessions, currentCoachId]);

  // Filter competitions based on toggle
  const filteredCompetitions = useMemo(() => {
    if (showMySessionsOnly && currentCoachId) {
      // Get all competition IDs where current coach has a coaching assignment
      const myCompetitionIds = new Set(
        competitionCoaching
          .filter(cc => cc.coachId === currentCoachId)
          .map(cc => cc.competitionId)
      );
      return competitions.filter(comp => myCompetitionIds.has(comp.id));
    }
    return competitions;
  }, [showMySessionsOnly, competitions, competitionCoaching, currentCoachId]);
  
  const handleLogout = async () => {
    try {
      // Call logout endpoint
      await apiRequest('POST', '/api/auth/logout', {});
      
      // Invalidate auth cache to trigger re-fetch
      queryClient.invalidateQueries({ queryKey: ['/api/auth/status'] });
      
      // Redirect to login page
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      // Even if the request fails, try to clear local state and redirect
      queryClient.invalidateQueries({ queryKey: ['/api/auth/status'] });
      window.location.href = '/login';
    }
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setView('day');
  };

  const handleBackToMonth = () => {
    setView('month');
    setSelectedDate(null);
  };

  const handleManagementClick = (viewType: ManagementView) => {
    setSelectedSessionId(null);
    setManagementView(viewType);
    setSidebarOpen(false);
  };
  
  const handleBackToCalendar = () => {
    setManagementView('calendar');
  };

  const handleSessionClick = (session: Session) => {
    setSelectedSessionId(session.id);
  };

  const handleBackFromSession = () => {
    setSelectedSessionId(null);
  };

  const handleCompetitionClick = (competition: Competition) => {
    setSelectedCompetitionId(competition.id);
  };

  const handleCloseCompetitionModal = () => {
    setSelectedCompetitionId(null);
  };

  const handleAddSession = () => {
    setManagementView('addSession');
  };

  const handleCancelAddSession = () => {
    setManagementView('calendar');
  };

  const createSessionMutation = useMutation({
    mutationFn: async (session: Omit<Session, 'id'>) => {
      const backendSession = adaptSessionToBackend(session);
      const response = await apiRequest('POST', '/api/sessions', backendSession);
      return response.json();
    },
    onSuccess: async (backendSession: BackendSession) => {
      // Refetch all data to ensure cache is up to date
      await queryClient.refetchQueries({ queryKey: ['/api/sessions'] });
      
      // Set the newly created session as selected
      setSelectedSessionId(backendSession.id);
      setManagementView('calendar');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create session.',
        variant: 'destructive',
      });
    },
  });

  const handleSaveSession = (session: Omit<Session, 'id'>) => {
    createSessionMutation.mutate(session);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b" style={{ borderBottomColor: '#4B9A4A' }}>
        <div className="flex items-center gap-2">
          <span>Hart SC Coaches Hub</span>
        </div>
        {currentCoach && (
          <div className="mt-3 text-sm text-muted-foreground">
            {currentCoach.name}
          </div>
        )}
      </div>

      <nav className="flex-1 p-4">
        <div className="space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => handleManagementClick('coaches')}
            data-testid="button-manage-coaches"
          >
            <UserCog className="h-4 w-4 mr-2" />
            Manage Coaches
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => handleManagementClick('squads')}
            data-testid="button-manage-squads"
          >
            <Users className="h-4 w-4 mr-2" />
            Manage Squads
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => handleManagementClick('swimmers')}
            data-testid="button-manage-swimmers"
          >
            <Users className="h-4 w-4 mr-2" />
            Manage Swimmers
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => handleManagementClick('locations')}
            data-testid="button-manage-locations"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Manage Locations
          </Button>
          {user?.role === 'admin' && (
            <>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleManagementClick('invitations')}
                data-testid="button-manage-invitations"
              >
                <Mail className="h-4 w-4 mr-2" />
                Coach Invitations
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleManagementClick('competitions')}
                data-testid="button-manage-competitions"
              >
                <Trophy className="h-4 w-4 mr-2" />
                Manage Competitions
              </Button>
            </>
          )}
        </div>
      </nav>

      <div className="p-4 border-t">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={handleLogout}
          data-testid="button-logout-sidebar"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Log out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <aside className="hidden lg:block w-64 border-r bg-card">
        <SidebarContent />
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-card p-4" style={{ borderBottom: '1px solid #4B9A4A' }}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild className="lg:hidden">
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid="button-sidebar-toggle"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                  <SheetDescription className="sr-only">Access management options for coaches, squads, swimmers, and locations</SheetDescription>
                  <SidebarContent />
                </SheetContent>
              </Sheet>
              <div className="flex items-center gap-2">
                <h1 className="hidden sm:inline" data-testid="text-app-title">Session Calendar</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {managementView === 'calendar' && (
                <>
                  <div className="flex items-center gap-2 px-2 sm:px-3 py-1 rounded-lg bg-muted/50">
                    <Label htmlFor="my-sessions-toggle" className="text-xs sm:text-sm cursor-pointer whitespace-nowrap">
                      My Sessions
                    </Label>
                    <ToggleSwitch
                      id="my-sessions-toggle"
                      checked={showMySessionsOnly}
                      onCheckedChange={setShowMySessionsOnly}
                      data-testid="switch-my-sessions"
                    />
                  </div>
                  
                  <Button onClick={handleAddSession} size="default" data-testid="button-add-session">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Session
                  </Button>
                </>
              )}
              
              <Button variant="outline" onClick={handleLogout} className="hidden lg:flex" data-testid="button-logout">
                <LogOut className="h-4 w-4 mr-2" />
                Log out
              </Button>
            </div>
          </div>
          
          {managementView === 'calendar' && (
            <div className="mt-3 flex items-center justify-between gap-4">
              <div className="lg:hidden">
                <Tabs value={mobileView} onValueChange={(v) => setMobileView(v as MobileView)}>
                  <TabsList>
                    <TabsTrigger value="calendar" className="gap-1.5" data-testid="tab-calendar">
                      <CalendarDays className="h-4 w-4" />
                      <span className="hidden sm:inline">Calendar</span>
                    </TabsTrigger>
                    <TabsTrigger value="list" className="gap-1.5" data-testid="tab-list">
                      <List className="h-4 w-4" />
                      <span className="hidden sm:inline">List</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          )}
        </header>

        <main className={cn(
          "flex-1 overflow-auto",
          selectedSessionId ? "p-0" : "p-4 md:p-6"
        )}>
          {selectedSessionId ? (
            <div className="h-full p-4 md:p-6">
              <SessionDetail
                sessionId={selectedSessionId}
                locations={locations}
                coaches={coaches}
                swimmers={swimmers}
                onBack={handleBackFromSession}
              />
            </div>
          ) : managementView === 'addSession' ? (
            <AddSession
              squads={squads}
              locations={locations}
              coaches={coaches}
              onSave={handleSaveSession}
              onCancel={handleCancelAddSession}
            />
          ) : managementView === 'coaches' ? (
            <ManageCoaches coaches={coaches} onBack={handleBackToCalendar} />
          ) : managementView === 'squads' ? (
            <ManageSquads squads={squads} coaches={coaches} onBack={handleBackToCalendar} />
          ) : managementView === 'swimmers' ? (
            <ManageSwimmers swimmers={swimmers} squads={squads} onBack={handleBackToCalendar} />
          ) : managementView === 'locations' ? (
            <ManageLocations locations={locations} onBack={handleBackToCalendar} />
          ) : managementView === 'invitations' ? (
            <ManageInvitations onBack={handleBackToCalendar} />
          ) : managementView === 'competitions' ? (
            <ManageCompetitions onBack={handleBackToCalendar} />
          ) : view === 'month' ? (
            <>
              <div className={mobileView === 'calendar' ? 'block' : 'hidden lg:block'}>
                <MonthCalendarView
                  sessions={filteredSessions}
                  competitions={filteredCompetitions}
                  competitionCoaching={competitionCoaching}
                  squads={squads}
                  currentDate={currentDate}
                  onDateChange={setCurrentDate}
                  onDayClick={handleDayClick}
                  onCompetitionClick={handleCompetitionClick}
                />
              </div>
              
              <div className={mobileView === 'list' ? 'block lg:hidden' : 'hidden'}>
                <DayListView
                  sessions={filteredSessions}
                  competitions={filteredCompetitions}
                  competitionCoaching={competitionCoaching}
                  squads={squads}
                  locations={locations}
                  coaches={coaches}
                  currentDate={currentDate}
                  onSessionClick={handleSessionClick}
                  onCompetitionClick={handleCompetitionClick}
                />
              </div>
            </>
          ) : (
            selectedDate && (
              <DayCalendarView
                sessions={filteredSessions}
                competitions={filteredCompetitions}
                competitionCoaching={competitionCoaching}
                squads={squads}
                locations={locations}
                selectedDate={selectedDate}
                onBack={handleBackToMonth}
                onSessionClick={handleSessionClick}
                onCompetitionClick={handleCompetitionClick}
              />
            )
          )}
        </main>
      </div>

      {/* Competition Detail Modal */}
      <CompetitionDetailModal
        competition={competitions.find(c => c.id === selectedCompetitionId) || null}
        competitionCoaching={competitionCoaching}
        locations={backendLocations}
        coaches={backendCoaches}
        open={!!selectedCompetitionId}
        onClose={handleCloseCompetitionModal}
      />
    </div>
  );
}

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isLoading, isAuthenticated, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      {/* Longer paths MUST come first to avoid "/" prefix matching */}
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegistrationPage} />
      <Route path="/app">
        <ProtectedRoute>
          <CalendarApp />
        </ProtectedRoute>
      </Route>
      {/* Root path at the end - only matches exact "/" */}
      <Route path="/" component={LandingPage} />
      {/* 404 fallback - no path prop means it matches anything not already matched */}
      <Route>
        <LandingPage />
      </Route>
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
