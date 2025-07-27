import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  GitBranch, 
  Clock, 
  Eye, 
  Download, 
  RotateCcw,
  ArrowRight,
  Users,
  Calendar,
  Edit,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

// Sample version data
const versionData = [
  {
    id: 1,
    campaignId: "CAMP-001",
    campaignTitle: "Letní výprodej 2024",
    versions: [
      {
        version: "v1.3",
        date: "2024-01-15 16:45",
        author: "Jana Nováková",
        status: "current",
        changes: "Přidány sociální důkazy a upraveno CTA tlačítko",
        description: "Finální verze s implementovanými připomínkami z review procesu",
        fileSize: "2.4 MB",
        approvedBy: "Tomáš Svoboda"
      },
      {
        version: "v1.2",
        date: "2024-01-15 14:30",
        author: "Jana Nováková",
        status: "reviewed",
        changes: "Upravena struktura emailu a přidány další produkty",
        description: "Druhá iterace s rozšířeným obsahem a lepší segmentací",
        fileSize: "2.1 MB",
        approvedBy: null
      },
      {
        version: "v1.1",
        date: "2024-01-14 10:15",
        author: "Jana Nováková",
        status: "draft",
        changes: "První návrh kampaně s základní strukturou",
        description: "Počáteční koncept se základními prvky a obsahem",
        fileSize: "1.8 MB",
        approvedBy: null
      }
    ]
  },
  {
    id: 2,
    campaignId: "CAMP-002",
    campaignTitle: "Nové produkty Q1",
    versions: [
      {
        version: "v2.1",
        date: "2024-01-14 18:20",
        author: "Martin Dvořák",
        status: "needs_review",
        changes: "Upraveny vizuály pro lepší kontrast na mobilních zařízeních",
        description: "Aktualizace designu podle feedback z UX týmu",
        fileSize: "3.2 MB",
        approvedBy: null
      },
      {
        version: "v2.0",
        date: "2024-01-13 15:45",
        author: "Martin Dvořák",
        status: "archived",
        changes: "Kompletní přepracování vizuální identity kampaně",
        description: "Nový design s moderním přístupem a fresh look",
        fileSize: "2.9 MB",
        approvedBy: null
      }
    ]
  }
];

