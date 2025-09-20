import React, { useState, useEffect } from 'react';
import { X, Phone, Mail, Instagram, MessageCircle, Edit3, Save, Calendar, DollarSign, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import backend from '~backend/client';
import type { Client } from '~backend/client/list';
import type { Event } from '~backend/event/list';
import type { SMSHistoryItem } from '~backend/sms/history';

interface ClientDetailModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ClientDetailModal({ client, isOpen, onClose }: ClientDetailModalProps) {
  const [clientData, setClientData] = useState<Client | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [smsHistory, setSmsHistory] = useState<SMSHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Client editing states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editStatus, setEditStatus] = useState<string>('');

  // Event editing states
  const [editingEvent, setEditingEvent] = useState<number | null>(null);
  const [editingEventField, setEditingEventField] = useState<string | null>(null);
  const [eventEditValue, setEventEditValue] = useState('');
  const [eventLoading, setEventLoading] = useState(false);

  useEffect(() => {
    if (client && isOpen) {
      setClientData(client);
      fetchClientHistory();
    }
  }, [client, isOpen]);

  const fetchClientHistory = async () => {
    if (!client) return;
    
    setLoading(true);
    try {
      // Fetch events
      const eventsResponse = await backend.event.list();
      const clientEvents = eventsResponse.events.filter(event => 
        event.clientId === client.id
      ).slice(0, 10);
      setEvents(clientEvents);

      // Fetch SMS history
      const smsResponse = await backend.sms.getSMSHistory();
      const clientSms = smsResponse.history.filter(sms => 
        sms.clientId === client.id
      ).slice(0, 10);
      setSmsHistory(clientSms);
    } catch (error) {
      console.error('Error fetching client history:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować historii klienta",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue || '');
    setEditStatus('');
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditValue('');
    setEditStatus('');
  };

  const saveField = async () => {
    if (!clientData || !editingField) return;

    setSaving(true);
    try {
      const updateData: any = { id: clientData.id };
      
      switch (editingField) {
        case 'phone':
          if (editValue && !/^(\+48|48)?[0-9]{9}$/.test(editValue.replace(/[\s-]/g, ''))) {
            setEditStatus('error');
            toast({
              title: "Błąd walidacji",
              description: "Nieprawidłowy format numeru telefonu",
              variant: "destructive",
            });
            return;
          }
          updateData.phone = editValue;
          break;
        case 'email':
          if (editValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editValue)) {
            setEditStatus('error');
            toast({
              title: "Błąd walidacji",
              description: "Nieprawidłowy format adresu email",
              variant: "destructive",
            });
            return;
          }
          updateData.email = editValue;
          break;
        case 'instagram':
          if (editValue && !/^[a-zA-Z0-9._]+$/.test(editValue)) {
            setEditStatus('error');
            toast({
              title: "Błąd walidacji",
              description: "Instagram może zawierać tylko litery, cyfry, kropki i podkreślenia",
              variant: "destructive",
            });
            return;
          }
          updateData.instagram = editValue;
          break;
        case 'messenger':
          updateData.messenger = editValue;
          break;
      }

      const response = await backend.client.update(updateData);
      
      // Convert Date to string to match Client interface
      const updatedClient = {
        ...response.client,
        birthDate: response.client.birthDate?.toISOString().split('T')[0]
      };
      setClientData(updatedClient);
      setEditStatus('success');
      
      toast({
        title: "Sukces",
        description: "Dane klienta zostały zaktualizowane",
      });

      setTimeout(() => {
        cancelEditing();
      }, 1000);

    } catch (error) {
      console.error('Error updating client:', error);
      setEditStatus('error');
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować danych klienta",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const startEditingEvent = (eventId: number, field: string, currentValue: any) => {
    setEditingEvent(eventId);
    setEditingEventField(field);
    setEventEditValue(currentValue?.toString() || '');
  };

  const cancelEditingEvent = () => {
    setEditingEvent(null);
    setEditingEventField(null);
    setEventEditValue('');
  };

  const saveEventField = async () => {
    if (!editingEvent || !editingEventField) return;

    setEventLoading(true);
    try {
      const updateData: any = { id: editingEvent };
      
      switch (editingEventField) {
        case 'price':
          const price = parseInt(eventEditValue);
          if (isNaN(price) || price < 0) {
            toast({
              title: "Błąd walidacji",
              description: "Cena musi być liczbą całkowitą ≥ 0",
              variant: "destructive",
            });
            return;
          }
          updateData.price = price;
          break;
        case 'depositAmount':
          const depositAmount = parseInt(eventEditValue);
          if (isNaN(depositAmount) || depositAmount < 0) {
            toast({
              title: "Błąd walidacji",
              description: "Kwota zadatku musi być liczbą całkowitą ≥ 0",
              variant: "destructive",
            });
            return;
          }
          const currentEvent = events.find(e => e.id === editingEvent);
          if (currentEvent && depositAmount > currentEvent.price) {
            toast({
              title: "Błąd walidacji",
              description: "Kwota zadatku nie może być większa od ceny wizyty",
              variant: "destructive",
            });
            return;
          }
          updateData.depositAmount = depositAmount;
          break;
        case 'depositStatus':
          if (!['zapłacony', 'niezapłacony', 'nie dotyczy'].includes(eventEditValue)) {
            toast({
              title: "Błąd walidacji",
              description: "Nieprawidłowy status płatności",
              variant: "destructive",
            });
            return;
          }
          updateData.depositStatus = eventEditValue;
          break;
      }

      const response = await backend.event.update(updateData);
      
      setEvents(events.map(event => 
        event.id === editingEvent 
          ? { ...event, ...response.event }
          : event
      ));
      
      toast({
        title: "Sukces",
        description: "Dane wizyty zostały zaktualizowane",
      });

      setTimeout(() => {
        cancelEditingEvent();
      }, 1000);

    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować danych wizyty",
        variant: "destructive",
      });
    } finally {
      setEventLoading(false);
    }
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price: number) => {
    return `${price} zł`;
  };

  if (!isOpen || !clientData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold">
            📁 {clientData.firstName} {clientData.lastName}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <div className="space-y-6">
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Edit3 className="h-4 w-4" />
                    Dane osobowe
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      {editingField === 'phone' ? (
                        <div className="flex gap-2">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="Numer telefonu"
                            className={editStatus === 'error' ? 'border-red-500' : ''}
                          />
                          <Button size="sm" onClick={saveField} disabled={saving}>
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEditing}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="cursor-pointer hover:bg-muted p-2 rounded"
                          onClick={() => startEditing('phone', clientData.phone || '')}
                        >
                          {clientData.phone || 'Brak numeru'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      {editingField === 'email' ? (
                        <div className="flex gap-2">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="Adres email"
                            className={editStatus === 'error' ? 'border-red-500' : ''}
                          />
                          <Button size="sm" onClick={saveField} disabled={saving}>
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEditing}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="cursor-pointer hover:bg-muted p-2 rounded"
                          onClick={() => startEditing('email', clientData.email || '')}
                        >
                          {clientData.email || 'Brak email'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Instagram className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      {editingField === 'instagram' ? (
                        <div className="flex gap-2">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="Instagram"
                            className={editStatus === 'error' ? 'border-red-500' : ''}
                          />
                          <Button size="sm" onClick={saveField} disabled={saving}>
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEditing}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="cursor-pointer hover:bg-muted p-2 rounded"
                          onClick={() => startEditing('instagram', clientData.instagram || '')}
                        >
                          {clientData.instagram || 'Brak Instagram'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      {editingField === 'messenger' ? (
                        <div className="flex gap-2">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="Messenger"
                            className={editStatus === 'error' ? 'border-red-500' : ''}
                          />
                          <Button size="sm" onClick={saveField} disabled={saving}>
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEditing}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="cursor-pointer hover:bg-muted p-2 rounded"
                          onClick={() => startEditing('messenger', clientData.messenger || '')}
                        >
                          {clientData.messenger || 'Brak Messenger'}
                        </div>
                      )}
                    </div>
                  </div>

                  {clientData.birthDate && (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(clientData.birthDate)}</span>
                    </div>
                  )}

                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Informacje systemowe</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm">
                    <strong>Utworzony:</strong> {formatDate(clientData.createdAt)}
                  </p>
                  <p className="text-sm">
                    <strong>Utworzony przez:</strong> {clientData.createdBy}
                  </p>
                  <p className="text-sm">
                    <strong>Ostatnia aktualizacja:</strong> {formatDate(clientData.updatedAt)}
                  </p>
                </CardContent>
              </Card>

            </div>

            <div className="space-y-6">
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Ostatnie wizyty
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-center text-muted-foreground">Ładowanie wizyt...</p>
                  ) : events.length === 0 ? (
                    <p className="text-center text-muted-foreground">Brak wizyt</p>
                  ) : (
                    <div className="space-y-3">
                      {events.map((event) => (
                        <div key={event.id} className="border rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium">{event.service}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(event.eventTime)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {editingEvent === event.id && editingEventField === 'depositStatus' ? (
                                <div className="flex gap-1">
                                  <Select value={eventEditValue} onValueChange={setEventEditValue}>
                                    <SelectTrigger className="w-32 h-6 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="zapłacony">Zapłacony</SelectItem>
                                      <SelectItem value="niezapłacony">Niezapłacony</SelectItem>
                                      <SelectItem value="nie dotyczy">Nie dotyczy</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button size="sm" onClick={saveEventField} disabled={eventLoading}>
                                    <Save className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={cancelEditingEvent}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <Badge 
                                  variant="outline" 
                                  className="text-xs cursor-pointer hover:bg-muted"
                                  onClick={() => startEditingEvent(event.id, 'depositStatus', event.depositStatus)}
                                >
                                  {event.depositStatus}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-3 w-3" />
                              {editingEvent === event.id && editingEventField === 'price' ? (
                                <div className="flex gap-1">
                                  <Input
                                    value={eventEditValue}
                                    onChange={(e) => setEventEditValue(e.target.value)}
                                    placeholder="Cena"
                                    className="w-20 h-6 text-xs"
                                  />
                                  <Button size="sm" onClick={saveEventField} disabled={eventLoading}>
                                    <Save className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={cancelEditingEvent}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <span 
                                  className="text-sm cursor-pointer hover:bg-muted p-1 rounded"
                                  onClick={() => startEditingEvent(event.id, 'price', event.price)}
                                >
                                  {formatPrice(event.price)}
                                </span>
                              )}
                            </div>
                            {event.depositAmount && (
                              <div className="text-sm text-muted-foreground">
                                {editingEvent === event.id && editingEventField === 'depositAmount' ? (
                                  <div className="flex gap-1">
                                    <Input
                                      value={eventEditValue}
                                      onChange={(e) => setEventEditValue(e.target.value)}
                                      placeholder="Zadatek"
                                      className="w-20 h-6 text-xs"
                                    />
                                    <Button size="sm" onClick={saveEventField} disabled={eventLoading}>
                                      <Save className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={cancelEditingEvent}>
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span 
                                    className="cursor-pointer hover:bg-muted p-1 rounded"
                                    onClick={() => startEditingEvent(event.id, 'depositAmount', event.depositAmount)}
                                  >
                                    Zadatek: {formatPrice(event.depositAmount)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Ostatnie SMS-y
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-center text-muted-foreground">Ładowanie SMS-ów...</p>
                  ) : smsHistory.length === 0 ? (
                    <p className="text-center text-muted-foreground">Brak SMS-ów</p>
                  ) : (
                    <div className="space-y-3">
                      {smsHistory.map((sms) => (
                        <div key={sms.id} className="border rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-sm font-medium">{sms.templateType}</p>
                            <Badge variant="outline" className="text-xs">
                              {sms.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {formatDate(sms.sentAt)}
                          </p>
                          <p className="text-sm">{sms.content || sms.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          </div>
        </div>

        <div className="flex justify-end p-6 border-t">
          <Button onClick={onClose}>
            Zamknij
          </Button>
        </div>
      </div>
    </div>
  );
}