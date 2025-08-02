// Utility function to check if user is authenticated
import { supabase } from '@/integrations/supabase/client';

export const checkAuth = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
};

// Security definer function helper to avoid RLS recursion
export const getCurrentUser = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  
  // Get user profile with role
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .single();
    
  return { ...session.user, profile };
};

// Check if user has specific role
export const hasRole = (userProfile: any, role: string) => {
  return userProfile?.profile?.role === role;
};

// Check if user is admin
export const isAdmin = (userProfile: any) => {
  return hasRole(userProfile, 'admin');
};