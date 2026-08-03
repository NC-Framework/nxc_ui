--- The client half of `/nxcui`.
---
--- Always loaded, because whether the command exists is the server's decision
--- and this only responds to it. A client whose server registered no command
--- will never receive the event.
---
--- **`focus` is the important one.** Whether a surface renders is obvious.
--- Whether focus was actually released is not: the symptom is a player who
--- cannot move and cannot open the menu that would free them, and by then the
--- only recourse is to reconnect. This reports the state directly, so it can be
--- checked rather than inferred from whether walking works.

if IsDuplicityVersion() then return end

local function report(text)
    TriggerEvent('chat:addMessage', { args = { text } })
    print(('[nxc_ui] %s'):format(text))
end

RegisterNetEvent('nxc_ui:client:demo', function(what)
    if type(what) ~= 'string' then return end

    if what == 'close' then
        -- Deliberately the no-owner form, which force-releases. This is the
        -- escape hatch: if a surface has stranded someone, the command that
        -- frees them must not itself depend on knowing who took focus.
        NxcUi.Nui.close()

        local holder = NxcUi.Focus.holder()
        report(holder
            and ('closed, but focus is STILL HELD by %s on %s — that is a defect')
                :format(tostring(holder.owner), tostring(holder.surface))
            or 'closed, focus released')
        return
    end

    if what == 'focus' then
        local holder = NxcUi.Focus.holder()
        local state = NxcUi.Focus.nativeState()
        report(holder
            and ('focus held by %s on %s (mode %s) — natives say focus=%s cursor=%s')
                :format(tostring(holder.owner), tostring(holder.surface),
                        tostring(holder.mode), tostring(state.hasFocus),
                        tostring(state.hasCursor))
            or ('nobody holds focus — natives say focus=%s cursor=%s')
                :format(tostring(state.hasFocus), tostring(state.hasCursor)))
        return
    end

    local message = NxcUi.Demo.get(what)
    if not message then return end

    -- Called directly rather than through `exports.nxc_ui:show`. A same-resource
    -- export call resolves inside this very Lua state, so it would cross no
    -- boundary and marshal nothing — it would look like a boundary test while
    -- proving nothing about one.
    local shown = NxcUi.Nui.show(message)
    local ok = type(shown) == 'table' and shown.ok == true

    if NxcUi.Demo.isDeliberatelyInvalid(what) then
        report(ok
            and 'the invalid fixture was ACCEPTED — validation is not running'
            or 'refused, as intended. Nothing rendered; the reason is in the log above')
        return
    end

    if not ok then
        report(('%s was refused — the log line above names the field'):format(what))
    end
end)
