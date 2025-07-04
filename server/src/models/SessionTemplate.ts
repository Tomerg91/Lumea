export interface ISessionTemplate {
  id: string;
  title: string;
  description?: string;
  objectives: string[];
  duration: number;
  type: string;
  createdAt: Date;
}

export class SessionTemplate implements ISessionTemplate {
  id: string;
  title: string;
  description?: string;
  objectives: string[];
  duration: number;
  type: string;
  createdAt: Date;

  constructor(data: ISessionTemplate) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.objectives = data.objectives;
    this.duration = data.duration;
    this.type = data.type;
    this.createdAt = data.createdAt || new Date();
  }
} 