import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSelectedProject } from '@/providers/ProjectProvider';
import { 
  Plus, 
  Search, 
  Filter, 
  Users, 
  Mail, 
  Phone, 
  Tag,
  Edit3,
  Trash2,
  UserPlus,
  UserX,
  Download,
  Upload,
  Save,
  X
} from 'lucide-react';

interface Contact {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  tags: string[] | null;
  source: string | null;
  subscribed: boolean | null;
  unsubscribed_at: string | null;
  created_at: string;
  user_id: string | null;
}

const sourceBadgeColors = {
  website: 'default' as const,
  form: 'secondary' as const,
  import: 'outline' as const,
  manual: 'default' as const,
  api: 'secondary' as const
};

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>('all');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: '',
    tags: '',
    source: 'manual'
  });
  const { toast } = useToast();
  const { selectedProject } = useSelectedProject();

  useEffect(() => {
    fetchContacts();
  }, [selectedProject]);

  const fetchContacts = async () => {
    try {
      let query = supabase
        .from('Contacts')
        .select('*');

      // Filter by project if selected
      if (selectedProject?.id) {
        query = query.eq('project_id', selectedProject.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst kontakty",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const contactData = {
        name: newContact.name || null,
        email: newContact.email,
        phone: newContact.phone || null,
        tags: newContact.tags ? newContact.tags.split(',').map(tag => tag.trim()).filter(Boolean) : null,
        source: newContact.source,
        subscribed: true,
        project_id: selectedProject?.id || null
      };

      if (editingContact) {
        const { error } = await supabase
          .from('Contacts')
          .update(contactData)
          .eq('id', editingContact.id);

        if (error) throw error;
        
        toast({
          title: "Uloženo",
          description: "Kontakt byl aktualizován"
        });
      } else {
        const { error } = await supabase
          .from('Contacts')
          .insert(contactData);

        if (error) throw error;
        
        toast({
          title: "Přidáno",
          description: "Nový kontakt byl vytvořen"
        });
      }

      setEditingContact(null);
      setIsDialogOpen(false);
      setNewContact({ name: '', email: '', phone: '', tags: '', source: 'manual' });
      fetchContacts();
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se uložit kontakt",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('Contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Smazáno",
        description: "Kontakt byl odstraněn"
      });
      fetchContacts();
      setSelectedContacts(selectedContacts.filter(contactId => contactId !== id));
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat kontakt",
        variant: "destructive"
      });
    }
  };

  const toggleSubscription = async (id: string, currentStatus: boolean | null) => {
    try {
      const { error } = await supabase
        .from('Contacts')
        .update({ 
          subscribed: !currentStatus,
          unsubscribed_at: currentStatus ? new Date().toISOString() : null
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Stav změněn",
        description: currentStatus ? "Kontakt byl odhlášen" : "Kontakt byl přihlášen k odběru"
      });
      fetchContacts();
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se změnit stav odběru",
        variant: "destructive"
      });
    }
  };

  const handleBulkAction = async (action: 'subscribe' | 'unsubscribe' | 'delete') => {
    if (selectedContacts.length === 0) {
      toast({
        title: "Žádný výběr",
        description: "Vyberte kontakty pro hromadnou akci",
        variant: "destructive"
      });
      return;
    }

    try {
      if (action === 'delete') {
        const { error } = await supabase
          .from('Contacts')
          .delete()
          .in('id', selectedContacts);

        if (error) throw error;
        
        toast({
          title: "Smazáno",
          description: `${selectedContacts.length} kontaktů bylo odstraněno`
        });
      } else {
        const { error } = await supabase
          .from('Contacts')
          .update({ 
            subscribed: action === 'subscribe',
            unsubscribed_at: action === 'unsubscribe' ? new Date().toISOString() : null
          })
          .in('id', selectedContacts);

        if (error) throw error;
        
        toast({
          title: "Stav změněn",
          description: `${selectedContacts.length} kontaktů bylo ${action === 'subscribe' ? 'přihlášeno' : 'odhlášeno'}`
        });
      }

      setSelectedContacts([]);
      fetchContacts();
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se provést hromadnou akci",
        variant: "destructive"
      });
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = 
      (contact.name && contact.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contact.phone && contact.phone.includes(searchTerm));
    
    const matchesSource = sourceFilter === 'all' || contact.source === sourceFilter;
    
    const matchesSubscription = 
      subscriptionFilter === 'all' ||
      (subscriptionFilter === 'subscribed' && contact.subscribed) ||
      (subscriptionFilter === 'unsubscribed' && !contact.subscribed);
    
    return matchesSearch && matchesSource && matchesSubscription;
  });

  const toggleSelectContact = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const toggleSelectAll = () => {
    setSelectedContacts(
      selectedContacts.length === filteredContacts.length 
        ? [] 
        : filteredContacts.map(contact => contact.id)
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Kontakty{selectedProject ? ` — ${selectedProject.name}` : ''}
          </h1>
          <p className="text-muted-foreground mt-1">
            Správa kontaktní databáze a odběratelů
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient" className="shadow-strong">
                <Plus className="w-4 h-4 mr-2" />
                Nový kontakt
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingContact ? 'Upravit kontakt' : 'Nový kontakt'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Jméno</label>
                  <Input
                    value={editingContact ? editingContact.name || '' : newContact.name}
                    onChange={(e) => {
                      if (editingContact) {
                        setEditingContact({ ...editingContact, name: e.target.value });
                      } else {
                        setNewContact({ ...newContact, name: e.target.value });
                      }
                    }}
                    placeholder="Jméno kontaktu..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">E-mail *</label>
                  <Input
                    type="email"
                    value={editingContact ? editingContact.email : newContact.email}
                    onChange={(e) => {
                      if (editingContact) {
                        setEditingContact({ ...editingContact, email: e.target.value });
                      } else {
                        setNewContact({ ...newContact, email: e.target.value });
                      }
                    }}
                    placeholder="email@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Telefon</label>
                  <Input
                    type="tel"
                    value={editingContact ? editingContact.phone || '' : newContact.phone}
                    onChange={(e) => {
                      if (editingContact) {
                        setEditingContact({ ...editingContact, phone: e.target.value });
                      } else {
                        setNewContact({ ...newContact, phone: e.target.value });
                      }
                    }}
                    placeholder="+420 123 456 789"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Tagy (oddělené čárkou)</label>
                  <Input
                    value={editingContact ? 
                      (editingContact.tags || []).join(', ') : 
                      newContact.tags
                    }
                    onChange={(e) => {
                      if (editingContact) {
                        const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
                        setEditingContact({ ...editingContact, tags });
                      } else {
                        setNewContact({ ...newContact, tags: e.target.value });
                      }
                    }}
                    placeholder="zákazník, vip, newsletter..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Zdroj</label>
                  <Select
                    value={editingContact ? editingContact.source || 'manual' : newContact.source}
                    onValueChange={(value) => {
                      if (editingContact) {
                        setEditingContact({ ...editingContact, source: value });
                      } else {
                        setNewContact({ ...newContact, source: value });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manuální</SelectItem>
                      <SelectItem value="website">Web</SelectItem>
                      <SelectItem value="form">Formulář</SelectItem>
                      <SelectItem value="import">Import</SelectItem>
                      <SelectItem value="api">API</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <Button onClick={handleSave} className="flex-1">
                    <Save className="w-4 h-4 mr-2" />
                    Uložit
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setEditingContact(null);
                      setIsDialogOpen(false);
                      setNewContact({ name: '', email: '', phone: '', tags: '', source: 'manual' });
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
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-primary" />
              <div className="text-2xl font-bold">{contacts.length}</div>
            </div>
            <p className="text-xs text-muted-foreground">Celkem kontaktů</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <UserPlus className="w-4 h-4 text-success" />
              <div className="text-2xl font-bold">
                {contacts.filter(c => c.subscribed).length}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Aktivní odběratelé</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <UserX className="w-4 h-4 text-destructive" />
              <div className="text-2xl font-bold">
                {contacts.filter(c => !c.subscribed).length}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Odhlášení</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Tag className="w-4 h-4 text-primary" />
              <div className="text-2xl font-bold">
                {Math.round((contacts.filter(c => c.subscribed).length / contacts.length) * 100) || 0}%
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Míra aktivních</p>
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
                placeholder="Hledat kontakty..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtr podle zdroje" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny zdroje</SelectItem>
                <SelectItem value="manual">Manuální</SelectItem>
                <SelectItem value="website">Web</SelectItem>
                <SelectItem value="form">Formulář</SelectItem>
                <SelectItem value="import">Import</SelectItem>
                <SelectItem value="api">API</SelectItem>
              </SelectContent>
            </Select>
            <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtr podle odběru" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny stavy</SelectItem>
                <SelectItem value="subscribed">Aktivní</SelectItem>
                <SelectItem value="unsubscribed">Odhlášení</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedContacts.length > 0 && (
            <div className="flex items-center gap-2 mt-4 p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">
                Vybráno {selectedContacts.length} kontaktů:
              </span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleBulkAction('subscribe')}
              >
                <UserPlus className="w-4 h-4 mr-1" />
                Přihlásit
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleBulkAction('unsubscribe')}
              >
                <UserX className="w-4 h-4 mr-1" />
                Odhlásit
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleBulkAction('delete')}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Smazat
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setSelectedContacts([])}
              >
                Zrušit výběr
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Seznam kontaktů ({filteredContacts.length})
            {filteredContacts.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                className="ml-auto"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Načítání kontaktů...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Jméno</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Tagy</TableHead>
                  <TableHead>Zdroj</TableHead>
                  <TableHead>Stav odběru</TableHead>
                  <TableHead>Přidáno</TableHead>
                  <TableHead>Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedContacts.includes(contact.id)}
                        onCheckedChange={() => toggleSelectContact(contact.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {contact.name || 'Bez jména'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        {contact.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      {contact.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          {contact.phone}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {contact.tags && contact.tags.length > 0 ? (
                          contact.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={sourceBadgeColors[contact.source as keyof typeof sourceBadgeColors] || 'outline'}
                      >
                        {contact.source || 'Neznámý'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {contact.subscribed ? (
                          <Badge className="bg-success text-success-foreground">
                            Aktivní
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            Odhlášen
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {new Date(contact.created_at).toLocaleDateString('cs-CZ')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingContact(contact);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleSubscription(contact.id, contact.subscribed)}
                        >
                          {contact.subscribed ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserPlus className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(contact.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredContacts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <p className="text-muted-foreground">Žádné kontakty nenalezeny</p>
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