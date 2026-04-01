import React, { useState, useEffect } from 'react';
import { useSelectedProject } from '@/providers/ProjectProvider';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface Project {
  id: string;
  name: string;
  is_active: boolean;
}

export function ProjectTabsBar() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedProject, setSelectedProject } = useSelectedProject();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('Projects')
          .select('id, name, is_active')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        const fetched = data || [];
        setProjects(fetched);

        // Auto-select first project if none selected
        if (!selectedProject && fetched.length > 0) {
          setSelectedProject({ id: fetched[0].id, name: fetched[0].name });
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="sticky top-0 z-30 w-full bg-background border-b border-border px-6 py-2">
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9 w-28 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-30 w-full bg-background border-b border-border px-6 py-2">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() => setSelectedProject({ id: project.id, name: project.name })}
            className={`flex-shrink-0 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              selectedProject?.id === project.id
                ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm'
                : 'bg-transparent border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
            }`}
          >
            {project.name}
          </button>
        ))}
      </div>
    </div>
  );
}
