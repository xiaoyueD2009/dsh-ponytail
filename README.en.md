# dsh-ponytail

English | [简体中文](README.md)

Ponytail for DeepSeek Harness: the lazy-senior-dev rules kept in the system prompt, six skills, bilingual descriptions, a `/ponytail` command, and one-command upstream updates. Wrapped from [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) 5.3.3.

Built for the **desktop** profile (bundles are per-profile; install it separately in another profile if needed).

## Install

```
plugin_manager → install_bundle → /path/to/dsh-ponytail
```

It shows up as “Ponytail” under Settings → Plugins, where you can disable it. Uninstall steps are at the end.

## Commands

```
/ponytail                       status: level, enabled skills, config source
/ponytail lite|full|ultra|off   current session only
/ponytail default <level>       persist the default
/ponytail skills                list skills and their switches
/ponytail skills on|off <name>  toggle one skill
/ponytail lang [auto|zh|en]     skill description language; auto follows DSH locale
/ponytail update                pull the latest upstream release
/ponytail update --edge         follow GitHub main instead
/ponytail update --status       show where the content comes from
/ponytail update --reset        fall back to the bundled snapshot
```

## State

`~/.dsh/ponytail/config.json`, owned by this plugin only:

```json
{ "schemaVersion": 1, "defaultMode": "full", "disabledSkills": [], "descriptionLang": "auto" }
```

A missing, corrupt, or invalid file falls back to `full`, every skill enabled, and `descriptionLang: auto`. Nothing is thrown.

## Bilingual descriptions

`locale/skills.zh.json` holds a Chinese description for each skill. Resolution order:

1. explicit `descriptionLang` (`zh` / `en`)
2. `auto` → the host's `locale.preference` in `$DSH_HOME/settings.yaml`
3. fallback `en`

Switching the language re-registers the skills, so the `/` menu and the model catalog update immediately. Unknown names fall back to the upstream English description — upstream content updates never leave a skill without a description.

## Upstream updates

`/ponytail update` fetches `AGENTS.md` and the six `SKILL.md` files, validates them, and swaps the directory atomically. A failure leaves the current content untouched. Two sources: `raw.githubusercontent.com` first, jsDelivr as fallback, both with an 8s timeout.

Downloads land in `~/.dsh/ponytail/upstream/<ref>/`; `upstream.json` records the ref, channel, and sync time. `--reset` deletes them and returns to the bundled snapshot.

The skill list is taken from the current six: a skill added upstream is not discovered automatically (the code carries a `shortcut:` note describing when to switch to the contents API).

## Fault boundary

Every registration and read is best-effort. An unparsable skill costs that one skill; an unreadable prompt file costs that one section; a failed command registration costs that one command. No network at startup, no blocking, no files outside the package except the state directory. A bug in this plugin fails only its own loader entry — the rest of DSH keeps running.

## Uninstall

Settings → Plugins → remove, or `plugin_manager` `remove_bundle`.

For ten seconds after removal the plugin polls the profile manifest: once `dependencies` no longer contains the package it deletes `~/.dsh/ponytail/`. If the dependency is still listed, it was a disable or an upgrade, and the state is kept.

## What this plugin does

- Keeps the upstream 5.3.3 rules **always on** in the system prompt (`systemPrompt.section`, order 50)
- Ships six skills, each toggleable with `/ponytail skills off <name>` — no file deletions
- Bilingual skill descriptions, auto-detected from the host locale
- `/ponytail lite|full|ultra|off` for intensity, `default <level>` to persist
- `/ponytail update` to follow upstream, with `--edge` / `--status` / `--reset`
- Clears local state on uninstall; keeps it on disable or upgrade
- Exactly one state file: `~/.dsh/ponytail/config.json`

## What it deliberately does not do

| Not done | Note |
|---|---|
| Graphical panel | No settings card, no level picker, no diagnostics view — commands only |
| band / board / status line | Those are Claude Code extension points; DSH has no equivalent |
| Claude Code hooks | No SessionStart / SubagentStart / UserPromptSubmit counterparts |
| Automatic updates | Never dials out in the background; `/ponytail update` is manual |
| Cross-profile install | Installs into the current profile only |
| Cost / usage stats | Does not read tokens, compute spend, or emit telemetry |
| Upstream benchmarks / examples / 20 host adapters | Only `AGENTS.md` and the six `SKILL.md` files are wrapped |

## Compared with the other ponytail ports

Data from each project's repository and the market index; “unverified” means I did not open the source.

| | This plugin | [@wenaixi](https://github.com/Wenaixi/dsh-ponytail) | [@mengyuly](https://github.com/MengYuil/dsh-ponytail) | [gongyijie85](https://github.com/gongyijie85/dsh-ponytail) | [hoyyang](https://github.com/hoyyang/dsh-best-ponytail) | Upstream path |
|---|---|---|---|---|---|---|
| Form | bundle, host-only | bundle + client | bundle (identity) | bundle, skills only | bundle, ruleset | copy `AGENTS.md` + `skills/` |
| Always on | ✅ system prompt section | ✅ system prompt section | ✅ (claimed) | ❌ | unverified | ✅ via `~/.dsh/AGENTS.md` |
| Level command | ✅ | ✅ + `default` | ✅ | ❌ | unverified | ❌ |
| Per-skill switch | ✅ command | ✅ command + panel | unverified | ❌ | unverified | ❌ delete the folder |
| Graphical panel | ❌ | ✅ level / toggles / diagnostics | unverified | ❌ | ❌ | ❌ |
| Description language | ✅ zh + en, follows locale | ✅ zh + en | unverified | unverified | unverified | English only |
| Content version | **5.3.3** | **4.10.0** | unverified | unverified | unverified | 5.3.3 (manual sync) |
| Follows upstream | ✅ built-in command | ❌ waits for the author | unverified | ❌ | ❌ | ❌ manual |
| Code size | 618 lines, readable in one sitting | ~120KB incl. 30KB client | unverified | small | small | 0 |
| Version gate | none | `engines.dsh <= 0.2.1` | unverified | unverified | unverified | none |
| Size | ~85KB, zero deps | 1.1MB, 5 peers | unverified | unverified | unverified | 0 |
| Maintained by | you | third party, active | third party | third party | third party | upstream author |

Versions and dates: @wenaixi 5.6.2 (2026-10-24), @mengyuly 0.4.3 (2026-10-17), gongyijie85 0.1.7 (2026-09-30), hoyyang 0.1.0 (2026-09-21).

### Where this plugin is weaker

1. **No graphical panel** — changing the level or toggling a skill means typing a command.
2. **Mutually exclusive with @wenaixi** — both register `ponytail` as a system prompt section name, and DSH rejects duplicate section names, so you can install only one.

### When not to use this

- You want a graphical panel → [@wenaixi](https://github.com/Wenaixi/dsh-ponytail)
- You want the least effort and do not care that its content is older → also @wenaixi
- You only want the skills and do not want the system prompt touched → gongyijie85's port
- You do not want a plugin at all → use the upstream path
- You need one setting across several profiles → the upstream path beats any bundle

The only reason this plugin exists: **the latest upstream 5.x content, with install/uninstall and a one-command update**. Outside that, the alternatives above fit better.

## License

MIT. The wrapped rules and skills are copyright Dietrich Gebert; see [LICENSE](LICENSE).
