--- NUI message and callback contracts.
---
--- Two directions, and they are not symmetrical.
---
--- **Lua → NUI** is a message the interface is asked to render. It is validated
--- because a malformed one produces a broken panel rather than an error, and a
--- blank panel is indistinguishable from a broken one.
---
--- **NUI → Lua is a callback, and it is UNTRUSTED.** Local origin is not trust
--- (directive 20). The browser runs on the player's machine; anything reaching
--- Lua from it is a claim by a client, exactly like a network event. Validating
--- it is not defensive programming, it is the boundary.
---
--- Pure: shapes in, verdict out.

local Contracts = {}

--- Everything nxc_ui can be asked to show.
---
--- An enumeration rather than free-form strings so a typo is a refusal at the
--- boundary instead of a message the interface silently ignores.
Contracts.MESSAGE = {
    NOTIFY       = 'notify',
    CONFIRM      = 'confirm',
    INPUT        = 'input',
    CONTEXT_MENU = 'contextMenu',
    PROGRESS     = 'progress',
    LOADING      = 'loading',
    ERROR        = 'error',
    EMPTY        = 'empty',
    CLOSE        = 'close',
}

Contracts.SEVERITY = { info = true, success = true, warning = true, error = true }

--- The longest a notification may claim to last, and the shortest.
---
--- Bounded because an unbounded duration is a notification that never leaves,
--- and a zero one is a flash nobody reads. Both are reachable by arithmetic
--- rather than intent — a duration computed from a value that turned out to be
--- nil is usually one or the other.
Contracts.MIN_DURATION_MS = 1000
Contracts.MAX_DURATION_MS = 30000

--- The largest payload that may cross into the NUI.
---
--- Directive 19 requires avoiding large payloads. A context menu with ten
--- thousand entries is not a menu, it is a memory problem with a scrollbar, and
--- the place to say so is here rather than after the frame time drops.
Contracts.MAX_PAYLOAD_BYTES = 65536
Contracts.MAX_MENU_ITEMS = 200

local function problem(field, reason)
    return { field = field, reason = reason }
end

