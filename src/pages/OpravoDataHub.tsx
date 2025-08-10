import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink, Calendar, MessageCircle, Search, Filter, Download, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, subWeeks, subMonths } from "date-fns";
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

interface Filters {
  search: string;
  status: string;
  urgency: string;
  selected: string;
  dateFrom: string;
  dateTo: string;
  period: string;
}

export default function OpravoDataHub() {
  const navigate = useNavigate();
  const [selectedRecord, setSelectedRecord] = useState<OpravoJob | OpravoOffer | null>(null);
  const [recordType, setRecordType] = useState<'job' | 'offer' | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: 'all',
    urgency: 'all',
    selected: 'all',
    dateFrom: '',
    dateTo: '',
    period: 'all'
  });

  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['opravo-jobs', filters],
    queryFn: async () => {
      let query = supabase
        .from('opravojobs')
        .select('*');

      // Apply filters
      if (filters.search) {
        query = query.or(`popis.ilike.%${filters.search}%,lokalita.ilike.%${filters.search}%`);
      }
      
      if (filters.status !== 'all') {
        if (filters.status === 'published') {
          query = query.eq('status', 'published');
        } else {
          query = query.neq('status', 'published');
        }
      }
      
      if (filters.urgency !== 'all') {
        query = query.eq('urgentni', filters.urgency === 'urgent');
      }
      
      if (filters.selected !== 'all') {
        if (filters.selected === 'selected') {
          query = query.not('vybrany_opravar', 'is', null);
        } else {
          query = query.is('vybrany_opravar', null);
        }
      }

      // Date filtering
      const dateRange = getDateRange(filters.period, filters.dateFrom, filters.dateTo);
      if (dateRange.from) {
        query = query.gte('created_at', dateRange.from);
      }
      if (dateRange.to) {
        query = query.lte('created_at', dateRange.to);
      }

      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      return data as OpravoJob[];
    }
  });

  const { data: offers = [], isLoading: offersLoading } = useQuery({
    queryKey: ['opravo-offers', filters],
    queryFn: async () => {
      let query = supabase
        .from('opravooffers')
        .select('*');

      // Apply filters
      if (filters.search) {
        query = query.or(`popis.ilike.%${filters.search}%,cena::text.ilike.%${filters.search}%`);
      }
      
      if (filters.status !== 'all') {
        query = query.eq('finalizovana', filters.status === 'published');
      }
      
      if (filters.selected !== 'all') {
        query = query.eq('vybrana', filters.selected === 'selected');
      }

      // Date filtering
      const dateRange = getDateRange(filters.period, filters.dateFrom, filters.dateTo);
      if (dateRange.from) {
        query = query.gte('created_at', dateRange.from);
      }
      if (dateRange.to) {
        query = query.lte('created_at', dateRange.to);
      }

      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      return data as OpravoOffer[];
    }
  });

  // Statistics calculations
  const jobStats = useMemo(() => {
    return {
      total: jobs.length,
      urgent: jobs.filter(j => j.urgentni).length,
      published: jobs.filter(j => j.status === 'published').length,
      selected: jobs.filter(j => j.vybrany_opravar).length
    };
  }, [jobs]);

  const offerStats = useMemo(() => {
    return {
      total: offers.length,
      urgent: 0, // Offers don't have urgency
      published: offers.filter(o => o.finalizovana).length,
      selected: offers.filter(o => o.vybrana).length
    };
  }, [offers]);

  // Helper functions
  const getDateRange = (period: string, from?: string, to?: string) => {
    const now = new Date();
    switch (period) {
      case 'week':
        return { from: subWeeks(now, 1).toISOString(), to: now.toISOString() };
      case 'month':
        return { from: subMonths(now, 1).toISOString(), to: now.toISOString() };
      case 'custom':
        return { from: from || '', to: to || '' };
      default:
        return { from: '', to: '' };
    }
  };

  const exportToCSV = (data: any[], filename: string, type: 'jobs' | 'offers') => {
    const headers = type === 'jobs' 
      ? ['Popis', 'Lokalita', 'Urgentní', 'Stav', 'Vybraný opravář', 'Datum vytvoření']
      : ['Popis', 'Cena', 'Finalizováno', 'Vybráno', 'Datum vytvoření'];
    
    const csvContent = [
      headers.join(','),
      ...data.map(item => {
        if (type === 'jobs') {
          const job = item as OpravoJob;
          return [
            `"${job.popis || ''}"`,
            `"${job.lokalita || ''}"`,
            job.urgentni ? 'Ano' : 'Ne',
            job.status === 'published' ? 'Publikováno' : 'Čeká',
            job.vybrany_opravar ? 'Vybrán' : 'Nevybrán',
            job.created_at ? format(new Date(job.created_at), 'dd.MM.yyyy HH:mm', { locale: cs }) : ''
          ].join(',');
        } else {
          const offer = item as OpravoOffer;
          return [
            `"${offer.popis || ''}"`,
            offer.cena || 0,
            offer.finalizovana ? 'Ano' : 'Ne',
            offer.vybrana ? 'Ano' : 'Ne',
            offer.created_at ? format(new Date(offer.created_at), 'dd.MM.yyyy HH:mm', { locale: cs }) : ''
          ].join(',');
        }
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      urgency: 'all', 
      selected: 'all',
      dateFrom: '',
      dateTo: '',
      period: 'all'
    });
  };

  const handleRecordClick = (record: OpravoJob | OpravoOffer, type: 'job' | 'offer') => {
    setSelectedRecord(record);
    setRecordType(type);
  };

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
    <tr 
      className={`border-b hover:bg-muted/50 transition-colors cursor-pointer ${job.urgentni ? 'border-l-4 border-l-destructive' : ''}`}
      onClick={() => handleRecordClick(job, 'job')}
    >
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
            onClick={(e) => {
              e.stopPropagation();
              handleAddToCampaign(job);
            }}
          >
            <Calendar className="h-4 w-4 mr-1" />
            Přidat do kampaně
          </Button>
          {job.status !== 'published' && (
            <Button
              size="sm"
              variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleMarkAsPublished(job.id, 'opravojobs');
            }}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Označit jako publikováno
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={(e) => e.stopPropagation()}>
            <ExternalLink className="h-4 w-4 mr-1" />
            Otevřít v Opravo
          </Button>
        </div>
      </td>
    </tr>
  );

  const OfferRow = ({ offer }: { offer: OpravoOffer }) => (
    <tr 
      className="border-b hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={() => handleRecordClick(offer, 'offer')}
    >
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
            onClick={(e) => {
              e.stopPropagation();
              handleAddToCampaign(offer);
            }}
          >
            <Calendar className="h-4 w-4 mr-1" />
            Přidat do kampaně
          </Button>
          {!offer.finalizovana && (
            <Button
              size="sm"
              variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleMarkAsPublished(offer.id, 'opravooffers');
            }}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Označit jako publikováno
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={(e) => e.stopPropagation()}>
            <ExternalLink className="h-4 w-4 mr-1" />
            Otevřít v Opravo
          </Button>
        </div>
      </td>
    </tr>
  );

  // Statistics component
  const StatsCards = ({ stats, type }: { stats: any, type: 'jobs' | 'offers' }) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold text-primary">{stats.total}</div>
          <div className="text-sm text-muted-foreground">
            {type === 'jobs' ? 'Zakázek celkem' : 'Nabídek celkem'}
          </div>
        </CardContent>
      </Card>
      {type === 'jobs' && (
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-destructive">{stats.urgent}</div>
            <div className="text-sm text-muted-foreground">Urgentních</div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold text-success">{stats.published}</div>
          <div className="text-sm text-muted-foreground">
            {type === 'jobs' ? 'Publikovaných' : 'Finalizovaných'}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold text-accent">{stats.selected}</div>
          <div className="text-sm text-muted-foreground">
            {type === 'jobs' ? 'S vybraným opravářem' : 'Vybraných'}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Filters component
  const FiltersPanel = () => (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-1 block">Vyhledávání</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Hledat podle popisu, lokality, ceny..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="min-w-[120px]">
            <label className="text-sm font-medium mb-1 block">Stav</label>
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny</SelectItem>
                <SelectItem value="published">Publikováno</SelectItem>
                <SelectItem value="waiting">Čeká</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[120px]">
            <label className="text-sm font-medium mb-1 block">Urgentnost</label>
            <Select value={filters.urgency} onValueChange={(value) => handleFilterChange('urgency', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny</SelectItem>
                <SelectItem value="urgent">Urgentní</SelectItem>
                <SelectItem value="normal">Neurgentní</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[120px]">
            <label className="text-sm font-medium mb-1 block">Vybrání</label>
            <Select value={filters.selected} onValueChange={(value) => handleFilterChange('selected', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny</SelectItem>
                <SelectItem value="selected">Vybrané</SelectItem>
                <SelectItem value="not-selected">Nevybrané</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[120px]">
            <label className="text-sm font-medium mb-1 block">Období</label>
            <Select value={filters.period} onValueChange={(value) => handleFilterChange('period', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Vše</SelectItem>
                <SelectItem value="week">Týden</SelectItem>
                <SelectItem value="month">Měsíc</SelectItem>
                <SelectItem value="custom">Vlastní</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filters.period === 'custom' && (
            <>
              <div className="min-w-[140px]">
                <label className="text-sm font-medium mb-1 block">Od</label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
              </div>
              <div className="min-w-[140px]">
                <label className="text-sm font-medium mb-1 block">Do</label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </div>
            </>
          )}

          <Button variant="outline" onClick={clearFilters}>
            <Filter className="h-4 w-4 mr-2" />
            Vymazat filtry
          </Button>
        </div>
      </CardContent>
    </Card>
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
          <FiltersPanel />
          
          <Tabs defaultValue="zakazky" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="zakazky">Zakázky</TabsTrigger>
              <TabsTrigger value="nabidky">Nabídky</TabsTrigger>
            </TabsList>
            
            <TabsContent value="zakazky" className="mt-6">
              <StatsCards stats={jobStats} type="jobs" />
              
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Zakázky ({jobs.length})</h3>
                <Button
                  variant="outline"
                  onClick={() => exportToCSV(jobs, 'opravo-zakazky', 'jobs')}
                  disabled={jobs.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportovat CSV
                </Button>
              </div>
              
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
              <StatsCards stats={offerStats} type="offers" />
              
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Nabídky ({offers.length})</h3>
                <Button
                  variant="outline"
                  onClick={() => exportToCSV(offers, 'opravo-nabidky', 'offers')}
                  disabled={offers.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportovat CSV
                </Button>
              </div>
              
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

      {/* Detail Modal */}
      <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {recordType === 'job' ? 'Detail zakázky' : 'Detail nabídky'}
            </DialogTitle>
          </DialogHeader>
          {selectedRecord && recordType && (
            <div className="space-y-4">
              {recordType === 'job' ? (
                <JobDetail job={selectedRecord as OpravoJob} />
              ) : (
                <OfferDetail offer={selectedRecord as OpravoOffer} />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Detail components
const JobDetail = ({ job }: { job: OpravoJob }) => (
  <div className="grid grid-cols-2 gap-4">
    <div>
      <label className="text-sm font-medium text-muted-foreground">Popis</label>
      <p className="text-sm">{job.popis || 'Neuvedeno'}</p>
    </div>
    <div>
      <label className="text-sm font-medium text-muted-foreground">Lokalita</label>
      <p className="text-sm">{job.lokalita || 'Neuvedeno'}</p>
    </div>
    <div>
      <label className="text-sm font-medium text-muted-foreground">Urgentní</label>
      <Badge variant={job.urgentni ? "destructive" : "secondary"}>
        {job.urgentni ? "Urgentní" : "Neurgentní"}
      </Badge>
    </div>
    <div>
      <label className="text-sm font-medium text-muted-foreground">Stav</label>
      <Badge variant={job.status === 'published' ? "default" : "outline"}>
        {job.status === 'published' ? "Publikováno" : "Čeká"}
      </Badge>
    </div>
    <div>
      <label className="text-sm font-medium text-muted-foreground">Vybraný opravář</label>
      <p className="text-sm">{job.vybrany_opravar ? "Vybrán" : "Nevybrán"}</p>
    </div>
    <div>
      <label className="text-sm font-medium text-muted-foreground">Datum vytvoření</label>
      <p className="text-sm">
        {job.created_at ? format(new Date(job.created_at), 'dd.MM.yyyy HH:mm', { locale: cs }) : 'Neuvedeno'}
      </p>
    </div>
    <div className="col-span-2 pt-4">
      <Button asChild>
        <a 
          href={`https://opravo.cz/zakazka/${job.request_id || job.id}`} 
          target="_blank" 
          rel="noopener noreferrer"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Otevřít v Opravo
        </a>
      </Button>
    </div>
  </div>
);

const OfferDetail = ({ offer }: { offer: OpravoOffer }) => (
  <div className="grid grid-cols-2 gap-4">
    <div>
      <label className="text-sm font-medium text-muted-foreground">Popis</label>
      <p className="text-sm">{offer.popis || 'Neuvedeno'}</p>
    </div>
    <div>
      <label className="text-sm font-medium text-muted-foreground">Cena</label>
      <p className="text-sm">{offer.cena ? `${offer.cena} Kč` : 'Neuvedeno'}</p>
    </div>
    <div>
      <label className="text-sm font-medium text-muted-foreground">Finalizováno</label>
      <Badge variant={offer.finalizovana ? "default" : "outline"}>
        {offer.finalizovana ? "Finalizováno" : "Čeká"}
      </Badge>
    </div>
    <div>
      <label className="text-sm font-medium text-muted-foreground">Vybráno</label>
      <Badge variant={offer.vybrana ? "default" : "secondary"}>
        {offer.vybrana ? "Vybráno" : "Nevybráno"}
      </Badge>
    </div>
    <div>
      <label className="text-sm font-medium text-muted-foreground">Datum vytvoření</label>
      <p className="text-sm">
        {offer.created_at ? format(new Date(offer.created_at), 'dd.MM.yyyy HH:mm', { locale: cs }) : 'Neuvedeno'}
      </p>
    </div>
    <div>
      <label className="text-sm font-medium text-muted-foreground">ID opraváře</label>
      <p className="text-sm">{offer.opravar_id || 'Neuvedeno'}</p>
    </div>
    <div className="col-span-2 pt-4">
      <Button asChild>
        <a 
          href={`https://opravo.cz/nabidka/${offer.offer_id || offer.id}`} 
          target="_blank" 
          rel="noopener noreferrer"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Otevřít v Opravo
        </a>
      </Button>
    </div>
  </div>
);