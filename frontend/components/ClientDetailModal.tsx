import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Phone, 
  Mail, 
  Instagram, 
  MessageCircle, 
  Calendar, 
  MessageSquare,
  Edit3,
  Save,
  X as XIcon
} from 'lucide-react';
import backend from '~backend/client';
import type { Client } from '~backend/client/list';

interface ClientDetailModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onClientUpdate: (updatedClient: Client) => void;
}

interface Event {
  id: number;
  firstName: string;
  lastName: string;
  eventTime: Date;
  service: string;
  price: number;
  status: string;
}

interface SMS {
  id: number;
  phone: string;
  message: string;
  status: string;
  sentAt: Date;
  templateCode?: string;
}

export default function ClientDetailModal({ 
  client, 
  isOpen, 
  onClose, 
  onClientUpdate 
}: ClientDetailModalProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [smsHistory, setSmsHistory] = useState<SMS[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);

  // Pobierz historię wizyt i SMS-ów
  useEffect(() => {
    if (client && isOpen) {
      fetchClientHistory();
    }
  }, [client, isOpen]);

  const fetchClientHistory = async () => {
    if (!client) return;

    // Pobierz ostatnie 10 wizyt
    setEventsLoading(true);
    try {
      const eventsResponse = await backend.event.list();
      const clientEvents = eventsResponse.events
        ?.filter(event => 
          event.firstName === client.firstName && 
          event.lastName === client.lastName
        )
        .slice(0, 10) || [];
      setEvents(clientEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setEventsLoading(false);
    }

    // Pobierz ostatnie 10 SMS-ów
    setSmsLoading(true);
    try {
      const smsResponse = await backend.sms.history();
      const clientSms = smsResponse.smsHistory
        ?.filter(sms => sms.phone === client.phone)
        .slice(0, 10) || [];
      setSmsHistory(clientSms);
    } catch (error) {
      console.error('Error fetching SMS history:', error);
    } finally {
      setSmsLoading(false);
    }
  };

  const startEditing = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue || '');
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditValue('');
  };

  const saveField = async () => {
    if (!client || !editingField) return;

    setLoading(true);
    try {
      // TODO: Implement backend.client.update endpoint
      const updatedClient = {
        ...client,
        [editingField]: editValue
      };
      
      // Update local state
      onClientUpdate(updatedClient);
      
      // TODO: Call API to update client
      // await backend.client.update(client.id, { [editingField]: editValue });
      
      setEditingField(null);
      setEditValue('');
    } catch (error) {
      console.error('Error updating client:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price: number) => {
    return `${price.toFixed(2)} zł`;
  };

  if (!isOpen || !client) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold">
              {client.firstName} {client.lastName}
            </h2>
            <p className="text-muted-foreground">
              Szczegóły klienta
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Column - Client Details */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Edit3 className="h-5 w-5" />
                    Dane osobowe
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Phone */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Telefon
                    </label>
                    {editingField === 'phone' ? (
                      <div className="flex gap-2">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          placeholder="+48 123 456 789"
                        />
                        <Button size="sm" onClick={saveField} disabled={loading}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEditing}>
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="flex items-center justify-between p-2 border rounded hover:bg-muted cursor-pointer"
                        onClick={() => startEditing('phone', client.phone || '')}
                      >
                        <span>{client.phone || 'Brak numeru'}</span>
                        <Edit3 className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </label>
                    {editingField === 'email' ? (
                      <div className="flex gap-2">
                        <Input
                          type="email"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          placeholder="email@example.com"
                        />
                        <Button size="sm" onClick={saveField} disabled={loading}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEditing}>
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="flex items-center justify-between p-2 border rounded hover:bg-muted cursor-pointer"
                        onClick={() => startEditing('email', client.email || '')}
                      >
                        <span>{client.email || 'Brak email'}</span>
                        <Edit3 className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Instagram */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Instagram className="h-4 w-4" />
                      Instagram
                    </label>
                    {editingField === 'instagram' ? (
                      <div className="flex gap-2">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          placeholder="@username"
                        />
                        <Button size="sm" onClick={saveField} disabled={loading}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEditing}>
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="flex items-center justify-between p-2 border rounded hover:bg-muted cursor-pointer"
                        onClick={() => startEditing('instagram', client.instagram || '')}
                      >
                        <span>{client.instagram ? `@${client.instagram}` : 'Brak Instagram'}</span>
                        <Edit3 className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Messenger */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Messenger
                    </label>
                    {editingField === 'messenger' ? (
                      <div className="flex gap-2">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          placeholder="Messenger username"
                        />
                        <Button size="sm" onClick={saveField} disabled={loading}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEditing}>
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="flex items-center justify-between p-2 border rounded hover:bg-muted cursor-pointer"
                        onClick={() => startEditing('messenger', client.messenger || '')}
                      >
                        <span>{client.messenger || 'Brak Messenger'}</span>
                        <Edit3 className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - History */}
            <div className="space-y-6">
              
              {/* Events History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Ostatnie wizyty (10)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {eventsLoading ? (
                    <div className="text-center py-4">Ładowanie wizyt...</div>
                  ) : events.length > 0 ? (
                    <div className="space-y-3">
                      {events.map((event) => (
                        <div key={event.id} className="flex justify-between items-center p-3 border rounded">
                          <div>
                            <div className="font-medium">{event.service}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(event.eventTime)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatPrice(event.price)}</div>
                            <Badge variant="outline" className="text-xs">
                              {event.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      Brak wizyt
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* SMS History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Ostatnie SMS-y (10)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {smsLoading ? (
                    <div className="text-center py-4">Ładowanie SMS-ów...</div>
                  ) : smsHistory.length > 0 ? (
                    <div className="space-y-3">
                      {smsHistory.map((sms) => (
                        <div key={sms.id} className="p-3 border rounded">
                          <div className="flex justify-between items-start mb-2">
                            <div className="text-sm text-muted-foreground">
                              {formatDate(sms.sentAt)}
                            </div>
                            <Badge 
                              variant={sms.status === 'sent' ? 'default' : 'destructive'}
                              className="text-xs"
                            >
                              {sms.status}
                            </Badge>
                          </div>
                          <div className="text-sm">
                            {sms.message.length > 100 
                              ? `${sms.message.substring(0, 100)}...` 
                              : sms.message
                            }
                          </div>
                          {sms.templateCode && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Szablon: {sms.templateCode}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      Brak SMS-ów
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Zamknij
          </Button>
        </div>
      </div>
    </div>
  );
}