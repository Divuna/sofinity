import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function SofinityPushSender() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !message.trim()) {
      toast({
        title: "Chyba",
        description: "Vyplňte prosím všechna pole.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Call the create_notification edge function using Supabase client
      const { data, error } = await supabase.functions.invoke("create_notification", {
        body: {
          source_app: "sofinity",
          type: "info",
          title: title.trim(),
          message: message.trim(),
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: "✅ Notifikace byla odeslána všem uživatelům Sofinity.",
      });

      // Clear form
      setTitle("");
      setMessage("");
    } catch (error) {
      console.error("Error sending notification:", error);
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodařilo se odeslat notifikaci.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Odeslat Push Notifikaci - Sofinity</CardTitle>
          <CardDescription>
            Odešlete push notifikaci všem uživatelům aplikace Sofinity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                type="text"
                placeholder="Zadejte nadpis notifikace"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Zadejte text notifikace"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={loading}
                rows={5}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Odesílám..." : "Odeslat notifikaci"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
