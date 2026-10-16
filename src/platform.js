// platform.js - Official start.ng bridge for authentication, central styling & leaderboard

function findStartNg() {
  const { hostname } = location;
  if (hostname.endsWith('.start.ng')) return 'https://start.ng';
  if (hostname.endsWith('.start.localhost') || hostname === 'localhost' || hostname === '127.0.0.1') {
    // For local development, fallback gracefully to guest mode or start.ng connect
    return 'https://start.ng';
  }
  return 'https://start.ng';
}

export const START_NG = findStartNg();
const API_BASE = 'https://api.start.ng';

// Retrieve game name from hostname, e.g. "murder-mystery.start.ng" -> "murder-mystery"
export function getGameName() {
  const parts = location.hostname.split('.');
  return parts.length > 2 ? parts[0] : 'murder-mystery';
}

// Session management for direct API calls
export function getStoredSession() {
  const hashParams = new URLSearchParams(location.hash.slice(1));
  const sessionFromHash = hashParams.get('startng_session');
  if (sessionFromHash) {
    sessionStorage.setItem('startng_session', sessionFromHash);
    history.replaceState(null, '', location.pathname + location.search);
  }
  return sessionStorage.getItem('startng_session');
}

let framePromise = null;
function getConnectFrame() {
  if (!framePromise) {
    framePromise = new Promise((resolve, reject) => {
      const el = document.createElement('iframe');
      el.src = `${START_NG}/connect`;
      el.hidden = true;
      el.title = 'start.ng connect';
      el.addEventListener('load', () => resolve(el), { once: true });
      el.addEventListener('error', (err) => {
        console.warn('Could not load start.ng connect frame:', err);
        resolve(null);
      }, { once: true });
      document.body.append(el);
    });
  }
  return framePromise;
}

export async function askStartNg(message, replyType, timeoutMs = 4000) {
  let el;
  try {
    el = await getConnectFrame();
  } catch {
    return null;
  }
  if (!el || !el.contentWindow) return null;

  return new Promise((resolve) => {
    const requestId = Math.random().toString(36).slice(2);
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        removeEventListener('message', onMessage);
        resolve(null);
      }
    }, timeoutMs);

    function onMessage(e) {
      if (e.origin !== START_NG || e.source !== el.contentWindow) return;
      if (e.data?.type === replyType && e.data.requestId === requestId) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          removeEventListener('message', onMessage);
          resolve(e.data);
        }
      }
    }

    addEventListener('message', onMessage);
    try {
      el.contentWindow.postMessage({ ...message, requestId }, START_NG);
    } catch {
      clearTimeout(timer);
      removeEventListener('message', onMessage);
      resolve(null);
    }
  });
}

// Default fallback style for guests or offline mode
export const GUEST_STYLE = {
  body: 'male',
  primaryColor: '#a55eea',
  secondaryColor: '#2b2f4a',
  skinColor: '#8d5524',
  hairColor: '#17120f',
  hair: 'short',
  hat: 'tophat',
  accessory: 'glasses'
};

export async function getCurrentPlayer() {
  // 1. Try connect postMessage
  try {
    const reply = await askStartNg({ type: 'startng:whoami' }, 'startng:user', 3000);
    if (reply?.user) {
      return {
        user: reply.user,
        isGuest: false,
        style: reply.user.style || GUEST_STYLE,
        name: reply.user.name || 'Detective',
        account: reply.user.account || 'player',
        face: reply.user.face || null
      };
    }
    if (reply?.guest) {
      return {
        user: null,
        isGuest: true,
        style: reply.guest.style || GUEST_STYLE,
        name: reply.guest.name || 'Guest Detective',
        account: 'guest',
        face: reply.guest.face || null
      };
    }
  } catch (e) {
    console.warn('Error querying start.ng whoami:', e);
  }

  // 2. Try HTTP API session if available
  const session = getStoredSession();
  if (session) {
    try {
      const res = await fetch(`${API_BASE}/games/${getGameName()}/player`, {
        headers: { Authorization: `Bearer ${session}` }
      });
      if (res.ok) {
        const data = await res.json();
        return {
          user: data,
          isGuest: false,
          style: data.style || GUEST_STYLE,
          name: data.name || 'Detective',
          account: data.account || 'player',
          face: data.face || null
        };
      }
    } catch (e) {
      console.warn('Failed to query player via session:', e);
    }
  }

  // 3. Fallback to Guest
  return {
    user: null,
    isGuest: true,
    style: GUEST_STYLE,
    name: 'Guest Detective',
    account: 'guest',
    face: null
  };
}

export function onUserChange(callback) {
  let lastJson = '';
  const recheck = async () => {
    if (document.visibilityState !== 'visible') return;
    const player = await getCurrentPlayer();
    const currentJson = JSON.stringify(player.style);
    if (currentJson !== lastJson) {
      lastJson = currentJson;
      callback(player);
    }
  };

  document.addEventListener('visibilitychange', recheck);
  addEventListener('focus', recheck);
  // Also poll softly every 8 seconds in case user edited styling in another tab
  setInterval(recheck, 8000);
}

export function signIn() {
  const returnTo = encodeURIComponent(location.origin + location.pathname);
  location.href = `${START_NG}/?return_to=${returnTo}`;
}

export async function submitScore(score, turnsLeft) {
  const stats = {
    score: Math.max(0, Math.floor(score)),
    turns_left: Math.max(0, Math.floor(turnsLeft))
  };

  // Try connect postMessage first
  try {
    const reply = await askStartNg({ type: 'startng:score', stats }, 'startng:scoreSaved', 4000);
    if (reply?.ok) {
      return { success: true, rank: reply.result?.rank, improved: reply.result?.improved };
    }
  } catch (e) {
    console.warn('Connect score submit failed:', e);
  }

  // Fallback to session API
  const session = getStoredSession();
  if (session) {
    try {
      const res = await fetch(`${API_BASE}/games/${getGameName()}/scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session}`
        },
        body: JSON.stringify({ stats })
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, rank: data.rank, improved: data.improved };
      }
    } catch (e) {
      console.warn('Session score submit failed:', e);
    }
  }

  return { success: false, reason: 'Guest or offline mode. Sign in to save to start.ng leaderboard!' };
}

export async function fetchLeaderboard(limit = 10) {
  // Try connect postMessage
  try {
    const reply = await askStartNg({ type: 'startng:leaderboard', limit }, 'startng:leaderboardData', 4000);
    if (reply?.ok && Array.isArray(reply.entries)) {
      return reply.entries;
    }
  } catch (e) {
    console.warn('Connect leaderboard query failed:', e);
  }

  // Fallback to API
  try {
    const res = await fetch(`${API_BASE}/games/${getGameName()}/leaderboard?limit=${limit}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (e) {
    console.warn('API leaderboard query failed:', e);
  }

  return [];
}
