import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, withFrozenClock } from './harness.mjs';

let lua;
beforeEach(async () => {
  lua = await createEngine();
  await withFrozenClock(lua, 1700000000000);
});
afterEach(() => lua.global.close());

describe('Messages to the NUI', () => {
  test('a valid notification passes', async () => {
    const r = await lua.doString(`
      local out = NxcUi.Contracts.validateMessage({
        type = 'notify', text = 'Your wages arrived.', severity = 'success', durationMs = 5000,
      })
      local reason
      if not out.ok then reason = out.error.details.fields[1].reason end
      return { ok = out.ok, reason = reason }
    `);
    assert.equal(r.ok, true, r.reason);
  });

  test('an unknown message type is refused rather than ignored', async () => {
    const r = await lua.doString(`
      local out = NxcUi.Contracts.validateMessage({ type = 'notifi', text = 'oops' })
      return { ok = out.ok, reason = out.error.details.fields[1].reason }
    `);
    // A typo that silently produces nothing is a bug with no symptom. Enumerated
    // so it fails at the boundary instead.
    assert.equal(r.ok, false);
    assert.match(r.reason, /unknown message type: notifi/);
  });

  test('a notification duration is bounded at both ends', async () => {
    const r = await lua.doString(`
      local function reason(ms)
        local out = NxcUi.Contracts.validateMessage({ type = 'notify', text = 't', durationMs = ms })
        return out.ok and 'ok' or out.error.details.fields[1].reason
      end
      return { zero = reason(0), forever = reason(600000), fine = reason(4000) }
    `);
    // Both ends are reachable by arithmetic rather than intent: a duration
    // computed from a value that turned out nil is usually one or the other.
    assert.match(r.zero, /between 1000 and 30000/);
    assert.match(r.forever, /between 1000 and 30000/);
    assert.equal(r.fine, 'ok');
  });

  test('every state that can be blank must say something', async () => {
    const r = await lua.doString(`
      local function reason(m)
        local out = NxcUi.Contracts.validateMessage(m)
        return out.ok and 'ok' or out.error.details.fields[1].reason
      end
      return {
        emptyState = reason({ type = 'empty' }),
        errorState = reason({ type = 'error' }),
        progress   = reason({ type = 'progress' }),
      }
    `);
    // A blank panel is indistinguishable from a broken one.
    assert.match(r.emptyState, /say what would fill it/);
    assert.match(r.errorState, /required/);
    assert.match(r.progress, /say what it is doing/);
  });

  test('an input dialog must ask for something, with readable labels', async () => {
    const r = await lua.doString(`
      local function reason(m)
        local out = NxcUi.Contracts.validateMessage(m)
        return out.ok and 'ok' or out.error.details.fields[1].reason
      end
      return {
        none = reason({ type = 'input', fields = {} }),
        unlabelled = reason({ type = 'input', fields = { { name = 'amount' } } }),
        good = reason({ type = 'input', fields = { { name = 'amount', label = 'Amount' } } }),
      }
    `);
    assert.match(r.none, /must ask for something/);
    assert.match(r.unlabelled, /label a player can read/);
    assert.equal(r.good, 'ok');
  });

  test('a menu with thousands of items is refused', async () => {
    const r = await lua.doString(`
      local items = {}
      for i = 1, 500 do items[i] = { label = 'item ' .. i } end
      local out = NxcUi.Contracts.validateMessage({ type = 'contextMenu', items = items })
      return { ok = out.ok, reason = out.error.details.fields[1].reason }
    `);
    // Not a menu — a memory problem with a scrollbar. Directive 19.
    assert.equal(r.ok, false);
    assert.match(r.reason, /at most 200 items/);
  });

  test('an oversized payload is refused at the boundary', async () => {
    const r = await lua.doString(`
      local out = NxcUi.Contracts.validateMessage({
        type = 'notify', text = string.rep('x', 70000),
      })
      local all = {}
      for _, p in ipairs(out.error.details.fields) do all[#all + 1] = p.reason end
      return { ok = out.ok, reasons = table.concat(all, ' | ') }
    `);
    assert.equal(r.ok, false);
    assert.match(r.reasons, /belongs behind pagination/);
  });
});

describe('Callbacks from the NUI', () => {
  test('a valid callback for the open surface passes', async () => {
    const r = await lua.doString(`
      local out = NxcUi.Contracts.validateCallback(
        { surface = 'repair', action = 'confirm' }, 'repair')
      return out.ok
    `);
    assert.equal(r, true);
  });

  test('a callback for a surface that is not open is refused', async () => {
    const r = await lua.doString(`
      local out = NxcUi.Contracts.validateCallback(
        { surface = 'bank_withdraw', action = 'confirm' }, 'repair')
      return { ok = out.ok, reason = out.error.details.fields[1].reason }
    `);
    // A client can answer a dialog it was never shown. The browser runs on the
    // player's machine; local origin is not trust.
    assert.equal(r.ok, false);
    assert.match(r.reason, /responds to bank_withdraw, but repair is open/);
  });

  test('a callback naming the acting player is refused outright', async () => {
    const r = await lua.doString(`
      local function reason(c)
        local out = NxcUi.Contracts.validateCallback(c, 'repair')
        return out.ok and 'ok' or out.error.details.fields[#out.error.details.fields].reason
      end
      return {
        source  = reason({ surface = 'repair', source = 3 }),
        player  = reason({ surface = 'repair', player = 'chr_other' }),
        account = reason({ surface = 'repair', account = 'acc_admin' }),
        clean   = reason({ surface = 'repair', action = 'confirm' }),
      }
    `);
    // Accepting any of these is an impersonation hole reachable from a browser
    // console. The server resolves the actor from the session.
    assert.match(r.source, /must not name the acting player/);
    assert.match(r.player, /must not name the acting player/);
    assert.match(r.account, /must not name the acting player/);
    assert.equal(r.clean, 'ok');
  });

  test('a callback must name a surface', async () => {
    const r = await lua.doString(`
      local out = NxcUi.Contracts.validateCallback({ action = 'confirm' }, 'repair')
      return { ok = out.ok, reason = out.error.details.fields[1].reason }
    `);
    assert.equal(r.ok, false);
    assert.match(r.reason, /required/);
  });
});

describe('Focus by message type', () => {
  test('a notification never takes focus', async () => {
    const r = await lua.doString(`
      local C = NxcUi.Contracts
      return {
        notify   = C.focusModeFor(C.MESSAGE.NOTIFY),
        progress = C.focusModeFor(C.MESSAGE.PROGRESS),
        loading  = C.focusModeFor(C.MESSAGE.LOADING),
        menu     = C.focusModeFor(C.MESSAGE.CONTEXT_MENU),
        confirm  = C.focusModeFor(C.MESSAGE.CONFIRM),
        input    = C.focusModeFor(C.MESSAGE.INPUT),
      }
    `);
    // The most frequent message in the system, and the one a player is least
    // expecting to interrupt them. Taking focus for one would stop a player
    // mid-drive to say their wages arrived.
    assert.equal(r.notify, 'none');
    assert.equal(r.progress, 'none');
    assert.equal(r.loading, 'none');
    // Clickable, and the player keeps walking.
    assert.equal(r.menu, 'cursor');
    // These are questions; answering them is the point.
    assert.equal(r.confirm, 'full');
    assert.equal(r.input, 'full');
  });
});
