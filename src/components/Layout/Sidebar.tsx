import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Sparkles, 
  Calendar, 
  MessageSquare, 
  Mail, 
  BarChart3, 
  Settings,
  Bot,
  Users,
  FileText,
  BrainCircuit,
  Handshake,
  Receipt,
  HeadphonesIcon,
  Star,
  Building2,
  CreditCard,
  LifeBuoy,
  TrendingUp,
  Database,
  Shield,
  Download,
  BarChart2,
  Target,
  Bell,
  CheckCircle,
  BookOpen,
  Bug,
  TestTube
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Kampaně', href: '/campaigns', icon: Target },
  { name: 'Nabídky', href: '/offers', icon: Handshake },
  { name: 'Příspěvky', href: '/prispevky', icon: FileText },
  { name: 'Plánování', href: '/schedule', icon: Calendar },
  { name: 'Auto-odpovědi', href: '/autoresponses', icon: Bot },
  { name: 'Email centrum', href: '/emails', icon: Mail },
  { name: 'Kontakty', href: '/contacts', icon: Users },
  { name: 'Šablony', href: '/templates', icon: FileText },
  { name: 'Reporty', href: '/reports', icon: BarChart3 },
];

const advancedNavigation = [
  { name: 'AI Asistent', href: '/ai-assistant', icon: Bot },
  { name: 'Monitoring AI', href: '/ai-requests-monitoring', icon: TrendingUp },
  { name: 'OneMil Test Suite', href: '/onemil-test-suite', icon: BrainCircuit },
  { name: 'OneMil Audit', href: '/onemil-audit', icon: Database },
  { name: 'OneMil E-mail Generátor', href: '/onemill-email-generator', icon: Mail },
  { name: 'OneMil E2E Test', href: '/onemill-end-to-end-test', icon: TestTube },
  
  { name: 'Notifikace', href: '/notifications', icon: Bell },
  { name: 'Týmová zpětná vazba', href: '/team-feedback', icon: MessageSquare },
  { name: 'Historie verzí', href: '/version-tracker', icon: FileText },
  { name: 'Schvalování', href: '/campaign-review', icon: CheckCircle },
  { name: 'Kalendář týmu', href: '/team-calendar', icon: Calendar },
  { name: 'Znalostní báze', href: '/knowledge-base', icon: BookOpen },
  { name: 'Opravo API Test', href: '/offers-api', icon: Database },
  { name: 'Opravo API Debug', href: '/opravo-api-debug', icon: Bug },
];

const businessNavigation = [
  { name: 'Partneři', href: '/partners', icon: Handshake },
  { name: 'Fakturace', href: '/invoices', icon: Receipt },
  { name: 'Zákaznická péče', href: '/customer-service', icon: HeadphonesIcon },
  { name: 'Zpětná vazba', href: '/feedback', icon: Star },
];

const managementNavigation = [
  { name: 'Projekty', href: '/projects', icon: Building2 },
  { name: 'Reporting dashboard', href: '/reporting-dashboard', icon: BarChart2 },
  { name: 'Export centrum', href: '/export-center', icon: Download },
  { name: 'Správa přístupů', href: '/access-control', icon: Shield },
  { name: 'Nastavení', href: '/settings', icon: Settings },
];

interface SidebarProps {
  currentPath: string;
}

export function Sidebar({ currentPath }: SidebarProps) {
  return (
    <div className="flex h-full w-64 flex-col bg-gradient-card border-r border-border">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Sofinity
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {/* Core Marketing */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Marketing
          </h3>
          {navigation.map((item) => {
            const isActive = currentPath === item.href;
            return (
              <Button
                key={item.name}
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start text-left font-medium mb-1",
                  isActive && "bg-primary text-primary-foreground shadow-soft"
                )}
                asChild
              >
                <Link to={item.href}>
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              </Button>
            );
          })}
        </div>

        {/* Advanced Features */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            AI Office
          </h3>
          {advancedNavigation.map((item) => {
            const isActive = currentPath === item.href;
            return (
              <Button
                key={item.name}
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start text-left font-medium mb-1",
                  isActive && "bg-primary text-primary-foreground shadow-soft"
                )}
                asChild
              >
                <Link to={item.href}>
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              </Button>
            );
          })}
        </div>

        {/* Business Operations */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Business
          </h3>
          {businessNavigation.map((item) => {
            const isActive = currentPath === item.href;
            return (
              <Button
                key={item.name}
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start text-left font-medium mb-1",
                  isActive && "bg-primary text-primary-foreground shadow-soft"
                )}
                asChild
              >
                <Link to={item.href}>
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              </Button>
            );
          })}
        </div>

        {/* Management */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Management
          </h3>
          {managementNavigation.map((item) => {
            const isActive = currentPath === item.href;
            return (
              <Button
                key={item.name}
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start text-left font-medium mb-1",
                  isActive && "bg-primary text-primary-foreground shadow-soft"
                )}
                asChild
              >
                <Link to={item.href}>
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              </Button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground text-center">
          AI Marketing Platform
        </div>
      </div>
    </div>
  );
}