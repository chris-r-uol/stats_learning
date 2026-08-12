/* Landing page: fills in each tutorial card with question counts and the
   student's own progress, and wires up the progress export. */

(function () {
  'use strict';

  const TUTORIALS = [1, 2, 3, 4, 5];
  const loaded = [];

  async function loadOne(n) {
    const res = await fetch('content/tutorial-' + n + '.yml', { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const doc = jsyaml.load(await res.text());
    const stepIds = [];
    (doc.questions || []).forEach(q => {
      (q.steps || []).forEach((_s, i) => stepIds.push(q.id + '-s' + i));
    });
    return {
      number: n,
      title: doc.title,
      questions: (doc.questions || []).length,
      stepIds
    };
  }

  function paint() {
    let gDone = 0, gTotal = 0;
    loaded.forEach(t => {
      const s = Progress.summary(t.stepIds);
      gDone += s.done;
      gTotal += s.total;
      const card = document.querySelector('[data-tut="' + t.number + '"]');
      if (!card) return;
      const meta = card.querySelector('[data-meta]');
      const bar = card.querySelector('[data-bar]');
      const pct = s.total ? Math.round(100 * s.done / s.total) : 0;
      if (meta) {
        meta.textContent = t.questions + ' questions · ' + s.total + ' steps' +
          (s.done ? ' · ' + pct + '% done' : '');
      }
      if (bar) bar.style.width = pct + '%';
    });

    const overall = document.getElementById('overall');
    if (overall && gTotal) {
      const pct = Math.round(100 * gDone / gTotal);
      overall.querySelector('[data-bar]').style.width = pct + '%';
      overall.querySelector('[data-meta]').textContent =
        gDone + ' of ' + gTotal + ' steps completed across all five tutorials (' + pct + '%)';
      overall.hidden = false;
    }
  }

  async function boot() {
    try {
      const docs = await Promise.all(TUTORIALS.map(loadOne));
      loaded.push.apply(loaded, docs);
    } catch (e) {
      // Card titles are already in the HTML, so a failure here costs only the
      // progress numbers -- not the ability to reach the tutorials.
      return;
    }
    paint();
    Progress.onChange(paint);

    const dl = document.getElementById('download-progress');
    if (dl) {
      dl.hidden = false;
      dl.addEventListener('click', () => Progress.download(loaded));
    }
    const reset = document.getElementById('reset-all');
    if (reset) {
      reset.addEventListener('click', () => {
        if (confirm('Clear your saved answers for every tutorial? This cannot be undone.')) {
          Progress.reset();
          location.reload();
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else boot();
})();
