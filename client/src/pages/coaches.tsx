import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Plus, Users, Pencil, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import type { Coach } from "@shared/schema";
import { useState } from "react";

const coachFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  level: z.string().min(1, "Level is required"),
  dob: z.string().min(1, "Date of birth is required"),
});

type CoachFormValues = z.infer<typeof coachFormSchema>;

export default function Coaches() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
  const [deletingCoach, setDeletingCoach] = useState<Coach | null>(null);

  const { data: coaches, isLoading } = useQuery<Coach[]>({
    queryKey: ["/api/coaches"],
  });

  const form = useForm<CoachFormValues>({
    resolver: zodResolver(coachFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      level: "",
      dob: "",
    },
  });

  const createCoachMutation = useMutation({
    mutationFn: async (data: CoachFormValues) => {
      return await apiRequest("POST", "/api/coaches", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coaches"] });
      toast({
        title: "Success",
        description: "Coach added successfully",
      });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add coach",
        variant: "destructive",
      });
    },
  });

  const updateCoachMutation = useMutation({
    mutationFn: async (data: CoachFormValues & { id: string }) => {
      return await apiRequest("PATCH", `/api/coaches/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coaches"] });
      toast({
        title: "Success",
        description: "Coach updated successfully",
      });
      setEditingCoach(null);
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update coach",
        variant: "destructive",
      });
    },
  });

  const deleteCoachMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/coaches/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coaches"] });
      toast({
        title: "Success",
        description: "Coach deleted successfully",
      });
      setDeletingCoach(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete coach",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CoachFormValues) => {
    if (editingCoach) {
      updateCoachMutation.mutate({ ...data, id: editingCoach.id });
    } else {
      createCoachMutation.mutate(data);
    }
  };

  const handleEdit = (coach: Coach) => {
    setEditingCoach(coach);
    setDialogOpen(true);
    form.reset({
      firstName: coach.firstName,
      lastName: coach.lastName,
      level: coach.level,
      dob: coach.dob,
    });
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCoach(null);
    form.reset({
      firstName: "",
      lastName: "",
      level: undefined,
      dob: "",
    });
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Level 3": return "default";
      case "Level 2": return "secondary";
      case "Level 1": return "outline";
      default: return "outline";
    }
  };

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
                <h1 className="text-2xl font-bold">Coaches</h1>
                <p className="text-sm text-muted-foreground">
                  Manage coaching staff
                </p>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => { if (open) setDialogOpen(true); else handleCloseDialog(); }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-coach">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Coach
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCoach ? "Edit Coach" : "Add New Coach"}</DialogTitle>
                  <DialogDescription>
                    {editingCoach ? "Update the coach's details below" : "Enter the coach's details below"}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-first-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-last-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Qualification Level</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-level">
                                <SelectValue placeholder="Select level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Level 3">Level 3</SelectItem>
                              <SelectItem value="Level 2">Level 2</SelectItem>
                              <SelectItem value="Level 1">Level 1</SelectItem>
                              <SelectItem value="No qualification">No qualification</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dob"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-dob" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCloseDialog}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createCoachMutation.isPending || updateCoachMutation.isPending}
                        data-testid="button-submit-coach"
                      >
                        {editingCoach 
                          ? (updateCoachMutation.isPending ? "Updating..." : "Update Coach")
                          : (createCoachMutation.isPending ? "Adding..." : "Add Coach")
                        }
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
              <Card key={i} className="h-32" />
            ))}
          </div>
        ) : coaches && coaches.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {coaches.map((coach) => (
              <Card key={coach.id} className="hover-elevate">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">
                        {coach.firstName} {coach.lastName}
                      </CardTitle>
                      <CardDescription className="text-sm mt-1">
                        DOB: {coach.dob}
                      </CardDescription>
                    </div>
                    <Badge variant={getLevelColor(coach.level) as any}>
                      {coach.level}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEdit(coach)}
                      data-testid={`button-edit-coach-${coach.id}`}
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setDeletingCoach(coach)}
                      data-testid={`button-delete-coach-${coach.id}`}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-muted/30">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No coaches added yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Click "Add Coach" to get started
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={!!deletingCoach} onOpenChange={() => setDeletingCoach(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Coach</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingCoach?.firstName} {deletingCoach?.lastName}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCoach && deleteCoachMutation.mutate(deletingCoach.id)}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
