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
NxcUi.VERSION = '0.1.0'

--- Contract version of the surface other resources depend on: the request
--- shapes, the callback shapes, and the focus rules.
NxcUi.CONTRACT_VERSION = 1

return NxcUi
