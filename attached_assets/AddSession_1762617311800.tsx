import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import { Session, SessionFocus, Squad, Location, Coach } from '../types';

interface AddSessionProps {
  squads: Squad[];
  locations: Location[];
  coaches: Coach[];
  onSave: (session: Omit<Session, 'id'>) => void;
  onCancel: () => void;
}

const sessionFocusOptions: SessionFocus[] = [
  'Aerobic capacity',
  'Anaerobic capacity',
  'Speed',
  'Technique',
  'Recovery',
  'Starts & turns',
];

export function AddSession({ squads, locations, coaches, onSave, onCancel }: AddSessionProps) {
  const [formData, setFormData] = useState<{
    squadId: string;
    locationId: string;
    leadCoachId: string;
    secondCoachId: string;
    helperId: string;
    setWriterId: string;
    date: string;
    startTime: string;
    endTime: string;
    focus: SessionFocus | '';
  }>({
    squadId: '',
    locationId: '',
    leadCoachId: '',
    secondCoachId: 'none',
    helperId: 'none',
    setWriterId: '',
    date: '',
    startTime: '',
    endTime: '',
    focus: '',
  });

  const isFormValid = () => {
    return (
      formData.squadId &&
      formData.locationId &&
      formData.leadCoachId &&
      formData.setWriterId &&
      formData.date &&
      formData.startTime &&
      formData.endTime &&
      formData.focus
    );
  };

  const handleSave = () => {
    if (!isFormValid()) return;

    const sessionData: Omit<Session, 'id'> = {
      squadId: formData.squadId,
      locationId: formData.locationId,
      leadCoachId: formData.leadCoachId,
      secondCoachId: formData.secondCoachId !== 'none' ? formData.secondCoachId : undefined,
      helperId: formData.helperId !== 'none' ? formData.helperId : undefined,
      setWriterId: formData.setWriterId,
      date: new Date(formData.date),
      startTime: formData.startTime,
      endTime: formData.endTime,
      focus: formData.focus as SessionFocus,
    };

    onSave(sessionData);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card p-4 flex items-center justify-between" style={{ borderBottomColor: '#4B9A4A' }}>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1>Add New Session</h1>
        </div>
        {/* Desktop only button */}
        <Button onClick={handleSave} disabled={!isFormValid()} className="hidden md:flex">
          <Save className="h-4 w-4 mr-2" />
          Create Session
        </Button>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-card rounded-lg border p-4 md:p-6 space-y-6">
            <div>
              <h2 className="mb-4">Session Details</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Fill in all required fields to create a new session
              </p>

              <div className="space-y-4">
                {/* Date */}
                <div className="space-y-2">
                  <Label htmlFor="date">
                    Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>

                {/* Time Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">
                      Start Time <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">
                      End Time <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    />
                  </div>
                </div>

                {/* Squad */}
                <div className="space-y-2">
                  <Label htmlFor="squad">
                    Squad <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.squadId}
                    onValueChange={(value) => setFormData({ ...formData, squadId: value })}
                  >
                    <SelectTrigger id="squad">
                      <SelectValue placeholder="Select squad" />
                    </SelectTrigger>
                    <SelectContent>
                      {squads.map((squad) => (
                        <SelectItem key={squad.id} value={squad.id}>
                          {squad.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location">
                    Location <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.locationId}
                    onValueChange={(value) => setFormData({ ...formData, locationId: value })}
                  >
                    <SelectTrigger id="location">
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

                {/* Session Focus */}
                <div className="space-y-2">
                  <Label htmlFor="focus">
                    Session Focus <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.focus}
                    onValueChange={(value) => setFormData({ ...formData, focus: value as SessionFocus })}
                  >
                    <SelectTrigger id="focus">
                      <SelectValue placeholder="Select focus" />
                    </SelectTrigger>
                    <SelectContent>
                      {sessionFocusOptions.map((focus) => (
                        <SelectItem key={focus} value={focus}>
                          {focus}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Lead Coach */}
                <div className="space-y-2">
                  <Label htmlFor="leadCoach">
                    Lead Coach <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.leadCoachId}
                    onValueChange={(value) => setFormData({ ...formData, leadCoachId: value })}
                  >
                    <SelectTrigger id="leadCoach">
                      <SelectValue placeholder="Select lead coach" />
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

                {/* Second Coach */}
                <div className="space-y-2">
                  <Label htmlFor="secondCoach">Second Coach (Optional)</Label>
                  <Select
                    value={formData.secondCoachId}
                    onValueChange={(value) => setFormData({ ...formData, secondCoachId: value })}
                  >
                    <SelectTrigger id="secondCoach">
                      <SelectValue placeholder="Select second coach" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {coaches.map((coach) => (
                        <SelectItem key={coach.id} value={coach.id}>
                          {coach.firstName} {coach.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Helper */}
                <div className="space-y-2">
                  <Label htmlFor="helper">Helper (Optional)</Label>
                  <Select
                    value={formData.helperId}
                    onValueChange={(value) => setFormData({ ...formData, helperId: value })}
                  >
                    <SelectTrigger id="helper">
                      <SelectValue placeholder="Select helper" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {coaches.map((coach) => (
                        <SelectItem key={coach.id} value={coach.id}>
                          {coach.firstName} {coach.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Set Writer */}
                <div className="space-y-2">
                  <Label htmlFor="setWriter">
                    Set Writer <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.setWriterId}
                    onValueChange={(value) => setFormData({ ...formData, setWriterId: value })}
                  >
                    <SelectTrigger id="setWriter">
                      <SelectValue placeholder="Select set writer" />
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
              </div>
            </div>

            <div className="pt-4 border-t space-y-4">
              <p className="text-sm text-muted-foreground">
                <span className="text-destructive">*</span> Required fields
              </p>
              
              {/* Mobile only button */}
              <Button 
                onClick={handleSave} 
                disabled={!isFormValid()} 
                className="w-full md:hidden"
              >
                <Save className="h-4 w-4 mr-2" />
                Create Session
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
