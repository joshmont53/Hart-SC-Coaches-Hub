import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Plus, MapPin, Pencil, Trash2 } from "lucide-react";
import { useLocation as useRouterLocation } from "wouter";
import type { Location } from "@shared/schema";
import { useState } from "react";

const locationFormSchema = z.object({
  poolName: z.string().min(1, "Pool name is required"),
  poolType: z.string().min(1, "Pool type is required"),
});

type LocationFormValues = z.infer<typeof locationFormSchema>;

export default function Locations() {
  const [, navigate] = useRouterLocation();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);

  const { data: locations, isLoading } = useQuery<Location[]>({ queryKey: ["/api/locations"] });

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      poolName: "",
      poolType: "",
    },
  });

  const createLocationMutation = useMutation({
    mutationFn: async (data: LocationFormValues) => {
      return await apiRequest("POST", "/api/locations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to add location", variant: "destructive" });
    },
  });

  const updateLocationMutation = useMutation({
    mutationFn: async (data: LocationFormValues & { id: string }) => {
      return await apiRequest("PATCH", `/api/locations/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      setEditingLocation(null);
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to update location", variant: "destructive" });
    },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/locations/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      toast({ title: "Success", description: "Location deleted successfully" });
      setDeletingLocation(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to delete location", variant: "destructive" });
    },
  });

  const onSubmit = (data: LocationFormValues) => {
    if (editingLocation) {
      updateLocationMutation.mutate({ ...data, id: editingLocation.id });
    } else {
      createLocationMutation.mutate(data);
    }
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setDialogOpen(true);
    form.reset({
      poolName: location.poolName,
      poolType: location.poolType,
    });
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingLocation(null);
    form.reset({
      poolName: "",
      poolType: undefined,
    });
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
                <h1 className="text-2xl font-bold">Pool Locations</h1>
                <p className="text-sm text-muted-foreground">Manage training venues</p>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => { if (open) setDialogOpen(true); else handleCloseDialog(); }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-location">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Location
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingLocation ? "Edit Location" : "Add New Location"}</DialogTitle>
                  <DialogDescription>
                    {editingLocation ? "Update the pool details below" : "Enter the pool details below"}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="poolName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pool Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., City Aquatic Centre" data-testid="input-pool-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="poolType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pool Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-pool-type">
                                <SelectValue placeholder="Select pool type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="SC">SC (Short Course / 25m)</SelectItem>
                              <SelectItem value="LC">LC (Long Course / 50m)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={handleCloseDialog}>
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createLocationMutation.isPending || updateLocationMutation.isPending} 
                        data-testid="button-submit-location"
                      >
                        {editingLocation 
                          ? (updateLocationMutation.isPending ? "Updating..." : "Update Location")
                          : (createLocationMutation.isPending ? "Adding..." : "Add Location")
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
              <Card key={i} className="h-24" />
            ))}
          </div>
        ) : locations && locations.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {locations.map((location) => (
              <Card key={location.id} className="hover-elevate">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 flex-1">
                      <MapPin className="w-5 h-5 text-primary" />
                      <CardTitle className="text-lg">{location.poolName}</CardTitle>
                    </div>
                    <Badge variant="secondary">
                      {location.poolType === "SC" ? "25m" : "50m"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEdit(location)}
                      data-testid={`button-edit-location-${location.id}`}
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setDeletingLocation(location)}
                      data-testid={`button-delete-location-${location.id}`}
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
              <MapPin className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No locations added yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Click "Add Location" to get started
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={!!deletingLocation} onOpenChange={() => setDeletingLocation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingLocation?.poolName}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingLocation && deleteLocationMutation.mutate(deletingLocation.id)}
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
