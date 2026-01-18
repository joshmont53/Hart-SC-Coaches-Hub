import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Play, User, Trash2, Pencil, Eye, ArrowLeft, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { insertDrillSchema } from '@shared/schema';
import type { Drill as BackendDrill, Coach } from '@shared/schema';

// Stroke types
type StrokeType = 'Freestyle' | 'Backstroke' | 'Breaststroke' | 'Butterfly' | 'Starts' | 'Turns';
const strokeTypes: StrokeType[] = ['Freestyle', 'Backstroke', 'Breaststroke', 'Butterfly', 'Starts', 'Turns'];

// Form schema based on insertDrillSchema
const drillFormSchema = insertDrillSchema
  .omit({ coachId: true }) // coachId will be added programmatically
  .extend({
    drillName: z.string().min(1, 'Drill name is required'),
    strokeType: z.string().min(1, 'Stroke type is required'),
    drillDescription: z.string().optional(),
    videoUrl: z.string().optional(),
  });

type DrillFormValues = z.infer<typeof drillFormSchema>;

interface DrillsLibraryProps {
  onBack: () => void;
}

export function DrillsLibrary({ onBack }: DrillsLibraryProps) {
  const { toast } = useToast();
  const [selectedStroke, setSelectedStroke] = useState<StrokeType>('Freestyle');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDrill, setSelectedDrill] = useState<BackendDrill | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [drillToDelete, setDrillToDelete] = useState<BackendDrill | null>(null);
  
  // Create form for creating new drills
  const createForm = useForm<DrillFormValues>({
    resolver: zodResolver(drillFormSchema),
    defaultValues: {
      drillName: '',
      strokeType: 'Freestyle',
      drillDescription: '',
      videoUrl: '',
    },
  });

  // Edit form for editing existing drills
  const editForm = useForm<DrillFormValues>({
    resolver: zodResolver(drillFormSchema),
    defaultValues: {
      drillName: '',
      strokeType: 'Freestyle',
      drillDescription: '',
      videoUrl: '',
    },
  });

  // Fetch drills
  const { data: drills = [], isLoading: drillsLoading } = useQuery<BackendDrill[]>({
    queryKey: ['/api/drills'],
  });

  // Fetch coaches for name lookup
  const { data: coaches = [] } = useQuery<Coach[]>({
    queryKey: ['/api/coaches'],
  });

  // Fetch current user's coach profile
  const { data: currentCoach } = useQuery<Coach>({
    queryKey: ['/api/coaches/me'],
  });

  // Create drill mutation
  const createMutation = useMutation({
    mutationFn: async (data: DrillFormValues) => {
      const res = await apiRequest('POST', '/api/drills', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drills'] });
      toast({ title: 'Drill created successfully!' });
      setIsCreateDialogOpen(false);
      createForm.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to create drill', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Update drill mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: DrillFormValues }) => {
      const res = await apiRequest('PATCH', `/api/drills/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drills'] });
      toast({ title: 'Drill updated successfully!' });
      setIsEditDialogOpen(false);
      setSelectedDrill(null);
      editForm.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to update drill', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Delete drill mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/drills/${id}`);
      if (res.status === 204 || res.headers.get('content-length') === '0') {
        return { message: 'Deleted', id };
      }
      const data = await res.json();
      return { ...data, id };
    },
    onSuccess: async (data, deletedId) => {
      queryClient.setQueryData<BackendDrill[]>(['/api/drills'], (oldData) => {
        return oldData ? oldData.filter(drill => drill.id !== deletedId) : [];
      });
      await queryClient.refetchQueries({ queryKey: ['/api/drills'] });
      toast({ title: 'Drill deleted successfully!' });
      setIsDeleteDialogOpen(false);
      setDrillToDelete(null);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to delete drill', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const filteredDrills = drills.filter(drill =>
    drill.strokeType === selectedStroke &&
    drill.drillName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCoachName = (coachId: string) => {
    const coach = coaches.find(c => c.id === coachId);
    return coach ? `${coach.firstName} ${coach.lastName}` : 'Unknown';
  };

  const getStrokeBadgeColor = (stroke: string) => {
    const colors: Record<string, string> = {
      'Freestyle': 'bg-blue-500',
      'Backstroke': 'bg-purple-500',
      'Breaststroke': 'bg-green-500',
      'Butterfly': 'bg-orange-500',
      'Starts': 'bg-red-500',
      'Turns': 'bg-teal-500',
    };
    return colors[stroke] || 'bg-gray-500';
  };

  const handleViewDrill = (drill: BackendDrill) => {
    setSelectedDrill(drill);
    setIsViewDialogOpen(true);
  };

  const handleCreateDrill = () => {
    createForm.reset({
      drillName: '',
      strokeType: selectedStroke,
      drillDescription: '',
      videoUrl: '',
    });
    setIsCreateDialogOpen(true);
  };

  const handleEditDrill = (drill: BackendDrill) => {
    setSelectedDrill(drill);
    editForm.reset({
      drillName: drill.drillName,
      strokeType: drill.strokeType,
      drillDescription: drill.drillDescription || '',
      videoUrl: drill.videoUrl || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteDrill = (drill: BackendDrill) => {
    setDrillToDelete(drill);
    setIsDeleteDialogOpen(true);
  };

  const onSubmitCreate = (values: DrillFormValues) => {
    createMutation.mutate(values);
  };

  const onSubmitEdit = (values: DrillFormValues) => {
    if (selectedDrill) {
      updateMutation.mutate({ id: selectedDrill.id, data: values });
    }
  };

  const confirmDelete = () => {
    if (drillToDelete) {
      deleteMutation.mutate(drillToDelete.id);
    }
  };

  // Helper to extract clean YouTube embed URL
  const getCleanVideoUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    
    // If it's an iframe, extract src
    const iframeMatch = url.match(/src=["']([^"']+)["']/);
    if (iframeMatch) {
      return iframeMatch[1];
    }
    
    return url.trim();
  };

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack}
            className="h-9 w-9 shrink-0"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold" data-testid="text-page-title">Drills Library</h2>
        </div>

        {/* Stroke Type Tabs */}
        <Tabs 
          value={selectedStroke} 
          onValueChange={(v) => setSelectedStroke(v as StrokeType)} 
          className="mb-4"
        >
          <TabsList className="grid w-full grid-cols-3 h-auto p-1 gap-1">
            {strokeTypes.map((stroke) => (
              <TabsTrigger 
                key={stroke} 
                value={stroke} 
                className="text-sm py-2"
                data-testid={`tab-${stroke.toLowerCase()}`}
              >
                {stroke}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex gap-2 items-center">
          <Input
            placeholder="Search drills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
            data-testid="input-search"
          />
          <Button 
            onClick={handleCreateDrill}
            data-testid="button-add-drill"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Drill
          </Button>
        </div>
      </div>

      {/* Drills Grid */}
      <div className="flex-1 overflow-auto overflow-x-hidden scroll-container">
        {drillsLoading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading drills...</p>
          </div>
        ) : filteredDrills.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No drills found</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'Try a different search term' : `Add your first ${selectedStroke.toLowerCase()} drill to get started`}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pb-6">
            {filteredDrills.map((drill) => (
              <Card 
                key={drill.id} 
                className="p-4 hover-elevate"
                data-testid={`card-drill-${drill.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 
                      className="font-semibold truncate mb-2"
                      data-testid={`text-drill-name-${drill.id}`}
                    >
                      {drill.drillName}
                    </h3>
                    <Badge 
                      className={`${getStrokeBadgeColor(drill.strokeType)} text-white text-xs`}
                      data-testid={`badge-stroke-${drill.id}`}
                    >
                      {drill.strokeType}
                    </Badge>
                  </div>
                  {drill.videoUrl && (
                    <Play className="h-5 w-5 text-primary flex-shrink-0 ml-2" />
                  )}
                </div>

                {drill.drillDescription && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {drill.drillDescription}
                  </p>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <User className="h-3 w-3" />
                  <span className="truncate">{getCoachName(drill.coachId)}</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDrill(drill)}
                    className="flex-1"
                    data-testid={`button-view-${drill.id}`}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  {drill.coachId === currentCoach?.id && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditDrill(drill)}
                        data-testid={`button-edit-${drill.id}`}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteDrill(drill)}
                        data-testid={`button-delete-${drill.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* View Drill Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="text-view-dialog-title">
              {selectedDrill?.drillName}
              {selectedDrill && (
                <Badge className={`${getStrokeBadgeColor(selectedDrill.strokeType)} text-white`}>
                  {selectedDrill.strokeType}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Created by {selectedDrill && getCoachName(selectedDrill.coachId)} on{' '}
              {selectedDrill && format(new Date(selectedDrill.createdAt), 'MMMM dd, yyyy')}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDrill?.drillDescription && (
            <div className="mb-4">
              <Label className="text-sm font-medium">Description</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedDrill.drillDescription}
              </p>
            </div>
          )}

          {selectedDrill?.videoUrl && getCleanVideoUrl(selectedDrill.videoUrl) && (
            <div>
              <Label className="text-sm font-medium">Video</Label>
              <div className="mt-2 aspect-video bg-black rounded-lg overflow-hidden">
                <iframe
                  src={getCleanVideoUrl(selectedDrill.videoUrl)!}
                  className="w-full h-full"
                  allowFullScreen
                  title={selectedDrill.drillName}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              onClick={() => setIsViewDialogOpen(false)}
              data-testid="button-close-view"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Drill Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle data-testid="text-create-dialog-title">Add New Drill</DialogTitle>
            <DialogDescription>
              Create a new drill for the library
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onSubmitCreate)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="drillName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Drill Name *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Catch-up Drill"
                        data-testid="input-drill-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="strokeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stroke Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-stroke-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {strokeTypes.map((stroke) => (
                          <SelectItem key={stroke} value={stroke}>
                            {stroke}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="drillDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ''}
                        placeholder="Describe the drill and its benefits..."
                        rows={3}
                        data-testid="textarea-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="videoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Video URL (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ''}
                        placeholder="Paste YouTube embed URL or full iframe code"
                        rows={2}
                        data-testid="textarea-video-url"
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">
                      Paste the YouTube embed URL or the full iframe code from YouTube's "Share → Embed"
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-submit-create"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Drill'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Drill Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle data-testid="text-edit-dialog-title">Edit Drill</DialogTitle>
            <DialogDescription>
              Make changes to your drill
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="drillName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Drill Name *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Catch-up Drill"
                        data-testid="input-edit-drill-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="strokeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stroke Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-stroke-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {strokeTypes.map((stroke) => (
                          <SelectItem key={stroke} value={stroke}>
                            {stroke}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="drillDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ''}
                        placeholder="Describe the drill and its benefits..."
                        rows={3}
                        data-testid="textarea-edit-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="videoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Video URL (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ''}
                        placeholder="Paste YouTube embed URL or full iframe code"
                        rows={2}
                        data-testid="textarea-edit-video-url"
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">
                      Paste the YouTube embed URL or the full iframe code from YouTube's "Share → Embed"
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-submit-edit"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{drillToDelete?.drillName}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
