import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  MousePointer, 
  Mail,
  Download,
  Calendar,
  Target
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface CampaignReport {
  id: string;
  campaign_id: string | null;
  open_rate: number | null;
  click_rate: number | null;
  impressions: number | null;
  conversions: number | null;
  export_link: string | null;
  summary_text: string | null;
  created_at: string;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
}

interface ChartData {
  name: string;
  value: number;
  openRate: number;
  clickRate: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--success))', 'hsl(var(--warning))'];

export default function CampaignReports() {
  const [reports, setReports] = useState<CampaignReport[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30');
  const { toast } = useToast();

  useEffect(() => {
    fetchReports();
    fetchCampaigns();
  }, []);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('CampaignReports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst reporty",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('Campaigns')
        .select('id, name, status')
        .order('name');

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const filteredReports = reports.filter(report => {
    if (selectedCampaign === 'all') return true;
    return report.campaign_id === selectedCampaign;
  });

  // Calculate overall statistics
  const totalReports = filteredReports.length;
  const avgOpenRate = totalReports > 0 
    ? filteredReports.reduce((sum, r) => sum + (r.open_rate || 0), 0) / totalReports 
    : 0;
  const avgClickRate = totalReports > 0 
    ? filteredReports.reduce((sum, r) => sum + (r.click_rate || 0), 0) / totalReports 
    : 0;

  // Prepare chart data
  const chartData: ChartData[] = filteredReports.slice(0, 10).map((report, index) => {
    const campaign = campaigns.find(c => c.id === report.campaign_id);
    return {
      name: campaign?.name.substring(0, 15) + '...' || `Report ${index + 1}`,
      value: report.open_rate || 0,
      openRate: report.open_rate || 0,
      clickRate: report.click_rate || 0
    };
  });

  const pieData = [
    { name: 'Otevřeno', value: avgOpenRate, color: COLORS[0] },
    { name: 'Kliknuto', value: avgClickRate, color: COLORS[1] },
    { name: 'Neotevřeno', value: Math.max(0, 100 - avgOpenRate), color: COLORS[2] }
  ];

  const handleExportPDF = async (reportId: string) => {
    toast({
      title: "Export",
      description: "Export do PDF bude implementován",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Výsledky kampaně</h1>
          <p className="text-muted-foreground mt-1">
            Přehled výkonu kampaní a statistiky otevření
          </p>
        </div>
        <Button variant="gradient" className="shadow-strong">
          <Download className="w-4 h-4 mr-2" />
          Export všech reportů
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue placeholder="Filtr podle kampaně" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny kampaně</SelectItem>
                {campaigns.map(campaign => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Časové období" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Posledních 7 dní</SelectItem>
                <SelectItem value="30">Posledních 30 dní</SelectItem>
                <SelectItem value="90">Posledních 90 dní</SelectItem>
                <SelectItem value="365">Poslední rok</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Overview Statistics */}
      <div className="grid gap-6 md:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <div className="text-2xl font-bold">{totalReports}</div>
            </div>
            <p className="text-xs text-muted-foreground">Celkem reportů</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4 text-primary" />
              <div className="text-2xl font-bold">
                {avgOpenRate.toFixed(1)}%
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Míra otevření</p>
            <div className="flex items-center text-xs mt-1">
              {avgOpenRate > 20 ? (
                <TrendingUp className="w-3 h-3 text-success mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 text-destructive mr-1" />
              )}
              <span className={avgOpenRate > 20 ? "text-success" : "text-destructive"}>
                {avgOpenRate > 20 ? "Dobrý" : "Nízký"} výkon
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <MousePointer className="w-4 h-4 text-success" />
              <div className="text-2xl font-bold">
                {avgClickRate.toFixed(1)}%
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Míra kliknutí</p>
            <div className="flex items-center text-xs mt-1">
              {avgClickRate > 5 ? (
                <TrendingUp className="w-3 h-3 text-success mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 text-destructive mr-1" />
              )}
              <span className={avgClickRate > 5 ? "text-success" : "text-destructive"}>
                {avgClickRate > 5 ? "Dobrý" : "Nízký"} výkon
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4 text-primary" />
              <div className="text-2xl font-bold">
                {filteredReports.reduce((sum, r) => sum + (r.impressions || 0), 0).toLocaleString()}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Zobrazení</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-primary" />
              <div className="text-2xl font-bold">
                {filteredReports.reduce((sum, r) => sum + (r.conversions || 0), 0).toLocaleString()}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Konverze</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Vývoj výkonu kampaní</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="openRate" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Míra otevření (%)"
                />
                <Line 
                  type="monotone" 
                  dataKey="clickRate" 
                  stroke="hsl(var(--secondary))" 
                  strokeWidth={2}
                  name="Míra kliknutí (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Rozdělení interakcí</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Detailní reporty ({filteredReports.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Načítání reportů...</p>
            </div>
          ) : filteredReports.length > 0 ? (
            <div className="space-y-4">
              {filteredReports.map((report) => {
                const campaign = campaigns.find(c => c.id === report.campaign_id);
                return (
                  <div
                    key={report.id}
                    className="p-4 border border-border rounded-lg hover:shadow-soft transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium">
                          {campaign?.name || 'Neznámá kampaň'}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">
                            {campaign?.status === 'active' ? 'Aktivní' : 
                             campaign?.status === 'done' ? 'Dokončeno' : 'Koncept'}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(report.created_at).toLocaleDateString('cs-CZ')}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportPDF(report.id)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export PDF
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-primary">
                          {report.open_rate ? `${report.open_rate}%` : 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground">Míra otevření</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-secondary">
                          {report.click_rate ? `${report.click_rate}%` : 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground">Míra kliknutí</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-primary">
                          {report.impressions ? report.impressions.toLocaleString() : 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground">Zobrazení</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-success">
                          {report.conversions ? report.conversions.toLocaleString() : 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground">Konverze</div>
                      </div>
                    </div>

                    {report.summary_text && (
                      <div className="p-3 bg-surface rounded-lg">
                        <h4 className="font-medium mb-2">Shrnutí výkonu</h4>
                        <p className="text-sm text-muted-foreground">
                          {report.summary_text}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Žádné reporty nenalezeny</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}