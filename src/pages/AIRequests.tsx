import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bot, MessageSquare, Clock, CheckCircle, Filter, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale/cs';
import { dedupeById, truncateText } from '@/lib/utils-helpers';
import { useSelectedProject } from '@/providers/ProjectProvider';

interface AIRequest {
  id: string;
  type: string;
  prompt: string;
  response: string | null;
  status: string;
  status_label: string;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  name: string;
}

export default function AIRequests() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { selectedProject } = useSelectedProject();
  const [aiRequests, setAiRequests] = useState<AIRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Array<{id: string, name: string}>>([]);

  const fetchAIRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('v_ai_requests_status')
        .select('*')
        .eq('user_id', user.id);

      // Add project filter if current project is selected
      if (currentProject?.id) {
        query = query.eq('project_id', currentProject.id);
      }

      const { data, error } = await query.order('updated_at', { ascending: false });

      if (error) throw error;
      
      // Deduplicate in case of any duplicates
      const uniqueRequests = dedupeById(data || []);
      setAiRequests(uniqueRequests);
    } catch (error) {
      console.error('Error fetching AI requests:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst AI požadavky",
        variant: "destructive"
      });
    } finally {
      setLoadingRequests(false);
    }
  };

  // Initialize current project from location state, URL params, or header context
  useEffect(() => {
    const selectedFromState = location.state?.SelectedProject;
    if (selectedFromState) {
      setCurrentProject(selectedFromState);
    } else {
      const urlParams = new URLSearchParams(window.location.search);
      const projectId = urlParams.get('project_id');
      const projectName = urlParams.get('name');
      if (projectId && projectName) {
        setCurrentProject({ id: projectId, name: projectName });
      } else if (selectedProject) {
        // Fallback to header context selectedProject
        setCurrentProject(selectedProject);
      }
    }
  }, [location.state, selectedProject]);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchAIRequests();
  }, [currentProject]);

  const fetchProjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('Projects')
        .select('id, name')
        .eq('user_id', user.id);

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst projekty",
        variant: "destructive"
      });
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'campaign_generator':
        return 'Generátor kampaní';
      case 'email_assistant':
        return 'Email asistent';
      case 'autoresponder':
        return 'Autoresponder';
      default:
        return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'campaign_generator':
        return <MessageSquare className="h-4 w-4" />;
      case 'email_assistant':
        return <Bot className="h-4 w-4" />;
      case 'autoresponder':
        return <Clock className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const handleProjectChange = (value: string) => {
    if (value === 'all') {
      setCurrentProject(null);
      // Clear URL params
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('project_id');
      newUrl.searchParams.delete('name');
      window.history.pushState({}, '', newUrl.toString());
    } else {
      const project = projects.find(p => p.id === value);
      if (project) {
        setCurrentProject(project);
        // Update URL params
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('project_id', project.id);
        newUrl.searchParams.set('name', project.name);
        window.history.pushState({}, '', newUrl.toString());
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <Bot className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">AI Požadavky</h1>
          <p className="text-muted-foreground mt-1">
            Historie všech AI požadavků a jejich výsledků
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Historie AI požadavků
            </CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={currentProject?.id || 'all'} onValueChange={handleProjectChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtr podle projektu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny projekty</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingRequests ? (
            <div className="flex items-center justify-center py-8">
              <Bot className="h-6 w-6 animate-spin" />
            </div>
          ) : aiRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>
                {currentProject 
                  ? `Žádné AI požadavky pro projekt "${currentProject.name}"`
                  : 'Zatím žádné AI požadavky'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {aiRequests.map((request) => (
                <div 
                  key={request.id} 
                  className="border rounded-lg p-4 space-y-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/ai-assistant/${request.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(request.type)}
                      <span className="font-medium text-sm">
                        {getTypeLabel(request.type)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={request.status === 'completed' ? 'default' : 'secondary'} className="gap-1">
                        {request.status_label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(request.updated_at), { 
                          addSuffix: true, 
                          locale: cs 
                        })}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Prompt:</p>
                    <p className="text-sm bg-muted/50 p-2 rounded">
                      {truncateText(request.prompt || '', 100)}
                    </p>
                  </div>

                  {request.response && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Odpověď:</p>
                      <p className="text-sm bg-green-50 p-2 rounded border-l-2 border-green-200">
                        {truncateText(request.response || '', 150)}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}