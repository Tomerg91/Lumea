export interface IDataRetentionPolicy {
  id: string;
  name: string;
  description: string;
  retentionPeriod: number;
  dataTypes: string[];
  isActive: boolean;
  createdAt: Date;
}

export default class DataRetentionPolicy implements IDataRetentionPolicy {
  id: string;
  name: string;
  description: string;
  retentionPeriod: number;
  dataTypes: string[];
  isActive: boolean;
  createdAt: Date;

  constructor(data: IDataRetentionPolicy) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.retentionPeriod = data.retentionPeriod;
    this.dataTypes = data.dataTypes;
    this.isActive = data.isActive ?? true;
    this.createdAt = data.createdAt || new Date();
  }
} 