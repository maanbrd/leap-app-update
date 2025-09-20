import React, { useState, useEffect } from 'react';
import backend from '~backend/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Phone, Mail } from 'lucide-react';
import type { Event } from '~backend/event/list';
import { useAppContext } from '../contexts/AppContext';

interface HistoryProps {
  onNavigate: (view: 'menu' | 'form' | 'list' | 'clients' | 'calendar' | 'settings' | 'sms' | 'payments' | 'history') => void;
}

interface HistoryItem {
  id: string;
  type: 'event' | 'sms';
  timestamp: Date;
  title: string;
  description: string;
  data: any;
}

export default function History({ onNavigate }: HistoryProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const { refreshTrigger } = useAppContext();

  useEffect(() => {
    console.log('🔄 History useEffect wywołany z refreshTrigger:', refreshTrigger);
    loadHistory();
  }, [refreshTrigger]);

  useEffect(() => {
    filterHistory();
  }, [events, dateFilter]);

  const loadHistory = async () => {
    try {
      console.log('📋 History: Ładuję historię...');
      const eventsResponse = await backend.event.list();
      console.log('✅ History: Wydarzenia załadowane:', eventsResponse.events.length, 'wydarzeń');
      setEvents(eventsResponse.events);
    } catch (error) {
      console.error('❌ History: Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterHistory = () => {
    let items: HistoryItem[] = [];

    // Add events to history
    events.forEach(event => {
      // Event creation
      items.push({
        id: `event-created-${event.id}`,
        type: 'event',
        timestamp: new Date(event.createdAt),
        title: `Utworzono wizytę`,
        description: `${event.firstName} ${event.lastName} - ${event.service}`,
        data: event
      });

      // Simulated SMS history for past events
      const eventDate = new Date(event.eventTime);
      const now = new Date();
      
      if (eventDate < now) {
        // SMS 2 days before
        const sms2Days = new Date(eventDate);
        sms2Days.setDate(sms2Days.getDate() - 2);
        items.push({
          id: `sms-2d-${event.id}`,
          type: 'sms',
          timestamp: sms2Days,
          title: `SMS przypomnienie (2 dni przed)`,
          description: `Wysłano do ${event.firstName} ${event.lastName}`,
          data: { phone: event.phone, type: 'reminder_2d' }
        });

        // SMS after service
        const smsAfter = new Date(eventDate);
        smsAfter.setHours(smsAfter.getHours() + 2);
        items.push({
          id: `sms-after-${event.id}`,
          type: 'sms',
          timestamp: smsAfter,
          title: `SMS pousługowe`,
          description: `Instrukcje pielęgnacji dla ${event.firstName} ${event.lastName}`,
          data: { phone: event.phone, type: 'aftercare', service: event.service }
        });
      }
    });

    // Filter by date if specified
    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      items = items.filter(item => {
        const itemDate = new Date(item.timestamp);
        return itemDate.toDateString() === filterDate.toDateString();
      });
    }

    // Sort by timestamp (newest first)
    items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    setHistoryItems(items);
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'event':
        return <Calendar className="h-4 w-4" />;
      case 'sms':
        return <Phone className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getItemBadge = (type: string) => {
    switch (type) {
      case 'event':
        return <Badge variant="default">Wizyta</Badge>;
      case 'sms':
        return <Badge variant="secondary">SMS</Badge>;
      default:
        return <Badge variant="outline">Inne</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-center">Ładowanie historii...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Historia</h1>
          <Button variant="outline" onClick={() => onNavigate('menu')}>
            ← Menu główne
          </Button>
        </div>

        <div className="mb-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Input
                type="date"
                placeholder="Filtruj po dacie..."
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={() => setDateFilter('')}>
              Wyczyść filtr
            </Button>
          </div>
        </div>

        {historyItems.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                {dateFilter ? 'Brak aktywności w wybranym dniu' : 'Brak historii aktywności'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {historyItems.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {getItemIcon(item.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-medium">{item.title}</h4>
                        <div className="flex items-center gap-2">
                          {getItemBadge(item.type)}
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(item.timestamp)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-8 p-4 bg-muted rounded-lg">
          <div className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div>
              <p className="font-medium">📊 Łączna aktywność</p>
              <p>{historyItems.length} pozycji</p>
            </div>
            <div>
              <p className="font-medium">📅 Wizyty</p>
              <p>{historyItems.filter(item => item.type === 'event').length} wizyt</p>
            </div>
            <div>
              <p className="font-medium">📱 SMS-y</p>
              <p>{historyItems.filter(item => item.type === 'sms').length} wysłanych</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}