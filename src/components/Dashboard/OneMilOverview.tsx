import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Clock, Eye, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { truncateText } from '@/lib/utils-helpers';

interface OneMilCampaignData {
  id: string;
  event_name: string;
  type: string;
  status: string;
  created_at: string;
  response: string | null;
  event_id: string;
  metadata?: any;
}

interface OneMilOverviewProps {
  projectId?: string | null;
}

const EVENT_TYPE_OPTIONS = [
  { value: 'all', label: 'Všechny události' },
  { value: 'voucher_redeemed', label: 'Voucher uplatněn' },
  { value: 'contest_closed', label: 'Soutěž uzavřena' },
  { value: 'prize_won', label: 'Výhra' },
  { value: 'email_sent', label: 'Email odeslán' },
];

export const OneMilOverview: React.FC<OneMilOverviewProps> = ({ projectId }) => {
  const [data, setData] = useState<OneMilCampaignData[]>([]);
  const [filteredData, setFilteredData] = useState<OneMilCampaignData[]>([]);
  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<OneMilCampaignData | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchOneMilData();
  }, [projectId]);

  useEffect(() => {
    filterData();
  }, [data, selectedEventType]);

  const fetchOneMilData = async () => {
    try {
      setLoading(true);

      // Get current user for debugging
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      console.log('🔍 [OneMilOverview] Fetching data with:', { projectId, currentUserId });

      // Fetch AIRequests with campaign_generator type and join with EventLogs
      let query = supabase
        .from('AIRequests')
        .select(`
          id,
          type,
          status,
          response,
          created_at,
          event_id,
          project_id,
          user_id,
          EventLogs (
            id,
            event_name,
            source_system,
            metadata
          )
        `)
        .eq('type', 'campaign_generator')
        .order('created_at', { ascending: false });

      // Include AIRequests where project_id is null OR equals current projectId
      if (projectId) {
        query = query.or(`project_id.is.null,project_id.eq.${projectId}`);
      }

      const { data: aiRequests, error } = await query;

      if (error) {
        console.error('❌ [OneMilOverview] Supabase error:', error);
        throw error;
      }

      console.log('✅ [OneMilOverview] Fetched records:', aiRequests?.length ?? 0);
      console.log('📊 [OneMilOverview] Sample data:', aiRequests?.slice(0, 2));

      // Transform the data with null-safe operations
      const transformedData: OneMilCampaignData[] = (aiRequests ?? []).map((item: any) => {
        const eventName = item.EventLogs?.event_name ?? 'unknown';
        const sourceSystem = item.EventLogs?.source_system ?? 'unknown';
        
        // Log records with missing EventLogs
        if (!item.EventLogs || eventName === 'unknown') {
          console.warn('⚠️ [OneMilOverview] Missing EventLog for AIRequest:', {
            id: item.id,
            event_id: item.event_id,
            project_id: item.project_id
          });
        }

        return {
          id: item.id,
          event_name: eventName,
          type: item.type ?? 'campaign_generator',
          status: item.status ?? 'waiting',
          created_at: item.created_at,
          response: item.response,
          event_id: item.event_id,
          metadata: item.EventLogs?.metadata,
        };
      });

      console.log('🎯 [OneMilOverview] Transformed data count:', transformedData.length);
      
      // Count records by event type
      const eventTypeCounts = transformedData.reduce((acc, item) => {
        acc[item.event_name] = (acc[item.event_name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('📈 [OneMilOverview] Event types:', eventTypeCounts);

      setData(transformedData);
    } catch (error: any) {
      console.error('❌ [OneMilOverview] Error fetching data:', error);
      toast({
        title: 'Chyba načítání dat',
        description: error.message || 'Nepodařilo se načíst OneMil data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    if (selectedEventType === 'all') {
      setFilteredData(data);
    } else {
      setFilteredData(data.filter((item) => item.event_name === selectedEventType));
    }
  };

  const getStatusBadgeVariant = (status: string) => {
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Dokončeno';
      case 'waiting':
        return 'Čekání';
      case 'error':
        return 'Chyba';
      default:
        return status;
    }
  };

  const getTypeLabel = (type: string) => {
    const typeMap: { [key: string]: string } = {
      campaign_generator: 'Generátor kampaní',
      evaluator: 'Hodnocení',
      autoresponder: 'Automatická odpověď',
      event_forward: 'Přeposílání událostí',
    };
    return typeMap[type] || type;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Brain className="w-5 h-5 mr-2" />
            OneMil Campaign & AI Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Načítání...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center">
          <Brain className="w-5 h-5 mr-2" />
          OneMil Campaign & AI Overview
        </CardTitle>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedEventType} onValueChange={setSelectedEventType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrovat podle typu" />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {Array.isArray(filteredData) && filteredData.length > 0 ? (
          filteredData.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-lg border border-border bg-surface-variant hover:shadow-soft transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline" className="text-xs">
                    {item.event_name.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                  <Badge variant="default" className="text-xs">
                    {getTypeLabel(item.type)}
                  </Badge>
                  <Badge variant={getStatusBadgeVariant(item.status)} className="text-xs">
                    {getStatusLabel(item.status)}
                  </Badge>
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Clock className="w-4 h-4 mr-1" />
                  {new Date(item.created_at).toLocaleDateString('cs-CZ', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              <div className="space-y-2">
                {item.response && (
                  <div>
                    <span className="text-sm font-medium text-foreground">AI Odpověď: </span>
                    <span className="text-sm text-muted-foreground">
                      {truncateText(item.response, 150)}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-3 flex justify-end">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedItem(item)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Detail analýzy
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Detail analýzy</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <h4 className="font-semibold text-sm text-muted-foreground mb-1">
                          Typ události
                        </h4>
                        <p className="text-foreground">
                          {item.event_name.replace(/_/g, ' ')}
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-sm text-muted-foreground mb-1">
                          Typ AI zpracování
                        </h4>
                        <p className="text-foreground">{getTypeLabel(item.type)}</p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-sm text-muted-foreground mb-1">
                          Status
                        </h4>
                        <Badge variant={getStatusBadgeVariant(item.status)}>
                          {getStatusLabel(item.status)}
                        </Badge>
                      </div>

                      <div>
                        <h4 className="font-semibold text-sm text-muted-foreground mb-1">
                          Vytvořeno
                        </h4>
                        <p className="text-foreground">
                          {new Date(item.created_at).toLocaleString('cs-CZ')}
                        </p>
                      </div>

                      {item.response && (
                        <div>
                          <h4 className="font-semibold text-sm text-muted-foreground mb-1">
                            Celá AI odpověď
                          </h4>
                          <div className="p-4 rounded-lg bg-surface border border-border whitespace-pre-wrap">
                            {item.response}
                          </div>
                        </div>
                      )}

                      {item.metadata && Object.keys(item.metadata).length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm text-muted-foreground mb-1">
                            Metadata události
                          </h4>
                          <div className="p-4 rounded-lg bg-surface border border-border">
                            <pre className="text-xs overflow-x-auto">
                              {JSON.stringify(item.metadata, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-6 flex justify-end">
                      <DialogTrigger asChild>
                        <Button variant="outline">Uzavřít</Button>
                      </DialogTrigger>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {selectedEventType === 'all'
                ? 'Žádná OneMil data k zobrazení'
                : `Žádné události typu "${
                    EVENT_TYPE_OPTIONS.find((o) => o.value === selectedEventType)?.label
                  }"`}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              OneMil události budou automaticky zpracovány AI
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
