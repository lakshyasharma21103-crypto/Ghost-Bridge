import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient, hasPartnerApiKey, setPartnerApiKey } from '../api/apiClient.js';

const AppStateContext = createContext(null);
const IDENTITY_STORAGE_KEY = 'agent-passport-runtime-gateway.identity';

function readIdentity() {
  try {
    const value = JSON.parse(localStorage.getItem(IDENTITY_STORAGE_KEY) || '{}');
    return {
      receivingWorkspaceId: value.receivingWorkspaceId || 'workspace_demo',
      receivingUserId: value.receivingUserId || 'user_demo',
    };
  } catch {
    return { receivingWorkspaceId: 'workspace_demo', receivingUserId: 'user_demo' };
  }
}

export function AppStateProvider({ children }) {
  const [identity, setIdentityState] = useState(readIdentity);
  const [partnerConfigured, setPartnerConfigured] = useState(hasPartnerApiKey);
  const [events, setEvents] = useState([]);
  const [serverEnvironment, setServerEnvironment] = useState(null);

  useEffect(() => {
    let active = true;
    apiClient.get('/health')
      .then((data) => active && setServerEnvironment(data.environment || 'unknown'))
      .catch(() => active && setServerEnvironment('unavailable'));
    return () => { active = false; };
  }, []);

  function setIdentity(nextIdentity) {
    const next = {
      receivingWorkspaceId: String(nextIdentity.receivingWorkspaceId || '').trim(),
      receivingUserId: String(nextIdentity.receivingUserId || '').trim(),
    };
    setIdentityState(next);
    localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(next));
  }

  function configurePartnerKey(value) {
    setPartnerApiKey(value);
    setPartnerConfigured(hasPartnerApiKey());
  }

  function recordEvent(action, detail, tone = 'neutral') {
    setEvents((current) => [
      {
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        action,
        detail,
        tone,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ].slice(0, 80));
  }

  const value = useMemo(
    () => ({
      identity,
      setIdentity,
      partnerConfigured,
      configurePartnerKey,
      events,
      recordEvent,
      serverEnvironment,
      sandboxReady: serverEnvironment !== null,
      sandboxEnabled: serverEnvironment === 'development',
    }),
    [identity, partnerConfigured, events, serverEnvironment],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used inside AppStateProvider.');
  return context;
}
