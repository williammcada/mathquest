import { HOSTING } from './hosting-config.js?v=0.14.2';
import {credentialFor,forgetRoom} from './privacy.js?v=0.14.2';

// Keep the repository directory in every navigation and QR link. The API is
// deliberately separate: student browsers never connect to workers.dev.
export function hostingFor(pageHref, config = HOSTING) {
  const page = new URL(pageHref);
  const configuredPage = new URL(config.githubPagesUrl);
  const appBase = new URL('./', page);
  const relay = new URL(config.relayApiBase);
  if (relay.protocol !== 'https:' || relay.username || relay.password || relay.search || relay.hash) {
    throw new Error('The relay address must be an HTTPS URL without credentials or a query.');
  }
  if (!relay.pathname.endsWith('/')) relay.pathname += '/';
  const apiBase = page.origin === configuredPage.origin ? relay : new URL('/api/', page);
  return {
    appBase: appBase.href,
    apiBase: apiBase.href,
    api(path) {
      // Callers supply only an API path, not a redirect or another origin.
      if (/^(?:[a-z][\w+.-]*:|\/)|(?:^|\/)\.\.(?:\/|$)/i.test(path)) throw new Error('Invalid API path');
      return new URL(path, apiBase).href;
    },
    sessionLink(code, { teacherKey, student = false } = {}) {
      const target = new URL(appBase);
      target.searchParams.set('session', code);
      if (student) target.searchParams.set('student', '1');
      else if (teacherKey) target.searchParams.set('teacher', teacherKey);
      return target.href;
    }
  };
}

// No cookies or ambient credentials are needed: the existing session/device
// keys are still checked by the server. Bound waits for creation and polling.
export async function fetchApi(url, options = {}) {
  const code=new URL(url,globalThis.location?.href||'http://localhost').pathname.match(/\/sessions\/([A-Z0-9]+)(?:\/|$)/i)?.[1];
  const headers=new Headers(options.headers||{}),credential=code&&credentialFor(code);
  if(credential)headers.set('authorization',`Bearer ${credential}`);
  const controller = options.signal ? null : new AbortController();
  const timeout = controller && setTimeout(() => controller.abort(), 15000);
  try {
    const response=await fetch(url, {
      ...options,headers, credentials: 'omit', referrerPolicy: 'no-referrer',
      signal: options.signal || controller.signal
    });
    if(response.status===410&&code){forgetRoom(code);globalThis.dispatchEvent?.(new CustomEvent('mq-session-gone',{detail:{code}}));}
    return response;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
