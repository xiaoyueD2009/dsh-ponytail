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

索引文件 `<https://cdn.jsdelivr.net/npm/dsh-plugin-catalog/index.json>` 的条目结构：

```json
{
  "name": "@scope/dsh-ponytail",
  "title": "<owner>/dsh-ponytail",
  "description": { "zh": "…", "en": "…" },
  "repository": { "url": "https://github.com/<owner>/dsh-ponytail" },
  "metadata": { "category": "skill", "keywords": [], "labels": [] }
}
```

提交渠道还没查实（索引里没有说明链接），需要去 dshopen.org 或 catalog 仓库找入口。分类选 `skill`。

描述建议写明两点差异：**内容跟随上游 5.x**、**支持 `/ponytail update` 一键更新**；同时写明它不提供图形面板。

## 6. 之后每次发版

1. 改 `version`
2. `npm publish`
3. 上游内容有变时先 `/ponytail update` 确认能拉到，再发版

## 已完成

- `private` 已移除，`publishConfig.access = public`
- `keywords`、`files`（含 LICENSE）已补
- LICENSE 已含上游 DietrichGebert 版权声明
- `PKG_NAME` 改为从 `package.json` 读取，改名只需动两处
