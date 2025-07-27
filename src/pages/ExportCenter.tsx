import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Download,
  FileText,
  Image,
  BarChart3,
  Calendar,
  Filter,
  Settings,
  Mail,
  Users,
  Building2,
  CheckCircle,
  Clock,
  AlertCircle,
  FileDown,
  FileSpreadsheet,
  Eye,
  Send
} from 'lucide-react';

const exportTemplates = [
  {
    id: 'campaign_performance',
    name: 'Výkonnost kampaní',
    description: 'Detailní report o výkonu všech kampaní včetně metrik a ROI',
    type: 'pdf',
    category: 'campaigns',
    frequency: 'monthly',
    lastGenerated: '2024-08-15T10:30:00',
    size: '2.4 MB',
    downloads: 127
  },
  {
    id: 'financial_summary',
    name: 'Finanční přehled',
    description: 'Souhrn tržeb, fakturace a plateb podle projektů',
    type: 'excel',
    category: 'financial',
    frequency: 'weekly',
    lastGenerated: '2024-08-14T16:45:00',
    size: '890 KB',
    downloads: 89
  },
  {
    id: 'customer_feedback',
    name: 'Zpětná vazba zákazníků',
    description: 'Analýza spokojenosti a komentářů od klientů',
    type: 'pdf',
    category: 'feedback',
    frequency: 'monthly',
    lastGenerated: '2024-08-12T09:15:00',
    size: '1.8 MB',
    downloads: 156
  },
  {
    id: 'team_activity',
    name: 'Aktivita týmu',
    description: 'Přehled práce týmu, dokončených úkolů a produktivity',
    type: 'excel',
    category: 'team',
    frequency: 'weekly',
    lastGenerated: '2024-08-13T14:20:00',
    size: '445 KB',
    downloads: 67
  },
  {
    id: 'partner_contacts',
    name: 'Kontakty partnerů',
    description: 'Seznam všech partnerů s kontaktními údaji a hodnocením',
    type: 'excel',
    category: 'partners',
    frequency: 'on_demand',
    lastGenerated: '2024-08-10T11:30:00',
    size: '234 KB',
    downloads: 45
  },
  {
    id: 'executive_summary',
    name: 'Executive Summary',
    description: 'Souhrnný report pro management s klíčovými KPI',
    type: 'pdf',
    category: 'executive',
    frequency: 'monthly',
    lastGenerated: '2024-08-15T08:00:00',
    size: '3.1 MB',
    downloads: 234
  }
];

const scheduleSettings = [
  {
    id: 'auto_monthly_reports',
    name: 'Automatické měsíční reporty',
    description: 'Generovat a odesílat měsíční přehledy automaticky',
    enabled: true,
    recipients: ['management@sofinity.cz', 'reports@sofinity.cz'],
    schedule: 'Každé 1. v měsíci v 8:00'
  },
  {
    id: 'weekly_summaries',
    name: 'Týdenní souhrny',
    description: 'Krátké týdenní přehledy pro všechny projekty',
    enabled: true,
    recipients: ['team@sofinity.cz'],
    schedule: 'Každé pondělí v 9:00'
  },
  {
    id: 'alert_reports',
    name: 'Upozornění na kritické metriky',
    description: 'Automatické reporty při poklesu výkonnosti',
    enabled: false,
    recipients: ['alerts@sofinity.cz'],
    schedule: 'Při poklesu o více než 20%'
  }
];

const typeConfig = {
  pdf: { icon: FileText, color: 'text-destructive', label: 'PDF' },
  excel: { icon: FileSpreadsheet, color: 'text-success', label: 'Excel' },
  csv: { icon: FileDown, color: 'text-primary', label: 'CSV' }
};

const categoryConfig = {
  campaigns: { label: 'Kampaně', color: 'bg-sofinity-purple' },
  financial: { label: 'Finance', color: 'bg-sofinity-orange' },
  feedback: { label: 'Zpětná vazba', color: 'bg-primary' },
  team: { label: 'Tým', color: 'bg-success' },
  partners: { label: 'Partneři', color: 'bg-secondary' },
  executive: { label: 'Management', color: 'bg-destructive' }
};

