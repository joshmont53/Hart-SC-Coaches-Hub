import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Competition, CompetitionCoaching, Location as BackendLocation, Coach as BackendCoach } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, Edit, Trophy, Calendar, MapPin, Clock } from 'lucide-react';
import { format, parse } from 'date-fns';

interface ManageCompetitionsProps {
  onBack: () => void;
}

interface CompetitionFormData {
  competitionName: string;
  locationId: string;
  startDate: string;
  endDate: string;
  color: string;
}

interface CoachingFormData {
  coachId: string;
  coachingDate: string;
  startTime: string;
  endTime: string;
}

const COLOR_OPTIONS = [
  { value: '#3b82f6', label: 'Blue', style: 'bg-blue-500' },
  { value: '#ef4444', label: 'Red', style: 'bg-red-500' },
  { value: '#10b981', label: 'Green', style: 'bg-green-500' },
  { value: '#f59e0b', label: 'Orange', style: 'bg-orange-500' },
  { value: '#8b5cf6', label: 'Purple', style: 'bg-purple-500' },
  { value: '#ec4899', label: 'Pink', style: 'bg-pink-500' },
  { value: '#06b6d4', label: 'Cyan', style: 'bg-cyan-500' },
  { value: '#84cc16', label: 'Lime', style: 'bg-lime-500' },
];

