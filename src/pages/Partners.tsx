import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Handshake, 
  Plus, 
  Search, 
  Filter,
  Mail,
  Phone,
  Globe,
  MapPin,
  Building2,
  Scale,
  Shield,
  Users,
  MoreVertical,
  Edit,
  Trash2,
  ExternalLink
} from 'lucide-react';

const partners = [
  {
    id: 1,
    name: 'Advokátní kancelář Novák & Partners',
    type: 'legal',
    region: 'Praha',
    email: 'info@novakpartners.cz',
    phone: '+420 222 123 456',
    website: 'www.novakpartners.cz',
    role: 'legal_advisor',
    description: 'Specializace na obchodní právo, smlouvy a IT právo',
    services: ['Obchodní právo', 'IT právo', 'Smlouvy'],
    rating: 4.8,
    established: '2018',
    contactPerson: 'JUDr. Pavel Novák',
    lastContact: '2024-08-10'
  },
  {
    id: 2,
    name: 'Česká pojišťovna Business',
    type: 'insurance',
    region: 'Celá ČR',
    email: 'business@ceskypojistovna.cz',
    phone: '+420 800 100 777',
    website: 'www.ceskypojistovna.cz/business',
    role: 'insurance_provider',
    description: 'Komplexní pojistné služby pro firmy a podnikatele',
    services: ['Podnikatelské pojištění', 'Kyber pojištění', 'Odpovědnost'],
    rating: 4.5,
    established: '1992',
    contactPerson: 'Ing. Marie Svobodová',
    lastContact: '2024-08-05'
  },
  {
    id: 3,
    name: 'TechLaw s.r.o.',
    type: 'legal',
    region: 'Brno',
    email: 'contact@techlaw.cz',
    phone: '+420 533 456 789',
    website: 'www.techlaw.cz',
    role: 'specialized_counsel',
    description: 'Právní služby pro tech startupy a IT společnosti',
    services: ['GDPR compliance', 'Tech startup právo', 'Investice'],
    rating: 4.9,
    established: '2020',
    contactPerson: 'Mgr. Tomáš Dvořák',
    lastContact: '2024-07-28'
  },
  {
    id: 4,
    name: 'Allianz Risk Consulting',
    type: 'insurance',
    region: 'Praha',
    email: 'risk@allianz.cz',
    phone: '+420 224 891 234',
    website: 'www.allianz.cz/firmy',
    role: 'risk_assessment',
    description: 'Analýza rizik a specialistní pojištění pro tech firmy',
    services: ['Analýza rizik', 'Tech pojištění', 'Consulting'],
    rating: 4.6,
    established: '2005',
    contactPerson: 'Ing. Jan Procházka',
    lastContact: '2024-08-01'
  },
  {
    id: 5,
    name: 'ARROWS Legal',
    type: 'legal',
    region: 'Ostrava',
    email: 'arrows@arrowslegal.cz',
    phone: '+420 596 123 789',
    website: 'www.arrowslegal.cz',
    role: 'contract_specialist',
    description: 'Mezinárodní právo a komplexní právní služby',
    services: ['Mezinárodní právo', 'M&A', 'Compliance'],
    rating: 4.7,
    established: '2015',
    contactPerson: 'JUDr. Anna Horáková',
    lastContact: '2024-07-15'
  }
];

const typeConfig = {
  legal: { color: 'bg-sofinity-purple', icon: Scale, label: 'Právní služby' },
  insurance: { color: 'bg-sofinity-orange', icon: Shield, label: 'Pojištění' }
};

const roleConfig = {
  legal_advisor: 'Právní poradce',
  insurance_provider: 'Pojišťovna',
  specialized_counsel: 'Specializované poradenství',
  risk_assessment: 'Analýza rizik',
  contract_specialist: 'Smluvní právo'
};

