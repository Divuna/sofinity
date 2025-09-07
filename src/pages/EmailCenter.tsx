import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Mail } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelectedProject } from '@/providers/ProjectProvider';
import { dedupeById, truncateText } from '@/lib/utils-helpers';

interface EmailItem {
  id: string;
  content: string;
  user_id: string;
  recipient: string | null;
  project: string | null;
  project_id: string | null;
  type: string;
  created_at: string;
  updated_at: string;
}

interface EmailLog {
  id: string;
  recipient_email: string;
  subject: string | null;
  status: string | null;
  message_id: string | null;
  sent_at: string;
  opened_at: string | null;
  clicked_at: string | null;
  campaign_id: string | null;
}

interface Project {
  id: string;
  name: string;
}

export default function EmailCenter() {
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedProject } = useSelectedProject();

  // Read project from location state or URL params
  useEffect(() => {
    const stateProject = location.state?.SelectedProject;
    if (stateProject?.id && stateProject?.name) {
      setCurrentProject(stateProject);
    } else {
      const urlParams = new URLSearchParams(location.search);
      const projectId = urlParams.get('project_id');
      const projectName = urlParams.get('name');
      if (projectId && projectName) {
        setCurrentProject({ id: projectId, name: projectName });
      } else {
        setCurrentProject(null);
      }
    }
  }, [location.state, location.search]);

  useEffect(() => {
    fetchEmails();
  }, [currentProject]);

  const fetchEmails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Uživatel není přihlášen');

      let emailsByProjectId: EmailItem[] = [];
      let emailsByProjectName: EmailItem[] = [];

      // Primary query: by project_id
      if (currentProject?.id) {
        const { data: projectIdData, error: projectIdError } = await supabase
          .from('Emails')
          .select('*')
          .eq('user_id', user.id)
          .eq('project_id', currentProject.id)
          .order('created_at', { ascending: false });

        if (projectIdError) throw projectIdError;
        emailsByProjectId = (projectIdData || []) as EmailItem[];
      }

      // Fallback query: by project name (only if needed)
      if (currentProject?.name && emailsByProjectId.length === 0) {
        const { data: projectNameData, error: projectNameError } = await supabase
          .from('Emails')
          .select('*')
          .eq('user_id', user.id)
          .eq('project', currentProject.name)
          .order('created_at', { ascending: false });

        if (projectNameError) throw projectNameError;
        emailsByProjectName = (projectNameData || []) as EmailItem[];
      }

      // No project selected - get all emails
      if (!currentProject) {
        const { data: allData, error: allError } = await supabase
          .from('Emails')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (allError) throw allError;
        setEmails((allData || []) as EmailItem[]);
      } else {
        // Merge and dedupe results
        const allEmails = [...emailsByProjectId, ...emailsByProjectName];
        setEmails(dedupeById(allEmails));
      }
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst e-maily",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            E-maily{currentProject ? ` — ${currentProject.name}` : ''}
          </h1>
          <p className="text-muted-foreground mt-1">
            Správa e-mailů a sledování jejich doručení
          </p>
        </div>
      </div>


      {/* Emails Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Seznam e-mailů ({emails.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Načítání e-mailů...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Typ</TableHead>
                  <TableHead>Projekt</TableHead>
                  <TableHead>Náhled obsahu</TableHead>
                  <TableHead>Vytvořeno</TableHead>
                  <TableHead>Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emails.map((email) => (
                  <TableRow key={email.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {email.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {email.project || 'Obecný'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground max-w-xs truncate">
                        {truncateText(email.content ?? '', 100)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {new Date(email.created_at).toLocaleDateString('cs-CZ', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/emails/${email.id}`)}
                      >
                        Zobrazit celý e-mail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {emails.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <p className="text-muted-foreground">Žádné e-maily nenalezeny</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
    </MainLayout>
  );
}