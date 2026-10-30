# dsh-ponytail

[English](README.en.md) | 简体中文

Ponytail for DeepSeek Harness: the lazy-senior-dev rules kept in the system prompt, six skills, a `/ponytail` command, and one-command upstream updates. Wrapped from [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) 5.3.3.

把 [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) 5.3.3 装进 DeepSeek Harness：规则常驻系统提示、6 个技能、一个 `/ponytail` 命令，内容可跟随上游更新。

仅面向 **desktop** profile（bundle 按 profile 安装；换 profile 需再装一次）。

## 安装

```
plugin_manager → install_bundle → /path/to/dsh-ponytail
```

装完在 设置 → 插件 里出现「Ponytail」，可启停。卸载见文末。

## 命令

```
/ponytail                       查看级别、技能启用数、配置来源
/ponytail lite|full|ultra|off   只改当前会话
/ponytail default <level>       写入默认级别
/ponytail skills                列出技能与开关
/ponytail skills on|off <name>  开关单个技能
/ponytail lang [auto|zh|en]      技能描述语言，auto 跟随 DSH 的 locale
/ponytail update                拉取上游最新版本
/ponytail update --edge         跟随 GitHub main
/ponytail update --status       查看当前内容来源
/ponytail update --reset        回退到包内置快照
```

## 状态

`~/.dsh/ponytail/config.json`，只归本插件所有：

```json
{ "schemaVersion": 1, "defaultMode": "full", "disabledSkills": [] }
```

文件缺失、损坏或字段非法时回退 `full` + 全部技能启用，不会崩。

## 跟随上游

`/ponytail update` 从 GitHub 拉 `AGENTS.md` 和 6 个 `SKILL.md`，校验后原子替换，失败则当前内容不变。两个源：`raw.githubusercontent.com` 优先，超时自动切 jsDelivr。

下载内容落在 `~/.dsh/ponytail/upstream/<ref>/`，`upstream.json` 记录 ref、channel、同步时间。`--reset` 删除它们即回到内置快照。

技能清单取自包内当前 6 个：上游新增技能不会被自动发现（代码里有 `shortcut:` 注释标了何时该改成读 contents API）。

## 故障边界

所有注册与读取都是 best-effort：某个技能解析失败只少一个技能，提示词读不到只少一段注入，命令注册失败只少一条命令。启动不联网、不阻塞、不写包外文件（运行状态除外）。插件自身的 bug 只会让这一条 loader entry 失败，DSH 其余部分照常运行。

## 卸载

设置 → 插件 → 移除，或 `plugin_manager` `remove_bundle`。

卸载后 10 秒内轮询 profile 清单：若 `dependencies` 里已没有 `dsh-ponytail`，删除 `~/.dsh/ponytail/`；若还在，说明只是禁用或升级，保留状态。

## 这个插件做什么

- 把上游 5.3.3 的规则**常驻**进系统提示（`systemPrompt.section`，order 50），新会话自动生效
- 6 个技能，可用 `/ponytail skills off <name>` 单独关闭，不用删文件
- 技能描述中英双语：`/ponytail lang` 切换，`auto` 跟随 DSH 的 `locale.preference`，缺省回退英文
- `/ponytail lite|full|ultra|off` 切换强度，`default <level>` 持久化默认值
- `/ponytail update` 跟随上游，支持 `--edge` / `--status` / `--reset`
- 卸载清空本地状态；禁用或升级保留
- 全部状态只有一个文件：`~/.dsh/ponytail/config.json`

## 这个插件不做什么

明确不做，别指望：

| 不做 | 说明 |
|---|---|
| 图形面板 | 没有设置卡片、没有级别选择器、没有诊断视图，一切靠命令 |
| band / board / 状态栏 | 那是 Claude Code 的扩展点，DSH 没有对应能力 |
| Claude Code hooks | SessionStart / SubagentStart / UserPromptSubmit 都没有对应实现 |
| 自动更新 | 不会后台联网，必须手动跑 `/ponytail update` |
| 跨 profile 自动安装 | 只装当前 profile，换 profile 要再装一次 |
| 成本 / 用量统计 | 不读 token、不算钱、不写遥测 |
| 上游的 benchmarks / examples / 20 个宿主适配 | 只搬 `AGENTS.md` 和 6 个 `SKILL.md` |

## 与其他 ponytail 移植的对比

数据取自各自仓库/市场索引，标注「未核验」的项我没有逐一打开源码验证。

