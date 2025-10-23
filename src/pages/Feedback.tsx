import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useSelectedProject } from '@/providers/ProjectProvider';
import { useToast } from '@/hooks/use-toast';
import { 
  Star, 
  TrendingUp, 
  MessageSquare, 
  ThumbsUp,
  ThumbsDown,
  Filter,
  Download,
  Calendar,
  User,
  BarChart3,
  Heart,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

const feedbackData = [
  {
    id: 1,
    user: {
      name: 'Tomáš Svoboda',
      email: 'tomas.svoboda@bikeshare24.cz',
      company: 'BikeShare24 a.s.',
      avatar: 'TS'
    },
    campaign: 'BikeShare24 - Expanze Praha',
    rating: 5,
    comment: 'Výborná kampaň! Díky AI optimalizaci jsme dosáhli výrazně vyšší konverze než očekávali. Komunikace byla profesionální a výsledky překonaly naše očekávání.',
    timestamp: '2024-08-14T15:30:00',
    category: 'campaign_success',
    sentiment: 'positive',
    tags: ['AI optimalizace', 'vysoká konverze', 'profesionalita'],
    helpful: 8,
    campaignType: 'Social Media',
    responseFromTeam: 'Děkujeme za skvělou zpětnou vazbu! Těšíme se na další spolupráci.',
    status: 'responded'
  },
  {
    id: 2,
    user: {
      name: 'Jana Dvořáková',
      email: 'jana@opravo.cz',
      company: 'Opravo s.r.o.',
      avatar: 'JD'
    },
    campaign: 'Opravo - Letní promo 2024',
    rating: 4,
    comment: 'Celkově spokojenost, kampaň byla úspěšná. Oceňujeme rychlost implementace a kreativní přístup. Jediné minus byly menší problémy s načasováním některých postů.',
    timestamp: '2024-08-12T10:15:00',
    category: 'general_satisfaction',
    sentiment: 'positive',
    tags: ['rychlost', 'kreativita', 'načasování'],
    helpful: 12,
    campaignType: 'Email + Social',
    responseFromTeam: null,
    status: 'pending'
  },
  {
    id: 3,
    user: {
      name: 'Marie Nováková',
      email: 'marie@codneska.cz',
      company: 'CoDneska z.s.',
      avatar: 'MN'
    },
    campaign: 'CoDneska - Víkendové akce',
    rating: 3,
    comment: 'Kampaň splnila základní očekávání, ale mohla by být více personalizovaná. Chybí nám lepší targeting na lokalitu a věkové skupiny.',
    timestamp: '2024-08-10T14:45:00',
    category: 'improvement_suggestion',
    sentiment: 'neutral',
    tags: ['personalizace', 'targeting', 'lokalita'],
    helpful: 5,
    campaignType: 'Event Marketing',
    responseFromTeam: 'Děkujeme za konstruktivní zpětnou vazbu. Připravíme lepší targeting pro příští kampaň.',
    status: 'responded'
  },
  {
    id: 4,
    user: {
      name: 'Pavel Černý',
      email: 'pavel@opravo.cz',
      company: 'Opravo s.r.o.',
      avatar: 'PC'
    },
    campaign: 'Opravo - Video tutoriály',
    rating: 5,
    comment: 'Fantastická práce na video obsahu! AI script byl přesně to, co jsme potřebovali. Engagement rate na YouTube překonal všechna očekávání.',
    timestamp: '2024-08-08T11:20:00',
    category: 'content_quality',
    sentiment: 'positive',
    tags: ['video obsah', 'AI script', 'YouTube'],
    helpful: 15,
    campaignType: 'Video Marketing',
    responseFromTeam: 'Jsme rádi, že se video obsah povedl! Plánujeme další video série.',
    status: 'responded'
  },
  {
    id: 5,
    user: {
      name: 'Lukáš Procházka',
      email: 'lukas@codneska.cz',
      company: 'CoDneska z.s.',
      avatar: 'LP'
    },
    campaign: 'CoDneska - Community building',
    rating: 2,
    comment: 'Očekávali jsme více inovativní přístup. Kampaň byla příliš obecná a nedosáhla cílové skupiny jak jsme doufali.',
    timestamp: '2024-08-05T09:30:00',
    category: 'unmet_expectations',
    sentiment: 'negative',
    tags: ['inovace', 'cílová skupina', 'obecnost'],
    helpful: 3,
    campaignType: 'Community',
    responseFromTeam: null,
    status: 'needs_attention'
  }
];

const sentimentConfig = {
  positive: { color: 'bg-success', label: 'Pozitivní', icon: ThumbsUp },
  neutral: { color: 'bg-warning', label: 'Neutrální', icon: MessageSquare },
  negative: { color: 'bg-destructive', label: 'Negativní', icon: ThumbsDown }
};

const statusConfig = {
  pending: { color: 'bg-sofinity-orange', label: 'Čeká na odpověď', icon: AlertCircle },
  responded: { color: 'bg-success', label: 'Odpovězeno', icon: CheckCircle },
  needs_attention: { color: 'bg-destructive', label: 'Vyžaduje pozornost', icon: AlertCircle }
};

export default function Feedback() {
  const { selectedProject } = useSelectedProject();
  const { toast } = useToast();
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');
  const [filterSentiment, setFilterSentiment] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedProject?.id) {
      fetchFeedback();
    }
  }, [selectedProject?.id]);

  const fetchFeedback = async () => {
    if (!selectedProject?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('Feedback')
        .select('*, Campaigns(name, project_id)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter by project through campaign relationship
      const projectFeedback = data?.filter(f => f.Campaigns?.project_id === selectedProject.id) || [];
      setFeedbackList(projectFeedback);
      if (projectFeedback.length > 0 && !selectedFeedback) {
        setSelectedFeedback(projectFeedback[0]);
      }
    } catch (error) {
      console.error('Error fetching feedback:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se načíst zpětnou vazbu',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredFeedback = feedbackList.filter(feedback => {
    const matchesRating = filterRating === 'all' || feedback.rating === filterRating;
    const matchesSentiment = filterSentiment === 'all' || feedback.sentiment === filterSentiment;
    return matchesRating && matchesSentiment;
  });

  const averageRating = feedbackList.length > 0 ? feedbackList.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbackList.length : 0;
  const totalResponses = feedbackList.length;
  const positiveCount = feedbackList.filter(f => f.sentiment === 'positive').length;
  const satisfactionRate = totalResponses > 0 ? (positiveCount / totalResponses) * 100 : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: feedbackList.filter(f => f.rating === rating).length,
    percentage: totalResponses > 0 ? (feedbackList.filter(f => f.rating === rating).length / totalResponses) * 100 : 0
  }));

  if (loading) {
    return (
      <div className="space-y-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Načítání zpětné vazby...</p>
        </div>
      </div>
    );
  }

  if (!selectedProject) {
    return (
      <div className="space-y-6 flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Vyberte prosím projekt</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Zpětná vazba</h1>
          <p className="text-muted-foreground mt-1">
            Hodnocení a komentáře ke kampaním od zákazníků
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export reportu
          </Button>
          <Button variant="gradient">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analýza sentimentu
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Průměrné hodnocení</p>
                <div className="flex items-center space-x-1">
                  <p className="text-2xl font-bold text-foreground">{averageRating.toFixed(1)}</p>
                  <Star className="w-5 h-5 text-warning fill-warning" />
                </div>
              </div>
              <Star className="w-8 h-8 text-sofinity-orange" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Celkem odpovědí</p>
                <p className="text-2xl font-bold text-foreground">{totalResponses}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-sofinity-purple" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Spokojenost</p>
                <p className="text-2xl font-bold text-success">{satisfactionRate.toFixed(0)}%</p>
              </div>
              <ThumbsUp className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Celkem odpovědí</p>
                <p className="text-2xl font-bold text-foreground">
                  {totalResponses}
                </p>
              </div>
              <Heart className="w-8 h-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Rating Distribution */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Distribuce hodnocení</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ratingDistribution.map((item) => (
                <div key={item.rating} className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1 w-8">
                    <span className="text-sm font-medium">{item.rating}</span>
                    <Star className="w-3 h-3 text-warning fill-warning" />
                  </div>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div 
                      className="bg-sofinity-purple h-2 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-8">{item.count}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Filters */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Filtry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Hodnocení</label>
                <select 
                  value={filterRating}
                  onChange={(e) => setFilterRating(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                  className="w-full p-2 border border-border rounded-md bg-background"
                >
                  <option value="all">Všechna hodnocení</option>
                  <option value={5}>5 hvězdiček</option>
                  <option value={4}>4 hvězdičky</option>
                  <option value={3}>3 hvězdičky</option>
                  <option value={2}>2 hvězdičky</option>
                  <option value={1}>1 hvězdička</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Sentiment</label>
                <select 
                  value={filterSentiment}
                  onChange={(e) => setFilterSentiment(e.target.value)}
                  className="w-full p-2 border border-border rounded-md bg-background"
                >
                  <option value="all">Všechny</option>
                  <option value="positive">Pozitivní</option>
                  <option value="neutral">Neutrální</option>
                  <option value="negative">Negativní</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>

          {/* Feedback List */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {filteredFeedback.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    Žádná zpětná vazba pro tento projekt
                  </CardContent>
                </Card>
              ) : filteredFeedback.map((feedback) => {
              const sentimentConfig_ = sentimentConfig[feedback.sentiment as keyof typeof sentimentConfig];
              const statusConfig_ = statusConfig[feedback.status as keyof typeof statusConfig];
              
              return (
                <Card 
                  key={feedback.id}
                  className={`cursor-pointer transition-all duration-300 hover:shadow-medium ${
                    selectedFeedback.id === feedback.id ? 'border-primary shadow-soft' : ''
                  }`}
                  onClick={() => setSelectedFeedback(feedback)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="flex items-center space-x-1">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-4 h-4 ${
                                  i < feedback.rating 
                                    ? 'text-warning fill-warning' 
                                    : 'text-muted-foreground'
                                }`} 
                              />
                            ))}
                          </div>
                          <Badge className={`${sentimentConfig_.color} text-white text-xs`}>
                            {sentimentConfig_.label}
                          </Badge>
                          <Badge className={`${statusConfig_.color} text-white text-xs`}>
                            {statusConfig_.label}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-primary text-white flex items-center justify-center text-sm font-medium">
                            {feedback.user_id?.substring(0, 2).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{feedback.Campaigns?.name || 'Neznámá kampaň'}</div>
                            <div className="text-sm text-muted-foreground">{feedback.feedback_type || 'Obecná zpětná vazba'}</div>
                          </div>
                        </div>
                        
                        <p className="text-sm text-foreground mb-3 leading-relaxed line-clamp-3">
                          {feedback.comment}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>{feedback.Campaigns?.name || 'N/A'}</span>
                          <span>{new Date(feedback.created_at).toLocaleDateString('cs-CZ')}</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-1 mt-3">
                          <Badge variant="outline" className="text-xs">
                            {feedback.source || 'N/A'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="text-right ml-4">
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          <Star className="w-3 h-3 text-warning fill-warning" />
                          <span>{feedback.rating || 0}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

          {/* Feedback Details */}
          <div className="lg:col-span-1">
            {selectedFeedback ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-4 h-4 ${
                            i < (selectedFeedback.rating || 0)
                              ? 'text-warning fill-warning' 
                              : 'text-muted-foreground'
                          }`} 
                        />
                      ))}
                    </div>
                    <span className="text-lg font-semibold">{selectedFeedback.rating || 0}/5</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Kampaň</h4>
                    <Badge variant="outline" className="text-xs mb-2">
                      {selectedFeedback.Campaigns?.name || 'Neznámá kampaň'}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      Typ: {selectedFeedback.feedback_type || 'N/A'}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-2">Komentář</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selectedFeedback.comment || 'Žádný komentář'}
                </p>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-2">Datum</h4>
                <p className="text-sm text-muted-foreground">
                  {new Date(selectedFeedback.created_at).toLocaleString('cs-CZ')}
                </p>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-2">Sentiment</h4>
                <Badge className={`${sentimentConfig[selectedFeedback.sentiment as keyof typeof sentimentConfig]?.color || 'bg-muted'} text-white`}>
                  {sentimentConfig[selectedFeedback.sentiment as keyof typeof sentimentConfig]?.label || selectedFeedback.sentiment}
                </Badge>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-2">Přidat odpověď</h4>
                <Textarea placeholder="Napište odpověď zákazníkovi..." className="mb-3" />
                <Button variant="gradient" size="sm" className="w-full">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Odeslat odpověď
                </Button>
              </div>
            </CardContent>
            </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Vyberte zpětnou vazbu pro zobrazení detailů
                </CardContent>
              </Card>
            )}
          </div>
      </div>
    </div>
  );
}