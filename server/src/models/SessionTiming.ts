export interface ISessionTiming {
  id: string;
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  plannedDuration: number;
  actualDuration?: number;
  overtime?: boolean;
  pausedDuration?: number;
  pauseReasons?: string[];
  status: 'scheduled' | 'started' | 'paused' | 'completed' | 'cancelled';
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export class SessionTiming implements ISessionTiming {
  id: string;
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  plannedDuration: number;
  actualDuration?: number;
  overtime?: boolean;
  pausedDuration?: number;
  pauseReasons?: string[];
  status: 'scheduled' | 'started' | 'paused' | 'completed' | 'cancelled';
  timezone: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: ISessionTiming) {
    this.id = data.id;
    this.sessionId = data.sessionId;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.duration = data.duration;
    this.plannedDuration = data.plannedDuration;
    this.actualDuration = data.actualDuration;
    this.overtime = data.overtime ?? false;
    this.pausedDuration = data.pausedDuration ?? 0;
    this.pauseReasons = data.pauseReasons ?? [];
    this.status = data.status;
    this.timezone = data.timezone;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  calculateDuration(): number {
    if (this.endTime && this.startTime) {
      return this.endTime.getTime() - this.startTime.getTime();
    }
    return 0;
  }

  isOvertime(): boolean {
    return this.actualDuration ? this.actualDuration > this.plannedDuration : false;
  }
} 