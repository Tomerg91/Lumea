import { Schema, model, Document } from 'mongoose';

export interface IRole extends Document {
  name: 'admin' | 'coach' | 'client';
  description?: string;
}

const RoleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: ['admin', 'coach', 'client'],
    },
    description: {
      type: String,
    },
  },
  { timestamps: true }
);

export const Role = model<IRole>('Role', RoleSchema);
