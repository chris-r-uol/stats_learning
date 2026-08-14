/* Answer checking.
 *
 * Every checker returns the same shape:
 *   { state: 'ok' | 'bad' | 'empty', feedback: <markdown string or null>,
 *     detail: <optional per-part info for the renderer> }
 *
 * 'feedback' is the whole point. A bare "incorrect" teaches nothing, so a wrong
 * answer is first compared against the question's known traps -- the specific
 * mistakes this material provokes -- and only falls back to a generic message
 * when it matches none of them.
 */

(function (global) {
  'use strict';

  /* ---------------------------------------------------------------- utils */

  // Accepts 1,234.5  |  1.2e-3  |  12%  |  1/3  |  leading '=' from Excel users
  function parseNumber(raw) {
    if (raw == null) return NaN;
    let s = String(raw).trim();
    if (!s) return NaN;
    s = s.replace(/^=+/, '').replace(/,/g, '').replace(/\s+/g, '');
    let pct = false;
    if (s.endsWith('%')) { pct = true; s = s.slice(0, -1); }
    let v;
    const frac = s.match(/^(-?\d*\.?\d+)\/(-?\d*\.?\d+)$/);
    if (frac) {
      v = parseFloat(frac[1]) / parseFloat(frac[2]);
    } else if (/^-?\d*\.?\d+(e-?\+?\d+)?$/i.test(s)) {
      v = parseFloat(s);
    } else {
      return NaN;
    }
    return pct ? v / 100 : v;
  }

  // Tolerance may be {abs: n}, {rel: n}, {abs: n, rel: n}, or a bare number.
  function withinTol(got, want, tol) {
    if (tol == null) tol = { abs: 0.005 };
    if (typeof tol === 'number') tol = { abs: tol };
    const abs = tol.abs != null ? tol.abs : 0;
    const rel = tol.rel != null ? Math.abs(want) * tol.rel : 0;
    const allowed = Math.max(abs, rel, 0);
    return Math.abs(got - want) <= allowed + 1e-12;
  }

  // A trap can carry its own tolerance; otherwise it borrows the step's.
  function matchTrap(value, traps, stepTol) {
    if (!traps) return null;
    for (const trap of traps) {
      if (trap.value == null) continue;
      const tol = trap.tol != null ? trap.tol : stepTol;
      if (withinTol(value, Number(trap.value), tol)) return trap;
    }
    return null;
  }

  const GENERIC = 'Not correct. Check the numbers you used in the formula. ' +
                  'The hint below may help.';

  function numericVerdict(value, step) {
    if (Number.isNaN(value)) {
      return { state: 'empty', feedback: 'Enter a number to check it.' };
    }
    const accepted = [step.answer].concat(step.also_accept || []);
    for (const a of accepted) {
      if (a == null) continue;
      if (withinTol(value, Number(a), step.tol)) {
        return { state: 'ok', feedback: step.on_correct || null };
      }
    }
    const trap = matchTrap(value, step.traps, step.tol);
    if (trap) return { state: 'bad', feedback: trap.feedback, trapped: true };

    // Percentage-for-proportion: Excel often *displays* 0.2316 as 23.16%, and
    // a student reading their own screen will type 23.16. Only diagnosed on
    // probability-shaped questions, so a genuine quantity that happens to be
    // 100x the answer is never mislabelled a percentage.
    if (step.answer != null) {
      const ans = Number(step.answer);
      const probLike = /probab|proportion|p-value|relative frequency/i
        .test(step.ask || '');
      if (probLike && ans > 0 && ans <= 1 &&
          withinTol(value / 100, ans, step.tol)) {
        return {
          state: 'bad', trapped: true,
          feedback: 'This is the right number, written as a percentage. ' +
                    'Your Excel cell is probably formatted to show a ' +
                    'percentage. This question needs a value between 0 and 1. ' +
                    'Divide by 100, or add a % sign to your answer.'
        };
      }
    }

    // Sign slips are common enough (z-scores, paired differences) to be worth
    // catching generically when the question has not named them explicitly.
    if (step.answer != null && withinTol(-value, Number(step.answer), step.tol)) {
      return {
        state: 'bad', trapped: true,
        feedback: 'The size is correct but the sign is wrong. Check which ' +
                  'value you subtracted from which. The order matters.'
      };
    }
    return { state: 'bad', feedback: step.on_wrong || GENERIC };
  }

  /* -------------------------------------------------------------- numeric */

  function checkNumeric(step, response) {
    return numericVerdict(parseNumber(response.value), step);
  }

  /* ------------------------------------------------------------- interval */

  function checkInterval(step, response) {
    const lo = parseNumber(response.lower);
    const hi = parseNumber(response.upper);
    if (Number.isNaN(lo) || Number.isNaN(hi)) {
      return { state: 'empty', feedback: 'Enter both bounds to check them.' };
    }
    const okLo = withinTol(lo, Number(step.lower), step.tol);
    const okHi = withinTol(hi, Number(step.upper), step.tol);
    if (okLo && okHi) return { state: 'ok', feedback: step.on_correct || null };

    // A named trap diagnoses the actual misunderstanding, so it takes priority
    // over the structural "wrong way round" message below -- a sign error will
    // usually trip both, and the specific explanation is the useful one.
    const trap = matchTrap(lo, step.traps, step.tol) ||
                 matchTrap(hi, step.traps, step.tol);
    if (trap) return { state: 'bad', feedback: trap.feedback, trapped: true };

    if (lo > hi) {
      return {
        state: 'bad', trapped: true,
        feedback: 'Your lower bound is larger than your upper bound. They ' +
                  'are the wrong way round. The lower bound uses the smaller ' +
                  'probability. For a 95% interval, that is 0.025.'
      };
    }

    // Using s instead of s/sqrt(n) is the classic interval-estimation error:
    // the interval comes out sqrt(n) times too wide, centred in the right place.
    const centre = (Number(step.lower) + Number(step.upper)) / 2;
    const wantHalf = Number(step.upper) - centre;
    const gotHalf = (hi - lo) / 2;
    const gotCentre = (lo + hi) / 2;
    if (Math.abs(gotCentre - centre) < Math.max(0.05, Math.abs(centre) * 0.01) &&
        gotHalf > wantHalf * 1.8 && step.n) {
      return {
        state: 'bad', trapped: true,
        feedback: 'The centre of your interval is correct, but it is far too ' +
                  'wide. You have used the standard deviation. Use the ' +
                  '**standard error**: divide the standard deviation by √' +
                  step.n + ' first.'
      };
    }
    return {
      state: 'bad',
      feedback: step.on_wrong || (okLo
        ? 'The lower bound is correct. The upper bound is not.'
        : okHi
          ? 'The upper bound is correct. The lower bound is not.'
          : GENERIC),
      detail: { okLo, okHi }
    };
  }

  /* -------------------------------------------------------- choice / multi */

  function checkChoice(step, response) {
    if (response.value == null || response.value === '') {
      return { state: 'empty', feedback: 'Select an option to check it.' };
    }
    const picked = step.options[Number(response.value)];
    if (!picked) return { state: 'empty', feedback: 'Select an option.' };
    if (picked.correct) return { state: 'ok', feedback: picked.feedback || step.on_correct || null };
    return { state: 'bad', feedback: picked.feedback || GENERIC, trapped: true };
  }

  function checkMulti(step, response) {
    const chosen = (response.values || []).map(Number);
    if (!chosen.length) {
      return { state: 'empty', feedback: 'Select at least one option.' };
    }
    const wanted = step.options
      .map((o, i) => (o.correct ? i : -1)).filter(i => i >= 0);
    const missed = wanted.filter(i => !chosen.includes(i));
    const extra = chosen.filter(i => !wanted.includes(i));
    if (!missed.length && !extra.length) {
      return { state: 'ok', feedback: step.on_correct || null };
    }
    if (extra.length) {
      const first = step.options[extra[0]];
      return { state: 'bad', trapped: true, feedback: first.feedback || GENERIC };
    }
    return {
      state: 'bad',
      feedback: 'Your selection is correct so far, but incomplete. There ' +
                (missed.length === 1 ? 'is one more option' :
                'are ' + missed.length + ' more options') + ' that also applies.'
    };
  }

  /* -------------------------------------------------------------- formula */

  // Normalise an Excel formula so cosmetic differences do not count as wrong:
  // case, spaces, a leading '=', $ anchors, and 1 vs TRUE for boolean flags.
  function normaliseFormula(raw) {
    let s = String(raw || '').trim().toUpperCase();
    s = s.replace(/\s+/g, '').replace(/^=+/, '').replace(/\$/g, '');
    s = s.replace(/\bTRUE\(\)/g, 'TRUE').replace(/\bFALSE\(\)/g, 'FALSE');
    s = s.replace(/([,(])1([,)])/g, '$1TRUE$2');
    s = s.replace(/([,(])0([,)])/g, '$1FALSE$2');
    s = s.replace(/;/g, ',');            // some locales use ; as the separator
    return s;
  }

  function checkFormula(step, response) {
    const got = normaliseFormula(response.value);
    if (!got) return { state: 'empty', feedback: 'Type a formula to check it.' };
    const accepted = [step.answer].concat(step.also_accept || []);
    for (const a of accepted) {
      if (a && normaliseFormula(a) === got) {
        return { state: 'ok', feedback: step.on_correct || null };
      }
    }
    for (const trap of step.traps || []) {
      if (trap.value && normaliseFormula(trap.value) === got) {
        return { state: 'bad', feedback: trap.feedback, trapped: true };
      }
      if (trap.pattern && new RegExp(trap.pattern, 'i').test(got)) {
        return { state: 'bad', feedback: trap.feedback, trapped: true };
      }
    }
    // Name the right function but get the arguments wrong -- worth saying so,
    // because the student's mental model is fine and only the detail is off.
    const wantFn = (normaliseFormula(step.answer).match(/^[A-Z0-9.]+/) || [])[0];
    const gotFn = (got.match(/^[A-Z0-9.]+/) || [])[0];
    if (wantFn && gotFn === wantFn) {
      return {
        state: 'bad',
        feedback: 'The function is correct, but the arguments are not. ' +
                  'Check their order, and check whether the cumulative flag ' +
                  'should be TRUE or FALSE.'
      };
    }
    if (gotFn && wantFn && gotFn !== wantFn) {
      return {
        state: 'bad',
        feedback: 'You have used `' + gotFn + '`. That is not the right ' +
                  'function here. Check whether you need to go from a value ' +
                  'to a probability, or from a probability to a value.'
      };
    }
    return { state: 'bad', feedback: step.on_wrong || GENERIC };
  }

  /* ---------------------------------------------------------------- table */

  function checkTable(step, response) {
    const cells = step.cells || [];
    const values = response.values || {};
    let filled = 0, correct = 0;
    const detail = {};
    for (const cell of cells) {
      const raw = values[cell.key];
      const v = parseNumber(raw);
      if (Number.isNaN(v)) { detail[cell.key] = 'empty'; continue; }
      filled++;
      const tol = cell.tol != null ? cell.tol : step.tol;
      const accepted = [cell.answer].concat(cell.also_accept || []);
      if (accepted.some(a => a != null && withinTol(v, Number(a), tol))) {
        correct++; detail[cell.key] = 'ok';
      } else {
        detail[cell.key] = 'bad';
      }
    }
    if (!filled) {
      return { state: 'empty', feedback: 'Complete the table to check it.', detail };
    }
    if (correct === cells.length) {
      return { state: 'ok', feedback: step.on_correct || null, detail };
    }

    // Which cells are wrong is more informative than how many. A whole row or
    // column being wrong points at a systematic misunderstanding, and that
    // explanation beats commenting on any individual cell.
    //
    // "Whole" matters: one wrong cell that happens to sit in a column is not
    // evidence the student has misunderstood the column. Every cell in it must
    // be wrong before the systematic message is justified.
    const wrong = cells.filter(c => detail[c.key] === 'bad');
    if (wrong.length) {
      const wholly = (axis, index) => {
        const inAxis = cells.filter(c => c[axis] === index);
        return inAxis.length > 1 && inAxis.every(c => detail[c.key] === 'bad');
      };
      const rows = new Set(wrong.map(c => c.row));
      const cols = new Set(wrong.map(c => c.col));
      if (rows.size === 1 && wholly('row', wrong[0].row)) {
        const rowFb = (step.row_feedback || {})[wrong[0].row];
        if (rowFb) return { state: 'bad', feedback: rowFb, detail, trapped: true };
      }
      if (cols.size === 1 && wholly('col', wrong[0].col)) {
        const colFb = (step.col_feedback || {})[wrong[0].col];
        if (colFb) return { state: 'bad', feedback: colFb, detail, trapped: true };
      }
      for (const c of wrong) {
        const trap = matchTrap(parseNumber(values[c.key]), c.traps, c.tol || step.tol);
        if (trap) return { state: 'bad', feedback: trap.feedback, detail, trapped: true };
      }
    }
    const blanks = cells.length - filled;
    return {
      state: 'bad', detail,
      feedback: correct + ' of ' + cells.length + ' cells are correct' +
                (blanks ? '. ' + blanks + ' are still empty' : '') +
                '. The incorrect cells have a red border.'
    };
  }

  /* ------------------------------------------------------------- decision */

  // Reject / do not reject, plus the reason. A student who reaches the right
  // conclusion from the wrong comparison has not understood the test, so both
  // halves must be right for the step to count.
  function checkDecision(step, response) {
    if (!response.value) {
      return { state: 'empty', feedback: 'Choose whether to reject the null hypothesis.' };
    }
    if (step.reasons && !response.reason) {
      return { state: 'empty', feedback: 'Now choose the reason for your decision.' };
    }
    const decisionOk = response.value === step.answer;
    const reason = step.reasons ? step.reasons[Number(response.reason)] : null;
    const reasonOk = !step.reasons || (reason && reason.correct);

    if (decisionOk && reasonOk) return { state: 'ok', feedback: step.on_correct || null };
    if (decisionOk && !reasonOk) {
      return {
        state: 'bad', trapped: true,
        feedback: (reason && reason.feedback) ||
          'The decision is correct, but the reason is not. Which comparison ' +
          'supports it?'
      };
    }
    const wrongFb = step.answer === 'reject'
      ? 'The evidence is strong enough to reject H₀. Compare your test ' +
        'statistic with the critical value, and your p-value with α.'
      : 'There is not enough evidence to reject H₀. Note that failing to ' +
        'reject H₀ does not prove that H₀ is true.';
    return { state: 'bad', feedback: step.on_wrong || wrongFb };
  }

  /* ----------------------------------------------------------- hypothesis */

  // H0, H1 and the number of tails, checked together.
  function checkHypothesis(step, response) {
    const parts = step.parts || [];
    const missing = parts.filter(p => !response.values || !response.values[p.key]);
    if (missing.length) {
      return { state: 'empty', feedback: 'Answer every part to check this step.' };
    }
    const wrong = [];
    for (const part of parts) {
      const picked = part.options[Number(response.values[part.key])];
      if (!picked || !picked.correct) wrong.push({ part, picked });
    }
    if (!wrong.length) return { state: 'ok', feedback: step.on_correct || null };
    const first = wrong[0];
    return {
      state: 'bad', trapped: !!(first.picked && first.picked.feedback),
      feedback: (first.picked && first.picked.feedback) ||
        'The ' + first.part.label.toLowerCase() + ' is not correct.'
    };
  }

  /* ---------------------------------------------------- self-assessed kinds */

  function checkFreetext(step, response) {
    const text = String(response.value || '').trim();
    if (text.length < (step.min_length || 20)) {
      return {
        state: 'empty',
        feedback: 'Write your answer in full sentences. Then open the model ' +
                  'answer and compare it with yours.'
      };
    }
    return { state: 'self', feedback: null };
  }

  function checkSketch(step, response) {
    if (response.value == null || response.value === '') {
      return { state: 'empty', feedback: 'Choose the diagram that matches the statement.' };
    }
    const picked = step.options[Number(response.value)];
    if (picked && picked.correct) return { state: 'ok', feedback: step.on_correct || null };
    return {
      state: 'bad', trapped: !!(picked && picked.feedback),
      feedback: (picked && picked.feedback) ||
        'Not this one. Look at which side of the line is shaded.'
    };
  }

  /* -------------------------------------------------------------- exports */

  const CHECKERS = {
    numeric: checkNumeric,
    interval: checkInterval,
    choice: checkChoice,
    multi: checkMulti,
    formula: checkFormula,
    table: checkTable,
    decision: checkDecision,
    hypothesis: checkHypothesis,
    freetext: checkFreetext,
    sketch: checkSketch
  };

  global.Check = {
    run(step, response) {
      const fn = CHECKERS[step.kind];
      if (!fn) return { state: 'empty', feedback: 'Unknown question type: ' + step.kind };
      return fn(step, response || {});
    },
    parseNumber,
    withinTol,
    normaliseFormula,
    kinds: Object.keys(CHECKERS)
  };
})(window);
