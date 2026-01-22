import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { TrendingUp, Calendar, Clock, Waves, BarChart3, ChevronLeft } from 'lucide-react';
import { Swimmer, Session, Squad } from '../types';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, getDay, startOfYear } from 'date-fns';
import { Button } from './ui/button';

interface SwimmerProfilePageProps {
  swimmer: Swimmer;
  sessions: Session[];
  squads: Squad[];
  onBack: () => void;
}

export function SwimmerProfilePage({ swimmer, sessions, squads, onBack }: SwimmerProfilePageProps) {
  const squad = squads.find(s => s.id === swimmer.squadId);
  
  // Calculate attendance stats
  const attendanceStats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    // Get all past sessions for this swimmer's squad
    const squadSessions = sessions.filter(s => s.squadId === swimmer.squadId && new Date(s.date) < now);
    
    // Mock attendance data (in real app, would come from actual attendance records)
    const totalSessions = squadSessions.length;
    const attended = Math.floor(totalSessions * (0.85 + Math.random() * 0.1)); // 85-95% attendance
    
    // Mock late/very late data
    const lateCount = Math.floor(attended * (Math.random() * 0.12)); // 0-12% of attended
    const veryLateCount = Math.floor(attended * (Math.random() * 0.06)); // 0-6% of attended
    const onTimeCount = attended - lateCount - veryLateCount;
    const onTimePercentage = attended > 0 ? Math.round((onTimeCount / attended) * 100) : 100;
    
    const weekSessions = squadSessions.filter(s => 
      isWithinInterval(new Date(s.date), { start: weekStart, end: weekEnd })
    );
    const weekAttended = Math.floor(weekSessions.length * 0.9);
    
    const monthSessions = squadSessions.filter(s => 
      isWithinInterval(new Date(s.date), { start: monthStart, end: monthEnd })
    );
    const monthAttended = Math.floor(monthSessions.length * 0.87);
    
    return {
      overall: totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0,
      thisWeek: weekSessions.length > 0 ? Math.round((weekAttended / weekSessions.length) * 100) : 0,
      thisMonth: monthSessions.length > 0 ? Math.round((monthAttended / monthSessions.length) * 100) : 0,
      weekSessions: weekSessions.length,
      weekAttended,
      monthSessions: monthSessions.length,
      monthAttended,
      // Punctuality stats
      attended,
      onTimeCount,
      lateCount,
      veryLateCount,
      onTimePercentage
    };
  }, [swimmer, sessions]);
  
  // Attendance by day of week
  const attendanceByDay = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayStats = days.map((day, index) => {
      const dayIndex = index === 6 ? 0 : index + 1; // Adjust for getDay (0 = Sunday)
      const daySessions = sessions.filter(s => 
        s.squadId === swimmer.squadId && 
        getDay(new Date(s.date)) === dayIndex &&
        new Date(s.date) < new Date()
      );
      
      // Mock attendance for each day
      const attended = Math.floor(daySessions.length * (0.8 + Math.random() * 0.15));
      const percentage = daySessions.length > 0 ? Math.round((attended / daySessions.length) * 100) : 0;
      
      return { day, percentage, total: daySessions.length };
    });
    
    return dayStats;
  }, [swimmer, sessions]);
  
  // Attendance by month (last 6 months)
  const attendanceByMonth = useMemo(() => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
      const monthSessions = sessions.filter(s => 
        s.squadId === swimmer.squadId &&
        isWithinInterval(new Date(s.date), { start: monthStart, end: monthEnd }) &&
        new Date(s.date) < now
      );
      
      const attended = Math.floor(monthSessions.length * (0.82 + Math.random() * 0.13));
      const percentage = monthSessions.length > 0 ? Math.round((attended / monthSessions.length) * 100) : 0;
      
      months.push({
        name: format(date, 'MMM'),
        percentage,
        total: monthSessions.length
      });
    }
    
    return months;
  }, [swimmer, sessions]);
  
  // Distance stats (mock data)
  const distanceStats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const yearStart = startOfYear(now);
    
    const weekSessions = sessions.filter(s => 
      s.squadId === swimmer.squadId &&
      isWithinInterval(new Date(s.date), { start: weekStart, end: weekEnd }) &&
      new Date(s.date) < now
    );
    
    const monthSessions = sessions.filter(s => 
      s.squadId === swimmer.squadId &&
      isWithinInterval(new Date(s.date), { start: monthStart, end: monthEnd }) &&
      new Date(s.date) < now
    );
    
    const yearSessions = sessions.filter(s => 
      s.squadId === swimmer.squadId &&
      isWithinInterval(new Date(s.date), { start: yearStart, end: now })
    );
    
    // Mock distances (avg 3.5km per session)
    return {
      thisWeek: weekSessions.length * 3.5,
      thisMonth: monthSessions.length * 3.5,
      thisYear: yearSessions.length * 3.5
    };
  }, [swimmer, sessions]);
  
  const initials = `${swimmer.firstName[0]}${swimmer.lastName[0]}`.toUpperCase();
  
  return (
    <div className="space-y-6">
      {/* Compact Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="shrink-0"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shrink-0"
          style={{ backgroundColor: '#4B9A4A' }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{swimmer.firstName} {swimmer.lastName}</h1>
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
                <p className="text-2xl font-bold mt-1">{attendanceStats.thisWeek}%</p>
                <p className="text-blue-100 text-xs">{attendanceStats.weekAttended}/{attendanceStats.weekSessions} sessions</p>
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
                <p className="text-2xl font-bold mt-1">{attendanceStats.thisMonth}%</p>
                <p className="text-green-100 text-xs">{attendanceStats.monthAttended}/{attendanceStats.monthSessions} sessions</p>
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
                <p className="text-2xl font-bold mt-1">{attendanceStats.overall}%</p>
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
              <p className="text-3xl font-bold" style={{ color: '#4B9A4A' }}>
                {attendanceStats.onTimePercentage}%
              </p>
              <p className="text-sm text-muted-foreground mt-1">On Time</p>
              <p className="text-xs text-muted-foreground mt-0.5">{attendanceStats.onTimeCount} of {attendanceStats.attended} sessions</p>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-gradient-to-br from-amber-500/10 to-amber-600/10 rounded-lg border border-amber-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Late</p>
                    <p className="text-2xl font-bold text-amber-600">{attendanceStats.lateCount}</p>
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
                    <p className="text-2xl font-bold text-red-600">{attendanceStats.veryLateCount}</p>
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
              <p className="text-2xl font-bold" style={{ color: '#4B9A4A' }}>
                {distanceStats.thisWeek.toFixed(1)}km
              </p>
              <p className="text-sm text-muted-foreground mt-1">This Week</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold" style={{ color: '#4B9A4A' }}>
                {distanceStats.thisMonth.toFixed(1)}km
              </p>
              <p className="text-sm text-muted-foreground mt-1">This Month</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold" style={{ color: '#4B9A4A' }}>
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