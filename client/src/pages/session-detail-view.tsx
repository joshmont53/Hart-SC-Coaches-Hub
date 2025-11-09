import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Session, Squad, Location, Coach, Swimmer, AttendanceRecord, SessionFocus } from '../lib/typeAdapters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Pencil, Trash2, Calendar as CalendarIcon, Clock, MapPin, ChevronRight, Target, Save } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { RichTextEditor } from '@/components/RichTextEditor';

interface SessionDetailProps {
  session: Session;
  squad: Squad | undefined;
  location: Location | undefined;
  coaches: Coach[];
  swimmers: Swimmer[];
  onBack: () => void;
}

type TabType = 'detail' | 'session' | 'attendance';
type AttendanceStatus = 'Present' | '1st half only' | '2nd half only' | 'Absent';
type AttendanceNote = '-' | 'Late' | 'Very Late';

const sessionFocusOptions: SessionFocus[] = [
  'Aerobic capacity',
  'Anaerobic capacity',
  'Speed',
  'Technique',
  'Recovery',
  'Starts & turns',
];

const attendanceStatusOptions: AttendanceStatus[] = [
  'Present',
  '1st half only',
  '2nd half only',
  'Absent',
];

const attendanceNoteOptions: AttendanceNote[] = ['-', 'Late', 'Very Late'];