export default function Partners() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'legal' | 'insurance'>('all');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedPartner, setSelectedPartner] = useState(partners[0]);

  const filteredPartners = partners.filter(partner => {
    const matchesSearch = partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         partner.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || partner.type === selectedType;
    const matchesRegion = selectedRegion === 'all' || partner.region === selectedRegion;
    
    return matchesSearch && matchesType && matchesRegion;
  });

  const regions = ['all', ...Array.from(new Set(partners.map(p => p.region)))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Partneři</h1>
          <p className="text-muted-foreground mt-1">
            Správa kontaktů pro právní pomoc a pojištění
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Exportovat
          </Button>
          <Button variant="gradient">
            <Plus className="w-4 h-4 mr-2" />
            Přidat partnera
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filters & Partners List */}
        <div className="lg:col-span-2">
          {/* Search & Filters */}
          <div className="space-y-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Hledat partnery..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex space-x-3">
              <select 
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as any)}
                className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                <option value="all">Všechny typy</option>
                <option value="legal">Právní služby</option>
                <option value="insurance">Pojištění</option>
              </select>
              
              <select 
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                <option value="all">Všechny regiony</option>
                {regions.slice(1).map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Partners Grid */}
          <div className="space-y-4">
            {filteredPartners.map((partner) => {
              const typeConfig_ = typeConfig[partner.type as keyof typeof typeConfig];
              const TypeIcon = typeConfig_.icon;
              
              return (
                <Card 
                  key={partner.id}
                  className={`cursor-pointer transition-all duration-300 hover:shadow-medium ${
                    selectedPartner.id === partner.id ? 'border-primary shadow-soft' : ''
                  }`}
                  onClick={() => setSelectedPartner(partner)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className={`p-3 rounded-lg ${typeConfig_.color} text-white`}>
                          <TypeIcon className="w-6 h-6" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-semibold text-foreground">{partner.name}</h3>
                            <Badge className={`${typeConfig_.color} text-white text-xs`}>
                              {typeConfig_.label}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {partner.description}
                          </p>
                          
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3" />
                              <span>{partner.region}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Mail className="w-3 h-3" />
                              <span>{partner.email}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Users className="w-3 h-3" />
                              <span>{roleConfig[partner.role as keyof typeof roleConfig]}</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-1 mt-3">
                            {partner.services.slice(0, 3).map((service) => (
                              <Badge key={service} variant="outline" className="text-xs">
                                {service}
                              </Badge>
                            ))}
                            {partner.services.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{partner.services.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <div className="flex items-center space-x-1">
                            <div className="text-sm font-medium text-warning">★</div>
                            <div className="text-sm font-medium">{partner.rating}</div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Poslední kontakt: {new Date(partner.lastContact).toLocaleDateString('cs-CZ')}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Partner Details */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${typeConfig[selectedPartner.type as keyof typeof typeConfig].color} text-white`}>
                  {selectedPartner.type === 'legal' ? <Scale className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                </div>
                <div>
                  <CardTitle className="text-lg">{selectedPartner.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {roleConfig[selectedPartner.role as keyof typeof roleConfig]}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Contact Info */}
              <div>
                <h4 className="font-medium text-foreground mb-3">Kontaktní údaje</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{selectedPartner.email}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{selectedPartner.phone}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <a href={`https://${selectedPartner.website}`} className="text-primary hover:underline">
                      {selectedPartner.website}
                    </a>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{selectedPartner.region}</span>
                  </div>
                </div>
              </div>

              {/* Services */}
              <div>
                <h4 className="font-medium text-foreground mb-3">Služby</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedPartner.services.map((service) => (
                    <Badge key={service} variant="outline" className="text-xs">
                      {service}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Additional Info */}
              <div>
                <h4 className="font-medium text-foreground mb-3">Další informace</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kontaktní osoba</span>
                    <span className="text-foreground font-medium">{selectedPartner.contactPerson}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Založeno</span>
                    <span className="text-foreground">{selectedPartner.established}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hodnocení</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-warning">★</span>
                      <span className="text-foreground font-medium">{selectedPartner.rating}/5</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Poslední kontakt</span>
                    <span className="text-foreground">
                      {new Date(selectedPartner.lastContact).toLocaleDateString('cs-CZ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2 pt-4">
                <Button variant="gradient" size="sm" className="flex-1">
                  <Mail className="w-4 h-4 mr-2" />
                  Kontaktovat
                </Button>
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Přehled partnerů</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Právní služby</span>
                <span className="font-medium">{partners.filter(p => p.type === 'legal').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Pojišťovny</span>
                <span className="font-medium">{partners.filter(p => p.type === 'insurance').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Průměrné hodnocení</span>
                <span className="font-medium">
                  {(partners.reduce((acc, p) => acc + p.rating, 0) / partners.length).toFixed(1)}/5
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Aktivní regiony</span>
                <span className="font-medium">{new Set(partners.map(p => p.region)).size}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}