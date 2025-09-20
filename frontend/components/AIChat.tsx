import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2, Calendar, MessageSquare, Trash2, Edit, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import backend from '~backend/client';
import { useAppContext } from '../contexts/AppContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIAction {
  type: 'create_event' | 'edit_client' | 'generate_sms' | 'schedule_reminder';
  data: any;
  description: string;
}

export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { refreshTrigger } = useAppContext();

  // Initialize userId from localStorage
  useEffect(() => {
    // Pobierz userId z localStorage lub wygeneruj nowy
    let storedUserId = localStorage.getItem('leap_user_id');
    if (!storedUserId) {
      storedUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('leap_user_id', storedUserId);
    }
    setUserId(storedUserId);
  }, []);

  // Przewiń do ostatniej wiadomości
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Załaduj sesję przy pierwszym otwarciu
  useEffect(() => {
    if (isOpen && sessionId && messages.length === 0) {
      loadSession();
    }
  }, [isOpen, sessionId]);

  // Załaduj sugestie przy otwarciu (tylko gdy userId jest dostępny)
  useEffect(() => {
    if (isOpen && messages.length === 0 && userId) {
      loadSuggestions();
    }
  }, [isOpen, userId]);

  // Refresh suggestions when data changes
  useEffect(() => {
    if (isOpen && userId && refreshTrigger > 0) {
      loadSuggestions();
    }
  }, [refreshTrigger, isOpen, userId]);

  const loadSuggestions = async () => {
    try {
      const prefs = await backend.ai.getUserPreferences({ userId });
      const quickSuggestions = [
        'Pokaż dzisiejsze wizyty',
        'Ile zarobiliśmy w tym tygodniu?',
        'Sprawdź niepłacone zadatki',
        'Kto ma wizytę jutro?'
      ];
      
      if (prefs.preferences.commonServices.length > 0) {
        quickSuggestions.push(`Dodaj wizytę ${prefs.preferences.commonServices[0]}`);
      }
      
      setSuggestions(quickSuggestions);
    } catch (error) {
      console.error('Błąd ładowania sugestii:', error);
    }
  };

  const loadSession = async () => {
    if (!sessionId) return;

    try {
      const response = await backend.ai.getSession({ sessionId });
      if (response.session && response.session.messages) {
        setMessages(response.session.messages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      }
    } catch (error) {
      console.error('Błąd ładowania sesji:', error);
    }
  };

  const saveMessage = async (role: 'user' | 'assistant', content: string) => {
    const currentSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (!sessionId) {
      setSessionId(currentSessionId);
    }

    try {
      // TODO: Implement saveMessage endpoint when AI tables are ready
      console.log('💾 AI: Would save message:', { sessionId: currentSessionId, userId, role, content });
    } catch (error) {
      console.error('Błąd zapisywania wiadomości:', error);
    }
  };

  const logInteraction = async (action: string, feedback?: 'positive' | 'negative', context?: any) => {
    try {
      await backend.ai.logUserInteraction({
        sessionId: sessionId || 'temp',
        userId,
        action,
        feedback,
        context
      });
    } catch (error) {
      console.error('Błąd logowania interakcji:', error);
    }
  };

  const handleAIActions = async (response: string) => {
    // Wykryj akcje w odpowiedzi AI
    const actionMatch = response.match(/AKCJA:\s*([A-Z_]+)\s*(\d+)?(?:\s+(.+))?/);
    if (!actionMatch) return;

    const [, actionType, id, params] = actionMatch;
    
    try {
      switch (actionType) {
        case 'DELETE_EVENT':
          if (id) {
            const result = await backend.ai.deleteEvent({
              id: parseInt(id),
              userId
            });
            
            const resultMessage: ChatMessage = {
              id: `msg_${Date.now()}_system`,
              role: 'assistant',
              content: result.success ? `✅ ${result.message}` : `❌ ${result.message}`,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, resultMessage]);
            await logInteraction('delete_event', result.success ? 'positive' : 'negative', { eventId: id });
          }
          break;

        case 'DELETE_CLIENT':
          if (id) {
            const result = await backend.ai.deleteClient({
              id: parseInt(id),
              userId
            });
            
            const resultMessage: ChatMessage = {
              id: `msg_${Date.now()}_system`,
              role: 'assistant',
              content: result.success ? `✅ ${result.message}` : `❌ ${result.message}`,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, resultMessage]);
            await logInteraction('delete_client', result.success ? 'positive' : 'negative', { clientId: id });
          }
          break;

        case 'UPDATE_DEPOSIT':
          if (id && params) {
            const status = params.trim() as 'zapłacony' | 'niezapłacony' | 'nie dotyczy';
            const result = await backend.ai.updateDepositStatus({
              id: parseInt(id),
              depositStatus: status,
              userId
            });
            
            const resultMessage: ChatMessage = {
              id: `msg_${Date.now()}_system`,
              role: 'assistant',
              content: result.success ? `✅ ${result.message}` : `❌ ${result.message}`,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, resultMessage]);
            await logInteraction('update_deposit', result.success ? 'positive' : 'negative', { eventId: id, status });
          }
          break;

        case 'MOVE_EVENT':
          if (id && params) {
            const result = await backend.ai.moveEvent({
              id: parseInt(id),
              newEventTime: params.trim(),
              userId
            });
            
            const resultMessage: ChatMessage = {
              id: `msg_${Date.now()}_system`,
              role: 'assistant',
              content: result.success ? `✅ ${result.message}` : `❌ ${result.message}`,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, resultMessage]);
            await logInteraction('move_event', result.success ? 'positive' : 'negative', { eventId: id, newTime: params });
          }
          break;
      }
    } catch (error) {
      console.error('Błąd wykonywania akcji AI:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się wykonać akcji",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputMessage;
    if (!textToSend.trim() || isLoading || !userId) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    await saveMessage('user', textToSend);
    await logInteraction('send_message', undefined, { message: textToSend });
    
    if (!messageText) setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const currentSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await backend.ai.chat({
        message: textToSend,
        sessionId: currentSessionId,
        userId
      });

      if (!sessionId) {
        setSessionId(response.sessionId);
      }

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: response.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      await saveMessage('assistant', response.response);
      await logInteraction('receive_response', 'positive', { response: response.response });

      // Sprawdź czy odpowiedź zawiera akcje do wykonania
      await handleAIActions(response.response);

      // Obsłuż akcje jeśli są dostępne
      if (response.actions && response.actions.length > 0) {
        console.log('Dostępne akcje AI:', response.actions);
        await logInteraction('ai_actions_available', undefined, { actions: response.actions });
      }

    } catch (error) {
      console.error('Błąd wysyłania wiadomości:', error);
      await logInteraction('send_message_error', 'negative', { error: (error as Error).message });
      toast({
        title: "Błąd",
        description: "Nie udało się wysłać wiadomości do AI",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const QuickActionButtons = () => (
    <div className="flex flex-wrap gap-2 mb-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => sendMessage('Umów nową wizytę')}
        className="text-xs"
      >
        <Calendar className="h-3 w-3 mr-1" />
        Umów wizytę
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => sendMessage('Pokaż niepłacone zadatki')}
        className="text-xs"
      >
        <Clock className="h-3 w-3 mr-1" />
        Zadatki
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => sendMessage('Wyślij SMS przypomnienie')}
        className="text-xs"
      >
        <MessageSquare className="h-3 w-3 mr-1" />
        Wyślij SMS
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => sendMessage('Pokaż dzisiejsze wizyty')}
        className="text-xs"
      >
        <Users className="h-3 w-3 mr-1" />
        Dzisiejsze wizyty
      </Button>
    </div>
  );

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pl-PL', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 z-50"
        size="icon"
      >
        <Bot className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[500px] shadow-xl z-50 flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg">AI Asystent</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Przyciski szybkich akcji */}
        {messages.length === 0 && userId && (
          <div className="p-4 border-b">
            <QuickActionButtons />
          </div>
        )}
        
        {/* Obszar wiadomości */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!userId ? (
            <div className="text-center text-muted-foreground text-sm space-y-2">
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              <p>Inicjalizuję sesję użytkownika...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm space-y-2">
              <p>Witaj! Jestem AI asystentem studia tatuażu.</p>
              <p>Wybierz jedną z szybkich akcji lub napisz do mnie!</p>
              {suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1 justify-center mt-3">
                  {suggestions.slice(0, 3).map((suggestion, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer text-xs"
                      onClick={() => sendMessage(suggestion)}
                    >
                      {suggestion}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ) : null}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-muted text-foreground'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-muted-foreground'
                }`}>
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-3 py-2 text-sm flex items-center space-x-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-xs text-muted-foreground">AI pisze...</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Pole wprowadzania */}
        <div className="border-t p-4">
          <div className="flex space-x-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={!userId ? "Inicjalizuję..." : "Napisz wiadomość..."}
              disabled={isLoading || !userId}
              className="flex-1"
            />
            <Button
              onClick={() => sendMessage()}
              disabled={!inputMessage.trim() || isLoading || !userId}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}