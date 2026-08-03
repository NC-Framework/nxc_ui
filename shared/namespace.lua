--- nxc_ui — the shared interface layer.
---
--- One design system, one NUI, one focus owner. Every resource with a
--- player-facing surface goes through here rather than shipping its own browser
--- instance, because every NUI is a browser inside the game client and a server
--- running eight of them is paying for eight of them.
---
--- **The riskiest thing in this resource is focus, not rendering.** A NUI that
--- keeps focus after closing leaves the player unable to move, unable to open
--- the menu that would fix it, and with no recourse but to reconnect. That is
--- why focus is a state machine with an owner, and why it is released on close,
--- on escape, on error, and on resource stop.

NxcUi = NxcUi or {}

NxcUi.RESOURCE = 'nxc_ui'
--- Read from the manifest so the version is stated ONCE.
---
--- It used to be a literal here as well as in fxmanifest.lua, and they drifted:
--- the manifest said one thing while every log line said another. Two sources of
--- truth for a version is one source of truth and one rumour.
---
--- The fallback is for the test harness, where no natives exist. It is the only
--- place a literal can still be wrong, and there it cannot mislead an operator.
NxcUi.VERSION = (type(GetResourceMetadata) == 'function'
    and GetResourceMetadata(GetCurrentResourceName(), 'version', 0))
    or '0.0.0-test'

--- Contract version of the surface other resources depend on: the request
--- shapes, the callback shapes, and the focus rules.
NxcUi.CONTRACT_VERSION = 1


--- The nxc_lib contract this resource needs.
---
--- Checked here rather than in a server file, because this runs on BOTH sides
--- and immediately after nxc_lib's own modules load.
---
--- Failing at startup with a sentence naming the cause beats failing later at
--- whichever line first reached a function that is not there. An operator who
--- installed a mixed compatibility set gets told so; without this they get
--- `attempt to call a nil value` and no indication of why.
local REQUIRED_LIB_CONTRACT = 3

if type(Nxc) ~= 'table' then
    error(('%s requires nxc_lib. Load its shared modules with @nxc_lib/... '
        .. 'entries in shared_scripts: a dependency orders startup and shares '
        .. 'no code, because every resource has its own Lua state.')
        :format('nxc_ui'), 0)
end

if (Nxc.CONTRACT_VERSION or 0) < REQUIRED_LIB_CONTRACT then
    error(('%s requires nxc_lib contract %d and found %d. Install a whole '
        .. 'compatibility set; mixing versions is unsupported.')
        :format('nxc_ui', REQUIRED_LIB_CONTRACT, Nxc.CONTRACT_VERSION or 0), 0)
end

return NxcUi
