import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Code,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Zap
} from 'lucide-react';

interface APIResponse {
  id: string;
  status: string;
  response: string | null;
  created_at: string;
}

export default function OffersAPI() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [jsonPayload, setJsonPayload] = useState(`{
  "type": "OfferCreated",
  "offer": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "request_id": "123e4567-e89b-12d3-a456-426614174000",
    "repairer_id": "789e0123-e45b-67c8-d901-234567890123",
    "price": 15000,
    "status": "pending",
    "kategorie": "Instalatér"
  },
  "user": {
    "id": "user123",
    "email": "divispavel2@gmail.com"
  }
}`);
  const [loading, setLoading] = useState(false);
  const [apiResponses, setApiResponses] = useState<APIResponse[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id || null);
    };
    getCurrentUser();
  }, []);

  const handleAPICall = async () => {
    try {
      setLoading(true);

      // Parse JSON to validate format
      let parsedPayload;
      try {
        parsedPayload = JSON.parse(jsonPayload);
      } catch (error) {
        toast({
          title: "Chyba",
          description: "Neplatný JSON formát",
          variant: "destructive"
        });
        return;
      }

      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke('opravo-offers-integration', {
        body: parsedPayload
      });

      // Store the request in AIRequests for debugging
      const { data: aiRequest, error: aiError } = await supabase
        .from('AIRequests')
        .insert({
          type: 'opravo_offers_api_test',
          prompt: `Opravo Offers API Test - ${parsedPayload.type}`,
          response: JSON.stringify({ data, error }),
          status: error ? 'error' : 'completed',
          user_id: currentUserId
        })
        .select()
        .single();

      if (aiError) {
        console.error('Error storing API request:', aiError);
      }

      // Add to local responses
      if (aiRequest) {
        const newResponse: APIResponse = {
          id: aiRequest.id,
          status: aiRequest.status,
          response: aiRequest.response,
          created_at: aiRequest.created_at
        };
        setApiResponses(prev => [newResponse, ...prev]);
      }

      if (error) {
        toast({
          title: "Chyba API",
          description: error.message || "Neočekávaná chyba při volání API",
          variant: "destructive"
        });
      } else {
        toast({
          title: "API volání úspěšné",
          description: "Nabídka byla úspěšně zpracována",
        });
      }

    } catch (error) {
      console.error('Error calling API:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se zavolat API",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-success text-success-foreground"><CheckCircle className="w-3 h-3 mr-1" />Dokončeno</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Chyba</Badge>;
      case 'waiting':
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Čeká</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Opravo Offers API Test</h1>
          <p className="text-muted-foreground mt-1">
            Testování integrace s Opravo nabídkami
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* API Call Interface */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Code className="w-5 h-5 mr-2" />
              API Payload
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                JSON Payload pro Opravo Offers Integration
              </label>
              <Textarea
                value={jsonPayload}
                onChange={(e) => setJsonPayload(e.target.value)}
                placeholder="Zadejte JSON payload..."
                className="font-mono text-sm min-h-[300px]"
              />
            </div>
            <Button 
              onClick={handleAPICall}
              disabled={loading}
              className="w-full"
              variant="gradient"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Volání API...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Zavolat Opravo Offers API
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* API Responses History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Zap className="w-5 h-5 mr-2" />
              Historie API volání
            </CardTitle>
          </CardHeader>
          <CardContent>
            {apiResponses.length > 0 ? (
              <div className="space-y-3">
                {apiResponses.map((response) => (
                  <div
                    key={response.id}
                    className="p-3 rounded-lg border border-border bg-surface-variant"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">API Request #{response.id.substring(0, 8)}</span>
                        {getStatusBadge(response.status)}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(response.created_at).toLocaleString('cs-CZ')}
                      </span>
                    </div>
                    {response.response && (
                      <div className="mt-2">
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            Zobrazit odpověď
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                            {JSON.stringify(JSON.parse(response.response), null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Zatím nebylo provedeno žádné API volání</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}