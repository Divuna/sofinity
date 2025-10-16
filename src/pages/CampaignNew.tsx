import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MultiSelect, MultiSelectOption } from '@/components/ui/multi-select';
import { ArrowLeft, Sparkles, Mail, FileText, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export default function CampaignNew() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState({
    email: false,
    post: false,
    video: false
  });
  const [contacts, setContacts] = useState<MultiSelectOption[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    targeting: '',
    email: '',
    post: '',
    video: '',
    selectedContacts: [] as string[]
  });

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: contactsData, error } = await supabase
        .from('Contacts')
        .select('id, name, email, full_name')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;

      const contactOptions: MultiSelectOption[] = contactsData?.map(contact => ({
        value: contact.id,
        label: `${contact.name || contact.full_name || 'Bez jména'} (${contact.email})`
      })) || [];

      setContacts(contactOptions);
    } catch (error) {
      console.error('Chyba při načítání kontaktů:', error);
    }
  };

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateContent = async (type: 'email' | 'post' | 'video') => {
    if (!formData.name && !formData.targeting) {
      toast({
        title: "Chyba",
        description: "Nejprve vyplňte název kampaně nebo cílení",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(prev => ({ ...prev, [type]: true }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Chyba",
          description: "Musíte být přihlášeni",
          variant: "destructive"
        });
        return;
      }

      let prompt = '';
      let aiType = '';

      switch (type) {
        case 'email':
          prompt = `Generate a professional marketing email for campaign: "${formData.name}". Target audience: ${formData.targeting || 'general'}. Include compelling subject line and HTML content.`;
          aiType = 'email_generator';
          break;
        case 'post':
          prompt = `Generate an engaging social media post for campaign: "${formData.name}". Target audience: ${formData.targeting || 'general'}. Include hashtags and call-to-action.`;
          aiType = 'post_generator';
          break;
        case 'video':
          prompt = `Generate a video script and description for campaign: "${formData.name}". Target audience: ${formData.targeting || 'general'}. Include scene descriptions and key messaging.`;
          aiType = 'video_generator';
          break;
      }

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { 
          prompt,
          user_id: user.id,
          email_type: aiType
        }
      });

      if (error) throw error;

      if (data?.success) {
        if (type === 'email' && data.ai_response) {
          handleInputChange('email', `Subject: ${data.ai_response.subject}\n\n${data.ai_response.content}`);
        } else if (type === 'post' && data.ai_response?.content) {
          handleInputChange('post', data.ai_response.content);
        } else if (type === 'video' && data.ai_response?.content) {
          handleInputChange('video', data.ai_response.content);
        }

        toast({
          title: "Úspěch",
          description: `${type === 'email' ? 'Email' : type === 'post' ? 'Příspěvek' : 'Video skript'} byl vygenerován pomocí AI`,
        });
      }
    } catch (error) {
      console.error('Chyba při generování:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se vygenerovat obsah",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(prev => ({ ...prev, [type]: false }));
    }
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

      const { data: newCampaign, error } = await supabase
        .from('Campaigns')
        .insert({
          name: formData.name,
          targeting: formData.targeting,
          email: formData.email,
          post: formData.post,
          video: formData.video,
          user_id: user.id,
          status: 'draft'
        })
        .select()
        .single();

      if (error) {
        console.error('Chyba při vytváření kampaně:', error);
        toast({
          title: "Chyba",
          description: "Nepodařilo se vytvořit kampaň: " + error.message,
          variant: "destructive"
        });
        return;
      }

      // Save selected contacts to campaign_contacts table
      if (formData.selectedContacts.length > 0) {
        const contactInserts = formData.selectedContacts.map(contactId => ({
          campaign_id: newCampaign.id,
          contact_id: contactId,
          user_id: user.id
        }));

        const { error: contactsError } = await supabase
          .from('campaign_contacts')
          .insert(contactInserts);

        if (contactsError) {
          console.error('Chyba při přiřazování kontaktů:', contactsError);
          // Continue anyway, campaign was created
        }
      }

      toast({
        title: "Úspěch",
        description: "Kampaň byla úspěšně vytvořena",
      });
      navigate(`/campaigns/${newCampaign.id}`);
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
              <Label htmlFor="contacts">Cílová skupina</Label>
              <MultiSelect
                options={contacts}
                selected={formData.selectedContacts}
                onChange={(value) => handleInputChange('selectedContacts', value)}
                placeholder="Vyberte příjemce..."
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="email">Email obsah</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => generateContent('email')}
                  disabled={isGenerating.email}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {isGenerating.email ? 'Generuje se...' : 'Generovat email'}
                </Button>
              </div>
              <Textarea
                id="email"
                placeholder="Obsah emailové kampaně..."
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="post">Obsah příspěvku</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => generateContent('post')}
                  disabled={isGenerating.post}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {isGenerating.post ? 'Generuje se...' : 'Generovat post'}
                </Button>
              </div>
              <Textarea
                id="post"
                placeholder="Text pro sociální sítě..."
                value={formData.post}
                onChange={(e) => handleInputChange('post', e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="video">Video obsah</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => generateContent('video')}
                  disabled={isGenerating.video}
                >
                  <Video className="h-4 w-4 mr-2" />
                  {isGenerating.video ? 'Generuje se...' : 'Generovat video'}
                </Button>
              </div>
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