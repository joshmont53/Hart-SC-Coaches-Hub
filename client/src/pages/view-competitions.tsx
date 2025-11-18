import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Competition, CompetitionCoaching, Location as BackendLocation, Coach as BackendCoach } from '@shared/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Calendar, MapPin, Clock, Users } from 'lucide-react';
import { format, isPast, isFuture, parseISO } from 'date-fns';

export function ViewCompetitions() {
  const [selectedTab, setSelectedTab] = useState<'upcoming' | 'past' | 'all'>('upcoming');

  // Fetch competitions
  const { data: competitions = [], isLoading: isLoadingCompetitions } = useQuery<Competition[]>({
    queryKey: ['/api/competitions'],
  });

  // Fetch locations for display
  const { data: locations = [] } = useQuery<BackendLocation[]>({
    queryKey: ['/api/locations'],
  });

  // Fetch coaches for display
  const { data: coaches = [] } = useQuery<BackendCoach[]>({
    queryKey: ['/api/coaches'],
  });

  const getLocationName = (locationId: string): string => {
    const location = locations.find(l => l.id === locationId);
    return location?.poolName || 'Unknown Location';
  };

  const getCoachName = (coachId: string): string => {
    const coach = coaches.find(c => c.id === coachId);
    if (!coach) return 'Unknown Coach';
    return `${coach.firstName} ${coach.lastName}`;
  };

  // Filter competitions based on selected tab
  const filterCompetitions = (comps: Competition[]) => {
    const now = new Date();
    switch (selectedTab) {
      case 'upcoming':
        return comps.filter(c => isFuture(parseISO(c.startDate)) || parseISO(c.startDate).toDateString() === now.toDateString());
      case 'past':
        return comps.filter(c => isPast(parseISO(c.endDate)) && parseISO(c.endDate).toDateString() !== now.toDateString());
      case 'all':
      default:
        return comps;
    }
  };

  const sortedCompetitions = [...filterCompetitions(competitions)].sort((a, b) => 
    new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );

  const upcomingCount = competitions.filter(c => 
    isFuture(parseISO(c.startDate)) || parseISO(c.startDate).toDateString() === new Date().toDateString()
  ).length;

  const pastCount = competitions.filter(c => 
    isPast(parseISO(c.endDate)) && parseISO(c.endDate).toDateString() !== new Date().toDateString()
  ).length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Trophy className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Competitions</h1>
          <p className="text-muted-foreground">View upcoming and past competitions</p>
        </div>
      </div>

      {/* Tabs for filtering */}
      <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3" data-testid="tabs-competition-filter">
          <TabsTrigger value="upcoming" data-testid="tab-upcoming">
            Upcoming {upcomingCount > 0 && <Badge variant="secondary" className="ml-2">{upcomingCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="past" data-testid="tab-past">
            Past {pastCount > 0 && <Badge variant="secondary" className="ml-2">{pastCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="all" data-testid="tab-all">
            All {competitions.length > 0 && <Badge variant="secondary" className="ml-2">{competitions.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-6">
          <CompetitionList 
            competitions={sortedCompetitions}
            isLoading={isLoadingCompetitions}
            getLocationName={getLocationName}
            getCoachName={getCoachName}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface CompetitionListProps {
  competitions: Competition[];
  isLoading: boolean;
  getLocationName: (id: string) => string;
  getCoachName: (id: string) => string;
}

function CompetitionList({ competitions, isLoading, getLocationName, getCoachName }: CompetitionListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">Loading competitions...</p>
        </CardContent>
      </Card>
    );
  }

  if (competitions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">No competitions found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {competitions.map((competition) => (
        <CompetitionCard 
          key={competition.id} 
          competition={competition}
          getLocationName={getLocationName}
          getCoachName={getCoachName}
        />
      ))}
    </div>
  );
}

interface CompetitionCardProps {
  competition: Competition;
  getLocationName: (id: string) => string;
  getCoachName: (id: string) => string;
}

function CompetitionCard({ competition, getLocationName, getCoachName }: CompetitionCardProps) {
  // Fetch coaching records for this competition
  const { data: coachingRecords = [] } = useQuery<CompetitionCoaching[]>({
    queryKey: ['/api/competitions', competition.id, 'coaching'],
  });

  // Group coaching records by coach
  const groupedCoachingRecords = coachingRecords.reduce((acc, record) => {
    if (!acc[record.coachId]) {
      acc[record.coachId] = [];
    }
    acc[record.coachId].push(record);
    return acc;
  }, {} as Record<string, CompetitionCoaching[]>);

  const totalCoaches = Object.keys(groupedCoachingRecords).length;

  return (
    <Card 
      data-testid={`card-competition-${competition.id}`}
      className="overflow-hidden"
    >
      {/* Color stripe at top */}
      <div 
        className="h-2" 
        style={{ backgroundColor: competition.color }}
      />
      
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header: Title and color indicator */}
          <div className="flex items-start gap-3">
            <div
              className="h-5 w-5 rounded flex-shrink-0 mt-1"
              style={{ backgroundColor: competition.color }}
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-2xl font-bold" data-testid={`text-competition-name-${competition.id}`}>
                {competition.competitionName}
              </h3>
            </div>
            <Trophy className="h-6 w-6 text-primary flex-shrink-0" />
          </div>

          {/* Competition Details */}
          <div className="grid gap-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>
                {competition.startDate === competition.endDate
                  ? format(new Date(competition.startDate), 'EEEE, d MMMM yyyy')
                  : `${format(new Date(competition.startDate), 'd MMM')} - ${format(new Date(competition.endDate), 'd MMM yyyy')}`
                }
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span>{getLocationName(competition.locationId)}</span>
            </div>
            {totalCoaches > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4 flex-shrink-0" />
                <span>{totalCoaches} {totalCoaches === 1 ? 'coach' : 'coaches'} assigned</span>
              </div>
            )}
          </div>

          {/* Coaching Assignments */}
          {coachingRecords.length > 0 && (
            <div className="space-y-3 pt-2 border-t">
              <h4 className="font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Coaching Schedule
              </h4>
              <div className="space-y-3">
                {Object.entries(groupedCoachingRecords).map(([coachId, records]) => (
                  <div key={coachId} className="space-y-2">
                    <p className="font-medium text-sm" data-testid={`text-coach-name-${coachId}`}>
                      {getCoachName(coachId)}
                    </p>
                    <div className="space-y-1 pl-4 border-l-2 border-muted">
                      {records.map((record) => (
                        <div 
                          key={record.id}
                          className="flex items-center gap-3 text-sm text-muted-foreground py-1"
                          data-testid={`coaching-block-${record.id}`}
                        >
                          <span>{format(new Date(record.coachingDate), 'EEE, d MMM')}</span>
                          <span>•</span>
                          <span>{record.startTime} - {record.endTime}</span>
                          <Badge variant="secondary" className="text-xs">
                            {record.duration}h
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
