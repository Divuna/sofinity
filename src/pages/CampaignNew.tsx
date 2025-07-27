import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export default function CampaignNew() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    targeting: '',
    email: '',
    post: '',
    video: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Chyba",
          description: "Musíte být přihlášeni pro vytvoření kampaně",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('Campaigns')
        .insert({
          name: formData.name,
          targeting: formData.targeting,
          email: formData.email,
          post: formData.post,
          video: formData.video,
          user_id: user.id, // Automaticky přidáme user_id z přihlášeného uživatele
          status: 'draft'
        });

      if (error) {
        console.error('Chyba při vytváření kampaně:', error);
        toast({
          title: "Chyba",
          description: "Nepodařilo se vytvořit kampaň: " + error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Úspěch",
          description: "Kampaň byla úspěšně vytvořena",
        });
        navigate('/campaign-review');
      }
    } catch (error) {
      console.error('Neočekávaná chyba:', error);
      toast({
        title: "Chyba",
        description: "Došlo k neočekávané chybě",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Nová kampaň</h1>
          <p className="text-muted-foreground mt-1">
            Vytvořte novou marketingovou kampaň
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Základní informace o kampani
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Název kampaně *</Label>
                <Input
                  id="name"
                  placeholder="Název vaší kampaně"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targeting">Cílení</Label>
                <Input
                  id="targeting"
                  placeholder="Cílová skupina"
                  value={formData.targeting}
                  onChange={(e) => handleInputChange('targeting', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email obsah</Label>
              <Textarea
                id="email"
                placeholder="Obsah emailové kampaně..."
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="post">Obsah příspěvku</Label>
              <Textarea
                id="post"
                placeholder="Text pro sociální sítě..."
                value={formData.post}
                onChange={(e) => handleInputChange('post', e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="video">Video obsah</Label>
              <Textarea
                id="video"
                placeholder="Popis video obsahu nebo script..."
                value={formData.video}
                onChange={(e) => handleInputChange('video', e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isLoading || !formData.name}>
                {isLoading ? 'Vytváří se...' : 'Vytvořit kampaň'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate(-1)}
              >
                Zrušit
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}