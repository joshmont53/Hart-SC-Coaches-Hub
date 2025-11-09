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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Plus, Users, Pencil, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import type { Swimmer, Squad } from "@shared/schema";
import { useState } from "react";

const swimmerFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  squadId: z.string().min(1, "Squad is required"),
  asaNumber: z.coerce.number().min(1, "ASA number is required"),
  dob: z.string().min(1, "Date of birth is required"),
});

type SwimmerFormValues = z.infer<typeof swimmerFormSchema>;

export default function Swimmers() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSwimmer, setEditingSwimmer] = useState<Swimmer | null>(null);
  const [deletingSwimmer, setDeletingSwimmer] = useState<Swimmer | null>(null);

  const { data: swimmers, isLoading } = useQuery<Swimmer[]>({ queryKey: ["/api/swimmers"] });
  const { data: squads } = useQuery<Squad[]>({ queryKey: ["/api/squads"] });

  const form = useForm<SwimmerFormValues>({
    resolver: zodResolver(swimmerFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      squadId: "",
      asaNumber: 0,
      dob: "",
    },
  });

  const createSwimmerMutation = useMutation({
    mutationFn: async (data: SwimmerFormValues) => {
      return await apiRequest("POST", "/api/swimmers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/swimmers"] });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to add swimmer", variant: "destructive" });
    },
  });

  const updateSwimmerMutation = useMutation({
    mutationFn: async (data: SwimmerFormValues & { id: string }) => {
      return await apiRequest("PATCH", `/api/swimmers/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/swimmers"] });
      toast({ title: "Success", description: "Swimmer updated successfully" });
      setEditingSwimmer(null);
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to update swimmer", variant: "destructive" });
    },
  });

  const deleteSwimmerMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/swimmers/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/swimmers"] });
      toast({ title: "Success", description: "Swimmer deleted successfully" });
      setDeletingSwimmer(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to delete swimmer", variant: "destructive" });
    },
  });

  const onSubmit = (data: SwimmerFormValues) => {
    if (editingSwimmer) {
      updateSwimmerMutation.mutate({ ...data, id: editingSwimmer.id });
    } else {
      createSwimmerMutation.mutate(data);
    }
  };

  const handleEdit = (swimmer: Swimmer) => {
    setEditingSwimmer(swimmer);
    setDialogOpen(true);
    form.reset({
      firstName: swimmer.firstName,
      lastName: swimmer.lastName,
      squadId: swimmer.squadId,
      asaNumber: swimmer.asaNumber,
      dob: swimmer.dob,
    });
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSwimmer(null);
    form.reset({
      firstName: "",
      lastName: "",
      squadId: undefined,
      asaNumber: 0,
      dob: "",
    });
  };

  const getSquadName = (squadId: string) => {
    const squad = squads?.find(s => s.id === squadId);
    return squad?.squadName || "Unknown Squad";
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
                <h1 className="text-2xl font-bold">Swimmers</h1>
                <p className="text-sm text-muted-foreground">Manage swimmers across all squads</p>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => { if (open) setDialogOpen(true); else handleCloseDialog(); }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-swimmer">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Swimmer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingSwimmer ? "Edit Swimmer" : "Add New Swimmer"}</DialogTitle>
                  <DialogDescription>
                    {editingSwimmer ? "Update the swimmer's details below" : "Enter the swimmer's details below"}
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
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="asaNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ASA Number</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} data-testid="input-asa-number" />
                            </FormControl>
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
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={handleCloseDialog}>
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createSwimmerMutation.isPending || updateSwimmerMutation.isPending} 
                        data-testid="button-submit-swimmer"
                      >
                        {editingSwimmer 
                          ? (updateSwimmerMutation.isPending ? "Updating..." : "Update Swimmer")
                          : (createSwimmerMutation.isPending ? "Adding..." : "Add Swimmer")
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
        ) : swimmers && swimmers.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {swimmers.map((swimmer) => (
              <Card key={swimmer.id} className="hover-elevate">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {swimmer.firstName} {swimmer.lastName}
                      </CardTitle>
                      <CardDescription className="text-sm mt-1">
                        ASA: {swimmer.asaNumber}
                      </CardDescription>
                      <CardDescription className="text-xs mt-1">
                        DOB: {swimmer.dob}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">{getSquadName(swimmer.squadId)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEdit(swimmer)}
                      data-testid={`button-edit-swimmer-${swimmer.id}`}
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setDeletingSwimmer(swimmer)}
                      data-testid={`button-delete-swimmer-${swimmer.id}`}
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
              <p className="text-muted-foreground">No swimmers added yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Click "Add Swimmer" to get started
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={!!deletingSwimmer} onOpenChange={() => setDeletingSwimmer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Swimmer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingSwimmer?.firstName} {deletingSwimmer?.lastName}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSwimmer && deleteSwimmerMutation.mutate(deletingSwimmer.id)}
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
