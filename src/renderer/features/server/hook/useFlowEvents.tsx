import React, {
  createContext,
  useContext,
  useCallback,
  useReducer,
} from 'react';

// Simple state management for flow events
interface FlowState {
  events: {
    onReconnectStart: boolean;
    onConnectStart: boolean;
    onConnect: boolean;
    onReconnect: boolean;
    onConnectEnd: boolean;
    onReconnectEnd: boolean;
  };
}

type FlowAction =
  | { type: 'RECONNECT_START' }
  | { type: 'CONNECT_START' }
  | { type: 'CONNECT' }
  | { type: 'RECONNECT' }
  | { type: 'CONNECT_END' }
  | { type: 'RECONNECT_END' }
  | { type: 'RESET_EVENTS' };

function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case 'RECONNECT_START':
      return {
        events: {
          onReconnectStart: true,
          onConnectStart: false,
          onConnect: false,
          onReconnect: false,
          onConnectEnd: false,
          onReconnectEnd: false,
        },
      };
    case 'CONNECT_START':
      return {
        events: {
          ...state.events,
          onConnectStart: true,
          onConnect: false,
          onReconnect: false,
          onConnectEnd: false,
          onReconnectEnd: false,
        },
      };
    case 'CONNECT':
      return {
        events: {
          onReconnectStart: false,
          onConnectStart: false,
          onConnect: true,
          onReconnect: false,
          onConnectEnd: false,
          onReconnectEnd: false,
        },
      };
    case 'RECONNECT':
      return {
        events: {
          onReconnectStart: false,
          onConnectStart: false,
          onConnect: false,
          onReconnect: true,
          onConnectEnd: false,
          onReconnectEnd: false,
        },
      };
    case 'CONNECT_END':
      return {
        events: {
          ...state.events,
          onReconnectStart: false,
          onConnectStart: false,
          onConnectEnd: true,
        },
      };
    case 'RECONNECT_END':
      return {
        events: {
          ...state.events,
          onReconnectStart: false,
          onConnectStart: false,
          onReconnectEnd: true,
        },
      };
    case 'RESET_EVENTS':
      return {
        events: {
          onReconnectStart: false,
          onConnectStart: false,
          onConnect: false,
          onReconnect: false,
          onConnectEnd: false,
          onReconnectEnd: false,
        },
      };
    default:
      return state;
  }
}

const FlowContext = createContext<{
  state: FlowState;
  dispatch: React.Dispatch<FlowAction>;
} | null>(null);

export function FlowProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(flowReducer, {
    events: {
      onReconnectStart: false,
      onConnectStart: false,
      onConnect: false,
      onReconnect: false,
      onConnectEnd: false,
      onReconnectEnd: false,
    },
  });

  return (
    <FlowContext.Provider value={{ state, dispatch }}>
      {children}
    </FlowContext.Provider>
  );
}

export function useFlow() {
  const context = useContext(FlowContext);
  if (!context) {
    throw new Error('useFlow must be used within a FlowProvider');
  }

  const { state, dispatch } = context;

  // Simplified event handlers
  const onReconnectStart = useCallback(() => {
    console.log('onReconnectStart');
    dispatch({ type: 'RECONNECT_START' });
  }, [dispatch]);

  const onConnectStart = useCallback(() => {
    console.log('onConnectStart');
    dispatch({ type: 'CONNECT_START' });
  }, [dispatch]);

  const onConnect = useCallback(() => {
    console.log('onConnect');
    dispatch({ type: 'CONNECT' });
  }, [dispatch]);

  const onReconnect = useCallback(() => {
    console.log('onReconnect');
    dispatch({ type: 'RECONNECT' });
  }, [dispatch]);

  const onConnectEnd = useCallback(() => {
    dispatch({ type: 'CONNECT_END' });
  }, [dispatch]);

  const onReconnectEnd = useCallback(() => {
    console.log('onReconnectEnd');
    dispatch({ type: 'RECONNECT_END' });
  }, [dispatch]);

  const resetEvents = useCallback(() => {
    dispatch({ type: 'RESET_EVENTS' });
  }, [dispatch]);

  return {
    events: state.events,
    onReconnectStart,
    onConnectStart,
    onConnect,
    onReconnect,
    onConnectEnd,
    onReconnectEnd,
    resetEvents,
  };
}
