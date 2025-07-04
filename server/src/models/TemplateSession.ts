export interface ITemplateSession {
  id: string;
  templateId: string;
  sessionId: string;
  customizations?: Record<string, any>;
  createdAt: Date;
}

export class TemplateSession implements ITemplateSession {
  id: string;
  templateId: string;
  sessionId: string;
  customizations?: Record<string, any>;
  createdAt: Date;

  constructor(data: ITemplateSession) {
    this.id = data.id;
    this.templateId = data.templateId;
    this.sessionId = data.sessionId;
    this.customizations = data.customizations;
    this.createdAt = data.createdAt || new Date();
  }
} 