| | 本插件 | [@wenaixi](https://github.com/Wenaixi/dsh-ponytail) | [@mengyuly](https://github.com/MengYuil/dsh-ponytail) | [gongyijie85](https://github.com/gongyijie85/dsh-ponytail) | [hoyyang](https://github.com/hoyyang/dsh-best-ponytail) | 原版路径 |
|---|---|---|---|---|---|---|
| 形态 | bundle，host-only | bundle + 客户端 | bundle（identity 类） | bundle，仅技能 | bundle，规则集 | `AGENTS.md` + `skills/` 手工复制 |
| 常驻生效 | ✅ 系统提示 section | ✅ 系统提示 section | ✅（宣称 always-on） | ❌ | 未核验 | ✅ 靠 `~/.dsh/AGENTS.md` |
| 级别命令 | ✅ | ✅ + `default` | ✅ | ❌ | 未核验 | ❌ |
| 技能开关 | ✅ 命令 | ✅ 命令 + 面板 | 未核验 | ❌ | 未核验 | ❌ 只能删目录 |
| 图形面板 | ❌ | ✅ 级别/开关/诊断 | 未核验 | ❌ | ❌ | ❌ |
| 技能描述语言 | ✅ 中英可切，默认跟随 locale | ✅ 中英可切 | 未核验 | 未核验 | 未核验 | 英文原文 |
| 内容版本 | **5.3.3** | **4.10.0**（5 个文件逐字节相同） | 未核验 | 未核验 | 未核验 | 5.3.3（需手动同步） |
| 跟随上游 | ✅ 内置命令 | ❌ 等作者发版 | 未核验 | ❌ | ❌ | ❌ 手动 |
| 代码面 | 618 行，可一眼审完 | ~120KB（含 30KB client） | 未核验 | 小 | 小 | 0 |
| 版本门禁 | 无 | `engines.dsh <= 0.2.1` | 未核验 | 未核验 | 未核验 | 无 |
| 体积 | 80KB，零依赖 | 1.1MB，peer 5 个 | 未核验 | 未核验 | 未核验 | 0 |
| 维护 | 自己维护 | 第三方，活跃 | 第三方 | 第三方 | 第三方 | 原作者 |

版本与日期：@wenaixi 5.6.2（2026-10-24）、@mengyuly 0.4.3（2026-10-17）、gongyijie85 0.1.7（2026-09-30）、hoyyang 0.1.0（2026-09-21）。

### 逐个说明

**@wenaixi/dsh-ponytail 5.6.2** — 功能最全的一个。有图形面板（级别、技能开关、三层优先级诊断）、中英双语描述、零缓存 miss 的增量注入、子 agent 适配。没有内置更新；内容停在上游 4.10.0（5 个 `SKILL.md` 与 4.10.0 逐字节相同，`ponytail-help` 为适配 DSH 改过），用的是 v4 的 `ponytail:` 约定，而 v5 已改为 `shortcut:`，所以它的 `/ponytail-debt` 会漏收 v5 写法；`engines.dsh` 卡在 `<=0.2.1`。**要面板选它，要新内容选这个。**

**@mengyuly/dsh-ponytail 0.4.3** — identity 类，宣称 always-on persona 与级别持久化，更接近「人格插件」。内部实现和内容版本未核验。

**gongyijie85/dsh-ponytail 0.1.7** — 只打包 6 个技能，无常驻、无命令、无更新。**只要技能、不想改系统提示就选它。**

**hoyyang/dsh-best-ponytail 0.1.0** — 规则集形态，9 月发布，未核验。

**原版路径** — `AGENTS.md` 放 `~/.dsh/AGENTS.md`，技能放 `~/.agents/skills/`。零代码、天然覆盖所有 profile，但没有开关、没有级别命令、更新和卸载都靠手工。

### 本插件明确弱于 @wenaixi 的地方

1. 没有图形面板，改级别/开关技能都要打命令
2. 与它**互斥**：两者都用 `ponytail` 作为 system prompt section 名，同时装会因重复注册抛错

### 什么时候别用这个

- 想要图形配置面板 → 用 [@wenaixi](https://github.com/Wenaixi/dsh-ponytail)
- 只想要最省事、不介意内容版本旧 → 同样选 @wenaixi
- 只想要技能、不想动系统提示 → 用 gongyijie85 那个
- 一个插件都不想装、只想把规则贴进去 → 用原版路径
- 需要跨多个 profile 一致 → 原版路径比任何 bundle 都省事

本插件的存在理由只有一个：**要上游 5.x 的最新内容，同时保留可装可卸和一条命令跟随更新**。超出这个范围，上面的替代品更合适。

## License

MIT。上游规则与技能版权归 Dietrich Gebert，见 [LICENSE](LICENSE)。
