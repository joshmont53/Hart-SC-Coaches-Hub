import { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Printer,
  FileText,
  Clock,
  Trophy,
  DollarSign,
} from 'lucide-react';
import type { Coach as BackendCoach, SwimmingSession, CompetitionCoaching } from '@shared/schema';

interface InvoiceData {
  coachId: string;
  coachName: string;
  qualificationLevel: string;
  year: number;
  month: number;
  rates: {
    hourlyRate: number;
    sessionWritingRate: number;
  };
  coaching: {
    totalHours: number;
    breakdown: {
      sessionHours: number;
      competitionHours: number;
    };
    sessions: Array<{
      sessionId: string;
      sessionDate: string;
      squadId: string;
      duration: number;
      role: 'lead' | 'second' | 'helper';
    }>;
    competitions: Array<{
      coachingId: string;
      competitionId: string;
      coachingDate: string;
      duration: number;
    }>;
    earnings: number;
  };
  sessionWriting: {
    count: number;
    sessions: Array<{
      sessionId: string;
      sessionDate: string;
      squadId: string;
    }>;
    earnings: number;
  };
  totals: {
    totalEarnings: number;
    totalHours: number;
    totalSessionsWritten: number;
  };
}

interface MonthOption {
  year: number;
  month: number;
  label: string;
  value: string;
}

