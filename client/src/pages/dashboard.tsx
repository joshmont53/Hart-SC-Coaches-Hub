import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar, MapPin, Users, Clock, Target, UserCheck } from "lucide-react";
import { Link } from "wouter";
import type { SwimmingSession, Coach, Squad, Location } from "@shared/schema";
import { format, parseISO, isFuture, isPast, isToday } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedCoachId, setSelectedCoachId] = useState<string>("");

  const { data: sessions, isLoading: sessionsLoading } = useQuery<SwimmingSession[]>({
    queryKey: ["/api/sessions"],
  });

  const { data: myCoach, isLoading: myCoachLoading } = useQuery<Coach>({
    queryKey: ["/api/coaches/me"],
    retry: false,
  });

  const { data: coaches } = useQuery<Coach[]>({
    queryKey: ["/api/coaches"],
  });

  const { data: squads } = useQuery<Squad[]>({
    queryKey: ["/api/squads"],
  });

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  // Helper functions to get related data
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

  const upcomingSessions = sessions?.filter(s => {
    const sessionDate = parseISO(s.sessionDate);
    return isFuture(sessionDate) || isToday(sessionDate);
  }).sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime()) || [];

  const pastSessions = sessions?.filter(s => {
    const sessionDate = parseISO(s.sessionDate);
    return isPast(sessionDate) && !isToday(sessionDate);
  }).sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()) || [];

  const linkCoachMutation = useMutation({
    mutationFn: async (coachId: string) => {
      await apiRequest("POST", `/api/coaches/link/${coachId}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coaches/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coaches"] });
      toast({
        title: "Success",
        description: "Coach profile linked successfully",
      });
      setSelectedCoachId("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to link coach profile",
        variant: "destructive",
      });
    },
  });

  const handleLinkCoach = () => {
    if (selectedCoachId) {
      linkCoachMutation.mutate(selectedCoachId);
    }
  };

  // Get unlinked coaches (coaches without userId or with current user's id)
  const unlinkedCoaches = coaches?.filter(c => !c.userId || c.userId === user?.id) || [];

  const SessionCard = ({ session }: { session: SwimmingSession }) => (
    <Link href={`/sessions/${session.id}`}>
      <Card className="hover-elevate active-elevate-2 cursor-pointer">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex-1">
              <CardTitle className="text-lg mb-1">
                {format(parseISO(session.sessionDate), "EEEE, MMMM d, yyyy")}
              </CardTitle>
              <CardDescription className="text-sm">
                {getSquadName(session.squadId)}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">
              {session.focus}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{session.startTime} - {session.endTime}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span className="truncate">{getLocationName(session.poolId)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>Lead: {getCoachName(session.leadCoachId)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Target className="w-4 h-4 text-primary" />
            <span className="font-medium">{session.totalDistance}m total</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  const SessionSkeleton = () => (
    <Card>
      <CardHeader className="pb-4">
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
    </Card>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <Card className="bg-muted/30">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Sessions</h1>
              <p className="text-sm text-muted-foreground">Welcome back, {user?.firstName || "Coach"}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/new-session">
                <Button size="default" data-testid="button-new-session">
                  <Plus className="w-4 h-4 mr-2" />
                  New Session
                </Button>
              </Link>
              <Button
                variant="outline"
                size="default"
                onClick={() => { window.location.href = "/api/logout"; }}
                data-testid="button-logout"
              >
                Log Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Coach Profile Linking */}
        {!myCoachLoading && !myCoach && unlinkedCoaches.length > 0 && (
          <Card className="mb-6 border-primary/50 bg-primary/5">
            <CardHeader>
              <div className="flex items-start gap-3">
                <UserCheck className="w-5 h-5 text-primary mt-1" />
                <div className="flex-1">
                  <CardTitle className="text-lg">Link Your Coach Profile</CardTitle>
                  <CardDescription className="mt-1">
                    Select your coach profile to personalize your dashboard and filter sessions
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 flex-wrap">
                <Select value={selectedCoachId} onValueChange={setSelectedCoachId}>
                  <SelectTrigger className="w-full md:w-80" data-testid="select-coach-profile">
                    <SelectValue placeholder="Select your coach profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {unlinkedCoaches.map((coach) => (
                      <SelectItem key={coach.id} value={coach.id}>
                        {coach.firstName} {coach.lastName} - {coach.level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleLinkCoach}
                  disabled={!selectedCoachId || linkCoachMutation.isPending}
                  data-testid="button-link-coach"
                >
                  {linkCoachMutation.isPending ? "Linking..." : "Link Profile"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {myCoach && (
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex items-center gap-3 text-sm">
                <UserCheck className="w-5 h-5 text-primary" />
                <span className="text-muted-foreground">Logged in as:</span>
                <span className="font-medium">{myCoach.firstName} {myCoach.lastName}</span>
                <Badge variant="secondary">{myCoach.level}</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="upcoming" data-testid="tab-upcoming">
              Upcoming Sessions
            </TabsTrigger>
            <TabsTrigger value="past" data-testid="tab-past">
              Past Sessions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {sessionsLoading ? (
              <>
                <SessionSkeleton />
                <SessionSkeleton />
                <SessionSkeleton />
              </>
            ) : upcomingSessions.length === 0 ? (
              <EmptyState message="No upcoming sessions scheduled" />
            ) : (
              upcomingSessions.map(session => (
                <SessionCard key={session.id} session={session} />
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {sessionsLoading ? (
              <>
                <SessionSkeleton />
                <SessionSkeleton />
                <SessionSkeleton />
              </>
            ) : pastSessions.length === 0 ? (
              <EmptyState message="No past sessions recorded" />
            ) : (
              pastSessions.map(session => (
                <SessionCard key={session.id} session={session} />
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Quick Links */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <Link href="/coaches">
            <Card className="hover-elevate active-elevate-2 cursor-pointer">
              <CardContent className="flex items-center gap-3 py-4">
                <Users className="w-5 h-5 text-primary" />
                <span className="font-medium">Manage Coaches</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/swimmers">
            <Card className="hover-elevate active-elevate-2 cursor-pointer">
              <CardContent className="flex items-center gap-3 py-4">
                <Users className="w-5 h-5 text-primary" />
                <span className="font-medium">Manage Swimmers</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/locations">
            <Card className="hover-elevate active-elevate-2 cursor-pointer">
              <CardContent className="flex items-center gap-3 py-4">
                <MapPin className="w-5 h-5 text-primary" />
                <span className="font-medium">Manage Locations</span>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
