import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  BrainCircuit, 
  Send, 
  Copy, 
  Save, 
  Sparkles,
  MessageSquare,
  Mail,
  Share2,
  Lightbulb,
  Zap
} from 'lucide-react';

const assistantTypes = [
  {
    id: 'marketing',
    name: 'Marketing Specialist',
    description: 'Tvorba kampaní, targeting, kreativy',
    icon: Sparkles,
    color: 'bg-sofinity-purple'
  },
  {
    id: 'copywriter',
    name: 'Copywriter',
    description: 'Psaní textů, slogany, popisy',
    icon: MessageSquare,
    color: 'bg-sofinity-orange'
  },
  {
    id: 'email',
    name: 'Email Expert',
    description: 'Emailové kampaně, automatizace',
    icon: Mail,
    color: 'bg-primary'
  },
  {
    id: 'social',
    name: 'Social Media',
    description: 'Posty, stories, engagement',
    icon: Share2,
    color: 'bg-secondary'
  }
];

const recentChats = [
  {
    id: 1,
    title: 'Kampaň pro Opravo - léto 2024',
    assistant: 'Marketing Specialist',
    lastMessage: 'Navrhni mi targeting pro mobilní opravy v létě',
    timestamp: 'před 2 hodinami'
  },
  {
    id: 2,
    title: 'Email série pro BikeShare24',
    assistant: 'Email Expert',
    lastMessage: 'Vytvoř onboarding sérii pro nové uživatele',
    timestamp: 'včera'
  },
  {
    id: 3,
    title: 'Instagram posty CoDneska',
    assistant: 'Social Media',
    lastMessage: 'Potřebuji 10 postů o víkendových akcích',
    timestamp: 'před 3 dny'
  }
];

export default function AIAssistant() {
  const [selectedAssistant, setSelectedAssistant] = useState(assistantTypes[0]);
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([
    {
      role: 'assistant',
      content: `Ahoj! Jsem ${selectedAssistant.name}. Jak ti dnes mohu pomoci s ${selectedAssistant.description.toLowerCase()}?`
    }
  ]);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    setConversation(prev => [
      ...prev,
      { role: 'user', content: message },
      { role: 'assistant', content: 'Zpracovávám váš požadavek...' }
    ]);
    setMessage('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">AI Asistent Hub</h1>
          <p className="text-muted-foreground mt-1">
            Interaktivní tvorba obsahu s AI asistenty
          </p>
        </div>
        <Button variant="gradient">
          <Lightbulb className="w-4 h-4 mr-2" />
          Nápady na obsah
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Assistant Selection */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI Asistenti</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {assistantTypes.map((assistant) => {
                const Icon = assistant.icon;
                const isSelected = selectedAssistant.id === assistant.id;
                
                return (
                  <div
                    key={assistant.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all duration-300 ${
                      isSelected 
                        ? 'border-primary bg-primary/5 shadow-soft' 
                        : 'border-border hover:border-primary/50 hover:bg-surface'
                    }`}
                    onClick={() => setSelectedAssistant(assistant)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${assistant.color} text-white`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground text-sm">{assistant.name}</div>
                        <div className="text-xs text-muted-foreground">{assistant.description}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Recent Chats */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Nedávné konverzace</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentChats.map((chat) => (
                <div
                  key={chat.id}
                  className="p-3 rounded-lg border border-border hover:bg-surface cursor-pointer transition-all duration-300"
                >
                  <div className="font-medium text-sm text-foreground">{chat.title}</div>
                  <Badge variant="outline" className="text-xs mt-1">
                    {chat.assistant}
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {chat.lastMessage}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {chat.timestamp}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-3">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${selectedAssistant.color} text-white`}>
                    <selectedAssistant.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{selectedAssistant.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{selectedAssistant.description}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="icon">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Conversation */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {conversation.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-surface border border-border'
                    }`}
                  >
                    <div className="text-sm">{msg.content}</div>
                  </div>
                </div>
              ))}
            </CardContent>

            {/* Input */}
            <div className="border-t border-border p-4">
              <div className="flex space-x-2">
                <Input
                  placeholder={`Zeptej se ${selectedAssistant.name}...`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} variant="gradient">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 mt-3">
                <Button variant="outline" size="sm">
                  <Zap className="w-3 h-3 mr-1" />
                  Kampaň nápad
                </Button>
                <Button variant="outline" size="sm">
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Napsat post
                </Button>
                <Button variant="outline" size="sm">
                  <Mail className="w-3 h-3 mr-1" />
                  Email template
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}