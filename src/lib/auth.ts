// Utility function to check if user is authenticated
import { supabase } from '@/integrations/supabase/client';

export const checkAuth = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
};

// Get current user with their roles from user_roles table
export const getCurrentUser = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  
  // Get user profile (no longer contains role)
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .single();

  // Get user roles from user_roles table
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', session.user.id);
    
  return { 
    ...session.user, 
    profile,
    roles: roles?.map(r => r.role) || []
  };
};

// Check if user has specific role (server-side verified)
export const hasRole = async (userId: string, role: 'admin' | 'moderator' | 'user'): Promise<boolean> => {
  const { data, error } = await supabase.rpc('has_role', {
    _user_id: userId,
    _role: role
  });
  
  if (error) {
    console.error('Error checking role:', error);
    return false;
  }
  
  return data === true;
};

// Check if user is admin
export const isAdmin = async (userId: string): Promise<boolean> => {
  return hasRole(userId, 'admin');
};