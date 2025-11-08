import type { Session, Squad, Location, Coach } from '../lib/typeAdapters';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';

interface DayListViewProps {
  sessions: Session[];
  squads: Squad[];
  locations: Location[];
  coaches: Coach[];
  currentDate: Date;
  onSessionClick: (session: Session) => void;
}

export function DayListView({
  sessions,
  squads,
  locations,
  coaches,
  currentDate,
  onSessionClick,
}: DayListViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getSessionsForDate = (date: Date) => {
    return sessions.filter((session) => isSameDay(new Date(session.date), date));
  };

  const today = new Date();

  return (
    <div className="space-y-4" data-testid="view-day-list">
      {daysInMonth.map((day) => {
        const daySessions = getSessionsForDate(day);
        const isToday = isSameDay(day, today);

        return (
          <div
            key={day.toISOString()}
            className={`border rounded-lg overflow-hidden ${
              isToday ? 'ring-2 ring-primary' : ''
            }`}
            data-testid={`day-list-item-${format(day, 'yyyy-MM-dd')}`}
          >
            <div className="bg-muted p-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl">{format(day, 'd')}</span>
                <span className="text-muted-foreground">
                  {format(day, 'EEEE')}
                </span>
                {isToday && (
                  <span className="ml-auto text-sm text-primary" data-testid="badge-today">Today</span>
                )}
              </div>
            </div>

            {daySessions.length > 0 ? (
              <div className="p-3 space-y-2">
                {daySessions.map((session) => {
                  const squad = squads.find((s) => s.id === session.squadId);
                  const location = locations.find((l) => l.id === session.locationId);
                  const coach = coaches.find((c) => c.id === session.leadCoachId);

                  if (!squad) return null;

                  return (
                    <div
                      key={session.id}
                      className="p-3 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: squad.color }}
                      onClick={() => onSessionClick(session)}
                      data-testid={`session-item-${session.id}`}
                    >
                      <div className="text-white">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div>{squad.name}</div>
                            <div className="text-sm opacity-90">{session.focus}</div>
                          </div>
                          <div className="text-sm opacity-90 text-right whitespace-nowrap">
                            {session.startTime} - {session.endTime}
                          </div>
                        </div>
                        {location && (
                          <div className="text-xs opacity-75 mt-1">{location.name}</div>
                        )}
                        {coach && (
                          <div className="text-xs opacity-75">{coach.name}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 text-center text-sm text-muted-foreground" data-testid="text-no-sessions">
                No sessions
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
