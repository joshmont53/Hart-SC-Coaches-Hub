import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, ArrowRight, Save, CheckCircle2, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import type { Coach, Squad, Location, Swimmer } from "@shared/schema";

const sessionFormSchema = z.object({
  sessionDate: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  poolId: z.string().min(1, "Pool is required"),
  squadId: z.string().min(1, "Squad is required"),
  leadCoachId: z.string().min(1, "Lead coach is required"),
  secondCoachId: z.string().optional(),
  helperId: z.string().optional(),
  setWriterId: z.string().min(1, "Set writer is required"),
  focus: z.string().min(1, "Session focus is required"),
  sessionContent: z.string().optional(),
  totalFrontCrawlSwim: z.coerce.number().min(0).default(0),
  totalFrontCrawlDrill: z.coerce.number().min(0).default(0),
  totalFrontCrawlKick: z.coerce.number().min(0).default(0),
  totalFrontCrawlPull: z.coerce.number().min(0).default(0),
  totalBackstrokeSwim: z.coerce.number().min(0).default(0),
  totalBackstrokeDrill: z.coerce.number().min(0).default(0),
  totalBackstrokeKick: z.coerce.number().min(0).default(0),
  totalBackstrokePull: z.coerce.number().min(0).default(0),
  totalBreaststrokeSwim: z.coerce.number().min(0).default(0),
  totalBreaststrokeDrill: z.coerce.number().min(0).default(0),
  totalBreaststrokeKick: z.coerce.number().min(0).default(0),
  totalBreaststrokePull: z.coerce.number().min(0).default(0),
  totalButterflySwim: z.coerce.number().min(0).default(0),
  totalButterflyDrill: z.coerce.number().min(0).default(0),
  totalButterflyKick: z.coerce.number().min(0).default(0),
  totalButterflyPull: z.coerce.number().min(0).default(0),
  totalIMSwim: z.coerce.number().min(0).default(0),
  totalIMDrill: z.coerce.number().min(0).default(0),
  totalIMKick: z.coerce.number().min(0).default(0),
  totalIMPull: z.coerce.number().min(0).default(0),
  totalNo1Swim: z.coerce.number().min(0).default(0),
  totalNo1Drill: z.coerce.number().min(0).default(0),
  totalNo1Kick: z.coerce.number().min(0).default(0),
  totalNo1Pull: z.coerce.number().min(0).default(0),
});

type SessionFormValues = z.infer<typeof sessionFormSchema>;

