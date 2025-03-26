// Chatbot.tsx
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button, Card, Form, InputGroup, Spinner, Modal } from 'react-bootstrap';
import { ChatDotsFill, XLg, Dash, Send, Plus, Trash, List, ArrowLeft, PencilFill } from 'react-bootstrap-icons';
import styles from '@/styles/Chatbot.module.css';
import { createClient } from "@/utils/supabase/client";

// Define message interface
interface ChatMessage {
  text: string;
  sender: 'user' | 'bot';
}

// Define chat session interface
interface ChatSession {
  id: string;
  name: string;
  messages: ChatMessage[];
}

const Chatbot: React.FC = () => {
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [sessions, setSessions] = useState<ChatSession[]>([
    {
      id: 'default-session',
      name: 'New Chat',
      messages: [{ text: "Hi there! I'm your SkillMart assistant. How can I help you today?", sender: 'bot' }]
    }
  ]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('default-session');
  const [inputValue, setInputValue] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [showSessionManager, setShowSessionManager] = useState<boolean>(false);
  const [newSessionName, setNewSessionName] = useState<string>('');
  const [editSessionId, setEditSessionId] = useState<string | null>(null);
  const [editSessionName, setEditSessionName] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Get current session
  const currentSession = sessions.find(session => session.id === currentSessionId) || sessions[0] || null;

  // Load chat sessions from database
  useEffect(() => {
    const loadChatSessions = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // If user is not logged in, just use local session
        if (!session) return;
        
        const { data: dbSessions, error } = await supabase
          .from('chat_sessions')
          .select('id, name')
          .order('updated_at', { ascending: false });
        
        if (error) throw error;
        
        if (dbSessions && dbSessions.length > 0) {
          // For each session, fetch its messages
          const sessionsWithMessages = await Promise.all(dbSessions.map(async (dbSession) => {
            const { data: messages } = await supabase
              .from('chat_messages')
              .select('sender, text')
              .eq('session_id', dbSession.id)
              .order('created_at', { ascending: true });
              
            return {
              id: dbSession.id,
              name: dbSession.name,
              messages: messages?.map(msg => ({
                text: msg.text,
                sender: msg.sender as 'user' | 'bot'
              })) || [{ text: "Hi there! I'm your SkillMart assistant. How can I help you today?", sender: 'bot' }]
            };
          }));
          
          // If we have sessions from the database, use them
          if (sessionsWithMessages.length > 0) {
            setSessions(sessionsWithMessages);
            setCurrentSessionId(sessionsWithMessages[0].id);
          }
        }
      } catch (error) {
        console.error('Error loading chat sessions:', error);
        // Keep using default session if there's an error
      }
    };
    
    loadChatSessions();
  }, [supabase]);

  const toggleChatbot = (): void => {
    setIsOpen(!isOpen);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setInputValue(e.target.value);
  };

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages]);

  const simulateBotReply = async (userMessage: string): Promise<void> => {
    setIsTyping(true);
    
    try {
      // Call the API with the message and session history
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          sessionId: currentSessionId,
          sessionHistory: currentSession?.messages || []
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }
      
      // Update session ID if it changed (new session created in DB)
      if (data.sessionId && data.sessionId !== currentSessionId && currentSessionId.startsWith('session-')) {
        setCurrentSessionId(data.sessionId);
      }
      
      // Update the session with bot response
      setSessions(prevSessions => 
        prevSessions.map(session => 
          session.id === currentSessionId 
            ? {
                ...session,
                messages: [...session.messages, { text: data.response, sender: 'bot' }]
              }
            : session
        )
      );
    } catch (error) {
      console.error('Error getting bot response:', error);
      
      // Fallback response in case of error
      setSessions(prevSessions => 
        prevSessions.map(session => 
          session.id === currentSessionId 
            ? {
                ...session,
                messages: [...session.messages, { 
                  text: "Sorry, I'm having trouble connecting right now. Please try again later.", 
                  sender: 'bot' 
                }]
              }
            : session
        )
      );
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent): void => {
    e.preventDefault();
    if (inputValue.trim() === '') return;
    
    const newUserMessage: ChatMessage = { text: inputValue, sender: 'user' };
    
    // Update the current session with the new message
    setSessions(prevSessions => 
      prevSessions.map(session => 
        session.id === currentSessionId 
          ? {
              ...session,
              messages: [...session.messages, newUserMessage]
            }
          : session
      )
    );
    
    setInputValue('');
    simulateBotReply(inputValue);
  };

  const createNewSession = async (): Promise<void> => {
    const sessionName = newSessionName.trim() ? newSessionName : `New Chat ${sessions.length + 1}`;
    
    // Create session ID locally first
    const tempId = `session-${Date.now()}`;
    
    // Add to local state
    const newSession: ChatSession = {
      id: tempId,
      name: sessionName,
      messages: [{ text: "Hi there! I'm your SkillMart assistant. How can I help you today?", sender: 'bot' }]
    };
    
    setSessions(prevSessions => [...prevSessions, newSession]);
    setCurrentSessionId(tempId);
    setNewSessionName('');
    setShowSessionManager(false);
    
    // The session will be created in the database when first message is sent
  };

  const deleteSession = async (sessionId: string): Promise<void> => {
    // If it's a database session (not a local temp one)
    if (!sessionId.startsWith('session-')) {
      try {
        const { error } = await supabase
          .from('chat_sessions')
          .delete()
          .eq('id', sessionId);
          
        if (error) throw error;
      } catch (err) {
        console.error('Error deleting chat session:', err);
        // Continue with UI update even if DB delete fails
      }
    }
    
    setSessions(prevSessions => prevSessions.filter(session => session.id !== sessionId));
    
    // If we deleted the current session or there are no sessions left
    const remainingSessions = sessions.filter(session => session.id !== sessionId);
    if (remainingSessions.length > 0 && sessionId === currentSessionId) {
      setCurrentSessionId(remainingSessions[0].id);
    } else if (remainingSessions.length === 0) {
      // Create a new default session if we deleted the last one
      const defaultSession: ChatSession = {
        id: 'default-session',
        name: 'New Chat',
        messages: [{ text: "Hi there! I'm your SkillMart assistant. How can I help you today?", sender: 'bot' }]
      };
      setSessions([defaultSession]);
      setCurrentSessionId('default-session');
    }
    
    setShowDeleteConfirm(false);
    setSessionToDelete(null);
  };

  const confirmDeleteSession = (sessionId: string): void => {
    setSessionToDelete(sessionId);
    setShowDeleteConfirm(true);
  };

  const cancelDeleteSession = (): void => {
    setShowDeleteConfirm(false);
    setSessionToDelete(null);
  };

  const switchSession = (sessionId: string): void => {
    setCurrentSessionId(sessionId);
    setShowSessionManager(false);
    setEditSessionId(null);
  };

  const startEditingSession = (sessionId: string, currentName: string): void => {
    setEditSessionId(sessionId);
    setEditSessionName(currentName);
  };

  const saveSessionName = async (sessionId: string): Promise<void> => {
    if (editSessionName.trim() === '') return;
    
    // Update local state
    setSessions(prevSessions => 
      prevSessions.map(session => 
        session.id === sessionId 
          ? { ...session, name: editSessionName.trim() }
          : session
      )
    );
    
    // Update database if it's a permanent session
    if (!sessionId.startsWith('session-')) {
      try {
        const { error } = await supabase
          .from('chat_sessions')
          .update({ name: editSessionName.trim() })
          .eq('id', sessionId);
          
        if (error) throw error;
      } catch (err) {
        console.error('Error updating session name:', err);
        // No UI feedback needed, the name is already updated in local state
      }
    }
    
    setEditSessionId(null);
    setEditSessionName('');
  };

  const cancelEditingSession = (): void => {
    setEditSessionId(null);
    setEditSessionName('');
  };

  return (
    <div className={styles.chatbotContainer}>
      {!isOpen ? (
        <Button 
          onClick={toggleChatbot} 
          className={styles.chatToggleBtn}
          aria-label="Open chatbot"
        >
          <ChatDotsFill size={24} />
        </Button>
      ) : (
        <Card className={styles.chatCard}>
          <Card.Header className={styles.chatHeader}>
            <div className={styles.headerContent}>
              {showSessionManager ? (
                <Button
                  variant="link"
                  className={styles.backButton}
                  onClick={() => setShowSessionManager(false)}
                  aria-label="Back to chat"
                >
                  <ArrowLeft size={16} />
                  <span className={styles.chatTitle}>Back to chat</span>
                </Button>
              ) : (
                <>
                  <Button 
                    variant="link" 
                    className={styles.sessionButton} 
                    onClick={() => setShowSessionManager(true)}
                    aria-label="Manage sessions"
                  >
                    <List size={16} className="me-2" />
                    <span className={styles.chatTitle}>{currentSession?.name || "New Chat"}</span>
                  </Button>
                </>
              )}
            </div>
            <div className={styles.headerActions}>
              <Button 
                variant="link" 
                className={styles.headerButton} 
                onClick={toggleChatbot}
                aria-label="Minimize chatbot"
              >
                <Dash size={16} />
              </Button>
              <Button 
                variant="link" 
                className={styles.headerButton} 
                onClick={toggleChatbot}
                aria-label="Close chatbot"
              >
                <XLg size={16} />
              </Button>
            </div>
          </Card.Header>
          
          {showSessionManager ? (
            <div className={styles.sessionManagerContainer}>
              <h4 className={styles.sessionManagerTitle}>Chat Sessions</h4>
              
              <div className={styles.sessionsContainer}>
                {sessions.map(session => (
                  <div key={session.id} className={styles.sessionItem}>
                    {editSessionId === session.id ? (
                      <div className={styles.editSessionForm}>
                        <Form.Control
                          type="text"
                          value={editSessionName}
                          onChange={(e) => setEditSessionName(e.target.value)}
                          className={styles.editSessionInput}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveSessionName(session.id);
                            if (e.key === 'Escape') cancelEditingSession();
                          }}
                        />
                        <div className={styles.editSessionActions}>
                          <Button 
                            variant="success" 
                            size="sm"
                            className={styles.saveSessionButton}
                            onClick={() => saveSessionName(session.id)}
                          >
                            Save
                          </Button>
                          <Button 
                            variant="secondary" 
                            size="sm"
                            className={styles.cancelEditButton}
                            onClick={cancelEditingSession}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.sessionButtonContainer}>
                        <Button 
                          variant={session.id === currentSessionId ? "primary" : "light"}
                          className={`${styles.sessionSelectButton} ${session.id === currentSessionId ? styles.activeSession : ''}`}
                          onClick={() => switchSession(session.id)}
                        >
                          {session.name}
                        </Button>
                        <div className={styles.sessionHoverControls}>
                          <Button
                            variant="link"
                            className={styles.editSessionIcon}
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditingSession(session.id, session.name);
                            }}
                            aria-label="Edit session name"
                          >
                            <PencilFill size={14} />
                          </Button>
                          <Button
                            variant="link"
                            className={styles.deleteSessionIcon}
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmDeleteSession(session.id);
                            }}
                            aria-label="Delete session"
                          >
                            <Trash size={14} />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className={styles.newSessionForm}>
                <h5>Create New Session</h5>
                <Form onSubmit={(e) => { e.preventDefault(); createNewSession(); }}>
                  <InputGroup className={styles.newSessionInput}>
                    <Form.Control
                      type="text"
                      placeholder="Session name (optional)"
                      value={newSessionName}
                      onChange={(e) => setNewSessionName(e.target.value)}
                    />
                    <Button 
                      type="submit"
                      className={styles.createSessionButton}
                    >
                      <Plus size={16} />
                    </Button>
                  </InputGroup>
                </Form>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.messagesContainer}>
                {currentSession?.messages.map((message, index) => (
                  <div 
                    key={index} 
                    className={`${styles.messageWrapper} ${message.sender === 'user' ? styles.userMessageWrapper : styles.botMessageWrapper}`}
                  >
                    <div 
                      className={`${styles.messageBubble} ${message.sender === 'user' ? styles.userMessage : styles.botMessage}`}
                      dangerouslySetInnerHTML={{ __html: message.text.replace(/\/listings\/([0-9a-f-]+)/g, '<a href="/listings/$1" target="_blank">/listings/$1</a>') }}
                    />
                  </div>
                ))}
                
                {isTyping && (
                  <div className={styles.botMessageWrapper}>
                    <div className={styles.typingIndicator}>
                      <Spinner animation="grow" size="sm" className={styles.typingDot} />
                      <Spinner animation="grow" size="sm" className={styles.typingDot} style={{ animationDelay: '0.2s' }} />
                      <Spinner animation="grow" size="sm" className={styles.typingDot} style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              
              <Card.Footer className={styles.inputContainer}>
                <Form onSubmit={handleSendMessage} className={styles.inputForm}>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      value={inputValue}
                      onChange={handleInputChange}
                      placeholder="Type your message here..."
                      aria-label="Type your message"
                      className={styles.inputField}
                    />
                    <Button 
                      type="submit" 
                      className={styles.sendButton}
                      disabled={inputValue.trim() === ''}
                    >
                      <Send size={16} />
                    </Button>
                  </InputGroup>
                </Form>
              </Card.Footer>
            </>
          )}

          {/* Delete Confirmation Dialog */}
          {showDeleteConfirm && (
            <div className={styles.deleteConfirmOverlay}>
              <div className={styles.deleteConfirmDialog}>
                <h5>Delete Chat?</h5>
                <p>Are you sure you want to delete this chat session? This cannot be undone.</p>
                <div className={styles.deleteConfirmActions}>
                  <Button 
                    variant="secondary"
                    className={styles.cancelDeleteButton}
                    onClick={cancelDeleteSession}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="danger"
                    className={styles.confirmDeleteButton}
                    onClick={() => sessionToDelete && deleteSession(sessionToDelete)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default Chatbot;