export function SessionDetail({
  session,
  squad,
  location,
  coaches,
  swimmers,
  onBack,
}: SessionDetailProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('detail');
  const [isEditingSession, setIsEditingSession] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const formatSessionDate = (date: Date | string): string => {
    if (!date) return '';
    if (typeof date === 'string') return date;
    if (date instanceof Date && isValid(date)) {
      return format(date, 'yyyy-MM-dd');
    }
    return '';
  };

  const [editFormData, setEditFormData] = useState({
    date: formatSessionDate(session.date),
    startTime: session.startTime,
    endTime: session.endTime,
    poolId: session.poolId,
    focus: session.focus,
    leadCoachId: session.leadCoachId,
    secondCoachId: session.secondCoachId || '',
    helperId: session.helperId || '',
    setWriterId: session.setWriterId,
  });

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(
    session.attendance ||
      swimmers
        .filter((s) => s.squadId === session.squadId)
        .map((s) => ({
          swimmerId: s.id,
          status: 'Present' as AttendanceStatus,
          notes: '-' as AttendanceNote,
        }))
  );

  const [sessionContent, setSessionContent] = useState(() => {
    const content = session.content || '';
    if (content && !content.includes('<')) {
      return content.replace(/\n/g, '<br>');
    }
    return content;
  });

  const leadCoach = coaches.find((c) => c.id === session.leadCoachId);
  const secondCoach = coaches.find((c) => c.id === session.secondCoachId);
  const helper = coaches.find((c) => c.id === session.helperId);
  const setWriter = coaches.find((c) => c.id === session.setWriterId);

  const squadSwimmers = swimmers.filter((s) => s.squadId === session.squadId);

  const getCoachName = (coachId?: string) => {
    if (!coachId) return null;
    const coach = coaches.find((c) => c.id === coachId);
    return coach ? coach.name : 'Unknown';
  };

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return 'Duration unavailable';
    try {
      const [startHour, startMin] = start.split(':').map(Number);
      const [endHour, endMin] = end.split(':').map(Number);
      const durationMin = (endHour * 60 + endMin) - (startHour * 60 + startMin);
      const hours = Math.floor(durationMin / 60);
      const mins = durationMin % 60;
      return `${hours}h ${mins}m`;
    } catch {
      return 'Duration unavailable';
    }
  };

  const handleAttendanceChange = (
    swimmerId: string,
    field: 'status' | 'notes',
    value: string
  ) => {
    setAttendanceRecords((prev) =>
      prev.map((record) => {
        if (record.swimmerId === swimmerId) {
          if (field === 'status') {
            if (value === 'Absent') {
              return { ...record, status: value as AttendanceStatus, notes: '-' as AttendanceNote };
            }
            return { ...record, status: value as AttendanceStatus };
          }
          return { ...record, notes: value as AttendanceNote };
        }
        return record;
      })
    );
  };

  const updateAttendanceMutation = useMutation({
    mutationFn: async (attendance: AttendanceRecord[]) => {
      return await apiRequest('PUT', `/api/sessions/${session.id}`, { attendance });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      toast({
        title: 'Success',
        description: 'Attendance saved successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save attendance',
        variant: 'destructive',
      });
    },
  });

  const handleSaveAttendance = () => {
    updateAttendanceMutation.mutate(attendanceRecords);
  };

  const updateContentMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest('PUT', `/api/sessions/${session.id}`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      setIsEditingSession(false);
      toast({
        title: 'Success',
        description: 'Session content updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update session content',
        variant: 'destructive',
      });
    },
  });

  const handleSaveSession = () => {
    updateContentMutation.mutate(sessionContent);
  };

  const updateSessionMutation = useMutation({
    mutationFn: async (data: Partial<Session>) => {
      return await apiRequest('PUT', `/api/sessions/${session.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      setIsEditDialogOpen(false);
      toast({
        title: 'Success',
        description: 'Session updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update session',
        variant: 'destructive',
      });
    },
  });

  const handleEditClick = () => {
    setEditFormData({
      date: formatSessionDate(session.date),
      startTime: session.startTime,
      endTime: session.endTime,
      poolId: session.poolId,
      focus: session.focus,
      leadCoachId: session.leadCoachId,
      secondCoachId: session.secondCoachId || 'none',
      helperId: session.helperId || 'none',
      setWriterId: session.setWriterId,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editFormData.date || !editFormData.startTime || !editFormData.endTime || !editFormData.poolId || !editFormData.focus || !editFormData.leadCoachId || !editFormData.setWriterId) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    const sessionData: Partial<Session> = {
      date: new Date(editFormData.date),
      startTime: editFormData.startTime,
      endTime: editFormData.endTime,
      poolId: editFormData.poolId,
      focus: editFormData.focus as SessionFocus,
      leadCoachId: editFormData.leadCoachId,
      secondCoachId: editFormData.secondCoachId === 'none' ? undefined : editFormData.secondCoachId,
      helperId: editFormData.helperId === 'none' ? undefined : editFormData.helperId,
      setWriterId: editFormData.setWriterId,
    };

    updateSessionMutation.mutate(sessionData);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this session?')) {
      alert('Delete functionality coming soon!');
    }
  };

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto" data-testid="view-session-detail">
      <div className="flex-shrink-0">
        <div className="mb-4 md:mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
              <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="truncate">{squad?.name || 'Unknown Squad'} - {session.focus}</h1>
                <p className="text-sm text-muted-foreground">
                  {session.date && isValid(new Date(session.date)) ? format(session.date, 'EEEE, MMMM dd, yyyy') : 'Date unavailable'}
                </p>
              </div>
            </div>
            <Button variant="destructive" size="sm" onClick={handleDelete} className="flex-shrink-0" data-testid="button-delete">
              <Trash2 className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Delete</span>
            </Button>
          </div>
        </div>

        <div className="border-b">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('detail')}
              className={cn(
                'px-4 md:px-6 py-3 text-sm transition-colors relative',
                activeTab === 'detail'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              data-testid="tab-detail"
            >
              Detail
              {activeTab === 'detail' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('session')}
              className={cn(
                'px-4 md:px-6 py-3 text-sm transition-colors relative',
                activeTab === 'session'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              data-testid="tab-session"
            >
              Session
              {activeTab === 'session' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={cn(
                'px-4 md:px-6 py-3 text-sm transition-colors relative',
                activeTab === 'attendance'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              data-testid="tab-attendance"
            >
              Attendance
              {activeTab === 'attendance' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto mt-4 md:mt-6">
        {activeTab === 'detail' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2>Session Details</h2>
              <Button
                size="sm"
                variant="outline"
                onClick={handleEditClick}
                data-testid="button-edit-session"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-6">
                <div className="border rounded-lg p-6 bg-card">
                  <h3 className="mb-4">Basic Information</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Date</p>
                        <p>{session.date && isValid(new Date(session.date)) ? format(session.date, 'MMMM dd, yyyy') : 'Date unavailable'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Time</p>
                        <p>
                          {session.startTime} - {session.endTime} ({calculateDuration(session.startTime, session.endTime)})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Location</p>
                        <p>{location?.name || 'Unknown'} ({location?.poolType || 'Unknown'})</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Target className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Session Focus</p>
                        <Badge variant="secondary">{session.focus}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="border rounded-lg p-6 bg-card">
                  <h3 className="mb-4">Coaching Team</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Lead Coach</p>
                      <p>{getCoachName(session.leadCoachId)}</p>
                    </div>
                    {secondCoach && (
                      <div>
                        <p className="text-sm text-muted-foreground">Second Coach</p>
                        <p>{secondCoach?.name || 'Unknown'}</p>
                      </div>
                    )}
                    {helper && (
                      <div>
                        <p className="text-sm text-muted-foreground">Helper</p>
                        <p>{helper?.name || 'Unknown'}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Set Writer</p>
                      <p>{getCoachName(session.setWriterId)}</p>
                    </div>
                  </div>
                </div>

                {session.distanceBreakdown && (
                  <div className="border rounded-lg p-6 bg-card">
                    <div className="flex items-center gap-3">
                      <Target className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Distance</p>
                        <p className="text-2xl text-primary">{session.distanceBreakdown.total}m</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'session' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2>Session Content</h2>
              {isEditingSession ? (
                <Button 
                  size="sm" 
                  onClick={handleSaveSession}
                  data-testid="button-save-session"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setIsEditingSession(true);
                    setSidebarOpen(false);
                  }}
                  disabled={sidebarOpen}
                  data-testid="button-edit-session"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>

            <div className="relative">
              {isEditingSession ? (
                <RichTextEditor
                  value={sessionContent}
                  onChange={setSessionContent}
                  placeholder="Enter session content..."
                />
              ) : (
                <div className="border rounded-lg p-4 md:p-6 bg-card min-h-[400px]">
                  {sessionContent ? (
                    <div 
                      className="whitespace-pre-wrap font-sans text-sm"
                      dangerouslySetInnerHTML={{ __html: sessionContent }}
                    />
                  ) : (
                    <p className="text-muted-foreground">No session content yet. Click Edit to add session details.</p>
                  )}
                </div>
              )}

              {session.distanceBreakdown && !isEditingSession && (
                <>
                  {sidebarOpen && (
                    <div 
                      className="fixed inset-0 bg-black/50 z-40 md:hidden"
                      onClick={() => setSidebarOpen(false)}
                    />
                  )}

                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className={cn(
                      "absolute top-4 md:top-6 border bg-card p-2 rounded-l-lg shadow-lg hover:bg-accent transition-all z-50",
                      sidebarOpen ? "right-[280px] md:right-80" : "right-0"
                    )}
                    data-testid="button-toggle-sidebar"
                  >
                    <ChevronRight
                      className={cn(
                        "h-5 w-5 transition-transform",
                        sidebarOpen && "rotate-180"
                      )}
                    />
                  </button>

                  <div
                    className={cn(
                      "fixed md:absolute top-0 md:top-0 right-0 h-full md:h-auto border rounded-lg bg-card overflow-y-auto transition-all duration-300 ease-in-out z-50",
                      sidebarOpen ? "w-[280px] md:w-80 p-4 md:p-6" : "w-0 p-0"
                    )}
                  >
                    {sidebarOpen && (
                      <div className="space-y-4">
                        <div>
                          <h3>Distance Breakdown</h3>
                          <p className="text-sm text-muted-foreground">Stroke-by-stroke analysis</p>
                        </div>

                        <div className="space-y-3">
                          {session.distanceBreakdown.frontCrawl > 0 && session.distanceBreakdown.frontCrawlBreakdown && (
                            <div className="border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2 gap-2">
                                <span className="whitespace-nowrap">Front Crawl</span>
                                <span className="text-primary whitespace-nowrap">{session.distanceBreakdown.frontCrawl}m</span>
                              </div>
                              <div className="pl-3 space-y-1 text-sm text-muted-foreground">
                                <div className="flex justify-between">
                                  <span>Swim</span>
                                  <span>{session.distanceBreakdown.frontCrawlBreakdown.swim}m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Drill</span>
                                  <span>{session.distanceBreakdown.frontCrawlBreakdown.drill}m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Kick</span>
                                  <span>{session.distanceBreakdown.frontCrawlBreakdown.kick}m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Pull</span>
                                  <span>{session.distanceBreakdown.frontCrawlBreakdown.pull}m</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {session.distanceBreakdown.backstroke > 0 && session.distanceBreakdown.backstrokeBreakdown && (
                            <div className="border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2 gap-2">
                                <span className="whitespace-nowrap">Backstroke</span>
                                <span className="text-primary whitespace-nowrap">{session.distanceBreakdown.backstroke}m</span>
                              </div>
                              <div className="pl-3 space-y-1 text-sm text-muted-foreground">
                                <div className="flex justify-between">
                                  <span>Swim</span>
                                  <span>{session.distanceBreakdown.backstrokeBreakdown.swim}m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Drill</span>
                                  <span>{session.distanceBreakdown.backstrokeBreakdown.drill}m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Kick</span>
                                  <span>{session.distanceBreakdown.backstrokeBreakdown.kick}m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Pull</span>
                                  <span>{session.distanceBreakdown.backstrokeBreakdown.pull}m</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {session.distanceBreakdown.breaststroke > 0 && session.distanceBreakdown.breaststrokeBreakdown && (
                            <div className="border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2 gap-2">
                                <span className="whitespace-nowrap">Breaststroke</span>
                                <span className="text-primary whitespace-nowrap">{session.distanceBreakdown.breaststroke}m</span>
                              </div>
                              <div className="pl-3 space-y-1 text-sm text-muted-foreground">
                                <div className="flex justify-between">
                                  <span>Swim</span>
                                  <span>{session.distanceBreakdown.breaststrokeBreakdown.swim}m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Drill</span>
                                  <span>{session.distanceBreakdown.breaststrokeBreakdown.drill}m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Kick</span>
                                  <span>{session.distanceBreakdown.breaststrokeBreakdown.kick}m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Pull</span>
                                  <span>{session.distanceBreakdown.breaststrokeBreakdown.pull}m</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {session.distanceBreakdown.butterfly > 0 && session.distanceBreakdown.butterflyBreakdown && (
                            <div className="border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2 gap-2">
                                <span className="whitespace-nowrap">Butterfly</span>
                                <span className="text-primary whitespace-nowrap">{session.distanceBreakdown.butterfly}m</span>
                              </div>
                              <div className="pl-3 space-y-1 text-sm text-muted-foreground">
                                <div className="flex justify-between">
                                  <span>Swim</span>
                                  <span>{session.distanceBreakdown.butterflyBreakdown.swim}m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Drill</span>
                                  <span>{session.distanceBreakdown.butterflyBreakdown.drill}m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Kick</span>
                                  <span>{session.distanceBreakdown.butterflyBreakdown.kick}m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Pull</span>
                                  <span>{session.distanceBreakdown.butterflyBreakdown.pull}m</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {session.distanceBreakdown.individualMedley > 0 && session.distanceBreakdown.individualMedleyBreakdown && (
                            <div className="border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2 gap-2">
                                <span className="whitespace-nowrap">Individual Medley</span>
                                <span className="text-primary whitespace-nowrap">{session.distanceBreakdown.individualMedley}m</span>
                              </div>
                              <div className="pl-3 space-y-1 text-sm text-muted-foreground">
                                <div className="flex justify-between">
                                  <span>Swim</span>
                                  <span>{session.distanceBreakdown.individualMedleyBreakdown.swim}m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Drill</span>
                                  <span>{session.distanceBreakdown.individualMedleyBreakdown.drill}m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Kick</span>
                                  <span>{session.distanceBreakdown.individualMedleyBreakdown.kick}m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Pull</span>
                                  <span>{session.distanceBreakdown.individualMedleyBreakdown.pull}m</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2>Attendance Register</h2>
                <p className="text-sm text-muted-foreground">
                  {squadSwimmers.length} swimmers
                </p>
              </div>
              <Button onClick={handleSaveAttendance} size="sm" data-testid="button-save-attendance">
                <Save className="h-4 w-4 mr-2" />
                Save Attendance
              </Button>
            </div>

            <div className="border rounded-lg p-4 md:p-6 bg-card">
              <div className="space-y-2 md:space-y-3">
                {squadSwimmers.map((swimmer) => {
                  const record = attendanceRecords.find((r) => r.swimmerId === swimmer.id);
                  const status = record?.status || 'Present';
                  const notes = record?.notes || '-';
                  const isAbsent = status === 'Absent';

                  return (
                    <div
                      key={swimmer.id}
                      className="grid grid-cols-[1fr_auto_auto] md:grid-cols-[1fr_200px_150px] gap-2 md:gap-3 items-center p-2 md:p-3"
                      data-testid={`attendance-row-${swimmer.id}`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm md:text-base">
                          {swimmer.firstName} {swimmer.lastName}
                        </p>
                      </div>
                      <div>
                        <Select
                          value={status}
                          onValueChange={(value) =>
                            handleAttendanceChange(swimmer.id, 'status', value)
                          }
                        >
                          <SelectTrigger className="h-8 w-full text-xs md:text-sm" data-testid={`select-status-${swimmer.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {attendanceStatusOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Select
                          value={notes}
                          onValueChange={(value) =>
                            handleAttendanceChange(swimmer.id, 'notes', value)
                          }
                          disabled={isAbsent}
                        >
                          <SelectTrigger disabled={isAbsent} className="h-8 w-full text-xs md:text-sm" data-testid={`select-notes-${swimmer.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {attendanceNoteOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Session Details</DialogTitle>
            <DialogDescription>
              Update the session information below
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-date">Date *</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editFormData.date}
                  onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                  data-testid="input-edit-date"
                />
              </div>
              <div>
                <Label htmlFor="edit-focus">Focus *</Label>
                <Select
                  value={editFormData.focus}
                  onValueChange={(value) => setEditFormData({ ...editFormData, focus: value })}
                >
                  <SelectTrigger id="edit-focus" data-testid="select-edit-focus">
                    <SelectValue placeholder="Select focus" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessionFocusOptions.map((focus) => (
                      <SelectItem key={focus} value={focus}>
                        {focus}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-startTime">Start Time *</Label>
                <Input
                  id="edit-startTime"
                  type="time"
                  value={editFormData.startTime}
                  onChange={(e) => setEditFormData({ ...editFormData, startTime: e.target.value })}
                  data-testid="input-edit-start-time"
                />
              </div>
              <div>
                <Label htmlFor="edit-endTime">End Time *</Label>
                <Input
                  id="edit-endTime"
                  type="time"
                  value={editFormData.endTime}
                  onChange={(e) => setEditFormData({ ...editFormData, endTime: e.target.value })}
                  data-testid="input-edit-end-time"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-poolId">Location *</Label>
              <Select
                value={editFormData.poolId}
                onValueChange={(value) => setEditFormData({ ...editFormData, poolId: value })}
              >
                <SelectTrigger id="edit-poolId" data-testid="select-edit-pool">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {/* This will need to be populated with actual locations from props */}
                  <SelectItem value={session.poolId}>{location?.name || 'Current Location'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-leadCoachId">Lead Coach *</Label>
              <Select
                value={editFormData.leadCoachId}
                onValueChange={(value) => setEditFormData({ ...editFormData, leadCoachId: value })}
              >
                <SelectTrigger id="edit-leadCoachId" data-testid="select-edit-lead-coach">
                  <SelectValue placeholder="Select lead coach" />
                </SelectTrigger>
                <SelectContent>
                  {coaches.map((coach) => (
                    <SelectItem key={coach.id} value={coach.id}>
                      {coach.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-secondCoachId">Second Coach</Label>
              <Select
                value={editFormData.secondCoachId}
                onValueChange={(value) => setEditFormData({ ...editFormData, secondCoachId: value })}
              >
                <SelectTrigger id="edit-secondCoachId" data-testid="select-edit-second-coach">
                  <SelectValue placeholder="Select second coach (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {coaches.map((coach) => (
                    <SelectItem key={coach.id} value={coach.id}>
                      {coach.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-helperId">Helper</Label>
              <Select
                value={editFormData.helperId}
                onValueChange={(value) => setEditFormData({ ...editFormData, helperId: value })}
              >
                <SelectTrigger id="edit-helperId" data-testid="select-edit-helper">
                  <SelectValue placeholder="Select helper (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {coaches.map((coach) => (
                    <SelectItem key={coach.id} value={coach.id}>
                      {coach.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-setWriterId">Set Writer *</Label>
              <Select
                value={editFormData.setWriterId}
                onValueChange={(value) => setEditFormData({ ...editFormData, setWriterId: value })}
              >
                <SelectTrigger id="edit-setWriterId" data-testid="select-edit-set-writer">
                  <SelectValue placeholder="Select set writer" />
                </SelectTrigger>
                <SelectContent>
                  {coaches.map((coach) => (
                    <SelectItem key={coach.id} value={coach.id}>
                      {coach.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} data-testid="button-save-edit">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
