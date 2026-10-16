/** Isolated snapshot instrumentation. Never imported by the app. The fail
 * mode deliberately rejects both browser copy paths; default mode observes. */
(() => {
  const fail = new URLSearchParams(location.search).get('cisCopy') === 'fail';
  const report = {probe: 'cis-copy-v1', fail, events: []};
  let output;
  const record = event => {
    report.events.push({at: performance.now(), ...event});
    if (output) output.textContent = JSON.stringify(report);
  };
  const write = navigator.clipboard?.writeText.bind(navigator.clipboard);
  if (navigator.clipboard) Object.defineProperty(navigator.clipboard, 'writeText', {configurable: true, value: async text => {
    record({kind: 'write', text});
    if (fail) { record({kind: 'rejected'}); throw new Error('Controlled CIS copy failure'); }
    try { await write(text); record({kind: 'resolved'}); }
    catch (error) { record({kind: 'rejected'}); throw error; }
  }});
  const command = document.execCommand.bind(document);
  document.execCommand = (name, ...args) => {
    if (name !== 'copy') return command(name, ...args);
    record({kind: 'fallback', text: document.activeElement?.value});
    const copied = fail ? false : command(name, ...args);
    record({kind: 'fallback-result', copied});
    return copied;
  };
  addEventListener('DOMContentLoaded', () => {
    output = document.createElement('script'); output.id = 'cis-copy-evidence'; output.type = 'application/json';
    document.body.append(output); output.textContent = JSON.stringify(report);
    new MutationObserver(records => {
      for (const mutation of records) {
        const button = mutation.target;
        if (button.matches?.('button.copy')) record({kind: 'feedback', label: button.getAttribute('aria-label'), done: button.classList.contains('done'), oldClass: mutation.oldValue});
      }
    }).observe(document.body, {subtree: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true});
  });
})();
