import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  BookOpen, 
  Play, 
  FileText, 
  HelpCircle, 
  Lightbulb,
  Video,
  Download,
  ExternalLink,
  Clock,
  Users,
  Star
} from 'lucide-react';

const articles = [
  {
    id: 1,
    title: 'Začínáme se Sofinity',
    description: 'Komplétní průvodce prvními kroky v platformě',
    category: 'Začínáme',
    readTime: '8 min',
    difficulty: 'Začátečník',
    tags: ['setup', 'onboarding'],
    popular: true
  },
  {
    id: 2,
    title: 'Vytváření AI kampaní',
    description: 'Jak efektivně využít AI generátor pro tvorbu obsahu',
    category: 'Kampaně',
    readTime: '12 min',
    difficulty: 'Pokročilý',
    tags: ['ai', 'kampan', 'content'],
    popular: true
  },
  {
    id: 3,
    title: 'Email Marketing Automation',
    description: 'Nastavení automatických emailových sekvencí',
    category: 'Email',
    readTime: '15 min',
    difficulty: 'Středně pokročilý',
    tags: ['email', 'automatizace'],
    popular: false
  },
  {
    id: 4,
    title: 'Analytics a Reporting',
    description: 'Sledování výkonu a vytváření reportů',
    category: 'Analytics',
    readTime: '10 min',
    difficulty: 'Středně pokročilý',
    tags: ['analytics', 'reporting', 'kpi'],
    popular: true
  },
  {
    id: 5,
    title: 'Správa týmu a rolí',
    description: 'Jak přidávat uživatele a nastavovat oprávnění',
    category: 'Management',
    readTime: '6 min',
    difficulty: 'Začátečník',
    tags: ['team', 'roles', 'management'],
    popular: false
  },
  {
    id: 6,
    title: 'Integrace s externími službami',
    description: 'Propojení s Meta, Google Ads, Mailchimp a dalšími',
    category: 'Integrace',
    readTime: '20 min',
    difficulty: 'Pokročilý',
    tags: ['integrace', 'api', 'setup'],
    popular: false
  }
];

const videos = [
  {
    id: 1,
    title: 'Úvod do Sofinity - Kompletní přehled',
    description: 'Přehled všech funkcí a možností platformy',
    duration: '12:45',
    thumbnail: 'video-1',
    category: 'Přehled',
    views: '2.1k'
  },
  {
    id: 2,
    title: 'Tvorba první AI kampaně krok za krokem',
    description: 'Praktická ukázka vytvoření kampaně od A do Z',
    duration: '18:30',
    thumbnail: 'video-2',
    category: 'Kampaně',
    views: '1.8k'
  },
  {
    id: 3,
    title: 'Email automatizace pro e-commerce',
    description: 'Nastavení welcome série a opuštěný košík',
    duration: '22:15',
    thumbnail: 'video-3',
    category: 'Email',
    views: '1.5k'
  },
  {
    id: 4,
    title: 'Advanced Analytics Dashboard',
    description: 'Pokročilé analýzy a custom reporty',
    duration: '15:20',
    thumbnail: 'video-4',
    category: 'Analytics',
    views: '956'
  }
];

const faqs = [
  {
    id: 1,
    question: 'Jak mohu přidat nového člena týmu?',
    answer: 'Přejděte do sekce "Správa uživatelů", klikněte na "Pozvat uživatele", zadejte email a vyberte roli. Uživatel dostane email s odkazem pro aktivaci účtu.',
    category: 'Správa týmu'
  },
  {
    id: 2,
    question: 'Je možné upravit AI vygenerovaný obsah?',
    answer: 'Ano, veškerý AI generovaný obsah můžete libovolně upravovat. AI slouží jako výchozí bod, finální podobu máte plně pod kontrolou.',
    category: 'AI a obsah'
  },
  {
    id: 3,
    question: 'Jak dlouho se uchovávají data kampaní?',
    answer: 'Data kampaní se uchovávají bez časového omezení. Všechny metriky, reporty a historie verzí zůstávají dostupné.',
    category: 'Data a bezpečnost'
  },
  {
    id: 4,
    question: 'Můžu exportovat data do externích systémů?',
    answer: 'Ano, Sofinity podporuje export do CSV, PDF a přímé API integrace s populárními nástroji jako Google Analytics, Facebook Ads Manager aj.',
    category: 'Export a integrace'
  },
  {
    id: 5,
    question: 'Jak funguje schvalovací proces kampaní?',
    answer: 'Kampaně procházejí stavem: Návrh → Odesláno ke schválení → Schváleno/Vyžaduje úpravy → Publikováno. Každý krok je zaznamenán v historii.',
    category: 'Workflow'
  }
];

