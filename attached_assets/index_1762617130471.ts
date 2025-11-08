export interface Squad {
  id: string;
  name: string;
  color: string;
  primaryCoachId?: string;
}

export type PoolType = '25m' | '50m';

export interface Location {
  id: string;
  name: string;
  poolType: PoolType;
}

export type QualificationLevel = 'No Qualification' | 'Level 1' | 'Level 2' | 'Level 3';

export interface Coach {
  id: string;
  firstName: string;
  lastName: string;
  level: QualificationLevel;
  dateOfBirth: Date;
  // Computed property for backward compatibility
  get name(): string;
}

export interface Swimmer {
  id: string;
  firstName: string;
  lastName: string;
  squadId: string;
  asaNumber: number;
  dateOfBirth: Date;
  // Computed property for backward compatibility
  get name(): string;
}

export type SessionFocus =
  | 'Aerobic capacity'
  | 'Anaerobic capacity'
  | 'Speed'
  | 'Technique'
  | 'Recovery'
  | 'Starts & turns';

export type AttendanceStatus = 'Present' | '1st half only' | '2nd half only' | 'Absent';
export type AttendanceNote = '-' | 'Late' | 'Very Late';

export interface AttendanceRecord {
  swimmerId: string;
  status: AttendanceStatus;
  notes: AttendanceNote;
}

export interface StrokeBreakdown {
  swim: number;
  drill: number;
  kick: number;
  pull: number;
}

export interface DistanceBreakdown {
  total: number;
  frontCrawl: number;
  frontCrawlBreakdown: StrokeBreakdown;
  backstroke: number;
  backstrokeBreakdown: StrokeBreakdown;
  breaststroke: number;
  breaststrokeBreakdown: StrokeBreakdown;
  butterfly: number;
  butterflyBreakdown: StrokeBreakdown;
  individualMedley: number;
  individualMedleyBreakdown: StrokeBreakdown;
}

export interface Session {
  id: string;
  squadId: string;
  locationId: string;
  leadCoachId: string;
  secondCoachId?: string;
  helperId?: string;
  setWriterId: string;
  date: Date;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  focus: SessionFocus;
  content?: string;
  distanceBreakdown?: DistanceBreakdown;
  attendance?: AttendanceRecord[];
}
