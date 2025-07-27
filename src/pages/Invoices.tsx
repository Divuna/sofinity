import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Receipt, 
  Plus, 
  Search, 
  Filter,
  Download,
  Send,
  Eye,
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Upload,
  Paperclip
} from 'lucide-react';

const invoices = [
  {
    id: 'INV-2024-001',
    campaignRef: 'Opravo - Letní promo 2024',
    amount: 45600,
    currency: 'CZK',
    status: 'paid',
    createdDate: '2024-07-15',
    sentDate: '2024-07-16',
    dueDate: '2024-08-16',
    paidDate: '2024-08-10',
    client: 'Opravo s.r.o.',
    description: 'Marketingová kampaň - sociální sítě a email marketing',
    items: [
      { description: 'Instagram kampaň', quantity: 1, price: 25000 },
      { description: 'Email marketing sekvence', quantity: 1, price: 15000 },
      { description: 'AI obsah generování', quantity: 1, price: 5600 }
    ],
    attachments: ['faktura_001.pdf', 'smlouva_opravo.pdf'],
    notes: 'Platba proběhla včas, spokojenost klienta vysoká'
  },
  {
    id: 'INV-2024-002',
    campaignRef: 'BikeShare24 - Expanze Praha',
    amount: 32400,
    currency: 'CZK',
    status: 'sent',
    createdDate: '2024-08-01',
    sentDate: '2024-08-02',
    dueDate: '2024-09-02',
    paidDate: null,
    client: 'BikeShare24 a.s.',
    description: 'Marketingová kampaň pro rozšíření služby',
    items: [
      { description: 'YouTube video kampaň', quantity: 1, price: 20000 },
      { description: 'LinkedIn propagace', quantity: 1, price: 8400 },
      { description: 'Analytics a reporty', quantity: 1, price: 4000 }
    ],
    attachments: ['faktura_002.pdf'],
    notes: 'Čekáme na potvrzení platby'
  },
  {
    id: 'INV-2024-003',
    campaignRef: 'CoDneska - Community events',
    amount: 18750,
    currency: 'CZK',
    status: 'draft',
    createdDate: '2024-08-10',
    sentDate: null,
    dueDate: '2024-09-10',
    paidDate: null,
    client: 'CoDneska z.s.',
    description: 'Propagace komunitních akcí a událostí',
    items: [
      { description: 'Facebook event management', quantity: 1, price: 12000 },
      { description: 'Instagram stories série', quantity: 1, price: 6750 }
    ],
    attachments: [],
    notes: 'Připraveno k odeslání po schválení klientem'
  },
  {
    id: 'INV-2024-004',
    campaignRef: 'Opravo - Video tutoriály',
    amount: 67200,
    currency: 'CZK',
    status: 'overdue',
    createdDate: '2024-06-20',
    sentDate: '2024-06-21',
    dueDate: '2024-07-21',
    paidDate: null,
    client: 'Opravo s.r.o.',
    description: 'Produkce video obsahu a YouTube kampaně',
    items: [
      { description: 'Video produkce (5 videí)', quantity: 5, price: 10000 },
      { description: 'YouTube optimalizace', quantity: 1, price: 15000 },
      { description: 'Thumbnail design', quantity: 5, price: 440 }
    ],
    attachments: ['faktura_004.pdf', 'video_brief.pdf'],
    notes: 'UPOMÍNKA: Faktura po splatnosti, kontaktovat klienta'
  }
];

const statusConfig = {
  draft: { color: 'bg-muted-foreground', icon: Edit, label: 'Koncept', description: 'Připraveno k dokončení' },
  sent: { color: 'bg-sofinity-orange', icon: Send, label: 'Odesláno', description: 'Čeká na platbu' },
  paid: { color: 'bg-success', icon: CheckCircle, label: 'Zaplaceno', description: 'Platba přijata' },
  overdue: { color: 'bg-destructive', icon: AlertCircle, label: 'Po splatnosti', description: 'Vyžaduje akci' }
};

