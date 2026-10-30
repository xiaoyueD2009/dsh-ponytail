# 发布清单

三件只有你能做的事，其余已就绪。

## 1. 修 npm 环境（阻塞）

```bash
sudo chown -R 501:20 ~/.npm     # 缓存里有 root 文件，否则 pack/publish 都 EPERM
npm adduser                     # 当前未登录
```

## 2. 建 GitHub 仓库

市场条目要求 `repository.url`，`title` 是 `owner/repo`。

```bash
cd <本目录>
git init && git add -A && git commit -m "dsh-ponytail 0.1.0"
git remote add origin git@github.com:xiaoyueD2009/dsh-ponytail.git
git push -u origin main
```

`repository` / `homepage` / `bugs` / `author` 已按 `xiaoyueD2009/dsh-ponytail` 写好。

**注意 npm scope 与 GitHub 账号是两回事**：当前包名是 `@linsam262/dsh-ponytail`，如果 npm 用户名不是它，发布前要改成你拥有的 scope（只需改 `package.json` 的 `name` 和 `cordis.patch.yml` 的 `name`，然后重装）。

## 3. 改包名（已完成：@linsam262/dsh-ponytail）

`npm view dsh-ponytail` 返回 200，说明该名字已被别人发布（v0.2.0）。改用 scope：

```json
"name": "@<scope>/dsh-ponytail"
```

同时改 `cordis.patch.yml` 里那一行的 `name`。代码里的 `PKG_NAME` 从 `package.json` 读，不用动。

改完重装：

```
plugin_manager → remove_bundle dsh-ponytail
plugin_manager → install_bundle /绝对路径/dsh-ponytail
```

## 4. 发布

```bash
npm pack --dry-run     # 确认文件清单：index.js / AGENTS.md / skills / locale / icon / README / LICENSE
npm publish --access public
```

## 5. 上架市场

市场索引是 [awesome-dsh-plugin/awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 的生成物，收录方式是**一个文件一个 PR**，不改 README（README 由脚本从 `data/plugins/*.yml` 生成）。

### 门槛

- 仓库的 `package.json` 声明 `dsh.bundle` ✅
- 仓库有真实可用的代码 ✅
- **仓库创建满 1 天**（本仓库建于 2026-10-30T01:37Z，最早 2026-10-31T01:37Z 可提交）
- 能被 `dsh plugin add` 安装 ✅

### 提交步骤

1. Fork `awesome-dsh-plugin/awesome-dsh-plugin`
2. 在 fork 里新建 `data/plugins/xiaoyueD2009__dsh-ponytail.yml`：

```yaml
url: https://github.com/xiaoyueD2009/dsh-ponytail
name: xiaoyueD2009/dsh-ponytail
category: skill
description:
  en: Ponytail's lazy-senior-dev rules kept always-on in the DeepSeek Harness system prompt, plus six skills, bilingual descriptions, and one-command upstream updates.
  zh: 把 Ponytail 的「偷懒资深开发者」规则常驻进 DeepSeek Harness 系统提示，附带 6 个技能、中英双语描述，以及一条命令跟随上游更新。
```

3. 对 `main` 发 PR，标题类似 `Add xiaoyueD2009/dsh-ponytail`

描述里含 `: `（冒号加空格）时必须用引号，否则 YAML 解析失败；上面的文案已避开。

分类可选值里有 `skill`，对应这个插件的定位。图标可省略，省略时用作者头像。

## 6. 之后每次发版

1. 改 `version`
2. `npm publish`
3. 上游内容有变时先 `/ponytail update` 确认能拉到，再发版

## 已完成

- `private` 已移除，`publishConfig.access = public`
- `keywords`、`files`（含 LICENSE）已补
- LICENSE 已含上游 DietrichGebert 版权声明
- `PKG_NAME` 改为从 `package.json` 读取，改名只需动两处
