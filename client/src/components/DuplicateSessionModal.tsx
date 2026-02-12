import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Copy, ChevronDown, X, Loader2 } from "lucide-react";
import type { SwimmingSession, Squad, Coach, Location } from "@shared/schema";

type SessionFocus = 'Aerobic capacity' | 'Anaerobic capacity' | 'Speed' | 'Technique' | 'Recovery' | 'Starts & turns';

const sessionFocusOptions: SessionFocus[] = [
  'Aerobic capacity',
  'Anaerobic capacity',
  'Speed',
  'Technique',
  'Recovery',
  'Starts & turns',
];

interface DuplicateSessionModalProps {
  session: SwimmingSession;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDuplicated?: (newSessionId: string) => void;
}

export function DuplicateSessionModal({ session, open, onOpenChange, onDuplicated }: DuplicateSessionModalProps) {
  const { toast } = useToast();
  const { data: squads = [] } = useQuery<Squad[]>({ queryKey: ["/api/squads"] });
  const { data: coaches = [] } = useQuery<Coach[]>({ queryKey: ["/api/coaches"] });
  const { data: locations = [] } = useQuery<Location[]>({ queryKey: ["/api/locations"] });
  const activeSquads = squads.filter(s => s.recordStatus === "active");
  const activeCoaches = coaches.filter(c => c.recordStatus === "active");
  const activeLocations = locations.filter(l => l.recordStatus === "active");

  const [squadIds, setSquadIds] = useState<string[]>([]);
  const [sessionDate, setSessionDate] = useState(session.sessionDate);
  const [startTime, setStartTime] = useState(session.startTime);
  const [endTime, setEndTime] = useState(session.endTime);
  const [locationId, setLocationId] = useState(session.poolId);
  const [focus, setFocus] = useState(session.focus);
  const [leadCoachId, setLeadCoachId] = useState(session.leadCoachId);
  const [secondCoachId, setSecondCoachId] = useState(session.secondCoachId || "none");
  const [helperId, setHelperId] = useState(session.helperId || "none");
  const [setWriterId, setSetWriterId] = useState(session.setWriterId);
  const [squadDropdownOpen, setSquadDropdownOpen] = useState(false);
  const squadDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setSquadIds([]);
      setSessionDate(session.sessionDate);
      setStartTime(session.startTime);
      setEndTime(session.endTime);
      setLocationId(session.poolId);
      setFocus(session.focus);
      setLeadCoachId(session.leadCoachId);
      setSecondCoachId(session.secondCoachId || "none");
      setHelperId(session.helperId || "none");
      setSetWriterId(session.setWriterId);
      setSquadDropdownOpen(false);
    }
  }, [open, session]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (squadDropdownRef.current && !squadDropdownRef.current.contains(event.target as Node)) {
        setSquadDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleSquad = (squadId: string) => {
    setSquadIds(prev =>
      prev.includes(squadId)
        ? prev.filter(id => id !== squadId)
        : [...prev, squadId]
    );
  };

  const removeSquad = (squadId: string) => {
    setSquadIds(prev => prev.filter(id => id !== squadId));
  };

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/sessions/${session.id}/duplicate`, {
        squadIds,
        sessionDate,
        startTime,
        endTime,
        locationId,
        focus,
        leadCoachId,
        secondCoachId: secondCoachId !== "none" ? secondCoachId : null,
        helperId: helperId !== "none" ? helperId : null,
        setWriterId,
      });
      return res.json();
    },
    onSuccess: (newSession: SwimmingSession) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/session-squads"] });
      toast({
        title: "Session Duplicated",
        description: `Session has been duplicated to ${squadIds.length} squad${squadIds.length > 1 ? "s" : ""}.`,
      });
      onOpenChange(false);
      if (onDuplicated) {
        onDuplicated(newSession.id);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to duplicate session",
        variant: "destructive",
      });
    },
  });

  const canSubmit = squadIds.length > 0 && sessionDate && startTime && endTime && locationId && focus && leadCoachId && setWriterId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5" />
            Duplicate Session
          </DialogTitle>
          <DialogDescription>
            Create a copy of this session. All content and distances will be copied. Adjust the details below as needed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Squad(s) - not pre-populated */}
          <div className="space-y-2">
            <Label>
              Squad(s) <span className="text-destructive">*</span>
            </Label>
            <div ref={squadDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setSquadDropdownOpen(!squadDropdownOpen)}
                className="flex items-center justify-between w-full min-h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                data-testid="duplicate-select-squad"
              >
                <span className="text-muted-foreground">
                  {squadIds.length === 0
                    ? "Select squad(s)"
                    : `${squadIds.length} squad${squadIds.length > 1 ? "s" : ""} selected`}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </button>
              {squadDropdownOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
                  {activeSquads.map((squad) => (
                    <button
                      key={squad.id}
                      type="button"
                      onClick={() => toggleSquad(squad.id)}
                      className="flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm hover-elevate cursor-pointer"
                      data-testid={`duplicate-option-squad-${squad.id}`}
                    >
                      <div
                        className="h-4 w-4 rounded-sm border flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: squadIds.includes(squad.id) ? (squad.color || "hsl(var(--primary))") : "transparent",
                          borderColor: squad.color || "hsl(var(--primary))",
                        }}
                      >
                        {squadIds.includes(squad.id) && (
                          <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: squad.color }} />
                      {squad.squadName}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {squadIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {squadIds.map((squadId) => {
                  const squad = activeSquads.find(s => s.id === squadId);
                  if (!squad) return null;
                  return (
                    <Badge
                      key={squadId}
                      variant="secondary"
                      className="gap-1"
                      data-testid={`duplicate-badge-squad-${squadId}`}
                    >
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: squad.color }} />
                      {squad.squadName}
                      <button
                        type="button"
                        onClick={() => removeSquad(squadId)}
                        className="ml-0.5"
                        data-testid={`duplicate-remove-squad-${squadId}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="duplicate-date">
              Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="duplicate-date"
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              data-testid="duplicate-input-date"
            />
          </div>

          {/* Time Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="duplicate-start">
                Start Time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="duplicate-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                data-testid="duplicate-input-start-time"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duplicate-end">
                End Time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="duplicate-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                data-testid="duplicate-input-end-time"
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="duplicate-location">
              Location <span className="text-destructive">*</span>
            </Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger id="duplicate-location" data-testid="duplicate-select-location">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {activeLocations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.poolName} ({loc.poolType})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Session Focus */}
          <div className="space-y-2">
            <Label htmlFor="duplicate-focus">
              Session Focus <span className="text-destructive">*</span>
            </Label>
            <Select value={focus} onValueChange={setFocus}>
              <SelectTrigger id="duplicate-focus" data-testid="duplicate-select-focus">
                <SelectValue placeholder="Select focus" />
              </SelectTrigger>
              <SelectContent>
                {sessionFocusOptions.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lead Coach */}
          <div className="space-y-2">
            <Label htmlFor="duplicate-lead-coach">
              Lead Coach <span className="text-destructive">*</span>
            </Label>
            <Select value={leadCoachId} onValueChange={setLeadCoachId}>
              <SelectTrigger id="duplicate-lead-coach" data-testid="duplicate-select-lead-coach">
                <SelectValue placeholder="Select lead coach" />
              </SelectTrigger>
              <SelectContent>
                {activeCoaches.map((coach) => (
                  <SelectItem key={coach.id} value={coach.id}>
                    {coach.firstName} {coach.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Second Coach */}
          <div className="space-y-2">
            <Label htmlFor="duplicate-second-coach">Second Coach (Optional)</Label>
            <Select value={secondCoachId} onValueChange={setSecondCoachId}>
              <SelectTrigger id="duplicate-second-coach" data-testid="duplicate-select-second-coach">
                <SelectValue placeholder="Select second coach" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {activeCoaches.map((coach) => (
                  <SelectItem key={coach.id} value={coach.id}>
                    {coach.firstName} {coach.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Helper */}
          <div className="space-y-2">
            <Label htmlFor="duplicate-helper">Helper (Optional)</Label>
            <Select value={helperId} onValueChange={setHelperId}>
              <SelectTrigger id="duplicate-helper" data-testid="duplicate-select-helper">
                <SelectValue placeholder="Select helper" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {activeCoaches.map((coach) => (
                  <SelectItem key={coach.id} value={coach.id}>
                    {coach.firstName} {coach.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Set Writer */}
          <div className="space-y-2">
            <Label htmlFor="duplicate-set-writer">
              Set Writer <span className="text-destructive">*</span>
            </Label>
            <Select value={setWriterId} onValueChange={setSetWriterId}>
              <SelectTrigger id="duplicate-set-writer" data-testid="duplicate-select-set-writer">
                <SelectValue placeholder="Select set writer" />
              </SelectTrigger>
              <SelectContent>
                {activeCoaches.map((coach) => (
                  <SelectItem key={coach.id} value={coach.id}>
                    {coach.firstName} {coach.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={duplicateMutation.isPending}
            data-testid="duplicate-button-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={() => duplicateMutation.mutate()}
            disabled={!canSubmit || duplicateMutation.isPending}
            data-testid="duplicate-button-confirm"
          >
            {duplicateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Duplicating...
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate Session
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
