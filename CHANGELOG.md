# Changelog

Entries are added only for genuinely user-visible or contract-relevant changes.

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
