import { useState, useMemo } from 'react';
import { MonthCalendarView } from './components/MonthCalendarView';
import { DayCalendarView } from './components/DayCalendarView';
import { DayListView } from './components/DayListView';
import { SessionDetail } from './components/SessionDetail';
import { AddSession } from './components/AddSession';
import { ManageCoaches } from './components/ManageCoaches';
import { ManageSquads } from './components/ManageSquads';
import { ManageSwimmers } from './components/ManageSwimmers';
import { ManageLocations } from './components/ManageLocations';
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
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from './components/ui/sheet';
import { sessions, squads, locations, coaches, swimmers } from './lib/mockData';
import { Session } from './types';
import { cn } from './components/ui/utils';

type View = 'month' | 'day';
type MobileView = 'calendar' | 'list';
type ManagementView = 'calendar' | 'coaches' | 'squads' | 'swimmers' | 'locations' | 'addSession';

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [view, setView] = useState<View>('month');
  const [mobileView, setMobileView] = useState<MobileView>('calendar');
  const [managementView, setManagementView] = useState<ManagementView>('calendar');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showMySessionsOnly, setShowMySessionsOnly] = useState(false);
  const [sessionsList, setSessionsList] = useState<Session[]>(sessions);
  
  // Mock current logged-in coach (in a real app, this would come from authentication)
  const currentCoachId = '1'; // Sarah Johnson
  const currentCoach = coaches.find(c => c.id === currentCoachId);
  
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
  
  const handleLogout = () => {
    alert('Logging out...');
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

  return (
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
              <div className="flex items-center gap-2">
                <h1 className="hidden sm:inline">Session Calendar</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {managementView === 'calendar' && (
                <>
                  {/* My Sessions Toggle */}
                  <div className="flex items-center gap-2 px-2 sm:px-3 py-1 rounded-lg bg-muted/50">
                    <Label htmlFor="my-sessions-toggle" className="text-xs sm:text-sm cursor-pointer whitespace-nowrap">
                      My Sessions
                    </Label>
                    <Switch
                      id="my-sessions-toggle"
                      checked={showMySessionsOnly}
                      onCheckedChange={setShowMySessionsOnly}
                    />
                  </div>
                  
                  {/* Add Session Button */}
                  <Button onClick={handleAddSession} size="default">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Session
                  </Button>
                </>
              )}
              
              {/* Log out button - Desktop only */}
              <Button variant="outline" onClick={handleLogout} className="hidden lg:flex">
                <LogOut className="h-4 w-4 mr-2" />
                Log out
              </Button>
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
              
              {/* Session Count */}
              {showMySessionsOnly && (
                <div className="text-xs sm:text-sm text-muted-foreground ml-auto">
                  <span className="text-primary">
                    {filteredSessions.length} of {sessions.length} sessions
                  </span>
                </div>
              )}
            </div>
          )}
        </header>

        {/* Main Content */}
        <main className={cn(
          "flex-1 overflow-auto",
          selectedSession ? "p-0" : "p-4 md:p-6"
        )}>
          {selectedSession ? (
            <div className="h-full p-4 md:p-6">
              <SessionDetail
                session={selectedSession}
                squad={squads.find(s => s.id === selectedSession.squadId)!}
                location={locations.find(l => l.id === selectedSession.locationId)!}
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
              onSave={handleSaveNewSession}
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
          ) : view === 'month' ? (
            <>
              {/* Desktop and Mobile Calendar View */}
              <div className={mobileView === 'calendar' ? 'block' : 'hidden lg:block'}>
                <MonthCalendarView
                  sessions={filteredSessions}
                  squads={squads}
                  currentDate={currentDate}
                  onDateChange={setCurrentDate}
                  onDayClick={handleDayClick}
                />
              </div>
              
              {/* Mobile List View */}
              <div className={mobileView === 'list' ? 'block lg:hidden' : 'hidden'}>
                <DayListView
                  sessions={filteredSessions}
                  squads={squads}
                  locations={locations}
                  coaches={coaches}
                  currentDate={currentDate}
                  onSessionClick={handleSessionClick}
                />
              </div>
            </>
          ) : (
            selectedDate && (
              <DayCalendarView
                sessions={filteredSessions}
                squads={squads}
                locations={locations}
                selectedDate={selectedDate}
                onBack={handleBackToMonth}
                onSessionClick={handleSessionClick}
              />
            )
          )}
        </main>
      </div>
    </div>
  );
}
