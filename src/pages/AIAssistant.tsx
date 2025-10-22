import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, Loader2, MessageSquare, Clock, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale/cs';
import { useSelectedProject } from '@/providers/ProjectProvider';

interface AIRequest {
  id: string;
  type: string;
  prompt: string;
  response: string | null;
  status: string;
  status_label: string;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

export default function AIAssistant() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedProject } = useSelectedProject();
  const [isLoading, setIsLoading] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [requestType, setRequestType] = useState('');
  const [aiRequests, setAiRequests] = useState<AIRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const fetchAIRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('v_ai_requests_status')
        .select('*')
        .eq('user_id', user.id);

      // Add project filter if selectedProject exists
      if (selectedProject?.id) {
        query = query.eq('project_id', selectedProject.id);
      }

      const { data, error } = await query.order('updated_at', { ascending: false });

      if (error) throw error;
      setAiRequests(data || []);
    } catch (error) {
      console.error('Error fetching AI requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  // Auto-sync history when selectedProject changes
  useEffect(() => {
    fetchAIRequests();
  }, [selectedProject]);

  // Realtime subscription for AIRequests updates
  useEffect(() => {
    const channel = supabase
      .channel('ai-requests-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'AIRequests'
        },
        (payload) => {
          console.log('AIRequest updated:', payload);
          
          // Check if status changed to 'completed'
          if (payload.new.status === 'completed' && payload.old.status === 'waiting') {
            toast({
              title: "✅ AI odpověď byla vygenerována",
              description: "Nová odpověď je k dispozici",
            });
          }
          
          // Refresh the list
          fetchAIRequests();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'AIRequests'
        },
        (payload) => {
          console.log('New AIRequest inserted:', payload);
          // Refresh the list
          fetchAIRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedProject]);


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
        return <Bot className="h-4 w-4" />;
      case 'autoresponder':
        return <Clock className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim() || !requestType) {
      toast({
        title: "Chyba",
        description: "Vyplňte všechna povinná pole",
        variant: "destructive"
      });
      return;
    }

    // Ověřit, že prompt má alespoň 10 znaků
    if (promptText.trim().length < 10) {
      toast({
        title: "Chyba",
        description: "Prompt musí obsahovat alespoň 10 znaků",
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

      console.log('Creating AI request:', {
        type: requestType,
        prompt: promptText,
        user_id: user.id,
        project_id: selectedProject?.id
      });

      // 1. NEJPRVE vytvoříme záznam v AIRequests
      const { data: aiRequest, error: insertError } = await supabase
        .from('AIRequests')
        .insert({
          type: requestType,
          prompt: promptText,
          user_id: user.id,
          project_id: selectedProject?.id || null,
          status: 'waiting',
          response: null
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error(insertError.message || 'Nepodařilo se vytvořit AI požadavek');
      }

      console.log('AI request created:', aiRequest.id);

      // 2. PAK zavoláme edge funkci pro zpracování
      const { error: functionError } = await supabase.functions.invoke('sofinity-agent-dispatcher', {
        body: {
          id: aiRequest.id,
          user_id: user.id,
          type: requestType,
          prompt: promptText
        }
      });

      if (functionError) {
        console.error('Edge function error:', functionError);
        
        // Označit požadavek jako error v databázi
        await supabase
          .from('AIRequests')
          .update({
            status: 'error',
            response: `❌ Chyba při volání AI: ${functionError.message}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', aiRequest.id);
        
        throw new Error(`Nepodařilo se zpracovat požadavek: ${functionError.message}`);
      }

      toast({
        title: "Úspěch!",
        description: "AI požadavek byl vytvořen a čeká na zpracování",
      });

      setPromptText('');
      setRequestType('');
      // Real-time subscription automaticky aktualizuje seznam

    } catch (error) {
      console.error('AI request error:', error);
      toast({
        title: "Chyba",
        description: error.message || "Nepodařilo se vytvořit AI požadavek",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const retryRequest = async (requestId: string, prompt: string, type: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Musíte být přihlášeni');

      setIsLoading(true);
      
      // Reset statusu na waiting
      await supabase
        .from('AIRequests')
        .update({
          status: 'waiting',
          response: '♻️ Požadavek byl znovu odeslán k AI zpracování.',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      // Zavolat edge funkci znovu
      const { error: functionError } = await supabase.functions.invoke('sofinity-agent-dispatcher', {
        body: {
          id: requestId,
          user_id: user.id,
          type: type,
          prompt: prompt
        }
      });

      if (functionError) {
        // Označit jako error
        await supabase
          .from('AIRequests')
          .update({
            status: 'error',
            response: `❌ Chyba při volání AI: ${functionError.message}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', requestId);
        
        throw new Error(functionError.message);
      }

      toast({
        title: "✅ Požadavek byl znovu odeslán",
        description: "AI začne zpracovávat požadavek",
      });
    } catch (error) {
      console.error('Retry error:', error);
      toast({
        title: "Chyba",
        description: error.message || "Nepodařilo se znovu odeslat požadavek",
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
          <h1 className="text-3xl font-bold text-foreground">AI Assistant Hub</h1>
          <p className="text-muted-foreground mt-1">
            Centrální hub pro všechny AI požadavky
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* AI Request Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Nový AI požadavek
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="requestType">Typ požadavku *</Label>
                <Select value={requestType} onValueChange={setRequestType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vyberte typ požadavku" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="campaign_generator">Generátor kampaní</SelectItem>
                    <SelectItem value="email_assistant">Email asistent</SelectItem>
                    <SelectItem value="autoresponder">Autoresponder</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="promptText">Prompt text *</Label>
                <Textarea
                  id="promptText"
                  placeholder="Zadejte váš požadavek pro AI..."
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  required
                  rows={4}
                />
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Zpracovávám...
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4 mr-2" />
                    Spustit AI
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* AI Requests List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Historie AI požadavků
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRequests ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : aiRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Zatím žádné AI požadavky</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {aiRequests.map((request) => (
                  <div 
                    key={request.id} 
                    className="border rounded-lg p-4 space-y-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/ai-assistant/${request.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(request.type)}
                        <span className="font-medium text-sm">
                          {getTypeLabel(request.type)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">
                          {request.status_label}
                        </span>
                        {(request.status === 'waiting' || request.status === 'error') && request.prompt && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              retryRequest(request.id, request.prompt, request.type);
                            }}
                            className="ml-2 h-6 px-2 text-xs"
                          >
                            🔄 Zkusit znovu
                          </Button>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(request.updated_at), { 
                            addSuffix: true, 
                            locale: cs 
                          })}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Prompt:</p>
                      <p className="text-sm bg-muted/50 p-2 rounded">
                        {(request.prompt || '').length > 100 
                          ? `${request.prompt?.substring(0, 100)}...` 
                          : (request.prompt || '')}
                      </p>
                    </div>

                    {request.response && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Odpověď:</p>
                        <p className="text-sm bg-green-50 p-2 rounded border-l-2 border-green-200">
                          {(request.response || '').length > 150 
                            ? `${request.response?.substring(0, 150)}...` 
                            : (request.response || '')}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}