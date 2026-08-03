--- Sample surfaces, one per message type.
---
--- **These exist because nxc_ui had no entry point.** It shipped three exports
--- and no command, no keybind, and nothing that calls them: `nxc_devtools` is
--- the intended caller and it does not exist yet. A resource whose most
--- important failure mode is invisible to a server log needs a way to be looked
--- at, and there was none.
---
--- The fixtures live here rather than in the command file so they can be tested.
--- A demo that renders a validation refusal because the demo itself is malformed
--- wastes the time of whoever is testing and looks exactly like a defect in the
--- thing under test.
---
--- **This table is not a debug surface.** It is data. What MDD v0.4 section 38.8
--- forbids in production is the command that shows it, and that command refuses
--- to register unless `nxc_dev_mode` is on — which bootstrap already refuses to
--- allow in a production environment.

local Demo = {}

--- Ordered so `list` prints them in a sensible sequence rather than a hash order.
Demo.ORDER = {
    'notify', 'success', 'warning', 'error',
    'confirm', 'destructive', 'input', 'menu',
    'progress', 'loading', 'errorpanel', 'empty',
    'refused',
}

Demo.SURFACES = {
    notify = {
        type = 'notify', surface = 'demo_notify',
        text = 'A notification. It never takes focus.',
        severity = 'info', durationMs = 4000,
    },
    success = {
        type = 'notify', surface = 'demo_notify',
        text = 'Something worked.', severity = 'success', durationMs = 4000,
    },
    warning = {
        type = 'notify', surface = 'demo_notify',
        text = 'Something is off, but nothing broke.',
        severity = 'warning', durationMs = 5000,
    },
    error = {
        type = 'notify', surface = 'demo_notify',
        text = 'Something failed.', severity = 'error', durationMs = 6000,
    },

    -- FOCUS STARTS HERE. Everything below this line takes the cursor, so
    -- everything below this line is what you are actually testing.
    confirm = {
        type = 'confirm', surface = 'demo_confirm',
        title = 'Confirm',
        text = 'This takes focus. Close it and check that movement comes back.',
        confirmLabel = 'Yes', cancelLabel = 'No',
    },
    destructive = {
        type = 'confirm', surface = 'demo_confirm',
        title = 'Delete character',
        text = 'This cannot be undone.',
        confirmLabel = 'Delete', cancelLabel = 'Keep', destructive = true,
    },
    input = {
        type = 'input', surface = 'demo_input',
        title = 'Withdraw',
        fields = {
            { name = 'amount', label = 'Amount', kind = 'number', required = true },
            { name = 'note', label = 'Note', kind = 'text' },
        },
    },
    menu = {
        type = 'contextMenu', surface = 'demo_menu',
        title = 'Vehicle',
        items = {
            { id = 'lock', label = 'Lock', icon = 'lock' },
            { id = 'trunk', label = 'Open trunk' },
            { id = 'engine', label = 'Engine', disabled = true,
              description = 'Disabled, to show what unavailable looks like' },
        },
    },
    progress = {
        type = 'progress', surface = 'demo_progress',
        label = 'Repairing', durationMs = 5000,
    },
    loading = {
        type = 'loading', surface = 'demo_loading', label = 'Loading',
    },
    errorpanel = {
        type = 'error', surface = 'demo_error',
        title = 'Could not load',
        text = 'The bank is unreachable.',
        -- An error with no next step is a dead end wearing an apology.
        actionLabel = 'Retry',
    },
    empty = {
        type = 'empty', surface = 'demo_empty',
        title = 'Nothing here',
        text = 'Items you store will appear here.',
    },

    -- DELIBERATELY INVALID, and the only fixture that is.
    --
    -- A refused message is invisible in game by design — nothing renders, and a
    -- line goes to the log. That is correct behaviour and it is indistinguishable
    -- from the resource being dead, so there has to be one way to see the
    -- difference on purpose.
    refused = {
        type = 'notify', surface = 'demo_refused',
        text = '', severity = 'nonsense', durationMs = 999999,
    },
}

--- Is this the fixture that is supposed to fail?
---@param name string
---@return boolean
function Demo.isDeliberatelyInvalid(name) return name == 'refused' end

---@param name string
---@return table|nil
function Demo.get(name)
    if type(name) ~= 'string' then return nil end
    return Demo.SURFACES[name:lower()]
end

NxcUi.Demo = Demo
return Demo
