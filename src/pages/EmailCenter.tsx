import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Mail, 
  Search, 
  Filter, 
  Eye, 
  Forward, 
  BarChart3,
  Clock,
  CheckCircle,
  MousePointer,
  Send
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelectedProject } from '@/providers/ProjectProvider';

interface EmailItem {
  id: string;
  content: string;
  user_id: string;
  recipient: string | null;
  project: string | null;
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

export default function EmailCenter() {
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [projects, setProjects] = useState<Array<{id: string, name: string}>>([]);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { selectedProject } = useSelectedProject();

  useEffect(() => {
    fetchEmails();
    fetchEmailLogs();
    fetchProjects();
  }, [selectedProject]);

  // Get project filter from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const projectParam = urlParams.get('project');
    if (projectParam) {
      setProjectFilter(projectParam);
    }
  }, []);

  const fetchEmails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Uživatel není přihlášen');

      let query = supabase
        .from('Emails')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (selectedProject?.id) {
        query = query.eq('project_id', selectedProject.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEmails(data || []);
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
    }
  };

  const fetchEmailLogs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('EmailLogs')
        .select('*')
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      setEmailLogs(data || []);
    } catch (error) {
      console.error('Error fetching email logs:', error);
    }
  };

  const filteredEmails = emails.filter(email => {
    const matchesSearch = email.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (email.recipient && email.recipient.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === 'all' || email.type === typeFilter;
    const matchesProject = projectFilter === 'all' || email.project === projectFilter;
    return matchesSearch && matchesType && matchesProject;
  });

  const getEmailStatus = (email: EmailItem) => {
    const log = emailLogs.find(log => log.recipient_email === email.recipient);
    
    if (!log) {
      return <Badge variant="outline">Nevysláno</Badge>;
    }
    
    if (log.clicked_at) {
      return <Badge className="bg-success text-success-foreground">Kliknuto</Badge>;
    }
    
    if (log.opened_at) {
      return <Badge variant="secondary">Otevřeno</Badge>;
    }
    
    if (log.status === 'sent') {
      return <Badge variant="default">Odesláno</Badge>;
    }
    
    return <Badge variant="outline">Čeká</Badge>;
  };

  const getEmailStatusIcon = (email: EmailItem) => {
    const log = emailLogs.find(log => log.recipient_email === email.recipient);
    
    if (!log) return <Clock className="w-4 h-4 text-muted-foreground" />;
    if (log.clicked_at) return <MousePointer className="w-4 h-4 text-success" />;
    if (log.opened_at) return <Eye className="w-4 h-4 text-primary" />;
    if (log.status === 'sent') return <CheckCircle className="w-4 h-4 text-primary" />;
    
    return <Send className="w-4 h-4 text-muted-foreground" />;
  };

  const handleForward = async (email: EmailItem) => {
    // Zde by byla logika pro přeposlání e-mailu
    toast({
      title: "Přeposlání",
      description: "Funkce přeposlání bude implementována",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            E-maily{selectedProject ? ` — ${selectedProject.name}` : ''}
          </h1>
          <p className="text-muted-foreground mt-1">
            Správa e-mailů a sledování jejich doručení
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Send className="w-4 h-4 text-primary" />
              <div className="text-2xl font-bold">{emailLogs.length}</div>
            </div>
            <p className="text-xs text-muted-foreground">Celkem odesláno</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4 text-primary" />
              <div className="text-2xl font-bold">
                {emailLogs.filter(log => log.opened_at).length}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Otevřeno</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <MousePointer className="w-4 h-4 text-success" />
              <div className="text-2xl font-bold">
                {emailLogs.filter(log => log.clicked_at).length}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Kliknuto</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <div className="text-2xl font-bold">
                {emailLogs.length > 0 ? 
                  Math.round((emailLogs.filter(log => log.opened_at).length / emailLogs.length) * 100) : 0}%
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Míra otevření</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Hledat e-maily..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtr podle typu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny typy</SelectItem>
                <SelectItem value="promo">Promo</SelectItem>
                <SelectItem value="onboarding">Onboarding</SelectItem>
                <SelectItem value="follow-up">Follow-up</SelectItem>
                <SelectItem value="newsletter">Newsletter</SelectItem>
                <SelectItem value="reminder">Reminder</SelectItem>
              </SelectContent>
            </Select>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtr podle projektu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny projekty</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.name} value={project.name}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Emails Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Seznam e-mailů ({filteredEmails.length})
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
                {filteredEmails.map((email) => (
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
                        {email.content.substring(0, 120)}...
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {new Date(email.created_at).toLocaleDateString('cs-CZ')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/emails/${email.id}`)}
                      >
                        Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredEmails.length === 0 && (
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
  );
}