const allVersions = versionData.flatMap(campaign => 
  campaign.versions.map(version => ({
    ...version,
    campaignId: campaign.campaignId,
    campaignTitle: campaign.campaignTitle
  }))
).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export default function VersionTracker() {
  const [selectedCampaign, setSelectedCampaign] = useState(versionData[0]);
  const [compareVersions, setCompareVersions] = useState([]);
  const [viewMode, setViewMode] = useState('campaign');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'current': return 'bg-green-100 text-green-800';
      case 'reviewed': return 'bg-blue-100 text-blue-800';
      case 'needs_review': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'archived': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'current': return 'Aktuální';
      case 'reviewed': return 'Zkontrolováno';
      case 'needs_review': return 'Čeká na review';
      case 'draft': return 'Návrh';
      case 'archived': return 'Archivováno';
      default: return 'Neznámé';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'current': return <CheckCircle className="w-4 h-4" />;
      case 'reviewed': return <Eye className="w-4 h-4" />;
      case 'needs_review': return <AlertCircle className="w-4 h-4" />;
      case 'draft': return <Edit className="w-4 h-4" />;
      case 'archived': return <FileText className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const handleCompareToggle = (version: any) => {
    if (compareVersions.find(v => v.version === version.version)) {
      setCompareVersions(compareVersions.filter(v => v.version !== version.version));
    } else if (compareVersions.length < 2) {
      setCompareVersions([...compareVersions, version]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Historie verzí
            </h1>
            <p className="text-muted-foreground mt-1">
              Sledování a správa všech verzí marketingových kampaní
            </p>
          </div>
          <div className="flex gap-3">
            <Select value={viewMode} onValueChange={setViewMode}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="campaign">Podle kampaní</SelectItem>
                <SelectItem value="timeline">Chronologicky</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export historie
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {allVersions.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Celkem verzí</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {allVersions.filter(v => v.status === 'current').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Aktuálních</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {allVersions.filter(v => v.status === 'needs_review').length}
                  </p>
                  <p className="text-sm text-muted-foreground">K review</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <GitBranch className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{versionData.length}</p>
                  <p className="text-sm text-muted-foreground">Aktivních kampaní</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {viewMode === 'campaign' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Campaign List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Kampaně
                  </CardTitle>
                  <CardDescription>
                    {versionData.length} kampaní s verzováním
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {versionData.map((campaign) => (
                    <div
                      key={campaign.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedCampaign.id === campaign.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedCampaign(campaign)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-sm">{campaign.campaignTitle}</h3>
                        <Badge variant="outline">
                          {campaign.versions.length} verzí
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <span>{campaign.campaignId}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge className={getStatusColor(campaign.versions[0].status)}>
                          {getStatusIcon(campaign.versions[0].status)}
                          <span className="ml-1">{getStatusText(campaign.versions[0].status)}</span>
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {campaign.versions[0].date.split(' ')[0]}
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Version Detail */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GitBranch className="w-5 h-5" />
                    {selectedCampaign.campaignTitle}
                  </CardTitle>
                  <CardDescription>
                    {selectedCampaign.versions.length} verzí • {selectedCampaign.campaignId}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedCampaign.versions.map((version, index) => (
                      <div key={version.version} className="relative">
                        {/* Version Timeline */}
                        <div className="flex items-start gap-4">
                          {/* Timeline Line */}
                          <div className="flex flex-col items-center">
                            <div className={`w-3 h-3 rounded-full ${
                              version.status === 'current' ? 'bg-green-500' :
                              version.status === 'reviewed' ? 'bg-blue-500' :
                              version.status === 'needs_review' ? 'bg-yellow-500' :
                              'bg-gray-400'
                            }`} />
                            {index < selectedCampaign.versions.length - 1 && (
                              <div className="w-px h-16 bg-border mt-2" />
                            )}
                          </div>

                          {/* Version Content */}
                          <div className="flex-1 p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <h4 className="font-semibold">{version.version}</h4>
                                <Badge className={getStatusColor(version.status)}>
                                  {getStatusIcon(version.status)}
                                  <span className="ml-1">{getStatusText(version.status)}</span>
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCompareToggle(version)}
                                  disabled={compareVersions.length >= 2 && !compareVersions.find(v => v.version === version.version)}
                                >
                                  {compareVersions.find(v => v.version === version.version) ? 'Zrušit porovnání' : 'Porovnat'}
                                </Button>
                                <Button variant="outline" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {version.status !== 'current' && (
                                  <Button variant="outline" size="sm">
                                    <RotateCcw className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>

                            <p className="text-sm text-muted-foreground mb-3">
                              {version.description}
                            </p>

                            <div className="text-sm font-medium mb-2">
                              Změny: {version.changes}
                            </div>

                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {version.author}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {version.date}
                                </div>
                                <span>Velikost: {version.fileSize}</span>
                              </div>
                              {version.approvedBy && (
                                <span>Schválil: {version.approvedBy}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Compare Section */}
                  {compareVersions.length === 2 && (
                    <>
                      <Separator className="my-6" />
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <ArrowRight className="w-4 h-4" />
                          Porovnání verzí: {compareVersions[0].version} ↔ {compareVersions[1].version}
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="font-medium">{compareVersions[0].version}</p>
                            <p className="text-muted-foreground">{compareVersions[0].date}</p>
                            <p className="mt-2">{compareVersions[0].changes}</p>
                          </div>
                          <div>
                            <p className="font-medium">{compareVersions[1].version}</p>
                            <p className="text-muted-foreground">{compareVersions[1].date}</p>
                            <p className="mt-2">{compareVersions[1].changes}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button size="sm">Zobrazit rozdíly</Button>
                          <Button variant="outline" size="sm" onClick={() => setCompareVersions([])}>
                            Zrušit porovnání
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* Timeline View */
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Chronologická historie
              </CardTitle>
              <CardDescription>
                Všechny verze seřazené podle data vytvoření
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allVersions.map((version, index) => (
                  <div key={`${version.campaignId}-${version.version}`} className="flex items-center gap-4 p-4 border rounded-lg">
                    <Avatar>
                      <AvatarFallback>{version.author.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{version.campaignTitle}</h4>
                        <Badge variant="outline">{version.version}</Badge>
                        <Badge className={getStatusColor(version.status)}>
                          {getStatusIcon(version.status)}
                          <span className="ml-1">{getStatusText(version.status)}</span>
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {version.changes}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{version.author}</span>
                        <span>{version.date}</span>
                        <span>{version.campaignId}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}