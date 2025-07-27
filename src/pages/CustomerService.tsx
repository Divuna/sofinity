import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  HeadphonesIcon, 
  Plus, 
  Search, 
  Filter,
  MessageSquare,
  Bot,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Send,
  Brain,
  Star,
  ThumbsUp,
  ThumbsDown,
  MoreVertical,
  Tag
} from 'lucide-react';

const tickets = [
  {
    id: 'TICK-2024-001',
    subject: 'Problém s odesíláním emailů v BikeShare24 kampani',
    message: 'Dobrý den, máme problém s automatickým odesíláním emailů. Kampaň se nespustila podle plánu.',
    status: 'open',
    priority: 'high',
    assignedTo: {
      name: 'Pavel Dvořák',
      avatar: 'PD'
    },
    relatedCampaign: 'BikeShare24 - Expanze Praha',
    createdDate: '2024-08-15T09:30:00',
    lastUpdate: '2024-08-15T14:20:00',
    customer: {
      name: 'Tomáš Svoboda',
      email: 'tomas.svoboda@bikeshare24.cz',
      company: 'BikeShare24 a.s.'
    },
    tags: ['email', 'automation', 'urgent'],
    responses: [
      {
        author: 'Pavel Dvořák',
        message: 'Děkuji za nahlášení. Proveřuji nastavení automatizace.',
        timestamp: '2024-08-15T10:15:00',
        type: 'staff'
      }
    ]
  },
  {
    id: 'TICK-2024-002',
    subject: 'Žádost o přidání nové lokace do CoDneska',
    message: 'Potřebovali bychom přidat novou lokaci "Karlín" do naší event platformy. Jak to můžeme udělat?',
    status: 'in_progress',
    priority: 'medium',
    assignedTo: {
      name: 'Anna Svobodová',
      avatar: 'AS'
    },
    relatedCampaign: 'CoDneska - Community events',
    createdDate: '2024-08-14T16:45:00',
    lastUpdate: '2024-08-15T11:30:00',
    customer: {
      name: 'Marie Nováková',
      email: 'marie@codneska.cz',
      company: 'CoDneska z.s.'
    },
    tags: ['feature_request', 'location'],
    responses: [
      {
        author: 'Anna Svobodová',
        message: 'Připravíme pro vás dokumentaci k přidání lokace.',
        timestamp: '2024-08-15T11:30:00',
        type: 'staff'
      }
    ]
  },
  {
    id: 'TICK-2024-003',
    subject: 'Zpětná vazba k Opravo kampani',
    message: 'Kampaň byla úspěšná! Chtěli bychom diskutovat možnosti pro další spolupráci.',
    status: 'resolved',
    priority: 'low',
    assignedTo: {
      name: 'Tomáš Novák',
      avatar: 'TN'
    },
    relatedCampaign: 'Opravo - Letní promo 2024',
    createdDate: '2024-08-10T14:20:00',
    lastUpdate: '2024-08-12T09:15:00',
    customer: {
      name: 'Jana Dvořáková',
      email: 'jana@opravo.cz',
      company: 'Opravo s.r.o.'
    },
    tags: ['feedback', 'success', 'follow_up'],
    responses: [
      {
        author: 'Tomáš Novák',
        message: 'Děkujeme za pozitivní zpětnou vazbu! Připravíme návrh na další kampaň.',
        timestamp: '2024-08-12T09:15:00',
        type: 'staff'
      }
    ]
  }
];

const faqItems = [
  {
    id: 1,
    question: 'Jak vytvořím novou marketingovou kampaň?',
    answer: 'Přejděte do sekce "Nová kampaň" a použijte AI asistenta pro vytvoření kampaně krok za krokem.',
    category: 'Kampaně',
    views: 145,
    helpful: 12
  },
  {
    id: 2,
    question: 'Proč se moje emaily nedoručují?',
    answer: 'Zkontrolujte nastavení SMTP serveru a ověřte, že vaše doména má správně nastavené SPF a DKIM záznamy.',
    category: 'Email',
    views: 89,
    helpful: 8
  },
  {
    id: 3,
    question: 'Jak mohu sledovat výkon mých kampaní?',
    answer: 'Využijte sekci "Analýzy" nebo "Reporty kampaní" pro detailní přehled výkonu všech vašich marketingových aktivit.',
    category: 'Analytics',
    views: 156,
    helpful: 15
  }
];

