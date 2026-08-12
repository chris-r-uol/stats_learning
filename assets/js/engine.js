/* Renders a tutorial from its YAML file and wires up checking.
 *
 * Loaded as <script src="engine.js" data-tutorial="1">, or with ?t=1.
 */

(function (global) {
  'use strict';

  const LANGS = [
    { key: 'excel', label: 'Excel' },
    { key: 'r', label: 'R' },
    { key: 'python', label: 'Python' }
  ];

  /* ---------------------------------------------------------------- utils */

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') node.className = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'text') node.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') {
          node.addEventListener(k.slice(2).toLowerCase(), v);
        } else node.setAttribute(k, v === true ? '' : v);
      }
    }
    (Array.isArray(children) ? children : children ? [children] : [])
      .forEach(c => {
        if (c == null || c === false) return;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    return node;
  }

  function md(text) {
    if (text == null) return '';
    const raw = String(text);
    if (!global.marked) return raw.replace(/</g, '&lt;');
    return global.marked.parse(raw, { breaks: false, gfm: true });
  }

  function mdInline(text) {
    if (text == null) return '';
    if (!global.marked) return String(text).replace(/</g, '&lt;');
    return global.marked.parseInline(String(text), { gfm: true });
  }

  function htmlBlock(text, cls) {
    const d = el('div', { class: cls || 'prose', html: md(text) });
    // Long tables and code shouldn't force the page to scroll sideways.
    d.querySelectorAll('table').forEach(t => {
      const wrap = el('div', { class: 'table-scroll' });
      t.parentNode.insertBefore(wrap, t);
      wrap.appendChild(t);
    });
    return d;
  }

  /* ------------------------------------------------------------ language */

  const langSubscribers = new Set();

  function currentLang() { return Progress.lang(); }

  function setLang(key) {
    Progress.setLang(key);
    langSubscribers.forEach(fn => fn(key));
  }

  function langTabs(solution) {
    const present = LANGS.filter(l => solution[l.key]);
    if (!present.length) return null;

    const wrap = el('div', { class: 'langtabs' });
    const tabs = el('div', { class: 'tabs', role: 'tablist' });
    const panels = [];

    present.forEach(l => {
      const panel = el('div', {
        class: 'panel', role: 'tabpanel', 'aria-label': l.label + ' solution'
      });
      panel.appendChild(htmlBlock(
        /^\s*```/.test(solution[l.key])
          ? solution[l.key]
          : '```\n' + String(solution[l.key]).trim() + '\n```'
      ));
      if (solution[l.key + '_note']) {
        panel.appendChild(el('div', {
          class: 'note small', html: md(solution[l.key + '_note'])
        }));
      }
      panels.push({ key: l.key, node: panel });

      const btn = el('button', {
        type: 'button', role: 'tab', text: l.label,
        onclick: () => setLang(l.key)
      });
      btn.dataset.lang = l.key;
      tabs.appendChild(btn);
    });

    wrap.appendChild(tabs);
    panels.forEach(p => wrap.appendChild(p.node));

    function sync(active) {
      // Fall back to the first available language when the student's preferred
      // one has no snippet for this step.
      const has = present.some(l => l.key === active);
      const use = has ? active : present[0].key;
      tabs.querySelectorAll('button').forEach(b => {
        b.setAttribute('aria-selected', String(b.dataset.lang === use));
      });
      panels.forEach(p => { p.node.hidden = p.key !== use; });
    }
    sync(currentLang());
    langSubscribers.add(sync);
    return wrap;
  }

  function solutionBox(solution, label) {
    if (!solution) return null;
    const box = el('details', { class: 'solution' });
    box.appendChild(el('summary', { text: label || 'Show the worked solution' }));
    const body = el('div', { class: 'sol-body' });
    if (solution.working) body.appendChild(htmlBlock(solution.working));
    const tabs = langTabs(solution);
    if (tabs) body.appendChild(tabs);
    if (solution.note) {
      body.appendChild(el('div', { class: 'note small', html: md(solution.note) }));
    }
    box.appendChild(body);
    return box;
  }

  /* ------------------------------------------------------------ step UI */

  // Each builder returns { node, read } where read() collects the response.
  const BUILDERS = {
    numeric(step) {
      const input = el('input', {
        type: 'text', inputmode: 'decimal', 'aria-label': 'Your answer',
        placeholder: step.placeholder || 'your answer'
      });
      const row = el('div', { class: 'answer-row' }, [
        input,
        step.unit ? el('span', { class: 'unit', text: step.unit }) : null
      ]);
      return { node: row, read: () => ({ value: input.value }), focus: () => input.focus() };
    },

    interval(step) {
      const lo = el('input', { type: 'text', inputmode: 'decimal', 'aria-label': 'Lower bound' });
      const hi = el('input', { type: 'text', inputmode: 'decimal', 'aria-label': 'Upper bound' });
      const row = el('div', { class: 'answer-row' }, [
        el('span', { class: 'unit', text: 'lower' }), lo,
        el('span', { class: 'unit', text: 'upper' }), hi,
        step.unit ? el('span', { class: 'unit', text: step.unit }) : null
      ]);
      return {
        node: row,
        read: () => ({ lower: lo.value, upper: hi.value }),
        focus: () => lo.focus(),
        mark(detail) {
          if (!detail) return;
          lo.classList.toggle('is-ok', detail.okLo === true);
          hi.classList.toggle('is-ok', detail.okHi === true);
        }
      };
    },

    choice(step, id) {
      const box = el('div', { class: 'opts', role: 'radiogroup' });
      const inputs = [];
      step.options.forEach((opt, i) => {
        const input = el('input', { type: 'radio', name: id, value: String(i) });
        const label = el('label', { class: 'opt' + (step.prose ? ' prose' : '') }, [
          input,
          el('span', { class: 'opt-label', html: mdInline(opt.value) })
        ]);
        inputs.push({ input, label, opt });
        box.appendChild(label);
      });
      return {
        node: box,
        read: () => {
          const hit = inputs.find(x => x.input.checked);
          return { value: hit ? hit.input.value : '' };
        },
        mark(_d, verdict) {
          inputs.forEach(x => {
            x.label.classList.remove('is-ok', 'is-bad');
            if (!x.input.checked) return;
            x.label.classList.add(verdict.state === 'ok' ? 'is-ok' : 'is-bad');
          });
        }
      };
    },

    multi(step, id) {
      const box = el('div', { class: 'opts' });
      const inputs = [];
      step.options.forEach((opt, i) => {
        const input = el('input', { type: 'checkbox', name: id, value: String(i) });
        const label = el('label', { class: 'opt' + (step.prose ? ' prose' : '') }, [
          input, el('span', { class: 'opt-label', html: mdInline(opt.value) })
        ]);
        inputs.push({ input, label });
        box.appendChild(label);
      });
      return {
        node: box,
        read: () => ({ values: inputs.filter(x => x.input.checked).map(x => x.input.value) }),
        mark(_d, verdict) {
          inputs.forEach(x => {
            x.label.classList.remove('is-ok', 'is-bad');
            if (x.input.checked) {
              x.label.classList.add(verdict.state === 'ok' ? 'is-ok' : 'is-bad');
            }
          });
        }
      };
    },

    formula(step) {
      const input = el('input', {
        type: 'text', class: 'mono', spellcheck: 'false',
        'aria-label': 'Your formula',
        placeholder: step.placeholder || '=FUNCTION(...)'
      });
      return {
        node: el('div', { class: 'answer-row' }, input),
        read: () => ({ value: input.value }),
        focus: () => input.focus()
      };
    },

    table(step) {
      const wrap = el('div', { class: 'gridtable' });
      const table = el('table');
      if (step.columns) {
        const tr = el('tr');
        tr.appendChild(el('th', { text: step.corner || '' }));
        step.columns.forEach(c => tr.appendChild(el('th', { html: mdInline(c) })));
        table.appendChild(el('thead', null, tr));
      }
      const tbody = el('tbody');
      const inputs = {};
      (step.rows || []).forEach((rowLabel, ri) => {
        const tr = el('tr');
        tr.appendChild(el('th', { html: mdInline(rowLabel), scope: 'row' }));
        (step.columns || []).forEach((_c, ci) => {
          const cell = (step.cells || []).find(x => x.row === ri && x.col === ci);
          const td = el('td');
          if (!cell) {
            const given = (step.given || {})[ri + ',' + ci];
            td.className = 'given';
            td.textContent = given != null ? given : '';
          } else {
            const input = el('input', {
              type: 'text', inputmode: 'decimal',
              'aria-label': rowLabel + ' ' + step.columns[ci]
            });
            inputs[cell.key] = input;
            td.appendChild(input);
          }
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      wrap.appendChild(table);
      return {
        node: wrap,
        read: () => {
          const values = {};
          for (const [k, input] of Object.entries(inputs)) values[k] = input.value;
          return { values };
        },
        mark(detail) {
          for (const [k, input] of Object.entries(inputs)) {
            input.classList.remove('is-ok', 'is-bad');
            const s = detail && detail[k];
            if (s === 'ok') input.classList.add('is-ok');
            else if (s === 'bad') input.classList.add('is-bad');
          }
        }
      };
    },

    decision(step, id) {
      const wrap = el('div');
      const decBox = el('div', { class: 'opts', role: 'radiogroup' });
      const decInputs = [];
      [['reject', 'Reject H₀'], ['fail', 'Do not reject H₀']].forEach(([v, label]) => {
        const input = el('input', { type: 'radio', name: id + '-d', value: v });
        const lab = el('label', { class: 'opt prose' }, [
          input, el('span', { class: 'opt-label', text: label })
        ]);
        decInputs.push({ input, lab });
        decBox.appendChild(lab);
      });
      wrap.appendChild(decBox);

      const reasonInputs = [];
      if (step.reasons) {
        wrap.appendChild(el('div', { class: 'sublabel', text: 'Because' }));
        const rBox = el('div', { class: 'opts', role: 'radiogroup' });
        step.reasons.forEach((r, i) => {
          const input = el('input', { type: 'radio', name: id + '-r', value: String(i) });
          const lab = el('label', { class: 'opt prose' }, [
            input, el('span', { class: 'opt-label', html: mdInline(r.value) })
          ]);
          reasonInputs.push({ input, lab });
          rBox.appendChild(lab);
        });
        wrap.appendChild(rBox);
      }

      return {
        node: wrap,
        read: () => {
          const d = decInputs.find(x => x.input.checked);
          const r = reasonInputs.find(x => x.input.checked);
          return { value: d ? d.input.value : '', reason: r ? r.input.value : null };
        },
        mark(_d, verdict) {
          [].concat(decInputs, reasonInputs).forEach(x => {
            x.lab.classList.remove('is-ok', 'is-bad');
            if (x.input.checked) {
              x.lab.classList.add(verdict.state === 'ok' ? 'is-ok' : 'is-bad');
            }
          });
        }
      };
    },

    hypothesis(step, id) {
      const wrap = el('div', { class: 'subgrid' });
      const selects = {};
      (step.parts || []).forEach(part => {
        const box = el('div');
        box.appendChild(el('div', { class: 'sublabel', text: part.label }));
        const sel = el('select', { 'aria-label': part.label });
        sel.appendChild(el('option', { value: '', text: 'choose...' }));
        part.options.forEach((o, i) => {
          sel.appendChild(el('option', { value: String(i), text: o.value }));
        });
        selects[part.key] = sel;
        box.appendChild(sel);
        wrap.appendChild(box);
      });
      return {
        node: wrap,
        read: () => {
          const values = {};
          for (const [k, s] of Object.entries(selects)) if (s.value !== '') values[k] = s.value;
          return { values };
        }
      };
    },

    freetext(step) {
      const ta = el('textarea', {
        'aria-label': 'Your answer',
        placeholder: step.placeholder || 'Write your interpretation in full sentences...'
      });
      return { node: ta, read: () => ({ value: ta.value }), focus: () => ta.focus() };
    },

    sketch(step, id) {
      const box = el('div', { class: 'sketchopts' });
      const opts = [];
      step.options.forEach((opt, i) => {
        const input = el('input', {
          type: 'radio', name: id, value: String(i),
          class: 'visually-hidden', style: 'position:absolute;opacity:0;'
        });
        const label = el('label', { class: 'sketchopt' }, [
          input,
          el('div', { html: opt.svg || '' }),
          el('div', { class: 'cap', text: opt.caption || ('Option ' + (i + 1)) })
        ]);
        opts.push({ input, label });
        box.appendChild(label);
      });
      return {
        node: box,
        read: () => {
          const hit = opts.find(x => x.input.checked);
          return { value: hit ? hit.input.value : '' };
        },
        mark(_d, verdict) {
          opts.forEach(x => {
            x.label.classList.remove('is-ok', 'is-bad');
            if (x.input.checked) {
              x.label.classList.add(verdict.state === 'ok' ? 'is-ok' : 'is-bad');
            }
          });
        }
      };
    }
  };

  /* --------------------------------------------------------- render step */

  function renderStep(step, stepId, index, onStatus) {
    const wrap = el('div', { class: 'step', id: stepId });
    if (step.ask) {
      wrap.appendChild(el('p', {
        class: 'ask',
        html: '<span class="idx">' + (index + 1) + '.</span> ' + mdInline(step.ask)
      }));
    }
    if (step.body) wrap.appendChild(htmlBlock(step.body));

    const builder = BUILDERS[step.kind];
    if (!builder) {
      wrap.appendChild(el('div', {
        class: 'verdict bad', text: 'Unsupported question type: ' + step.kind
      }));
      return wrap;
    }
    const ui = builder(step, stepId);
    wrap.appendChild(ui.node);

    const verdict = el('div', { class: 'verdict', hidden: true, 'aria-live': 'polite' });
    wrap.appendChild(verdict);

    const actions = el('div', { class: 'step-actions' });
    const checkBtn = el('button', { class: 'btn', type: 'button', text: 'Check' });
    actions.appendChild(checkBtn);

    const hints = step.hints || [];
    let hintsShown = 0;
    const hintBtn = hints.length
      ? el('button', { class: 'btn quiet small', type: 'button', text: 'Hint' })
      : null;
    if (hintBtn) actions.appendChild(hintBtn);

    // Free-text steps are marked by the student against a model answer, so the
    // "reveal" affordance is the point rather than a last resort.
    const isSelf = step.kind === 'freetext';
    const revealBtn = el('button', {
      class: 'btn quiet small', type: 'button',
      text: isSelf ? 'Show the model answer' : 'Show me the answer'
    });
    actions.appendChild(revealBtn);
    wrap.appendChild(actions);

    const hintBox = el('div', { class: 'verdict hint', hidden: true });
    wrap.appendChild(hintBox);

    const solution = solutionBox(step.solution,
      isSelf ? 'Model answer and self-check' : undefined);
    if (solution) {
      solution.hidden = true;
      wrap.appendChild(solution);
    }

    const rubric = isSelf && step.rubric ? buildRubric(step, stepId, onStatus) : null;
    if (rubric) { rubric.hidden = true; wrap.appendChild(rubric); }

    function showVerdict(v) {
      verdict.hidden = false;
      verdict.className = 'verdict ' + (
        v.state === 'ok' ? 'ok' : v.state === 'empty' ? 'hint' : 'bad');
      const head = v.state === 'ok' ? 'Correct.'
        : v.state === 'empty' ? ''
        : v.trapped ? 'Not quite — and this is a common one.' : 'Not quite.';
      verdict.innerHTML =
        (head ? '<strong>' + head + '</strong>' : '') +
        (v.feedback ? '<span class="why">' + md(v.feedback) + '</span>' : '');
    }

    function doCheck() {
      const response = ui.read();
      const v = Check.run(step, response);
      if (ui.mark) ui.mark(v.detail, v);

      if (v.state === 'self') {
        verdict.hidden = true;
        if (solution) { solution.hidden = false; solution.open = true; }
        if (rubric) rubric.hidden = false;
        Progress.record(stepId, 'self');
        onStatus();
        return;
      }
      showVerdict(v);
      if (v.state === 'empty') return;
      Progress.record(stepId, v.state);
      onStatus();

      // Two honest attempts earns the worked solution without having to ask.
      if (v.state === 'bad' && solution && Progress.attempts(stepId) >= 2) {
        solution.hidden = false;
      }
      if (v.state === 'ok' && solution) solution.hidden = false;
    }

    checkBtn.addEventListener('click', doCheck);
    wrap.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
        e.preventDefault();
        doCheck();
      }
    });

    if (hintBtn) {
      hintBtn.addEventListener('click', () => {
        if (hintsShown >= hints.length) return;
        hintsShown++;
        hintBox.hidden = false;
        hintBox.innerHTML = hints.slice(0, hintsShown)
          .map((h, i) => '<div><strong>Hint ' + (i + 1) + '.</strong> ' + md(h) + '</div>')
          .join('');
        hintBtn.textContent = hintsShown >= hints.length
          ? 'No more hints' : 'Another hint';
        hintBtn.disabled = hintsShown >= hints.length;
      });
    }

    revealBtn.addEventListener('click', () => {
      if (solution) { solution.hidden = false; solution.open = true; }
      if (rubric) rubric.hidden = false;
      if (!isSelf) {
        Progress.record(stepId, 'revealed');
        onStatus();
      }
      revealBtn.disabled = true;
    });

    // Restore what the student did last time.
    const saved = Progress.get(stepId);
    if (saved && (saved.status === 'ok' || saved.status === 'self')) {
      verdict.hidden = false;
      verdict.className = 'verdict ok';
      verdict.innerHTML = '<strong>' + (saved.status === 'self'
        ? 'Marked as reviewed in an earlier session.'
        : 'You answered this correctly in an earlier session.') + '</strong>';
      if (solution) solution.hidden = false;
      if (rubric) rubric.hidden = false;
    } else if (saved && saved.status === 'revealed' && solution) {
      solution.hidden = false;
    }

    return wrap;
  }

  function buildRubric(step, stepId, onStatus) {
    const box = el('div', { class: 'note' });
    box.appendChild(el('span', {
      class: 'note-title', text: 'Mark your own answer'
    }));
    box.appendChild(el('p', {
      class: 'small muted',
      text: 'Compare what you wrote with the model answer. Tick each point you covered.'
    }));
    const list = el('ul', { class: 'rubric' });
    step.rubric.forEach((point, i) => {
      const cb = el('input', { type: 'checkbox', id: stepId + '-r' + i });
      const saved = Progress.get(stepId);
      if (saved && saved.rubric && saved.rubric[i]) cb.checked = true;
      cb.addEventListener('change', () => {
        const ticks = Array.from(list.querySelectorAll('input')).map(x => x.checked);
        Progress.record(stepId, 'self', { rubric: ticks });
        onStatus();
      });
      list.appendChild(el('li', null, [
        cb, el('label', { for: stepId + '-r' + i, html: mdInline(point) })
      ]));
    });
    box.appendChild(list);
    return box;
  }

  /* ----------------------------------------------------- render question */

  function renderQuestion(q, tutorialNumber, onStatus) {
    const card = el('section', { class: 'question', id: q.id });
    const header = el('header');
    header.appendChild(el('h2', { text: q.title || q.id }));
    const pill = el('span', { class: 'pill', text: '0/0' });
    header.appendChild(pill);
    if (q.dataset_label) {
      header.appendChild(el('span', { class: 'pill ds', text: q.dataset_label }));
    }
    card.appendChild(header);

    const body = el('div', { class: 'qbody' });
    if (q.prompt) body.appendChild(htmlBlock(q.prompt));
    if (q.note) body.appendChild(el('div', { class: 'note', html: md(q.note) }));

    const stepIds = [];
    (q.steps || []).forEach((step, i) => {
      const stepId = q.id + '-s' + i;
      stepIds.push(stepId);
      body.appendChild(renderStep(step, stepId, i, onStatus));
    });

    if (q.solution) {
      const box = solutionBox(q.solution, 'Show the full worked solution');
      if (box) body.appendChild(box);
    }
    card.appendChild(body);

    function refresh() {
      const s = Progress.summary(stepIds);
      pill.textContent = s.done + '/' + s.total;
      pill.className = 'pill' + (s.done === s.total && s.total
        ? ' done' : s.done || s.tried ? ' part' : '');
    }
    refresh();
    Progress.onChange(refresh);
    return { node: card, stepIds, refresh };
  }

  /* --------------------------------------------------------------- page */

  async function loadTutorial(number, mount) {
    const url = 'content/tutorial-' + number + '.yml';
    let doc;
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      doc = jsyaml.load(await res.text());
    } catch (err) {
      mount.appendChild(el('div', { class: 'card' }, [
        el('h2', { text: 'Could not load this tutorial' }),
        el('p', {
          text: 'Tried to fetch ' + url + ' and got: ' + err.message
        }),
        el('p', {
          class: 'small muted',
          text: 'If you opened this file directly from your computer, your ' +
                'browser will block the request. Serve the folder over HTTP ' +
                'instead, or use the published site.'
        })
      ]));
      return null;
    }
    return doc;
  }

  function renderTutorial(doc, root) {
    document.title = 'Tutorial ' + doc.tutorial + ' — ' + doc.title +
                     ' — Transport Statistics';

    const head = el('div', { class: 'page-head' });
    head.appendChild(el('div', { class: 'eyebrow', text: 'Tutorial ' + doc.tutorial }));
    head.appendChild(el('h1', { text: doc.title }));
    if (doc.intro) head.appendChild(htmlBlock(doc.intro, 'lede'));
    root.appendChild(head);

    if (doc.learning_outcomes && doc.learning_outcomes.length) {
      const card = el('div', { class: 'card' });
      card.appendChild(el('h2', { text: 'What you should be able to do afterwards' }));
      const ul = el('ul');
      doc.learning_outcomes.forEach(o => ul.appendChild(el('li', { html: mdInline(o) })));
      card.appendChild(ul);
      root.appendChild(card);
    }

    if (doc.datasets && doc.datasets.length) {
      const card = el('div', { class: 'card' });
      card.appendChild(el('h2', { text: 'Data for this tutorial' }));
      card.appendChild(el('p', {
        class: 'small muted',
        text: 'The workbook has one sheet per dataset. CSV copies are there for ' +
              'R and Python users.'
      }));
      const chips = el('div', { class: 'chiplist' });
      chips.appendChild(el('a', {
        class: 'chip', href: 'data/xlsx/transport-stats-data.xlsx',
        text: 'Download the Excel workbook'
      }));
      doc.datasets.forEach(d => {
        if (!d.csv) return;
        chips.appendChild(el('a', {
          class: 'chip', href: 'data/csv/' + d.csv, text: d.name + ' (CSV)'
        }));
      });
      card.appendChild(chips);
      if (doc.data_note) card.appendChild(el('div', { class: 'note small', html: md(doc.data_note) }));
      root.appendChild(card);
    }

    if (doc.supplementary) {
      const card = el('div', { class: 'card' });
      card.appendChild(el('h2', { text: 'Before you start' }));
      card.appendChild(htmlBlock(doc.supplementary));
      root.appendChild(card);
    }

    const allStepIds = [];
    const questions = [];
    const container = el('div');
    root.appendChild(container);

    const onStatus = () => { questions.forEach(q => q.refresh()); updateSidebar(); };

    (doc.questions || []).forEach(q => {
      const rendered = renderQuestion(q, doc.tutorial, onStatus);
      questions.push(rendered);
      allStepIds.push.apply(allStepIds, rendered.stepIds);
      container.appendChild(rendered.node);
    });

    /* sidebar: contents + progress */
    const side = document.getElementById('sidebar');
    let bar, meta, tocList;
    if (side) {
      const card = el('div', { class: 'card toc' });
      card.appendChild(el('h3', { text: 'Your progress' }));
      bar = el('i');
      card.appendChild(el('div', { class: 'progress-bar' }, bar));
      meta = el('div', { class: 'progress-meta' });
      card.appendChild(meta);
      tocList = el('ol');
      card.appendChild(el('h3', { text: 'Questions', style: 'margin-top:1rem' }));
      card.appendChild(tocList);
      (doc.questions || []).forEach((q, i) => {
        const dot = el('span', { class: 'dot' });
        const a = el('a', { href: '#' + q.id }, [dot, el('span', { text: q.title || q.id })]);
        a.dataset.qi = String(i);
        tocList.appendChild(el('li', null, a));
      });
      const reset = el('button', {
        class: 'btn quiet small', type: 'button', text: 'Reset this tutorial',
        style: 'margin-top:1rem',
        onclick: () => {
          if (confirm('Clear your saved answers for this tutorial? This cannot be undone.')) {
            Progress.reset(allStepIds);
            location.reload();
          }
        }
      });
      card.appendChild(reset);
      side.appendChild(card);
    }

    function updateSidebar() {
      if (!side) return;
      const s = Progress.summary(allStepIds);
      const pct = s.total ? Math.round(100 * s.done / s.total) : 0;
      bar.style.width = pct + '%';
      meta.textContent = s.done + ' of ' + s.total + ' steps done (' + pct + '%)';
      questions.forEach((q, i) => {
        const qs = Progress.summary(q.stepIds);
        const dot = tocList.querySelector('a[data-qi="' + i + '"] .dot');
        if (!dot) return;
        dot.className = 'dot' + (qs.done === qs.total && qs.total ? ' done'
          : qs.done || qs.tried ? ' part' : '');
      });
    }
    updateSidebar();

    if (!Progress.available) {
      root.insertBefore(el('div', {
        class: 'note warn',
        html: '<span class="note-title">Progress will not be saved</span>' +
              'Your browser is blocking local storage, probably because you are ' +
              'in private browsing. Everything still works — but ticks will be ' +
              'gone when you close the tab.'
      }), container);
    }

    return { allStepIds, doc };
  }

  /* ---------------------------------------------------------------- boot */

  async function boot() {
    const root = document.getElementById('tutorial-root');
    if (!root) return;
    const script = document.querySelector('script[data-tutorial]');
    const params = new URLSearchParams(location.search);
    const number = params.get('t') ||
      (script && script.getAttribute('data-tutorial')) || '1';

    const doc = await loadTutorial(number, root);
    if (!doc) return;
    renderTutorial(doc, root);

    // Deep links to a question should still land in the right place after the
    // asynchronous render.
    if (location.hash) {
      const target = document.querySelector(location.hash);
      if (target) target.scrollIntoView();
    }
  }

  global.Engine = { boot, renderTutorial, md, mdInline, el, setLang, LANGS };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
