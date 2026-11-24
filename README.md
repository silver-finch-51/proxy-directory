# 代理客户端大全 — Cloudflare Pages 重建版

把 Muse 里的 fullstack 站重建为可部署到 `xiaoxin.loc.cc` 的版本。
全免费：Cloudflare Pages + Pages Functions + Workers KV + 一个定时 Worker，
不用绑卡。

## 为什么要重建

Muse 的 fullstack artifact 没有公开链接、不能绑自定义域名、不能导出，
所以域名挂不上去。数据已从原站导出（`../data/artifact-site-export-2026-11-24.json`），
本项目用这份数据作种子重建。

## 目录结构

```
cloudflare/
├── wrangler.toml            # Pages 项目配置（KV 绑定；Secrets 不进文件）
├── package.json             # 仅用于本地 node 校验（无依赖）
├── public/                  # 静态前端
│   ├── index.html           # 应用目录：搜索 / 筛选 / 排序 + 机场栏目
│   ├── app.html             # 应用详情页（?slug=）
│   ├── admin.html           # 管理后台
│   ├── app.js               # 首页逻辑
│   ├── detail.js            # 详情页逻辑
│   ├── admin.js             # 后台逻辑（登录、CRUD、手动刷新 Star）
│   ├── styles.css
│   └── _headers             # 基础安全头
├── functions/               # Pages Functions（API 层）
│   ├── _lib/                # 不参与路由的共享代码（_ 前缀目录不路由）
│   │   ├── store.js         # KV 读写：settings / apps / airports / vps / star_history
│   │   ├── auth.js          # 后台登录：HMAC 令牌，密钥为 ADMIN_PASSWORD
│   │   ├── validate.js      # 入参校验与归一化
│   │   └── refreshStars.js  # Star 刷新（定时与手动共用同一份代码）
│   └── api/
│       ├── sitedata.js      # GET /api/sitedata（前台一次取全量）
│       ├── apps/[slug].js   # GET /api/apps/:slug（详情页）
│       ├── admin/
│       │   ├── _middleware.js   # /api/admin/* 鉴权（login 除外）
│       │   ├── login.js         # POST /api/admin/login
│       │   ├── apps.js          # GET 列表 / POST 新建
│       │   ├── apps/[slug].js   # PUT 修改 / DELETE 删除
│       │   ├── airports.js      # GET 列表 / POST 新建
│       │   ├── airports/[id].js # PUT 修改 / DELETE 删除
│       │   ├── vps.js      # GET 列表 / POST 新建
│       │   ├── vps/[id].js # PUT 修改 / DELETE 删除
│       │   ├── settings.js      # GET / PUT 站名
│       │   └── refresh-stars.js # POST 手动刷新 Star
│       └── cron/
│           └── refresh-stars.js # POST 定时刷新入口（x-cron-auth 校验）
├── worker-cron/             # 定时 Worker（Pages 没有原生 Cron Trigger，见下）
│   ├── worker.js            # scheduled() → POST /api/cron/refresh-stars
│   └── wrangler.toml        # crons = ["0 0 * * *"]（每天 00:00 UTC = 北京时间 08:00）
├── seed/                    # KV 种子数据（由 scripts/build-seed.mjs 生成）
│   ├── settings.json        # { siteName }
│   ├── apps.json            # 17 个应用全字段
│   ├── airports.json        # []（机场初始为空）
│   ├── vps.json           # 10 家 VPS 商家全字段
│   └── star_history.json    # {"2026-11-24": {slug: stars}}（12 个有仓库的应用）
└── scripts/
    ├── build-seed.mjs       # 从导出的 JSON 重新生成 seed/
    └── seed.sh              # 把 seed/ 写进 KV（wrangler kv key put）
```

## 数据层（Workers KV，一个命名空间，五个 key）

| key | 内容 |
|---|---|
| `settings` | `{ siteName }` |
| `apps` | 应用数组（字段与导出 JSON 一致；Star 相关字段由刷新任务维护，后台不手改） |
| `airports` | 机场数组（初始为空；前台无数据时隐藏栏目） |
| `vps` | VPS 商家数组（初始 10 家；前台无数据时隐藏栏目） |
| `star_history` | `{ "YYYY-MM-DD": { slug: stars } }` 每日快照 |

绑定名：`SITE_DATA`。KV 是最终一致的：后台改完数据，前台可能有几秒延迟，属正常现象。

## 每日 Star 刷新

流程：`worker-cron` 每天 00:00 UTC（北京时间 08:00）触发 →
POST `https://xiaoxin.loc.cc/api/cron/refresh-stars`（带 `x-cron-auth: CRON_SECRET`）→
`functions/_lib/refreshStars.js` 调 `api.github.com/repos/{owner}/{repo}` 取 12 个
有仓库应用的 Star 数（未登录 GitHub API 限额 60 次/小时，12 次完全够用，不用 token）→
写当日快照进 `star_history`，重算 7 日/30 日涨幅。
后台的「刷新 Star」按钮（POST `/api/admin/refresh-stars`）调用同一份代码。

**为什么单独一个 Worker？** Cloudflare 官方的 Pages Functions API 参考只列出
`onRequest*` 方法，没有定时入口；Pages 本身不支持原生 Cron Trigger。
所以定时部分用一个独立 Worker 做调度，刷新逻辑仍在 Pages Function 里，
两处共用同一份代码。

