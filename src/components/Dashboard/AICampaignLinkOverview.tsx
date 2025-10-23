import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale/cs';
import { ExternalLink } from 'lucide-react';

interface CampaignLinkData {
  campaign_id: string | null;
  campaign_name: string | null;
  ai_type: string | null;
  ai_status: string | null;
  event_name: string | null;
  event_timestamp: string | null;
  airequest_id: string | null;
}

interface AICampaignLinkOverviewProps {
  refreshTrigger?: number;
  loading?: boolean;
}

export default function AICampaignLinkOverview({ refreshTrigger, loading: parentLoading }: AICampaignLinkOverviewProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState<CampaignLinkData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaignLinks = async () => {
    try {
      setLoading(true);
      const { data: campaignData, error } = await supabase
        .from('AIRequests_Campaigns_View' as any)
        .select('campaign_id, campaign_name, ai_type, ai_status, event_name, event_timestamp, airequest_id')
        .order('event_timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;

      setData((campaignData as any[]) || []);
    } catch (error) {
      console.error('Error fetching campaign links:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst propojení kampaní",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaignLinks();
  }, [refreshTrigger]);

  const getTypeLabel = (type: string | null) => {
    if (!type) return 'N/A';
    const typeMap: Record<string, string> = {
      'campaign_generator': 'Generátor kampaní',
      'email_assistant': 'Email asistent',
      'autoresponder': 'Autoresponder',
      'evaluator': 'Vyhodnocovač',
      'event_forward': 'Přeposílání událostí'
    };
    return typeMap[type] || type;
  };

  const getStatusBadgeVariant = (status: string | null): "default" | "secondary" | "destructive" | "outline" => {
    if (!status) return 'outline';
    switch (status) {
      case 'completed':
        return 'default';
      case 'waiting':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const handleRowClick = (campaignId: string | null) => {
    if (campaignId) {
      navigate(`/campaigns/${campaignId}`);
    }
  };

  const isLoading = parentLoading ?? loading;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Propojení AI požadavků a kampaní</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <ExternalLink className="h-6 w-6 animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            Zatím nebyly vytvořeny žádné kampaně z AI požadavků
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Název kampaně</TableHead>
                  <TableHead>Typ AI</TableHead>
                  <TableHead>Stav</TableHead>
                  <TableHead>Událost</TableHead>
                  <TableHead>Čas vytvoření</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TooltipProvider key={item.airequest_id || Math.random()}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TableRow 
                          className={item.campaign_id ? "cursor-pointer hover:bg-muted/50" : ""}
                          onClick={() => handleRowClick(item.campaign_id)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {item.campaign_name || 'Bez názvu'}
                              {item.campaign_id && (
                                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {getTypeLabel(item.ai_type)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(item.ai_status)}>
                              {item.ai_status || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {item.event_name || 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {item.event_timestamp
                                ? formatDistanceToNow(new Date(item.event_timestamp), {
                                    addSuffix: true,
                                    locale: cs
                                  })
                                : 'N/A'}
                            </span>
                          </TableCell>
                        </TableRow>
                      </TooltipTrigger>
                      {item.campaign_id && (
                        <TooltipContent>
                          <p>Tato kampaň byla vytvořena automaticky z AI požadavku</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
