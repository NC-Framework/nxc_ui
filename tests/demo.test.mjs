import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, withFrozenClock } from './harness.mjs';

let lua;
beforeEach(async () => {
  lua = await createEngine();
  await withFrozenClock(lua, 1700000000000);
});
afterEach(() => lua.global.close());

/**
 * The demo fixtures are the only thing anyone can point at nxc_ui with, so they
 * have to be right.
 *
 * A fixture that fails validation renders nothing and writes a refusal to the
 * log — which is correct behaviour for a bad message and indistinguishable, to
 * whoever is testing, from the resource being broken. They would be debugging
 * the wrong thing.
 */
describe('Demo surfaces', () => {
  test('every fixture except the invalid one validates', async () => {
    const r = await lua.doString(`
      local failures = {}
      for _, name in ipairs(NxcUi.Demo.ORDER) do
        if not NxcUi.Demo.isDeliberatelyInvalid(name) then
          local result = NxcUi.Contracts.validateMessage(NxcUi.Demo.get(name))
          if not result.ok then
            local reasons = {}
            for _, f in ipairs(result.error.details.fields) do
              reasons[#reasons + 1] = f.field .. ': ' .. f.reason
            end
            failures[#failures + 1] = name .. ' — ' .. table.concat(reasons, '; ')
          end
        end
      end
      return table.concat(failures, ' | ')
    `);
    assert.equal(r, '', 'a demo fixture does not validate');
  });

  test('the invalid one really is invalid', async () => {
    const r = await lua.doString(`
      local result = NxcUi.Contracts.validateMessage(NxcUi.Demo.get('refused'))
      return result.ok
    `);
    // It exists so a refusal can be seen deliberately. If it started passing, the
    // one way to observe a refusal in game would be gone and nobody would notice.
    assert.equal(r, false);
  });

  test('every name in ORDER resolves to a surface', async () => {
    const r = await lua.doString(`
      local missing = {}
      for _, name in ipairs(NxcUi.Demo.ORDER) do
        if not NxcUi.Demo.get(name) then missing[#missing + 1] = name end
      end
      return table.concat(missing, ',')
    `);
    // ORDER drives what `/nxcui list` prints. A name listed there and absent from
    // the table is a command that tells you to run a command that does nothing.
    assert.equal(r, '');
  });

  test('every surface is reachable from ORDER', async () => {
    const r = await lua.doString(`
      local listed = {}
      for _, name in ipairs(NxcUi.Demo.ORDER) do listed[name] = true end
      local unlisted = {}
      for name in pairs(NxcUi.Demo.SURFACES) do
        if not listed[name] then unlisted[#unlisted + 1] = name end
      end
      table.sort(unlisted)
      return table.concat(unlisted, ',')
    `);
    // The other direction: a fixture nobody can reach is one nobody will test.
    assert.equal(r, '');
  });

  test('every message type in the contract has a fixture', async () => {
    const r = await lua.doString(`
      local covered = {}
      for name in pairs(NxcUi.Demo.SURFACES) do
        covered[NxcUi.Demo.SURFACES[name].type] = true
      end
      local uncovered = {}
      for _, kind in pairs(NxcUi.Contracts.MESSAGE) do
        -- 'close' is not a surface anyone shows; it is what /nxcui close sends.
        if kind ~= 'close' and not covered[kind] then uncovered[#uncovered + 1] = kind end
      end
      table.sort(uncovered)
      return table.concat(uncovered, ',')
    `);
    // If a new message type is added and no fixture with it, there is no way to
    // look at it, which is how nxc_ui ended up with no entry point at all.
    assert.equal(r, '');
  });

  test('a fixture that takes focus names a surface', async () => {
    const r = await lua.doString(`
      local anonymous = {}
      for name, message in pairs(NxcUi.Demo.SURFACES) do
        if NxcUi.Contracts.focusModeFor(message.type) ~= NxcUi.Focus.MODE.NONE then
          if type(message.surface) ~= 'string' or message.surface == '' then
            anonymous[#anonymous + 1] = name
          end
        end
      end
      table.sort(anonymous)
      return table.concat(anonymous, ',')
    `);
    // Focus is released by owner and surface. One taken under an empty surface
    // name is one nothing can release by name.
    assert.equal(r, '');
  });

  test('get is case-insensitive and refuses a non-string', async () => {
    const r = await lua.doString(`
      return {
        upper = NxcUi.Demo.get('CONFIRM') ~= nil,
        number = NxcUi.Demo.get(42) == nil,
        missing = NxcUi.Demo.get('nope') == nil,
      }
    `);
    // Typed by a person into a chat box, so 'Confirm' has to work.
    assert.equal(r.upper, true);
    assert.equal(r.number, true);
    assert.equal(r.missing, true);
  });
});
