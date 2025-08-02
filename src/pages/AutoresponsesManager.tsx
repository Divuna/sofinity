import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  MessageSquare, 
  Bot,
  Globe,
  Mail,
  Instagram,
  FileText,
  Save,
  X
} from 'lucide-react';

interface Autoresponse {
  id: string;
  question: string;
  response: string;
  channel: string | null;
  generated_by_ai: boolean | null;
  created_at: string;
  user_id: string | null;
}

const channelIcons = {
  web: Globe,
  email: Mail,
  ig: Instagram,
  form: FileText,
};

const channelLabels = {
  web: 'Web',
  email: 'E-mail',
  ig: 'Instagram',
  form: 'Formulář',
};

export default function AutoresponsesManager() {
  const [autoresponses, setAutoresponses] = useState<Autoresponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [editingItem, setEditingItem] = useState<Autoresponse | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    question: '',
    response: '',
    channel: 'web'
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchAutoresponses();
  }, []);

  const fetchAutoresponses = async () => {
    try {
      const { data, error } = await supabase
        .from('Autoresponses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAutoresponses(data || []);
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst auto-odpovědi",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (item: Partial<Autoresponse>) => {
    try {
      if (editingItem) {
        // Update existing
        const { error } = await supabase
          .from('Autoresponses')
          .update({
            question: item.question,
            response: item.response,
            channel: item.channel
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        
        toast({
          title: "Uloženo",
          description: "Auto-odpověď byla aktualizována"
        });
      } else {
        // Create new
        const { error } = await supabase
          .from('Autoresponses')
          .insert({
            question: item.question,
            response: item.response,
            channel: item.channel,
            generated_by_ai: false
          });

        if (error) throw error;
        
        toast({
          title: "Přidáno",
          description: "Nová auto-odpověď byla vytvořena"
        });
      }

      setEditingItem(null);
      setIsDialogOpen(false);
      setNewItem({ question: '', response: '', channel: 'web' });
      fetchAutoresponses();
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se uložit auto-odpověď",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('Autoresponses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Smazáno",
        description: "Auto-odpověď byla odstraněna"
      });
      fetchAutoresponses();
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat auto-odpověď",
        variant: "destructive"
      });
    }
  };

  const filteredAutoresponses = autoresponses.filter(item => {
    const matchesSearch = item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.response.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesChannel = channelFilter === 'all' || item.channel === channelFilter;
    return matchesSearch && matchesChannel;
  });

  const getChannelIcon = (channel: string | null) => {
    if (!channel) return Globe;
    return channelIcons[channel as keyof typeof channelIcons] || Globe;
  };

  const getChannelLabel = (channel: string | null) => {
    if (!channel) return 'Neurčeno';
    return channelLabels[channel as keyof typeof channelLabels] || channel;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Auto-odpovědi</h1>
          <p className="text-muted-foreground mt-1">
            Správa automatických odpovědí pro různé komunikační kanály
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="gradient" className="shadow-strong">
              <Plus className="w-4 h-4 mr-2" />
              Nová auto-odpověď
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Upravit auto-odpověď' : 'Nová auto-odpověď'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Otázka/Trigger</label>
                <Input
                  value={editingItem ? editingItem.question : newItem.question}
                  onChange={(e) => {
                    if (editingItem) {
                      setEditingItem({ ...editingItem, question: e.target.value });
                    } else {
                      setNewItem({ ...newItem, question: e.target.value });
                    }
                  }}
                  placeholder="Zadejte otázku nebo klíčová slova..."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Odpověď</label>
                <Textarea
                  value={editingItem ? editingItem.response : newItem.response}
                  onChange={(e) => {
                    if (editingItem) {
                      setEditingItem({ ...editingItem, response: e.target.value });
                    } else {
                      setNewItem({ ...newItem, response: e.target.value });
                    }
                  }}
                  placeholder="Zadejte odpověď..."
                  rows={4}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Kanál</label>
                <Select
                  value={editingItem ? editingItem.channel || 'web' : newItem.channel}
                  onValueChange={(value) => {
                    if (editingItem) {
                      setEditingItem({ ...editingItem, channel: value });
                    } else {
                      setNewItem({ ...newItem, channel: value });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="web">Web</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="ig">Instagram</SelectItem>
                    <SelectItem value="form">Formulář</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-4">
                <Button 
                  onClick={() => handleSave(editingItem || newItem)}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Uložit
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditingItem(null);
                    setIsDialogOpen(false);
                    setNewItem({ question: '', response: '', channel: 'web' });
                  }}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Zrušit
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Hledat auto-odpovědi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtr podle kanálu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny kanály</SelectItem>
                <SelectItem value="web">Web</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="ig">Instagram</SelectItem>
                <SelectItem value="form">Formulář</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Autoresponses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Seznam auto-odpovědí ({filteredAutoresponses.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Načítání auto-odpovědí...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Otázka/Trigger</TableHead>
                  <TableHead>Odpověď</TableHead>
                  <TableHead>Kanál</TableHead>
                  <TableHead>Zdroj</TableHead>
                  <TableHead>Vytvořeno</TableHead>
                  <TableHead>Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAutoresponses.map((item) => {
                  const ChannelIcon = getChannelIcon(item.channel);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium max-w-xs truncate">
                          {item.question}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground max-w-xs truncate">
                          {item.response}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ChannelIcon className="w-4 h-4" />
                          <Badge variant="outline">
                            {getChannelLabel(item.channel)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {item.generated_by_ai ? (
                            <>
                              <Bot className="w-4 h-4 text-primary" />
                              <Badge variant="secondary">AI</Badge>
                            </>
                          ) : (
                            <>
                              <MessageSquare className="w-4 h-4 text-muted-foreground" />
                              <Badge variant="outline">Manuální</Badge>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString('cs-CZ')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingItem(item);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(item.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredAutoresponses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <p className="text-muted-foreground">Žádné auto-odpovědi nenalezeny</p>
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