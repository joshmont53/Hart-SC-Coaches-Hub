import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { TrendingUp, Calendar, Clock, Waves, BarChart3, ChevronLeft } from 'lucide-react';
import { Button } from './ui/button';
import type { Swimmer, Session, Squad } from '@/lib/typeAdapters';
import type { Attendance } from '@shared/schema';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, getDay, startOfYear, isPast } from 'date-fns';

interface SwimmerProfilePageProps {
  swimmer: Swimmer;
  sessions: Session[];
  squads: Squad[];
  attendance: Attendance[];
  onBack: () => void;
}

export function SwimmerProfilePage({ swimmer, sessions, squads, attendance, onBack }: SwimmerProfilePageProps) {
  const squad = squads.find(s => s.id === swimmer.squadId);
  
  // Get swimmer's attendance records
  const swimmerAttendance = useMemo(() => {
    return attendance.filter(a => a.swimmerId === swimmer.id);
  }, [attendance, swimmer.id]);
  
  // Calculate attendance stats using real data
  const attendanceStats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    // Get all past sessions for this swimmer's squad
    const squadSessions = sessions.filter(s => s.squadId === swimmer.squadId && isPast(new Date(s.date)));
    
    // Count attended sessions (status = 'present', 'late', or 'very_late')
    const attendedRecords = swimmerAttendance.filter(a => 
      a.status === 'present' || a.status === 'late' || a.status === 'very_late'
    );
    
    const totalSessions = squadSessions.length;
    const attended = attendedRecords.length;
    
    // Punctuality stats
    const lateCount = swimmerAttendance.filter(a => a.status === 'late').length;
    const veryLateCount = swimmerAttendance.filter(a => a.status === 'very_late').length;
    const onTimeCount = swimmerAttendance.filter(a => a.status === 'present').length;
    const onTimePercentage = attended > 0 ? Math.round((onTimeCount / attended) * 100) : 100;
    
    // This week sessions
    const weekSessions = squadSessions.filter(s => 
      isWithinInterval(new Date(s.date), { start: weekStart, end: weekEnd })
    );
    const weekSessionIds = weekSessions.map(s => s.id);
    const weekAttended = swimmerAttendance.filter(a => 
      weekSessionIds.includes(a.sessionId) &&
      (a.status === 'present' || a.status === 'late' || a.status === 'very_late')
    ).length;
    
    // This month sessions
    const monthSessions = squadSessions.filter(s => 
      isWithinInterval(new Date(s.date), { start: monthStart, end: monthEnd })
    );
    const monthSessionIds = monthSessions.map(s => s.id);
    const monthAttended = swimmerAttendance.filter(a => 
      monthSessionIds.includes(a.sessionId) &&
      (a.status === 'present' || a.status === 'late' || a.status === 'very_late')
    ).length;
    
    return {
      overall: totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0,
      thisWeek: weekSessions.length > 0 ? Math.round((weekAttended / weekSessions.length) * 100) : 0,
      thisMonth: monthSessions.length > 0 ? Math.round((monthAttended / monthSessions.length) * 100) : 0,
      weekSessions: weekSessions.length,
      weekAttended,
      monthSessions: monthSessions.length,
      monthAttended,
      attended,
      onTimeCount,
      lateCount,
      veryLateCount,
      onTimePercentage
    };
  }, [swimmer, sessions, swimmerAttendance]);
  
  // Attendance by day of week
  const attendanceByDay = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const now = new Date();
    
    const dayStats = days.map((day, index) => {
      const dayIndex = index === 6 ? 0 : index + 1; // Adjust for getDay (0 = Sunday)
      
      // Get sessions for this day
      const daySessions = sessions.filter(s => 
        s.squadId === swimmer.squadId && 
        getDay(new Date(s.date)) === dayIndex &&
        isPast(new Date(s.date))
      );
      
      const daySessionIds = daySessions.map(s => s.id);
      
      // Count attendance for this day
      const dayAttended = swimmerAttendance.filter(a => 
        daySessionIds.includes(a.sessionId) &&
        (a.status === 'present' || a.status === 'late' || a.status === 'very_late')
      ).length;
      
      const percentage = daySessions.length > 0 ? Math.round((dayAttended / daySessions.length) * 100) : 0;
      
      return { day, percentage, total: daySessions.length };
    });
    
    return dayStats;
  }, [swimmer, sessions, swimmerAttendance]);
  
  // Attendance by month (last 6 months)
  const attendanceByMonth = useMemo(() => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStartDate = startOfMonth(date);
      const monthEndDate = endOfMonth(date);
      
      const monthSessions = sessions.filter(s => 
        s.squadId === swimmer.squadId &&
        isWithinInterval(new Date(s.date), { start: monthStartDate, end: monthEndDate }) &&
        isPast(new Date(s.date))
      );
      
      const monthSessionIds = monthSessions.map(s => s.id);
      
      const monthAttended = swimmerAttendance.filter(a => 
        monthSessionIds.includes(a.sessionId) &&
        (a.status === 'present' || a.status === 'late' || a.status === 'very_late')
      ).length;
      
      const percentage = monthSessions.length > 0 ? Math.round((monthAttended / monthSessions.length) * 100) : 0;
      
      months.push({
        name: format(date, 'MMM'),
        percentage,
        total: monthSessions.length
      });
    }
    
    return months;
  }, [swimmer, sessions, swimmerAttendance]);
  
  // Distance stats using real session data
  const distanceStats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const yearStart = startOfYear(now);
    
    // Get sessions this swimmer attended
    const attendedSessionIds = swimmerAttendance
      .filter(a => a.status === 'present' || a.status === 'late' || a.status === 'very_late')
      .map(a => a.sessionId);
    
    const attendedSessions = sessions.filter(s => attendedSessionIds.includes(s.id));
    
    // Calculate total distance from each session's distance breakdown
    const calculateSessionDistance = (session: Session): number => {
      if (!session.distanceBreakdown) return 0;
      // Use the total field which is already calculated
      return session.distanceBreakdown.total || 0;
    };
    
    // This week distance
    const weekSessions = attendedSessions.filter(s => 
      isWithinInterval(new Date(s.date), { start: weekStart, end: weekEnd })
    );
    const thisWeek = weekSessions.reduce((sum, s) => sum + calculateSessionDistance(s), 0) / 1000;
    
    // This month distance
    const monthSessions = attendedSessions.filter(s => 
      isWithinInterval(new Date(s.date), { start: monthStart, end: monthEnd })
    );
    const thisMonth = monthSessions.reduce((sum, s) => sum + calculateSessionDistance(s), 0) / 1000;
    
    // This year distance
    const yearSessions = attendedSessions.filter(s => 
      isWithinInterval(new Date(s.date), { start: yearStart, end: now })
    );
    const thisYear = yearSessions.reduce((sum, s) => sum + calculateSessionDistance(s), 0) / 1000;
    
    return { thisWeek, thisMonth, thisYear };
  }, [swimmer, sessions, swimmerAttendance]);
  
  const initials = `${swimmer.firstName[0]}${swimmer.lastName[0]}`.toUpperCase();
  
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Compact Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="shrink-0"
          data-testid="button-back-profile"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Avatar className="h-12 w-12 shrink-0">
          <AvatarFallback 
            className="text-white font-bold"
            style={{ backgroundColor: '#4B9A4A' }}
          >
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate" data-testid="text-swimmer-name">
            {swimmer.firstName} {swimmer.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {squad?.name} • {format(new Date(swimmer.dateOfBirth), 'dd/MM/yyyy')}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs">This Week</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-week-attendance">
                  {attendanceStats.thisWeek}%
                </p>
                <p className="text-blue-100 text-xs">
                  {attendanceStats.weekAttended}/{attendanceStats.weekSessions} sessions
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs">This Month</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-month-attendance">
                  {attendanceStats.thisMonth}%
                </p>
                <p className="text-green-100 text-xs">
                  {attendanceStats.monthAttended}/{attendanceStats.monthSessions} sessions
                </p>
              </div>
              <Calendar className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-xs">Overall</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-overall-attendance">
                  {attendanceStats.overall}%
                </p>
                <p className="text-purple-100 text-xs">Attendance Rate</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Punctuality Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" style={{ color: '#4B9A4A' }} />
            Punctuality
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-lg border border-green-500/20">
              <p className="text-3xl font-bold" style={{ color: '#4B9A4A' }} data-testid="text-ontime-percentage">
                {attendanceStats.onTimePercentage}%
              </p>
              <p className="text-sm text-muted-foreground mt-1">On Time</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {attendanceStats.onTimeCount} of {attendanceStats.attended} sessions
              </p>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-gradient-to-br from-amber-500/10 to-amber-600/10 rounded-lg border border-amber-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Late</p>
                    <p className="text-2xl font-bold text-amber-600" data-testid="text-late-count">
                      {attendanceStats.lateCount}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {attendanceStats.attended > 0 ? Math.round((attendanceStats.lateCount / attendanceStats.attended) * 100) : 0}%
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-gradient-to-br from-red-500/10 to-red-600/10 rounded-lg border border-red-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Very Late</p>
                    <p className="text-2xl font-bold text-red-600" data-testid="text-verylate-count">
                      {attendanceStats.veryLateCount}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {attendanceStats.attended > 0 ? Math.round((attendanceStats.veryLateCount / attendanceStats.attended) * 100) : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Distance Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Waves className="h-5 w-5" style={{ color: '#4B9A4A' }} />
            Distance Covered
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold" style={{ color: '#4B9A4A' }} data-testid="text-week-distance">
                {distanceStats.thisWeek.toFixed(1)}km
              </p>
              <p className="text-sm text-muted-foreground mt-1">This Week</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold" style={{ color: '#4B9A4A' }} data-testid="text-month-distance">
                {distanceStats.thisMonth.toFixed(1)}km
              </p>
              <p className="text-sm text-muted-foreground mt-1">This Month</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold" style={{ color: '#4B9A4A' }} data-testid="text-year-distance">
                {distanceStats.thisYear.toFixed(1)}km
              </p>
              <p className="text-sm text-muted-foreground mt-1">This Year</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Attendance by Day of Week */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" style={{ color: '#4B9A4A' }} />
            Attendance by Day of Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {attendanceByDay.map(({ day, percentage, total }) => (
              <div key={day}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">{day}</span>
                  <span className="text-muted-foreground">
                    {percentage}% ({total} sessions)
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: '#4B9A4A'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Attendance by Month */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" style={{ color: '#4B9A4A' }} />
            Attendance Trend (Last 6 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-2 h-48">
            {attendanceByMonth.map(({ name, percentage, total }) => (
              <div key={name} className="flex-1 flex flex-col items-center gap-2">
                <div className="text-xs text-muted-foreground text-center">
                  {percentage}%
                </div>
                <div className="w-full bg-muted rounded-t-lg relative flex-1 flex items-end">
                  <div 
                    className="w-full rounded-t-lg transition-all duration-500"
                    style={{ 
                      height: `${percentage}%`,
                      backgroundColor: '#4B9A4A'
                    }}
                  />
                </div>
                <div className="text-sm font-medium">{name}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
