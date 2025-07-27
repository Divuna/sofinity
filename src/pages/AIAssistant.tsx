import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarContent, AvatarFallback } from '@/components/ui/avatar';
import { 
  Bot, 
  Send, 
  Sparkles, 
  User, 
  BookOpen, 
  Settings, 
  BarChart3, 
  Mail,
  MessageSquare,
  Lightbulb,
  ArrowRight
} from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

const initialMessages: Message[] = [
  {
    id: '1',
    type: 'assistant',
    content: 'Vítejte v Sofinity! 👋 Jsem váš AI asistent a pomohu vám pochopit všechny funkce této platformy. Můžete se mě zeptat na cokoliv ohledně kampaní, emailů, analýz nebo nastavení týmu. Jak bych vám mohl pomoci?',
    timestamp: new Date(),
    suggestions: [
      'Jak vytvořím první kampaň?',
      'Jak nastavím automatické emaily?',
      'Vysvětli mi reporting funkcí',
      'Jak přidám členy týmu?'
    ]
  }
];

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const response: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Děkuji za vaši otázku! Pomohu vám s tím. Sofinity nabízí komplexní řešení pro digital marketing včetně AI kampaní, email automatizace a pokročilých analýz.',
        timestamp: new Date(),
        suggestions: ['Řekni mi více', 'Jak na to prakticky?', 'Další možnosti']
      };

      setMessages(prev => [...prev, response]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">AI Asistent</h1>
          <p className="text-muted-foreground mt-1">
            Inteligentní průvodce platformou Sofinity
          </p>
        </div>
        <Badge variant="outline" className="bg-gradient-primary text-white border-none">
          <Bot className="w-3 h-3 mr-1" />
          Online
        </Badge>
      </div>

      {/* Chat Interface */}
      <Card className="h-[600px] flex flex-col">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center text-lg">
            <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center mr-3">
              <Bot className="w-4 h-4 text-white" />
            </div>
            Sofinity AI Asistent
          </CardTitle>
        </CardHeader>

        {/* Messages */}
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-[400px] p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center mx-2">
                      {message.type === 'user' ? (
                        <User className="w-4 h-4 text-white" />
                      ) : (
                        <Bot className="w-4 h-4 text-white" />
                      )}
                    </div>
                    
                    <div className="flex flex-col">
                      <div
                        className={`rounded-lg px-4 py-2 ${
                          message.type === 'user'
                            ? 'bg-gradient-primary text-white'
                            : 'bg-surface border border-border'
                        }`}
                      >
                        <div className="text-sm whitespace-pre-line">
                          {message.content}
                        </div>
                      </div>
                      
                      {message.suggestions && message.type === 'assistant' && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {message.suggestions.map((suggestion, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => handleSendMessage(suggestion)}
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex max-w-[80%]">
                    <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center mx-2">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-surface border border-border rounded-lg px-4 py-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>

        {/* Input */}
        <div className="border-t border-border p-4">
          <div className="flex space-x-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Zeptejte se na cokoliv o Sofinity..."
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSendMessage(inputValue);
                }
              }}
              className="flex-1"
            />
            <Button
              onClick={() => handleSendMessage(inputValue)}
              disabled={!inputValue.trim() || isTyping}
              variant="gradient"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}