import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSelectedProject } from '@/providers/ProjectProvider';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale/cs';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  Eye, 
  Edit3,
  Trash2,
  CheckCircle,
  Play,
  Pause,
  Globe,
  Mail,
  Instagram,
  Facebook,
  Youtube,
  Linkedin
} from 'lucide-react';

interface ScheduleItem {
  id: string;
  campaign_id: string | null;
  channel: string;
  content: string;
  publish_at: string;
  published: boolean;
  created_at: string;
  user_id: string | null;
}

interface Campaign {
  id: string;
  name: string;
}

const channelIcons = {
  email: Mail,
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  linkedin: Linkedin,
  website: Globe,
};

const channelLabels = {
  email: 'E-mail',
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  website: 'Web',
};

export default function CampaignSchedule() {
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [newItem, setNewItem] = useState({
    campaign_id: null as string | null,
    channel: 'email',
    content: '',
    publish_at: '',
    time: '09:00'
  });
  const { selectedProject } = useSelectedProject();
  const { toast } = useToast();

  useEffect(() => {
    if (selectedProject?.id) {
      fetchScheduleItems();
      fetchCampaigns();
    }
  }, [selectedProject?.id]);

  const fetchScheduleItems = async () => {
    if (!selectedProject?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('CampaignSchedule')
        .select('*')
        .eq('project_id', selectedProject.id)
        .order('publish_at', { ascending: true });

      if (error) throw error;
      setScheduleItems(data || []);
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst plán publikace",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    if (!selectedProject?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('Campaigns')
        .select('id, name')
        .eq('project_id', selectedProject.id)
        .order('name');

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const handleSave = async () => {
    if (!selectedDate) {
      toast({
        title: "Chyba",
        description: "Vyberte datum publikace",
        variant: "destructive"
      });
      return;
    }

    try {
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast({
          title: "Chyba",
          description: "Musíte být přihlášeni",
          variant: "destructive"
        });
        return;
      }

      const publishDateTime = new Date(selectedDate);
      const [hours, minutes] = newItem.time.split(':');
      publishDateTime.setHours(parseInt(hours), parseInt(minutes));

      // Optimistic UI update
      const tempItem: ScheduleItem = {
        id: 'temp-' + Date.now(),
        campaign_id: newItem.campaign_id || null,
        channel: newItem.channel,
        content: newItem.content,
        publish_at: publishDateTime.toISOString(),
        published: false,
        created_at: new Date().toISOString(),
        user_id: user.id
      };

      setScheduleItems(prev => [...prev, tempItem]);

      const { error } = await supabase
        .from('CampaignSchedule')
        .insert({
          campaign_id: newItem.campaign_id || null,
          channel: newItem.channel,
          content: newItem.content,
          publish_at: publishDateTime.toISOString(), // Already in UTC
          published: false,
          user_id: user.id,
          project_id: selectedProject?.id || null
        });

      if (error) {
        // Revert optimistic update
        setScheduleItems(prev => prev.filter(item => item.id !== tempItem.id));
        throw error;
      }

      toast({
        title: "Úspěch",
        description: "Publikace byla přidána do plánu"
      });

      setIsDialogOpen(false);
      setNewItem({
        campaign_id: null,
        channel: 'email',
        content: '',
        publish_at: '',
        time: '09:00'
      });
      setSelectedDate(undefined);
      fetchScheduleItems(); // Refresh to get actual data from server
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error?.message || "Nepodařilo se naplánovat publikaci",
        variant: "destructive"
      });
    }
  };

  const togglePublished = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('CampaignSchedule')
        .update({ published: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Stav změněn",
        description: currentStatus ? "Publikace označena jako nepublikovaná" : "Publikace označena jako publikovaná"
      });
      fetchScheduleItems();
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se změnit stav publikace",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('CampaignSchedule')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Smazáno",
        description: "Naplánovaná publikace byla odstraněna"
      });
      fetchScheduleItems();
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat publikaci",
        variant: "destructive"
      });
    }
  };

  const getChannelIcon = (channel: string) => {
    return channelIcons[channel as keyof typeof channelIcons] || Globe;
  };

  const getChannelLabel = (channel: string) => {
    return channelLabels[channel as keyof typeof channelLabels] || channel;
  };

  const getCampaignName = (campaignId: string | null) => {
    if (!campaignId) return 'Obecná publikace';
    const campaign = campaigns.find(c => c.id === campaignId);
    return campaign?.name || 'Neznámá kampaň';
  };

  // Group schedule items by date
  const groupedItems = scheduleItems.reduce((groups, item) => {
    const date = format(new Date(item.publish_at), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(item);
    return groups;
  }, {} as Record<string, ScheduleItem[]>);

  if (!selectedProject) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center h-32 pt-6">
            <p className="text-muted-foreground">Vyberte projekt pro zobrazení plánu publikace.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Plán publikace — {selectedProject.name}</h1>
          <p className="text-muted-foreground mt-1">
            Kalendář a správa naplánovaných publikací
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="gradient" className="shadow-strong">
              <Plus className="w-4 h-4 mr-2" />
              Přidat publikaci
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Naplánovat publikaci</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Kampaň (volitelné)</label>
                <Select
                  value={newItem.campaign_id || 'none'}
                  onValueChange={(value) => setNewItem({ ...newItem, campaign_id: value === 'none' ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Vyberte kampaň..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Obecná publikace</SelectItem>
                    {campaigns.map(campaign => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Kanál</label>
                <Select
                  value={newItem.channel}
                  onValueChange={(value) => setNewItem({ ...newItem, channel: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="push">Push</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Obsah</label>
                <Textarea
                  value={newItem.content}
                  onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}
                  placeholder="Zadejte obsah pro publikaci..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Datum publikace</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, 'dd.MM.yyyy', { locale: cs }) : 'Vyberte datum'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                        locale={cs}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Čas publikace</label>
                  <Input
                    type="time"
                    value={newItem.time}
                    onChange={(e) => setNewItem({ ...newItem, time: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4">
                <Button onClick={handleSave} className="flex-1">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Naplánovat
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  Zrušit
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Schedule Calendar View */}
      <div className="grid gap-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Načítání plánu publikace...</p>
          </div>
        ) : Object.keys(groupedItems).length > 0 ? (
          Object.entries(groupedItems).map(([date, items]) => (
            <Card key={date}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  {format(new Date(date), 'EEEE, dd. MMMM yyyy', { locale: cs })}
                  <Badge variant="outline" className="ml-auto">
                    {items.length} publikací
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {items.map((item) => {
                    const ChannelIcon = getChannelIcon(item.channel);
                    return (
                      <div
                        key={item.id}
                        className="flex items-start gap-4 p-4 border border-border rounded-lg hover:shadow-soft transition-all duration-300"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <ChannelIcon className="w-5 h-5 text-primary flex-shrink-0" />
                          
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">
                                {getChannelLabel(item.channel)}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(item.publish_at), 'HH:mm')}
                              </span>
                               {item.published ? (
                                <Badge className="bg-success text-success-foreground">
                                  Publikováno
                                </Badge>
                               ) : (
                                <Badge variant="secondary">
                                  Čeká
                                </Badge>
                               )}
                            </div>
                            
                            <div className="text-sm font-medium mb-1">
                              {getCampaignName(item.campaign_id)}
                            </div>
                            
                            <div className="text-sm text-muted-foreground truncate">
                              {item.content}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                           <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => togglePublished(item.id, item.published)}
                            title={item.published ? "Označit jako nepublikováno" : "Označit jako publikováno"}
                          >
                            {item.published ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
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
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Zatím nejsou naplánované žádné publikace
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Naplánovat první publikaci
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}