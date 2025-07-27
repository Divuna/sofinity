import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bike, Smartphone, Calendar, Plus } from 'lucide-react';

const projects = [
  {
    id: 'opravo',
    name: 'Opravo',
    description: 'Mobilní opravy',
    icon: Smartphone,
    status: 'active',
    campaigns: 12
  },
  {
    id: 'bikeshare24',
    name: 'BikeShare24',
    description: 'Sdílení kol',
    icon: Bike,
    status: 'active',
    campaigns: 8
  },
  {
    id: 'codneska',
    name: 'CoDneska',
    description: 'Události & aktivity',
    icon: Calendar,
    status: 'active',
    campaigns: 5
  }
];

export function ProjectSelector() {
  const [selectedProject, setSelectedProject] = useState('opravo');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Projekty</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {projects.map((project) => {
          const Icon = project.icon;
          const isSelected = selectedProject === project.id;
          
          return (
            <div
              key={project.id}
              className={`p-3 rounded-lg border cursor-pointer transition-all duration-300 ${
                isSelected 
                  ? 'border-primary bg-primary/5 shadow-soft' 
                  : 'border-border hover:border-primary/50 hover:bg-surface'
              }`}
              onClick={() => setSelectedProject(project.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    isSelected 
                      ? 'bg-gradient-primary text-white' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">{project.name}</div>
                    <div className="text-xs text-muted-foreground">{project.description}</div>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {project.campaigns}
                </Badge>
              </div>
            </div>
          );
        })}
        
        <Button variant="outline" className="w-full mt-4" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Přidat projekt
        </Button>
      </CardContent>
    </Card>
  );
}