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
      id: `session-${Date.now()}`, // Use temporary ID format initially
      name: 'New Chat',
      messages: [{ text: "Hi there! I'm your SkillMart assistant. How can I help you today?", sender: 'bot' }]
    }
  ]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(sessions[0].id); // Initialize with the first session ID
  const [inputValue, setInputValue] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [showSessionManager, setShowSessionManager] = useState<boolean>(false);
  const [newSessionName, setNewSessionName] = useState<string>('');
  const [editSessionId, setEditSessionId] = useState<string | null>(null);
  const [editSessionName, setEditSessionName] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true); // Added loading state

  // Get current session safely
  const currentSession = sessions.find(session => session.id === currentSessionId) || sessions[0] || null;

  // Load chat sessions from database
  useEffect(() => {
    const loadChatSessions = async () => {
      setIsLoadingSessions(true);
      try {
        // *** UPDATED CODE: Use getUser() instead of getSession() ***
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        // If user is not logged in or error fetching user, just use local session
        if (userError || !user) {
          console.log("Chatbot: No authenticated user found, using default session.");
          // Ensure there's at least one default session if sessions array is empty
          if (sessions.length === 0) {
              const defaultSession: ChatSession = {
                  id: `session-${Date.now()}`,
                  name: 'New Chat',
                  messages: [{ text: "Hi there! I'm your SkillMart assistant. How can I help you today?", sender: 'bot' }]
              };
              setSessions([defaultSession]);
              setCurrentSessionId(defaultSession.id);
          } else {
              // Make sure currentSessionId points to an existing session
              if (!sessions.find(s => s.id === currentSessionId)) {
                  setCurrentSessionId(sessions[0]?.id || `session-${Date.now()}`);
              }
          }
          setIsLoadingSessions(false);
          return;
        }

        // User is authenticated, fetch their sessions
        const { data: dbSessions, error: sessionsError } = await supabase
          .from('chat_sessions')
          .select('id, name')
          .eq('user_id', user.id) // Fetch only user's sessions
          .order('updated_at', { ascending: false });

        if (sessionsError) throw sessionsError;

        let loadedSessions: ChatSession[] = [];
        if (dbSessions && dbSessions.length > 0) {
          // For each session, fetch its messages
          loadedSessions = await Promise.all(dbSessions.map(async (dbSession) => {
            const { data: messages, error: messagesError } = await supabase
              .from('chat_messages')
              .select('sender, text')
              .eq('session_id', dbSession.id)
              .order('created_at', { ascending: true });

            if (messagesError) {
                 console.error(`Error fetching messages for session ${dbSession.id}:`, messagesError);
                 // Return session with default message on error
                 return {
                    id: dbSession.id,
                    name: dbSession.name,
                    messages: [{ text: "Error loading messages for this session.", sender: 'bot' as 'bot' }]
                 };
            }

            return {
              id: dbSession.id,
              name: dbSession.name,
              messages: messages?.map(msg => ({
                text: msg.text,
                sender: msg.sender as 'user' | 'bot'
              })) || [{ text: "Start chatting!", sender: 'bot' as 'bot' }] // Provide default if no messages
            };
          }));
        }

        // If no sessions were loaded from DB, create a default one
        if (loadedSessions.length === 0) {
             const defaultSession: ChatSession = {
                id: `session-${Date.now()}`, // Start with temporary ID
                name: 'New Chat',
                messages: [{ text: "Hi there! I'm your SkillMart assistant. How can I help you today?", sender: 'bot' }]
             };
             loadedSessions.push(defaultSession);
        }

        setSessions(loadedSessions);
        // Set current session to the most recent one (first in the loaded array)
        setCurrentSessionId(loadedSessions[0].id);

      } catch (error) {
        console.error('Error loading chat sessions:', error);
        // Fallback to default session on error
        if (sessions.length === 0) {
             const defaultSession: ChatSession = {
                id: `session-${Date.now()}`,
                name: 'New Chat',
                messages: [{ text: "Error loading sessions. How can I help?", sender: 'bot' }]
             };
             setSessions([defaultSession]);
             setCurrentSessionId(defaultSession.id);
        } else if (!sessions.find(s => s.id === currentSessionId)) {
             setCurrentSessionId(sessions[0]?.id || `session-${Date.now()}`);
        }
      } finally {
        setIsLoadingSessions(false);
      }
    };

    loadChatSessions();
  // Intentionally run only once on mount to load initial sessions
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]); // Dependency on supabase client instance

  const toggleChatbot = (): void => {
    setIsOpen(!isOpen);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setInputValue(e.target.value);
  };

  const scrollToBottom = (): void => {
    // Add a slight delay to allow the DOM to update
    setTimeout(() => {
       messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Scroll to bottom when messages change or chat opens/closes
  useEffect(() => {
    if (isOpen) {
        scrollToBottom();
    }
  }, [currentSession?.messages, isOpen]);

  const simulateBotReply = async (userMessage: string): Promise<void> => {
    setIsTyping(true);
    // Ensure currentSession is available
    if (!currentSession) {
        console.error("Cannot send message: current session is null.");
        setIsTyping(false);
        // Optionally show an error message in the UI
        setSessions(prevSessions =>
            prevSessions.map(session =>
                session.id === currentSessionId
                    ? { ...session, messages: [...(session.messages || []), { text: "Error: Could not find current chat session.", sender: 'bot' }] }
                    : session
            )
        );
        return;
    }

    try {
      // Call the API with the message and session history
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          sessionId: currentSession.id, // Use the ID from the current session object
          sessionHistory: currentSession.messages || []
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Update session ID if it changed (new session created in DB)
      // Check if the current session ID is a temporary one before updating
      if (data.sessionId && data.sessionId !== currentSession.id && currentSession.id.startsWith('session-')) {
        const newDbId = data.sessionId;
        // Update the ID in the sessions array
        setSessions(prevSessions =>
            prevSessions.map(session =>
                session.id === currentSession.id ? { ...session, id: newDbId } : session
            )
        );
        // Update the currentSessionId state
        setCurrentSessionId(newDbId);

         // Add bot response to the *now updated* session
        setSessions(prevSessions =>
            prevSessions.map(session =>
                session.id === newDbId // Use the new ID here
                    ? { ...session, messages: [...session.messages, { text: data.response, sender: 'bot' }] }
                    : session
            )
        );

      } else {
         // Add bot response to the existing session
         setSessions(prevSessions =>
            prevSessions.map(session =>
                session.id === currentSession.id // Use current ID
                    ? { ...session, messages: [...session.messages, { text: data.response, sender: 'bot' }] }
                    : session
            )
         );
      }


    } catch (error) {
      console.error('Error getting bot response:', error);

      // Fallback response in case of error
      setSessions(prevSessions =>
        prevSessions.map(session =>
          session.id === currentSession.id // Use current ID
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
    if (inputValue.trim() === '' || !currentSession) return; // Also check if currentSession exists

    const newUserMessage: ChatMessage = { text: inputValue, sender: 'user' };

    // Update the current session with the new message
    setSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === currentSession.id
          ? {
              ...session,
              messages: [...session.messages, newUserMessage]
            }
          : session
      )
    );

    const messageToSend = inputValue; // Capture value before clearing
    setInputValue('');
    simulateBotReply(messageToSend);
  };


  const createNewSession = async (): Promise<void> => {
    const sessionName = newSessionName.trim() ? newSessionName : `New Chat ${sessions.length + 1}`;

    // Create session ID locally first (temporary)
    const tempId = `session-${Date.now()}`;

    // Add to local state
    const newSession: ChatSession = {
      id: tempId,
      name: sessionName,
      messages: [{ text: "Hi there! I'm your SkillMart assistant. How can I help you today?", sender: 'bot' }]
    };

    // Prepend the new session to the beginning of the array
    setSessions(prevSessions => [newSession, ...prevSessions]);
    setCurrentSessionId(tempId); // Switch to the new session
    setNewSessionName('');
    setShowSessionManager(false); // Close the session manager

    // The session will be created in the database when the first message is sent in simulateBotReply
  };


  const deleteSession = async (sessionId: string): Promise<void> => {
    // If it's a database session (not a local temp one)
    if (!sessionId.startsWith('session-')) {
      try {
         // *** UPDATED CODE: Check user auth before deleting ***
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error("Cannot delete session: User not authenticated.");
            // Optionally show an error to the user
            return;
        }

        // Ensure the session belongs to the current user before deleting from DB
        const { data: sessionData, error: fetchError } = await supabase
            .from('chat_sessions')
            .select('user_id')
            .eq('id', sessionId)
            .single();

        if (fetchError || !sessionData) {
             console.error(`Error fetching session ${sessionId} for deletion check:`, fetchError);
             // Decide if you want to proceed with local deletion anyway or stop
        } else if (sessionData.user_id !== user.id) {
             console.error(`User ${user.id} not authorized to delete session ${sessionId}`);
             // Optionally show an error to the user
             return; // Stop deletion
        }

        // Proceed with deletion if authorized
        const { error: deleteError } = await supabase
          .from('chat_sessions')
          .delete()
          .eq('id', sessionId)
          .eq('user_id', user.id); // Add user_id check for safety

        if (deleteError) throw deleteError;
        console.log(`Deleted session ${sessionId} from database.`);

      } catch (err) {
        console.error('Error deleting chat session from database:', err);
        // Continue with UI update even if DB delete fails for robustness
      }
    }

    // Update local state
    setSessions(prevSessions => prevSessions.filter(session => session.id !== sessionId));

    // Determine the next session to switch to
    const remainingSessions = sessions.filter(session => session.id !== sessionId);
    if (remainingSessions.length > 0) {
        // If the deleted session was the current one, switch to the first remaining session
        if (sessionId === currentSessionId) {
            setCurrentSessionId(remainingSessions[0].id);
        }
        // Otherwise, keep the current session ID
    } else {
      // If we deleted the last one, create a new default session
      const defaultSession: ChatSession = {
        id: `session-${Date.now()}`,
        name: 'New Chat',
        messages: [{ text: "Hi there! I'm your SkillMart assistant. How can I help you today?", sender: 'bot' }]
      };
      setSessions([defaultSession]);
      setCurrentSessionId(defaultSession.id);
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
    setEditSessionId(null); // Ensure edit mode is off when switching
  };

  const startEditingSession = (sessionId: string, currentName: string): void => {
    setEditSessionId(sessionId);
    setEditSessionName(currentName);
  };

  const saveSessionName = async (sessionId: string): Promise<void> => {
    const trimmedName = editSessionName.trim();
    if (trimmedName === '') return; // Don't save empty names

    // Update local state first for immediate feedback
    setSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === sessionId
          ? { ...session, name: trimmedName }
          : session
      )
    );

    // Update database if it's a permanent session
    if (!sessionId.startsWith('session-')) {
      try {
         // *** UPDATED CODE: Check user auth before updating ***
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error("Cannot update session name: User not authenticated.");
            return;
        }

        const { error } = await supabase
          .from('chat_sessions')
          .update({ name: trimmedName, updated_at: new Date().toISOString() }) // Also update timestamp
          .eq('id', sessionId)
          .eq('user_id', user.id); // Ensure user owns the session

        if (error) throw error;
        console.log(`Updated session name for ${sessionId} in database.`);
      } catch (err) {
        console.error('Error updating session name in database:', err);
        // Optionally revert local state change or show an error
      }
    }

    setEditSessionId(null);
    setEditSessionName('');
  };


  const cancelEditingSession = (): void => {
    setEditSessionId(null);
    setEditSessionName('');
  };

  // Render loading state for sessions
  if (isLoadingSessions) {
      return (
          <div className={styles.chatbotContainer}>
              <Button className={styles.chatToggleBtn} aria-label="Loading chatbot">
                  <Spinner animation="border" size="sm" />
              </Button>
          </div>
      );
  }


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
                  {/* Display current session name while in manager */}
                  <span className={styles.chatTitle}>{currentSession?.name || "Chat"}</span>
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
                          variant={"light"} // Keep variant consistent, use active class for styling
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
                          {/* Prevent deleting the very last session */}
                          {sessions.length > 1 && (
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
                          )}
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
                      aria-label="Create new chat session"
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
                    key={`${currentSession.id}-msg-${index}`} // More unique key
                    className={`${styles.messageWrapper} ${message.sender === 'user' ? styles.userMessageWrapper : styles.botMessageWrapper}`}
                  >
                    <div
                      className={`${styles.messageBubble} ${message.sender === 'user' ? styles.userMessage : styles.botMessage}`}
                      // Use dangerouslySetInnerHTML carefully, ensure text is sanitized if needed
                      // Basic link detection for /listings/uuid
                      dangerouslySetInnerHTML={{ __html: message.text.replace(/\/listing\/([0-9a-fA-F-]+)/g, '<a href="/listing/$1" target="_blank" rel="noopener noreferrer">/listing/$1</a>') }}
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
                      disabled={isTyping} // Disable input while bot is typing
                    />
                    <Button
                      type="submit"
                      className={styles.sendButton}
                      disabled={inputValue.trim() === '' || isTyping} // Disable if empty or bot typing
                      aria-label="Send message"
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
            <Modal show={showDeleteConfirm} onHide={cancelDeleteSession} centered>
                 <Modal.Header closeButton>
                     <Modal.Title>Delete Chat?</Modal.Title>
                 </Modal.Header>
                 <Modal.Body>
                     Are you sure you want to delete this chat session? This cannot be undone.
                 </Modal.Body>
                 <Modal.Footer>
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
                 </Modal.Footer>
             </Modal>
          )}
        </Card>
      )}
    </div>
  );
};

export default Chatbot;
