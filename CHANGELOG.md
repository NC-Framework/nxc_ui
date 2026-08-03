# Changelog

Entries are added only for genuinely user-visible or contract-relevant changes.

## 0.2.3 - 2026-08-03

### Added

- `nxc_ui:client:selected` and `nxc_ui:client:closed`, emitted locally.

  **A callback went to the server only.** A client resource that needs to attach
  context only it holds — nxc_target knows which entity the crosshair was on, and
  the server cannot — had no way to see a selection before it left the machine.
  Clicking a menu item did nothing at all, silently, because nothing had
  registered a server handler for the surface either.

  `closed` exists for the same reason in reverse: a resource holding state for an
  open surface had no way to learn it had been dismissed.

## 0.2.1 — 2026-08-03

### Fixed

- The `show` export returns a plain table. It returned a Result, and a Result is
  frozen — a frozen table has no keys of its own, so it crossed a resource
  boundary as an empty one. A caller would have read a refusal as a success.

  THIS IS THE SAME DEFECT nxc_config HAD, and it shipped here anyway, because the
  fix was applied where the bug was found rather than everywhere the pattern
  occurred. Nothing had ever called the export, so nothing noticed.

  Found by the two-state boundary harness within minutes of that harness
  existing, on the first export it was pointed at.

## 0.2.0 — 2026-08-03

### Added

- `/nxcui` — a way to look at the interface.

  **nxc_ui 0.1.0 shipped with no entry point.** Three exports, no command, no
  keybind, and nothing calling them: nxc_devtools is the intended caller and does
  not exist. A resource whose worst failure is invisible to a server log had no
  way to be looked at.

  Thirteen fixtures, one per message type plus one deliberately invalid. The
  invalid one exists because a refused message renders nothing and writes a log
  line, which is correct and indistinguishable from the resource being dead —
  there has to be one way to see the difference on purpose.

  `/nxcui focus` reports who holds focus and what the natives say. Whether a
  surface renders is obvious; whether focus was released is not, and the symptom
  is a player who cannot move and cannot open the menu that would free them.

  Registered only when `nxc_dev_mode` is on — the command does not exist
  otherwise — and `restricted`, so it also needs `command.nxcui`. Dev mode is
  about the environment, the ace is about the person, and neither implies the
  other.

## Unreleased

### Added

- Focus as a state machine with exactly one owner, released on close, escape, error, and
  resource stop. A NUI that keeps focus after closing leaves a player unable to move.
- NUI message and callback contracts, validated in both directions and in both languages.
- Design tokens carrying contrast, reduced motion, and focus visibility, so accessibility is
  a property of the system rather than something each component remembers.
- The eight required components, including error and empty states that say what happened and
  what to do next.
- A component playground that also shows what the NUI **refuses**, since a rejected message
  is invisible in game by design.
- 27 Lua tests; the web build typechecks and produces three files.

Initial development. No release has been made.
