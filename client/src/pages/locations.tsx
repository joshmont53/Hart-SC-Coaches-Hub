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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Plus, MapPin } from "lucide-react";
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
      toast({ title: "Success", description: "Location added successfully" });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to add location", variant: "destructive" });
    },
  });

  const onSubmit = (data: LocationFormValues) => {
    createLocationMutation.mutate(data);
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
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-location">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Location
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Location</DialogTitle>
                  <DialogDescription>Enter the pool details below</DialogDescription>
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
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createLocationMutation.isPending} data-testid="button-submit-location">
                        {createLocationMutation.isPending ? "Adding..." : "Add Location"}
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
    </div>
  );
}
