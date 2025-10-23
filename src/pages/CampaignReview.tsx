import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useSelectedProject } from '@/providers/ProjectProvider';
import { useToast } from '@/hooks/use-toast';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Eye, 
  MessageSquare, 
  FileText,
  User,
  Calendar,
  TrendingUp
} from 'lucide-react';

// Sample data for campaigns awaiting review
const pendingCampaigns = [
  {
    id: 1,
    title: "Letní výprodej 2024",
    author: "Jana Nováková",
    submittedDate: "2024-01-15",
    status: "submitted",
    priority: "vysoká",
    type: "Email kampaň",
    description: "Rozsáhlá email kampaň pro letní výprodej s personalizovanými nabídkami",
    estimatedReach: 25000,
    budget: "50 000 Kč"
  },
  {
    id: 2,
    title: "Nové produkty Q1",
    author: "Tomáš Svoboda",
    submittedDate: "2024-01-14",
    status: "needs_edits",
    priority: "střední",
    type: "Social media",
    description: "Představení nových produktů na sociálních sítích",
    estimatedReach: 15000,
    budget: "30 000 Kč"
  },
  {
    id: 3,
    title: "Zákaznická spokojenost",
    author: "Marie Procházková",
    submittedDate: "2024-01-13",
    status: "submitted",
    priority: "nízká",
    type: "Průzkum",
    description: "Průzkum spokojenosti zákazníků s možností zpětné vazby",
    estimatedReach: 5000,
    budget: "15 000 Kč"
  }
];

const approvalHistory = [
  {
    id: 1,
    campaignId: 2,
    action: "Požadavek na úpravu",
    author: "Vedoucí Marketing",
    date: "2024-01-14 14:30",
    comment: "Prosím upravte cílovou skupinu a zdůrazněte klíčové benefity produktů."
  },
  {
    id: 2,
    campaignId: 2,
    action: "Odesláno k revizi",
    author: "Tomáš Svoboda",
    date: "2024-01-14 10:15",
    comment: "Kampaň připravena k posouzení."
  }
];

export default function CampaignReview() {
  const { selectedProject } = useSelectedProject();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewStatus, setReviewStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedProject?.id) {
      fetchCampaigns();
    }
  }, [selectedProject?.id]);

  const fetchCampaigns = async () => {
    if (!selectedProject?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('Campaigns')
        .select('*')
        .eq('project_id', selectedProject.id)
        .in('status', ['draft', 'review'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setCampaigns(data || []);
      if (data && data.length > 0 && !selectedCampaign) {
        setSelectedCampaign(data[0]);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se načíst kampaně',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted': return <Clock className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'needs_edits': return <AlertCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'needs_edits': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'submitted': return 'Čeká na schválení';
      case 'approved': return 'Schváleno';
      case 'needs_edits': return 'Vyžaduje úpravy';
      case 'rejected': return 'Zamítnuto';
      default: return 'Neznámý stav';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'vysoká': return 'bg-red-100 text-red-800';
      case 'střední': return 'bg-yellow-100 text-yellow-800';
      case 'nízká': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleApproval = async (action: string) => {
    if (!selectedCampaign || !reviewStatus) return;

    try {
      const { error } = await supabase
        .from('Campaigns')
        .update({ 
          status: reviewStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCampaign.id);

      if (error) throw error;

      toast({
        title: 'Úspěch',
        description: `Kampaň byla ${reviewStatus === 'approved' ? 'schválena' : 'aktualizována'}`
      });

      setReviewComment('');
      setReviewStatus('');
      fetchCampaigns();
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se aktualizovat kampaň',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Načítání kampaní...</p>
        </div>
      </div>
    );
  }

  if (!selectedProject) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-6 flex items-center justify-center">
        <p className="text-muted-foreground">Vyberte prosím projekt</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Schvalování kampaní
            </h1>
            <p className="text-muted-foreground mt-1">
              Správa a schvalování marketingových kampaní
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Export přehledu
            </Button>
            <Button className="bg-gradient-primary text-white">
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytický přehled
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Campaign List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Kampaně k přezkumu
                </CardTitle>
                <CardDescription>
                  {campaigns.length} kampaní čeká na vaše rozhodnutí
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {campaigns.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Žádné kampaně ke schválení
                  </div>
                ) : campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedCampaign.id === campaign.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedCampaign(campaign)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-sm">{campaign.name}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <User className="w-3 h-3" />
                      {campaign.user_id}
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={getStatusColor(campaign.status)}>
                        {getStatusIcon(campaign.status)}
                        <span className="ml-1">{getStatusText(campaign.status)}</span>
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(campaign.created_at).toLocaleDateString('cs-CZ')}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Campaign Detail & Review */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="detail" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="detail">Detail kampaně</TabsTrigger>
                <TabsTrigger value="review">Schvalování</TabsTrigger>
                <TabsTrigger value="history">Historie</TabsTrigger>
              </TabsList>

              <TabsContent value="detail">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{selectedCampaign?.name || 'Vyberte kampaň'}</CardTitle>
                      <Badge className={getStatusColor(selectedCampaign.status)}>
                        {getStatusIcon(selectedCampaign.status)}
                        <span className="ml-1">{getStatusText(selectedCampaign.status)}</span>
                      </Badge>
                    </div>
                    <CardDescription>
                      {selectedCampaign?.email_mode || 'N/A'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-2">Email obsah</h4>
                      <p className="text-muted-foreground">{selectedCampaign?.email || 'Žádný obsah'}</p>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-2">Časové údaje</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Vytvořeno:</span>
                            <span className="font-medium">{new Date(selectedCampaign?.created_at).toLocaleDateString('cs-CZ')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <Badge>{selectedCampaign?.status}</Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex gap-3">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        Náhled kampaně
                      </Button>
                      <Button variant="outline" size="sm">
                        <FileText className="w-4 h-4 mr-2" />
                        Zobrazit obsah
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="review">
                <Card>
                  <CardHeader>
                    <CardTitle>Schválení kampaně</CardTitle>
                    <CardDescription>
                      Rozhodněte o osudu kampaně "{selectedCampaign?.name}"
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Rozhodnutí
                      </label>
                      <Select value={reviewStatus} onValueChange={setReviewStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="Vyberte rozhodnutí" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="approved">Schválit kampaň</SelectItem>
                          <SelectItem value="needs_edits">Vyžaduje úpravy</SelectItem>
                          <SelectItem value="rejected">Zamítnout</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Komentář a zpětná vazba
                      </label>
                      <Textarea
                        placeholder="Zadejte podrobný komentář k rozhodnutí..."
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        rows={4}
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button 
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleApproval('approve')}
                        disabled={!reviewStatus}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Potvrdit rozhodnutí
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setReviewComment('');
                          setReviewStatus('');
                        }}
                      >
                        Zrušit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Historie schvalování
                    </CardTitle>
                    <CardDescription>
                      Chronologie všech akcí a komentářů
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {approvalHistory
                        .filter(entry => entry.campaignId === selectedCampaign?.id)
                        .map((entry) => (
                        <div key={entry.id} className="flex gap-4 p-4 border rounded-lg">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>{entry.author.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{entry.author}</span>
                              <span className="text-xs text-muted-foreground">{entry.date}</span>
                            </div>
                            <p className="text-sm font-medium text-primary mb-1">
                              {entry.action}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {entry.comment}
                            </p>
                          </div>
                        </div>
                      ))}
                      
                      {approvalHistory.filter(entry => entry.campaignId === selectedCampaign?.id).length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>Zatím žádná historie schvalování</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}