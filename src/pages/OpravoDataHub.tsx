import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Calendar, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface OpravoJob {
  id: string;
  request_id?: string;
  popis?: string;
  vytvoreno?: string;
  urgentni?: boolean;
  lokalita?: string;
  vybrany_opravar?: string;
  zadavatel_id?: string;
  status?: string;
  project_id?: string;
  created_at: string;
  user_id: string;
}

interface OpravoOffer {
  id: string;
  offer_id?: string;
  zakazka_id?: string;
  opravar_id?: string;
  cena?: number;
  popis?: string;
  finalizovana?: boolean;
  vybrana?: boolean;
  created_at: string;
  user_id: string;
}

export default function OpravoDataHub() {
  const navigate = useNavigate();

  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['opravo-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opravojobs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as OpravoJob[];
    }
  });

  const { data: offers = [], isLoading: offersLoading } = useQuery({
    queryKey: ['opravo-offers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opravooffers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as OpravoOffer[];
    }
  });

  const handleAddToCampaign = async (item: OpravoJob | OpravoOffer) => {
    const content = 'popis' in item ? 
      `${item.popis || ''} ${(item as OpravoJob).lokalita || ''}`.trim() :
      `${item.popis || ''}`.trim();
    
    navigate('/schedule', { 
      state: { 
        prefillContent: content,
        prefillChannel: 'urgentni' in item && item.urgentni ? 'email' : 'facebook'
      }
    });
  };

  const handleMarkAsPublished = async (id: string, table: 'opravojobs' | 'opravooffers') => {
    try {
      const updateData = table === 'opravojobs' ? 
        { status: 'published' } : 
        { finalizovana: true };

      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      
      toast.success("Označeno jako publikováno");
      
      // Refresh the data
      if (table === 'opravojobs') {
        // Refetch jobs
      } else {
        // Refetch offers
      }
    } catch (error) {
      console.error('Error marking as published:', error);
      toast.error("Chyba při označování jako publikováno");
    }
  };

  const JobRow = ({ job }: { job: OpravoJob }) => (
    <tr className="border-b hover:bg-muted/50 transition-colors">
      <td className="p-4">
        <div className="font-medium">{job.popis || 'Bez popisu'}</div>
        <div className="text-sm text-muted-foreground">{job.lokalita || 'Neuvedeno'}</div>
      </td>
      <td className="p-4">
        <Badge variant={job.urgentni ? "destructive" : "secondary"}>
          {job.urgentni ? "Urgentní" : "Neurgentní"}
        </Badge>
      </td>
      <td className="p-4">
        <Badge variant={job.status === 'published' ? "default" : "outline"}>
          {job.status === 'published' ? "Publikováno" : "Čeká"}
        </Badge>
      </td>
      <td className="p-4">
        {job.vybrany_opravar ? "Vybrán" : "Nevybrán"}
      </td>
      <td className="p-4">
        {job.created_at ? format(new Date(job.created_at), 'dd.MM.yyyy', { locale: cs }) : '-'}
      </td>
      <td className="p-4">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAddToCampaign(job)}
          >
            <Calendar className="h-4 w-4 mr-1" />
            Přidat do kampaně
          </Button>
          {job.status !== 'published' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleMarkAsPublished(job.id, 'opravojobs')}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Označit jako publikováno
            </Button>
          )}
          <Button size="sm" variant="outline">
            <ExternalLink className="h-4 w-4 mr-1" />
            Otevřít v Opravo
          </Button>
        </div>
      </td>
    </tr>
  );

  const OfferRow = ({ offer }: { offer: OpravoOffer }) => (
    <tr className="border-b hover:bg-muted/50 transition-colors">
      <td className="p-4">
        <div className="font-medium">{offer.popis || 'Bez popisu'}</div>
        <div className="text-sm text-muted-foreground">
          {offer.cena ? `${offer.cena} Kč` : 'Cena neuvedena'}
        </div>
      </td>
      <td className="p-4">-</td>
      <td className="p-4">
        <Badge variant={offer.finalizovana ? "default" : "outline"}>
          {offer.finalizovana ? "Finalizováno" : "Čeká"}
        </Badge>
      </td>
      <td className="p-4">
        <Badge variant={offer.vybrana ? "default" : "secondary"}>
          {offer.vybrana ? "Vybráno" : "Nevybráno"}
        </Badge>
      </td>
      <td className="p-4">
        {offer.created_at ? format(new Date(offer.created_at), 'dd.MM.yyyy', { locale: cs }) : '-'}
      </td>
      <td className="p-4">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAddToCampaign(offer)}
          >
            <Calendar className="h-4 w-4 mr-1" />
            Přidat do kampaně
          </Button>
          {!offer.finalizovana && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleMarkAsPublished(offer.id, 'opravooffers')}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Označit jako publikováno
            </Button>
          )}
          <Button size="sm" variant="outline">
            <ExternalLink className="h-4 w-4 mr-1" />
            Otevřít v Opravo
          </Button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Opravo – Data Hub
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="zakazky" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="zakazky">Zakázky</TabsTrigger>
              <TabsTrigger value="nabidky">Nabídky</TabsTrigger>
            </TabsList>
            
            <TabsContent value="zakazky" className="mt-6">
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-4 text-left font-medium">Popis / Lokalita</th>
                      <th className="p-4 text-left font-medium">Urgentní</th>
                      <th className="p-4 text-left font-medium">Stav</th>
                      <th className="p-4 text-left font-medium">Vybraný opravář</th>
                      <th className="p-4 text-left font-medium">Datum</th>
                      <th className="p-4 text-left font-medium">Akce</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobsLoading ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          Načítání zakázek...
                        </td>
                      </tr>
                    ) : jobs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          Žádné zakázky k zobrazení
                        </td>
                      </tr>
                    ) : (
                      jobs.map((job) => <JobRow key={job.id} job={job} />)
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
            
            <TabsContent value="nabidky" className="mt-6">
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-4 text-left font-medium">Popis / Cena</th>
                      <th className="p-4 text-left font-medium">Urgentní</th>
                      <th className="p-4 text-left font-medium">Finalizováno</th>
                      <th className="p-4 text-left font-medium">Vybráno</th>
                      <th className="p-4 text-left font-medium">Datum</th>
                      <th className="p-4 text-left font-medium">Akce</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offersLoading ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          Načítání nabídek...
                        </td>
                      </tr>
                    ) : offers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          Žádné nabídky k zobrazení
                        </td>
                      </tr>
                    ) : (
                      offers.map((offer) => <OfferRow key={offer.id} offer={offer} />)
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}