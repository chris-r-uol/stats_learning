/* Progress, stored only in this browser.
 *
 * Nothing is sent anywhere. There are no accounts and no server, which is why
 * this material carries no data-protection burden -- and why a student can
 * safely be honest with it. Clearing site data clears progress; that is the
 * trade and the site says so.
 */

(function (global) {
  'use strict';

  const KEY = 'tstats:progress:v1';
  const PREFS = 'tstats:prefs:v1';

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;             // private browsing, quota, disabled storage
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  let state = read(KEY, { steps: {}, updated: null });
  let prefs = read(PREFS, { lang: 'excel', theme: 'auto' });

  const listeners = new Set();
  function emit() { listeners.forEach(fn => fn(state)); }

  const Progress = {
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    /* -------------------------------------------------------------- steps */

    // status: 'ok' | 'bad' | 'self' | 'revealed'
    record(stepId, status, extra) {
      const prev = state.steps[stepId] || { attempts: 0 };
      // Once a step is right it stays right -- revisiting it should not undo
      // the record, or the progress bar would feel punitive.
      const status2 = prev.status === 'ok' && status !== 'ok' ? 'ok' : status;
      state.steps[stepId] = Object.assign({}, prev, extra, {
        status: status2,
        attempts: prev.attempts + (status === 'ok' || status === 'bad' ? 1 : 0),
        at: Date.now()
      });
      state.updated = Date.now();
      write(KEY, state);
      emit();
    },

    get(stepId) { return state.steps[stepId] || null; },
    attempts(stepId) { return (state.steps[stepId] || {}).attempts || 0; },
    isDone(stepId) {
      const s = state.steps[stepId];
      return !!s && (s.status === 'ok' || s.status === 'self');
    },

    summary(stepIds) {
      let done = 0, tried = 0;
      stepIds.forEach(id => {
        const s = state.steps[id];
        if (!s) return;
        if (s.status === 'ok' || s.status === 'self') done++;
        else if (s.attempts > 0 || s.status === 'revealed') tried++;
      });
      return { done, tried, total: stepIds.length };
    },

    reset(stepIds) {
      if (stepIds) stepIds.forEach(id => { delete state.steps[id]; });
      else state = { steps: {}, updated: null };
      write(KEY, state);
      emit();
    },

    /* ---------------------------------------------------------- preferences */

    lang() { return prefs.lang || 'excel'; },
    setLang(v) { prefs.lang = v; write(PREFS, prefs); emit(); },
    theme() { return prefs.theme || 'auto'; },
    setTheme(v) {
      prefs.theme = v;
      write(PREFS, prefs);
      applyTheme();
    },

    /* ------------------------------------------------------------- export */

    // A plain-text summary the student can keep or paste into a VLE if they
    // want to show they engaged. Deliberately not a score.
    exportText(tutorials) {
      const lines = [
        'Transport Statistics Tutorials - my progress',
        'Generated ' + new Date().toLocaleString(),
        ''
      ];
      let gDone = 0, gTotal = 0;
      tutorials.forEach(t => {
        const s = Progress.summary(t.stepIds);
        gDone += s.done; gTotal += s.total;
        const pct = s.total ? Math.round(100 * s.done / s.total) : 0;
        lines.push(`Tutorial ${t.number}: ${t.title}`);
        lines.push(`  ${s.done} of ${s.total} steps completed (${pct}%)`);
      });
      lines.push('');
      lines.push(`Overall: ${gDone} of ${gTotal} steps completed`);
      lines.push('');
      lines.push('This is practice material. It does not count towards assessment.');
      return lines.join('\n');
    },

    download(tutorials) {
      const blob = new Blob([Progress.exportText(tutorials)],
                            { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'transport-stats-progress.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },

    available: (function () {
      try {
        localStorage.setItem('tstats:test', '1');
        localStorage.removeItem('tstats:test');
        return true;
      } catch (e) { return false; }
    })()
  };

  function applyTheme() {
    const t = prefs.theme || 'auto';
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  }
  applyTheme();

  global.Progress = Progress;
})(window);
