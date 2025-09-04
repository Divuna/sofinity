import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, FileText, Mail, MessageSquare, Bot, Clock, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';

interface AIRequest {
  id: string;
  type: string;
  prompt: string;
  response: string | null;
  status: string;
  created_at: string;
  user_id: string;
}

export default function AIRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [aiRequest, setAiRequest] = useState<AIRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchAIRequest = async () => {
      if (!id) return;
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('AIRequests')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        setAiRequest(data);
      } catch (error) {
        console.error('Error fetching AI request:', error);
        toast({
          title: "Chyba",
          description: "Nepodařilo se načíst AI požadavek",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAIRequest();
  }, [id, toast]);

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
        return <Mail className="h-4 w-4" />;
      case 'autoresponder':
        return <Bot className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const saveAsCampaign = async () => {
    if (!aiRequest || !aiRequest.response) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Musíte být přihlášeni');

      // Extract project name from prompt or use default
      const projectMatch = aiRequest.prompt.match(/projekt[:\s]*([^\n,]+)/i);
      const projectName = projectMatch ? projectMatch[1].trim() : 'Nespecifikovaný projekt';

      const { error } = await supabase
        .from('Campaigns')
        .insert({
          name: `AI Kampaň - ${formatDistanceToNow(new Date(aiRequest.created_at), { locale: cs })}`,
          user_id: user.id,
          status: 'draft',
          targeting: aiRequest.prompt,
          email: aiRequest.response,
          post: aiRequest.response
        });

      if (error) throw error;

      toast({
        title: "Úspěch!",
        description: "Kampaň byla úspěšně uložena",
      });

      navigate('/campaigns');
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se uložit kampaň",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const saveAsEmail = async () => {
    if (!aiRequest || !aiRequest.response) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Musíte být přihlášeni');

      const { error } = await supabase
        .from('Emails')
        .insert({
          type: 'customer_welcome',
          content: aiRequest.response,
          recipient: 'podpora@opravo.cz',
          project: 'Opravo',
          user_id: user.id,
          project_id: null
        });

      if (error) throw error;

      toast({
        title: "Úspěch!",
        description: "E-mail byl uložen do seznamu.",
      });

    } catch (error) {
      console.error('Error saving email:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se uložit email",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Bot className="h-12 w-12 mx-auto mb-4 animate-pulse text-primary" />
          <p>Načítám AI požadavek...</p>
        </div>
      </div>
    );
  }

  if (!aiRequest) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p>AI požadavek nebyl nalezen</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => navigate('/ai-assistant')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zpět na AI asistent
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate('/ai-assistant')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zpět
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Detail AI výstupu</h1>
          <p className="text-muted-foreground mt-1">
            Podrobnosti a možnosti uložení AI odpovědi
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Header Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getTypeIcon(aiRequest.type)}
                <div>
                  <CardTitle>{getTypeLabel(aiRequest.type)}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    {aiRequest.status === 'completed' ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Dokončeno
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="h-3 w-3" />
                        Zpracovává se
                      </Badge>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(aiRequest.created_at), { 
                        addSuffix: true, 
                        locale: cs 
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Prompt */}
        <Card>
          <CardHeader>
            <CardTitle>Původní prompt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 p-4 rounded-lg">
              <pre className="whitespace-pre-wrap font-mono text-sm">
                {aiRequest.prompt}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Response */}
        {aiRequest.response && (
          <Card>
            <CardHeader>
              <CardTitle>Odpověď AI</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-green-50 border-l-4 border-green-200 p-4 rounded-lg">
                <pre className="whitespace-pre-wrap text-sm">
                  {aiRequest.response}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {aiRequest.response && aiRequest.status === 'completed' && (
          <Card>
            <CardHeader>
              <CardTitle>Akce</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                {aiRequest.type === 'campaign_generator' && (
                  <Button 
                    onClick={saveAsCampaign}
                    disabled={saving}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Ukládám...' : 'Uložit jako kampaň'}
                  </Button>
                )}
                
                {aiRequest.type === 'email_assistant' && (
                  <Button 
                    onClick={saveAsEmail}
                    disabled={saving}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Ukládám...' : 'Uložit e-mail'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}