// TEMPORARY USER STUB - DO NOT USE FOR NEW CODE
// This file exists only to prevent import errors during Supabase migration
// All new code should use Supabase client directly

console.warn('WARNING: Using temporary User stub. Migrate to Supabase ASAP!');

export interface IUser {
  id: string;
  email: string;
  name: string;
  role: 'client' | 'coach' | 'admin';
  [key: string]: any;
}

// Temporary stub that throws errors when used
export const User = {
  find: () => { 
    throw new Error('User.find() is deprecated. Use Supabase client instead!'); 
  },
  findOne: () => { 
    throw new Error('User.findOne() is deprecated. Use Supabase client instead!'); 
  },
  findById: () => { 
    throw new Error('User.findById() is deprecated. Use Supabase client instead!'); 
  },
  create: () => { 
    throw new Error('User.create() is deprecated. Use Supabase client instead!'); 
  },
  updateOne: () => { 
    throw new Error('User.updateOne() is deprecated. Use Supabase client instead!'); 
  },
  deleteOne: () => { 
    throw new Error('User.deleteOne() is deprecated. Use Supabase client instead!'); 
  },
  countDocuments: () => { 
    throw new Error('User.countDocuments() is deprecated. Use Supabase client instead!'); 
  },
  findOneAndUpdate: () => { 
    throw new Error('User.findOneAndUpdate() is deprecated. Use Supabase client instead!'); 
  },
};