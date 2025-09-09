import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BackButton } from '@/components/ui/back-button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser } from '@/lib/auth';
import { 
  Settings as SettingsIcon,
  Mail,
  TestTube,
  Zap,
  AlertCircle
} from 'lucide-react';

export default function Settings() {
  const [emailMode, setEmailMode] = useState<'test' | 'production'>('production');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadUserPreferences();
  }, []);

  const loadUserPreferences = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_preferences')
        .select('email_mode')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.email_mode) {
        setEmailMode(data.email_mode as 'test' | 'production');
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst uživatelské nastavení",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateEmailMode = async (mode: 'test' | 'production') => {
    setUpdating(true);
    try {
      const user = await getCurrentUser();
      if (!user) return;

      // First check if user preferences exist
      const { data: existing } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        // Update existing preferences
        const { error } = await supabase
          .from('user_preferences')
          .update({
            email_mode: mode,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Insert new preferences
        const { error } = await supabase
          .from('user_preferences')
          .insert({
            user_id: user.id,
            email_mode: mode,
            dark_mode: false,
            onboarding_complete: false
          });

        if (error) throw error;
      }

      setEmailMode(mode);
      toast({
        title: "Nastavení uloženo",
        description: `Režim e-mailů byl změněn na ${mode === 'test' ? 'testovací' : 'produkční'}`
      });
    } catch (error) {
      console.error('Error updating email mode:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se uložit nastavení",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleChange = (checked: boolean) => {
    const newMode = checked ? 'production' : 'test';
    updateEmailMode(newMode);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-surface flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Načítání nastavení...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <BackButton />
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center">
              <SettingsIcon className="w-8 h-8 mr-3" />
              Nastavení
            </h1>
            <p className="text-muted-foreground mt-1">
              Spravujte vaše uživatelské preference a nastavení systému
            </p>
          </div>
        </div>
      </div>

      {/* Email Mode Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Mail className="w-5 h-5 mr-2" />
            Režim odesílání e-mailů
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Label htmlFor="email-mode" className="text-base font-medium">
                Režim e-mailů
              </Label>
              <div className="flex items-center space-x-2">
                <TestTube className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Testovací</span>
                <Switch
                  id="email-mode"
                  checked={emailMode === 'production'}
                  onCheckedChange={handleToggleChange}
                  disabled={updating}
                />
                <span className="text-sm text-muted-foreground">Produkční</span>
                <Zap className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <Badge 
              variant={emailMode === 'production' ? 'default' : 'secondary'}
              className="ml-4"
            >
              {emailMode === 'production' ? 'Produkční' : 'Testovací'}
            </Badge>
          </div>

          <div className="bg-surface-variant rounded-lg p-4 border-l-4 border-l-primary">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">
                  {emailMode === 'production' ? 'Produkční režim' : 'Testovací režim'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {emailMode === 'production' 
                    ? 'E-maily jsou odesílány skutečným příjemcům. Používejte opatrně v produkčním prostředí.'
                    : 'Všechny e-maily jsou přesměrovány na testovací adresu. Ideální pro testování kampaní.'
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">Testovací režim</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• E-maily jdou na fallback adresu</li>
                <li>• Bezpečné pro testování</li>
                <li>• Žádní skuteční příjemci</li>
                <li>• Ideální pro vývoj</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">Produkční režim</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• E-maily jdou skutečným příjemcům</li>
                <li>• Plně funkční kampaně</li>
                <li>• Pro ostrý provoz</li>
                <li>• Používejte opatrně</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Future Settings Sections */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Další nastavení</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Další možnosti nastavení budou přidány v budoucích verzích.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}