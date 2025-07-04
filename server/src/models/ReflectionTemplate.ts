export interface IReflectionTemplate {
  id: string;
  title: string;
  questions: string[];
  type: string;
  isPublic: boolean;
  createdAt: Date;
}

export class ReflectionTemplate implements IReflectionTemplate {
  id: string;
  title: string;
  questions: string[];
  type: string;
  isPublic: boolean;
  createdAt: Date;

  constructor(data: IReflectionTemplate) {
    this.id = data.id;
    this.title = data.title;
    this.questions = data.questions;
    this.type = data.type;
    this.isPublic = data.isPublic ?? false;
    this.createdAt = data.createdAt || new Date();
  }
}

export const ReflectionTemplates = ReflectionTemplate; 