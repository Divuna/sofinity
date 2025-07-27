import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Mail, Sparkles, Bot, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function AIAssistant() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    project: '',
    goal: ''
  });
  const [emailForm, setEmailForm] = useState({
    emailType: '',
    project: '',
    purpose: ''
  });

  const handleCampaignGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignForm.project || !campaignForm.goal) {
      toast({
        title: "Chyba",
        description: "Vyplňte všechna povinná pole",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Musíte být přihlášeni');
      }

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: 'campaign',
          data: campaignForm,
          user_id: user.id
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Úspěch!",
        description: "Kampaň byla úspěšně vygenerována a uložena",
      });

      setCampaignForm({ project: '', goal: '' });

    } catch (error) {
      console.error('Campaign generation error:', error);
      toast({
        title: "Chyba",
        description: error.message || "Nepodařilo se vygenerovat kampaň",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForm.emailType || !emailForm.project || !emailForm.purpose) {
      toast({
        title: "Chyba",
        description: "Vyplňte všechna povinná pole",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Musíte být přihlášeni');
      }

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: 'email',
          data: emailForm,
          user_id: user.id
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Úspěch!",
        description: "Email byl úspěšně vygenerován a uložen",
      });

      setEmailForm({ emailType: '', project: '', purpose: '' });

    } catch (error) {
      console.error('Email generation error:', error);
      toast({
        title: "Chyba",
        description: error.message || "Nepodařilo se vygenerovat email",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <Bot className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">AI Asistent</h1>
          <p className="text-muted-foreground mt-1">
            Inteligentní nástroje pro marketing a komunikaci
          </p>
        </div>
      </div>

      <Tabs defaultValue="campaign" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="campaign" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Generátor kampaní
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email asistent
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaign">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Generátor marketingových kampaní
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Zadejte projekt a cíl. AI vytvoří kompletní marketingovou kampaň včetně názvů, cílení, emailů a příspěvků.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCampaignGenerate} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="project">Název projektu *</Label>
                    <Select 
                      value={campaignForm.project} 
                      onValueChange={(value) => setCampaignForm(prev => ({ ...prev, project: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Vyberte projekt" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Opravo">Opravo</SelectItem>
                        <SelectItem value="BikeShare24">BikeShare24</SelectItem>
                        <SelectItem value="CoDneska">CoDneska</SelectItem>
                        <SelectItem value="FitnessCentrum">FitnessCentrum</SelectItem>
                        <SelectItem value="EcoShop">EcoShop</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="goal">Hlavní cíl kampaně *</Label>
                    <Input
                      id="goal"
                      placeholder="např. zvýšit počet registrací o 30%"
                      value={campaignForm.goal}
                      onChange={(e) => setCampaignForm(prev => ({ ...prev, goal: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generuji kampaň...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      Vygenerovat kampaň
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email asistent
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Vytvořte profesionální emaily pro různé účely. AI vytvoří obsah přizpůsobený vašemu projektu a cíli.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEmailGenerate} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="emailType">Typ emailu *</Label>
                    <Select 
                      value={emailForm.emailType} 
                      onValueChange={(value) => setEmailForm(prev => ({ ...prev, emailType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Vyberte typ emailu" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="promo">Promo email</SelectItem>
                        <SelectItem value="onboarding">Onboarding email</SelectItem>
                        <SelectItem value="follow-up">Follow-up email</SelectItem>
                        <SelectItem value="newsletter">Newsletter</SelectItem>
                        <SelectItem value="reminder">Připomínka</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emailProject">Projekt *</Label>
                    <Select 
                      value={emailForm.project} 
                      onValueChange={(value) => setEmailForm(prev => ({ ...prev, project: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Vyberte projekt" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Opravo">Opravo</SelectItem>
                        <SelectItem value="BikeShare24">BikeShare24</SelectItem>
                        <SelectItem value="CoDneska">CoDneska</SelectItem>
                        <SelectItem value="FitnessCentrum">FitnessCentrum</SelectItem>
                        <SelectItem value="EcoShop">EcoShop</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purpose">Účel emailu *</Label>
                  <Textarea
                    id="purpose"
                    placeholder="např. připomenutí dokončení registrace, představení nových funkcí"
                    value={emailForm.purpose}
                    onChange={(e) => setEmailForm(prev => ({ ...prev, purpose: e.target.value }))}
                    required
                    rows={3}
                  />
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generuji email...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Vygenerovat email
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Webhook Integration Info */}
      <Card>
        <CardHeader>
          <CardTitle>Make.com Integrace</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Všechny vygenerované kampaně a emaily se automaticky ukládají do databáze a mohou být použity 
            pro webhook integraci s Make.com pro automatickou publikaci.
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>AI asistent je připraven k použití</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}