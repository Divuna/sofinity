import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database, Code, Monitor, Download, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TableAudit {
  name: string;
  description: string;
  onemill_fields: string[];
  record_count: number;
  has_external_connection: boolean;
  related_events: string[];
}

interface EdgeFunctionAudit {
  name: string;
  description: string;
  onemill_events: string[];
  purpose: string;
}

interface UIComponentAudit {
  name: string;
  path: string;
  description: string;
  onemill_data_used: string[];
  component_type: 'page' | 'component';
}

export default function OneMilAudit() {
  const [isLoading, setIsLoading] = useState(false);
  const [tableAudits, setTableAudits] = useState<TableAudit[]>([]);
  const [edgeFunctionAudits] = useState<EdgeFunctionAudit[]>([
    {
      name: "register-onemill-project",
      description: "Registruje nové OneMil projekty v Sofinity systému",
      onemill_events: ["onemill_project_registered"],
      purpose: "Vytváření propojení mezi OneMil a Sofinity projekty"
    },
    {
      name: "sofinity-event",
      description: "Zpracovává incoming OneMil eventy a loguje je do databáze",
      onemill_events: ["contest_closed", "voucher_purchased", "coin_redeemed", "prize_won", "user_registered"],
      purpose: "Centrální zpracování všech OneMil eventů"
    }
  ]);
  
  const [uiComponentAudits] = useState<UIComponentAudit[]>([
    {
      name: "Dashboard",
      path: "/src/pages/Dashboard.tsx",
      description: "Hlavní dashboard zobrazující projekty s OneMil propojením",
      onemill_data_used: ["Projects.external_connection", "onemill_reporting"],
      component_type: "page"
    },
    {
      name: "OneMilSofinityTestSuite", 
      path: "/src/pages/OneMilSofinityTestSuite.tsx",
      description: "Testovací sada pro ověření OneMil integrace",
      onemill_data_used: ["contests", "tickets", "vouchers", "EventLogs", "Projects"],
      component_type: "page"
    },
    {
      name: "OneMilSofinityAuditAutoFix",
      path: "/src/pages/OneMilSofinityAuditAutoFix.tsx", 
      description: "Automatické opravy problémů v OneMil integraci",
      onemill_data_used: ["contests", "tickets", "vouchers", "EventLogs", "audit_logs"],
      component_type: "page"
    },
    {
      name: "AIRequests Detail",
      path: "/src/pages/AIRequestDetail.tsx",
      description: "Detail AI požadavků včetně těch generovaných z OneMil eventů",
      onemill_data_used: ["AIRequests.event_id", "EventLogs"],
      component_type: "page"
    },
    {
      name: "Campaign Detail",
      path: "/src/pages/CampaignDetail.tsx",
      description: "Detail kampaní včetně těch vytvořených z OneMil eventů",
      onemill_data_used: ["Campaigns.event_id", "EventLogs"],
      component_type: "page"
    }
  ]);

  const loadTableAudits = async () => {
    setIsLoading(true);
    try {
      const audits: TableAudit[] = [];

      // Projects table audit
      const { count: projectsCount } = await supabase
        .from('Projects')
        .select('*', { count: 'exact', head: true })
        .not('external_connection', 'is', null);

      audits.push({
        name: "Projects",
        description: "Projekty propojené s OneMil přes external_connection",
        onemill_fields: ["external_connection", "name", "description"],
        record_count: projectsCount || 0,
        has_external_connection: true,
        related_events: ["onemill_project_registered"]
      });

      // EventLogs table audit  
      const { count: eventLogsCount } = await supabase
        .from('EventLogs')
        .select('*', { count: 'exact', head: true });

      audits.push({
        name: "EventLogs", 
        description: "Log všech eventů včetně OneMil eventů (contest_closed, voucher_purchased, atd.)",
        onemill_fields: ["event_name", "metadata", "contest_id", "project_id"],
        record_count: eventLogsCount || 0,
        has_external_connection: false,
        related_events: ["contest_closed", "voucher_purchased", "coin_redeemed", "prize_won"]
      });

      // AIRequests table audit
      const { count: aiRequestsCount } = await supabase
        .from('AIRequests')
        .select('*', { count: 'exact', head: true })
        .not('event_id', 'is', null);

      audits.push({
        name: "AIRequests",
        description: "AI požadavky generované z OneMil eventů",
        onemill_fields: ["event_id", "project_id", "event_name", "type"],
        record_count: aiRequestsCount || 0,
        has_external_connection: false,
        related_events: ["event_forward", "campaign_generator"]
      });

      // Campaigns table audit
      const { count: campaignsCount } = await supabase
        .from('Campaigns')
        .select('*', { count: 'exact', head: true })
        .not('event_id', 'is', null);

      audits.push({
        name: "Campaigns",
        description: "Kampaně vytvořené na základě OneMil eventů",
        onemill_fields: ["event_id", "project_id", "name", "targeting"],
        record_count: campaignsCount || 0,
        has_external_connection: false,
        related_events: ["auto_campaign_created"]
      });

      // Contest-related tables
      const { count: contestsCount } = await supabase
        .from('contests')
        .select('*', { count: 'exact', head: true });

      audits.push({
        name: "contests",
        description: "OneMil soutěže a jejich data",
        onemill_fields: ["id", "title", "description", "status"],
        record_count: contestsCount || 0,
        has_external_connection: false,
        related_events: ["contest_closed", "contest_created"]
      });

      const { count: ticketsCount } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true });

      audits.push({
        name: "tickets",
        description: "Tikety pro OneMil soutěže",
        onemill_fields: ["contest_id", "user_id", "created_at"],
        record_count: ticketsCount || 0,
        has_external_connection: false,
        related_events: ["ticket_created", "ticket_redeemed"]
      });

      const { count: vouchersCount } = await supabase
        .from('vouchers')
        .select('*', { count: 'exact', head: true });

      audits.push({
        name: "vouchers",
        description: "OneMil vouchery a jejich transakce",
        onemill_fields: ["user_id", "value", "status"],
        record_count: vouchersCount || 0,
        has_external_connection: false,
        related_events: ["voucher_purchased", "voucher_redeemed"]
      });

      // Audit logs
      const { count: auditLogsCount } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .like('event_name', '%onemill%');

      audits.push({
        name: "audit_logs",
        description: "Audit log OneMil operací a eventů",
        onemill_fields: ["event_name", "event_data", "project_id"],
        record_count: auditLogsCount || 0,
        has_external_connection: false,
        related_events: ["onemill_project_registered", "onemill_event_processed"]
      });

      setTableAudits(audits);
      toast.success("Audit dat byl úspěšně načten");
    } catch (error) {
      console.error("Error loading table audits:", error);
      toast.error("Chyba při načítání auditu dat");
    } finally {
      setIsLoading(false);
    }
  };

  const exportAudit = () => {
    const auditReport = {
      timestamp: new Date().toISOString(),
      summary: {
        database_tables: tableAudits.length,
        edge_functions: edgeFunctionAudits.length,
        ui_components: uiComponentAudits.length,
        total_records: tableAudits.reduce((sum, table) => sum + table.record_count, 0)
      },
      database_tables: tableAudits,
      edge_functions: edgeFunctionAudits,
      ui_components: uiComponentAudits
    };

    const blob = new Blob([JSON.stringify(auditReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `onemill-sofinity-audit-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success("Audit byl exportován");
  };

  useEffect(() => {
    loadTableAudits();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">OneMil ↔ Sofinity Integration Audit</h1>
          <p className="text-muted-foreground">
            Read-only přehled všech OneMil propojení v systému Sofinity
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={loadTableAudits} 
            disabled={isLoading}
            variant="outline"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Obnovit
          </Button>
          <Button onClick={exportAudit} variant="default">
            <Download className="mr-2 h-4 w-4" />
            Export JSON
          </Button>
        </div>
      </div>

      <Alert>
        <Database className="h-4 w-4" />
        <AlertDescription>
          Tento audit poskytuje read-only přehled všech komponent, tabulek a funkcí využívajících OneMil integraci.
          Žádná data nejsou měněna nebo odstraňována.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="database" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="database">
            <Database className="mr-2 h-4 w-4" />
            Databáze ({tableAudits.length})
          </TabsTrigger>
          <TabsTrigger value="functions">
            <Code className="mr-2 h-4 w-4" />
            Edge Functions ({edgeFunctionAudits.length})
          </TabsTrigger>
          <TabsTrigger value="ui">
            <Monitor className="mr-2 h-4 w-4" />
            UI Komponenty ({uiComponentAudits.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="database" className="space-y-4">
          <div className="grid gap-4">
            {tableAudits.map((table) => (
              <Card key={table.name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      {table.name}
                      {table.has_external_connection && (
                        <Badge variant="secondary">External Connection</Badge>
                      )}
                    </CardTitle>
                    <Badge variant="outline">
                      {table.record_count} záznamů
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{table.description}</p>
                  
                  <div>
                    <h4 className="font-medium mb-2">OneMil pole:</h4>
                    <div className="flex flex-wrap gap-1">
                      {table.onemill_fields.map((field) => (
                        <Badge key={field} variant="outline" className="text-xs">
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Související eventy:</h4>
                    <div className="flex flex-wrap gap-1">
                      {table.related_events.map((event) => (
                        <Badge key={event} variant="secondary" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="functions" className="space-y-4">
          <div className="grid gap-4">
            {edgeFunctionAudits.map((func) => (
              <Card key={func.name}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    {func.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{func.description}</p>
                  
                  <div>
                    <h4 className="font-medium mb-2">Účel:</h4>
                    <p className="text-sm bg-muted p-2 rounded">{func.purpose}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">OneMil eventy:</h4>
                    <div className="flex flex-wrap gap-1">
                      {func.onemill_events.map((event) => (
                        <Badge key={event} variant="secondary" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ui" className="space-y-4">
          <div className="grid gap-4">
            {uiComponentAudits.map((component) => (
              <Card key={component.name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Monitor className="h-5 w-5" />
                      {component.name}
                    </CardTitle>
                    <Badge variant={component.component_type === 'page' ? 'default' : 'outline'}>
                      {component.component_type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{component.description}</p>
                  
                  <div>
                    <h4 className="font-medium mb-2">Cesta:</h4>
                    <code className="text-xs bg-muted p-1 rounded">{component.path}</code>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Používá OneMil data:</h4>
                    <div className="flex flex-wrap gap-1">
                      {component.onemill_data_used.map((data) => (
                        <Badge key={data} variant="outline" className="text-xs">
                          {data}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}