export default function ExportCenter() {
  const [activeTab, setActiveTab] = useState<'templates' | 'schedule' | 'history'>('templates');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredTemplates = exportTemplates.filter(template => 
    selectedCategory === 'all' || template.category === selectedCategory
  );

  return (
    <div className="space-y-6 min-w-[1200px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Export centrum</h1>
          <p className="text-muted-foreground mt-1">
            Export dat a automatizace reportů pro všechny projekty
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Nastavení exportu
          </Button>
          <Button variant="gradient">
            <Download className="w-4 h-4 mr-2" />
            Rychlý export
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'templates' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('templates')}
          className="rounded-md"
        >
          <FileText className="w-4 h-4 mr-2" />
          Šablony exportu
        </Button>
        <Button
          variant={activeTab === 'schedule' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('schedule')}
          className="rounded-md"
        >
          <Calendar className="w-4 h-4 mr-2" />
          Plánování
        </Button>
        <Button
          variant={activeTab === 'history' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('history')}
          className="rounded-md"
        >
          <Clock className="w-4 h-4 mr-2" />
          Historie
        </Button>
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <>
          {/* Filters */}
          <div className="flex space-x-3">
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
            >
              <option value="all">Všechny kategorie</option>
              <option value="campaigns">Kampaně</option>
              <option value="financial">Finance</option>
              <option value="feedback">Zpětná vazba</option>
              <option value="team">Tým</option>
              <option value="partners">Partneři</option>
              <option value="executive">Management</option>
            </select>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Další filtry
            </Button>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => {
              const typeConfig_ = typeConfig[template.type as keyof typeof typeConfig];
              const categoryConfig_ = categoryConfig[template.category as keyof typeof categoryConfig];
              const TypeIcon = typeConfig_.icon;
              
              return (
                <Card key={template.id} className="hover:shadow-medium transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-surface border border-border">
                          <TypeIcon className={`w-5 h-5 ${typeConfig_.color}`} />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <Badge className={`${categoryConfig_.color} text-white text-xs mt-1`}>
                            {categoryConfig_.label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {template.description}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Formát:</span>
                        <div className="font-medium">{typeConfig_.label}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Frekvence:</span>
                        <div className="font-medium">
                          {template.frequency === 'monthly' ? 'Měsíčně' :
                           template.frequency === 'weekly' ? 'Týdně' : 'Na vyžádání'}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Velikost:</span>
                        <div className="font-medium">{template.size}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Stahování:</span>
                        <div className="font-medium">{template.downloads}×</div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      Poslední generování: {new Date(template.lastGenerated).toLocaleString('cs-CZ')}
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button variant="gradient" size="sm" className="flex-1">
                        <Download className="w-4 h-4 mr-2" />
                        Stáhnout
                      </Button>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Schedule Tab */}
      {activeTab === 'schedule' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Automatizace reportů</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {scheduleSettings.map((setting) => (
                  <div key={setting.id} className="p-4 rounded-lg border border-border bg-surface">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-foreground">{setting.name}</h4>
                      <Badge variant={setting.enabled ? 'default' : 'outline'}>
                        {setting.enabled ? 'Aktivní' : 'Neaktivní'}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">
                      {setting.description}
                    </p>
                    
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Plán: </span>
                        <span className="font-medium">{setting.schedule}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Příjemci: </span>
                        <span className="font-medium">{setting.recipients.join(', ')}</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 mt-3">
                      <Button variant="outline" size="sm" className="flex-1">
                        Upravit
                      </Button>
                      <Button 
                        variant={setting.enabled ? 'outline' : 'default'} 
                        size="sm"
                      >
                        {setting.enabled ? 'Deaktivovat' : 'Aktivovat'}
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Nové automatické pravidlo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Název pravidla
                  </label>
                  <Input placeholder="Např. Týdenní přehled produktivity" />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Popis
                  </label>
                  <Textarea placeholder="Stručný popis co report obsahuje..." />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Frekvence
                    </label>
                    <select className="w-full p-2 border border-border rounded-md bg-background">
                      <option>Denně</option>
                      <option>Týdně</option>
                      <option>Měsíčně</option>
                      <option>Čtvrtletně</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Formát
                    </label>
                    <select className="w-full p-2 border border-border rounded-md bg-background">
                      <option>PDF</option>
                      <option>Excel</option>
                      <option>CSV</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Email příjemci
                  </label>
                  <Input placeholder="email1@sofinity.cz, email2@sofinity.cz" />
                </div>
                
                <Button variant="gradient" className="w-full">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Vytvořit pravidlo
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle>Historie exportů</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {exportTemplates.slice(0, 10).map((template, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-surface border border-border">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 rounded-lg bg-background border border-border">
                      {template.type === 'pdf' ? <FileText className={`w-4 h-4 text-destructive`} /> :
                       template.type === 'excel' ? <FileSpreadsheet className={`w-4 h-4 text-success`} /> :
                       <FileDown className={`w-4 h-4 text-primary`} />}
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-foreground">{template.name}</h4>
                      <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                        <span>Vygenerováno: {new Date(template.lastGenerated).toLocaleString('cs-CZ')}</span>
                        <span>Velikost: {template.size}</span>
                        <Badge className={`${categoryConfig[template.category as keyof typeof categoryConfig].color} text-white text-xs`}>
                          {categoryConfig[template.category as keyof typeof categoryConfig].label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}