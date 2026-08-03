import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, withFrozenClock } from './harness.mjs';

let lua;
beforeEach(async () => {
  lua = await createEngine();
  await withFrozenClock(lua, 1700000000000);
  await lua.doString('NxcUi.Focus.reset()');
});
afterEach(() => lua.global.close());

describe('Acquiring focus', () => {
  test('a surface takes focus and is recorded as the holder', async () => {
    const r = await lua.doString(`
      local out = NxcUi.Focus.acquire({
        owner = 'nxc_interact', surface = 'repair', mode = 'full' })
      local held = NxcUi.Focus.holder()
      return { ok = out.ok, mode = out.value.mode, owner = held.owner, surface = held.surface }
    `);
    assert.equal(r.ok, true);
    assert.equal(r.mode, 'full');
    assert.equal(r.owner, 'nxc_interact');
    assert.equal(r.surface, 'repair');
  });

  test('a second surface is refused, and told who holds it', async () => {
    const r = await lua.doString(`
      NxcUi.Focus.acquire({ owner = 'nxc_interact', surface = 'repair', mode = 'full' })
      local out = NxcUi.Focus.acquire({ owner = 'nxc_target', surface = 'menu', mode = 'cursor' })
      return { ok = out.ok, code = out.error.code, heldBy = out.error.details.heldBy }
    `);
    // Refusal is the correct answer. Silently taking focus leaves the first
    // surface open and inert, which looks like the game freezing.
    assert.equal(r.ok, false);
    assert.equal(r.code, 'NXC_UI_FOCUS_HELD');
    assert.equal(r.heldBy, 'nxc_interact');
  });

  test('re-acquiring the same surface is a no-op, not an error', async () => {
    const r = await lua.doString(`
      NxcUi.Focus.acquire({ owner = 'nxc_interact', surface = 'repair', mode = 'full' })
      local out = NxcUi.Focus.acquire({
        owner = 'nxc_interact', surface = 'repair', mode = 'full' })
      return { ok = out.ok, reacquired = out.value.reacquired }
    `);
    // Re-opening a menu already open is ordinary; failing it would make callers
    // write a check they will forget.
    assert.equal(r.ok, true);
    assert.equal(r.reacquired, true);
  });

  test('a request must name an owner, a surface, and a valid mode', async () => {
    const r = await lua.doString(`
      local function reason(o)
        local out = NxcUi.Focus.acquire(o)
        return out.ok and 'ok' or out.error.details.fields[1].reason
      end
      return {
        noOwner   = reason({ surface = 's', mode = 'full' }),
        noSurface = reason({ owner = 'o', mode = 'full' }),
        badMode   = reason({ owner = 'o', surface = 's', mode = 'sideways' }),
        none      = reason({ owner = 'o', surface = 's', mode = 'none' }),
      }
    `);
    assert.match(r.noOwner, /required/);
    assert.match(r.noSurface, /required/);
    assert.match(r.badMode, /cursor or full/);
    // 'none' is a state, not something to acquire.
    assert.match(r.none, /cursor or full/);
  });
});

