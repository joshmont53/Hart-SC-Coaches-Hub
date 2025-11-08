import type { Session, Squad, Location, Coach, Swimmer } from '../lib/typeAdapters';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar, Clock, MapPin, Users, Target } from 'lucide-react';
import { format } from 'date-fns';

interface SessionDetailProps {
  session: Session;
  squad: Squad;
  location: Location;
  coaches: Coach[];
  swimmers: Swimmer[];
  onBack: () => void;
}

export function SessionDetail({
  session,
  squad,
  location,
  coaches,
  swimmers,
  onBack,
}: SessionDetailProps) {
  const leadCoach = coaches.find(c => c.id === session.leadCoachId);
  const secondCoach = session.secondCoachId ? coaches.find(c => c.id === session.secondCoachId) : null;
  const helper = session.helperId ? coaches.find(c => c.id === session.helperId) : null;
  const setWriter = coaches.find(c => c.id === session.setWriterId);

  return (
    <div className="max-w-4xl mx-auto" data-testid="view-session-detail">
      <div className="mb-6">
        <Button onClick={onBack} variant="ghost" size="sm" data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Calendar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl mb-2">{squad.name}</CardTitle>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(session.date, 'EEEE, MMMM d, yyyy')}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {session.startTime} - {session.endTime}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {location.name} ({location.poolType})
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  {session.focus}
                </div>
              </div>
            </div>
            <div 
              className="w-4 h-16 rounded"
              style={{ backgroundColor: squad.color }}
              title={squad.name}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <h3 className="font-medium mb-3">Coaches</h3>
            <div className="grid gap-2 text-sm">
              {leadCoach && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lead Coach:</span>
                  <span>{leadCoach.name}</span>
                </div>
              )}
              {secondCoach && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Second Coach:</span>
                  <span>{secondCoach.name}</span>
                </div>
              )}
              {helper && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Helper:</span>
                  <span>{helper.name}</span>
                </div>
              )}
              {setWriter && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Set Writer:</span>
                  <span>{setWriter.name}</span>
                </div>
              )}
            </div>
          </div>

          {session.content && (
            <div>
              <h3 className="font-medium mb-3">Session Content</h3>
              <div 
                className="prose prose-sm max-w-none p-4 bg-muted rounded-lg"
                dangerouslySetInnerHTML={{ __html: session.content }}
              />
            </div>
          )}

          {session.distanceBreakdown && (
            <div>
              <h3 className="font-medium mb-3">Distance Breakdown</h3>
              <div className="text-lg font-semibold mb-3">
                Total: {session.distanceBreakdown.total}m
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {session.distanceBreakdown.frontCrawl > 0 && (
                  <div>
                    <div className="text-muted-foreground">Front Crawl</div>
                    <div className="font-medium">{session.distanceBreakdown.frontCrawl}m</div>
                  </div>
                )}
                {session.distanceBreakdown.backstroke > 0 && (
                  <div>
                    <div className="text-muted-foreground">Backstroke</div>
                    <div className="font-medium">{session.distanceBreakdown.backstroke}m</div>
                  </div>
                )}
                {session.distanceBreakdown.breaststroke > 0 && (
                  <div>
                    <div className="text-muted-foreground">Breaststroke</div>
                    <div className="font-medium">{session.distanceBreakdown.breaststroke}m</div>
                  </div>
                )}
                {session.distanceBreakdown.butterfly > 0 && (
                  <div>
                    <div className="text-muted-foreground">Butterfly</div>
                    <div className="font-medium">{session.distanceBreakdown.butterfly}m</div>
                  </div>
                )}
                {session.distanceBreakdown.individualMedley > 0 && (
                  <div>
                    <div className="text-muted-foreground">Individual Medley</div>
                    <div className="font-medium">{session.distanceBreakdown.individualMedley}m</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {session.attendance && session.attendance.length > 0 && (
            <div>
              <h3 className="font-medium mb-3">Attendance</h3>
              <div className="text-sm">
                <div className="text-muted-foreground mb-2">
                  {session.attendance.filter(a => a.status === 'Present').length} of {session.attendance.length} swimmers present
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
