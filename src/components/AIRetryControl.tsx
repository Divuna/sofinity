import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function AIRetryControl() {
  const [isRetrying, setIsRetrying] = useState(false);
  const { toast } = useToast();

  const handleAIRetry = async () => {
    setIsRetrying(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Musíte být přihlášeni');
      }

      // Find the most recent failed AI request
      const { data: failedRequests, error: fetchError } = await supabase
        .from('AIRequests')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'error')
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchError) {
        throw new Error('Chyba při načítání neúspěšných požadavků: ' + fetchError.message);
      }

      if (!failedRequests || failedRequests.length === 0) {
        toast({
          title: "Žádné neúspěšné požadavky",
          description: "Nejsou žádné AI požadavky k opakování",
          variant: "default"
        });
        return;
      }

      const request = failedRequests[0];
      console.log('Retrying AI request:', request);

      // Update status to 'waiting'
      const { error: updateError } = await supabase
        .from('AIRequests')
        .update({ status: 'waiting' })
        .eq('id', request.id);

      if (updateError) {
        throw new Error('Chyba při aktualizaci statusu: ' + updateError.message);
      }

      // Re-invoke the ai-assistant edge function
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
        console.error('AI function error on retry:', error);
        // Update status back to 'error' if the retry fails
        await supabase
          .from('AIRequests')
          .update({ status: 'error' })
          .eq('id', request.id);
        throw new Error(error.message || 'Chyba při opakování AI funkce');
      }

      if (data?.error) {
        console.error('AI function returned error on retry:', data.error);
        // Update status back to 'error' if the retry fails
        await supabase
          .from('AIRequests')
          .update({ status: 'error' })
          .eq('id', request.id);
        throw new Error(data.error);
      }

      // Update the request status to completed if AI function didn't do it
      if (data?.aiContent) {
        const { error: finalUpdateError } = await supabase
          .from('AIRequests')
          .update({
            status: 'completed',
            response: JSON.stringify(data.aiContent)
          })
          .eq('id', request.id);

        if (finalUpdateError) {
          console.error('Error updating request status to completed:', finalUpdateError);
        }
      }

      toast({
        title: "Úspěch!",
        description: "Požadavek byl znovu zpracován",
      });

    } catch (error) {
      console.error('AI retry error:', error);
      toast({
        title: "Chyba",
        description: error.message || "Nepodařilo se znovu zpracovat požadavek",
        variant: "destructive"
      });
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <Button
      onClick={handleAIRetry}
      disabled={isRetrying}
      variant="outline"
      className="flex items-center gap-2"
    >
      {isRetrying ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Opakuji...
        </>
      ) : (
        <>
          <RotateCcw className="h-4 w-4" />
          Znovu spustit AI
        </>
      )}
    </Button>
  );
}