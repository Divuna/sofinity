import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function AIControl() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleAIProcessing = async () => {
    setIsProcessing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Musíte být přihlášeni');
      }

      // Fetch waiting AI requests
      const { data: waitingRequests, error: fetchError } = await supabase
        .from('AIRequests')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'waiting')
        .in('type', ['email_assistant', 'campaign_generator'])
        .order('created_at', { ascending: true })
        .limit(1);

      if (fetchError) {
        throw new Error('Chyba při načítání AI požadavků: ' + fetchError.message);
      }

      if (!waitingRequests || waitingRequests.length === 0) {
        toast({
          title: "Žádné čekající požadavky",
          description: "Nejsou žádné AI požadavky ke zpracování",
          variant: "default"
        });
        return;
      }

      const request = waitingRequests[0];
      console.log('Processing AI request:', request);

      // Call the ai-assistant edge function with the request data
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: request.type,
          prompt: request.prompt,
          user_id: user.id,
          project_id: request.project_id,
          request_id: request.id
        }
      });

      if (error) {
        console.error('AI function error:', error);
        throw new Error(error.message || 'Chyba při volání AI funkce');
      }

      if (data?.error) {
        console.error('AI function returned error:', data.error);
        throw new Error(data.error);
      }

      // Update the request status to completed if AI function didn't do it
      if (data?.aiContent) {
        const { error: updateError } = await supabase
          .from('AIRequests')
          .update({
            status: 'completed',
            response: JSON.stringify(data.aiContent)
          })
          .eq('id', request.id);

        if (updateError) {
          console.error('Error updating request status:', updateError);
        }
      }

      toast({
        title: "Úspěch!",
        description: "AI odpověď byla vygenerována",
      });

    } catch (error) {
      console.error('AI processing error:', error);
      toast({
        title: "Chyba",
        description: error.message || "Nepodařilo se zpracovat AI požadavek",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button
      onClick={handleAIProcessing}
      disabled={isProcessing}
      variant="default"
      className="flex items-center gap-2"
    >
      {isProcessing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Zpracovávám...
        </>
      ) : (
        <>
          <Bot className="h-4 w-4" />
          Spustit AI zpracování
        </>
      )}
    </Button>
  );
}