--- Validate a message going to the NUI.
---
---@param message table
---@return NxcResult
function Contracts.validateMessage(message)
    if type(message) ~= 'table' then
        return Nxc.Result.err(Nxc.Errors.validationFailed(
            { fields = { problem('message', 'must be a table') } }))
    end

    local problems = {}
    local kind = message.type

    local known = false
    for _, value in pairs(Contracts.MESSAGE) do
        if value == kind then known = true break end
    end
    if not known then
        problems[#problems + 1] = problem('type', ('unknown message type: %s'):format(tostring(kind)))
        return Nxc.Result.err(Nxc.Errors.validationFailed({ fields = problems }))
    end

    if kind == Contracts.MESSAGE.NOTIFY then
        if type(message.text) ~= 'string' or message.text == '' then
            problems[#problems + 1] = problem('text', 'is required')
        end
        if message.severity ~= nil and not Contracts.SEVERITY[message.severity] then
            problems[#problems + 1] =
                problem('severity', 'must be info, success, warning, or error')
        end
        if message.durationMs ~= nil then
            if type(message.durationMs) ~= 'number' then
                problems[#problems + 1] = problem('durationMs', 'must be a number')
            elseif message.durationMs < Contracts.MIN_DURATION_MS
                or message.durationMs > Contracts.MAX_DURATION_MS then
                problems[#problems + 1] = problem('durationMs', ('must be between %d and %d')
                    :format(Contracts.MIN_DURATION_MS, Contracts.MAX_DURATION_MS))
            end
        end

    elseif kind == Contracts.MESSAGE.CONFIRM then
        if type(message.text) ~= 'string' or message.text == '' then
            problems[#problems + 1] = problem('text', 'is required')
        end
        -- A confirmation whose buttons are not labelled is a dialog asking a
        -- question the player cannot read.
        if message.confirmLabel ~= nil and type(message.confirmLabel) ~= 'string' then
            problems[#problems + 1] = problem('confirmLabel', 'must be a string')
        end
        if message.destructive ~= nil and type(message.destructive) ~= 'boolean' then
            problems[#problems + 1] = problem('destructive', 'must be a boolean')
        end

    elseif kind == Contracts.MESSAGE.INPUT then
        if type(message.fields) ~= 'table' or #message.fields == 0 then
            problems[#problems + 1] = problem('fields', 'an input dialog must ask for something')
        else
            for index, field in ipairs(message.fields) do
                local label = ('fields[%d]'):format(index)
                if type(field.name) ~= 'string' or field.name == '' then
                    problems[#problems + 1] = problem(label, 'needs a name')
                end
                if type(field.label) ~= 'string' or field.label == '' then
                    problems[#problems + 1] = problem(label, 'needs a label a player can read')
                end
            end
        end

    elseif kind == Contracts.MESSAGE.CONTEXT_MENU then
        if type(message.items) ~= 'table' or #message.items == 0 then
            problems[#problems + 1] = problem('items', 'a menu must offer something')
        elseif #message.items > Contracts.MAX_MENU_ITEMS then
            problems[#problems + 1] = problem('items', ('at most %d items; %d is not a menu')
                :format(Contracts.MAX_MENU_ITEMS, #message.items))
        end

    elseif kind == Contracts.MESSAGE.PROGRESS then
        if type(message.label) ~= 'string' or message.label == '' then
            problems[#problems + 1] = problem('label', 'a progress bar must say what it is doing')
        end
        if message.durationMs ~= nil and type(message.durationMs) ~= 'number' then
            problems[#problems + 1] = problem('durationMs', 'must be a number')
        end

    elseif kind == Contracts.MESSAGE.ERROR then
        -- The error state exists so a failure is legible. An error panel with no
        -- next step is a blank panel with a red border.
        if type(message.text) ~= 'string' or message.text == '' then
            problems[#problems + 1] = problem('text', 'is required')
        end

    elseif kind == Contracts.MESSAGE.EMPTY then
        if type(message.text) ~= 'string' or message.text == '' then
            problems[#problems + 1] =
                problem('text', 'an empty state must say what would fill it')
        end
    end

    if Nxc.Serialize.approximateSize(message) > Contracts.MAX_PAYLOAD_BYTES then
        problems[#problems + 1] = problem('message',
            ('exceeds %d bytes; a payload that large belongs behind pagination')
                :format(Contracts.MAX_PAYLOAD_BYTES))
    end

    if #problems > 0 then
        return Nxc.Result.err(Nxc.Errors.validationFailed({ fields = problems }))
    end
    return Nxc.Result.ok(message)
end

--- Validate a callback arriving FROM the NUI.
---
--- **Everything here is a claim by a client.** The browser runs on the player's
--- machine, so a callback is exactly as trustworthy as a network event: not at
--- all. Local origin is not trust.
---
--- Two things are checked that a naive handler would not. The callback must name
--- a surface that is actually open, because a client can send a response to a
--- dialog that was never shown. And the responding player is taken from the
--- session by the caller, never from this payload.
---
---@param callback table
---@param openSurface string|nil  the surface currently open, from the server's own state
---@return NxcResult
function Contracts.validateCallback(callback, openSurface)
    if type(callback) ~= 'table' then
        return Nxc.Result.err(Nxc.Errors.validationFailed(
            { fields = { problem('callback', 'must be a table') } }))
    end

    local problems = {}

    if type(callback.surface) ~= 'string' or callback.surface == '' then
        problems[#problems + 1] = problem('surface', 'is required')
    elseif openSurface ~= nil and callback.surface ~= openSurface then
        -- A response to something that is not open. Either a race, or a client
        -- answering a dialog it was never shown; both are refused, and the
        -- second is the reason.
        problems[#problems + 1] = problem('surface',
            ('responds to %s, but %s is open'):format(callback.surface, openSurface))
    end

    if callback.action ~= nil and type(callback.action) ~= 'string' then
        problems[#problems + 1] = problem('action', 'must be a string')
    end

    -- A client naming the acting player is making a claim. The caller resolves
    -- the actor from the session; accepting it here would be an impersonation
    -- hole reachable from a browser console.
    if callback.source ~= nil or callback.player ~= nil or callback.account ~= nil then
        problems[#problems + 1] = problem('callback',
            'must not name the acting player; the server resolves that from the session')
    end

    if Nxc.Serialize.approximateSize(callback) > Contracts.MAX_PAYLOAD_BYTES then
        problems[#problems + 1] = problem('callback',
            ('exceeds %d bytes'):format(Contracts.MAX_PAYLOAD_BYTES))
    end

    if #problems > 0 then
        return Nxc.Result.err(Nxc.Errors.validationFailed({ fields = problems }))
    end
    return Nxc.Result.ok(callback)
end

--- Whether a message type takes focus, and how much.
---
--- **A notification must never take focus.** It is the most frequent message in
--- the system and the one a player is least expecting to interrupt them; taking
--- focus for one would stop a player mid-drive to tell them their wages arrived.
---
---@param kind string
---@return string mode
function Contracts.focusModeFor(kind)
    if kind == Contracts.MESSAGE.NOTIFY
        or kind == Contracts.MESSAGE.PROGRESS
        or kind == Contracts.MESSAGE.LOADING then
        return NxcUi.Focus.MODE.NONE
    end
    if kind == Contracts.MESSAGE.CONTEXT_MENU then
        -- Clickable, and the player keeps walking.
        return NxcUi.Focus.MODE.CURSOR
    end
    return NxcUi.Focus.MODE.FULL
end

NxcUi.Contracts = Contracts
return Contracts
