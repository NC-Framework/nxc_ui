--- The client half: the only code that touches the NUI natives.
---
--- Every decision it applies was made by a tested module. This file supplies the
--- runtime and carries out answers, which is why it is short and why the rules
--- are testable at all.
---
--- **Focus is released on every path out**, including the ones nobody plans for:
--- close, escape, error, and resource stop. A NUI that keeps focus after closing
--- leaves the player unable to move, unable to open the menu that would release
--- it, and with no recourse but to reconnect.

if IsDuplicityVersion() then return end

local Nui = {}

local openSurface = nil

--- Push the focus state the module says we should be in.
---
--- Called after every acquire and release rather than at each call site, so
--- there is one place where natives and state can disagree, and it is this one.
local function applyFocus()
    local state = NxcUi.Focus.nativeState()
    SetNuiFocus(state.hasFocus, state.hasCursor)
end

--- Show something.
---
---@param message table
---@return NxcResult
function Nui.show(message)
    local valid = NxcUi.Contracts.validateMessage(message)
    if not valid.ok then
        -- Refused here rather than sent. A malformed message renders a broken
        -- panel, and a blank panel is indistinguishable from a broken one.
        Nxc.Logger.warn('nui.message_refused', {
            messageType = tostring(message and message.type),
            problems = (function()
                local out = {}
                for _, p in ipairs(valid.error.details.fields) do out[#out + 1] = p.reason end
                return out
            end)(),
        })
        return valid
    end

    local mode = NxcUi.Contracts.focusModeFor(message.type)
    if mode ~= NxcUi.Focus.MODE.NONE then
        local acquired = NxcUi.Focus.acquire({
            owner = message.owner or GetInvokingResource() or NxcUi.RESOURCE,
            surface = message.surface,
            mode = mode,
        })
        if not acquired.ok then return acquired end
        openSurface = message.surface
        applyFocus()
    end

    SendNUIMessage(message)
    return Nxc.Result.ok(true)
end

--- Close the current surface and release focus.
---
--- Idempotent, and never fails.
---
---@param owner string|nil
function Nui.close(owner)
    SendNUIMessage({ type = NxcUi.Contracts.MESSAGE.CLOSE, surface = openSurface })
    if owner then
        NxcUi.Focus.release(owner, openSurface)
    else
        NxcUi.Focus.forceRelease()
    end
    openSurface = nil
    applyFocus()
end

--- The NUI answering.
---
--- **Untrusted.** The browser runs on the player's machine, so this is a claim
--- exactly like a network event. It is validated against the surface the CLIENT
--- believes is open, and the server validates again against what IT believes —
--- neither check makes the other redundant, because this one can be bypassed by
--- anyone who can reach the browser console.
RegisterNUICallback('callback', function(data, cb)
    local valid = NxcUi.Contracts.validateCallback(data, openSurface)
    if not valid.ok then
        Nxc.Logger.warn('nui.callback_refused', {
            surface = tostring(data and data.surface),
            openSurface = tostring(openSurface),
        })
        cb({ ok = false })
        return
    end

    local surface = openSurface
    Nui.close()

    -- Forwarded to the server, which resolves the acting player from the session
    -- rather than from anything here.
    TriggerServerEvent('nxc_ui:server:callback', {
        surface = surface,
        action = data.action,
        values = data.values,
        itemId = data.itemId,
    })

    cb({ ok = true })
end)

--- Escape always releases.
---
--- The last line of defence, and it deliberately does not ask whose focus it is.
--- Every other path can be reasoned about; this one exists for when the
--- reasoning was wrong, and a player holding a stuck cursor cannot file a bug
--- from inside it.
CreateThread(function()
    while true do
        Wait(0)
        if NxcUi.Focus.isHeld() and IsControlJustPressed(0, 322) then
            Nui.close()
        end
    end
end)

--- A resource stopping releases whatever it held.
---
--- A crashed or reloaded resource never runs its own cleanup, so cleanup cannot
--- live there.
AddEventHandler('onClientResourceStop', function(resource)
    if NxcUi.Focus.releaseOwner(resource) then
        SendNUIMessage({ type = NxcUi.Contracts.MESSAGE.CLOSE })
        openSurface = nil
        applyFocus()
        Nxc.Logger.info('nui.focus_reclaimed', {
            stoppedResource = resource,
            detail = 'released focus held by a resource that stopped',
        })
    end
end)

exports('show', function(message) return Nui.show(message) end)
exports('close', function() Nui.close(GetInvokingResource()) end)
exports('isBusy', function() return NxcUi.Focus.isHeld() end)

NxcUi.Nui = Nui
return Nui
