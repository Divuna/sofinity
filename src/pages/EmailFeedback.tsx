import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function EmailFeedback() {
  const { emailId, choice } = useParams<{ emailId: string; choice: 'positive' | 'negative' }>();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const submitFeedback = async () => {
      if (!emailId || !choice) return;

      try {
        // Get client IP (simplified for demo)
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const { ip } = await ipResponse.json();

        // Check if already voted
        const { data: existingFeedback } = await supabase
          .from('Feedback')
          .select('id')
          .eq('email_id', emailId)
          .eq('ip_address', ip)
          .eq('source', 'email');

        if (existingFeedback && existingFeedback.length > 0) {
          setAlreadyVoted(true);
          setLoading(false);
          return;
        }

        // Get current user (optional)
        const { data: { user } } = await supabase.auth.getUser();

        // Submit feedback
        const { error } = await supabase
          .from('Feedback')
          .insert({
            email_id: emailId,
            user_id: user?.id || null,
            feedback_type: choice,
            source: 'email',
            sentiment: choice,
            submitted_at: new Date().toISOString(),
            ip_address: ip
          });

        if (error) throw error;

        setSubmitted(true);
        toast({
          title: "Děkujeme za zpětnou vazbu!",
          description: "Vaše hodnocení bylo úspěšně odesláno"
        });

      } catch (error) {
        console.error('Error submitting feedback:', error);
        toast({
          title: "Chyba",
          description: "Nepodařilo se odeslat zpětnou vazbu",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    submitFeedback();
  }, [emailId, choice, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            {alreadyVoted ? '✅' : choice === 'positive' ? '👍' : '👎'}
            {alreadyVoted ? 'Už jste hlasovali' : 'Zpětná vazba odeslána'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {alreadyVoted ? (
            <p className="text-muted-foreground">
              Už jste hlasovali. Děkujeme!
            </p>
          ) : (
            <>
              <div className="text-4xl animate-bounce">
                {choice === 'positive' ? '👍' : '👎'}
              </div>
              <p className="text-lg font-medium">
                Děkujeme za zpětnou vazbu!
              </p>
              <p className="text-muted-foreground">
                Vaše hodnocení nám pomůže zlepšit naše e-maily.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}