export default function Invoices() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState(invoices[0]);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.campaignRef.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || invoice.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const paidAmount = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
  const pendingAmount = invoices.filter(inv => inv.status === 'sent').reduce((sum, inv) => sum + inv.amount, 0);
  const overdueAmount = invoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Fakturace</h1>
          <p className="text-muted-foreground mt-1">
            Správa faktur a dokumentů spojených s kampaněmi
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="gradient" onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nová faktura
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Celkové tržby</p>
                <p className="text-2xl font-bold text-foreground">{totalAmount.toLocaleString()} Kč</p>
              </div>
              <DollarSign className="w-8 h-8 text-sofinity-purple" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Zaplaceno</p>
                <p className="text-2xl font-bold text-success">{paidAmount.toLocaleString()} Kč</p>
              </div>
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Čeká na platbu</p>
                <p className="text-2xl font-bold text-sofinity-orange">{pendingAmount.toLocaleString()} Kč</p>
              </div>
              <Clock className="w-8 h-8 text-sofinity-orange" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Po splatnosti</p>
                <p className="text-2xl font-bold text-destructive">{overdueAmount.toLocaleString()} Kč</p>
              </div>
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoices List */}
        <div className="lg:col-span-2">
          {/* Search & Filters */}
          <div className="flex space-x-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Hledat faktury..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select 
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
            >
              <option value="all">Všechny stavy</option>
              <option value="draft">Koncept</option>
              <option value="sent">Odesláno</option>
              <option value="paid">Zaplaceno</option>
              <option value="overdue">Po splatnosti</option>
            </select>
          </div>

          {/* Invoices */}
          <div className="space-y-4">
            {filteredInvoices.map((invoice) => {
              const statusConfig_ = statusConfig[invoice.status as keyof typeof statusConfig];
              const StatusIcon = statusConfig_.icon;
              
              return (
                <Card 
                  key={invoice.id}
                  className={`cursor-pointer transition-all duration-300 hover:shadow-medium ${
                    selectedInvoice.id === invoice.id ? 'border-primary shadow-soft' : ''
                  }`}
                  onClick={() => setSelectedInvoice(invoice)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-lg ${statusConfig_.color} text-white`}>
                          <StatusIcon className="w-5 h-5" />
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-3 mb-1">
                            <h3 className="font-semibold text-foreground">{invoice.id}</h3>
                            <Badge className={`${statusConfig_.color} text-white text-xs`}>
                              {statusConfig_.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">{invoice.campaignRef}</p>
                          <p className="text-sm text-muted-foreground">{invoice.client}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-xl font-bold text-foreground">
                          {invoice.amount.toLocaleString()} {invoice.currency}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Splatnost: {new Date(invoice.dueDate).toLocaleDateString('cs-CZ')}
                        </div>
                        {invoice.attachments.length > 0 && (
                          <div className="flex items-center space-x-1 mt-1">
                            <Paperclip className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {invoice.attachments.length} příloh
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Invoice Details */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{selectedInvoice.id}</CardTitle>
                <Badge className={`${statusConfig[selectedInvoice.status as keyof typeof statusConfig].color} text-white`}>
                  {statusConfig[selectedInvoice.status as keyof typeof statusConfig].label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Basic Info */}
              <div>
                <h4 className="font-medium text-foreground mb-3">Základní údaje</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Klient</span>
                    <span className="text-foreground font-medium">{selectedInvoice.client}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kampaň</span>
                    <span className="text-foreground">{selectedInvoice.campaignRef}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Částka</span>
                    <span className="text-foreground font-bold">
                      {selectedInvoice.amount.toLocaleString()} {selectedInvoice.currency}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div>
                <h4 className="font-medium text-foreground mb-3">Důležité datumy</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vytvořeno</span>
                    <span className="text-foreground">
                      {new Date(selectedInvoice.createdDate).toLocaleDateString('cs-CZ')}
                    </span>
                  </div>
                  {selectedInvoice.sentDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Odesláno</span>
                      <span className="text-foreground">
                        {new Date(selectedInvoice.sentDate).toLocaleDateString('cs-CZ')}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Splatnost</span>
                    <span className={selectedInvoice.status === 'overdue' ? 'text-destructive font-medium' : 'text-foreground'}>
                      {new Date(selectedInvoice.dueDate).toLocaleDateString('cs-CZ')}
                    </span>
                  </div>
                  {selectedInvoice.paidDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Zaplaceno</span>
                      <span className="text-success font-medium">
                        {new Date(selectedInvoice.paidDate).toLocaleDateString('cs-CZ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="font-medium text-foreground mb-3">Položky faktury</h4>
                <div className="space-y-2">
                  {selectedInvoice.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm p-2 rounded bg-surface">
                      <div>
                        <div className="font-medium text-foreground">{item.description}</div>
                        <div className="text-muted-foreground">Množství: {item.quantity}</div>
                      </div>
                      <div className="text-foreground font-medium">
                        {item.price.toLocaleString()} Kč
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attachments */}
              {selectedInvoice.attachments.length > 0 && (
                <div>
                  <h4 className="font-medium text-foreground mb-3">Přílohy</h4>
                  <div className="space-y-2">
                    {selectedInvoice.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded bg-surface">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{attachment}</span>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedInvoice.notes && (
                <div>
                  <h4 className="font-medium text-foreground mb-3">Poznámky</h4>
                  <p className="text-sm text-muted-foreground p-3 rounded bg-surface">
                    {selectedInvoice.notes}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-2 pt-4">
                {selectedInvoice.status === 'draft' && (
                  <Button variant="gradient" size="sm" className="flex-1">
                    <Send className="w-4 h-4 mr-2" />
                    Odeslat
                  </Button>
                )}
                {selectedInvoice.status === 'sent' && (
                  <Button variant="secondary" size="sm" className="flex-1">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Označit jako zaplaceno
                  </Button>
                )}
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}