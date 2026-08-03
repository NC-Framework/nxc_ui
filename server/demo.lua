--- `/nxcui` — the way to look at the interface.
---
--- **Registered only when `nxc_dev_mode` is on.** Not hidden behind it, not
--- disabled by it: the command does not exist. MDD v0.4 section 38.8 forbids a
--- debug surface in production, and nxc_core's bootstrap already refuses to
--- start a production environment with dev mode enabled, so this inherits a gate
--- that is enforced somewhere else and cannot be quietly loosened here.
---
--- **The command is `restricted`**, which makes the server check `command.nxcui`
--- against the invoking player's ace permissions before the handler runs. Dev
--- mode is about the environment; this is about the person. Neither one implies
--- the other, and a development server with players on it is a normal thing.
---
--- The client is sent a NAME, not a payload. Both sides load the same fixture
--- table, so there is nothing to disagree about, and no arbitrary message shape
--- can be pushed to a client by anything that can reach this event.

if not IsDuplicityVersion() then return end

if GetConvar('nxc_dev_mode', 'false') ~= 'true' then return end

local function usage(source)
    local lines = { 'nxc_ui demo surfaces:' }
    for _, name in ipairs(NxcUi.Demo.ORDER) do
        local note = NxcUi.Demo.isDeliberatelyInvalid(name)
            and '  (invalid on purpose — should be refused, not rendered)' or ''
        lines[#lines + 1] = ('  /nxcui %s%s'):format(name, note)
    end
    lines[#lines + 1] = '  /nxcui close   release focus and close whatever is open'
    lines[#lines + 1] = '  /nxcui focus   report who holds focus right now'

    for _, line in ipairs(lines) do
        if source == 0 then print(line) else
            TriggerClientEvent('chat:addMessage', source, { args = { line } })
        end
    end
end

RegisterCommand('nxcui', function(source, args)
    local what = args[1]

    if not what or what == 'help' or what == 'list' then
        usage(source)
        return
    end

    if source == 0 then
        -- The console has no NUI to show anything in. Saying so beats a command
        -- that appears to work and does nothing.
        print('nxcui: run this from in game — there is no browser attached to the console')
        return
    end

    if what == 'close' or what == 'focus' then
        TriggerClientEvent('nxc_ui:client:demo', source, what)
        return
    end

    if not NxcUi.Demo.get(what) then
        TriggerClientEvent('chat:addMessage', source, {
            args = { ('nxcui: no surface named %s. Try /nxcui list'):format(what) },
        })
        return
    end

    TriggerClientEvent('nxc_ui:client:demo', source, what)
end, true)

Nxc.Logger.info('demo.commands_registered', {
    command = 'nxcui',
    reason = 'nxc_dev_mode is on',
    surfaces = #NxcUi.Demo.ORDER,
})
