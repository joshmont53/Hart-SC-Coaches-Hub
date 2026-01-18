import { useState } from 'react';
import { SessionTemplate, Coach } from '../types';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { ArrowLeft, Plus, FileText, User, Calendar, Trash2, Pencil, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner@2.0.3';
import { RichTextEditor } from './RichTextEditor';
import { Textarea } from './ui/textarea';

interface SessionLibraryProps {
  templates: SessionTemplate[];
  coaches: Coach[];
  currentCoachId: string;
  onBack: () => void;
}

export function SessionLibrary({ templates, coaches, currentCoachId, onBack }: SessionLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'mine'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<SessionTemplate | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    content: '',
  });

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterMode === 'all' || template.creatorId === currentCoachId;
    return matchesSearch && matchesFilter;
  });

  const getCoachName = (coachId: string) => {
    const coach = coaches.find(c => c.id === coachId);
    return coach ? coach.name : 'Unknown';
  };

  const handleViewTemplate = (template: SessionTemplate) => {
    setSelectedTemplate(template);
    setIsViewDialogOpen(true);
  };

  const handleCreateTemplate = () => {
    setNewTemplate({ name: '', description: '', content: '' });
    setIsCreateDialogOpen(true);
  };

  const handleEditTemplate = (template: SessionTemplate) => {
    setSelectedTemplate(template);
    setNewTemplate({
      name: template.name,
      description: template.description,
      content: template.content,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveNewTemplate = () => {
    if (!newTemplate.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    if (!newTemplate.content.trim()) {
      toast.error('Please enter template content');
      return;
    }

    toast.success('Template created successfully!');
    console.log('New template:', newTemplate);
    setIsCreateDialogOpen(false);
    setNewTemplate({ name: '', description: '', content: '' });
  };

  const handleSaveEditTemplate = () => {
    if (!newTemplate.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    if (!newTemplate.content.trim()) {
      toast.error('Please enter template content');
      return;
    }

    toast.success('Template updated successfully!');
    console.log('Updated template:', { ...selectedTemplate, ...newTemplate });
    setIsEditDialogOpen(false);
    setSelectedTemplate(null);
    setNewTemplate({ name: '', description: '', content: '' });
  };

  const handleDeleteTemplate = (template: SessionTemplate) => {
    if (template.creatorId !== currentCoachId) {
      toast.error('You can only delete your own templates');
      return;
    }

    if (confirm(`Are you sure you want to delete "${template.name}"?`)) {
      toast.success('Template deleted successfully!');
      console.log('Delete template:', template.id);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Compact Inline Header */}
      <div className="flex items-center gap-3 mb-6 pb-3 border-b shrink-0">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onBack}
          className="h-9 w-9 shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base truncate">Session Library</h1>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <Button onClick={handleCreateTemplate} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
        
        <div className="flex gap-2">
          <Button
            variant={filterMode === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterMode('all')}
            className="flex-1"
          >
            All Templates
          </Button>
          <Button
            variant={filterMode === 'mine' ? 'default' : 'outline'}
            onClick={() => setFilterMode('mine')}
            className="flex-1"
          >
            My Templates
          </Button>
        </div>
        
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Templates List */}
      <div className="flex-1 overflow-auto">
        {filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-muted-foreground mb-2">No templates found</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'Try a different search term' : 'Create your first session template to get started'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pb-6">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="truncate mb-1">{template.name}</h3>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {template.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span className="truncate">{getCoachName(template.creatorId)}</span>
                    </div>
                  </div>
                  <FileText className="h-5 w-5 text-primary flex-shrink-0 ml-2" />
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <Calendar className="h-3 w-3" />
                  <span>{format(template.createdDate, 'MMM dd, yyyy')}</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewTemplate(template)}
                    className="flex-1"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  {template.creatorId === currentCoachId && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditTemplate(template)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template)}
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
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              Created by {selectedTemplate && getCoachName(selectedTemplate.creatorId)} on{' '}
              {selectedTemplate && format(selectedTemplate.createdDate, 'MMMM dd, yyyy')}
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate?.description && (
            <div className="mt-4 p-3 bg-muted rounded-md">
              <p className="text-sm">{selectedTemplate.description}</p>
            </div>
          )}
          <div className="mt-4">
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: selectedTemplate?.content || '' }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Create Session Template</DialogTitle>
            <DialogDescription>
              Create a reusable template for session content
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            <div>
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                placeholder="e.g., Aerobic Endurance Test Set"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="template-description">Description (Optional)</Label>
              <Textarea
                id="template-description"
                placeholder="Brief description of this template..."
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Session Content</Label>
              <RichTextEditor
                value={newTemplate.content}
                onChange={(content) => setNewTemplate({ ...newTemplate, content })}
                placeholder="Enter your session template content here..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNewTemplate}>Create Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Session Template</DialogTitle>
            <DialogDescription>
              Update your session template
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            <div>
              <Label htmlFor="edit-template-name">Template Name</Label>
              <Input
                id="edit-template-name"
                placeholder="e.g., Aerobic Endurance Test Set"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-template-description">Description (Optional)</Label>
              <Textarea
                id="edit-template-description"
                placeholder="Brief description of this template..."
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Session Content</Label>
              <RichTextEditor
                value={newTemplate.content}
                onChange={(content) => setNewTemplate({ ...newTemplate, content })}
                placeholder="Enter your session template content here..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditTemplate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}