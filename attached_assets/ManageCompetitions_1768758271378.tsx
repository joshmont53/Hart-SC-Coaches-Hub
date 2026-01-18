import { useState } from 'react';
import { Competition, CoachAssignment, TimeBlock, Coach, Location } from '../types';
import { coaches, locations } from '../lib/mockData';
import { competitions } from '../lib/mockDataExtensions';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner@2.0.3';
import { Trophy, Calendar as CalendarIcon, MapPin, Plus, Pencil, Trash2, X, Clock, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

interface ManageCompetitionsProps {
  onBack?: () => void;
}

export function ManageCompetitions({ onBack }: ManageCompetitionsProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);

  const [newCompetition, setNewCompetition] = useState({
    name: '',
    locationId: '',
    startDate: new Date(),
    endDate: new Date(),
    color: '#3b82f6',
    coachAssignments: [] as CoachAssignment[],
  });

  const [selectedCoachId, setSelectedCoachId] = useState('');
  const [newTimeBlock, setNewTimeBlock] = useState<TimeBlock>({
    date: new Date(),
    startTime: '',
    endTime: '',
  });

  const formatCompetitionDateRange = (competition: Competition) => {
    const start = competition.startDate;
    const end = competition.endDate;
    
    // Check if same day
    if (
      start.getDate() === end.getDate() &&
      start.getMonth() === end.getMonth() &&
      start.getFullYear() === end.getFullYear()
    ) {
      return format(start, 'EEE, d MMM yyyy');
    }
    
    // Multi-day event
    return `${format(start, 'd MMM')} - ${format(end, 'd MMM yyyy')}`;
  };

  const handleCreateCompetition = () => {
    const today = new Date();
    setNewCompetition({
      name: '',
      locationId: '',
      startDate: today,
      endDate: today,
      color: '#3b82f6',
      coachAssignments: [],
    });
    setSelectedCoachId('');
    setNewTimeBlock({ date: today, startTime: '', endTime: '' });
    setIsCreateDialogOpen(true);
  };

  const handleEditCompetition = (competition: Competition) => {
    setSelectedCompetition(competition);
    setNewCompetition({
      name: competition.name,
      locationId: competition.locationId,
      startDate: competition.startDate,
      endDate: competition.endDate,
      color: competition.color,
      coachAssignments: JSON.parse(JSON.stringify(competition.coachAssignments)), // Deep copy
    });
    setSelectedCoachId('');
    setNewTimeBlock({ date: competition.startDate, startTime: '', endTime: '' });
    setIsEditDialogOpen(true);
  };

  const handleViewCompetition = (competition: Competition) => {
    setSelectedCompetition(competition);
    setIsDetailDialogOpen(true);
  };

  const handleAddTimeBlock = () => {
    if (!selectedCoachId) {
      toast.error('Please select a coach');
      return;
    }
    if (!newTimeBlock.startTime || !newTimeBlock.endTime) {
      toast.error('Please enter both start and end times');
      return;
    }

    const existingAssignment = newCompetition.coachAssignments.find(
      (a) => a.coachId === selectedCoachId
    );

    if (existingAssignment) {
      existingAssignment.timeBlocks.push({ ...newTimeBlock });
    } else {
      newCompetition.coachAssignments.push({
        coachId: selectedCoachId,
        timeBlocks: [{ ...newTimeBlock }],
      });
    }

    setNewCompetition({ ...newCompetition });
    setNewTimeBlock({ date: newCompetition.startDate, startTime: '', endTime: '' });
    toast.success('Time block added');
  };

  const handleRemoveTimeBlock = (coachId: string, blockIndex: number) => {
    const assignment = newCompetition.coachAssignments.find((a) => a.coachId === coachId);
    if (assignment) {
      assignment.timeBlocks.splice(blockIndex, 1);
      if (assignment.timeBlocks.length === 0) {
        newCompetition.coachAssignments = newCompetition.coachAssignments.filter(
          (a) => a.coachId !== coachId
        );
      }
      setNewCompetition({ ...newCompetition });
    }
  };

  const handleSaveNewCompetition = () => {
    if (!newCompetition.name.trim()) {
      toast.error('Please enter a competition name');
      return;
    }
    if (!newCompetition.locationId) {
      toast.error('Please select a location');
      return;
    }
    if (newCompetition.coachAssignments.length === 0) {
      toast.error('Please add at least one coach assignment');
      return;
    }

    toast.success('Competition created successfully!');
    console.log('New competition:', newCompetition);
    setIsCreateDialogOpen(false);
  };

  const handleSaveEditCompetition = () => {
    if (!newCompetition.name.trim()) {
      toast.error('Please enter a competition name');
      return;
    }
    if (!newCompetition.locationId) {
      toast.error('Please select a location');
      return;
    }
    if (newCompetition.coachAssignments.length === 0) {
      toast.error('Please add at least one coach assignment');
      return;
    }

    toast.success('Competition updated successfully!');
    console.log('Updated competition:', newCompetition);
    setIsEditDialogOpen(false);
    setSelectedCompetition(null);
  };

  const handleDeleteCompetition = (competition: Competition) => {
    if (window.confirm(`Are you sure you want to delete "${competition.name}"?`)) {
      toast.success('Competition deleted successfully!');
      console.log('Deleted competition:', competition.id);
    }
  };

  const getCoachName = (coachId: string): string => {
    const coach = coaches.find((c) => c.id === coachId);
    return coach ? `${coach.firstName} ${coach.lastName}` : 'Unknown Coach';
  };

  const getLocationName = (locationId: string): string => {
    const location = locations.find((l) => l.id === locationId);
    return location ? location.name : 'Unknown Location';
  };

  const calculateTotalHours = (timeBlocks: TimeBlock[]): number => {
    return timeBlocks.reduce((total, block) => {
      const [startHour, startMin] = block.startTime.split(':').map(Number);
      const [endHour, endMin] = block.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      return total + (endMinutes - startMinutes) / 60;
    }, 0);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Compact Inline Header */}
      <div className="bg-card border-b p-4 flex-shrink-0 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 pb-3 border-b">
            {onBack && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onBack}
                className="h-9 w-9 shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-base truncate">Competitions</h1>
            </div>
            <Button onClick={handleCreateCompetition} size="sm" className="shrink-0">
              <Plus className="h-4 w-4 mr-1.5" />
              Add
            </Button>
          </div>
        </div>
      </div>

      {/* Competitions List */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-4">
        {competitions.length === 0 ? (
          <Card className="p-8 text-center">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No competitions yet. Add your first competition!</p>
          </Card>
        ) : (
          competitions
            .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
            .map((competition) => (
              <Card
                key={competition.id}
                className="p-5 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleViewCompetition(competition)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-3">
                      <h3>{competition.name}</h3>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className="h-4 w-4" />
                        {formatCompetitionDateRange(competition)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        {getLocationName(competition.locationId)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        {competition.coachAssignments.length} coach
                        {competition.coachAssignments.length !== 1 ? 'es' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditCompetition(competition)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCompetition(competition)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
        )}
        </div>
      </div>

      {/* Create Competition Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Competition</DialogTitle>
            <DialogDescription>
              Create a new competition with coach assignments and time blocks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="competition-name">Competition Name</Label>
              <Input
                id="competition-name"
                placeholder="e.g., County Championships 2024"
                value={newCompetition.name}
                onChange={(e) => setNewCompetition({ ...newCompetition, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="competition-location">Location</Label>
              <Select
                value={newCompetition.locationId}
                onValueChange={(value) =>
                  setNewCompetition({ ...newCompetition, locationId: value })
                }
              >
                <SelectTrigger id="competition-location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name} ({location.poolType})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left overflow-hidden">
                      <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{format(newCompetition.startDate, 'MMM d, yyyy')}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newCompetition.startDate}
                      onSelect={(date) =>
                        date && setNewCompetition({ ...newCompetition, startDate: date })
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left overflow-hidden">
                      <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{format(newCompetition.endDate, 'MMM d, yyyy')}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newCompetition.endDate}
                      onSelect={(date) =>
                        date && setNewCompetition({ ...newCompetition, endDate: date })
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap mt-2">
                {['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#f97316'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="w-10 h-10 rounded border-2 transition-all"
                    style={{
                      background: `repeating-linear-gradient(
                        -45deg,
                        ${color},
                        ${color} 4px,
                        white 4px,
                        white 8px
                      )`,
                      borderColor: newCompetition.color === color ? '#000' : '#e5e7eb',
                      transform: newCompetition.color === color ? 'scale(1.1)' : 'scale(1)',
                    }}
                    onClick={() => setNewCompetition({ ...newCompetition, color })}
                  />
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <Label className="mb-3 block">Coach Assignments</Label>
              
              {/* Add Time Block Form */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-3 mb-4">
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label htmlFor="coach-select" className="text-xs">Coach</Label>
                    <Select value={selectedCoachId} onValueChange={setSelectedCoachId}>
                      <SelectTrigger id="coach-select">
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
                  
                  {/* Show date picker if competition spans multiple days */}
                  {newCompetition.startDate.toDateString() !== newCompetition.endDate.toDateString() && (
                    <div>
                      <Label className="text-xs">Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left">
                            <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{format(newTimeBlock.date, 'MMM d, yyyy')}</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={newTimeBlock.date}
                            onSelect={(date) =>
                              date && setNewTimeBlock({ ...newTimeBlock, date })
                            }
                            disabled={(date) =>
                              date < newCompetition.startDate || date > newCompetition.endDate
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="start-time" className="text-xs">Start Time</Label>
                      <Input
                        id="start-time"
                        type="time"
                        value={newTimeBlock.startTime}
                        onChange={(e) =>
                          setNewTimeBlock({ ...newTimeBlock, startTime: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-time" className="text-xs">End Time</Label>
                      <Input
                        id="end-time"
                        type="time"
                        value={newTimeBlock.endTime}
                        onChange={(e) =>
                          setNewTimeBlock({ ...newTimeBlock, endTime: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
                <Button onClick={handleAddTimeBlock} size="sm" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Time Block
                </Button>
              </div>

              {/* Display Coach Assignments */}
              {newCompetition.coachAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No coaches assigned yet
                </p>
              ) : (
                <div className="space-y-3">
                  {newCompetition.coachAssignments.map((assignment) => (
                    <Card key={assignment.coachId} className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-sm">{getCoachName(assignment.coachId)}</h4>
                          <p className="text-xs text-muted-foreground">
                            {calculateTotalHours(assignment.timeBlocks).toFixed(1)} hours total
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {assignment.timeBlocks.map((block, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-muted/50 p-2 rounded text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>
                                {newCompetition.startDate.toDateString() !== newCompetition.endDate.toDateString() && (
                                  <span className="text-muted-foreground mr-2">
                                    {format(block.date, 'MMM d')}:
                                  </span>
                                )}
                                {block.startTime} - {block.endTime}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveTimeBlock(assignment.coachId, index)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNewCompetition}>Create Competition</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Competition Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Competition</DialogTitle>
            <DialogDescription>
              Modify competition details, coach assignments, and time blocks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-competition-name">Competition Name</Label>
              <Input
                id="edit-competition-name"
                placeholder="e.g., County Championships 2024"
                value={newCompetition.name}
                onChange={(e) => setNewCompetition({ ...newCompetition, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-competition-location">Location</Label>
              <Select
                value={newCompetition.locationId}
                onValueChange={(value) =>
                  setNewCompetition({ ...newCompetition, locationId: value })
                }
              >
                <SelectTrigger id="edit-competition-location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name} ({location.poolType})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left overflow-hidden">
                      <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{format(newCompetition.startDate, 'MMM d, yyyy')}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newCompetition.startDate}
                      onSelect={(date) =>
                        date && setNewCompetition({ ...newCompetition, startDate: date })
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left overflow-hidden">
                      <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{format(newCompetition.endDate, 'MMM d, yyyy')}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newCompetition.endDate}
                      onSelect={(date) =>
                        date && setNewCompetition({ ...newCompetition, endDate: date })
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap mt-2">
                {['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#f97316'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="w-10 h-10 rounded border-2 transition-all"
                    style={{
                      background: `repeating-linear-gradient(
                        -45deg,
                        ${color},
                        ${color} 4px,
                        white 4px,
                        white 8px
                      )`,
                      borderColor: newCompetition.color === color ? '#000' : '#e5e7eb',
                      transform: newCompetition.color === color ? 'scale(1.1)' : 'scale(1)',
                    }}
                    onClick={() => setNewCompetition({ ...newCompetition, color })}
                  />
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <Label className="mb-3 block">Coach Assignments</Label>
              
              {/* Add Time Block Form */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-3 mb-4">
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label htmlFor="edit-coach-select" className="text-xs">Coach</Label>
                    <Select value={selectedCoachId} onValueChange={setSelectedCoachId}>
                      <SelectTrigger id="edit-coach-select">
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
                  
                  {/* Show date picker if competition spans multiple days */}
                  {newCompetition.startDate.toDateString() !== newCompetition.endDate.toDateString() && (
                    <div>
                      <Label className="text-xs">Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left">
                            <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{format(newTimeBlock.date, 'MMM d, yyyy')}</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={newTimeBlock.date}
                            onSelect={(date) =>
                              date && setNewTimeBlock({ ...newTimeBlock, date })
                            }
                            disabled={(date) =>
                              date < newCompetition.startDate || date > newCompetition.endDate
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="edit-start-time" className="text-xs">Start Time</Label>
                      <Input
                        id="edit-start-time"
                        type="time"
                        value={newTimeBlock.startTime}
                        onChange={(e) =>
                          setNewTimeBlock({ ...newTimeBlock, startTime: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-end-time" className="text-xs">End Time</Label>
                      <Input
                        id="edit-end-time"
                        type="time"
                        value={newTimeBlock.endTime}
                        onChange={(e) =>
                          setNewTimeBlock({ ...newTimeBlock, endTime: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
                <Button onClick={handleAddTimeBlock} size="sm" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Time Block
                </Button>
              </div>

              {/* Display Coach Assignments */}
              {newCompetition.coachAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No coaches assigned yet
                </p>
              ) : (
                <div className="space-y-3">
                  {newCompetition.coachAssignments.map((assignment) => (
                    <Card key={assignment.coachId} className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-sm">{getCoachName(assignment.coachId)}</h4>
                          <p className="text-xs text-muted-foreground">
                            {calculateTotalHours(assignment.timeBlocks).toFixed(1)} hours total
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {assignment.timeBlocks.map((block, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-muted/50 p-2 rounded text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>
                                {newCompetition.startDate.toDateString() !== newCompetition.endDate.toDateString() && (
                                  <span className="text-muted-foreground mr-2">
                                    {format(block.date, 'MMM d')}:
                                  </span>
                                )}
                                {block.startTime} - {block.endTime}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveTimeBlock(assignment.coachId, index)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditCompetition}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Competition Details Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              {selectedCompetition?.name}
            </DialogTitle>
            <DialogDescription>
              View competition details and coach assignments.
            </DialogDescription>
          </DialogHeader>
          {selectedCompetition && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <p>{formatCompetitionDateRange(selectedCompetition)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Location</Label>
                  <p>{getLocationName(selectedCompetition.locationId)}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="mb-3 block">Coach Assignments</Label>
                <div className="space-y-3">
                  {selectedCompetition.coachAssignments.map((assignment) => (
                    <Card key={assignment.coachId} className="p-3">
                      <div className="mb-2">
                        <h4 className="text-sm">{getCoachName(assignment.coachId)}</h4>
                        <p className="text-xs text-muted-foreground">
                          {calculateTotalHours(assignment.timeBlocks).toFixed(1)} hours total
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        {assignment.timeBlocks.map((block, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 bg-muted/50 p-2 rounded text-sm"
                          >
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>
                              {block.startTime} - {block.endTime}
                            </span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsDetailDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}