import { hostingFor, fetchApi } from './hosting.js?v=0.9.7';
import {BRAND} from './brand.js?v=0.10.0-rc.2';
const hosting = hostingFor(location.href);
const button = document.querySelector('#run-test');
const result = document.querySelector('#result');
const read = document.querySelector('#read-status');
const write = document.querySelector('#write-status');
const open = document.querySelector('#open-game');
document.querySelector('#relay-address').textContent = `Session connection: ${hosting.apiBase}`;
button.addEventListener('click', async () => {
  button.disabled = true; open.hidden = true;
  read.className = ''; write.className = '';
  read.textContent = 'Checking the session server…';
  write.textContent = 'Waiting to check two-way access.';
  result.textContent = 'Testing…';
  let stage = read;
  try {
    const catalogResponse = await fetchApi(hosting.api('catalog'), { cache: 'no-store' });
    if (!catalogResponse.ok) throw new Error(`Session server returned HTTP ${catalogResponse.status}.`);
    const catalog = await catalogResponse.json();
    if (!Array.isArray(catalog.modules)) throw new Error('The address did not return the MathQuest catalog.');
    if (catalog.version !== BRAND.engineVersion) throw new Error(`Backend is v${catalog.version || 'unknown'}. This front end requires session engine v${BRAND.engineVersion}.`);
    read.textContent = `Session server connected · v${catalog.version} · ${catalog.modules.length} modules.`;
    read.className = 'pass'; stage = write;
    write.textContent = 'Checking two-way access…';
    // application/json intentionally exercises the browser's CORS preflight.
    const response = await fetchApi(hosting.api('health'), {
      method: 'POST', headers: { 'content-type': 'application/json',authorization:'Bearer connectivity-check-not-a-credential' },
      body: JSON.stringify({ check: 'classroom-connectivity' }), cache: 'no-store'
    });
    if (!response.ok) throw new Error(`Two-way check returned HTTP ${response.status}.`);
    const health = await response.json();
    if (health.service !== BRAND.name || health.ok !== true || health.version !== BRAND.engineVersion) throw new Error('Unexpected response from the session server.');
    write.textContent = 'Two-way access passed.'; write.className = 'pass';
    result.textContent = 'Connection checks passed. Open MathQuest, create a new session, and test with two iPads.';
    open.hidden = false;
  } catch (error) {
    stage.textContent = 'Connection check failed.'; stage.className = 'fail';
    result.textContent = `${error.name === 'AbortError' ? 'The server did not respond within 15 seconds.' : error.message}\n\nCheck Wi-Fi, deploy the updated Cloudflare backend, and confirm the Netlify relay address is still active. Opening a link directly does not test two-way browser access.`;
  } finally { button.disabled = false; }
});
