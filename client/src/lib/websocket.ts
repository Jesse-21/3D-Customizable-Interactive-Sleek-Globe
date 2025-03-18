// WebSocket utility for connecting to the server
// This provides a more robust way to handle WebSocket connections and reconnects

// WebSocket message type for visitor locations
export interface WebSocketMessage {
  type: 'visitor_location' | 'initial_locations' | 'new_visitor';
  location?: {
    latitude: number;
    longitude: number;
    timestamp: number;
  };
  locations?: Array<{
    latitude: number;
    longitude: number;
    timestamp: number;
  }>;
  latitude?: number;
  longitude?: number;
}

let socket: WebSocket | null = null;
let reconnectTimeout: number | null = null;
const listeners: Array<(message: WebSocketMessage) => void> = [];

export function setupWebSocket() {
  // Clear any existing reconnect timeout
  if (reconnectTimeout !== null) {
    window.clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  
  // Close any existing socket
  if (socket) {
    socket.close();
    socket = null;
  }
  
  try {
    // Get the current protocol and convert to WebSocket protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // Create WebSocket URL based on current window location
    // In Replit, we use the same host without specifying port
    // Ensure we're not adding the port in the URL string
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log(`Connecting to WebSocket at ${wsUrl}`);
    
    // Add debugging info
    console.log(`WebSocket connection details:
      - Protocol: ${protocol}
      - Host: ${window.location.host}
      - Origin: ${window.location.origin}
      - Path: /ws`);
    
    // Create new WebSocket connection with a timeout
    socket = new WebSocket(wsUrl);
    
    // Set a connection timeout to avoid hanging connections
    const connectionTimeout = setTimeout(() => {
      if (socket && socket.readyState !== WebSocket.OPEN) {
        console.warn('WebSocket connection timed out');
        socket.close();
        socket = null;
        
        // Attempt to reconnect after timeout
        reconnectTimeout = window.setTimeout(() => {
          setupWebSocket();
        }, 5000);
      }
    }, 10000); // 10 second timeout
    
    // Setup event handlers
    socket.onopen = () => {
      console.log('WebSocket connection established');
      clearTimeout(connectionTimeout); // Clear the connection timeout
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WebSocketMessage;
        // Notify all listeners
        listeners.forEach(listener => listener(data));
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
    
    socket.onclose = () => {
      console.log('WebSocket connection closed');
      socket = null;
      
      // Attempt to reconnect after 5 seconds
      reconnectTimeout = window.setTimeout(() => {
        setupWebSocket();
      }, 5000);
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      // The socket will close automatically after an error
    };
    
    return socket;
  } catch (error) {
    console.error('Error setting up WebSocket:', error);
    // Schedule reconnect on error
    reconnectTimeout = window.setTimeout(() => {
      setupWebSocket();
    }, 5000);
    return null;
  }
}

export function addWebSocketListener(callback: (message: WebSocketMessage) => void): () => void {
  listeners.push(callback);
  
  // If there's no socket yet, initialize one
  if (!socket) {
    setupWebSocket();
  }
  
  // Return a function to remove this listener
  return () => {
    const index = listeners.indexOf(callback);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  };
}

export function sendWebSocketMessage(message: WebSocketMessage): boolean {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.warn('Attempting to send message but WebSocket is not connected');
    return false;
  }
  
  try {
    socket.send(JSON.stringify(message));
    return true;
  } catch (error) {
    console.error('Error sending WebSocket message:', error);
    return false;
  }
}

// Initialize the WebSocket connection
setupWebSocket();