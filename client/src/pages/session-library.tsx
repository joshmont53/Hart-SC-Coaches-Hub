import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
import { Plus, FileText, User, Calendar, Trash2, Pencil, Eye, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { RichTextEditor } from '@/components/RichTextEditor';
import { insertSessionTemplateSchema } from '@shared/schema';
import type { SessionTemplate as BackendTemplate, Coach } from '@shared/schema';

// Form schema based on insertSessionTemplateSchema with additional validation
const templateFormSchema = insertSessionTemplateSchema
  .omit({ coachId: true }) // coachId will be added programmatically
  .extend({
    templateName: z.string().min(1, 'Template name is required'),
    templateDescription: z.string().optional(),
    sessionContent: z.string().min(1, 'Session content is required'),
    sessionContentHtml: z.string().optional(),
  });

type TemplateFormValues = z.infer<typeof templateFormSchema>;

interface SessionLibraryProps {
  onBack: () => void;
}

export function SessionLibrary({ onBack }: SessionLibraryProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'mine'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<BackendTemplate | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<BackendTemplate | null>(null);
  
  // Create form for creating new templates
  const createForm = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      templateName: '',
      templateDescription: '',
      sessionContent: '',
      sessionContentHtml: '',
    },
  });

  // Edit form for editing existing templates
  const editForm = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      templateName: '',
      templateDescription: '',
      sessionContent: '',
      sessionContentHtml: '',
    },
  });

  // Fetch templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery<BackendTemplate[]>({
    queryKey: ['/api/session-templates'],
  });

  // Fetch coaches for name lookup
  const { data: coaches = [] } = useQuery<Coach[]>({
    queryKey: ['/api/coaches'],
  });

  // Fetch current user's coach profile
  const { data: currentCoach } = useQuery<Coach>({
    queryKey: ['/api/coaches/me'],
  });

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: async (data: TemplateFormValues & { coachId: string }) => {
      const res = await apiRequest('POST', '/api/session-templates', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/session-templates'] });
      toast({ title: 'Template created successfully!' });
      setIsCreateDialogOpen(false);
      createForm.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to create template', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TemplateFormValues }) => {
      const res = await apiRequest('PATCH', `/api/session-templates/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/session-templates'] });
      toast({ title: 'Template updated successfully!' });
      setIsEditDialogOpen(false);
      setSelectedTemplate(null);
      editForm.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to update template', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/session-templates/${id}`);
      // Handle 204 No Content or other empty responses
      if (res.status === 204 || res.headers.get('content-length') === '0') {
        return { message: 'Deleted', id };
      }
      // Otherwise parse JSON response
      const data = await res.json();
      return { ...data, id };
    },
    onSuccess: async (data, deletedId) => {
      // Optimistically update cache by removing the deleted template
      queryClient.setQueryData<BackendTemplate[]>(['/api/session-templates'], (oldData) => {
        return oldData ? oldData.filter(template => template.id !== deletedId) : [];
      });
      
      // Then refetch to ensure consistency with server
      await queryClient.refetchQueries({ queryKey: ['/api/session-templates'] });
      
      toast({ title: 'Template deleted successfully!' });
      setIsDeleteDialogOpen(false);
      setTemplateToDelete(null);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to delete template', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = 
      template.templateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.templateDescription?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesFilter = filterMode === 'all' || template.coachId === currentCoach?.id;
    return matchesSearch && matchesFilter;
  });

  const getCoachName = (coachId: string) => {
    const coach = coaches.find(c => c.id === coachId);
    return coach ? `${coach.firstName} ${coach.lastName}` : 'Unknown';
  };

  const isOwner = (template: BackendTemplate) => {
    return template.coachId === currentCoach?.id;
  };

  const handleViewTemplate = (template: BackendTemplate) => {
    setSelectedTemplate(template);
    setIsViewDialogOpen(true);
  };

  const handleCreateTemplate = () => {
    createForm.reset({
      templateName: '',
      templateDescription: '',
      sessionContent: '',
      sessionContentHtml: '',
    });
    setIsCreateDialogOpen(true);
  };

  const handleEditTemplate = (template: BackendTemplate) => {
    setSelectedTemplate(template);
    editForm.reset({
      templateName: template.templateName,
      templateDescription: template.templateDescription || '',
      sessionContent: template.sessionContent,
      sessionContentHtml: template.sessionContentHtml || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteTemplate = (template: BackendTemplate) => {
    setTemplateToDelete(template);
    setIsDeleteDialogOpen(true);
  };

  const onSubmitCreate = (data: TemplateFormValues) => {
    if (!currentCoach?.id) {
      toast({
        title: 'Error',
        description: 'Coach profile not found',
        variant: 'destructive'
      });
      return;
    }
    createMutation.mutate({ ...data, coachId: currentCoach.id });
  };

  const onSubmitEdit = (data: TemplateFormValues) => {
    if (selectedTemplate) {
      updateMutation.mutate({ 
        id: selectedTemplate.id, 
        data 
      });
    }
  };

  const confirmDelete = () => {
    if (templateToDelete) {
      deleteMutation.mutate(templateToDelete.id);
    }
  };

  if (templatesLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Compact Inline Header */}
      <div className="flex items-center gap-3 mb-6 pb-3 border-b shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-9 w-9 shrink-0"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base truncate" data-testid="text-page-title">Session Library</h1>
        </div>
      </div>

        <div className="space-y-3">
          <Button 
            onClick={handleCreateTemplate} 
            className="w-full"
            data-testid="button-create-template"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant={filterMode === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterMode('all')}
              className="flex-1"
              data-testid="button-filter-all"
            >
              All Templates
            </Button>
            <Button
              variant={filterMode === 'mine' ? 'default' : 'outline'}
              onClick={() => setFilterMode('mine')}
              className="flex-1"
              data-testid="button-filter-mine"
            >
              My Templates
            </Button>
          </div>
          
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-templates"
          />
        </div>

      {/* Templates Grid */}
      <div className="flex-1 overflow-auto overflow-x-hidden scroll-container pt-4">
        {filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No templates found</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'Try a different search term' : 'Create your first session template to get started'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pb-6">
            {filteredTemplates.map((template) => (
              <Card 
                key={template.id} 
                className="p-4 hover-elevate"
                data-testid={`card-template-${template.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 
                      className="font-semibold truncate mb-1"
                      data-testid={`text-template-name-${template.id}`}
                    >
                      {template.templateName}
                    </h3>
                    {template.templateDescription && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {template.templateDescription}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span className="truncate">{getCoachName(template.coachId)}</span>
                    </div>
                  </div>
                  <FileText className="h-5 w-5 text-primary flex-shrink-0 ml-2" />
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <Calendar className="h-3 w-3" />
                  <span>{template.createdAt ? format(new Date(template.createdAt), 'MMM dd, yyyy') : 'N/A'}</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewTemplate(template)}
                    className="flex-1"
                    data-testid={`button-view-${template.id}`}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  {isOwner(template) && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditTemplate(template)}
                        data-testid={`button-edit-${template.id}`}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template)}
                        data-testid={`button-delete-${template.id}`}
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

      {/* View Template Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-view-dialog-title">
              {selectedTemplate?.templateName}
            </DialogTitle>
            <DialogDescription>
              Created by {selectedTemplate && getCoachName(selectedTemplate.coachId)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTemplate?.templateDescription && (
            <div className="mb-4">
              <Label className="text-sm font-medium">Description</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedTemplate.templateDescription}
              </p>
            </div>
          )}

          <div>
            <Label className="text-sm font-medium">Content</Label>
            <div 
              className="mt-2 p-4 border rounded-lg bg-muted/50 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ 
                __html: selectedTemplate?.sessionContentHtml || selectedTemplate?.sessionContent || '' 
              }}
            />
          </div>

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

      {/* Create Template Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-create-dialog-title">Create New Template</DialogTitle>
            <DialogDescription>
              Create a reusable session template that you can use across your training sessions.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onSubmitCreate)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="templateName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Warm-Up Routine"
                        data-testid="input-template-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="templateDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        placeholder="Brief description of this template..."
                        data-testid="input-template-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="sessionContentHtml"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content *</FormLabel>
                    <FormControl>
                      <RichTextEditor
                        value={field.value || ''}
                        onChange={(html) => {
                          const tempDiv = document.createElement('div');
                          tempDiv.innerHTML = html;
                          const plainText = tempDiv.textContent || tempDiv.innerText || '';
                          field.onChange(html);
                          createForm.setValue('sessionContent', plainText);
                        }}
                        placeholder="Enter session content..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    createForm.reset();
                  }}
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-save-create"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Template'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-edit-dialog-title">Edit Template</DialogTitle>
            <DialogDescription>
              Make changes to your session template.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="templateName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Warm-Up Routine"
                        data-testid="input-edit-template-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="templateDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        placeholder="Brief description of this template..."
                        data-testid="input-edit-template-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="sessionContentHtml"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content *</FormLabel>
                    <FormControl>
                      <RichTextEditor
                        value={field.value || ''}
                        onChange={(html) => {
                          const tempDiv = document.createElement('div');
                          tempDiv.innerHTML = html;
                          const plainText = tempDiv.textContent || tempDiv.innerText || '';
                          field.onChange(html);
                          editForm.setValue('sessionContent', plainText);
                        }}
                        placeholder="Enter session content..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setSelectedTemplate(null);
                    editForm.reset();
                  }}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-save-edit"
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
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete?.templateName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
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
