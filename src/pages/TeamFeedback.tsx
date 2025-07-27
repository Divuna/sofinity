import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  MessageSquare, 
  Send, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Users, 
  Filter,
  Search,
  Calendar,
  Paperclip,
  Plus
} from 'lucide-react';

// Sample feedback data
const feedbackData = [
  {
    id: 1,
    campaignId: "CAMP-001",
    campaignTitle: "Letní výprodej 2024",
    author: "Jana Nováková",
    authorRole: "Marketing specialist",
    message: "Myslím, že by bylo dobré přidat více sociálních důkazů do emailové kampaně. Zákazníci by ocenili recenze a hodnocení.",
    date: "2024-01-15 14:30",
    status: "open",
    category: "Obsah",
    priority: "střední",
    responses: [
      {
        id: 1,
        author: "Tomáš Svoboda",
        authorRole: "Vedoucí marketing",
        message: "Dobrý nápad! Můžete připravit návrh s konkrétními recenzemi?",
        date: "2024-01-15 15:45"
      }
    ]
  },
  {
    id: 2,
    campaignId: "CAMP-002",
    campaignTitle: "Nové produkty Q1",
    author: "Martin Dvořák",
    authorRole: "Grafický designér",
    message: "Vizuály pro sociální média vypadají skvěle, ale doporučuji použít kontrastnější barvy pro lepší čitelnost na mobilních zařízeních.",
    date: "2024-01-14 11:20",
    status: "resolved",
    category: "Design",
    priority: "vysoká",
    responses: [
      {
        id: 1,
        author: "Marie Procházková",
        authorRole: "UX Designer",
        message: "Máte pravdu, už jsem upravila paletu barev. Děkuji za zpětnou vazbu!",
        date: "2024-01-14 16:30"
      }
    ]
  },
  {
    id: 3,
    campaignId: "CAMP-003",
    campaignTitle: "Zákaznická spokojenost",
    author: "Petr Novák",
    authorRole: "Analytik",
    message: "Data z předchozí kampaně ukazují, že otázky typu NPS mají nižší response rate. Navrhuju zkrátit průzkum.",
    date: "2024-01-13 09:15",
    status: "open",
    category: "Analytika",
    priority: "nízká",
    responses: []
  }
];

const teamMembers = [
  { name: "Jana Nováková", role: "Marketing specialist", avatar: "JN" },
  { name: "Tomáš Svoboda", role: "Vedoucí marketing", avatar: "TS" },
  { name: "Marie Procházková", role: "UX Designer", avatar: "MP" },
  { name: "Martin Dvořák", role: "Grafický designér", avatar: "MD" },
  { name: "Petr Novák", role: "Analytik", avatar: "PN" }
];

export default function TeamFeedback() {
  const [selectedFeedback, setSelectedFeedback] = useState(feedbackData[0]);
  const [newComment, setNewComment] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return 'Otevřené';
      case 'resolved': return 'Vyřešené';
      case 'pending': return 'Čeká na odpověď';
      default: return 'Neznámé';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'vysoká': return 'bg-red-100 text-red-800';
      case 'střední': return 'bg-yellow-100 text-yellow-800';
      case 'nízká': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredFeedback = feedbackData.filter(item => {
    const matchesSearch = item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.campaignTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleSendComment = () => {
    if (newComment.trim()) {
      console.log('Odesílám komentář:', newComment);
      setNewComment('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Týmová zpětná vazba
            </h1>
            <p className="text-muted-foreground mt-1">
              Interní komunikace a připomínky k marketingovým kampaním
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <Users className="w-4 h-4 mr-2" />
              Tým ({teamMembers.length})
            </Button>
            <Button className="bg-gradient-primary text-white">
              <Plus className="w-4 h-4 mr-2" />
              Nová zpětná vazba
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {feedbackData.filter(f => f.status === 'open').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Otevřené</p>
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
                    {feedbackData.filter(f => f.status === 'resolved').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Vyřešené</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {feedbackData.filter(f => f.priority === 'vysoká').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Vysoká priorita</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{teamMembers.length}</p>
                  <p className="text-sm text-muted-foreground">Aktivní členové</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Feedback List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Zpětná vazba
                </CardTitle>
                <CardDescription>
                  {filteredFeedback.length} připomínek z {feedbackData.length} celkem
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="space-y-3 mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Hledat zpětnou vazbu..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Stav" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Všechny stavy</SelectItem>
                        <SelectItem value="open">Otevřené</SelectItem>
                        <SelectItem value="resolved">Vyřešené</SelectItem>
                        <SelectItem value="pending">Čeká na odpověď</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Kategorie" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Všechny kategorie</SelectItem>
                        <SelectItem value="Obsah">Obsah</SelectItem>
                        <SelectItem value="Design">Design</SelectItem>
                        <SelectItem value="Analytika">Analytika</SelectItem>
                        <SelectItem value="Technické">Technické</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator className="mb-4" />

                {/* Feedback Items */}
                <div className="space-y-3">
                  {filteredFeedback.map((feedback) => (
                    <div
                      key={feedback.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedFeedback.id === feedback.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedFeedback(feedback)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm mb-1">
                            {feedback.campaignTitle}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {feedback.message}
                          </p>
                        </div>
                        <Badge className={getPriorityColor(feedback.priority)}>
                          {feedback.priority}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={getStatusColor(feedback.status)}>
                          {getStatusText(feedback.status)}
                        </Badge>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{feedback.author}</span>
                          <span>•</span>
                          <span>{feedback.date.split(' ')[0]}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Feedback Detail */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {selectedFeedback.campaignTitle}
                      <Badge className={getStatusColor(selectedFeedback.status)}>
                        {getStatusText(selectedFeedback.status)}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {selectedFeedback.category} • {selectedFeedback.campaignId}
                    </CardDescription>
                  </div>
                  <Badge className={getPriorityColor(selectedFeedback.priority)}>
                    {selectedFeedback.priority} priorita
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Original Message */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar>
                      <AvatarFallback>{selectedFeedback.author.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedFeedback.author}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedFeedback.authorRole} • {selectedFeedback.date}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm">{selectedFeedback.message}</p>
                </div>

                <Separator />

                {/* Responses */}
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Odpovědi ({selectedFeedback.responses.length})
                  </h4>
                  
                  {selectedFeedback.responses.map((response) => (
                    <div key={response.id} className="p-4 border rounded-lg">
                      <div className="flex items-center gap-3 mb-2">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback>{response.author.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{response.author}</p>
                          <p className="text-xs text-muted-foreground">
                            {response.authorRole} • {response.date}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm">{response.message}</p>
                    </div>
                  ))}

                  {selectedFeedback.responses.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Zatím žádné odpovědi</p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* New Response */}
                <div className="space-y-3">
                  <h4 className="font-semibold">Odpovědět</h4>
                  <Textarea
                    placeholder="Napište svou odpověď..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm">
                      <Paperclip className="w-4 h-4 mr-2" />
                      Příloha
                    </Button>
                    <div className="flex gap-2">
                      {selectedFeedback.status === 'open' && (
                        <Button variant="outline" size="sm">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Označit jako vyřešené
                        </Button>
                      )}
                      <Button 
                        onClick={handleSendComment}
                        disabled={!newComment.trim()}
                        className="bg-gradient-primary text-white"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Odeslat
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}