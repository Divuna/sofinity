import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Check, 
  ArrowRight, 
  ArrowLeft,
  Building2,
  Users,
  Settings,
  Zap,
  Database,
  Mail,
  Bell,
  Globe,
  Sparkles,
  CheckCircle
} from 'lucide-react';

const steps = [
  { id: 1, title: 'Základní informace', icon: Building2 },
  { id: 2, title: 'Výběr projektu', icon: Database },
  { id: 3, title: 'Integrace služeb', icon: Zap },
  { id: 4, title: 'Týmové nastavení', icon: Users },
  { id: 5, title: 'Dokončení', icon: CheckCircle }
];

const projects = [
  {
    id: 'opravo',
    name: 'Opravo',
    description: 'Aplikace pro opravy mobilních telefonů',
    logo: '📱',
    features: ['E-commerce', 'Booking systém', 'B2C komunikace']
  },
  {
    id: 'bikeshare24',
    name: 'BikeShare24',
    description: 'Sdílení kol v městském prostředí',
    logo: '🚲',
    features: ['IoT integrace', 'Geo-lokace', 'B2C aplikace']
  },
  {
    id: 'codneska',
    name: 'CoDneska',
    description: 'Lifestyle a events platforma',
    logo: '🎉',
    features: ['Social media', 'Event management', 'Community']
  }
];

const integrations = [
  {
    id: 'meta',
    name: 'Meta Business',
    description: 'Facebook a Instagram reklamy',
    icon: '📘',
    required: true,
    connected: false
  },
  {
    id: 'google',
    name: 'Google Ads',
    description: 'Google Ads a Analytics',
    icon: '🔍',
    required: true,
    connected: false
  },
  {
    id: 'mailersend',
    name: 'MailerSend',
    description: 'Transactional emaily',
    icon: '📧',
    required: true,
    connected: false
  },
  {
    id: 'onesignal',
    name: 'OneSignal',
    description: 'Push notifikace',
    icon: '🔔',
    required: false,
    connected: false
  },
  {
    id: 'supabase',
    name: 'Supabase',
    description: 'Databáze a backend',
    icon: '⚡',
    required: true,
    connected: true
  }
];

const roles = [
  { id: 'admin', name: 'Administrátor', description: 'Plný přístup ke všem funkcím' },
  { id: 'marketing', name: 'Marketing specialista', description: 'Tvorba a správa kampaní' },
  { id: 'team_lead', name: 'Vedoucí týmu', description: 'Schvalování a koordinace' },
  { id: 'support', name: 'Zákaznická podpora', description: 'Komunikace se zákazníky' }
];

