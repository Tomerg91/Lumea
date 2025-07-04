export interface IDeletionCertificate {
  id: string;
  userId: string;
  dataType: string;
  deletionDate: Date;
  verificationHash: string;
  createdAt: Date;
}

export default class DeletionCertificate implements IDeletionCertificate {
  id: string;
  userId: string;
  dataType: string;
  deletionDate: Date;
  verificationHash: string;
  createdAt: Date;

  constructor(data: IDeletionCertificate) {
    this.id = data.id;
    this.userId = data.userId;
    this.dataType = data.dataType;
    this.deletionDate = data.deletionDate;
    this.verificationHash = data.verificationHash;
    this.createdAt = data.createdAt || new Date();
  }
} 