--- NUI focus, as a state machine with exactly one owner.
---
--- **This is the module most likely to strand a player**, so it is the one
--- written most defensively. A NUI that keeps focus after closing leaves the
--- player unable to move, unable to open the menu that would release it, and
--- with no recourse but to reconnect.
---
--- Four rules, and each exists because the alternative is that failure:
---
---   **One owner at a time.** Two surfaces both believing they hold focus means
---   the second to close releases it while the first still needs it, or the
---   first releases it while the second is still open. Focus is a single token,
---   not a counter.
---
---   **Every acquisition names its owner.** Releasing is only permitted to the
---   holder, so a resource cannot release focus it does not have — which is how
---   one surface closing dismisses another.
---
---   **A resource stopping releases whatever it held.** A crashed or reloaded
---   resource never runs its own cleanup, so cleanup cannot live there.
---
---   **Release is idempotent and always succeeds.** A release path that can fail
---   is a release path that sometimes does not run, and the cost of a spurious
---   release is a cursor flicker while the cost of a missed one is a stuck
---   player.
---
--- Pure: no natives. The caller applies the decision with `SetNuiFocus`, which is
--- what makes every rule here testable.

local Focus = {}

--- What focus a surface is asking for.
---
--- `cursor` without `keyboard` is the common case — a menu the player clicks
--- while still able to move — and getting it backwards is why a player ends up
--- unable to walk while a notification is on screen.
Focus.MODE = {
    NONE     = 'none',      -- no focus at all
    CURSOR   = 'cursor',    -- mouse only; the player can still move
    FULL     = 'full',      -- mouse and keyboard; the player cannot move
}

local current = nil   -- { owner, surface, mode, acquiredAt }

---@return table|nil
function Focus.holder()
    return current
end

---@return boolean
function Focus.isHeld()
    return current ~= nil
end

--- Request focus.
---
--- Refused when someone else holds it. **Refusal is the correct answer, not a
--- limitation:** silently taking focus from another surface leaves that surface
--- open and inert, which looks like the game freezing.
---
---@param opts { owner: string, surface: string, mode: string }
---@param nowMs integer|nil
---@return NxcResult
function Focus.acquire(opts, nowMs)
    if type(opts) ~= 'table' or type(opts.owner) ~= 'string' or opts.owner == '' then
        return Nxc.Result.err(Nxc.Errors.validationFailed(
            { fields = { { field = 'owner', reason = 'is required' } } }))
    end
    if type(opts.surface) ~= 'string' or opts.surface == '' then
        return Nxc.Result.err(Nxc.Errors.validationFailed(
            { fields = { { field = 'surface', reason = 'is required' } } }))
    end
    if opts.mode ~= Focus.MODE.CURSOR and opts.mode ~= Focus.MODE.FULL then
        return Nxc.Result.err(Nxc.Errors.validationFailed(
            { fields = { { field = 'mode', reason = 'must be cursor or full' } } }))
    end

    if current then
        -- Re-acquiring the same surface is a no-op rather than an error: a
        -- resource re-opening a menu it already has open is ordinary, and
        -- failing it would make callers write a check they will forget.
        if current.owner == opts.owner and current.surface == opts.surface then
            return Nxc.Result.ok({ mode = current.mode, reacquired = true })
        end
        return Nxc.Result.err(Nxc.Errors.new(
            'NXC_UI_FOCUS_HELD', 'Another interface is open.',
            {
                resource = NxcUi.RESOURCE,
                details = { heldBy = current.owner, surface = current.surface },
            }))
    end

    current = {
        owner = opts.owner,
        surface = opts.surface,
        mode = opts.mode,
        acquiredAt = nowMs or Nxc.Time.nowMs(),
    }
    return Nxc.Result.ok({ mode = opts.mode, reacquired = false })
end

--- Release focus.
---
--- **Always succeeds.** Returns what changed so the caller knows whether to
--- touch the natives, but never fails: a release path that can fail is one that
--- sometimes does not run, and a missed release strands a player.
---
--- A release by someone who does not hold focus changes nothing. That is not an
--- error either — it is the ordinary result of two close paths racing, and the
--- second one arriving late must not disturb whoever holds it now.
---
---@param owner string
---@param surface string|nil  nil releases whatever this owner holds
---@return { released: boolean, mode: string, wasHeldBy: string|nil }
function Focus.release(owner, surface)
    if not current then
        return { released = false, mode = Focus.MODE.NONE, wasHeldBy = nil }
    end
    if current.owner ~= owner then
        return { released = false, mode = current.mode, wasHeldBy = current.owner }
    end
    if surface and current.surface ~= surface then
        return { released = false, mode = current.mode, wasHeldBy = current.owner }
    end

    current = nil
    return { released = true, mode = Focus.MODE.NONE, wasHeldBy = owner }
end

--- Release whatever a resource holds, because it stopped.
---
--- Driven from a resource-stop handler rather than from the resource itself. A
--- resource that crashed or was reloaded never runs its own cleanup, which is
--- exactly when this matters.
---
---@param owner string
---@return boolean released
function Focus.releaseOwner(owner)
    if current and current.owner == owner then
        current = nil
        return true
    end
    return false
end

--- Release unconditionally.
---
--- The escape hatch, for the escape key and for an administrator unsticking a
--- player. It exists because every other path can be reasoned about and this one
--- has to work when the reasoning was wrong.
---
---@return { released: boolean, wasHeldBy: string|nil, surface: string|nil }
function Focus.forceRelease()
    if not current then
        return { released = false, wasHeldBy = nil, surface = nil }
    end
    local was = current
    current = nil
    return { released = true, wasHeldBy = was.owner, surface = was.surface }
end

--- What the natives should be set to.
---
--- Returned as data so the decision is testable and only the application needs
--- the runtime.
---
---@return { hasFocus: boolean, hasCursor: boolean }
function Focus.nativeState()
    if not current then return { hasFocus = false, hasCursor = false } end
    if current.mode == Focus.MODE.CURSOR then
        -- Cursor without keyboard: the player can still move, which is what a
        -- non-blocking menu means.
        return { hasFocus = false, hasCursor = true }
    end
    return { hasFocus = true, hasCursor = true }
end

--- Test helper.
function Focus.reset()
    current = nil
end

NxcUi.Focus = Focus
return Focus