interface InvoiceTrackerProps {
  onBack: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function InvoiceTracker({ onBack }: InvoiceTrackerProps) {
  const { user } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [coachingOpen, setCoachingOpen] = useState(true);
  const [sessionWritingOpen, setSessionWritingOpen] = useState(true);
  const [competitionOpen, setCompetitionOpen] = useState(true);

  // Fetch current user's coach profile
  const { data: coaches = [] } = useQuery<BackendCoach[]>({ 
    queryKey: ['/api/coaches'],
  });

  const currentCoach = useMemo(() => {
    return coaches.find(c => c.userId === user?.id);
  }, [coaches, user?.id]);

  // Fetch all sessions to determine available months
  const { data: allSessions = [] } = useQuery<SwimmingSession[]>({ 
    queryKey: ['/api/sessions'],
    enabled: !!currentCoach,
  });

  // Fetch all competition coaching to determine available months
  const { data: allCompetitionCoaching = [] } = useQuery<CompetitionCoaching[]>({ 
    queryKey: ['/api/competitions/coaching/all'],
    enabled: !!currentCoach,
  });

  // Calculate available months based on sessions and competitions
  const availableMonths = useMemo((): MonthOption[] => {
    if (!currentCoach) return [];

    const monthSet = new Set<string>();

    // Add months from coaching sessions (use UTC to match backend date filtering)
    allSessions.forEach(session => {
      if (
        session.leadCoachId === currentCoach.id ||
        session.secondCoachId === currentCoach.id ||
        session.helperId === currentCoach.id ||
        session.setWriterId === currentCoach.id
      ) {
        // Parse ISO date string and extract year-month (YYYY-MM format matches backend)
        const dateStr = session.sessionDate; // Already in YYYY-MM-DD format
        const key = dateStr.substring(0, 7); // Extract YYYY-MM
        monthSet.add(key);
      }
    });

    // Add months from competition coaching (use UTC to match backend date filtering)
    allCompetitionCoaching.forEach(coaching => {
      if (coaching.coachId === currentCoach.id) {
        // Parse ISO date string and extract year-month (YYYY-MM format matches backend)
        const dateStr = coaching.coachingDate; // Already in YYYY-MM-DD format
        const key = dateStr.substring(0, 7); // Extract YYYY-MM
        monthSet.add(key);
      }
    });

    // Convert to sorted array of month options
    const months = Array.from(monthSet)
      .map(key => {
        const [year, month] = key.split('-').map(Number);
        return {
          year,
          month,
          label: `${MONTH_NAMES[month - 1]} ${year}`,
          value: key,
        };
      })
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });

    return months;
  }, [currentCoach, allSessions, allCompetitionCoaching]);

  // Set default selected month to most recent when available months change
  useState(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[0].value);
    }
  });

  // Parse selected month
  const { selectedYear, selectedMonthNum } = useMemo(() => {
    if (!selectedMonth) return { selectedYear: 0, selectedMonthNum: 0 };
    const [year, month] = selectedMonth.split('-').map(Number);
    return { selectedYear: year, selectedMonthNum: month };
  }, [selectedMonth]);

  // Fetch invoice data for selected month
  const { data: invoiceData, isLoading: isLoadingInvoice } = useQuery<InvoiceData>({
    queryKey: [`/api/invoices/${currentCoach?.id}/${selectedYear}/${selectedMonthNum}`],
    enabled: !!currentCoach && !!selectedMonth && selectedYear > 0 && selectedMonthNum > 0,
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    if (!invoiceData) return;

    const csvContent = [
      ['Invoice Data'],
      ['Coach', invoiceData.coachName],
      ['Qualification Level', invoiceData.qualificationLevel],
      ['Month', `${MONTH_NAMES[invoiceData.month - 1]} ${invoiceData.year}`],
      [],
      ['Rates'],
      ['Hourly Rate', `£${invoiceData.rates.hourlyRate.toFixed(2)}`],
      ['Session Writing Rate', `£${invoiceData.rates.sessionWritingRate.toFixed(2)}`],
      [],
      ['Coaching Hours'],
      ['Total Hours', invoiceData.coaching.totalHours.toFixed(2)],
      ['Session Hours', invoiceData.coaching.breakdown.sessionHours.toFixed(2)],
      ['Competition Hours', invoiceData.coaching.breakdown.competitionHours.toFixed(2)],
      ['Coaching Earnings', `£${invoiceData.coaching.earnings.toFixed(2)}`],
      [],
      ['Session Writing'],
      ['Sessions Written', invoiceData.sessionWriting.count.toString()],
      ['Writing Earnings', `£${invoiceData.sessionWriting.earnings.toFixed(2)}`],
      [],
      ['Totals'],
      ['Total Earnings', `£${invoiceData.totals.totalEarnings.toFixed(2)}`],
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoiceData.year}-${invoiceData.month.toString().padStart(2, '0')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!currentCoach) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Invoice Tracker</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">No coach profile found for your account.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (availableMonths.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Invoice Tracker</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              No coaching activity found. Sessions and competition coaching will appear here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 print:mb-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4 print:hidden"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-3xl font-bold">Invoice Tracker</h1>
          <div className="flex items-center gap-2 print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={!invoiceData}
              data-testid="button-export"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={!invoiceData}
              data-testid="button-print"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </div>

      {/* Month Selector */}
      <div className="mb-6 print:hidden">
        <label className="text-sm font-medium mb-2 block">Select Month</label>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-full sm:w-64" data-testid="select-month">
            <SelectValue placeholder="Select a month" />
          </SelectTrigger>
          <SelectContent>
            {availableMonths.map(month => (
              <SelectItem key={month.value} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Invoice Content */}
      <div ref={printRef}>
        {isLoadingInvoice ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : invoiceData ? (
          <div className="space-y-6">
            {/* Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Invoice Summary - {MONTH_NAMES[invoiceData.month - 1]} {invoiceData.year}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Coach</p>
                    <p className="font-medium" data-testid="text-coach-name">{invoiceData.coachName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Qualification Level</p>
                    <Badge variant="secondary" data-testid="badge-qualification">
                      {invoiceData.qualificationLevel}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Hourly Rate</p>
                    <p className="font-medium" data-testid="text-hourly-rate">£{invoiceData.rates.hourlyRate.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Session Writing Rate</p>
                    <p className="font-medium" data-testid="text-session-rate">£{invoiceData.rates.sessionWritingRate.toFixed(2)}</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      <span className="text-lg font-semibold">Total Earnings</span>
                    </div>
                    <span className="text-2xl font-bold text-primary" data-testid="text-total-earnings">
                      £{invoiceData.totals.totalEarnings.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Coaching Hours Section */}
            <Collapsible open={coachingOpen} onOpenChange={setCoachingOpen}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover-elevate" data-testid="toggle-coaching">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Coaching Hours
                      </CardTitle>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" data-testid="badge-coaching-hours">
                          {invoiceData.coaching.totalHours.toFixed(2)} hours
                        </Badge>
                        <Badge variant="secondary" data-testid="badge-coaching-earnings">
                          £{invoiceData.coaching.earnings.toFixed(2)}
                        </Badge>
                        {coachingOpen ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Session Coaching Hours</p>
                        <p className="font-medium" data-testid="text-session-hours">
                          {invoiceData.coaching.breakdown.sessionHours.toFixed(2)} hours
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Competition Coaching Hours</p>
                        <p className="font-medium" data-testid="text-competition-hours">
                          {invoiceData.coaching.breakdown.competitionHours.toFixed(2)} hours
                        </p>
                      </div>
                    </div>

                    {invoiceData.coaching.sessions.length > 0 && (
                      <div className="pt-4 border-t">
                        <p className="text-sm font-medium mb-2">Session Details ({invoiceData.coaching.sessions.length})</p>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {invoiceData.coaching.sessions.map((session, idx) => (
                            <div
                              key={session.sessionId}
                              className="flex items-center justify-between p-3 bg-muted rounded-md text-sm"
                              data-testid={`session-detail-${idx}`}
                            >
                              <div>
                                <p className="font-medium">{new Date(session.sessionDate).toLocaleDateString()}</p>
                                <p className="text-muted-foreground capitalize">{session.role} Coach</p>
                              </div>
                              <Badge variant="outline">{session.duration.toFixed(2)}h</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {invoiceData.coaching.competitions.length > 0 && (
                      <div className="pt-4 border-t">
                        <p className="text-sm font-medium mb-2">Competition Details ({invoiceData.coaching.competitions.length})</p>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {invoiceData.coaching.competitions.map((comp, idx) => (
                            <div
                              key={comp.coachingId}
                              className="flex items-center justify-between p-3 bg-muted rounded-md text-sm"
                              data-testid={`competition-detail-${idx}`}
                            >
                              <div>
                                <p className="font-medium">{new Date(comp.coachingDate).toLocaleDateString()}</p>
                                <p className="text-muted-foreground">Competition Coaching</p>
                              </div>
                              <Badge variant="outline">{comp.duration.toFixed(2)}h</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Session Writing Section */}
            <Collapsible open={sessionWritingOpen} onOpenChange={setSessionWritingOpen}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover-elevate" data-testid="toggle-writing">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Session Writing
                      </CardTitle>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" data-testid="badge-sessions-written">
                          {invoiceData.sessionWriting.count} sessions
                        </Badge>
                        <Badge variant="secondary" data-testid="badge-writing-earnings">
                          £{invoiceData.sessionWriting.earnings.toFixed(2)}
                        </Badge>
                        {sessionWritingOpen ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    {invoiceData.sessionWriting.sessions.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {invoiceData.sessionWriting.sessions.map((session, idx) => (
                          <div
                            key={session.sessionId}
                            className="flex items-center justify-between p-3 bg-muted rounded-md text-sm"
                            data-testid={`writing-detail-${idx}`}
                          >
                            <p className="font-medium">{new Date(session.sessionDate).toLocaleDateString()}</p>
                            <Badge variant="outline">Session Written</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No sessions written this month.</p>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>
        ) : (
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">No data available for selected month.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
