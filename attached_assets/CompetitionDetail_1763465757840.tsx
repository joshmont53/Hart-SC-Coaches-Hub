import { Competition, Coach, Location } from '../types';
import { X, MapPin, Trophy, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { format } from 'date-fns';

interface CompetitionDetailProps {
  competition: Competition;
  coaches: Coach[];
  locations: Location[];
  onClose: () => void;
}

export function CompetitionDetail({
  competition,
  coaches,
  locations,
  onClose,
}: CompetitionDetailProps) {
  const location = locations.find((l) => l.id === competition.locationId);
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateRange = () => {
    const start = competition.startDate;
    const end = competition.endDate;
    
    // Check if same day
    if (
      start.getDate() === end.getDate() &&
      start.getMonth() === end.getMonth() &&
      start.getFullYear() === end.getFullYear()
    ) {
      return formatDate(start);
    }
    
    // Multi-day event
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const calculateTotalHours = (timeBlocks: { startTime: string; endTime: string }[]) => {
    return timeBlocks.reduce((total, block) => {
      const [startHour, startMin] = block.startTime.split(':').map(Number);
      const [endHour, endMin] = block.endTime.split(':').map(Number);
      const hours = endHour - startHour + (endMin - startMin) / 60;
      return total + hours;
    }, 0);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{
                background: `repeating-linear-gradient(
                  -45deg,
                  ${competition.color},
                  ${competition.color} 10px,
                  white 10px,
                  white 20px
                )`,
              }}
            >
              <Trophy className="h-6 w-6 text-black" />
            </div>
            <div>
              <h2>{competition.name}</h2>
              <p className="text-muted-foreground">{formatDateRange()}</p>
            </div>
          </div>
          <Button onClick={onClose} variant="ghost" size="icon">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Location */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <h3>Location</h3>
            </div>
            <div className="ml-7">
              <p>{location?.name || 'Unknown Location'}</p>
              {location && (
                <p className="text-muted-foreground text-sm">{location.address}</p>
              )}
            </div>
          </div>

          {/* Coach Assignments */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <h3>Coach Assignments</h3>
            </div>
            <div className="space-y-4">
              {competition.coachAssignments.map((assignment, index) => {
                const coach = coaches.find((c) => c.id === assignment.coachId);
                const totalHours = calculateTotalHours(assignment.timeBlocks);
                
                return (
                  <div
                    key={index}
                    className="border rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium">{coach?.name || 'Unknown Coach'}</p>
                        <p className="text-sm text-muted-foreground">
                          Total: {totalHours} hour{totalHours !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {assignment.timeBlocks.map((block, blockIndex) => (
                        <div
                          key={blockIndex}
                          className="flex items-center gap-2 text-sm bg-muted/30 px-3 py-2 rounded"
                        >
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {competition.startDate.toDateString() !== competition.endDate.toDateString() && (
                              <span className="text-muted-foreground mr-2">
                                {format(block.date, 'MMM d')}:
                              </span>
                            )}
                            {block.startTime} - {block.endTime}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
