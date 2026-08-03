# Platform — nxc_ui

**Target:** FiveM for GTA V Enhanced, Enhanced Cfx Server runtime.

Required by Master Design Document v0.4 section 38.3 and
[`PLATFORM_STANDARDS.md`](https://github.com/NC-Framework/nxc-core-governance/blob/main/standards/PLATFORM_STANDARDS.md).
All eight items are answered. **`None` is written where it applies** — an empty section is a claim that
someone looked and found nothing, and an absent section is not.

`nxc_ui` is the shared interface layer: notifications, confirmations, inputs, progress, and the NUI foundation every other resource builds on.

---

### 1. Enhanced natives and platform APIs used

| Where | Uses |
| --- | --- |
| `client/nui.lua` | `SetNuiFocus`, `SendNUIMessage`, `RegisterNUICallback`, `IsControlJustPressed`, `CreateThread`, `Wait`, `AddEventHandler`, `TriggerServerEvent` |
| `server/callbacks.lua` | `RegisterNetEvent`, `exports` |

**`SetNuiFocus` is the one that matters**, and it is called from exactly one function so the natives and the state machine cannot disagree in more than one place. Everything in `shared/` is pure Lua and runs under `wasmoon`.

**NUI is the platform surface most likely to differ on Enhanced**, and none of it has been exercised there. The CEF version, focus behaviour, and callback transport are all platform-provided.

### 2. Deprecated or compatibility-only natives used

**None.**

### 3. Game assets, archetypes, metadata, or data files required

**None currently.**

### 4. Voice, networking, state bag, entity, and routing bucket assumptions

**Networking:** a NUI callback crosses from the browser to the client and then to the server. **It is untrusted at every hop** — the browser runs on the player's machine, so this is a claim exactly like a network event. Validated on the client and again on the server, and the acting player is resolved from `source` rather than from anything in the payload.

**Entities, state bags, routing buckets, voice:** none.

Routing buckets, when needed, are **requested from `nxc_core`**, never chosen. Two resources picking the
same number is the accidental-instance failure the design names as an existing production problem.

### 5. Known Enhanced platform limitations

**None known, and none have been looked for.** Nothing has been tested on Enhanced, because the
development server runs Legacy artifacts (blocker B-10).

### 6. Minimum supported Cfx Server build

**Not pinned.** No build has been named — OD-020, blocker B-11. The manifest declares `UNPINNED`, which
fails `check-manifests.mjs` deliberately rather than passing with a plausible-looking number.

### 7. Asset conversion or validation requirements

**None.**

### 8. Optional Legacy compatibility layer

**None**, and none is planned. Legacy support is not a launch requirement (ADR-0016).
