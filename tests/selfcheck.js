/* Exercise every step of every tutorial through the real checking logic.
 *
 * Two things are asserted for each step:
 *   1. the correct answer is accepted;
 *   2. every trap and distractor returns its OWN feedback, not the generic
 *      fallback -- a trap that silently stops firing is invisible otherwise,
 *      because the student still sees a plausible "not quite" message.
 *
 * Results are also left on window.__selfcheck for automated callers.
 */

(function () {
  'use strict';

  const TUTORIALS = [1, 2, 3, 4, 5];
  const correctIdx = opts => opts.findIndex(o => o.correct);

  function correctResponse(s) {
    switch (s.kind) {
      case 'numeric': return { value: String(s.answer) };
      case 'interval': return { lower: String(s.lower), upper: String(s.upper) };
      case 'formula': return { value: s.answer };
      case 'choice':
      case 'sketch': return { value: String(correctIdx(s.options)) };
      case 'multi': return {
        values: s.options.map((o, i) => (o.correct ? String(i) : null)).filter(Boolean)
      };
      case 'table': {
        const values = {};
        (s.cells || []).forEach(c => { values[c.key] = String(c.answer); });
        return { values };
      }
      case 'decision': return {
        value: s.answer,
        reason: s.reasons ? String(correctIdx(s.reasons)) : null
      };
      case 'hypothesis': {
        const values = {};
        (s.parts || []).forEach(p => { values[p.key] = String(correctIdx(p.options)); });
        return { values };
      }
      case 'freetext': return { value: 'x'.repeat((s.min_length || 20) + 10) };
      default: return {};
    }
  }

  async function run() {
    const fails = [];
    const byKind = {};
    let steps = 0, correctChecks = 0, trapChecks = 0;

    for (const n of TUTORIALS) {
      const res = await fetch('../content/tutorial-' + n + '.yml', { cache: 'no-cache' });
      const doc = jsyaml.load(await res.text());

      for (const q of doc.questions || []) {
        for (const [si, s] of (q.steps || []).entries()) {
          steps++;
          byKind[s.kind] = (byKind[s.kind] || 0) + 1;
          const where = 'T' + n + ' ' + q.id + ' step ' + si + ' (' + s.kind + ')';

          const want = s.kind === 'freetext' ? 'self' : 'ok';
          const v = Check.run(s, correctResponse(s));
          correctChecks++;
          if (v.state !== want) {
            fails.push(where + ': the correct answer was scored "' + v.state +
                       '", expected "' + want + '"');
          }

          // Alternates must genuinely be accepted. It is easy to list an
          // also_accept value that sits outside the step's tolerance, and the
          // symptom is a student's correct answer being marked wrong.
          for (const alt of s.also_accept || []) {
            correctChecks++;
            const resp = s.kind === 'formula' ? { value: alt } : { value: String(alt) };
            const av = Check.run(s, resp);
            if (av.state !== 'ok') {
              fails.push(where + ': also_accept ' + alt + ' was scored "' +
                         av.state + '" — it falls outside the tolerance');
            }
          }
          for (const c of s.cells || []) {
            for (const alt of c.also_accept || []) {
              correctChecks++;
              const values = {};
              s.cells.forEach(x => { values[x.key] = String(x.answer); });
              values[c.key] = String(alt);
              const av = Check.run(s, { values });
              if (av.state !== 'ok') {
                fails.push(where + ': cell ' + c.key + ' also_accept ' + alt +
                           ' was scored "' + av.state + '" — outside the tolerance');
              }
            }
          }

          for (const t of s.traps || []) {
            if (t.value == null) continue;
            trapChecks++;
            const resp = s.kind === 'interval'
              ? { lower: String(t.value), upper: String(s.upper) }
              : { value: String(t.value) };
            const tv = Check.run(s, resp);
            if (tv.state !== 'bad') {
              fails.push(where + ': trap ' + t.value + ' scored "' + tv.state + '", expected "bad"');
            } else if (tv.feedback !== t.feedback) {
              fails.push(where + ': trap ' + t.value + ' fell through to the generic message');
            }
          }

          for (const c of s.cells || []) {
            for (const t of c.traps || []) {
              trapChecks++;
              const values = {};
              s.cells.forEach(x => { values[x.key] = String(x.answer); });
              values[c.key] = String(t.value);
              const tv = Check.run(s, { values });
              if (tv.feedback !== t.feedback) {
                fails.push(where + ': cell ' + c.key + ' trap ' + t.value +
                           ' fell through to the generic message');
              }
            }
          }

          for (const [oi, o] of (s.options || []).entries()) {
            if (o.correct) continue;
            trapChecks++;
            const tv = Check.run(s, s.kind === 'multi'
              ? { values: [String(oi)] } : { value: String(oi) });
            const label = o.value || o.caption;
            if (tv.state !== 'bad') {
              fails.push(where + ': distractor "' + label + '" scored "' + tv.state + '"');
            } else if (tv.feedback !== o.feedback) {
              fails.push(where + ': distractor "' + label + '" fell through to the generic message');
            }
          }

          for (const p of s.parts || []) {
            for (const [oi, o] of p.options.entries()) {
              if (o.correct) continue;
              trapChecks++;
              const values = {};
              s.parts.forEach(x => { values[x.key] = String(correctIdx(x.options)); });
              values[p.key] = String(oi);
              const tv = Check.run(s, { values });
              if (tv.feedback !== o.feedback) {
                fails.push(where + ': ' + p.key + ' option "' + o.value +
                           '" fell through to the generic message');
              }
            }
          }

          for (const [ri, r] of (s.reasons || []).entries()) {
            if (r.correct) continue;
            trapChecks++;
            const tv = Check.run(s, { value: s.answer, reason: String(ri) });
            if (tv.feedback !== r.feedback) {
              fails.push(where + ': reason "' + r.value +
                         '" fell through to the generic message');
            }
          }
        }
      }
    }
    return { steps, correctChecks, trapChecks, byKind, fails };
  }

  function render(r) {
    const out = document.getElementById('out');
    const kinds = Object.entries(r.byKind).sort((a, b) => b[1] - a[1])
      .map(([k, v]) => '<tr><td>' + k + '</td><td class="num">' + v + '</td></tr>').join('');

    out.innerHTML =
      (r.fails.length
        ? '<div class="verdict bad"><strong>' + r.fails.length +
          ' checks failed</strong></div>'
        : '<div class="verdict ok"><strong>All ' +
          (r.correctChecks + r.trapChecks) + ' checks passed.</strong></div>') +
      '<p>' + r.steps + ' steps · ' + r.correctChecks +
      ' correct-answer checks · ' + r.trapChecks +
      ' trap and distractor checks.</p>' +
      (r.fails.length
        ? '<ul>' + r.fails.map(f => '<li><code>' + f + '</code></li>').join('') + '</ul>'
        : '') +
      '<h3>Steps by kind</h3><div class="table-scroll"><table><thead><tr>' +
      '<th>Kind</th><th class="num">Count</th></tr></thead><tbody>' +
      kinds + '</tbody></table></div>';
  }

  run().then(r => {
    window.__selfcheck = r;
    render(r);
  }).catch(err => {
    document.getElementById('out').innerHTML =
      '<div class="verdict bad"><strong>Could not run</strong>' +
      '<span class="why">' + err.message + '. Serve the site over HTTP — ' +
      'opening this file directly will block the content fetches.</span></div>';
  });
})();
