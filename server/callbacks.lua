--- The server end of the NUI bridge.
---
--- **A callback that arrived here came from a browser on a player's machine.**
--- It was validated on the client, and that check can be bypassed by anyone who
--- can open a console, so it is validated again. Neither check makes the other
--- redundant: the client one catches mistakes, this one catches attacks.
---
--- The acting player is resolved from `source`, never from the payload. That is
--- the same rule sessions already follow, and it is what makes a forged
--- `account` field useless rather than dangerous.

if not IsDuplicityVersion() then return end

local Callbacks = {}

local handlers = {}

--- Register a handler for a surface.
---
--- Keyed by surface so a resource can only receive answers to questions it
--- asked. A single global handler would let any resource see every dialog
--- response in the system.
---
---@param surface string
---@param handler fun(source: any, response: table)
function Callbacks.on(surface, handler)
    if type(surface) ~= 'string' or surface == '' then
        error('Callbacks.on requires a surface name', 2)
    end
    if type(handler) ~= 'function' then
        error('Callbacks.on requires a handler', 2)
    end
    handlers[surface] = handler
end

RegisterNetEvent('nxc_ui:server:callback', function(payload)
    local source = source

    local valid = NxcUi.Contracts.validateCallback(payload, nil)
    if not valid.ok then
        Nxc.Logger.warn('nui.server_callback_refused', {
            -- The source is logged; nothing from the payload that claims to
            -- identify a player is, because that is exactly what a forged one
            -- would look like.
            connection = tostring(source),
            surface = tostring(payload and payload.surface),
        })
        return
    end

    local handler = handlers[payload.surface]
    if not handler then
        -- A response to a surface nobody is listening for. Ordinary after a
        -- resource restart, and worth a line rather than silence.
        Nxc.Logger.debug('nui.callback_unhandled', { surface = payload.surface })
        return
    end

    local ok, err = pcall(handler, source, {
        surface = payload.surface,
        action = payload.action,
        values = payload.values,
        itemId = payload.itemId,
    })
    if not ok then
        Nxc.Logger.error('nui.callback_handler_failed', {
            surface = payload.surface, reason = tostring(err),
        })
    end
end)

exports('onCallback', function(surface, handler) Callbacks.on(surface, handler) end)

NxcUi.Callbacks = Callbacks
return Callbacks