export default function SetupWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    organizationName: '',
    website: '',
    selectedProject: '',
    selectedRole: '',
    teamName: '',
    enableNotifications: true,
    createSampleData: true,
    connectedIntegrations: ['supabase']
  });

  const currentStepIndex = currentStep - 1;
  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleIntegrationToggle = (integrationId: string) => {
    setFormData(prev => ({
      ...prev,
      connectedIntegrations: prev.connectedIntegrations.includes(integrationId)
        ? prev.connectedIntegrations.filter(id => id !== integrationId)
        : [...prev.connectedIntegrations, integrationId]
    }));
  };

  const canProceedFromStep = () => {
    switch (currentStep) {
      case 1:
        return formData.organizationName && formData.website;
      case 2:
        return formData.selectedProject;
      case 3:
        const requiredIntegrations = integrations.filter(i => i.required).map(i => i.id);
        return requiredIntegrations.every(id => formData.connectedIntegrations.includes(id));
      case 4:
        return formData.selectedRole && formData.teamName;
      default:
        return true;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Základní informace</h2>
              <p className="text-muted-foreground">
                Začněme nastavením vašich základních údajů pro platformu Sofinity.
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="organization">Název organizace</Label>
                <Input
                  id="organization"
                  value={formData.organizationName}
                  onChange={(e) => setFormData(prev => ({ ...prev, organizationName: e.target.value }))}
                  placeholder="Váš startup nebo firma"
                />
              </div>
              
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://vase-domena.cz"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Výběr hlavního projektu</h2>
              <p className="text-muted-foreground">
                Vyberte projekt, na kterém se chcete primárně zaměřit. Později můžete přidat další.
              </p>
            </div>
            
            <RadioGroup 
              value={formData.selectedProject} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, selectedProject: value }))}
            >
              <div className="space-y-4">
                {projects.map((project) => (
                  <div key={project.id} className="flex items-center space-x-3">
                    <RadioGroupItem value={project.id} id={project.id} />
                    <Label htmlFor={project.id} className="flex-1 cursor-pointer">
                      <Card className="p-4 hover:bg-surface transition-colors">
                        <div className="flex items-start space-x-4">
                          <div className="text-3xl">{project.logo}</div>
                          <div className="flex-1">
                            <h3 className="font-medium text-foreground">{project.name}</h3>
                            <p className="text-sm text-muted-foreground mb-2">{project.description}</p>
                            <div className="flex flex-wrap gap-1">
                              {project.features.map((feature) => (
                                <Badge key={feature} variant="outline" className="text-xs">
                                  {feature}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Integrace služeb</h2>
              <p className="text-muted-foreground">
                Připojte externí služby pro maximální využití platformy. Povinné integrace jsou označeny.
              </p>
            </div>
            
            <div className="space-y-4">
              {integrations.map((integration) => (
                <Card key={integration.id} className={`p-4 ${formData.connectedIntegrations.includes(integration.id) ? 'border-success bg-success/5' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl">{integration.icon}</div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-foreground">{integration.name}</h3>
                          {integration.required && (
                            <Badge variant="destructive" className="text-xs">Povinné</Badge>
                          )}
                          {formData.connectedIntegrations.includes(integration.id) && (
                            <Badge variant="default" className="text-xs bg-success">
                              <Check className="w-3 h-3 mr-1" />
                              Připojeno
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{integration.description}</p>
                      </div>
                    </div>
                    
                    <Button
                      variant={formData.connectedIntegrations.includes(integration.id) ? "outline" : "gradient"}
                      onClick={() => handleIntegrationToggle(integration.id)}
                      disabled={integration.id === 'supabase'} // Supabase is already connected
                    >
                      {formData.connectedIntegrations.includes(integration.id) ? 'Odpojit' : 'Připojit'}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Týmové nastavení</h2>
              <p className="text-muted-foreground">
                Nastavte váš profil a základní týmové preference.
              </p>
            </div>
            
            <div className="space-y-6">
              <div>
                <Label htmlFor="team-name">Název týmu</Label>
                <Input
                  id="team-name"
                  value={formData.teamName}
                  onChange={(e) => setFormData(prev => ({ ...prev, teamName: e.target.value }))}
                  placeholder="Marketing tým"
                />
              </div>
              
              <div>
                <Label className="text-base font-medium">Vaše role v týmu</Label>
                <RadioGroup 
                  value={formData.selectedRole} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, selectedRole: value }))}
                  className="mt-3"
                >
                  <div className="space-y-3">
                    {roles.map((role) => (
                      <div key={role.id} className="flex items-center space-x-3">
                        <RadioGroupItem value={role.id} id={role.id} />
                        <Label htmlFor={role.id} className="flex-1 cursor-pointer">
                          <div className="p-3 border border-border rounded-lg hover:bg-surface transition-colors">
                            <div className="font-medium text-foreground">{role.name}</div>
                            <div className="text-sm text-muted-foreground">{role.description}</div>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notifications"
                    checked={formData.enableNotifications}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enableNotifications: !!checked }))}
                  />
                  <Label htmlFor="notifications" className="flex items-center space-x-2">
                    <Bell className="w-4 h-4" />
                    <span>Povolit email notifikace</span>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sample-data"
                    checked={formData.createSampleData}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, createSampleData: !!checked }))}
                  />
                  <Label htmlFor="sample-data" className="flex items-center space-x-2">
                    <Database className="w-4 h-4" />
                    <span>Vytvořit ukázková data</span>
                  </Label>
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Vše je připraveno! 🎉</h2>
              <p className="text-muted-foreground">
                Vaše Sofinity platforma je úspěšně nakonfigurována a připravena k použití.
              </p>
            </div>
            
            <Card className="p-6 bg-gradient-card">
              <div className="space-y-4">
                <h3 className="font-medium text-foreground">Souhrn nastavení:</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Organizace:</span>
                    <span className="font-medium">{formData.organizationName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hlavní projekt:</span>
                    <span className="font-medium">{projects.find(p => p.id === formData.selectedProject)?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vaše role:</span>
                    <span className="font-medium">{roles.find(r => r.id === formData.selectedRole)?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Připojené služby:</span>
                    <span className="font-medium">{formData.connectedIntegrations.length}</span>
                  </div>
                </div>
              </div>
            </Card>
            
            <div className="flex justify-center space-x-4">
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Upravit nastavení
              </Button>
              <Button variant="gradient" size="lg">
                <Sparkles className="w-4 h-4 mr-2" />
                Začít používat Sofinity
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-surface p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Vítejte v Sofinity
          </h1>
          <p className="text-muted-foreground">
            Průvodce vás provede nastavením AI marketingové platformy
          </p>
        </div>

        {/* Progress */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-foreground">
                Krok {currentStep} z {steps.length}
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round(progress)}% dokončeno
              </span>
            </div>
            <Progress value={progress} className="mb-4" />
            
            <div className="flex justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      index < currentStep - 1
                        ? 'bg-success text-white'
                        : index === currentStep - 1
                        ? 'bg-gradient-primary text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {index < currentStep - 1 ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="ml-3 hidden sm:block">
                    <div className={`text-sm font-medium ${index <= currentStep - 1 ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {step.title}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <Card className="mb-8">
          <CardContent className="p-8">
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zpět
          </Button>
          
          <Button
            variant="gradient"
            onClick={handleNext}
            disabled={!canProceedFromStep() || currentStep === steps.length}
          >
            {currentStep === steps.length - 1 ? 'Dokončit' : 'Pokračovat'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}