const statusConfig = {
  open: { color: 'bg-sofinity-orange', icon: Clock, label: 'Otevřeno' },
  in_progress: { color: 'bg-sofinity-purple', icon: AlertCircle, label: 'Řeší se' },
  resolved: { color: 'bg-success', icon: CheckCircle, label: 'Vyřešeno' },
  closed: { color: 'bg-muted-foreground', icon: CheckCircle, label: 'Uzavřeno' }
};

const priorityConfig = {
  high: { color: 'text-destructive', label: 'Vysoká' },
  medium: { color: 'text-warning', label: 'Střední' },
  low: { color: 'text-muted-foreground', label: 'Nízká' }
};

export default function CustomerService() {
  const [activeTab, setActiveTab] = useState<'tickets' | 'faq' | 'ai_assistant'>('tickets');
  const [selectedTicket, setSelectedTicket] = useState(tickets[0]);
  const [newMessage, setNewMessage] = useState('');
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // Add message to ticket
      setNewMessage('');
    }
  };

  const handleAiQuestion = () => {
    if (aiQuestion.trim()) {
      setAiResponse('Zpracovávám váš dotaz...');
      // Simulate AI response
      setTimeout(() => {
        setAiResponse('Na základě vaší otázky doporučuji zkontrolovat nastavení v sekci "Email centrum" a ověřit správnost SMTP konfigurace. Pokud problém přetrvává, vytvořte nový ticket pro technickou podporu.');
      }, 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Zákaznická péče</h1>
          <p className="text-muted-foreground mt-1">
            AI asistent, ticketing systém a FAQ pro podporu
          </p>
        </div>
        <Button variant="gradient">
          <Plus className="w-4 h-4 mr-2" />
          Nový ticket
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'tickets' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('tickets')}
          className="rounded-md"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Tickety
        </Button>
        <Button
          variant={activeTab === 'faq' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('faq')}
          className="rounded-md"
        >
          <HeadphonesIcon className="w-4 h-4 mr-2" />
          FAQ
        </Button>
        <Button
          variant={activeTab === 'ai_assistant' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('ai_assistant')}
          className="rounded-md"
        >
          <Bot className="w-4 h-4 mr-2" />
          AI Asistent
        </Button>
      </div>

      {/* Tickets Tab */}
      {activeTab === 'tickets' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tickets List */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {tickets.map((ticket) => {
                const statusConfig_ = statusConfig[ticket.status as keyof typeof statusConfig];
                const priorityConfig_ = priorityConfig[ticket.priority as keyof typeof priorityConfig];
                const StatusIcon = statusConfig_.icon;
                
                return (
                  <Card 
                    key={ticket.id}
                    className={`cursor-pointer transition-all duration-300 hover:shadow-medium ${
                      selectedTicket.id === ticket.id ? 'border-primary shadow-soft' : ''
                    }`}
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <Badge className={`${statusConfig_.color} text-white text-xs`}>
                              {statusConfig_.label}
                            </Badge>
                            <span className={`text-xs font-medium ${priorityConfig_.color}`}>
                              {priorityConfig_.label} priorita
                            </span>
                          </div>
                          
                          <h3 className="font-semibold text-foreground mb-2">{ticket.subject}</h3>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {ticket.message}
                          </p>
                          
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>{ticket.id}</span>
                            <span>{ticket.customer.company}</span>
                            <span>{new Date(ticket.createdDate).toLocaleDateString('cs-CZ')}</span>
                          </div>
                          
                          <div className="flex flex-wrap gap-1 mt-3">
                            {ticket.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-gradient-primary text-white text-xs">
                              {ticket.assignedTo.avatar}
                            </AvatarFallback>
                          </Avatar>
                          <StatusIcon className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Ticket Details */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{selectedTicket.id}</CardTitle>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-foreground mb-2">{selectedTicket.subject}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedTicket.message}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <Badge className={`ml-2 ${statusConfig[selectedTicket.status as keyof typeof statusConfig].color} text-white text-xs`}>
                      {statusConfig[selectedTicket.status as keyof typeof statusConfig].label}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Priorita:</span>
                    <span className={`ml-2 font-medium ${priorityConfig[selectedTicket.priority as keyof typeof priorityConfig].color}`}>
                      {priorityConfig[selectedTicket.priority as keyof typeof priorityConfig].label}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-2">Zákazník</h4>
                  <div className="text-sm space-y-1">
                    <div>{selectedTicket.customer.name}</div>
                    <div className="text-muted-foreground">{selectedTicket.customer.email}</div>
                    <div className="text-muted-foreground">{selectedTicket.customer.company}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-2">Přiřazeno</h4>
                  <div className="flex items-center space-x-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="bg-gradient-primary text-white text-xs">
                        {selectedTicket.assignedTo.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-foreground">{selectedTicket.assignedTo.name}</span>
                  </div>
                </div>

                {selectedTicket.relatedCampaign && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Související kampaň</h4>
                    <Badge variant="outline" className="text-xs">
                      {selectedTicket.relatedCampaign}
                    </Badge>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-foreground mb-2">Odpovědi</h4>
                  <div className="space-y-3">
                    {selectedTicket.responses.map((response, index) => (
                      <div key={index} className="p-3 rounded-lg bg-surface border border-border">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm font-medium text-foreground">{response.author}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(response.timestamp).toLocaleString('cs-CZ')}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">{response.message}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-2">Přidat odpověď</h4>
                  <Textarea
                    placeholder="Napište odpověď..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="mb-3"
                  />
                  <Button onClick={handleSendMessage} variant="gradient" size="sm" className="w-full">
                    <Send className="w-4 h-4 mr-2" />
                    Odeslat odpověď
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* FAQ Tab */}
      {activeTab === 'faq' && (
        <div className="space-y-6">
          <div className="flex space-x-3">
            <Input placeholder="Hledat v FAQ..." className="flex-1" />
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Kategorie
            </Button>
          </div>

          <div className="grid gap-4">
            {faqItems.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-2">{item.question}</h3>
                      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                        {item.answer}
                      </p>
                      
                      <div className="flex items-center space-x-4">
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {item.views} zobrazení
                        </span>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <ThumbsUp className="w-3 h-3" />
                          </Button>
                          <span className="text-xs text-muted-foreground">{item.helpful}</span>
                          <Button variant="ghost" size="sm">
                            <ThumbsDown className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* AI Assistant Tab */}
      {activeTab === 'ai_assistant' && (
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="w-5 h-5 mr-2 text-sofinity-purple" />
                AI Support Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Zeptejte se AI asistenta
                </label>
                <Textarea
                  placeholder="Např: Jak vyřešit problém s odesíláním emailů?"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  className="mb-3"
                />
                <Button onClick={handleAiQuestion} variant="gradient">
                  <Brain className="w-4 h-4 mr-2" />
                  Zeptat se AI
                </Button>
              </div>

              {aiResponse && (
                <div className="p-4 rounded-lg bg-surface border border-border">
                  <h4 className="font-medium text-foreground mb-2">AI Odpověď:</h4>
                  <p className="text-sm text-foreground leading-relaxed">{aiResponse}</p>
                </div>
              )}

              <div>
                <h4 className="font-medium text-foreground mb-3">Častá témata podpory</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    'Problémy s emaily',
                    'Nastavení kampaní',
                    'Analytics a reporty',
                    'Fakturace',
                    'Správa uživatelů',
                    'Technické problémy'
                  ].map((topic) => (
                    <Button
                      key={topic}
                      variant="outline"
                      size="sm"
                      className="justify-start"
                      onClick={() => setAiQuestion(`Pomozte mi s: ${topic}`)}
                    >
                      <Tag className="w-3 h-3 mr-2" />
                      {topic}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}