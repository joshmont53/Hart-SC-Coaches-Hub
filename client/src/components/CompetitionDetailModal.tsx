import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Competition, CompetitionCoaching, Location as BackendLocation, Coach as BackendCoach } from '@shared/schema';
import { Trophy, MapPin, Clock } from 'lucide-react';
import { format, parse } from 'date-fns';
import { useMemo } from 'react';

interface CompetitionDetailModalProps {
  competition: Competition | null;
  competitionCoaching: CompetitionCoaching[];
  locations: BackendLocation[];
  coaches: BackendCoach[];
  open: boolean;
  onClose: () => void;
}

export function CompetitionDetailModal({
  competition,
  competitionCoaching,
  locations,
  coaches,
  open,
  onClose,
}: CompetitionDetailModalProps) {
  // Sort coaching records chronologically by date and time
  const sortedCoaching = useMemo(() => {
    if (!competition) return [];
    
    const coachingForComp = competitionCoaching.filter(cc => cc.competitionId === competition.id);
    
    return coachingForComp.sort((a, b) => {
      // First sort by date (use string comparison for yyyy-MM-dd format)
      const dateCompare = a.coachingDate.localeCompare(b.coachingDate);
      if (dateCompare !== 0) return dateCompare;
      
      // Then by start time
      return a.startTime.localeCompare(b.startTime);
    });
  }, [competition, competitionCoaching]);

  // Group sorted coaching by date for display
  const groupedByDate = useMemo(() => {
    return sortedCoaching.reduce((acc, record) => {
      if (!acc[record.coachingDate]) {
        acc[record.coachingDate] = [];
      }
      acc[record.coachingDate].push(record);
      return acc;
    }, {} as Record<string, CompetitionCoaching[]>);
  }, [sortedCoaching]);

  if (!competition) return null;

  const location = locations.find(l => l.id === competition.locationId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="modal-competition-detail">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div
              className="h-12 w-12 rounded flex items-center justify-center flex-shrink-0 bg-white border-2"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  45deg,
                  ${competition.color}40,
                  ${competition.color}40 10px,
                  transparent 10px,
                  transparent 20px
                )`,
                borderColor: competition.color,
                color: competition.color
              }}
            >
              <Trophy className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-2xl" data-testid="text-competition-name">
                {competition.competitionName}
              </DialogTitle>
              <p className="text-muted-foreground mt-1">
                {competition.startDate === competition.endDate
                  ? format(parse(competition.startDate, 'yyyy-MM-dd', new Date()), 'EEEE, d MMMM yyyy')
                  : `${format(parse(competition.startDate, 'yyyy-MM-dd', new Date()), 'd MMM')} - ${format(parse(competition.endDate, 'yyyy-MM-dd', new Date()), 'd MMM yyyy')}`
                }
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Location */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4" />
              <span>Location</span>
            </div>
            <p className="text-base pl-6" data-testid="text-location">
              {location?.poolName || 'Unknown Location'}
            </p>
          </div>

          {/* Coach Assignments */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4" />
              <span>Coach Assignments</span>
            </div>
            
            {sortedCoaching.length === 0 ? (
              <p className="text-sm text-muted-foreground pl-6">No coaching assignments</p>
            ) : (
              <div className="space-y-4 pl-6">
                {Object.entries(groupedByDate).map(([date, records]) => {
                  const totalHours = records.reduce((sum, r) => sum + parseFloat(r.duration), 0);

                  return (
                    <div key={date} className="border rounded-lg p-4 space-y-2" data-testid={`date-group-${date}`}>
                      <div className="font-medium">{format(parse(date, 'yyyy-MM-dd', new Date()), 'EEEE, d MMMM yyyy')}</div>
                      <div className="text-sm text-muted-foreground">
                        Total: {totalHours.toFixed(1)} hours
                      </div>
                      <div className="space-y-2 mt-2">
                        {records.map((record) => {
                          const coach = coaches.find(c => c.id === record.coachId);
                          if (!coach) return null;

                          return (
                            <div key={record.id} className="flex items-center gap-2 text-sm" data-testid={`coaching-block-${record.id}`}>
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span>
                                {coach.firstName} {coach.lastName} • {record.startTime} - {record.endTime}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
