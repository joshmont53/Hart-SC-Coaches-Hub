import { Session, Squad, Location, Competition } from '../types';
import { Button } from './ui/button';
import { ChevronLeft, Trophy } from 'lucide-react';

interface DayCalendarViewProps {
  sessions: Session[];
  squads: Squad[];
  locations: Location[];
  competitions: Competition[];
  selectedDate: Date;
  onBack: () => void;
  onSessionClick?: (session: Session) => void;
  onCompetitionClick?: (competition: Competition) => void;
}

export function DayCalendarView({
  sessions,
  squads,
  locations,
  competitions,
  selectedDate,
  onBack,
  onSessionClick,
  onCompetitionClick,
}: DayCalendarViewProps) {
  const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = selectedDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const daySessions = sessions.filter((session) => {
    const sessionDate = new Date(session.date);
    return (
      sessionDate.getDate() === selectedDate.getDate() &&
      sessionDate.getMonth() === selectedDate.getMonth() &&
      sessionDate.getFullYear() === selectedDate.getFullYear()
    );
  });

  const dayCompetitions = competitions.filter((competition) => {
    const checkDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    const start = new Date(competition.startDate.getFullYear(), competition.startDate.getMonth(), competition.startDate.getDate());
    const end = new Date(competition.endDate.getFullYear(), competition.endDate.getMonth(), competition.endDate.getDate());
    return checkDate >= start && checkDate <= end;
  });

  const hours = Array.from({ length: 14 }, (_, i) => i + 6); // 6 AM to 7 PM

  const getSessionPosition = (session: Session) => {
    const [startHour, startMin] = session.startTime.split(':').map(Number);
    const [endHour, endMin] = session.endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const dayStartMinutes = 6 * 60; // 6 AM

    const top = ((startMinutes - dayStartMinutes) / 60) * 80; // 80px per hour
    const height = ((endMinutes - startMinutes) / 60) * 80;

    return { top, height };
  };

  const getSessionsForLocation = (locationId: string) => {
    return daySessions.filter((s) => s.locationId === locationId);
  };

  const getCompetitionsForLocation = (locationId: string) => {
    return dayCompetitions.filter((c) => c.locationId === locationId);
  };

  const getCompetitionPosition = (competition: Competition) => {
    // Find earliest and latest times from all coach assignments
    let earliestMinutes = Infinity;
    let latestMinutes = 0;

    competition.coachAssignments.forEach((assignment) => {
      assignment.timeBlocks.forEach((block) => {
        const startMinutes = timeToMinutes(block.startTime);
        const endMinutes = timeToMinutes(block.endTime);
        earliestMinutes = Math.min(earliestMinutes, startMinutes);
        latestMinutes = Math.max(latestMinutes, endMinutes);
      });
    });

    const dayStartMinutes = 6 * 60; // 6 AM
    const top = ((earliestMinutes - dayStartMinutes) / 60) * 80; // 80px per hour
    const height = ((latestMinutes - earliestMinutes) / 60) * 80;

    return { top, height };
  };

  // Convert time string to minutes since midnight
  const timeToMinutes = (timeStr: string): number => {
    const [hour, min] = timeStr.split(':').map(Number);
    return hour * 60 + min;
  };

  // Check if two sessions overlap
  const sessionsOverlap = (s1: Session, s2: Session): boolean => {
    const s1Start = timeToMinutes(s1.startTime);
    const s1End = timeToMinutes(s1.endTime);
    const s2Start = timeToMinutes(s2.startTime);
    const s2End = timeToMinutes(s2.endTime);
    
    return s1Start < s2End && s2Start < s1End;
  };

  // Assign columns to sessions to handle overlaps
  const assignColumns = (sessions: Session[]) => {
    if (sessions.length === 0) return [];

    // Sort by start time, then by end time (longer sessions first)
    const sorted = [...sessions].sort((a, b) => {
      const aStart = timeToMinutes(a.startTime);
      const bStart = timeToMinutes(b.startTime);
      if (aStart !== bStart) return aStart - bStart;
      
      const aEnd = timeToMinutes(a.endTime);
      const bEnd = timeToMinutes(b.endTime);
      return bEnd - bEnd; // Longer sessions first
    });

    // Assign each session to a column
    const columns: { session: Session; column: number; totalColumns: number }[] = [];
    
    sorted.forEach((session) => {
      // Find which columns are already occupied by overlapping sessions
      const overlappingSessions = columns.filter(({ session: s }) => 
        sessionsOverlap(session, s)
      );
      
      const occupiedColumns = new Set(overlappingSessions.map(s => s.column));
      
      // Find the first available column
      let column = 0;
      while (occupiedColumns.has(column)) {
        column++;
      }
      
      // Calculate total columns needed (max column + 1 among overlapping sessions)
      const maxColumn = overlappingSessions.length > 0 
        ? Math.max(...overlappingSessions.map(s => s.column), column)
        : column;
      const totalColumns = maxColumn + 1;
      
      columns.push({ session, column, totalColumns });
      
      // Update totalColumns for all overlapping sessions
      overlappingSessions.forEach(({ session: s }) => {
        const item = columns.find(c => c.session.id === s.id);
        if (item && item.totalColumns < totalColumns) {
          item.totalColumns = totalColumns;
        }
      });
    });

    return columns;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 mb-6 px-2">
        <Button onClick={onBack} variant="outline" size="icon">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2>{dayName}</h2>
          <p className="text-muted-foreground">{dateStr}</p>
        </div>
      </div>

      {daySessions.length === 0 && dayCompetitions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          No sessions or competitions scheduled for this day
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="flex gap-4">
            {/* Time column */}
            <div className="w-16 flex-shrink-0">
              {hours.map((hour) => (
                <div key={hour} className="h-20 border-b text-sm text-muted-foreground">
                  {hour.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Location columns */}
            <div className="flex-1 flex gap-4">
              {locations.map((location) => {
                const locationSessions = getSessionsForLocation(location.id);
                const locationCompetitions = getCompetitionsForLocation(location.id);
                if (locationSessions.length === 0 && locationCompetitions.length === 0) return null;

                return (
                  <div key={location.id} className="flex-1 min-w-48">
                    <div className="mb-2 p-2 bg-muted rounded-lg sticky top-0 z-10">
                      {location.name}
                    </div>
                    <div className="relative">
                      {hours.map((hour) => (
                        <div key={hour} className="h-20 border-b border-border/50" />
                      ))}

                      {/* Sessions and Competitions */}
                      <div className="absolute inset-0">
                        {assignColumns(locationSessions).map(({ session, column, totalColumns }) => {
                          const squad = squads.find((s) => s.id === session.squadId);
                          if (!squad) return null;

                          const { top, height } = getSessionPosition(session);
                          const widthPercent = 100 / totalColumns;
                          const leftPercent = (column / totalColumns) * 100;

                          return (
                            <div
                              key={session.id}
                              className="absolute p-2 rounded text-white text-sm overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border border-white/20"
                              style={{
                                backgroundColor: squad.color,
                                top: `${top}px`,
                                height: `${height}px`,
                                left: `${leftPercent}%`,
                                width: `${widthPercent}%`,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSessionClick?.(session);
                              }}
                            >
                              <div className="truncate">{squad.name}</div>
                              <div className="text-xs opacity-90 truncate">
                                {session.startTime} - {session.endTime}
                              </div>
                              {totalColumns <= 2 && (
                                <div className="text-xs opacity-90 truncate">{session.focus}</div>
                              )}
                            </div>
                          );
                        })}

                        {/* Competitions */}
                        {locationCompetitions.map((competition) => {
                          const { top, height } = getCompetitionPosition(competition);

                          return (
                            <div
                              key={competition.id}
                              className="absolute p-2 rounded text-sm overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                              style={{
                                background: `repeating-linear-gradient(
                                  -45deg,
                                  ${competition.color},
                                  ${competition.color} 20px,
                                  white 20px,
                                  white 40px
                                )`,
                                top: `${top}px`,
                                height: `${height}px`,
                                left: '0',
                                width: '100%',
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onCompetitionClick?.(competition);
                              }}
                            >
                              <div className="flex items-center gap-1.5 text-black">
                                <Trophy className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate font-medium">{competition.name}</span>
                              </div>
                              <div className="text-xs text-black/80 mt-1">
                                {competition.coachAssignments.length} coach{competition.coachAssignments.length !== 1 ? 'es' : ''}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
