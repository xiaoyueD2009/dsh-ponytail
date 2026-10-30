# dsh-ponytail

Ponytail for DeepSeek Harness: the lazy-senior-dev rules kept in the system prompt, six skills, a `/ponytail` command, and one-command upstream updates. Wrapped from [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) 5.3.2.

把 [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) 5.3.2 装进 DeepSeek Harness：规则常驻系统提示、6 个技能、一个 `/ponytail` 命令，内容可跟随上游更新。

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

## 与其他 ponytail 移植的对比

数据取自各自仓库/市场索引，标注「未核验」的项我没有逐一打开源码验证。

| | 本插件 | [@wenaixi](https://github.com/Wenaixi/dsh-ponytail) | [@mengyuly](https://github.com/MengYuil/dsh-ponytail) | [gongyijie85](https://github.com/gongyijie85/dsh-ponytail) | [hoyyang](https://github.com/hoyyang/dsh-best-ponytail) | 原版路径 |
|---|---|---|---|---|---|---|
| 形态 | bundle，host-only | bundle + 客户端 | bundle（identity 类） | bundle，仅技能 | bundle，规则集 | `AGENTS.md` + `skills/` 手工复制 |
| 常驻生效 | ✅ 系统提示 section | ✅ 系统提示 section | ✅（宣称 always-on） | ❌ | 未核验 | ✅ 靠 `~/.dsh/AGENTS.md` |
| 级别命令 | ✅ | ✅ + `default` | ✅ | ❌ | 未核验 | ❌ |
| 技能开关 | ✅ 命令 | ✅ 命令 + 面板 | 未核验 | ❌ | 未核验 | ❌ 只能删目录 |
| 图形面板 | ❌ | ✅ 级别/开关/诊断 | 未核验 | ❌ | ❌ | ❌ |
| 内容版本 | **5.3.2** | **4.10.0**（逐字节比对） | 未核验 | 未核验 | 未核验 | 5.3.2（需手动同步） |
| 跟随上游 | ✅ 内置命令 | ❌ 等作者发版 | 未核验 | ❌ | ❌ | ❌ 手动 |
| 代码面 | 562 行，可一眼审完 | ~120KB（含 30KB client） | 未核验 | 小 | 小 | 0 |
| 版本门禁 | 无 | `engines.dsh <= 0.2.1` | 未核验 | 未核验 | 未核验 | 无 |
| 体积 | 80KB，零依赖 | 1.1MB，peer 5 个 | 未核验 | 未核验 | 未核验 | 0 |
| 维护 | 自己维护 | 第三方，活跃 | 第三方 | 第三方 | 第三方 | 原作者 |

版本与日期：@wenaixi 5.6.2（2026-10-24）、@mengyuly 0.4.3（2026-10-17）、gongyijie85 0.1.7（2026-09-30）、hoyyang 0.1.0（2026-09-21）。

### 本插件不如别人的地方

1. **没有图形面板**。改级别、开关技能都得打命令；@wenaixi 有沉浸式面板和三层优先级诊断。
2. **技能描述是英文原文**。`/` 菜单里显示英文；@wenaixi 做了中英双语并可切换。
3. **只装一个 profile**。desktop 之外的 profile 要各装一次；原版路径靠全局 `AGENTS.md`，天然覆盖所有 profile。
4. **自维护**。没有测试套件、没有 CI、没有发版流程；上游若改 frontmatter 结构，只能自己跟。
5. **更新依赖网络**。raw 域名在部分网络下超时（已加 jsDelivr 兜底），两个源都挂时报错，但不会损坏现有内容。
6. **与 @wenaixi 互斥**。两者都用 `ponytail` 作为 system prompt section 名，DSH 里同名 section 重复注册会抛错，只能二选一。
7. **band / board 没有移植**。那是 Claude Code 的状态栏与本地看板，DSH 没有对应扩展点。

### 本插件比它们强的地方

1. **内容最新**。5.3.2 原文；@wenaixi 的 5 个 `SKILL.md` 与上游 4.10.0 逐字节相同（`ponytail-help` 为适配 DSH 改过），用的是 v4 约定（`ponytail:` 注释），而 v5 已改成 `shortcut:`，因此它的 `/ponytail-debt` 会漏收 v5 写法。
2. **代码面可审计**。562 行对手写解析器 + 命令 + 更新 + 清理，没有打包产物，读一遍就知道它在你的提示词里放什么。
3. **跟随上游是内置能力**，不依赖第三方作者发版节奏。
4. **无版本门禁**。@wenaixi 的 `engines.dsh` 是 `>=0.2.0-rc.1 <=0.2.1`，当前运行时 `0.2.1-rc.3` 按严格 semver 判不过（市场索引标 compatible，实际以安装返回为准）。
5. **卸载有明确语义**：卸载清零、禁用/升级保留，且不依赖手工清理。

### 什么时候别用这个

- 想要图形配置、双语技能描述 → 用 [@wenaixi](https://github.com/Wenaixi/dsh-ponytail)。
- 只想要最省事、不介意内容版本旧 → 同样选 @wenaixi。
- 一个插件都不想装、只想把规则贴进去 → 用原版路径：`AGENTS.md` 放 `~/.dsh/AGENTS.md`，技能放 `~/.agents/skills/`。
- 需要跨多个 profile 一致 → 原版路径比任何 bundle 都省事。

本插件的存在理由只有一个：**要上游 5.x 的最新内容，同时保留可装可卸和一条命令跟随更新**。超出这个范围，上面的替代品更合适。

## License

MIT。上游规则与技能版权归 Dietrich Gebert，见 [LICENSE](LICENSE)。
