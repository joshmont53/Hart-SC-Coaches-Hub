import { Session, Squad, Location, Coach, Competition } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { Trophy } from 'lucide-react';

interface DayListViewProps {
  sessions: Session[];
  squads: Squad[];
  locations: Location[];
  coaches: Coach[];
  competitions: Competition[];
  currentDate: Date;
  onSessionClick?: (session: Session) => void;
  onCompetitionClick?: (competition: Competition) => void;
}

export function DayListView({
  sessions,
  squads,
  locations,
  coaches,
  competitions,
  currentDate,
  onSessionClick,
  onCompetitionClick,
}: DayListViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getSessionsForDate = (date: Date) => {
    return sessions.filter((session) => isSameDay(new Date(session.date), date));
  };

  const getCompetitionsForDate = (date: Date) => {
    return competitions.filter((competition) => {
      const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const start = new Date(competition.startDate.getFullYear(), competition.startDate.getMonth(), competition.startDate.getDate());
      const end = new Date(competition.endDate.getFullYear(), competition.endDate.getMonth(), competition.endDate.getDate());
      return checkDate >= start && checkDate <= end;
    });
  };

  const today = new Date();

  return (
    <div className="space-y-4">
      {daysInMonth.map((day) => {
        const daySessions = getSessionsForDate(day);
        const dayCompetitions = getCompetitionsForDate(day);
        const isToday = isSameDay(day, today);

        return (
          <div
            key={day.toISOString()}
            className={`border rounded-lg overflow-hidden ${
              isToday ? 'ring-2 ring-primary' : ''
            }`}
          >
            <div className="bg-muted p-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl">{format(day, 'd')}</span>
                <span className="text-muted-foreground">
                  {format(day, 'EEEE')}
                </span>
                {isToday && (
                  <span className="ml-auto text-sm text-primary">Today</span>
                )}
              </div>
            </div>

            {dayCompetitions.length > 0 || daySessions.length > 0 ? (
              <div className="p-3 space-y-2">
                {/* Competitions */}
                {dayCompetitions.map((competition) => {
                  const location = locations.find((l) => l.id === competition.locationId);

                  return (
                    <div
                      key={competition.id}
                      className="p-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                      style={{
                        background: `repeating-linear-gradient(
                          -45deg,
                          ${competition.color},
                          ${competition.color} 10px,
                          white 10px,
                          white 20px
                        )`,
                      }}
                      onClick={() => onCompetitionClick?.(competition)}
                    >
                      <div className="text-black">
                        <div className="flex items-start gap-2">
                          <Trophy className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <div className="font-medium">{competition.name}</div>
                            {location && (
                              <div className="text-sm opacity-75 mt-1">{location.name}</div>
                            )}
                            <div className="text-xs opacity-75 mt-0.5">
                              {competition.coachAssignments.length} coach{competition.coachAssignments.length !== 1 ? 'es' : ''}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Sessions */}
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
                      onClick={() => onSessionClick?.(session)}
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
              <div className="p-3 text-center text-sm text-muted-foreground">
                No sessions or competitions
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
