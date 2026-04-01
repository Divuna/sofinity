import React, { useState, useEffect } from 'react';
import { useSelectedProject } from '@/providers/ProjectProvider';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface Project {
  id: string;
  name: string;
}

export function ProjectTabsBar() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedProject, setSelectedProject, loadingSelectedProject } = useSelectedProject();

  useEffect(() => {
    supabase
      .from('Projects')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
      .then(({ data, error }) => {
        if (!error && data) setProjects(data);
        setLoading(false);
      });
  }, []);

  if (loading || loadingSelectedProject) {
    return (
      <div className="h-10 border-b border-border bg-background px-6 flex items-center gap-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-6 w-24 rounded-full" />
        ))}
      </div>
    );
  }

  if (projects.length === 0) return null;

  return (
    <div className="h-10 border-b border-border bg-background px-6 flex items-center gap-1 overflow-x-auto">
      {projects.map((project) => {
        const isActive = selectedProject?.id === project.id;
        return (
          <button
            key={project.id}
            onClick={() => setSelectedProject({ id: project.id, name: project.name })}
            className={[
              'px-3 py-1 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            ].join(' ')}
          >
            {project.name}
          </button>
        );
      })}
    </div>
  );
}
