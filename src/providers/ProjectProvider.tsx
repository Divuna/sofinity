import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Project {
  id: string;
  name: string;
}

interface ProjectContextType {
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
  loadingSelectedProject: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const useSelectedProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useSelectedProject must be used within a ProjectProvider');
  }
  return context;
};

interface ProjectProviderProps {
  children: ReactNode;
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children }) => {
  const [selectedProject, setSelectedProjectState] = useState<Project | null>(null);
  const [loadingSelectedProject, setLoadingSelectedProject] = useState(true);

  // Load selected project on app start
  useEffect(() => {
    loadSelectedProject();
  }, []);

  const loadSelectedProject = async () => {
    try {
      setLoadingSelectedProject(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoadingSelectedProject(false);
        return;
      }

      let projectToSelect: Project | null = null;

      // 1. Try to load from Supabase user_preferences
      const { data: userPrefs } = await supabase
        .from('user_preferences')
        .select('selected_project_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (userPrefs?.selected_project_id) {
        // Get project details
        const { data: project } = await supabase
          .from('Projects')
          .select('id, name')
          .eq('id', userPrefs.selected_project_id)
          .eq('is_active', true)
          .maybeSingle();

        if (project) {
          projectToSelect = project;
        }
      }

      // 2. If not found in Supabase, try localStorage
      if (!projectToSelect) {
        const localProjectId = localStorage.getItem('sofinity:selectedProjectId');
        if (localProjectId) {
          const { data: project } = await supabase
            .from('Projects')
            .select('id, name')
            .eq('id', localProjectId)
            .eq('is_active', true)
            .maybeSingle();

          if (project) {
            projectToSelect = project;
            // Save to Supabase for future use
            await saveSelectedProjectToSupabase(user.id, project.id);
          }
        }
      }

      // 3. If still not found, pick the first active project
      if (!projectToSelect) {
        const { data: projects } = await supabase
          .from('Projects')
          .select('id, name')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: true })
          .limit(1);

        if (projects && projects.length > 0) {
          projectToSelect = projects[0];
          // Save to both localStorage and Supabase
          localStorage.setItem('sofinity:selectedProjectId', projectToSelect.id);
          await saveSelectedProjectToSupabase(user.id, projectToSelect.id);
        }
      }

      setSelectedProjectState(projectToSelect);
    } catch (error) {
      console.error('Error loading selected project:', error);
    } finally {
      setLoadingSelectedProject(false);
    }
  };

  const saveSelectedProjectToSupabase = async (userId: string, projectId: string) => {
    try {
      // First check if user preferences exist
      const { data: existingPrefs } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingPrefs) {
        // Update existing preferences
        await supabase
          .from('user_preferences')
          .update({ selected_project_id: projectId })
          .eq('user_id', userId);
      } else {
        // Create new preferences record
        await supabase
          .from('user_preferences')
          .insert({
            user_id: userId,
            selected_project_id: projectId
          });
      }
    } catch (error) {
      console.error('Error saving selected project to Supabase:', error);
    }
  };

  const setSelectedProject = async (project: Project | null) => {
    try {
      setSelectedProjectState(project);

      if (project) {
        // Update localStorage
        localStorage.setItem('sofinity:selectedProjectId', project.id);

        // Update Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await saveSelectedProjectToSupabase(user.id, project.id);
        }
      } else {
        // Clear localStorage
        localStorage.removeItem('sofinity:selectedProjectId');

        // Clear from Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('user_preferences')
            .update({ selected_project_id: null })
            .eq('user_id', user.id);
        }
      }
    } catch (error) {
      console.error('Error setting selected project:', error);
      // Note: Toast handling moved to individual components to avoid hook initialization issues
    }
  };

  return (
    <ProjectContext.Provider value={{
      selectedProject,
      setSelectedProject,
      loadingSelectedProject
    }}>
      {children}
    </ProjectContext.Provider>
  );
};