import { useState } from 'react';
import { Drill, StrokeType, Coach } from '../types';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { ArrowLeft, Plus, Play, User, Calendar, Trash2, Pencil, FileText, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner@2.0.3';
import { Badge } from './ui/badge';

interface DrillsLibraryProps {
  drills: Drill[];
  coaches: Coach[];
  currentCoachId: string;
  onBack: () => void;
}

const strokeTypes: StrokeType[] = ['Freestyle', 'Backstroke', 'Breaststroke', 'Butterfly', 'Starts', 'Turns'];

export function DrillsLibrary({ drills, coaches, currentCoachId, onBack }: DrillsLibraryProps) {
  const [selectedStroke, setSelectedStroke] = useState<StrokeType>('Freestyle');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDrill, setSelectedDrill] = useState<Drill | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [newDrill, setNewDrill] = useState({
    name: '',
    strokeType: 'Freestyle' as StrokeType,
    description: '',
    videoUrl: '',
  });

  const [videoType, setVideoType] = useState<'url' | 'file'>('url');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>('');

  const filteredDrills = drills.filter(drill =>
    drill.strokeType === selectedStroke &&
    drill.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCoachName = (coachId: string) => {
    const coach = coaches.find(c => c.id === coachId);
    return coach ? coach.name : 'Unknown';
  };

  const getStrokeBadgeColor = (stroke: StrokeType) => {
    const colors: Record<StrokeType, string> = {
      'Freestyle': 'bg-blue-500',
      'Backstroke': 'bg-purple-500',
      'Breaststroke': 'bg-green-500',
      'Butterfly': 'bg-orange-500',
      'Starts': 'bg-red-500',
      'Turns': 'bg-teal-500',
    };
    return colors[stroke] || 'bg-gray-500';
  };

  const handleViewDrill = (drill: Drill) => {
    setSelectedDrill(drill);
    setIsViewDialogOpen(true);
  };

  const handleCreateDrill = () => {
    setNewDrill({
      name: '',
      strokeType: selectedStroke,
      description: '',
      videoUrl: '',
    });
    setVideoType('url');
    setVideoFile(null);
    setVideoPreviewUrl('');
    setIsCreateDialogOpen(true);
  };

  const handleEditDrill = (drill: Drill) => {
    setSelectedDrill(drill);
    setNewDrill({
      name: drill.name,
      strokeType: drill.strokeType,
      description: drill.description || '',
      videoUrl: drill.videoUrl || '',
    });
    setVideoType('url');
    setVideoFile(null);
    setVideoPreviewUrl('');
    setIsEditDialogOpen(true);
  };

  // Helper function to extract embed URL from iframe code or return clean URL
  const extractVideoUrl = (input: string): string => {
    // Check if input is an iframe tag
    const iframeMatch = input.match(/src=["']([^"']+)["']/);
    if (iframeMatch) {
      return iframeMatch[1];
    }
    // Otherwise return the input as-is (it's likely already a URL)
    return input.trim();
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      // Create preview URL
      const url = URL.createObjectURL(file);
      setVideoPreviewUrl(url);
      // In a real app, you would upload this to a server
      // For now, we'll just store the preview URL
      setNewDrill({ ...newDrill, videoUrl: url });
    }
  };

  const handleSaveNewDrill = () => {
    if (!newDrill.name.trim()) {
      toast.error('Please enter a drill name');
      return;
    }

    toast.success('Drill created successfully!');
    console.log('New drill:', newDrill);
    setIsCreateDialogOpen(false);
    setNewDrill({
      name: '',
      strokeType: 'Freestyle',
      description: '',
      videoUrl: '',
    });
  };

  const handleSaveEditDrill = () => {
    if (!newDrill.name.trim()) {
      toast.error('Please enter a drill name');
      return;
    }

    toast.success('Drill updated successfully!');
    console.log('Updated drill:', { ...selectedDrill, ...newDrill });
    setIsEditDialogOpen(false);
    setSelectedDrill(null);
    setNewDrill({
      name: '',
      strokeType: 'Freestyle',
      description: '',
      videoUrl: '',
    });
  };

  const handleDeleteDrill = (drill: Drill) => {
    if (drill.creatorId !== currentCoachId) {
      toast.error('You can only delete your own drills');
      return;
    }

    if (confirm(`Are you sure you want to delete "${drill.name}"?`)) {
      toast.success('Drill deleted successfully!');
      console.log('Delete drill:', drill.id);
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
          <h1 className="text-base truncate">Drills Library</h1>
        </div>
      </div>

      {/* Stroke Type Tabs */}
      <Tabs value={selectedStroke} onValueChange={(v) => setSelectedStroke(v as StrokeType)} className="mb-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 h-auto p-1 gap-2">
          {strokeTypes.map((stroke) => (
            <TabsTrigger key={stroke} value={stroke} className="text-xs sm:text-sm py-2">
              {stroke}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex gap-3 items-center mb-4">
        <Input
          placeholder="Search drills..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleCreateDrill}>
          <Plus className="h-4 w-4 mr-2" />
          Add Drill
        </Button>
      </div>

      {/* Drills Grid */}
      <div className="flex-1 overflow-auto">
        {filteredDrills.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-muted-foreground mb-2">No drills found</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'Try a different search term' : `Add your first ${selectedStroke.toLowerCase()} drill to get started`}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pb-6">
            {filteredDrills.map((drill) => (
              <Card key={drill.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="truncate mb-2">{drill.name}</h3>
                    <Badge className={`${getStrokeBadgeColor(drill.strokeType)} text-white text-xs`}>
                      {drill.strokeType}
                    </Badge>
                  </div>
                  {drill.videoUrl && (
                    <Play className="h-5 w-5 text-primary flex-shrink-0 ml-2" />
                  )}
                </div>

                {drill.description && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {drill.description}
                  </p>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <User className="h-3 w-3" />
                  <span className="truncate">{getCoachName(drill.creatorId)}</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDrill(drill)}
                    className="flex-1"
                  >
                    View
                  </Button>
                  {drill.creatorId === currentCoachId && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditDrill(drill)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteDrill(drill)}
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
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedDrill?.name}
              {selectedDrill && (
                <Badge className={`${getStrokeBadgeColor(selectedDrill.strokeType)} text-white`}>
                  {selectedDrill.strokeType}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Created by {selectedDrill && getCoachName(selectedDrill.creatorId)} on{' '}
              {selectedDrill && format(selectedDrill.createdDate, 'MMMM dd, yyyy')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {selectedDrill?.description && (
              <div>
                <Label>Description</Label>
                <p className="text-sm text-muted-foreground mt-1">{selectedDrill.description}</p>
              </div>
            )}
            {selectedDrill?.videoUrl && (
              <div>
                <Label>Video</Label>
                <div className="mt-2 aspect-video bg-black rounded-lg overflow-hidden">
                  {selectedDrill.videoUrl.startsWith('blob:') || selectedDrill.videoUrl.includes('/uploads/') ? (
                    <video
                      src={selectedDrill.videoUrl}
                      className="w-full h-full"
                      controls
                      title={selectedDrill.name}
                    />
                  ) : (
                    <iframe
                      src={selectedDrill.videoUrl}
                      className="w-full h-full"
                      allowFullScreen
                      title={selectedDrill.name}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Drill Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Drill</DialogTitle>
            <DialogDescription>
              Create a new drill for the library
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="drill-name">Drill Name</Label>
              <Input
                id="drill-name"
                placeholder="e.g., Catch-up Drill"
                value={newDrill.name}
                onChange={(e) => setNewDrill({ ...newDrill, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="drill-stroke">Stroke Type</Label>
              <Select
                value={newDrill.strokeType}
                onValueChange={(value) => setNewDrill({ ...newDrill, strokeType: value as StrokeType })}
              >
                <SelectTrigger id="drill-stroke">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {strokeTypes.map((stroke) => (
                    <SelectItem key={stroke} value={stroke}>
                      {stroke}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="drill-description">Description (Optional)</Label>
              <Textarea
                id="drill-description"
                placeholder="Describe the drill and its benefits..."
                value={newDrill.description}
                onChange={(e) => setNewDrill({ ...newDrill, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-3">
              <Label>Video (Optional)</Label>
              <RadioGroup value={videoType} onValueChange={(v) => setVideoType(v as 'url' | 'file')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="url" id="video-url" />
                  <Label htmlFor="video-url" className="font-normal cursor-pointer">Video URL (YouTube, Vimeo, etc.)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="file" id="video-file" />
                  <Label htmlFor="video-file" className="font-normal cursor-pointer">Upload Video File</Label>
                </div>
              </RadioGroup>

              {videoType === 'url' ? (
                <div>
                  <Input
                    id="drill-video-url"
                    placeholder="Paste YouTube embed URL or full iframe code"
                    value={newDrill.videoUrl}
                    onChange={(e) => setNewDrill({ ...newDrill, videoUrl: e.target.value })}
                    onBlur={(e) => {
                      // Extract URL from iframe if pasted
                      const extracted = extractVideoUrl(e.target.value);
                      if (extracted !== e.target.value) {
                        setNewDrill({ ...newDrill, videoUrl: extracted });
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Paste YouTube embed URL or the full iframe code from YouTube's "Share → Embed"
                  </p>
                  {newDrill.videoUrl && (
                    <div className="mt-3">
                      <Label className="text-xs text-muted-foreground mb-2 block">Preview:</Label>
                      <div className="aspect-video bg-black rounded-lg overflow-hidden">
                        <iframe
                          src={newDrill.videoUrl}
                          className="w-full h-full"
                          allowFullScreen
                          title="Video preview"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <Input
                      id="drill-video-file"
                      type="file"
                      accept="video/*"
                      onChange={handleVideoFileChange}
                      className="cursor-pointer"
                    />
                  </div>
                  {videoFile && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Upload className="h-3 w-3" />
                      {videoFile.name}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNewDrill}>Create Drill</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Drill Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Drill</DialogTitle>
            <DialogDescription>
              Update drill information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-drill-name">Drill Name</Label>
              <Input
                id="edit-drill-name"
                placeholder="e.g., Catch-up Drill"
                value={newDrill.name}
                onChange={(e) => setNewDrill({ ...newDrill, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-drill-stroke">Stroke Type</Label>
              <Select
                value={newDrill.strokeType}
                onValueChange={(value) => setNewDrill({ ...newDrill, strokeType: value as StrokeType })}
              >
                <SelectTrigger id="edit-drill-stroke">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {strokeTypes.map((stroke) => (
                    <SelectItem key={stroke} value={stroke}>
                      {stroke}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-drill-description">Description (Optional)</Label>
              <Textarea
                id="edit-drill-description"
                placeholder="Describe the drill and its benefits..."
                value={newDrill.description}
                onChange={(e) => setNewDrill({ ...newDrill, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-3">
              <Label>Video (Optional)</Label>
              <RadioGroup value={videoType} onValueChange={(v) => setVideoType(v as 'url' | 'file')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="url" id="edit-video-url" />
                  <Label htmlFor="edit-video-url" className="font-normal cursor-pointer">Video URL (YouTube, Vimeo, etc.)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="file" id="edit-video-file" />
                  <Label htmlFor="edit-video-file" className="font-normal cursor-pointer">Upload Video File</Label>
                </div>
              </RadioGroup>

              {videoType === 'url' ? (
                <div>
                  <Input
                    id="edit-drill-video-url"
                    placeholder="Paste YouTube embed URL or full iframe code"
                    value={newDrill.videoUrl}
                    onChange={(e) => setNewDrill({ ...newDrill, videoUrl: e.target.value })}
                    onBlur={(e) => {
                      // Extract URL from iframe if pasted
                      const extracted = extractVideoUrl(e.target.value);
                      if (extracted !== e.target.value) {
                        setNewDrill({ ...newDrill, videoUrl: extracted });
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Paste YouTube embed URL or the full iframe code from YouTube's "Share → Embed"
                  </p>
                  {newDrill.videoUrl && (
                    <div className="mt-3">
                      <Label className="text-xs text-muted-foreground mb-2 block">Preview:</Label>
                      <div className="aspect-video bg-black rounded-lg overflow-hidden">
                        <iframe
                          src={newDrill.videoUrl}
                          className="w-full h-full"
                          allowFullScreen
                          title="Video preview"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <Input
                      id="edit-drill-video-file"
                      type="file"
                      accept="video/*"
                      onChange={handleVideoFileChange}
                      className="cursor-pointer"
                    />
                  </div>
                  {videoFile && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Upload className="h-3 w-3" />
                      {videoFile.name}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditDrill}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}