export default function KnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         video.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || video.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', 'Začínáme', 'Kampaně', 'Email', 'Analytics', 'Management', 'Integrace'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Znalostní centrum</h1>
          <p className="text-muted-foreground mt-1">
            Dokumentace, návody a odpovědi na časté otázky
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            PDF dokumentace
          </Button>
          <Button variant="gradient">
            <ExternalLink className="w-4 h-4 mr-2" />
            API dokumentace
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Hledejte v dokumentaci..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category === 'all' ? 'Vše' : category}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <Tabs defaultValue="articles" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="articles" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Články
          </TabsTrigger>
          <TabsTrigger value="videos" className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            Video návody
          </TabsTrigger>
          <TabsTrigger value="faq" className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            FAQ
          </TabsTrigger>
        </TabsList>

        {/* Articles */}
        <TabsContent value="articles" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article) => (
              <Card key={article.id} className="hover:shadow-medium transition-all duration-300 cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2 flex items-center">
                        {article.title}
                        {article.popular && (
                          <Star className="w-4 h-4 ml-2 text-warning fill-current" />
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {article.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant="secondary" className="text-xs">
                      {article.category}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {article.readTime}
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        article.difficulty === 'Začátečník' ? 'border-success text-success' :
                        article.difficulty === 'Středně pokročilý' ? 'border-warning text-warning' :
                        'border-destructive text-destructive'
                      }`}
                    >
                      {article.difficulty}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {article.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                  <Button className="w-full" variant="outline">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Číst článek
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Videos */}
        <TabsContent value="videos" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredVideos.map((video) => (
              <Card key={video.id} className="hover:shadow-medium transition-all duration-300 cursor-pointer">
                <CardHeader>
                  <div className="aspect-video bg-gradient-card rounded-lg flex items-center justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center">
                      <Play className="w-8 h-8 text-white ml-1" />
                    </div>
                  </div>
                  <CardTitle className="text-lg">{video.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {video.description}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {video.duration}
                      </span>
                      <span className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {video.views} shlédnutí
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {video.category}
                    </Badge>
                  </div>
                  <Button className="w-full" variant="gradient">
                    <Play className="w-4 h-4 mr-2" />
                    Přehrát video
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* FAQ */}
        <TabsContent value="faq" className="space-y-4">
          <div className="space-y-4">
            {filteredFAQs.map((faq) => (
              <Card key={faq.id}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-start">
                    <HelpCircle className="w-5 h-5 mr-3 text-primary flex-shrink-0 mt-0.5" />
                    {faq.question}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="ml-8">
                    <p className="text-muted-foreground mb-3">
                      {faq.answer}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {faq.category}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Popular Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lightbulb className="w-5 h-5 mr-2 text-primary" />
            Nejpopulárnější zdroje
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-auto p-4 justify-start">
              <div className="text-left">
                <div className="font-medium text-sm">Rychlý start</div>
                <div className="text-xs text-muted-foreground">5-minutový úvod</div>
              </div>
            </Button>
            <Button variant="outline" className="h-auto p-4 justify-start">
              <div className="text-left">
                <div className="font-medium text-sm">AI kampaně</div>
                <div className="text-xs text-muted-foreground">Best practices</div>
              </div>
            </Button>
            <Button variant="outline" className="h-auto p-4 justify-start">
              <div className="text-left">
                <div className="font-medium text-sm">API dokumentace</div>
                <div className="text-xs text-muted-foreground">Technické detaily</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}