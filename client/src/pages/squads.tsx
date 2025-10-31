import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Plus, Users } from "lucide-react";
import { useLocation } from "wouter";
import type { Squad, Coach } from "@shared/schema";
import { useState } from "react";

const squadFormSchema = z.object({
  squadName: z.string().min(1, "Squad name is required"),
  primaryCoachId: z.string().min(1, "Primary coach is required"),
});

type SquadFormValues = z.infer<typeof squadFormSchema>;

export default function Squads() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: squads, isLoading } = useQuery<Squad[]>({ queryKey: ["/api/squads"] });
  const { data: coaches } = useQuery<Coach[]>({ queryKey: ["/api/coaches"] });

  const form = useForm<SquadFormValues>({
    resolver: zodResolver(squadFormSchema),
    defaultValues: {
      squadName: "",
      primaryCoachId: "",
    },
  });

  const createSquadMutation = useMutation({
    mutationFn: async (data: SquadFormValues) => {
      return await apiRequest("POST", "/api/squads", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/squads"] });
      toast({ title: "Success", description: "Squad created successfully" });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to create squad", variant: "destructive" });
    },
  });

  const onSubmit = (data: SquadFormValues) => {
    createSquadMutation.mutate(data);
  };

  const getCoachName = (coachId: string | null) => {
    if (!coachId || !coaches) return "N/A";
    const coach = coaches.find(c => c.id === coachId);
    return coach ? `${coach.firstName} ${coach.lastName}` : "N/A";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")} data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Squads</h1>
                <p className="text-sm text-muted-foreground">Manage training squads</p>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-squad">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Squad
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Squad</DialogTitle>
                  <DialogDescription>Enter the squad details below</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="squadName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Squad Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Senior Elite" data-testid="input-squad-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="primaryCoachId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Coach</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-primary-coach">
                                <SelectValue placeholder="Select primary coach" />
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
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createSquadMutation.isPending} data-testid="button-submit-squad">
                        {createSquadMutation.isPending ? "Creating..." : "Create Squad"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="h-28" />
            ))}
          </div>
        ) : squads && squads.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {squads.map((squad) => (
              <Card key={squad.id} className="hover-elevate">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{squad.squadName}</CardTitle>
                  <CardDescription className="text-sm">
                    Primary Coach: {getCoachName(squad.primaryCoachId)}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-muted/30">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No squads created yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Click "Add Squad" to get started
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
