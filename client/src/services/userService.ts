// Placeholder for user-related API calls

// Assuming ProfileFormValues is defined in Profile.tsx or a types file
// We might need to define a UserProfile type here or import it
export interface UserProfile {
  id?: string; // ID might come from backend
  name: string;
  email: string;
  bio?: string;
  role: 'client' | 'coach';
  // Add other fields like imageUrl if managed by backend
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'; // Base path for all API calls

export const fetchUserProfile = async (): Promise<UserProfile> => {
  console.log('Attempting to fetch user profile from backend...');
  const response = await fetch(`${API_BASE_URL}/auth/me`); // Corrected endpoint
  if (!response.ok) {
    // Consider more specific error handling based on response status
    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch user profile and parse error' }));
    throw new Error(errorData.message || 'Failed to fetch user profile');
  }
  const data = await response.json();
  // The backend /api/auth/me returns AuthenticatedUserPayload { id, email, name?, role, bio? }
  // We need to map this to UserProfile
  return {
    id: data.id, 
    name: data.name || 'User Name Missing', // Provide a fallback if name is optional
    email: data.email,
    bio: data.bio, // Backend currently does not return bio here, will be added later
    role: data.role as 'client' | 'coach',
  };
};

export const updateUserProfile = async (profileDataToUpdate: Partial<UserProfile>): Promise<UserProfile> => {
  console.log('Attempting to update user profile with:', profileDataToUpdate);
  
  // Only send fields that are meant to be updated, e.g., name and bio (when enabled)
  const payload: { name?: string; bio?: string } = {};
  if (profileDataToUpdate.name !== undefined) {
    payload.name = profileDataToUpdate.name;
  }
  if (profileDataToUpdate.bio !== undefined) { // bio field handled later
    payload.bio = profileDataToUpdate.bio;
  }

  if (Object.keys(payload).length === 0) {
    console.warn('updateUserProfile: No updatable data provided.');
    // If called with no updatable fields, either throw error or return current profile fetched again
    // For now, returning a slightly modified version of input to signify no actual backend call if payload is empty.
    // This behavior should be refined based on product requirements.
    return { ...profileDataToUpdate, name: profileDataToUpdate.name || "No changes sent" } as UserProfile;
  }

  const response = await fetch(`${API_BASE_URL}/users/me`, { 
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      // Authorization header with JWT token will be needed here if not handled globally by an interceptor
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to update user profile and parse error' }));
    throw new Error(errorData.message || 'Failed to update user profile');
  }
  
  const updatedProfileFromServer = await response.json();
  
  // Map response to UserProfile, backend returns { id, email, name, role, bio? }
  return {
    id: updatedProfileFromServer.id,
    name: updatedProfileFromServer.name || 'User Name Missing',
    email: updatedProfileFromServer.email, // Email shouldn't change from this call
    bio: updatedProfileFromServer.bio, // bio field handled later
    role: updatedProfileFromServer.role as 'client' | 'coach', // Role shouldn't change
  };
};

// TODO: Add changePassword, uploadProfileImage, etc. 