export function ManageCompetitions({ onBack }: ManageCompetitionsProps) {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);
  const [deletingCompetition, setDeletingCompetition] = useState<Competition | null>(null);
  const [managingCoachingFor, setManagingCoachingFor] = useState<Competition | null>(null);

  const [formData, setFormData] = useState<CompetitionFormData>({
    competitionName: '',
    locationId: '',
    startDate: '',
    endDate: '',
    color: '#3b82f6',
  });

  const [coachingFormData, setCoachingFormData] = useState<CoachingFormData>({
    coachId: '',
    coachingDate: '',
    startTime: '',
    endTime: '',
  });

  // Fetch competitions
  const { data: competitions = [], isLoading: isLoadingCompetitions } = useQuery<Competition[]>({
    queryKey: ['/api/competitions'],
  });

  // Fetch locations for dropdown
  const { data: locations = [] } = useQuery<BackendLocation[]>({
    queryKey: ['/api/locations'],
  });

  // Fetch coaches for dropdown
  const { data: coaches = [] } = useQuery<BackendCoach[]>({
    queryKey: ['/api/coaches'],
  });

  // Fetch coaching records for selected competition
  const { data: coachingRecords = [] } = useQuery<CompetitionCoaching[]>({
    queryKey: ['/api/competitions', managingCoachingFor?.id, 'coaching'],
    enabled: !!managingCoachingFor,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CompetitionFormData) => {
      return await apiRequest('POST', '/api/competitions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/competitions'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: 'Competition Created',
        description: 'Competition has been created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create competition',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CompetitionFormData> }) => {
      return await apiRequest('PATCH', `/api/competitions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/competitions'] });
      setEditingCompetition(null);
      resetForm();
      toast({
        title: 'Competition Updated',
        description: 'Competition has been updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update competition',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/competitions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/competitions'] });
      setDeletingCompetition(null);
      toast({
        title: 'Competition Deleted',
        description: 'Competition has been deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete competition',
        variant: 'destructive',
      });
    },
  });

  const createCoachingMutation = useMutation({
    mutationFn: async (data: CompetitionCoaching) => {
      return await apiRequest('POST', `/api/competitions/${managingCoachingFor?.id}/coaching`, data);
    },
    onSuccess: () => {
      // Invalidate both specific competition coaching and global coaching query
      queryClient.invalidateQueries({ 
        queryKey: ['/api/competitions', managingCoachingFor?.id, 'coaching'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/competitions/coaching/all'] 
      });
      // For single-day competitions, preserve the date after reset
      const isSingleDay = managingCoachingFor && managingCoachingFor.startDate === managingCoachingFor.endDate;
      const preservedDate = isSingleDay && managingCoachingFor ? managingCoachingFor.startDate : '';
      setCoachingFormData({ coachId: '', coachingDate: preservedDate, startTime: '', endTime: '' });
      toast({
        title: 'Coaching Added',
        description: 'Coaching time block has been added',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add coaching',
        variant: 'destructive',
      });
    },
  });

  const deleteCoachingMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/competitions/coaching/${id}`);
    },
    onSuccess: () => {
      // Invalidate both specific competition coaching and global coaching query
      queryClient.invalidateQueries({ 
        queryKey: ['/api/competitions', managingCoachingFor?.id, 'coaching'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/competitions/coaching/all'] 
      });
      toast({
        title: 'Coaching Removed',
        description: 'Coaching time block has been removed',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove coaching',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      competitionName: '',
      locationId: '',
      startDate: '',
      endDate: '',
      color: '#3b82f6',
    });
  };

  const handleCreate = () => {
    if (!formData.competitionName || !formData.locationId || !formData.startDate || !formData.endDate) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      toast({
        title: 'Validation Error',
        description: 'End date must be after start date',
        variant: 'destructive',
      });
      return;
    }

    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!editingCompetition) return;

    if (!formData.competitionName || !formData.locationId || !formData.startDate || !formData.endDate) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      toast({
        title: 'Validation Error',
        description: 'End date must be after start date',
        variant: 'destructive',
      });
      return;
    }

    updateMutation.mutate({ id: editingCompetition.id, data: formData });
  };

  const handleEdit = (competition: Competition) => {
    setEditingCompetition(competition);
    setFormData({
      competitionName: competition.competitionName,
      locationId: competition.locationId,
      startDate: competition.startDate,
      endDate: competition.endDate,
      color: competition.color,
    });
  };

  const handleDelete = (competition: Competition) => {
    setDeletingCompetition(competition);
  };

  const confirmDelete = () => {
    if (!deletingCompetition) return;
    deleteMutation.mutate(deletingCompetition.id);
  };

  const handleManageCoaching = (competition: Competition) => {
    setManagingCoachingFor(competition);
    // Auto-set date for single-day competitions
    const isSingleDay = competition.startDate === competition.endDate;
    setCoachingFormData({ 
      coachId: '', 
      coachingDate: isSingleDay ? competition.startDate : '', 
      startTime: '', 
      endTime: '' 
    });
  };

  const handleAddCoaching = () => {
    if (!managingCoachingFor || !coachingFormData.coachId || !coachingFormData.coachingDate || 
        !coachingFormData.startTime || !coachingFormData.endTime) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all coaching fields',
        variant: 'destructive',
      });
      return;
    }

    // Calculate duration in decimal hours
    const [startHour, startMin] = coachingFormData.startTime.split(':').map(Number);
    const [endHour, endMin] = coachingFormData.endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const durationHours = (endMinutes - startMinutes) / 60;

    if (durationHours <= 0) {
      toast({
        title: 'Validation Error',
        description: 'End time must be after start time',
        variant: 'destructive',
      });
      return;
    }

    const coachingData: any = {
      competitionId: managingCoachingFor.id,
      coachId: coachingFormData.coachId,
      coachingDate: coachingFormData.coachingDate,
      startTime: coachingFormData.startTime,
      endTime: coachingFormData.endTime,
      duration: durationHours.toFixed(2),
    };

    createCoachingMutation.mutate(coachingData);
  };

  const getLocationName = (locationId: string): string => {
    const location = locations.find(l => l.id === locationId);
    return location?.poolName || 'Unknown Location';
  };

  const getCoachName = (coachId: string): string => {
    const coach = coaches.find(c => c.id === coachId);
    if (!coach) return 'Unknown Coach';
    return `${coach.firstName} ${coach.lastName}`;
  };

  const sortedCompetitions = [...competitions].sort((a, b) => 
    new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );

  // Sort coaching records chronologically by date and time
  const sortedCoachingRecords = [...coachingRecords].sort((a, b) => {
    // First sort by date (use string comparison for yyyy-MM-dd format)
    const dateCompare = a.coachingDate.localeCompare(b.coachingDate);
    if (dateCompare !== 0) return dateCompare;
    
    // Then by start time
    return a.startTime.localeCompare(b.startTime);
  });

  // Group sorted coaching by date for display
  const groupedCoachingRecords = sortedCoachingRecords.reduce((acc, record) => {
    if (!acc[record.coachingDate]) {
      acc[record.coachingDate] = [];
    }
    acc[record.coachingDate].push(record);
    return acc;
  }, {} as Record<string, CompetitionCoaching[]>);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header - Fixed/Sticky */}
      <div className="flex-shrink-0 sticky top-0 z-10 bg-background border-b pb-3 mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-9 w-9 shrink-0"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-base font-medium truncate">Competitions</h1>
          </div>
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setIsCreateDialogOpen(true);
            }}
            data-testid="button-create-competition"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {/* Competitions List */}
      <div className="flex-1 overflow-auto overflow-x-hidden scroll-container space-y-4">
        {isLoadingCompetitions ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground text-center">Loading competitions...</p>
            </CardContent>
          </Card>
        ) : competitions.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground text-center">
                No competitions yet. Create your first competition!
              </p>
            </CardContent>
          </Card>
        ) : (
          sortedCompetitions.map((competition) => (
            <Card key={competition.id} data-testid={`card-competition-${competition.id}`}>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {/* Top Section: Color indicator, title, and action buttons */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div
                        className="h-4 w-4 rounded flex-shrink-0"
                        style={{ backgroundColor: competition.color }}
                      />
                      <h3 className="text-xl font-semibold truncate" data-testid={`text-competition-name-${competition.id}`}>
                        {competition.competitionName}
                      </h3>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(competition)}
                        data-testid={`button-edit-${competition.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(competition)}
                        data-testid={`button-delete-${competition.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Middle Section: Date and Location info */}
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">
                        {competition.startDate === competition.endDate
                          ? format(parse(competition.startDate, 'yyyy-MM-dd', new Date()), 'EEE, d MMM yyyy')
                          : `${format(parse(competition.startDate, 'yyyy-MM-dd', new Date()), 'd MMM')} - ${format(parse(competition.endDate, 'yyyy-MM-dd', new Date()), 'd MMM yyyy')}`
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{getLocationName(competition.locationId)}</span>
                    </div>
                  </div>

                  {/* Bottom Section: Coaching button */}
                  <div className="flex justify-end pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleManageCoaching(competition)}
                      data-testid={`button-manage-coaching-${competition.id}`}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Coaching
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Competition Dialog */}
      <Dialog open={isCreateDialogOpen || !!editingCompetition} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setEditingCompetition(null);
          resetForm();
        }
      }}>
        <DialogContent data-testid="dialog-competition-form">
          <DialogHeader>
            <DialogTitle>
              {editingCompetition ? 'Edit Competition' : 'Create New Competition'}
            </DialogTitle>
            <DialogDescription>
              {editingCompetition ? 'Update competition details' : 'Add a new competition to the system'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="competitionName">Competition Name *</Label>
              <Input
                id="competitionName"
                value={formData.competitionName}
                onChange={(e) => setFormData({ ...formData, competitionName: e.target.value })}
                placeholder="e.g., National Championships 2025"
                data-testid="input-competition-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Select
                value={formData.locationId}
                onValueChange={(value) => setFormData({ ...formData, locationId: value })}
              >
                <SelectTrigger data-testid="select-location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.poolName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  data-testid="input-start-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  data-testid="input-end-date"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color *</Label>
              <div className="grid grid-cols-4 gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={`h-10 rounded-md border-2 transition-all ${
                      formData.color === color.value ? 'border-primary scale-105' : 'border-transparent'
                    }`}
                    data-testid={`button-color-${color.label.toLowerCase()}`}
                  >
                    <div className={`h-full w-full rounded ${color.style}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setEditingCompetition(null);
                resetForm();
              }}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={editingCompetition ? handleUpdate : handleCreate}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-competition"
            >
              {editingCompetition ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingCompetition} onOpenChange={(open) => !open && setDeletingCompetition(null)}>
        <DialogContent data-testid="dialog-delete-confirmation">
          <DialogHeader>
            <DialogTitle>Delete Competition</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingCompetition?.competitionName}"? 
              This will also remove all associated coaching time blocks. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingCompetition(null)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Coaching Dialog */}
      <Dialog open={!!managingCoachingFor} onOpenChange={(open) => !open && setManagingCoachingFor(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col" data-testid="dialog-manage-coaching">
          <DialogHeader>
            <DialogTitle>Manage Coaching - {managingCoachingFor?.competitionName}</DialogTitle>
            <DialogDescription>
              Add coaching time blocks for this competition
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4 overflow-y-auto flex-1">
            {/* Add Coaching Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Add Coaching Time Block</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Coach *</Label>
                  <Select
                    value={coachingFormData.coachId}
                    onValueChange={(value) => setCoachingFormData({ ...coachingFormData, coachId: value })}
                  >
                    <SelectTrigger data-testid="select-coach">
                      <SelectValue placeholder="Select coach" />
                    </SelectTrigger>
                    <SelectContent>
                      {coaches.map((coach) => (
                        <SelectItem key={coach.id} value={coach.id}>
                          {coach.firstName} {coach.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Only show date field for multi-day competitions */}
                {managingCoachingFor && managingCoachingFor.startDate !== managingCoachingFor.endDate && (
                  <div className="space-y-2">
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={coachingFormData.coachingDate}
                      onChange={(e) => setCoachingFormData({ ...coachingFormData, coachingDate: e.target.value })}
                      min={managingCoachingFor.startDate}
                      max={managingCoachingFor.endDate}
                      data-testid="input-coaching-date"
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time *</Label>
                    <Input
                      type="time"
                      value={coachingFormData.startTime}
                      onChange={(e) => setCoachingFormData({ ...coachingFormData, startTime: e.target.value })}
                      data-testid="input-start-time"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time *</Label>
                    <Input
                      type="time"
                      value={coachingFormData.endTime}
                      onChange={(e) => setCoachingFormData({ ...coachingFormData, endTime: e.target.value })}
                      data-testid="input-end-time"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleAddCoaching}
                  disabled={createCoachingMutation.isPending}
                  className="w-full"
                  data-testid="button-add-coaching"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Time Block
                </Button>
              </CardContent>
            </Card>

            {/* Coaching Records List - Grouped by Date */}
            <div className="space-y-2">
              <h3 className="font-semibold">Coaching Time Blocks</h3>
              {coachingRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground">No coaching time blocks yet</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(groupedCoachingRecords).map(([date, records]) => (
                    <Card key={date}>
                      <CardContent className="p-4 space-y-3">
                        {/* Date header */}
                        <p className="font-medium" data-testid={`text-date-${date}`}>
                          {format(parse(date, 'yyyy-MM-dd', new Date()), 'EEEE, d MMMM yyyy')}
                        </p>
                        {/* All time blocks for this date */}
                        <div className="space-y-2 pl-4">
                          {records.map((record) => (
                            <div 
                              key={record.id} 
                              className="flex items-center justify-between py-2 border-l-2 pl-3"
                              data-testid={`card-coaching-${record.id}`}
                            >
                              <div className="flex gap-4 text-sm text-muted-foreground">
                                <span>{getCoachName(record.coachId)}</span>
                                <span>{record.startTime} - {record.endTime}</span>
                                <Badge variant="secondary">{record.duration}h</Badge>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteCoachingMutation.mutate(record.id)}
                                disabled={deleteCoachingMutation.isPending}
                                data-testid={`button-delete-coaching-${record.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
