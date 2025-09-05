import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSelectedProject } from '@/providers/ProjectProvider';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

const postFormSchema = z.object({
  channel: z.string().min(1, 'Kanál je povinný'),
  text: z.string().min(1, 'Text je povinný'),
  status: z.string().min(1, 'Stav je povinný'),
  publish_date: z.date({
    required_error: 'Datum publikace je povinné',
  }),
  publish_time: z.string().min(1, 'Čas publikace je povinný'),
});

type PostFormValues = z.infer<typeof postFormSchema>;

interface PostFormProps {
  onSuccess?: () => void;
}

const PostForm: React.FC<PostFormProps> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const { selectedProject } = useSelectedProject();
  const { toast } = useToast();

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      channel: '',
      text: '',
      status: 'draft',
      publish_time: '12:00',
    },
  });

  const onSubmit = async (values: PostFormValues) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({
          title: 'Chyba',
          description: 'Musíte být přihlášeni',
          variant: 'destructive',
        });
        return;
      }

      // Combine date and time for publish_date
      const [hours, minutes] = values.publish_time.split(':');
      const publishDate = new Date(values.publish_date);
      publishDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const { error } = await supabase.from('posts').insert({
        user_id: session.user.id,
        project_id: selectedProject?.id || null,
        channel: values.channel,
        text: values.text,
        status: values.status,
        publish_date: publishDate.toISOString(),
        format: 'post',
      });

      if (error) throw error;

      toast({
        title: 'Úspěch',
        description: 'Příspěvek byl úspěšně vytvořen',
      });

      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se vytvořit příspěvek',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Nový příspěvek</CardTitle>
        {selectedProject && (
          <p className="text-sm text-muted-foreground">
            Projekt: {selectedProject.name}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="channel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kanál</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Vyberte kanál" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Facebook">Facebook</SelectItem>
                      <SelectItem value="Instagram">Instagram</SelectItem>
                      <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                      <SelectItem value="TikTok">TikTok</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Text příspěvku</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Napište text vašeho příspěvku..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stav</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Vyberte stav" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Koncept</SelectItem>
                      <SelectItem value="planned">Naplánováno</SelectItem>
                      <SelectItem value="published">Publikováno</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="publish_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Datum publikace</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'dd.MM.yyyy')
                            ) : (
                              <span>Vyberte datum</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className={cn('p-3 pointer-events-auto')}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="publish_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Čas publikace</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="time"
                          {...field}
                          className="pl-10"
                        />
                        <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Vytváření...' : 'Vytvořit příspěvek'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                disabled={loading}
              >
                Vymazat
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default PostForm;