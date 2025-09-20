import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
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
  X as XIcon,
  Loader2
} from 'lucide-react';
import backend from '~backend/client';
import type { Client } from '~backend/client/list';
import type { Event } from '~backend/event/list';
import type { SMSHistoryItem } from '~backend/sms/history';

interface ClientDetailModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onClientUpdate: (updatedClient: Client) => void;
}

type DepositStatus = "zapłacony" | "niezapłacony" | "nie dotyczy";

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
  const [smsHistory, setSmsHistory] = useState<SMSHistoryItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { toast } = useToast();

  // Event editing state
  const [editingEvent, setEditingEvent] = useState<number | null>(null);
  const [editingEventField, setEditingEventField] = useState<string | null>(null);
  const [eventEditValue, setEventEditValue] = useState('');
  const [eventLoading, setEventLoading] = useState(false);

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
      const smsResponse = await backend.sms.getSMSHistory();
      const clientSms = smsResponse.history
        ?.filter(sms => sms.phone === client.phone)
        .slice(0, 10) || [];
      setSmsHistory(clientSms);
    } catch (error) {
      console.error('Error fetching SMS history:', error);
    } finally {
      setSmsLoading(false);
    }
  };

  // Client editing functions with enhanced validation
  const validateField = (field: string, value: string): string | null => {
    if (!value.trim()) return null; // Allow empty values
    
    switch (field) {
      case 'phone':
        // Polish phone number validation
        const phoneRegex = /^(\+48|48)?[\s-]?[0-9]{3}[\s-]?[0-9]{3}[\s-]?[0-9]{3}$/;
        if (!phoneRegex.test(value)) {
          return 'Nieprawidłowy format numeru telefonu (np. +48 123 456 789)';
        }
        break;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return 'Nieprawidłowy format adresu email';
        }
        break;
      case 'instagram':
        const instaRegex = /^[a-zA-Z0-9._]{1,30}$/;
        if (!instaRegex.test(value)) {
          return 'Instagram może zawierać tylko litery, cyfry, kropki i podkreślenia (max 30 znaków)';
        }
        break;
    }
    return null;
  };
  
  const startEditing = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue || '');
    setValidationError(null);
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditValue('');
    setValidationError(null);
  };

  const saveField = async () => {
    if (!client || !editingField) return;

    // Validate field
    const error = validateField(editingField, editValue);
    if (error) {
      setValidationError(error);
      toast({
        title: "Błąd walidacji",
        description: error,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await backend.client.update({
        id: client.id,
        [editingField]: editValue.trim()
      });
      
      // Update local state with merged data
      const updatedClientWithMissingFields = {
        ...client,
        ...response.client
      };
      onClientUpdate(updatedClientWithMissingFields);
      
      toast({
        title: "Sukces",
        description: "Dane klienta zostały zaktualizowane"
      });
      
      setEditingField(null);
      setEditValue('');
      setValidationError(null);
      
    } catch (error: any) {
      console.error('Error updating client:', error);
      
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się zaktualizować danych klienta",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Event editing functions
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
      
      if (editingEventField === 'price' || editingEventField === 'depositAmount') {
        updateData[editingEventField] = parseInt(eventEditValue) || 0;
      } else {
        updateData[editingEventField] = eventEditValue;
      }

      const response = await backend.event.update(updateData);
      
      // Update events list
      setEvents(prevEvents => 
        prevEvents.map(event => 
          event.id === editingEvent ? { ...event, ...response.event } : event
        )
      );
      
      toast({
        title: "Sukces",
        description: "Dane wizyty zostały zaktualizowane"
      });
      
      setEditingEvent(null);
      setEditingEventField(null);
      setEventEditValue('');
      
    } catch (error: any) {
      console.error('Error updating event:', error);
      
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się zaktualizować danych wizyty",
        variant: "destructive"
      });
    } finally {
      setEventLoading(false);
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
    return `${price} zł`;
  };

  const getDepositStatusColor = (status: string) => {
    switch (status) {
      case 'zapłacony': return 'bg-green-100 text-green-800';
      case 'niezapłacony': return 'bg-red-100 text-red-800';
      case 'nie dotyczy': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
                        <div className="flex-1">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="+48 123 456 789"
                            disabled={loading}
                            className={validationError && editingField === 'phone' ? 'border-red-500' : ''}
                          />
                          {validationError && editingField === 'phone' && (
                            <p className="text-xs text-red-500 mt-1">{validationError}</p>
                          )}
                        </div>
                        <Button 
                          size="sm" 
                          onClick={saveField} 
                          disabled={loading}
                        >
                          {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={cancelEditing}
                          disabled={loading}
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="flex items-center justify-between p-2 border rounded hover:bg-muted cursor-pointer transition-colors"
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
                        <div className="flex-1">
                          <Input
                            type="email"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="email@example.com"
                            disabled={loading}
                            className={validationError && editingField === 'email' ? 'border-red-500' : ''}
                          />
                          {validationError && editingField === 'email' && (
                            <p className="text-xs text-red-500 mt-1">{validationError}</p>
                          )}
                        </div>
                        <Button 
                          size="sm" 
                          onClick={saveField} 
                          disabled={loading}
                        >
                          {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={cancelEditing}
                          disabled={loading}
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="flex items-center justify-between p-2 border rounded hover:bg-muted cursor-pointer transition-colors"
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
                        <div className="flex-1">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="username (bez @)"
                            disabled={loading}
                            className={validationError && editingField === 'instagram' ? 'border-red-500' : ''}
                          />
                          {validationError && editingField === 'instagram' && (
                            <p className="text-xs text-red-500 mt-1">{validationError}</p>
                          )}
                        </div>
                        <Button 
                          size="sm" 
                          onClick={saveField} 
                          disabled={loading}
                        >
                          {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={cancelEditing}
                          disabled={loading}
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="flex items-center justify-between p-2 border rounded hover:bg-muted cursor-pointer transition-colors"
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
                        <div className="flex-1">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="Messenger username"
                            disabled={loading}
                            className={validationError && editingField === 'messenger' ? 'border-red-500' : ''}
                          />
                          {validationError && editingField === 'messenger' && (
                            <p className="text-xs text-red-500 mt-1">{validationError}</p>
                          )}
                        </div>
                        <Button 
                          size="sm" 
                          onClick={saveField} 
                          disabled={loading}
                        >
                          {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={cancelEditing}
                          disabled={loading}
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="flex items-center justify-between p-2 border rounded hover:bg-muted cursor-pointer transition-colors"
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
                        <div key={event.id} className="p-3 border rounded">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-medium">{event.service}</div>
                              <div className="text-sm text-muted-foreground">
                                {formatDate(event.eventTime)}
                              </div>
                            </div>
                          </div>
                          
                          {/* Editable Fields */}
                          <div className="space-y-2">
                            {/* Price */}
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">Cena:</span>
                              {editingEvent === event.id && editingEventField === 'price' ? (
                                <div className="flex gap-2">
                                  <Input
                                    type="number"
                                    value={eventEditValue}
                                    onChange={(e) => setEventEditValue(e.target.value)}
                                    placeholder="0"
                                    className="w-20"
                                    disabled={eventLoading}
                                  />
                                  <span className="text-sm">zł</span>
                                  <Button 
                                    size="sm" 
                                    onClick={saveEventField} 
                                    disabled={eventLoading}
                                  >
                                    {eventLoading ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Save className="h-3 w-3" />
                                    )}
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={cancelEditingEvent}
                                    disabled={eventLoading}
                                  >
                                    <XIcon className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div 
                                  className="flex items-center gap-2 cursor-pointer hover:bg-muted p-1 rounded"
                                  onClick={() => startEditingEvent(event.id, 'price', event.price)}
                                >
                                  <span className="text-sm">{formatPrice(event.price)}</span>
                                  <Edit3 className="h-3 w-3 text-muted-foreground" />
                                </div>
                              )}
                            </div>

                            {/* Deposit Amount */}
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">Zadatek:</span>
                              {editingEvent === event.id && editingEventField === 'depositAmount' ? (
                                <div className="flex gap-2">
                                  <Input
                                    type="number"
                                    value={eventEditValue}
                                    onChange={(e) => setEventEditValue(e.target.value)}
                                    placeholder="0"
                                    className="w-20"
                                    disabled={eventLoading}
                                  />
                                  <span className="text-sm">zł</span>
                                  <Button 
                                    size="sm" 
                                    onClick={saveEventField} 
                                    disabled={eventLoading}
                                  >
                                    {eventLoading ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Save className="h-3 w-3" />
                                    )}
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={cancelEditingEvent}
                                    disabled={eventLoading}
                                  >
                                    <XIcon className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div 
                                  className="flex items-center gap-2 cursor-pointer hover:bg-muted p-1 rounded"
                                  onClick={() => startEditingEvent(event.id, 'depositAmount', event.depositAmount || 0)}
                                >
                                  <span className="text-sm">{formatPrice(event.depositAmount || 0)}</span>
                                  <Edit3 className="h-3 w-3 text-muted-foreground" />
                                </div>
                              )}
                            </div>

                            {/* Deposit Status */}
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">Status zadatku:</span>
                              {editingEvent === event.id && editingEventField === 'depositStatus' ? (
                                <div className="flex gap-2">
                                  <Select value={eventEditValue} onValueChange={setEventEditValue}>
                                    <SelectTrigger className="w-32">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="zapłacony">Zapłacony</SelectItem>
                                      <SelectItem value="niezapłacony">Niezapłacony</SelectItem>
                                      <SelectItem value="nie dotyczy">Nie dotyczy</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button 
                                    size="sm" 
                                    onClick={saveEventField} 
                                    disabled={eventLoading}
                                  >
                                    {eventLoading ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Save className="h-3 w-3" />
                                    )}
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={cancelEditingEvent}
                                    disabled={eventLoading}
                                  >
                                    <XIcon className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div 
                                  className="flex items-center gap-2 cursor-pointer hover:bg-muted p-1 rounded"
                                  onClick={() => startEditingEvent(event.id, 'depositStatus', event.depositStatus)}
                                >
                                  <Badge className={getDepositStatusColor(event.depositStatus)}>
                                    {event.depositStatus}
                                  </Badge>
                                  <Edit3 className="h-3 w-3 text-muted-foreground" />
                                </div>
                              )}
                            </div>
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
                          {sms.templateType && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Szablon: {sms.templateType}
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