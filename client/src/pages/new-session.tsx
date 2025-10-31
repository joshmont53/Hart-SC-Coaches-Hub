import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
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
  const { toast } = useToast();

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
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({
        title: "Success",
        description: "Session created successfully",
      });
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

  const DistanceInputs = ({ stroke, prefix }: { stroke: string; prefix: string }) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <FormField
        control={form.control}
        name={`${prefix}Swim` as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs">Swim (m)</FormLabel>
            <FormControl>
              <Input type="number" {...field} data-testid={`input-${prefix}-swim`} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={`${prefix}Drill` as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs">Drill (m)</FormLabel>
            <FormControl>
              <Input type="number" {...field} data-testid={`input-${prefix}-drill`} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={`${prefix}Kick` as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs">Kick (m)</FormLabel>
            <FormControl>
              <Input type="number" {...field} data-testid={`input-${prefix}-kick`} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={`${prefix}Pull` as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs">Pull (m)</FormLabel>
            <FormControl>
              <Input type="number" {...field} data-testid={`input-${prefix}-pull`} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

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
              <Card>
                <CardHeader>
                  <CardTitle>Distance Breakdown</CardTitle>
                  <CardDescription>
                    Enter the total distance (in meters) for each stroke and activity type
                  </CardDescription>
                  <div className="mt-4 p-4 bg-primary/10 rounded-lg">
                    <p className="text-sm font-medium">
                      Total Distance: <span className="text-lg text-primary">{totalDistance}m</span>
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" className="w-full" defaultValue={["front-crawl"]}>
                    <AccordionItem value="front-crawl">
                      <AccordionTrigger className="text-base font-medium">Front Crawl</AccordionTrigger>
                      <AccordionContent className="pt-4">
                        <DistanceInputs stroke="Front Crawl" prefix="totalFrontCrawl" />
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="backstroke">
                      <AccordionTrigger className="text-base font-medium">Backstroke</AccordionTrigger>
                      <AccordionContent className="pt-4">
                        <DistanceInputs stroke="Backstroke" prefix="totalBackstroke" />
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="breaststroke">
                      <AccordionTrigger className="text-base font-medium">Breaststroke</AccordionTrigger>
                      <AccordionContent className="pt-4">
                        <DistanceInputs stroke="Breaststroke" prefix="totalBreaststroke" />
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="butterfly">
                      <AccordionTrigger className="text-base font-medium">Butterfly</AccordionTrigger>
                      <AccordionContent className="pt-4">
                        <DistanceInputs stroke="Butterfly" prefix="totalButterfly" />
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="im">
                      <AccordionTrigger className="text-base font-medium">IM (Individual Medley)</AccordionTrigger>
                      <AccordionContent className="pt-4">
                        <DistanceInputs stroke="IM" prefix="totalIM" />
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="no1">
                      <AccordionTrigger className="text-base font-medium">No1 (Best Stroke)</AccordionTrigger>
                      <AccordionContent className="pt-4">
                        <DistanceInputs stroke="No1" prefix="totalNo1" />
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
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
                    Next: Distance Breakdown
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
