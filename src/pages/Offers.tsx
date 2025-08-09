import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/AppContext';
import { 
  Handshake, 
  Search, 
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpDown,
  Calendar
} from 'lucide-react';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Offer {
  id: string;
  request_id: string | null;
  repairer_id: string | null;
  price: number | null;
  status: string;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  name: string;
}

export default function Offers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const { selectedProjectId } = useApp();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [selectedProjectId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('Projects')
        .select('id, name')
        .eq('is_active', true);

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      // Fetch offers
      let offersQuery = supabase
        .from('offers')
        .select('*')
        .order('created_at', { ascending: false });

      if (selectedProjectId) {
        offersQuery = offersQuery.eq('project_id', selectedProjectId);
      }

      const { data: offersData, error: offersError } = await offersQuery;

      if (offersError) throw offersError;
      setOffers(offersData || []);

    } catch (error) {
      console.error('Error fetching offers data:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst data nabídek",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge variant="default" className="bg-success text-success-foreground"><CheckCircle className="w-3 h-3 mr-1" />Přijato</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Odmítnuto</Badge>;
      case 'pending':
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Čeká</Badge>;
    }
  };

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return 'Bez projektu';
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Neznámý projekt';
  };

  const filteredOffers = offers.filter(offer => {
    const matchesSearch = 
      (offer.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (offer.request_id?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (getProjectName(offer.project_id).toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || offer.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-surface flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Načítání nabídek...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Seznam nabídek</h1>
          <p className="text-muted-foreground mt-1">
            Správa nabídek z integrace Opravo
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={fetchData}>
            <ArrowUpDown className="w-4 h-4 mr-2" />
            Obnovit
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filtry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Hledat podle ID nabídky, ID požadavku nebo projektu..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
              >
                <option value="all">Všechny stavy</option>
                <option value="pending">Čeká</option>
                <option value="accepted">Přijato</option>
                <option value="rejected">Odmítnuto</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Offers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Handshake className="w-5 h-5 mr-2" />
            Nabídky ({filteredOffers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredOffers.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID nabídky</TableHead>
                    <TableHead>ID požadavku</TableHead>
                    <TableHead>Projekt</TableHead>
                    <TableHead>Cena</TableHead>
                    <TableHead>Stav</TableHead>
                    <TableHead>Vytvořeno</TableHead>
                    <TableHead>Akce</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOffers.map((offer) => (
                    <TableRow key={offer.id}>
                      <TableCell className="font-mono text-sm">
                        {offer.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {offer.request_id ? `${offer.request_id.substring(0, 8)}...` : '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {getProjectName(offer.project_id)}
                      </TableCell>
                      <TableCell>
                        {offer.price ? `${offer.price.toLocaleString()} Kč` : '-'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(offer.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Calendar className="w-4 h-4 mr-1 text-muted-foreground" />
                          {new Date(offer.created_at).toLocaleDateString('cs-CZ')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedOffer(offer)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Detail
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Handshake className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Žádné nabídky nevyhovují zadaným filtrům' 
                  : 'Zatím nejsou k dispozici žádné nabídky'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Offer Detail Modal */}
      {selectedOffer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Detail nabídky</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedOffer(null)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ID nabídky</label>
                  <p className="font-mono text-sm">{selectedOffer.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ID požadavku</label>
                  <p className="font-mono text-sm">{selectedOffer.request_id || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ID opraváře</label>
                  <p className="font-mono text-sm">{selectedOffer.repairer_id || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Cena</label>
                  <p className="text-lg font-semibold">
                    {selectedOffer.price ? `${selectedOffer.price.toLocaleString()} Kč` : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Stav</label>
                  <div className="mt-1">
                    {getStatusBadge(selectedOffer.status)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Projekt</label>
                  <p>{getProjectName(selectedOffer.project_id)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Vytvořeno</label>
                  <p>{new Date(selectedOffer.created_at).toLocaleString('cs-CZ')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Aktualizováno</label>
                  <p>{new Date(selectedOffer.updated_at).toLocaleString('cs-CZ')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}