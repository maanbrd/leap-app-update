import React, { useState, useEffect } from 'react';
import backend from '~backend/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Event } from '~backend/event/list';

interface EventListProps {
  onBackToForm: () => void;
}

export default function EventList({ onBackToForm }: EventListProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const response = await backend.event.list();
      setEvents(response.events);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'zapłacony':
        return <Badge variant="default" className="bg-green-500">Zapłacony</Badge>;
      case 'niezapłacony':
        return <Badge variant="destructive">Niezapłacony</Badge>;
      default:
        return <Badge variant="secondary">Nie dotyczy</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-center">Ładowanie wizyt...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Lista Wizyt</h1>
          <Button onClick={onBackToForm}>
            Dodaj wizytę
          </Button>
        </div>

        {events.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Brak wizyt w systemie</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {events.map((event) => (
              <Card key={event.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">
                      {event.firstName} {event.lastName}
                    </CardTitle>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {formatDate(event.eventTime)}
                      </p>
                      <p className="text-sm font-medium">
                        {event.durationMinutes} min
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Usługa</h4>
                      <p className="text-sm">{event.service}</p>
                      <p className="text-sm font-medium mt-1">{event.price} zł</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Kontakt</h4>
                      {event.phone && <p className="text-sm">📞 {event.phone}</p>}
                      {event.email && <p className="text-sm">✉️ {event.email}</p>}
                      {event.instagram && <p className="text-sm">📱 {event.instagram}</p>}
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Zadatek</h4>
                      {event.depositAmount && (
                        <p className="text-sm">{event.depositAmount} zł</p>
                      )}
                      {getStatusBadge(event.depositStatus)}
                      {event.depositDueDate && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Termin: {new Date(event.depositDueDate).toLocaleDateString('pl-PL')}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {event.notes && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-medium mb-1">Uwagi</h4>
                      <p className="text-sm text-muted-foreground">{event.notes}</p>
                    </div>
                  )}
                  
                  <div className="mt-4 pt-4 border-t flex justify-between text-xs text-muted-foreground">
                    <span>Utworzył: {event.createdBy}</span>
                    <span>Dodano: {formatDate(event.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}