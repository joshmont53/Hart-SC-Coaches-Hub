import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  CalendarDays, 
  TrendingUp, 
  TrendingDown,
  Droplet, 
  Clock,
  AlertCircle,
  Award,
  Activity,
  Waves,
  ChevronDown,
  ChevronUp,
  Filter,
  Users,
  X,
  Plus,
  Trophy,
  MapPin
} from 'lucide-react';
import { Coach, Session, Squad, Swimmer, Competition, Location } from '../types';
import { format, isToday, isPast, isFuture, startOfWeek, endOfWeek, isWithinInterval, startOfDay, endOfDay, addMonths, isBefore } from 'date-fns';
import { sessionFeedback, competitions } from '../lib/mockDataExtensions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";

interface HomePageProps {
  coach: Coach;
  sessions: Session[];
  squads: Squad[];
  swimmers: Swimmer[];
  locations: Location[];
  onNavigateToSession: (session: Session) => void;
  onNavigateToCalendar: () => void;
  onNavigateToSwimmerProfile: (swimmer: Swimmer) => void;
}

export function HomePage({ 
  coach, 
  sessions, 
  squads, 
  swimmers,
  locations,
  onNavigateToSession,
  onNavigateToCalendar,
  onNavigateToSwimmerProfile
}: HomePageProps) {
  // Individual card filters
  const [distanceSquadFilter, setDistanceSquadFilter] = useState<string>('');
  const [attendanceSquadFilter, setAttendanceSquadFilter] = useState<string | string[]>('primary'); // 'primary' | 'all' | squad ID | squad IDs array
  const [showAllSwimmers, setShowAllSwimmers] = useState(false);

  // Find squads where this coach is primary
  const primarySquads = useMemo(() => {
    return squads.filter(squad => squad.primaryCoachId === coach.id);
  }, [squads, coach.id]);
  
  // Non-primary squads
  const nonPrimarySquads = useMemo(() => {
    return squads.filter(squad => squad.primaryCoachId !== coach.id);
  }, [squads, coach.id]);
  
  // Find all squads where coach is involved
  const allCoachSquads = useMemo(() => {
    const coachSessions = sessions.filter(session => 
      session.leadCoachId === coach.id || 
      session.secondCoachId === coach.id || 
      session.helperId === coach.id
    );
    const squadIds = [...new Set(coachSessions.map(s => s.squadId))];
    return squads.filter(s => squadIds.includes(s.id));
  }, [sessions, squads, coach.id]);
  
  // Initialize default filters
  React.useEffect(() => {
    // Distance filter: single squad select - default to first primary squad if exists
    if (distanceSquadFilter === '') {
      if (primarySquads.length > 0) {
        setDistanceSquadFilter(primarySquads[0].id);
      } else if (squads.length > 0) {
        setDistanceSquadFilter(squads[0].id);
      }
    }
  }, [primarySquads, squads, distanceSquadFilter]);
  
  // Get actual squad IDs for attendance filter
  const attendanceSquadIds = useMemo(() => {
    if (attendanceSquadFilter === 'primary') {
      return primarySquads.map(s => s.id);
    } else if (attendanceSquadFilter === 'all') {
      return squads.map(s => s.id);
    } else if (Array.isArray(attendanceSquadFilter)) {
      return attendanceSquadFilter;
    } else {
      return [attendanceSquadFilter];
    }
  }, [attendanceSquadFilter, primarySquads, squads]);

  // Find all sessions for coach (no filter - for action required and upcoming)
  const coachSessions = useMemo(() => {
    return sessions.filter(session => 
      session.leadCoachId === coach.id || 
      session.secondCoachId === coach.id || 
      session.helperId === coach.id
    );
  }, [sessions, coach.id]);

  // Find incomplete sessions (past or today, where coach is lead)
  const incompleteSessions = useMemo(() => {
    return coachSessions.filter(session => {
      const sessionDate = new Date(session.date);
      const isPastOrToday = isPast(sessionDate) || isToday(sessionDate);
      const isLead = session.leadCoachId === coach.id;
      const hasFeedback = sessionFeedback.some(f => f.sessionId === session.id);
      
      // Check if it's missing attendance (mock - in real app would check actual data)
      const missingAttendance = isPastOrToday && Math.random() > 0.7; // 30% chance
      
      return isPastOrToday && isLead && (!hasFeedback || missingAttendance);
    }).slice(0, 3).map(session => {
      const hasFeedback = sessionFeedback.some(f => f.sessionId === session.id);
      const missingAttendance = Math.random() > 0.7;
      
      return {
        session,
        missingFeedback: !hasFeedback,
        missingAttendance: missingAttendance
      };
    });
  }, [coachSessions, coach.id]);

  // This week's sessions (upcoming) - no filter
  const thisWeekUpcomingSessions = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    
    return coachSessions
      .filter(session => {
        const sessionDate = new Date(session.date);
        return (isFuture(sessionDate) || isToday(sessionDate)) &&
               isWithinInterval(sessionDate, { start: weekStart, end: weekEnd });
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 4); // Show next 4
  }, [coachSessions]);
  
  // This week's sessions count for filtered squads (distance/attendance)
  const thisWeekSessionsForDistance = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    
    return coachSessions.filter(session => 
      isWithinInterval(new Date(session.date), { start: weekStart, end: weekEnd }) &&
      session.squadId === distanceSquadFilter
    );
  }, [coachSessions, distanceSquadFilter]);

  // Calculate swimmer stats for distance filter
  const thisWeekSwimmerStats = useMemo(() => {
    const weekSessions = thisWeekSessionsForDistance;
    
    // Mock distance calculations (in a real app, this would come from session data)
    const totalDistance = weekSessions.length * 3500; // Avg 3.5km per session
    const freestyle = Math.floor(totalDistance * 0.35);
    const backstroke = Math.floor(totalDistance * 0.2);
    const breaststroke = Math.floor(totalDistance * 0.15);
    const butterfly = Math.floor(totalDistance * 0.15);
    const no1 = Math.floor(totalDistance * 0.15);
    
    const swim = Math.floor(totalDistance * 0.5);
    const kick = Math.floor(totalDistance * 0.2);
    const drill = Math.floor(totalDistance * 0.2);
    const pull = Math.floor(totalDistance * 0.1);
    
    return {
      totalDistance,
      strokes: { freestyle, backstroke, breaststroke, butterfly, no1 },
      types: { swim, kick, drill, pull }
    };
  }, [thisWeekSessionsForDistance]);

  // Calculate attendance for filtered squads
  const swimmerAttendance = useMemo(() => {
    const squadSwimmers = swimmers.filter(s => attendanceSquadIds.includes(s.squadId));
    
    return squadSwimmers.map(swimmer => {
      const squadSessions = coachSessions.filter(s => 
        s.squadId === swimmer.squadId && 
        isPast(new Date(s.date))
      );
      
      // Mock attendance calculation with late/very late tracking
      const attended = Math.floor(squadSessions.length * (0.65 + Math.random() * 0.35)); // 65-100%
      const percentage = squadSessions.length > 0 ? Math.round((attended / squadSessions.length) * 100) : 0;
      
      // Mock late/very late data - ensure some swimmers have punctuality issues
      // Create a simple hash from swimmer name to ensure consistency
      const nameHash = (swimmer.firstName + swimmer.lastName).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      let lateCount = 0;
      let veryLateCount = 0;
      
      // Make swimmers with certain name hashes have late issues
      if (nameHash % 3 === 0 && attended > 0) {
        lateCount = Math.max(1, Math.floor(attended * (0.15 + Math.random() * 0.1))); // 15-25% late, at least 1
      }
      
      // Make swimmers with certain name hashes have very late issues
      if (nameHash % 5 === 0 && attended > 0) {
        veryLateCount = Math.max(1, Math.floor(attended * (0.08 + Math.random() * 0.07))); // 8-15% very late, at least 1
      }
      
      return {
        swimmer,
        percentage,
        attended,
        total: squadSessions.length,
        lateCount,
        veryLateCount
      };
    }).sort((a, b) => b.percentage - a.percentage);
  }, [attendanceSquadIds, swimmers, coachSessions]);
  
  const top3Swimmers = swimmerAttendance.slice(0, 3);
  const bottom3Swimmers = swimmerAttendance.slice(-3).reverse();
  const avgAttendance = swimmerAttendance.length > 0 
    ? Math.round(swimmerAttendance.reduce((acc, s) => acc + s.percentage, 0) / swimmerAttendance.length)
    : 0;

  // Upcoming competitions (within next month)
  const upcomingCompetitions = useMemo(() => {
    const now = new Date();
    const nextMonth = addMonths(now, 1);
    
    return competitions.filter(comp => {
      const compStart = new Date(comp.startDate);
      return isBefore(now, compStart) && isBefore(compStart, nextMonth) &&
             comp.coachAssignments.some(a => a.coachId === coach.id);
    }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 3);
  }, [coach.id]);

  // Total coaching stats
  const totalStats = useMemo(() => {
    const totalSessions = coachSessions.filter(s => isPast(new Date(s.date))).length;
    
    return {
      totalSessions,
      thisWeekSessions: thisWeekUpcomingSessions.length,
      incompleteTasks: incompleteSessions.length
    };
  }, [coachSessions, thisWeekUpcomingSessions, incompleteSessions]);

  return (
    <>
      <div className="space-y-4">
        {/* Welcome Header */}
        <div className="px-0">
          <h1 className="text-3xl font-bold">Welcome back, {coach.firstName}!</h1>
          <p className="text-muted-foreground mt-1">
            Here's your coaching overview for {format(new Date(), 'EEEE, MMMM d')}
          </p>
        </div>

        {/* Incomplete Sessions Alert */}
        {incompleteSessions.length > 0 && (
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-lg">Action Required</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-2">
                {incompleteSessions.length} session{incompleteSessions.length !== 1 ? 's' : ''} need attention
              </p>
              <div className="space-y-1.5">
                {incompleteSessions.map(({ session, missingFeedback, missingAttendance }) => {
                  const squad = squads.find(s => s.id === session.squadId);
                  
                  return (
                    <div 
                      key={session.id}
                      className="flex items-center justify-between p-2 bg-white rounded-lg border border-orange-100 hover:border-orange-300 transition-colors cursor-pointer"
                      onClick={() => onNavigateToSession(session)}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <CalendarDays className="h-3.5 w-3.5 text-orange-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{squad?.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(session.date, 'MMM d')} • {session.startTime}
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="ml-2 text-xs h-7">Complete</Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Upcoming This Week - Card format */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" style={{ color: '#4B9A4A' }} />
                  Upcoming This Week
                </CardTitle>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-7 w-7 p-0"
                  onClick={onNavigateToCalendar}
                  title="Add session"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {thisWeekUpcomingSessions.length > 0 ? (
                <div className="space-y-2">
                  {thisWeekUpcomingSessions.map(session => {
                    const squad = squads.find(s => s.id === session.squadId);
                    const sessionDate = new Date(session.date);
                    const isSessionToday = isToday(sessionDate);
                    
                    return (
                      <div 
                        key={session.id}
                        className="p-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => onNavigateToSession(session)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{squad?.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {isSessionToday ? 'Today' : format(sessionDate, 'EEE, MMM d')} • {session.startTime}
                            </div>
                          </div>
                          {isSessionToday && (
                            <Badge 
                              style={{ backgroundColor: '#4B9A4A20', color: '#4B9A4A' }}
                              className="text-xs ml-2"
                            >
                              Today
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming sessions this week</p>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-3"
                onClick={onNavigateToCalendar}
              >
                View Calendar
              </Button>
            </CardContent>
          </Card>

          {/* Attendance Rate - with multi-select filter */}
          <Card 
            className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setShowAllSwimmers(true)}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-green-100 text-sm">Attendance Rate</p>
                  <p className="text-3xl font-bold mt-1">{avgAttendance}%</p>
                  <p className="text-green-100 text-xs mt-1">Squad Average</p>
                </div>
                <TrendingUp className="h-10 w-10 text-green-200" />
              </div>
              
              {/* Squad filter - multi-select */}
              <div className="mb-3" onClick={(e) => e.stopPropagation()}>
                <Select 
                  value={typeof attendanceSquadFilter === 'string' ? attendanceSquadFilter : 'multiple'}
                  onValueChange={(value) => setAttendanceSquadFilter(value)}
                >
                  <SelectTrigger className="h-7 text-xs bg-white/20 border-white/30 text-white">
                    <SelectValue>
                      {attendanceSquadFilter === 'primary' 
                        ? 'Primary Squads'
                        : attendanceSquadFilter === 'all'
                        ? 'All Squads'
                        : typeof attendanceSquadFilter === 'string'
                        ? squads.find(s => s.id === attendanceSquadFilter)?.name
                        : `${(attendanceSquadFilter as string[]).length} Squads`
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {primarySquads.length > 0 && (
                      <SelectItem value="primary">Primary Squads</SelectItem>
                    )}
                    {primarySquads.map(squad => (
                      <SelectItem key={squad.id} value={squad.id}>
                        {squad.name} (Primary)
                      </SelectItem>
                    ))}
                    <SelectItem value="all">All Squads</SelectItem>
                    {nonPrimarySquads.map(squad => (
                      <SelectItem key={squad.id} value={squad.id}>
                        {squad.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {swimmerAttendance.length > 0 && (
                <div className="pt-3 border-t border-green-400/30">
                  {/* Top 3 and Bottom 3 side by side */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Top 3 */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-green-100 mb-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>Top 3</span>
                      </div>
                      {top3Swimmers.map(({ swimmer, percentage }) => (
                        <div 
                          key={swimmer.id}
                          className="flex items-center justify-between text-xs p-1.5 rounded bg-white/10"
                        >
                          <span className="truncate text-white">{swimmer.firstName} {swimmer.lastName[0]}.</span>
                          <span className="text-xs font-semibold text-green-100 ml-1">{percentage}%</span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Bottom 3 */}
                    {bottom3Swimmers.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-green-100 mb-1">
                          <TrendingDown className="h-3 w-3" />
                          <span>Bottom 3</span>
                        </div>
                        {bottom3Swimmers.map(({ swimmer, percentage }) => (
                          <div 
                            key={swimmer.id}
                            className="flex items-center justify-between text-xs p-1.5 rounded bg-white/10"
                          >
                            <span className="truncate text-white">{swimmer.firstName} {swimmer.lastName[0]}.</span>
                            <span className="text-xs font-semibold text-orange-200 ml-1">{percentage}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Click to expand hint */}
                  <div className="text-xs text-center text-green-100 pt-3 flex items-center justify-center gap-1">
                    <span>Click to view all {swimmerAttendance.length} swimmers</span>
                    <ChevronDown className="h-3 w-3" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Total Distance - with single squad filter */}
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-emerald-100 text-sm">Total Distance</p>
                  <p className="text-3xl font-bold mt-1">
                    {(thisWeekSwimmerStats.totalDistance / 1000).toFixed(1)}km
                  </p>
                  <p className="text-emerald-100 text-xs mt-1">This Week</p>
                </div>
                <Waves className="h-10 w-10 text-emerald-200" />
              </div>
              
              {/* Squad filter - single select */}
              <div className="mb-3">
                <Select value={distanceSquadFilter} onValueChange={setDistanceSquadFilter}>
                  <SelectTrigger className="h-7 text-xs bg-white/20 border-white/30 text-white">
                    <SelectValue>
                      {squads.find(s => s.id === distanceSquadFilter)?.name || 'Select Squad'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {primarySquads.length > 0 && primarySquads.map(squad => (
                      <SelectItem key={squad.id} value={squad.id}>
                        {squad.name} (Primary)
                      </SelectItem>
                    ))}
                    {nonPrimarySquads.map(squad => (
                      <SelectItem key={squad.id} value={squad.id}>
                        {squad.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-emerald-400/30">
                <div>
                  <p className="text-emerald-200">Avg per session</p>
                  <p className="font-semibold">
                    {thisWeekSessionsForDistance.length > 0 
                      ? (thisWeekSwimmerStats.totalDistance / thisWeekSessionsForDistance.length / 1000).toFixed(1)
                      : 0}km
                  </p>
                </div>
                <div>
                  <p className="text-emerald-200">Sessions</p>
                  <p className="font-semibold">{thisWeekSessionsForDistance.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* This Week's Breakdown - uses same filter as Total Distance */}
        <Card className="bg-gradient-to-br from-teal-600 to-teal-700 text-white border-0">
          <CardHeader>
            <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="flex items-center gap-2">
                <Activity className="h-5 w-5 flex-shrink-0" />
                This Week's Training Breakdown
              </span>
              <span className="text-sm font-normal text-teal-100">
                ({squads.find(s => s.id === distanceSquadFilter)?.name})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* By Stroke */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Droplet className="h-4 w-4" />
                  By Stroke
                </h4>
                <div className="space-y-2">
                  {Object.entries(thisWeekSwimmerStats.strokes).map(([stroke, distance]) => (
                    <div key={stroke}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="capitalize">{stroke}</span>
                        <span className="font-medium">{(distance / 1000).toFixed(1)}km</span>
                      </div>
                      <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-white/80"
                          style={{ 
                            width: `${thisWeekSwimmerStats.totalDistance > 0 ? (distance / thisWeekSwimmerStats.totalDistance) * 100 : 0}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* By Type */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  By Type
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(thisWeekSwimmerStats.types).map(([type, distance]) => (
                    <div key={type} className="p-3 bg-white/10 rounded-lg">
                      <p className="text-xs text-teal-100 capitalize">{type}</p>
                      <p className="text-lg font-bold mt-1">{(distance / 1000).toFixed(1)}km</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Competitions */}
        {upcomingCompetitions.length > 0 && (
          <Card className="bg-gradient-to-br from-lime-500 to-lime-600 text-white border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Upcoming Competitions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {upcomingCompetitions.map(comp => {
                  const location = locations.find(l => l.id === comp.locationId);
                  const compStart = new Date(comp.startDate);
                  const compEnd = new Date(comp.endDate);
                  const isSameDay = format(compStart, 'yyyy-MM-dd') === format(compEnd, 'yyyy-MM-dd');
                  
                  return (
                    <div 
                      key={comp.id}
                      className="p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0 bg-white/40" 
                            />
                            <span className="truncate">{comp.name}</span>
                          </div>
                          <div className="text-xs text-lime-50 mt-1 flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {isSameDay 
                              ? format(compStart, 'EEE, MMM d, yyyy')
                              : `${format(compStart, 'MMM d')} - ${format(compEnd, 'MMM d, yyyy')}`
                            }
                          </div>
                          <div className="text-xs text-lime-50 mt-0.5 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {location?.name}
                          </div>
                        </div>
                        <Badge 
                          className="text-xs whitespace-nowrap bg-white/20 text-white border-white/30"
                        >
                          {Math.ceil((compStart.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Coaching Profile Stats - Smaller */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4" style={{ color: '#4B9A4A' }} />
              Your Coaching Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold" style={{ color: '#4B9A4A' }}>
                  {totalStats.totalSessions}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Sessions Led</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold" style={{ color: '#4B9A4A' }}>
                  {coach.level}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Level</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold" style={{ color: '#4B9A4A' }}>
                  {allCoachSquads.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Squads</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog for expanded swimmer list */}
      <Dialog open={showAllSwimmers} onOpenChange={setShowAllSwimmers}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" style={{ color: '#4B9A4A' }} />
              All Swimmers Attendance
            </DialogTitle>
            <DialogDescription>
              View attendance details for all swimmers in your filtered squads.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-6 pb-6">
            <div className="grid grid-cols-1 gap-2">
              {swimmerAttendance.map(({ swimmer, percentage, attended, total, lateCount, veryLateCount }) => {
                const squad = squads.find(s => s.id === swimmer.squadId);
                const hasPunctualityIssue = lateCount > 0 || veryLateCount > 0;
                
                return (
                  <div 
                    key={swimmer.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      onNavigateToSwimmerProfile(swimmer);
                      setShowAllSwimmers(false);
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate flex items-center gap-1.5">
                        <span className="truncate">{swimmer.firstName} {swimmer.lastName}</span>
                        {veryLateCount > 0 && (
                          <Badge 
                            variant="outline"
                            className="text-[10px] px-1 py-0 h-4"
                            style={{
                              backgroundColor: '#ef444410',
                              color: '#ef4444',
                              borderColor: '#ef444440'
                            }}
                          >
                            <Clock className="h-2.5 w-2.5" />
                          </Badge>
                        )}
                        {lateCount > 0 && veryLateCount === 0 && (
                          <Badge 
                            variant="outline"
                            className="text-[10px] px-1 py-0 h-4"
                            style={{
                              backgroundColor: '#f59e0b10',
                              color: '#f59e0b',
                              borderColor: '#f59e0b40'
                            }}
                          >
                            <Clock className="h-2.5 w-2.5" />
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{squad?.name}</div>
                    </div>
                    <div className="text-right ml-2">
                      <Badge 
                        variant="outline"
                        style={
                          percentage >= 90 ? {
                            backgroundColor: '#4B9A4A15',
                            color: '#4B9A4A',
                            borderColor: '#4B9A4A40'
                          } : percentage >= 75 ? {
                            backgroundColor: '#fbbf2415',
                            color: '#f59e0b',
                            borderColor: '#f59e0b40'
                          } : {
                            backgroundColor: '#ef444415',
                            color: '#ef4444',
                            borderColor: '#ef444440'
                          }
                        }
                        className="text-xs"
                      >
                        {percentage}%
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {attended}/{total}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}