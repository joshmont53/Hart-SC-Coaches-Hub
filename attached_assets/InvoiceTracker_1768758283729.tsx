import { useState, useMemo } from 'react';
import { Coach, Session, Squad, QualificationLevel, Competition, Location } from '../types';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { ArrowLeft, FileText, Download, Clock, PenLine, Banknote, ChevronRight, ChevronDown, Trophy } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { Badge } from './ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { competitions } from '../lib/mockDataExtensions';
import { locations } from '../lib/mockData';

interface InvoiceTrackerProps {
  coach: Coach;
  sessions: Session[];
  squads: Squad[];
  onBack: () => void;
}

interface CoachingSession {
  id: string;
  date: Date;
  squadName: string;
  timeSlot: string;
  duration: number; // in hours
  rate: number;
  amount: number;
}

interface WrittenSession {
  id: string;
  date: Date;
  sessionName: string;
  squadName: string;
  amount: number;
}

interface CompetitionCoaching {
  id: string;
  date: Date;
  competitionName: string;
  locationName: string;
  duration: number; // in hours
  rate: number;
  amount: number;
}

const QUALIFICATION_RATES: Record<QualificationLevel, number> = {
  'No Qualification': 0,
  'Level 1': 15,
  'Level 2': 17,
  'Level 3': 22,
};