describe('Releasing focus', () => {
  test('the holder releases it', async () => {
    const r = await lua.doString(`
      NxcUi.Focus.acquire({ owner = 'nxc_interact', surface = 'repair', mode = 'full' })
      local out = NxcUi.Focus.release('nxc_interact', 'repair')
      return { released = out.released, held = NxcUi.Focus.isHeld() }
    `);
    assert.equal(r.released, true);
    assert.equal(r.held, false);
  });

  test('a non-holder cannot release, which is how one surface would dismiss another', async () => {
    const r = await lua.doString(`
      NxcUi.Focus.acquire({ owner = 'nxc_interact', surface = 'repair', mode = 'full' })
      local out = NxcUi.Focus.release('nxc_target', 'menu')
      return { released = out.released, stillHeld = NxcUi.Focus.isHeld(),
               wasHeldBy = out.wasHeldBy }
    `);
    assert.equal(r.released, false);
    assert.equal(r.stillHeld, true);
    assert.equal(r.wasHeldBy, 'nxc_interact');
  });

  test('releasing when nothing is held succeeds and changes nothing', async () => {
    const r = await lua.doString(`
      local out = NxcUi.Focus.release('nxc_interact', 'repair')
      return { released = out.released, mode = out.mode }
    `);
    // A release path that can FAIL is one that sometimes does not run, and a
    // missed release strands a player. So this never throws.
    assert.equal(r.released, false);
    assert.equal(r.mode, 'none');
  });

  test('a late release from a closed surface does not disturb the current holder', async () => {
    const r = await lua.doString(`
      NxcUi.Focus.acquire({ owner = 'nxc_interact', surface = 'first', mode = 'full' })
      NxcUi.Focus.release('nxc_interact', 'first')
      NxcUi.Focus.acquire({ owner = 'nxc_target', surface = 'second', mode = 'cursor' })
      -- The first surface's close path arrives late.
      local out = NxcUi.Focus.release('nxc_interact', 'first')
      local held = NxcUi.Focus.holder()
      return { released = out.released, owner = held.owner, surface = held.surface }
    `);
    // Two close paths racing is ordinary. The straggler must not take focus from
    // whoever legitimately holds it now.
    assert.equal(r.released, false);
    assert.equal(r.owner, 'nxc_target');
    assert.equal(r.surface, 'second');
  });

  test('a resource stopping releases whatever it held', async () => {
    const r = await lua.doString(`
      NxcUi.Focus.acquire({ owner = 'nxc_interact', surface = 'repair', mode = 'full' })
      local mine = NxcUi.Focus.releaseOwner('nxc_interact')
      local held = NxcUi.Focus.isHeld()

      NxcUi.Focus.acquire({ owner = 'nxc_target', surface = 'menu', mode = 'cursor' })
      local other = NxcUi.Focus.releaseOwner('nxc_zones')
      return { mine = mine, held = held, other = other, stillHeld = NxcUi.Focus.isHeld() }
    `);
    // A crashed or reloaded resource never runs its own cleanup, which is
    // exactly when this matters.
    assert.equal(r.mine, true);
    assert.equal(r.held, false);
    assert.equal(r.other, false, 'stopping one resource must not release another\'s focus');
    assert.equal(r.stillHeld, true);
  });

  test('force release works when everything else has failed', async () => {
    const r = await lua.doString(`
      NxcUi.Focus.acquire({ owner = 'nxc_interact', surface = 'repair', mode = 'full' })
      local out = NxcUi.Focus.forceRelease()
      return { released = out.released, wasHeldBy = out.wasHeldBy, surface = out.surface,
               held = NxcUi.Focus.isHeld() }
    `);
    // The escape hatch. It exists because every other path can be reasoned about,
    // and this one has to work when the reasoning was wrong.
    assert.equal(r.released, true);
    assert.equal(r.wasHeldBy, 'nxc_interact');
    assert.equal(r.surface, 'repair');
    assert.equal(r.held, false);
  });
});

describe('Native state', () => {
  test('cursor mode leaves the player able to move', async () => {
    const r = await lua.doString(`
      NxcUi.Focus.acquire({ owner = 'nxc_target', surface = 'menu', mode = 'cursor' })
      local s = NxcUi.Focus.nativeState()
      return { hasFocus = s.hasFocus, hasCursor = s.hasCursor }
    `);
    // Getting this backwards is why a player ends up unable to walk while a
    // menu they can click is on screen.
    assert.equal(r.hasFocus, false);
    assert.equal(r.hasCursor, true);
  });

  test('full mode takes keyboard and cursor', async () => {
    const r = await lua.doString(`
      NxcUi.Focus.acquire({ owner = 'nxc_interact', surface = 'repair', mode = 'full' })
      local s = NxcUi.Focus.nativeState()
      return { hasFocus = s.hasFocus, hasCursor = s.hasCursor }
    `);
    assert.equal(r.hasFocus, true);
    assert.equal(r.hasCursor, true);
  });

  test('nothing held means nothing focused, which is the state that must be reachable', async () => {
    const r = await lua.doString(`
      local s = NxcUi.Focus.nativeState()
      return { hasFocus = s.hasFocus, hasCursor = s.hasCursor }
    `);
    assert.equal(r.hasFocus, false);
    assert.equal(r.hasCursor, false);
  });
});