export default function NewSession() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [isParsing, setIsParsing] = useState(false);
  const { toast } = useToast();
  const parseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: coaches } = useQuery<Coach[]>({ queryKey: ["/api/coaches"] });
  const { data: squads } = useQuery<Squad[]>({ queryKey: ["/api/squads"] });
  const { data: locations } = useQuery<Location[]>({ queryKey: ["/api/locations"] });
  const { data: swimmers } = useQuery<Swimmer[]>({ queryKey: ["/api/swimmers"] });

  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      sessionDate: new Date().toISOString().split('T')[0],
      startTime: "19:00",
      endTime: "21:00",
      sessionContent: "",
      totalFrontCrawlSwim: 0,
      totalFrontCrawlDrill: 0,
      totalFrontCrawlKick: 0,
      totalFrontCrawlPull: 0,
      totalBackstrokeSwim: 0,
      totalBackstrokeDrill: 0,
      totalBackstrokeKick: 0,
      totalBackstrokePull: 0,
      totalBreaststrokeSwim: 0,
      totalBreaststrokeDrill: 0,
      totalBreaststrokeKick: 0,
      totalBreaststrokePull: 0,
      totalButterflySwim: 0,
      totalButterflyDrill: 0,
      totalButterflyKick: 0,
      totalButterflyPull: 0,
      totalIMSwim: 0,
      totalIMDrill: 0,
      totalIMKick: 0,
      totalIMPull: 0,
      totalNo1Swim: 0,
      totalNo1Drill: 0,
      totalNo1Kick: 0,
      totalNo1Pull: 0,
    },
  });

  // Watch session content and automatically parse it to update totals using AI
  const sessionContent = form.watch("sessionContent");
  
  useEffect(() => {
    if (sessionContent && sessionContent.trim()) {
      console.log('[AI Parse] Session content changed, length:', sessionContent.length);
      // Clear previous timeout
      if (parseTimeoutRef.current) {
        clearTimeout(parseTimeoutRef.current);
      }

      // Debounce: wait 800ms after user stops typing
      parseTimeoutRef.current = setTimeout(async () => {
        console.log('[AI Parse] Starting AI parsing...');
        setIsParsing(true);
        
        try {
          const response = await fetch('/api/sessions/parse-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionContent }),
            credentials: 'include',
          });

          console.log('[AI Parse] Response status:', response.status);

          if (!response.ok) {
            const errorText = await response.text();
            console.error('[AI Parse] Error response:', errorText);
            throw new Error('Failed to parse session');
          }

          const distances = await response.json();
          console.log('[AI Parse] Received distances:', distances);

          // Update all total fields with parsed values from AI
          form.setValue("totalFrontCrawlSwim", distances.totalFrontCrawlSwim);
          form.setValue("totalFrontCrawlDrill", distances.totalFrontCrawlDrill);
          form.setValue("totalFrontCrawlKick", distances.totalFrontCrawlKick);
          form.setValue("totalFrontCrawlPull", distances.totalFrontCrawlPull);
          form.setValue("totalBackstrokeSwim", distances.totalBackstrokeSwim);
          form.setValue("totalBackstrokeDrill", distances.totalBackstrokeDrill);
          form.setValue("totalBackstrokeKick", distances.totalBackstrokeKick);
          form.setValue("totalBackstrokePull", distances.totalBackstrokePull);
          form.setValue("totalBreaststrokeSwim", distances.totalBreaststrokeSwim);
          form.setValue("totalBreaststrokeDrill", distances.totalBreaststrokeDrill);
          form.setValue("totalBreaststrokeKick", distances.totalBreaststrokeKick);
          form.setValue("totalBreaststrokePull", distances.totalBreaststrokePull);
          form.setValue("totalButterflySwim", distances.totalButterflySwim);
          form.setValue("totalButterflyDrill", distances.totalButterflyDrill);
          form.setValue("totalButterflyKick", distances.totalButterflyKick);
          form.setValue("totalButterflyPull", distances.totalButterflyPull);
          form.setValue("totalIMSwim", distances.totalIMSwim);
          form.setValue("totalIMDrill", distances.totalIMDrill);
          form.setValue("totalIMKick", distances.totalIMKick);
          form.setValue("totalIMPull", distances.totalIMPull);
          form.setValue("totalNo1Swim", distances.totalNo1Swim);
          form.setValue("totalNo1Drill", distances.totalNo1Drill);
          form.setValue("totalNo1Kick", distances.totalNo1Kick);
          form.setValue("totalNo1Pull", distances.totalNo1Pull);

          console.log('[AI Parse] Form values updated successfully');
          setIsParsing(false);
        } catch (error) {
          console.error('[AI Parse] Failed to parse session:', error);
          setIsParsing(false);
          toast({
            title: "Parsing Error",
            description: "Could not calculate distances automatically. Please enter manually.",
            variant: "destructive",
          });
        }
      }, 800);
    } else {
      console.log('[AI Parse] Session content empty or whitespace only');
    }

    return () => {
      if (parseTimeoutRef.current) {
        clearTimeout(parseTimeoutRef.current);
      }
    };
  }, [sessionContent, form, toast]);

  const createSessionMutation = useMutation({
    mutationFn: async (data: SessionFormValues) => {
      const startParts = data.startTime.split(':');
      const endParts = data.endTime.split(':');
      const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
      const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
      const duration = ((endMinutes - startMinutes) / 60).toFixed(2);

      const totalDistance = 
        data.totalFrontCrawlSwim + data.totalFrontCrawlDrill + data.totalFrontCrawlKick + data.totalFrontCrawlPull +
        data.totalBackstrokeSwim + data.totalBackstrokeDrill + data.totalBackstrokeKick + data.totalBackstrokePull +
        data.totalBreaststrokeSwim + data.totalBreaststrokeDrill + data.totalBreaststrokeKick + data.totalBreaststrokePull +
        data.totalButterflySwim + data.totalButterflyDrill + data.totalButterflyKick + data.totalButterflyPull +
        data.totalIMSwim + data.totalIMDrill + data.totalIMKick + data.totalIMPull +
        data.totalNo1Swim + data.totalNo1Drill + data.totalNo1Kick + data.totalNo1Pull;

      const payload = {
        ...data,
        secondCoachId: data.secondCoachId === "none" ? undefined : data.secondCoachId,
        helperId: data.helperId === "none" ? undefined : data.helperId,
        duration,
        totalDistance,
      };

      const response = await apiRequest("POST", "/api/sessions", payload);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      navigate(`/sessions/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create session",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SessionFormValues) => {
    console.log('[Form Submit] onSubmit called with data:', data);
    console.log('[Form Submit] Session content length:', data.sessionContent?.length || 0);
    console.log('[Form Submit] Total distance calculated:', 
      data.totalFrontCrawlSwim + data.totalFrontCrawlDrill + data.totalFrontCrawlKick + data.totalFrontCrawlPull +
      data.totalBackstrokeSwim + data.totalBackstrokeDrill + data.totalBackstrokeKick + data.totalBackstrokePull +
      data.totalBreaststrokeSwim + data.totalBreaststrokeDrill + data.totalBreaststrokeKick + data.totalBreaststrokePull +
      data.totalButterflySwim + data.totalButterflyDrill + data.totalButterflyKick + data.totalButterflyPull +
      data.totalIMSwim + data.totalIMDrill + data.totalIMKick + data.totalIMPull +
      data.totalNo1Swim + data.totalNo1Drill + data.totalNo1Kick + data.totalNo1Pull
    );
    console.log('[Form Submit] Form errors:', form.formState.errors);
    createSessionMutation.mutate(data);
  };

  const values = form.watch();
  const totalDistance = 
    (values.totalFrontCrawlSwim || 0) + (values.totalFrontCrawlDrill || 0) + (values.totalFrontCrawlKick || 0) + (values.totalFrontCrawlPull || 0) +
    (values.totalBackstrokeSwim || 0) + (values.totalBackstrokeDrill || 0) + (values.totalBackstrokeKick || 0) + (values.totalBackstrokePull || 0) +
    (values.totalBreaststrokeSwim || 0) + (values.totalBreaststrokeDrill || 0) + (values.totalBreaststrokeKick || 0) + (values.totalBreaststrokePull || 0) +
    (values.totalButterflySwim || 0) + (values.totalButterflyDrill || 0) + (values.totalButterflyKick || 0) + (values.totalButterflyPull || 0) +
    (values.totalIMSwim || 0) + (values.totalIMDrill || 0) + (values.totalIMKick || 0) + (values.totalIMPull || 0) +
    (values.totalNo1Swim || 0) + (values.totalNo1Drill || 0) + (values.totalNo1Kick || 0) + (values.totalNo1Pull || 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
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
              <h1 className="text-2xl font-bold">Create New Session</h1>
              <p className="text-sm text-muted-foreground">
                Step {step} of 2 - {step === 1 ? "Session Details" : "Distance Breakdown"}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Enter the core details about this training session</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="sessionDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Session Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="poolId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pool Location</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-pool">
                                <SelectValue placeholder="Select pool" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {locations?.map((location) => (
                                <SelectItem key={location.id} value={location.id}>
                                  {location.poolName} ({location.poolType})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} data-testid="input-start-time" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} data-testid="input-end-time" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="squadId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Squad</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-squad">
                                <SelectValue placeholder="Select squad" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {squads?.map((squad) => (
                                <SelectItem key={squad.id} value={squad.id}>
                                  {squad.squadName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="leadCoachId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lead Coach</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-lead-coach">
                                <SelectValue placeholder="Select lead coach" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {coaches?.map((coach) => (
                                <SelectItem key={coach.id} value={coach.id}>
                                  {coach.firstName} {coach.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="secondCoachId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Second Coach (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-second-coach">
                                <SelectValue placeholder="Select second coach" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {coaches?.map((coach) => (
                                <SelectItem key={coach.id} value={coach.id}>
                                  {coach.firstName} {coach.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="helperId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Helper (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-helper">
                                <SelectValue placeholder="Select helper" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {coaches?.map((coach) => (
                                <SelectItem key={coach.id} value={coach.id}>
                                  {coach.firstName} {coach.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="setWriterId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Set Writer</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-set-writer">
                                <SelectValue placeholder="Select set writer" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {coaches?.map((coach) => (
                                <SelectItem key={coach.id} value={coach.id}>
                                  {coach.firstName} {coach.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="focus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Session Focus</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-focus">
                              <SelectValue placeholder="Select focus" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Aerobic capacity">Aerobic Capacity</SelectItem>
                            <SelectItem value="Anaerobic capacity">Anaerobic Capacity</SelectItem>
                            <SelectItem value="Speed">Speed</SelectItem>
                            <SelectItem value="Technique">Technique</SelectItem>
                            <SelectItem value="Recovery">Recovery</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Session Text Entry */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Session Content</CardTitle>
                    <CardDescription>
                      Write or paste your full session - distances will be calculated automatically
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="sessionContent"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Example:&#10;Warm up&#10;4 x 100m FC swim @ 1:30&#10;200m BK kick&#10;&#10;Main set&#10;8 x 50m Fly @ 0:50"
                              className="min-h-[500px] font-mono text-sm"
                              data-testid="textarea-session-content"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* AI Parsing Status */}
                    {isParsing && (
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                          <span>Analyzing session...</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Calculated Totals */}
                <Card>
                  <CardHeader>
                    <CardTitle>Calculated Totals</CardTitle>
                    <CardDescription>Auto-calculated from session text</CardDescription>
                    <div className="mt-4 p-4 bg-primary/10 rounded-lg">
                      <p className="text-sm font-medium">
                        Total Distance: <span className="text-2xl text-primary font-bold">{totalDistance}m</span>
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 text-sm">
                      {/* Front Crawl */}
                      {(values.totalFrontCrawlSwim || values.totalFrontCrawlDrill || values.totalFrontCrawlKick || values.totalFrontCrawlPull) > 0 && (
                        <div>
                          <p className="font-semibold text-foreground mb-1">Front Crawl</p>
                          <div className="space-y-0.5 text-muted-foreground">
                            {values.totalFrontCrawlSwim > 0 && <p className="flex justify-between"><span>Swim:</span><span>{values.totalFrontCrawlSwim}m</span></p>}
                            {values.totalFrontCrawlDrill > 0 && <p className="flex justify-between"><span>Drill:</span><span>{values.totalFrontCrawlDrill}m</span></p>}
                            {values.totalFrontCrawlKick > 0 && <p className="flex justify-between"><span>Kick:</span><span>{values.totalFrontCrawlKick}m</span></p>}
                            {values.totalFrontCrawlPull > 0 && <p className="flex justify-between"><span>Pull:</span><span>{values.totalFrontCrawlPull}m</span></p>}
                          </div>
                        </div>
                      )}

                      {/* Backstroke */}
                      {(values.totalBackstrokeSwim || values.totalBackstrokeDrill || values.totalBackstrokeKick || values.totalBackstrokePull) > 0 && (
                        <div>
                          <p className="font-semibold text-foreground mb-1">Backstroke</p>
                          <div className="space-y-0.5 text-muted-foreground">
                            {values.totalBackstrokeSwim > 0 && <p className="flex justify-between"><span>Swim:</span><span>{values.totalBackstrokeSwim}m</span></p>}
                            {values.totalBackstrokeDrill > 0 && <p className="flex justify-between"><span>Drill:</span><span>{values.totalBackstrokeDrill}m</span></p>}
                            {values.totalBackstrokeKick > 0 && <p className="flex justify-between"><span>Kick:</span><span>{values.totalBackstrokeKick}m</span></p>}
                            {values.totalBackstrokePull > 0 && <p className="flex justify-between"><span>Pull:</span><span>{values.totalBackstrokePull}m</span></p>}
                          </div>
                        </div>
                      )}

                      {/* Breaststroke */}
                      {(values.totalBreaststrokeSwim || values.totalBreaststrokeDrill || values.totalBreaststrokeKick || values.totalBreaststrokePull) > 0 && (
                        <div>
                          <p className="font-semibold text-foreground mb-1">Breaststroke</p>
                          <div className="space-y-0.5 text-muted-foreground">
                            {values.totalBreaststrokeSwim > 0 && <p className="flex justify-between"><span>Swim:</span><span>{values.totalBreaststrokeSwim}m</span></p>}
                            {values.totalBreaststrokeDrill > 0 && <p className="flex justify-between"><span>Drill:</span><span>{values.totalBreaststrokeDrill}m</span></p>}
                            {values.totalBreaststrokeKick > 0 && <p className="flex justify-between"><span>Kick:</span><span>{values.totalBreaststrokeKick}m</span></p>}
                            {values.totalBreaststrokePull > 0 && <p className="flex justify-between"><span>Pull:</span><span>{values.totalBreaststrokePull}m</span></p>}
                          </div>
                        </div>
                      )}

                      {/* Butterfly */}
                      {(values.totalButterflySwim || values.totalButterflyDrill || values.totalButterflyKick || values.totalButterflyPull) > 0 && (
                        <div>
                          <p className="font-semibold text-foreground mb-1">Butterfly</p>
                          <div className="space-y-0.5 text-muted-foreground">
                            {values.totalButterflySwim > 0 && <p className="flex justify-between"><span>Swim:</span><span>{values.totalButterflySwim}m</span></p>}
                            {values.totalButterflyDrill > 0 && <p className="flex justify-between"><span>Drill:</span><span>{values.totalButterflyDrill}m</span></p>}
                            {values.totalButterflyKick > 0 && <p className="flex justify-between"><span>Kick:</span><span>{values.totalButterflyKick}m</span></p>}
                            {values.totalButterflyPull > 0 && <p className="flex justify-between"><span>Pull:</span><span>{values.totalButterflyPull}m</span></p>}
                          </div>
                        </div>
                      )}

                      {/* IM */}
                      {(values.totalIMSwim || values.totalIMDrill || values.totalIMKick || values.totalIMPull) > 0 && (
                        <div>
                          <p className="font-semibold text-foreground mb-1">IM</p>
                          <div className="space-y-0.5 text-muted-foreground">
                            {values.totalIMSwim > 0 && <p className="flex justify-between"><span>Swim:</span><span>{values.totalIMSwim}m</span></p>}
                            {values.totalIMDrill > 0 && <p className="flex justify-between"><span>Drill:</span><span>{values.totalIMDrill}m</span></p>}
                            {values.totalIMKick > 0 && <p className="flex justify-between"><span>Kick:</span><span>{values.totalIMKick}m</span></p>}
                            {values.totalIMPull > 0 && <p className="flex justify-between"><span>Pull:</span><span>{values.totalIMPull}m</span></p>}
                          </div>
                        </div>
                      )}

                      {/* No1 (Best Stroke) */}
                      {(values.totalNo1Swim || values.totalNo1Drill || values.totalNo1Kick || values.totalNo1Pull) > 0 && (
                        <div>
                          <p className="font-semibold text-foreground mb-1">Choice (No1)</p>
                          <div className="space-y-0.5 text-muted-foreground">
                            {values.totalNo1Swim > 0 && <p className="flex justify-between"><span>Swim:</span><span>{values.totalNo1Swim}m</span></p>}
                            {values.totalNo1Drill > 0 && <p className="flex justify-between"><span>Drill:</span><span>{values.totalNo1Drill}m</span></p>}
                            {values.totalNo1Kick > 0 && <p className="flex justify-between"><span>Kick:</span><span>{values.totalNo1Kick}m</span></p>}
                            {values.totalNo1Pull > 0 && <p className="flex justify-between"><span>Pull:</span><span>{values.totalNo1Pull}m</span></p>}
                          </div>
                        </div>
                      )}

                      {totalDistance === 0 && (
                        <p className="text-muted-foreground text-center py-8">
                          Start typing your session to see calculated totals
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Navigation Footer */}
            <div className="flex items-center justify-between gap-4 pt-4">
              {step === 1 ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/")}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setStep(2)}
                    data-testid="button-next"
                  >
                    Next: Session Content
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    data-testid="button-previous"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={createSessionMutation.isPending}
                    data-testid="button-create-session"
                    onClick={() => {
                      console.log('[Button Click] Create Session clicked');
                      console.log('[Button Click] Form state:', {
                        isValid: form.formState.isValid,
                        isSubmitting: form.formState.isSubmitting,
                        errors: form.formState.errors,
                        values: form.getValues()
                      });
                    }}
                  >
                    {createSessionMutation.isPending ? (
                      "Creating..."
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Create Session
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
