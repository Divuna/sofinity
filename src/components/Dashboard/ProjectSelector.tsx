import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, Building2 } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  campaigns_count: number;
}

export function ProjectSelector() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: 'Opravo',
    description: 'A mobile platform connecting customers and repair professionals.'
  });
  const { selectedProjectId, setSelectedProjectId } = useApp();
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('Projects')
        .select('id, name, description, is_active')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data and get campaign counts for each project
      const projectList = await Promise.all(
        (data || []).map(async (project) => {
          const { count: campaignsCount } = await supabase
            .from('Campaigns')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id);

          return {
            id: project.id,
            name: project.name,
            description: project.description,
            is_active: project.is_active,
            campaigns_count: campaignsCount || 0
          };
        })
      );

      setProjects(projectList);
      
      // Auto-select first project if none selected
      if (!selectedProjectId && projectList.length > 0 && projectList[0].id && projectList[0].id.trim() !== '') {
        setSelectedProjectId(projectList[0].id);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst projekty",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Chyba",
          description: "Musíte být přihlášeni",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase
        .from('Projects')
        .insert({
          name: formData.name,
          description: formData.description,
          is_active: true,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Close modal and reset form
      setIsModalOpen(false);
      setFormData({
        name: 'Opravo',
        description: 'A mobile platform connecting customers and repair professionals.'
      });

      // Refresh projects list
      await fetchProjects();

      // Auto-select the new project
      if (data?.id) {
        setSelectedProjectId(data.id);
      }

      toast({
        title: "Úspěch",
        description: "Projekt byl úspěšně vytvořen"
      });
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se vytvořit projekt",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const createDefaultProjects = async () => {
    setIsCreating(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Chyba",
          description: "Musíte být přihlášeni",
          variant: "destructive"
        });
        return;
      }
      
      const defaultProjects = [
        {
          name: "BikeShare24",
          description: "Bike sharing platform for daily commuters and tourists.",
          is_active: true,
          user_id: user.id
        },
        {
          name: "CoDneska", 
          description: "A daily inspiration and event guide for locals.",
          is_active: true,
          user_id: user.id
        }
      ];

      const { error } = await supabase
        .from('Projects')
        .insert(defaultProjects);

      if (error) throw error;

      // Refresh projects list
      await fetchProjects();

      toast({
        title: "Úspěch",
        description: "Ukázkové projekty byly vytvořeny"
      });
    } catch (error) {
      console.error('Error creating default projects:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se vytvořit výchozí projekty",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Building2 className="w-5 h-5 mr-2" />
            Projekty
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Building2 className="w-5 h-5 mr-2" />
          Projekty
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {projects.length > 0 ? (
          <>
            <div>
              <Select value={selectedProjectId || 'none'} onValueChange={(value) => setSelectedProjectId(value === 'none' ? null : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte projekt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Všechny projekty</SelectItem>
                  {projects.filter(project => project.id && project.id.trim() !== '').map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{project.name}</span>
                        <Badge variant="secondary" className="ml-2">
                          {project.campaigns_count}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProjectId && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                {(() => {
                  const selected = projects.find(p => p.id === selectedProjectId);
                  return selected ? (
                    <div>
                      <div className="font-medium text-foreground">{selected.name}</div>
                      {selected.description && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {selected.description}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-muted-foreground">
                          {selected.campaigns_count} kampaní
                        </span>
                        <Badge variant="outline" className="text-xs">
                          Aktivní
                        </Badge>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Vytvořit nový projekt
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Vytvořit nový projekt</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateProject} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Název projektu</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Název projektu"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Popis projektu</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Popis projektu"
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsModalOpen(false)}
                        disabled={isCreating}
                      >
                        Zrušit
                      </Button>
                      <Button type="submit" disabled={isCreating}>
                        {isCreating ? 'Vytváří se...' : 'Vytvořit projekt'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={createDefaultProjects}
                disabled={isCreating}
              >
                <Building2 className="w-4 h-4 mr-2" />
                Vytvořit ukázkové projekty
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Zatím nemáte žádné projekty</p>
            <div className="space-y-3">
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="default" size="sm" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Vytvořit nový projekt
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Vytvořit nový projekt</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateProject} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Název projektu</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Název projektu"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Popis projektu</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Popis projektu"
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsModalOpen(false)}
                        disabled={isCreating}
                      >
                        Zrušit
                      </Button>
                      <Button type="submit" disabled={isCreating}>
                        {isCreating ? 'Vytváří se...' : 'Vytvořit projekt'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={createDefaultProjects}
                disabled={isCreating}
              >
                <Building2 className="w-4 h-4 mr-2" />
                Vytvořit ukázkové projekty
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}