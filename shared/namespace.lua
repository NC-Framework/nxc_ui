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

return NxcUi
