import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Calendar, Clock, MapPin, Users, Target, Trash2, Save, Edit } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useState } from "react";
import type { SwimmingSession, Coach, Squad, Location, Swimmer, Attendance } from "@shared/schema";

export default function SessionDetail() {
  const [, params] = useRoute("/sessions/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const sessionId = params?.id;

  const [attendanceData, setAttendanceData] = useState<Record<string, { status: string; attended: boolean }>>({});

  const { data: session, isLoading } = useQuery<SwimmingSession>({
    queryKey: ["/api/sessions", sessionId],
    enabled: !!sessionId,
  });

  const { data: coaches } = useQuery<Coach[]>({ queryKey: ["/api/coaches"] });
  const { data: squads } = useQuery<Squad[]>({ queryKey: ["/api/squads"] });
  const { data: locations } = useQuery<Location[]>({ queryKey: ["/api/locations"] });
  const { data: swimmers } = useQuery<Swimmer[]>({ queryKey: ["/api/swimmers"] });
  const { data: attendance } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance", sessionId],
    enabled: !!sessionId,
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/sessions/${sessionId}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({
        title: "Success",
        description: "Session deleted successfully",
      });
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete session",
        variant: "destructive",
      });
    },
  });

  const saveAttendanceMutation = useMutation({
    mutationFn: async (data: { swimmerId: string; status: string }[]) => {
      await apiRequest("POST", `/api/attendance/${sessionId}`, { attendance: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance", sessionId] });
      toast({
        title: "Success",
        description: "Attendance saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save attendance",
        variant: "destructive",
      });
    },
  });

  const handleSaveAttendance = () => {
    const attendanceRecords = Object.entries(attendanceData)
      .filter(([_, data]) => data.attended)
      .map(([swimmerId, data]) => ({
        swimmerId,
        status: data.status,
      }));

    saveAttendanceMutation.mutate(attendanceRecords);
  };

  if (isLoading || !session) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card p-4">
          <Skeleton className="h-8 w-48" />
        </header>
        <div className="container mx-auto px-4 py-6 max-w-4xl space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const getCoachName = (coachId: string | null) => {
    if (!coachId || !coaches) return "N/A";
    const coach = coaches.find(c => c.id === coachId);
    return coach ? `${coach.firstName} ${coach.lastName}` : "N/A";
  };

  const getSquadName = (squadId: string) => {
    if (!squads) return "Loading...";
    const squad = squads.find(s => s.id === squadId);
    return squad?.squadName || "Unknown Squad";
  };

  const getLocationName = (poolId: string) => {
    if (!locations) return "Loading...";
    const location = locations.find(l => l.id === poolId);
    return location ? `${location.poolName} (${location.poolType})` : "Unknown Pool";
  };

  const squadSwimmers = swimmers?.filter(s => s.squadId === session.squadId) || [];

  const strokeData = [
    {
      name: "Front Crawl",
      swim: session.totalFrontCrawlSwim,
      drill: session.totalFrontCrawlDrill,
      kick: session.totalFrontCrawlKick,
      pull: session.totalFrontCrawlPull,
    },
    {
      name: "Backstroke",
      swim: session.totalBackstrokeSwim,
      drill: session.totalbackstrokeDrill,
      kick: session.totalBackstrokeKick,
      pull: session.totalbackstrokePull,
    },
    {
      name: "Breaststroke",
      swim: session.totalBreaststrokeSwim,
      drill: session.totalBreaststrokeDrill,
      kick: session.totalBreaststrokeKick,
      pull: session.totalBreaststrokePull,
    },
    {
      name: "Butterfly",
      swim: session.totalButterflySwim,
      drill: session.totalButterflyDrill,
      kick: session.totalButterflyKick,
      pull: session.totalButterflyPull,
    },
    {
      name: "IM",
      swim: session.totalIMSwim,
      drill: session.totalIMDrill,
      kick: session.totalIMKick,
      pull: session.totalIMPull,
    },
    {
      name: "No1 (Best Stroke)",
      swim: session.totalNo1Swim,
      drill: session.totalNo1Drill,
      kick: session.totalNo1Kick,
      pull: session.totalNo1Pull,
    },
  ].filter(stroke => stroke.swim + stroke.drill + stroke.kick + stroke.pull > 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Session Details</h1>
                <p className="text-sm text-muted-foreground">
                  {format(parseISO(session.sessionDate), "EEEE, MMMM d, yyyy")}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/sessions/${sessionId}/edit`}>
                <Button
                  variant="outline"
                  size="default"
                  data-testid="button-edit-session"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </Link>
              <Button
                variant="destructive"
                size="default"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this session?")) {
                    deleteSessionMutation.mutate();
                  }
                }}
                disabled={deleteSessionMutation.isPending}
                data-testid="button-delete-session"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {/* Session Info */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-xl mb-2">{getSquadName(session.squadId)}</CardTitle>
                <CardDescription>{getLocationName(session.poolId)}</CardDescription>
              </div>
              <Badge variant="secondary" className="text-sm">
                {session.focus}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground text-xs">Date</p>
                  <p className="font-medium">{format(parseISO(session.sessionDate), "MMMM d, yyyy")}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground text-xs">Time</p>
                  <p className="font-medium">{session.startTime} - {session.endTime} ({session.duration}h)</p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 pt-2 border-t">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Lead Coach</p>
                <p className="font-medium">{getCoachName(session.leadCoachId)}</p>
              </div>
              {session.secondCoachId && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Second Coach</p>
                  <p className="font-medium">{getCoachName(session.secondCoachId)}</p>
                </div>
              )}
              {session.helperId && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Helper</p>
                  <p className="font-medium">{getCoachName(session.helperId)}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Set Writer</p>
                <p className="font-medium">{getCoachName(session.setWriterId)}</p>
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Distance</p>
                  <p className="text-2xl font-bold text-primary">{session.totalDistance}m</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stroke Breakdown */}
        {strokeData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Distance Breakdown</CardTitle>
              <CardDescription>Stroke-by-stroke training distances</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {strokeData.map((stroke, index) => {
                  const total = stroke.swim + stroke.drill + stroke.kick + stroke.pull;
                  return (
                    <AccordionItem key={index} value={`stroke-${index}`}>
                      <AccordionTrigger className="text-base font-medium">
                        <div className="flex items-center justify-between w-full pr-4">
                          <span>{stroke.name}</span>
                          <span className="text-primary">{total}m</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                          <div>
                            <p className="text-xs text-muted-foreground">Swim</p>
                            <p className="text-lg font-semibold">{stroke.swim}m</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Drill</p>
                            <p className="text-lg font-semibold">{stroke.drill}m</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Kick</p>
                            <p className="text-lg font-semibold">{stroke.kick}m</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Pull</p>
                            <p className="text-lg font-semibold">{stroke.pull}m</p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>
        )}

        {/* Attendance */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle>Attendance</CardTitle>
                <CardDescription>
                  {squadSwimmers.length} swimmers in {getSquadName(session.squadId)}
                </CardDescription>
              </div>
              <Button
                size="default"
                onClick={handleSaveAttendance}
                disabled={saveAttendanceMutation.isPending}
                data-testid="button-save-attendance"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveAttendanceMutation.isPending ? "Saving..." : "Save Attendance"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {squadSwimmers.map((swimmer) => {
                const existingAttendance = attendance?.find(a => a.swimmerId === swimmer.id);
                const isAttended = attendanceData[swimmer.id]?.attended ?? !!existingAttendance;
                const status = attendanceData[swimmer.id]?.status ?? existingAttendance?.status ?? "Present";

                return (
                  <div
                    key={swimmer.id}
                    className="flex items-center justify-between gap-4 p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Checkbox
                        checked={isAttended}
                        onCheckedChange={(checked) => {
                          setAttendanceData(prev => ({
                            ...prev,
                            [swimmer.id]: {
                              attended: !!checked,
                              status: prev[swimmer.id]?.status ?? "Present",
                            },
                          }));
                        }}
                        data-testid={`checkbox-swimmer-${swimmer.id}`}
                      />
                      <div>
                        <p className="font-medium">
                          {swimmer.firstName} {swimmer.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">ASA: {swimmer.asaNumber}</p>
                      </div>
                    </div>
                    {isAttended && (
                      <Select
                        value={status}
                        onValueChange={(value) => {
                          setAttendanceData(prev => ({
                            ...prev,
                            [swimmer.id]: {
                              attended: true,
                              status: value,
                            },
                          }));
                        }}
                      >
                        <SelectTrigger className="w-[180px]" data-testid={`select-status-${swimmer.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Present">Present</SelectItem>
                          <SelectItem value="Late">Late</SelectItem>
                          <SelectItem value="Very Late">Very Late</SelectItem>
                          <SelectItem value="First Half Only">First Half Only</SelectItem>
                          <SelectItem value="Second Half Only">Second Half Only</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
