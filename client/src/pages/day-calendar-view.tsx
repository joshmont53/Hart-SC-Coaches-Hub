import type { Session, Squad, Location } from '../lib/typeAdapters';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

interface DayCalendarViewProps {
  sessions: Session[];
  squads: Squad[];
  locations: Location[];
  selectedDate: Date;
  onBack: () => void;
  onSessionClick: (session: Session) => void;
}

export function DayCalendarView({
  sessions,
  squads,
  locations,
  selectedDate,
  onBack,
  onSessionClick,
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

  const hours = Array.from({ length: 14 }, (_, i) => i + 6);

  const getSessionPosition = (session: Session) => {
    const [startHour, startMin] = session.startTime.split(':').map(Number);
    const [endHour, endMin] = session.endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const dayStartMinutes = 6 * 60;

    const top = ((startMinutes - dayStartMinutes) / 60) * 80;
    const height = ((endMinutes - startMinutes) / 60) * 80;

    return { top, height };
  };

  const getSessionsForLocation = (locationId: string) => {
    return daySessions.filter((s) => s.locationId === locationId);
  };

  return (
    <div className="flex flex-col h-full" data-testid="view-day-calendar">
      <div className="flex items-center gap-4 mb-6 px-2">
        <Button onClick={onBack} variant="outline" size="icon" data-testid="button-back-to-month">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 data-testid="text-day-name">{dayName}</h2>
          <p className="text-muted-foreground" data-testid="text-day-date">{dateStr}</p>
        </div>
      </div>

      {daySessions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground" data-testid="text-no-sessions">
          No sessions scheduled for this day
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="flex gap-4">
            <div className="w-16 flex-shrink-0">
              {hours.map((hour) => (
                <div key={hour} className="h-20 border-b text-sm text-muted-foreground">
                  {hour.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>

            <div className="flex-1 flex gap-4">
              {locations.map((location) => {
                const locationSessions = getSessionsForLocation(location.id);
                if (locationSessions.length === 0) return null;

                return (
                  <div key={location.id} className="flex-1 min-w-48">
                    <div className="mb-2 p-2 bg-muted rounded-lg sticky top-0 z-10">
                      {location.name}
                    </div>
                    <div className="relative">
                      {hours.map((hour) => (
                        <div key={hour} className="h-20 border-b border-border/50" />
                      ))}

                      <div className="absolute inset-0">
                        {locationSessions.map((session) => {
                          const squad = squads.find((s) => s.id === session.squadId);
                          if (!squad) return null;

                          const { top, height } = getSessionPosition(session);
                          const sessionsAtSameTime = locationSessions.filter((s) => {
                            const sameStart = s.startTime === session.startTime;
                            return sameStart;
                          });
                          const sessionIndex = sessionsAtSameTime.indexOf(session);
                          const totalConcurrent = sessionsAtSameTime.length;
                          const width = totalConcurrent > 1 ? `${100 / totalConcurrent}%` : '100%';
                          const left = totalConcurrent > 1 ? `${(sessionIndex / totalConcurrent) * 100}%` : '0%';

                          return (
                            <div
                              key={session.id}
                              className="absolute p-2 rounded text-white text-sm overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                              style={{
                                backgroundColor: squad.color,
                                top: `${top}px`,
                                height: `${height}px`,
                                left: left,
                                width: width,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSessionClick(session);
                              }}
                              data-testid={`session-block-${session.id}`}
                            >
                              <div>{squad.name}</div>
                              <div className="text-xs opacity-90">
                                {session.startTime} - {session.endTime}
                              </div>
                              <div className="text-xs opacity-90">{session.focus}</div>
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