**涨幅口径说明（重要）：** 种子里只有 2026-11-24 这一份快照。
刷新逻辑只有在存在至少 7 天 / 30 天前的快照时才重算 7 日 / 30 日涨幅，
否则保留种子里的数值。所以新站上线后头 7 天内 7 日涨幅、头 30 天内
30 日涨幅显示的是种子数值（截至 2026-11-24 的真实涨幅），
7 天 / 30 天后随每日快照积累自动变为真实值。当前 Star 总数始终准确。

## 部署步骤（按顺序）

前置账号（都已确认）：

- Cloudflare 账号：用 `z166317521@gmail.com` 注册，免费，不用绑卡。
- GitHub 账号：用户名 `silver-finch-51`，邮箱 `z166317521@gmail.com`。
- Yunamo 账号：已有，管 `xiaoxin.loc.cc` 的 DNS。

### 1. 建仓库并推代码

```bash
cd cloudflare
git init
git add -A
git commit -m "proxy directory: cloudflare pages rebuild"
git remote add origin https://github.com/silver-finch-51/proxy-directory.git
git push -u origin main
```

### 2. 创建 KV 命名空间，填进 wrangler.toml

```bash
wrangler kv namespace create SITE_DATA
# 把返回的 id 填到 wrangler.toml 的 [[kv_namespaces]] id 字段
# （把占位符 PASTE_KV_NAMESPACE_ID_HERE 换掉）
```

### 3. 创建 Pages 项目并首次部署

Cloudflare 控制台 → Workers & Pages → Create → Pages → Connect to Git：

- 选仓库 `silver-finch-51/proxy-directory`
- Framework preset：None（纯静态 + Functions）
- Build output directory：`public`
- Root directory：`cloudflare`（如果仓库根就是本项目则留空）
- 部署后先验证 `https://<项目名>.pages.dev` 能打开

也可以用 CLI：`wrangler pages deploy public --project-name proxy-directory`

### 4. 写入种子数据

```bash
bash scripts/seed.sh
# 依次写入 settings / apps / airports / vps / star_history 五个 key
```

### 5. 设置 Secrets（两个，绝不能写进代码或仓库）

Pages 项目 → Settings → Variables and Secrets：

| 名称 | 值 | 说明 |
|---|---|---|
| `ADMIN_PASSWORD` | 后台登录密码（自己定一个强密码） | 用户名固定为 `admin`；登录失败时整个后台拒绝访问 |
| `CRON_SECRET` | 随机长字符串（自己生成，如 `openssl rand -hex 32`） | 定时刷新接口的校验密钥 |

`ADMIN_PASSWORD` 建议与原 Muse 站的初始密码不同，设好后只记在自己手里。

### 6. 部署定时 Worker

```bash
cd worker-cron
wrangler secret put CRON_SECRET   # 与第 5 步同一个值
wrangler deploy
```

`worker-cron/wrangler.toml` 里 `SITE_URL` 默认就是 `https://xiaoxin.loc.cc`；
如果域名还没绑好、想先用 `https://<项目名>.pages.dev` 测试，
先把 `SITE_URL` 改成 pages.dev 地址，绑好域名后再改回并重新部署。

### 7. 绑自定义域名（顺序别反）

1. Pages 项目 → Custom domains → Set up a domain → 输入 `xiaoxin.loc.cc`，
   记下 Cloudflare 给出的 CNAME 目标（即 `<项目名>.pages.dev`）。
2. 再去 Yunamo 控制台 → `xiaoxin.loc.cc` 的 DNS 管理 → 添加一条 CNAME：

   | 类型 | 主机记录 | 值 | TTL |
   |---|---|---|---|
   | CNAME | `xiaoxin` | `<项目名>.pages.dev` | 自动/默认 |

   主机记录填 `xiaoxin` 还是 `xiaoxin.loc.cc`，看 Yunamo 控制台的要求；
   值不要带 `https://`、不要带斜杠和路径；不要动其他记录；**不要改 nameserver**。
   顺序反了（先加 CNAME、后在 Pages 里登记域名）访问会报 522。

3. 等 Cloudflare 验证通过、证书签发（几分钟到几小时）。

### 8. 验收

- 打开 `https://xiaoxin.loc.cc`：目录、搜索、筛选、排序、详情页正常；
  机场栏目当前应隐藏（机场表为空）。
- 打开 `/admin.html`，用 `admin` + 第 5 步的密码登录：增删改应用/机场、
  改站名，确认前台下次请求即生效。
- 点「刷新 Star」确认手动刷新跑通；次日早上确认定时刷新跑通
  （Worker 日志：Workers & Pages → proxy-directory-cron → Logs）。

## 本地开发与校验

```bash
# 重新生成种子（改了导出数据后）
node scripts/build-seed.mjs

# 语法校验（全部 JS 文件）
find . -name "*.js" -not -path "./node_modules/*" -exec node --check {} \;

# 本地跑 Pages（含 Functions；KV 用 --kv SITE_DATA 绑定本地/远程命名空间）
npx wrangler pages dev public --kv SITE_DATA
```

## 注意事项

- 全站不得出现任何邀请码/推广链接；下载链接只放官方地址（GitHub Releases /
  App Store / 官网）。后台新增应用时也只填官方链接。
- 不要放教程栏目、纪事、百科（用户已定不要）。
- 机场由站长在后台自己加；不要预装任何机场数据。
- 免费额度足够：Workers 每天 10 万次请求、KV 每天 10 万次读 / 1000 次写、
  Cron Trigger 免费版每账号 5 个；每天 Star 刷新只需 12 次 GitHub API 调用。
- 原 Muse 里的站先留着当备份，确认新站稳定运行后再决定是否删除
  （删除不可恢复，删前必须用户确认）。
