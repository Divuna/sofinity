import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Mail, 
  Video,
  Edit3,
  Trash2,
  Copy,
  Play,
  Save,
  X,
  Eye
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  type: string | null;
  content: string;
  created_at: string;
  user_id: string | null;
}

const templateIcons = {
  email: Mail,
  post: FileText,
  video: Video,
};

const templateLabels = {
  email: 'E-mail',
  post: 'Social post',
  video: 'Video script',
};

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    type: 'email',
    content: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('Templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst šablony",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const templateData = {
        name: editingTemplate ? editingTemplate.name : newTemplate.name,
        type: editingTemplate ? editingTemplate.type : newTemplate.type,
        content: editingTemplate ? editingTemplate.content : newTemplate.content
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from('Templates')
          .update(templateData)
          .eq('id', editingTemplate.id);

        if (error) throw error;
        
        toast({
          title: "Uloženo",
          description: "Šablona byla aktualizována"
        });
      } else {
        const { error } = await supabase
          .from('Templates')
          .insert(templateData);

        if (error) throw error;
        
        toast({
          title: "Přidáno",
          description: "Nová šablona byla vytvořena"
        });
      }

      setEditingTemplate(null);
      setIsDialogOpen(false);
      setNewTemplate({ name: '', type: 'email', content: '' });
      fetchTemplates();
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se uložit šablonu",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('Templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Smazáno",
        description: "Šablona byla odstraněna"
      });
      fetchTemplates();
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat šablonu",
        variant: "destructive"
      });
    }
  };

  const handleCopy = async (template: Template) => {
    try {
      await navigator.clipboard.writeText(template.content);
      toast({
        title: "Zkopírováno",
        description: "Obsah šablony byl zkopírován do schránky"
      });
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se zkopírovat obsah",
        variant: "destructive"
      });
    }
  };

  const handleUseTemplate = (template: Template) => {
    // Zde by byla logika pro použití šablony v kampani
    toast({
      title: "Šablona použita",
      description: `Šablona "${template.name}" byla použita`
    });
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || template.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getTemplateIcon = (type: string | null) => {
    if (!type) return FileText;
    return templateIcons[type as keyof typeof templateIcons] || FileText;
  };

  const getTemplateLabel = (type: string | null) => {
    if (!type) return 'Obecný';
    return templateLabels[type as keyof typeof templateLabels] || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Šablony</h1>
          <p className="text-muted-foreground mt-1">
            Správa šablon pro e-maily, posty a video scripty
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="gradient" className="shadow-strong">
              <Plus className="w-4 h-4 mr-2" />
              Nová šablona
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Upravit šablonu' : 'Nová šablona'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Název šablony</label>
                  <Input
                    value={editingTemplate ? editingTemplate.name : newTemplate.name}
                    onChange={(e) => {
                      if (editingTemplate) {
                        setEditingTemplate({ ...editingTemplate, name: e.target.value });
                      } else {
                        setNewTemplate({ ...newTemplate, name: e.target.value });
                      }
                    }}
                    placeholder="Zadejte název šablony..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Typ šablony</label>
                  <Select
                    value={editingTemplate ? editingTemplate.type || 'email' : newTemplate.type}
                    onValueChange={(value) => {
                      if (editingTemplate) {
                        setEditingTemplate({ ...editingTemplate, type: value });
                      } else {
                        setNewTemplate({ ...newTemplate, type: value });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">E-mail</SelectItem>
                      <SelectItem value="post">Social post</SelectItem>
                      <SelectItem value="video">Video script</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Obsah šablony</label>
                <Textarea
                  value={editingTemplate ? editingTemplate.content : newTemplate.content}
                  onChange={(e) => {
                    if (editingTemplate) {
                      setEditingTemplate({ ...editingTemplate, content: e.target.value });
                    } else {
                      setNewTemplate({ ...newTemplate, content: e.target.value });
                    }
                  }}
                  placeholder="Zadejte obsah šablony..."
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex items-center gap-2 pt-4">
                <Button onClick={handleSave} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  Uložit
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditingTemplate(null);
                    setIsDialogOpen(false);
                    setNewTemplate({ name: '', type: 'email', content: '' });
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

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-primary" />
              <div className="text-2xl font-bold">
                {templates.filter(t => t.type === 'email').length}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">E-mail šablony</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-primary" />
              <div className="text-2xl font-bold">
                {templates.filter(t => t.type === 'post').length}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Social post šablony</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Video className="w-4 h-4 text-primary" />
              <div className="text-2xl font-bold">
                {templates.filter(t => t.type === 'video').length}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Video script šablony</p>
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
                placeholder="Hledat šablony..."
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
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="post">Social post</SelectItem>
                <SelectItem value="video">Video script</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Načítání šablon...</p>
          </div>
        ) : filteredTemplates.length > 0 ? (
          filteredTemplates.map((template) => {
            const TemplateIcon = getTemplateIcon(template.type);
            return (
              <Card key={template.id} className="hover:shadow-soft transition-all duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <TemplateIcon className="w-5 h-5 text-primary" />
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">
                            {getTemplateLabel(template.type)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(template.created_at).toLocaleDateString('cs-CZ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground line-clamp-3">
                    {template.content.substring(0, 150)}
                    {template.content.length > 150 && '...'}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleUseTemplate(template)}
                      className="flex-1"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Použít
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setPreviewTemplate(template);
                        setIsPreviewOpen(true);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopy(template)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingTemplate(template);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(template.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full text-center py-8">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Žádné šablony nenalezeny</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Vytvořit první šablonu
            </Button>
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewTemplate && (
                <>
                  {React.createElement(getTemplateIcon(previewTemplate.type), { className: "w-5 h-5" })}
                  Náhled: {previewTemplate.name}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {getTemplateLabel(previewTemplate.type)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Vytvořeno {new Date(previewTemplate.created_at).toLocaleDateString('cs-CZ')}
                </span>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="whitespace-pre-wrap font-mono text-sm">
                  {previewTemplate.content}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleUseTemplate(previewTemplate)}
                  className="flex-1"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Použít šablonu
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleCopy(previewTemplate)}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Kopírovat
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsPreviewOpen(false)}
                >
                  Zavřít
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}