import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Calendar, 
  Users, 
  Plus, 
  Settings, 
  MessageSquare, 
  CreditCard, 
  History 
} from 'lucide-react';

interface MainMenuProps {
  onNavigate: (view: 'form' | 'list' | 'clients' | 'calendar' | 'settings' | 'sms' | 'payments' | 'history') => void;
}

export default function MainMenu({ onNavigate }: MainMenuProps) {
  const menuItems = [
    {
      id: 'form',
      title: 'Wydarzenie',
      description: 'Dodaj nową wizytę',
      icon: Plus,
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      id: 'clients',
      title: 'Klienci',
      description: 'Zarządzaj klientami',
      icon: Users,
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      id: 'calendar',
      title: 'Kalendarz',
      description: 'Zobacz wizyty',
      icon: Calendar,
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      id: 'settings',
      title: 'Ustawienia',
      description: 'Konfiguracja systemu',
      icon: Settings,
      color: 'bg-gray-500 hover:bg-gray-600'
    },
    {
      id: 'sms',
      title: 'SMS',
      description: 'Wiadomości i szablony',
      icon: MessageSquare,
      color: 'bg-orange-500 hover:bg-orange-600'
    },
    {
      id: 'payments',
      title: 'Płatności',
      description: 'Pakiety SMS',
      icon: CreditCard,
      color: 'bg-red-500 hover:bg-red-600'
    },
    {
      id: 'history',
      title: 'Historia',
      description: 'Archiwum aktywności',
      icon: History,
      color: 'bg-indigo-500 hover:bg-indigo-600'
    }
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">CRM Studio Tatuażu</h1>
          <p className="text-muted-foreground text-lg">
            System zarządzania klientami i wizytami
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <Card
                key={item.id}
                className="cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg"
                onClick={() => onNavigate(item.id as any)}
              >
                <CardContent className="p-6 text-center">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${item.color} flex items-center justify-center transition-colors duration-200`}>
                    <IconComponent className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Wersja 1.0 • Dla studiów tatuażu i piercingu
          </p>
        </div>
      </div>
    </div>
  );
}