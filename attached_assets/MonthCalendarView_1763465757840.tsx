import { Session, Squad, Competition } from '../types';
import { ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import { Button } from './ui/button';

interface MonthCalendarViewProps {
  sessions: Session[];
  squads: Squad[];
  competitions: Competition[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onDayClick: (date: Date) => void;
  onCompetitionClick?: (competition: Competition) => void;
}

export function MonthCalendarView({
  sessions,
  squads,
  competitions,
  currentDate,
  onDateChange,
  onDayClick,
  onCompetitionClick,
}: MonthCalendarViewProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // Adjust day of week so Monday = 0, Sunday = 6
  const startingDayOfWeek = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const previousMonth = () => {
    onDateChange(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    onDateChange(new Date(year, month + 1, 1));
  };

  const getSessionsForDate = (date: Date) => {
    return sessions.filter((session) => {
      const sessionDate = new Date(session.date);
      return (
        sessionDate.getDate() === date.getDate() &&
        sessionDate.getMonth() === date.getMonth() &&
        sessionDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const getCompetitionsForDate = (date: Date) => {
    return competitions.filter((competition) => {
      const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const start = new Date(competition.startDate.getFullYear(), competition.startDate.getMonth(), competition.startDate.getDate());
      const end = new Date(competition.endDate.getFullYear(), competition.endDate.getMonth(), competition.endDate.getDate());
      return checkDate >= start && checkDate <= end;
    });
  };

  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const isToday = (day: number | null) => {
    if (!day) return false;
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6 px-2">
        <h2>
          {monthNames[month]} {year}
        </h2>
        <div className="flex gap-2">
          <Button onClick={previousMonth} variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button onClick={nextMonth} variant="outline" size="icon">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 flex-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="p-2 text-center text-muted-foreground">
            {day}
          </div>
        ))}

        {days.map((day, index) => {
          const date = day ? new Date(year, month, day) : null;
          const daySessions = date ? getSessionsForDate(date) : [];
          const dayCompetitions = date ? getCompetitionsForDate(date) : [];

          return (
            <div
              key={index}
              className={`min-h-24 p-2 border rounded-lg ${
                day
                  ? 'bg-background cursor-pointer hover:bg-accent transition-colors'
                  : 'bg-muted/30'
              } ${isToday(day) ? 'ring-2 ring-primary' : ''}`}
              onClick={() => day && date && onDayClick(date)}
            >
              {day && (
                <>
                  <div className="mb-1">{day}</div>
                  <div className="space-y-1">
                    {dayCompetitions.map((competition) => {
                      return (
                        <div
                          key={competition.id}
                          className="text-xs px-2 py-1 rounded truncate flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                          style={{
                            background: `repeating-linear-gradient(
                              -45deg,
                              ${competition.color},
                              ${competition.color} 6px,
                              white 6px,
                              white 12px
                            )`,
                          }}
                          title={competition.name}
                          onClick={(e) => {
                            e.stopPropagation();
                            onCompetitionClick?.(competition);
                          }}
                        >
                          <Trophy className="h-3 w-3 flex-shrink-0 text-black" />
                          <span className="truncate font-medium text-black">{competition.name}</span>
                        </div>
                      );
                    })}
                    {daySessions.map((session) => {
                      const squad = squads.find((s) => s.id === session.squadId);
                      if (!squad) return null;
                      return (
                        <div
                          key={session.id}
                          className="text-xs px-2 py-1 rounded truncate text-white"
                          style={{ backgroundColor: squad.color }}
                          title={`${squad.name} - ${session.focus}`}
                        >
                          {squad.name} - {session.focus}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
