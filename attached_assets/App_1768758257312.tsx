import { useState, useMemo, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { MonthCalendarView } from './components/MonthCalendarView';
import { DayCalendarView } from './components/DayCalendarView';
import { DayListView } from './components/DayListView';
import { SessionDetail } from './components/SessionDetail';
import { CompetitionDetail } from './components/CompetitionDetail';
import { AddSession } from './components/AddSession';
import { ManageCoaches } from './components/ManageCoaches';
import { ManageSquads } from './components/ManageSquads';
import { ManageSwimmers } from './components/ManageSwimmers';
import { ManageLocations } from './components/ManageLocations';
import { ManageCompetitions } from './components/ManageCompetitions';
import { SessionLibrary } from './components/SessionLibrary';
import { DrillsLibrary } from './components/DrillsLibrary';
import { InvoiceTracker } from './components/InvoiceTracker';
import { FeedbackAnalytics } from './components/FeedbackAnalytics';
import { Button } from './components/ui/button';
import { Switch } from './components/ui/switch';
import { Label } from './components/ui/label';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs';
import {
  Users,
  MapPin,
  UserCog,
  Plus,
  LogOut,
  Menu,
  User,
  CalendarDays,
  List,
  FileText,
  Target,
  Receipt,
  Trophy,
  BarChart3,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from './components/ui/sheet';
import { sessions, squads, locations, coaches, swimmers } from './lib/mockData';
import { sessionTemplates, drills, competitions, sessionFeedback } from './lib/mockDataExtensions';
import { Session, Competition } from './types';
import { cn } from './components/ui/utils';
import { Toaster } from './components/ui/sonner';

type View = 'month' | 'day';
type MobileView = 'calendar' | 'list';
type ManagementView = 'calendar' | 'coaches' | 'squads' | 'swimmers' | 'locations' | 'competitions' | 'addSession' | 'sessionLibrary' | 'drillsLibrary' | 'invoiceTracker' | 'feedbackAnalytics';

export default function App() {
  const [isAppLaunched, setIsAppLaunched] = useState(true); // Changed to true - app starts launched
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [autoLogin, setAutoLogin] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [view, setView] = useState<View>('month');
  const [mobileView, setMobileView] = useState<MobileView>('calendar');
  const [managementView, setManagementView] = useState<ManagementView>('calendar');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showMySessionsOnly, setShowMySessionsOnly] = useState(false);
  const [sessionsList, setSessionsList] = useState<Session[]>(sessions);
  
  // Mock current logged-in coach (in a real app, this would come from authentication)
  const currentCoachId = '1'; // Sarah Johnson
  const currentCoach = coaches.find(c => c.id === currentCoachId);
  
  // Check for saved credentials on mount (only after app is launched)
  useEffect(() => {
    if (isAppLaunched) {
      const savedCredentials = localStorage.getItem('hartsc_credentials');
      if (savedCredentials) {
        setAutoLogin(true);
        // Auto-login after showing loading screen
        setTimeout(() => {
          setIsAuthenticated(true);
          setIsInitializing(false);
        }, 2000);
      } else {
        setIsInitializing(false);
      }
    }
  }, [isAppLaunched]);
  
  // Filter sessions based on toggle
  const filteredSessions = useMemo(() => {
    if (showMySessionsOnly) {
      return sessionsList.filter(session => 
        session.leadCoachId === currentCoachId || 
        session.secondCoachId === currentCoachId ||
        session.helperId === currentCoachId
      );
    }
    return sessionsList;
  }, [showMySessionsOnly, sessionsList]);
  
  // Filter competitions based on toggle
  const filteredCompetitions = useMemo(() => {
    if (showMySessionsOnly) {
      return competitions.filter(competition => 
        competition.coachAssignments.some(assignment => 
          assignment.coachId === currentCoachId
        )
      );
    }
    return competitions;
  }, [showMySessionsOnly]);
  
  const handleLogin = (email: string, password: string) => {
    // Save credentials to localStorage
    localStorage.setItem('hartsc_credentials', JSON.stringify({ email, password }));
    setIsAuthenticated(true);
    setIsInitializing(false);
  };

  const handleLogout = () => {
    // Clear saved credentials
    localStorage.removeItem('hartsc_credentials');
    setIsAuthenticated(false);
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
    setManagementView(viewType);
    setSidebarOpen(false);
  };
  
  const handleBackToCalendar = () => {
    setManagementView('calendar');
  };

  const handleSessionClick = (session: Session) => {
    setSelectedSession(session);
  };

  const handleBackFromSession = () => {
    setSelectedSession(null);
  };

  const handleAddSession = () => {
    setManagementView('addSession');
  };

  const handleSaveNewSession = (sessionData: Omit<Session, 'id'>) => {
    // Generate a new ID (in a real app, this would come from the backend)
    const newId = String(Math.max(...sessionsList.map(s => parseInt(s.id))) + 1);
    const newSession: Session = {
      ...sessionData,
      id: newId,
    };
    
    setSessionsList([...sessionsList, newSession]);
    setSelectedSession(newSession);
    setManagementView('calendar');
  };

  const handleCancelAddSession = () => {
    setManagementView('calendar');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b" style={{ borderBottomColor: '#4B9A4A' }}>
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
            onClick={() => handleManagementClick('feedbackAnalytics')}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Feedback Analytics
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => handleManagementClick('sessionLibrary')}
          >
            <FileText className="h-4 w-4 mr-2" />
            Session Library
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => handleManagementClick('drillsLibrary')}
          >
            <Target className="h-4 w-4 mr-2" />
            Drills Library
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => handleManagementClick('invoiceTracker')}
          >
            <Receipt className="h-4 w-4 mr-2" />
            Invoice Tracker
          </Button>
          
          <div className="my-2 h-px bg-border" />
          
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => handleManagementClick('coaches')}
          >
            <UserCog className="h-4 w-4 mr-2" />
            Manage Coaches
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => handleManagementClick('squads')}
          >
            <Users className="h-4 w-4 mr-2" />
            Manage Squads
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => handleManagementClick('swimmers')}
          >
            <Users className="h-4 w-4 mr-2" />
            Manage Swimmers
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => handleManagementClick('locations')}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Manage Locations
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => handleManagementClick('competitions')}
          >
            <Trophy className="h-4 w-4 mr-2" />
            Manage Competitions
          </Button>
        </div>
      </nav>

      <div className="p-4 border-t" style={{ borderTopColor: '#4B9A4A' }}>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Log out
        </Button>
      </div>
    </div>
  );

  // App content
  const appContent = (
    <>
      {!isAuthenticated ? (
        <LoginPage onLogin={handleLogin} autoLogin={autoLogin} />
      ) : (
        <div className="h-screen flex overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 border-r bg-card">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b bg-card p-4" style={{ borderBottomColor: '#4B9A4A' }}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Mobile Sidebar */}
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild className="lg:hidden">
                  <Button
                    variant="ghost"
                    size="icon"
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
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {managementView === 'calendar' && (
                <>
                  {/* My Sessions Toggle */}
                  <div 
                    className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors relative z-10"
                    onClick={() => setShowMySessionsOnly(!showMySessionsOnly)}
                  >
                    <Label htmlFor="my-sessions-toggle" className="text-xs sm:text-sm cursor-pointer whitespace-nowrap pointer-events-none">
                      My Sessions
                    </Label>
                    <Switch
                      id="my-sessions-toggle"
                      checked={showMySessionsOnly}
                      onCheckedChange={setShowMySessionsOnly}
                      className="pointer-events-none"
                    />
                  </div>
                  
                  {/* Add Session Button */}
                  <Button onClick={handleAddSession} size="default">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Session
                  </Button>
                </>
              )}
            </div>
          </div>
          
          {managementView === 'calendar' && (
            <div className="mt-3 flex items-center justify-between gap-4">
              {/* Mobile Calendar/List Toggle */}
              <div className="lg:hidden">
                <Tabs value={mobileView} onValueChange={(v) => setMobileView(v as MobileView)}>
                  <TabsList>
                    <TabsTrigger value="calendar" className="gap-1.5">
                      <CalendarDays className="h-4 w-4" />
                      <span className="hidden sm:inline">Calendar</span>
                    </TabsTrigger>
                    <TabsTrigger value="list" className="gap-1.5">
                      <List className="h-4 w-4" />
                      <span className="hidden sm:inline">List</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              
              {/* Session and Competition Count */}
              {showMySessionsOnly && (
                <div className="text-xs sm:text-sm text-muted-foreground ml-auto">
                  <span className="text-primary">
                    {filteredSessions.length} of {sessions.length} sessions
                    {filteredCompetitions.length > 0 && ` • ${filteredCompetitions.length} of ${competitions.length} competitions`}
                  </span>
                </div>
              )}
            </div>
          )}
        </header>

        {/* Main Content */}
        <main className={cn(
          "flex-1 overflow-auto",
          selectedSession || selectedCompetition ? "p-0" : "p-4 md:p-6"
        )}>
          {selectedCompetition ? (
            <CompetitionDetail
              competition={selectedCompetition}
              coaches={coaches}
              locations={locations}
              onClose={() => setSelectedCompetition(null)}
            />
          ) : selectedSession ? (
            <div className="h-full p-4 md:p-6">
              <SessionDetail
                session={selectedSession}
                squad={squads.find(s => s.id === selectedSession.squadId)!}
                location={locations.find(l => l.id === selectedSession.locationId)!}
                coaches={coaches}
                swimmers={swimmers}
                templates={sessionTemplates}
                drills={drills}
                feedbackData={sessionFeedback.filter(f => f.sessionId === selectedSession.id)}
                onBack={handleBackFromSession}
              />
            </div>
          ) : managementView === 'addSession' ? (
            <AddSession
              squads={squads}
              locations={locations}
              coaches={coaches}
              onSave={handleSaveNewSession}
              onCancel={handleCancelAddSession}
            />
          ) : managementView === 'sessionLibrary' ? (
            <SessionLibrary
              templates={sessionTemplates}
              coaches={coaches}
              currentCoachId={currentCoachId}
              onBack={handleBackToCalendar}
            />
          ) : managementView === 'drillsLibrary' ? (
            <DrillsLibrary
              drills={drills}
              coaches={coaches}
              currentCoachId={currentCoachId}
              onBack={handleBackToCalendar}
            />
          ) : managementView === 'invoiceTracker' ? (
            currentCoach && (
              <InvoiceTracker
                coach={currentCoach}
                sessions={sessionsList}
                squads={squads}
                onBack={handleBackToCalendar}
              />
            )
          ) : managementView === 'feedbackAnalytics' ? (
            currentCoach && (
              <FeedbackAnalytics
                coach={currentCoach}
                sessions={sessionsList}
                squads={squads}
                onBack={handleBackToCalendar}
              />
            )
          ) : managementView === 'coaches' ? (
            <ManageCoaches coaches={coaches} onBack={handleBackToCalendar} />
          ) : managementView === 'squads' ? (
            <ManageSquads squads={squads} coaches={coaches} onBack={handleBackToCalendar} />
          ) : managementView === 'swimmers' ? (
            <ManageSwimmers swimmers={swimmers} squads={squads} onBack={handleBackToCalendar} />
          ) : managementView === 'locations' ? (
            <ManageLocations locations={locations} onBack={handleBackToCalendar} />
          ) : managementView === 'competitions' ? (
            <ManageCompetitions onBack={handleBackToCalendar} />
          ) : view === 'month' ? (
            <>
              {/* Desktop and Mobile Calendar View */}
              <div className={mobileView === 'calendar' ? 'block' : 'hidden lg:block'}>
                <MonthCalendarView
                  sessions={filteredSessions}
                  squads={squads}
                  competitions={filteredCompetitions}
                  currentDate={currentDate}
                  onDateChange={setCurrentDate}
                  onDayClick={handleDayClick}
                  onCompetitionClick={(competition) => {
                    setSelectedCompetition(competition);
                  }}
                />
              </div>
              
              {/* Mobile List View */}
              <div className={mobileView === 'list' ? 'block lg:hidden' : 'hidden'}>
                <DayListView
                  sessions={filteredSessions}
                  squads={squads}
                  locations={locations}
                  coaches={coaches}
                  competitions={filteredCompetitions}
                  currentDate={currentDate}
                  onSessionClick={handleSessionClick}
                  onCompetitionClick={(competition) => {
                    setSelectedCompetition(competition);
                  }}
                />
              </div>
            </>
          ) : (
            selectedDate && (
              <DayCalendarView
                sessions={filteredSessions}
                squads={squads}
                locations={locations}
                competitions={filteredCompetitions}
                selectedDate={selectedDate}
                onBack={handleBackToMonth}
                onSessionClick={handleSessionClick}
                onCompetitionClick={(competition) => {
                  setSelectedCompetition(competition);
                }}
              />
            )
          )}
        </main>
      </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {appContent}
      <Toaster />
    </>
  );
}