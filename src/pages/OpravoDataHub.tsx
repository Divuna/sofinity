import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ExternalLink, Calendar, MessageCircle, Search, Filter, Download, Eye, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, subWeeks, subMonths } from "date-fns";
import { cs } from "date-fns/locale/cs";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import Papa from 'papaparse';

interface OpravoJob {
  id: string;
  request_id?: string;
  external_request_id?: string;
  popis?: string;
  vytvoreno?: string;
  urgentni?: boolean;
  lokalita?: string;
  vybrany_opravar?: string;
  zadavatel_id?: string;
  status?: string;
  project_id?: string;
  user_id: string;
}

interface OpravoOffer {
  id: string;
  offer_id?: string;
  zakazka_id?: string;
  external_request_id?: string;
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

interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  role?: string;
}

interface ChartDataPoint {
  date: string;
  jobs: number;
  offers: number;
}

interface PieDataPoint {
  name: string;
  value: number;
  color: string;
}

export default function OpravoDataHub() {
  const navigate = useNavigate();
  const [selectedRecord, setSelectedRecord] = useState<OpravoJob | OpravoOffer | null>(null);
  const [recordType, setRecordType] = useState<'job' | 'offer' | null>(null);
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [selectedOffers, setSelectedOffers] = useState<Set<string>>(new Set());
  
  // Load filters from localStorage
  const loadFiltersFromStorage = (): Filters => {
    try {
      const saved = localStorage.getItem('opravo-filters');
      if (saved) {
        return { ...{
          search: '',
          status: 'all',
          urgency: 'all',
          selected: 'all',
          dateFrom: '',
          dateTo: '',
          period: 'all'
        }, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Failed to load filters from localStorage:', error);
    }
    return {
      search: '',
      status: 'all',
      urgency: 'all',
      selected: 'all',
      dateFrom: '',
      dateTo: '',
      period: 'all'
    };
  };

  const [filters, setFilters] = useState<Filters>(loadFiltersFromStorage());

  // Save filters to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('opravo-filters', JSON.stringify(filters));
    } catch (error) {
      console.warn('Failed to save filters to localStorage:', error);
    }
  }, [filters]);

  const { data: jobs = [], isLoading: jobsLoading, error: jobsError } = useQuery({
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
      // Date filtering - Opravo uses 'vytvoreno' as primary timestamp
      const dateRange = getDateRange(filters.period, filters.dateFrom, filters.dateTo);
      if (dateRange.from) {
        query = query.gte('vytvoreno', dateRange.from);
      }
      if (dateRange.to) {
        query = query.lte('vytvoreno', dateRange.to);
      }

      query = query.order('vytvoreno', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      return data as OpravoJob[];
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 30000
  });

  const { data: offers = [], isLoading: offersLoading, error: offersError } = useQuery({
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
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 30000
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
    try {
      const formattedData = data.map(item => {
        if (type === 'jobs') {
          const job = item as OpravoJob;
          return {
            'Popis': job.popis || '',
            'Lokalita': job.lokalita || '',
            'Urgentní': job.urgentni ? 'Ano' : 'Ne',
            'Stav': job.status === 'published' ? 'Publikováno' : 'Čeká',
            'Vybraný opravář': job.vybrany_opravar ? 'Vybrán' : 'Nevybrán',
            'Datum vytvoření': job.vytvoreno ? 
              new Intl.DateTimeFormat('cs-CZ', {
                year: 'numeric',
                month: '2-digit', 
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              }).format(new Date(job.vytvoreno)) : ''
          };
        } else {
          const offer = item as OpravoOffer;
          return {
            'Popis': offer.popis || '',
            'Cena': offer.cena ? 
              new Intl.NumberFormat('cs-CZ', { 
                style: 'currency', 
                currency: 'CZK' 
              }).format(offer.cena) : '',
            'Finalizováno': offer.finalizovana ? 'Ano' : 'Ne',
            'Vybráno': offer.vybrana ? 'Ano' : 'Ne',
            'Datum vytvoření': offer.created_at ? 
              new Intl.DateTimeFormat('cs-CZ', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              }).format(new Date(offer.created_at)) : ''
          };
        }
      });

      const csv = Papa.unparse(formattedData, {
        encoding: 'utf-8',
        header: true
      });

      const blob = new Blob(['\uFEFF' + csv], { 
        type: 'text/csv;charset=utf-8;' 
      });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Chyba při exportu CSV souboru');
    }
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

  // Chart data preparation
  const chartData = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      return {
        date: format(date, 'dd.MM'),
        jobs: jobs.filter(j => j.vytvoreno?.startsWith(dateStr)).length,
        offers: offers.filter(o => o.created_at?.startsWith(dateStr)).length
      };
    });
    return last30Days;
  }, [jobs, offers]);

  const urgencyPieData: PieDataPoint[] = useMemo(() => [
    { name: 'Urgentní', value: jobs.filter(j => j.urgentni).length, color: 'hsl(var(--destructive))' },
    { name: 'Neurgentní', value: jobs.filter(j => !j.urgentni).length, color: 'hsl(var(--muted))' }
  ], [jobs]);

  const finalizationPieData: PieDataPoint[] = useMemo(() => [
    { name: 'Finalizováno', value: offers.filter(o => o.finalizovana).length, color: 'hsl(var(--primary))' },
    { name: 'Nefinalizováno', value: offers.filter(o => !o.finalizovana).length, color: 'hsl(var(--accent))' }
  ], [offers]);

  const handleRecordClick = (record: OpravoJob | OpravoOffer, type: 'job' | 'offer') => {
    setSelectedRecord(record);
    setRecordType(type);
  };

  // Bulk selection handlers
  const handleJobSelection = (jobId: string, checked: boolean) => {
    const newSelected = new Set(selectedJobs);
    if (checked) {
      newSelected.add(jobId);
    } else {
      newSelected.delete(jobId);
    }
    setSelectedJobs(newSelected);
  };

  const handleOfferSelection = (offerId: string, checked: boolean) => {
    const newSelected = new Set(selectedOffers);
    if (checked) {
      newSelected.add(offerId);
    } else {
      newSelected.delete(offerId);
    }
    setSelectedOffers(newSelected);
  };

  const handleSelectAllJobs = (checked: boolean) => {
    if (checked) {
      setSelectedJobs(new Set(jobs.map(j => j.id)));
    } else {
      setSelectedJobs(new Set());
    }
  };

  const handleSelectAllOffers = (checked: boolean) => {
    if (checked) {
      setSelectedOffers(new Set(offers.map(o => o.id)));
    } else {
      setSelectedOffers(new Set());
    }
  };

  // Bulk actions
  const handleBulkExportJobs = () => {
    const selectedJobsData = jobs.filter(j => selectedJobs.has(j.id));
    exportToCSV(selectedJobsData, 'opravo-zakazky-vybrane', 'jobs');
    toast.success(`Exportováno ${selectedJobsData.length} vybraných zakázek`);
  };

  const handleBulkExportOffers = () => {
    const selectedOffersData = offers.filter(o => selectedOffers.has(o.id));
    exportToCSV(selectedOffersData, 'opravo-nabidky-vybrane', 'offers');
    toast.success(`Exportováno ${selectedOffersData.length} vybraných nabídek`);
  };

  const handleBulkAddToCampaignJobs = async () => {
    const selectedJobsData = jobs.filter(j => selectedJobs.has(j.id));
    for (const job of selectedJobsData) {
      await handleAddToCampaign(job);
    }
    toast.success(`Přidáno ${selectedJobsData.length} zakázek do kampaně`);
    setSelectedJobs(new Set());
  };

  const handleBulkAddToCampaignOffers = async () => {
    const selectedOffersData = offers.filter(o => selectedOffers.has(o.id));
    for (const offer of selectedOffersData) {
      await handleAddToCampaign(offer);
    }
    toast.success(`Přidáno ${selectedOffersData.length} nabídek do kampaně`);
    setSelectedOffers(new Set());
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
      className={`border-b hover:bg-muted/50 transition-colors cursor-pointer ${
        job.urgentni ? 'border-l-4 border-l-destructive' : ''
      } ${
        selectedJobs.has(job.id) ? 'bg-primary/5' : ''
      }`}
      onClick={() => handleRecordClick(job, 'job')}
    >
      <td className="p-4" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={selectedJobs.has(job.id)}
          onCheckedChange={(checked) => handleJobSelection(job.id, checked as boolean)}
        />
      </td>
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
        {job.vytvoreno ? format(new Date(job.vytvoreno), 'dd.MM.yyyy', { locale: cs }) : '-'}
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
      className={`border-b hover:bg-muted/50 transition-colors cursor-pointer ${
        selectedOffers.has(offer.id) ? 'bg-primary/5' : ''
      }`}
      onClick={() => handleRecordClick(offer, 'offer')}
    >
      <td className="p-4" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={selectedOffers.has(offer.id)}
          onCheckedChange={(checked) => handleOfferSelection(offer.id, checked as boolean)}
        />
      </td>
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
          {/* Error Display */}
          {(jobsError || offersError) && (
            <Card className="mb-6 border-destructive">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Chyba při načítání dat</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Zkuste obnovit stránku nebo kontaktujte podporu, pokud problém přetrvává.
                </p>
              </CardContent>
            </Card>
          )}
          
          <FiltersPanel />
          
          <Tabs defaultValue="zakazky" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="zakazky">Zakázky</TabsTrigger>
              <TabsTrigger value="nabidky">Nabídky</TabsTrigger>
              <TabsTrigger value="statistiky">Statistiky</TabsTrigger>
            </TabsList>
            
            <TabsContent value="zakazky" className="mt-6">
              <StatsCards stats={jobStats} type="jobs" />
              
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-semibold">Zakázky ({jobs.length})</h3>
                  {selectedJobs.size > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Vybráno: {selectedJobs.size}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleBulkExportJobs}
                      >
                        Export vybrané do CSV
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleBulkAddToCampaignJobs}
                      >
                        Přidat do kampaně
                      </Button>
                    </div>
                  )}
                </div>
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
                      <th className="p-4 text-left font-medium">
                        <Checkbox
                          checked={selectedJobs.size === jobs.length && jobs.length > 0}
                          onCheckedChange={handleSelectAllJobs}
                        />
                      </th>
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
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          Načítání zakázek...
                        </td>
                      </tr>
                    ) : jobs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
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
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-semibold">Nabídky ({offers.length})</h3>
                  {selectedOffers.size > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Vybráno: {selectedOffers.size}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleBulkExportOffers}
                      >
                        Export vybrané do CSV
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleBulkAddToCampaignOffers}
                      >
                        Přidat do kampaně
                      </Button>
                    </div>
                  )}
                </div>
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
                      <th className="p-4 text-left font-medium">
                        <Checkbox
                          checked={selectedOffers.size === offers.length && offers.length > 0}
                          onCheckedChange={handleSelectAllOffers}
                        />
                      </th>
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
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          Načítání nabídek...
                        </td>
                      </tr>
                    ) : offers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
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

            <TabsContent value="statistiky" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Jobs over time */}
                <Card>
                  <CardHeader>
                    <CardTitle>Zakázky a nabídky za posledních 30 dní</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line 
                            type="monotone" 
                            dataKey="jobs" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            name="Zakázky"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="offers" 
                            stroke="hsl(var(--accent))" 
                            strokeWidth={2}
                            name="Nabídky"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Urgency pie chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Rozdělení zakázek podle urgentnosti</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={urgencyPieData}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {urgencyPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Finalization pie chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Stav finalizace nabídek</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={finalizationPieData}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {finalizationPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Summary stats */}
                <Card>
                  <CardHeader>
                    <CardTitle>Souhrnné statistiky</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>Celkem zakázek:</span>
                        <span className="font-semibold">{jobStats.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Urgentní zakázky:</span>
                        <span className="font-semibold text-destructive">{jobStats.urgent}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Publikované zakázky:</span>
                        <span className="font-semibold text-success">{jobStats.published}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Celkem nabídek:</span>
                        <span className="font-semibold">{offerStats.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Finalizované nabídky:</span>
                        <span className="font-semibold text-primary">{offerStats.published}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Vybrané nabídky:</span>
                        <span className="font-semibold text-accent">{offerStats.selected}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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

// Detail components with profile fetching
const JobDetail = ({ job }: { job: OpravoJob }) => {
  const [customerProfile, setCustomerProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    const fetchCustomerProfile = async () => {
      if (!job.zadavatel_id) return;
      
      setLoadingProfile(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, name, email, role')
          .eq('user_id', job.zadavatel_id)
          .maybeSingle();

        if (error) throw error;
        if (data) setCustomerProfile(data);
      } catch (error) {
        console.error('Error fetching customer profile:', error);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchCustomerProfile();
  }, [job.zadavatel_id]);

  return (
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
          {job.vytvoreno ? format(new Date(job.vytvoreno), 'dd.MM.yyyy HH:mm', { locale: cs }) : 'Neuvedeno'}
        </p>
      </div>
      
      {/* Customer profile section */}
      <div className="col-span-2 pt-4 border-t">
        <label className="text-sm font-medium text-muted-foreground">Zadavatel</label>
        {loadingProfile ? (
          <p className="text-sm text-muted-foreground">Načítání...</p>
        ) : customerProfile ? (
          <div className="mt-2 p-3 bg-muted/30 rounded-md">
            <p className="text-sm font-medium">{customerProfile.name}</p>
            <p className="text-sm text-muted-foreground">{customerProfile.email}</p>
            {customerProfile.role && (
              <p className="text-xs text-muted-foreground">Role: {customerProfile.role}</p>
            )}
            <Button asChild size="sm" variant="outline" className="mt-2">
              <Link to={`/profile/${customerProfile.user_id}`}>
                Zobrazit profil v Sofinity
              </Link>
            </Button>
          </div>
        ) : job.zadavatel_id ? (
          <p className="text-sm text-muted-foreground">Profil nenalezen</p>
        ) : (
          <p className="text-sm text-muted-foreground">ID zadavatele neuvedeno</p>
        )}
      </div>
      
      <div className="col-span-2 pt-4">
        <Button asChild>
          <a 
            href={`https://opravo.cz/zakazka/${job.external_request_id || job.request_id || job.id}`} 
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
};

const OfferDetail = ({ offer }: { offer: OpravoOffer }) => {
  const [repairerProfile, setRepairerProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    const fetchRepairerProfile = async () => {
      if (!offer.opravar_id) return;
      
      setLoadingProfile(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, name, email, role')
          .eq('user_id', offer.opravar_id)
          .maybeSingle();

        if (error) throw error;
        if (data) setRepairerProfile(data);
      } catch (error) {
        console.error('Error fetching repairer profile:', error);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchRepairerProfile();
  }, [offer.opravar_id]);

  return (
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
      
      {/* Repairer profile section */}
      <div className="col-span-2 pt-4 border-t">
        <label className="text-sm font-medium text-muted-foreground">Opravář</label>
        {loadingProfile ? (
          <p className="text-sm text-muted-foreground">Načítání...</p>
        ) : repairerProfile ? (
          <div className="mt-2 p-3 bg-muted/30 rounded-md">
            <p className="text-sm font-medium">{repairerProfile.name}</p>
            <p className="text-sm text-muted-foreground">{repairerProfile.email}</p>
            {repairerProfile.role && (
              <p className="text-xs text-muted-foreground">Role: {repairerProfile.role}</p>
            )}
            <Button asChild size="sm" variant="outline" className="mt-2">
              <Link to={`/profile/${repairerProfile.user_id}`}>
                Zobrazit profil v Sofinity
              </Link>
            </Button>
          </div>
        ) : offer.opravar_id ? (
          <p className="text-sm text-muted-foreground">Profil nenalezen</p>
        ) : (
          <p className="text-sm text-muted-foreground">ID opraváře neuvedeno</p>
        )}
      </div>
      
      <div className="col-span-2 pt-4">
        <Button asChild>
          <a 
            href={`https://opravo.cz/nabidka/${offer.external_request_id || offer.offer_id || offer.id}`} 
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
};