export function InvoiceTracker({ coach, sessions, squads, onBack }: InvoiceTrackerProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [coachingExpanded, setCoachingExpanded] = useState(false);
  const [writingExpanded, setWritingExpanded] = useState(false);
  const [competitionExpanded, setCompetitionExpanded] = useState(false);

  const hourlyRate = QUALIFICATION_RATES[coach.level];
  const setWriterRate = hourlyRate * 0.5;

  // Calculate session duration in hours
  const calculateDuration = (startTime: string, endTime: string): number => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    return (endMinutes - startMinutes) / 60;
  };

  // Get squad name by ID
  const getSquadName = (squadId: string): string => {
    return squads.find(s => s.id === squadId)?.name || 'Unknown Squad';
  };

  // Get location name by ID
  const getLocationName = (locationId: string): string => {
    return locations.find(l => l.id === locationId)?.name || 'Unknown Location';
  };

  // Filter sessions for the selected month
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);

  const filteredSessions = sessions.filter(session =>
    isSameMonth(session.date, selectedMonth)
  );

  // Calculate coaching sessions (where coach was lead or second coach)
  const coachingSessions: CoachingSession[] = useMemo(() => {
    return filteredSessions
      .filter(s => s.leadCoachId === coach.id || s.secondCoachId === coach.id)
      .map(session => {
        const duration = calculateDuration(session.startTime, session.endTime);
        return {
          id: session.id,
          date: session.date,
          squadName: getSquadName(session.squadId),
          timeSlot: `${session.startTime} - ${session.endTime}`,
          duration,
          rate: hourlyRate,
          amount: duration * hourlyRate,
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [filteredSessions, coach.id, hourlyRate]);

  // Calculate written sessions (where coach was the set writer)
  const writtenSessions: WrittenSession[] = useMemo(() => {
    return filteredSessions
      .filter(s => s.setWriterId === coach.id)
      .map(session => ({
        id: session.id,
        date: session.date,
        sessionName: `${getSquadName(session.squadId)} - ${session.focus}`,
        squadName: getSquadName(session.squadId),
        amount: setWriterRate,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [filteredSessions, coach.id, setWriterRate]);

  // Calculate competition coaching (where coach was assigned)
  const competitionCoaching: CompetitionCoaching[] = useMemo(() => {
    return competitions
      .filter(comp => {
        // Check if competition is in the selected month
        const compInMonth = isSameMonth(comp.startDate, selectedMonth) || isSameMonth(comp.endDate, selectedMonth);
        if (!compInMonth) return false;
        
        // Check if coach is assigned to this competition
        return comp.coachAssignments.some(assignment => assignment.coachId === coach.id);
      })
      .map(comp => {
        const assignment = comp.coachAssignments.find(a => a.coachId === coach.id)!;
        const duration = assignment.timeBlocks.reduce((total, block) => {
          const [startHour, startMin] = block.startTime.split(':').map(Number);
          const [endHour, endMin] = block.endTime.split(':').map(Number);
          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;
          return total + (endMinutes - startMinutes) / 60;
        }, 0);

        return {
          id: comp.id,
          date: comp.startDate,
          competitionName: comp.name,
          locationName: getLocationName(comp.locationId),
          duration,
          rate: hourlyRate,
          amount: duration * hourlyRate,
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [coach.id, selectedMonth, hourlyRate]);

  // Calculate totals
  const totalCoachingHours = coachingSessions.reduce((sum, s) => sum + s.duration, 0);
  const totalCoachingPay = coachingSessions.reduce((sum, s) => sum + s.amount, 0);
  const totalSessionsWritten = writtenSessions.length;
  const totalWritingPay = writtenSessions.reduce((sum, s) => sum + s.amount, 0);
  const totalCompetitionHours = competitionCoaching.reduce((sum, c) => sum + c.duration, 0);
  const totalCompetitionPay = competitionCoaching.reduce((sum, c) => sum + c.amount, 0);
  const grandTotal = totalCoachingPay + totalWritingPay + totalCompetitionPay;

  // Generate months for the selector (last 12 months + next 3 months)
  const availableMonths = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = -12; i <= 3; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push(date);
    }
    return months;
  }, []);

  const handleExport = () => {
    window.print();
  };

  return (
    <div className="h-full flex flex-col print:p-8">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
        {/* Compact Inline Header - Hidden when printing */}
        <div className="print:hidden flex-shrink-0">
          <div className="flex items-center gap-3 mb-6 pb-3 border-b">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onBack}
              className="h-9 w-9 shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base truncate">Invoice Tracker</h1>
            </div>
            <Button onClick={handleExport} variant="outline" size="sm" className="shrink-0">
              <Download className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Export</span>
              <span className="sm:hidden">PDF</span>
            </Button>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm whitespace-nowrap">Month:</label>
            <Select
              value={selectedMonth.toISOString()}
              onValueChange={(value) => setSelectedMonth(new Date(value))}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map((month) => (
                  <SelectItem key={month.toISOString()} value={month.toISOString()}>
                    {format(month, 'MMMM yyyy')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Print Header - Only visible when printing */}
        <div className="hidden print:block mb-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl">Hart Swimming Club</h1>
            <p className="text-lg text-muted-foreground">Coaching Invoice</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6 border-b pb-4">
            <div>
              <p><strong>Coach:</strong> {coach.firstName} {coach.lastName}</p>
              <p><strong>Qualification:</strong> {coach.level}</p>
              <p><strong>Hourly Rate:</strong> £{hourlyRate.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p><strong>Invoice Period:</strong></p>
              <p>{format(selectedMonth, 'MMMM yyyy')}</p>
              <p className="text-sm text-muted-foreground">Generated: {format(new Date(), 'dd/MM/yyyy')}</p>
            </div>
          </div>
        </div>

        {/* Volunteer Notice */}
        {hourlyRate === 0 && (
          <div className="mb-4 p-4 border rounded-lg bg-muted/30 print:hidden">
            <p className="text-sm text-muted-foreground text-center">
              <strong>Volunteer Coach</strong> - This tracker shows your coaching hours and contributions. Thank you for volunteering!
            </p>
          </div>
        )}

        {/* Print Version - Only visible when printing */}
        <div className="hidden print:block space-y-6">
          {coachingSessions.length > 0 && (
            <div>
              <h3 className="mb-3">Coaching Sessions</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Squad</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coachingSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>{format(session.date, 'EEE, dd MMM')}</TableCell>
                      <TableCell>{session.squadName}</TableCell>
                      <TableCell className="text-sm">{session.timeSlot}</TableCell>
                      <TableCell className="text-right">{session.duration.toFixed(1)}</TableCell>
                      <TableCell className="text-right">£{session.amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={3} className="font-medium">Coaching Subtotal</TableCell>
                    <TableCell className="text-right font-medium">{totalCoachingHours.toFixed(1)} hrs</TableCell>
                    <TableCell className="text-right font-medium">£{totalCoachingPay.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}

          {writtenSessions.length > 0 && (
            <div>
              <h3 className="mb-3">Sessions Written</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Squad</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {writtenSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>{format(session.date, 'EEE, dd MMM')}</TableCell>
                      <TableCell>{session.squadName}</TableCell>
                      <TableCell className="text-right">£{session.amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={2} className="font-medium">
                      Writing Subtotal ({totalSessionsWritten} sessions)
                    </TableCell>
                    <TableCell className="text-right font-medium">£{totalWritingPay.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}

          {competitionCoaching.length > 0 && (
            <div>
              <h3 className="mb-3">Competition Hours</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Competition</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {competitionCoaching.map((comp) => (
                    <TableRow key={comp.id}>
                      <TableCell>{format(comp.date, 'EEE, dd MMM')}</TableCell>
                      <TableCell>{comp.competitionName}</TableCell>
                      <TableCell className="text-sm">{comp.locationName}</TableCell>
                      <TableCell className="text-right">{comp.duration.toFixed(1)}</TableCell>
                      <TableCell className="text-right">£{comp.amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={3} className="font-medium">Competition Subtotal</TableCell>
                    <TableCell className="text-right font-medium">{totalCompetitionHours.toFixed(1)} hrs</TableCell>
                    <TableCell className="text-right font-medium">£{totalCompetitionPay.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}

          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-lg font-medium">Total Payment</p>
                <p className="text-sm text-muted-foreground">
                  {totalCoachingHours.toFixed(1)} session hrs + {totalCompetitionHours.toFixed(1)} comp hrs + {totalSessionsWritten} written
                </p>
              </div>
              <p className="text-3xl font-medium text-primary">£{grandTotal.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Summary Cards - Mobile View */}
        <div className="print:hidden overflow-y-auto flex-1 pb-6 space-y-3">
          {/* Coaching Hours Card - Expandable */}
          <Collapsible open={coachingExpanded} onOpenChange={setCoachingExpanded}>
            <Card className="overflow-hidden">
              <CollapsibleTrigger className="w-full p-4 text-left">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Coaching Hours</p>
                    <p className="text-2xl text-primary">{totalCoachingHours.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">{coachingSessions.length} sessions</p>
                  </div>
                  {coachingSessions.length > 0 && (
                    coachingExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t bg-muted/20">
                  <div className="divide-y">
                    {coachingSessions.map((session) => (
                      <div key={session.id} className="p-4 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{format(session.date, 'EEEE do')}</p>
                          <p className="text-primary">{session.duration.toFixed(1)} hrs</p>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <Badge variant="outline">{session.squadName}</Badge>
                          <p className="text-muted-foreground">{session.timeSlot}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Sessions Written Card - Expandable */}
          <Collapsible open={writingExpanded} onOpenChange={setWritingExpanded}>
            <Card className="overflow-hidden">
              <CollapsibleTrigger className="w-full p-4 text-left">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <PenLine className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Sessions Written</p>
                    <p className="text-2xl text-primary">{totalSessionsWritten}</p>
                    <p className="text-xs text-muted-foreground">{writtenSessions.length} session{writtenSessions.length !== 1 ? 's' : ''}</p>
                  </div>
                  {writtenSessions.length > 0 && (
                    writingExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t bg-muted/20">
                  <div className="divide-y">
                    {writtenSessions.map((session) => (
                      <div key={session.id} className="p-4 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{format(session.date, 'EEEE do')}</p>
                          <p className="text-primary">£{session.amount.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline">{session.squadName}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Competition Hours Card - Expandable */}
          <Collapsible open={competitionExpanded} onOpenChange={setCompetitionExpanded}>
            <Card className="overflow-hidden">
              <CollapsibleTrigger className="w-full p-4 text-left">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Trophy className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Competition Hours</p>
                    <p className="text-2xl text-primary">{totalCompetitionHours.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">{competitionCoaching.length} competition{competitionCoaching.length !== 1 ? 's' : ''}</p>
                  </div>
                  {competitionCoaching.length > 0 && (
                    competitionExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t bg-muted/20">
                  <div className="divide-y">
                    {competitionCoaching.map((comp) => (
                      <div key={comp.id} className="p-4 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{format(comp.date, 'EEEE do')}</p>
                          <p className="text-primary">{comp.duration.toFixed(1)} hrs</p>
                        </div>
                        <div className="flex flex-col gap-1 text-sm">
                          <Badge variant="outline" className="w-fit">{comp.competitionName}</Badge>
                          <p className="text-muted-foreground text-xs">{comp.locationName}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Hourly Rate Card */}
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Hourly Rate</p>
                <p className="text-2xl text-primary">£{hourlyRate.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{coach.level}</p>
              </div>
            </div>
          </Card>

          {/* Total Payment Card */}
          <Card className="p-4 bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Banknote className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Total Payment</p>
                <p className="text-2xl text-primary">£{grandTotal.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">This month</p>
              </div>
            </div>
          </Card>
        </div>

        {/* No Data Message */}
        {coachingSessions.length === 0 && writtenSessions.length === 0 && competitionCoaching.length === 0 && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No coaching sessions, competitions, or set writing found for {format(selectedMonth, 'MMMM yyyy')}
              </p>
            </div>
          </div>
        )}

        {/* Print Footer */}
        <div className="hidden print:block mt-8 pt-4 border-t text-center text-sm text-muted-foreground">
          <p>Hart Swimming Club - Coaching Invoice</p>
          <p>Please remit payment to the coach within 14 days of invoice date</p>
        </div>
      </div>
    </div>
  );
}