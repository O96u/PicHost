# v1.2.0 本地磁盘迁移指南

v1.2.0 起，**所有本地图片文件**统一放在 `data/images/` 下；SQLite `images` 表中的 `key` 也以 `images/` 开头。旧版在 `data/blog/`、`data/twikoo/` 等与 `images` **并列的顶层目录**不再符合新模型。

迁移分 **两步**：先用手动 CLI **搬文件**，再由服务 **启动时自动同步索引**。

---

## 从其它图床迁入（EasyImage / 兰空 / Chevereto 等）

**没有**单独的「一键从外链拉取」或「对接某某图床 API」工具。从 **PicHost 旧版** 或其它自托管图床迁入，走的是同一套 **本地文件迁移**：

1. 在旧图床服务器上找到图片**物理目录**（整目录拷贝，不要只拷数据库）。
2. 把该目录放到 PicHost 的 `data/` 下，作为与 `images` **并列的顶层文件夹**（文件夹名任意，会保留为 `images/{文件夹名}/...`）。
3. 执行 `migrate` / `migrate --apply`，再重启 PicHost。

### 常见来源示例

| 来源 | 典型图片目录（在旧服务器上） | 放入 PicHost 后示例 |
| ---- | ---------------------------- | ------------------- |
| PicHost v1.1.x | `data/blog/`、`data/twikoo/` | 已在 `data/` 下，直接 `migrate` |
| EasyImage / EasyImages | `i/` 或安装目录下的 `upload/` | 拷到 `data/easyimage/` 再 `migrate` |
| 兰空图床 (Lsky) | `public/uploads/` 等 | 拷到 `data/lsky/` 再 `migrate` |
| Chevereto 等 | `images/` 或 `content/` | 拷到 `data/chevereto/` 再 `migrate` |
| 任意自定义目录 | 你的顶层文件夹名 | 拷到 `data/你的目录名/` 再 `migrate` |

脚本会扫描 `data/` 下**除 `images` 外所有顶层目录**里的图片，不限于 `blog` / `twikoo`。子目录结构会原样保留在 `images/{顶层名}/` 下。

### 操作示例（Docker）

```bash
# 在宿主机：把从旧图床打包的目录放进挂载卷（名称自定）
# 例如：./data/easyimage/2026/01/photo.jpg

docker exec pichost migrate          # 预览
docker exec pichost migrate --apply
# 重启容器 → 启动日志会补全 SQLite 索引
```

### 说明与限制

- **只迁移文件**：旧图床的账号、Token、外链 URL **不会**自动导入；`mapping.json` 里的 key 是「旧磁盘相对 key → 新 key」，**不是**旧站完整 URL，替换外链需自行对照。
- **对象存储**：若旧图床图片在 S3/R2 桶里，请用桶工具同步到本地 `data/某目录/`，或直接在 PicHost **存储**页配置同一桶（不经过本 CLI）。
- **已直接在 `data/images/` 下**：无需 `migrate`，重启后启动同步会自动建索引。

---

## 存储结构对比

### 迁移前（v1.1.x 常见）

```
/data
├── pichost.db
├── blog/
│   └── 2026/08/TeKJ2fD6cB6j.webp
├── twikoo/
│   └── xxx.webp
└── images/          # 可能已有部分新图
    └── ...
```

SQLite 中 `key` 可能是 `blog/2026/08/TeKJ2fD6cB6j.webp`（与磁盘顶层目录一致）。

### 迁移后（v1.2.0）

```
/data
├── pichost.db
├── mapping.json     # CLI 生成：旧 key → 新 key（供替换外链）
└── images/
    ├── blog/
    │   └── 2026/08/TeKJ2fD6cB6j.webp
    ├── twikoo/
    │   └── xxx.webp
    └── ...            # 新上传：images/随机ID.webp 或 images/年/月/随机ID.webp
```

对应 `key`：`images/blog/2026/08/TeKJ2fD6cB6j.webp`。

---

## 第一步：CLI 迁移磁盘文件

在 **升级镜像之前或之后**均可执行；建议在升级前完成，并先备份整个 `data/` 目录。

### Docker

```bash
# 预览：列出待迁移文件，写入 data/mapping.json（旧 key → 新 key）
docker exec pichost migrate

# 确认无误后执行文件移动
docker exec pichost migrate --apply
```

### 本地开发

```bash
npm run migrate              # 预览
npm run migrate -- --apply   # 执行
```

### 脚本行为

| 项目 | 说明 |
| ---- | ---- |
| 扫描范围 | `data/` 下**除 `images` 外所有顶层目录**（不限于 blog/twikoo） |
| 迁移目标 | `data/images/{原顶层目录名}/{相对路径}` |
| 图片类型 | `.jpg` `.jpeg` `.png` `.webp` `.gif` `.svg` `.ico` |
| 伴随文件 | 若存在同名的 `.meta.json` 会一并移动 |
| 非图片文件 | 不移动；若目录内仍有其它文件，**保留原目录**不删除 |
| 映射表 | `data/mapping.json`，例如 `"blog/foo.webp": "images/blog/foo.webp"` |

脚本路径：`server/cli/migrate-to-single-images.mjs`。

---

## 第二步：启动时自动同步索引

每次 PicHost 启动（`npm run dev`、Docker 容器启动）会自动执行，**无需手动命令**。日志示例：

```text
[INFO] 开始同步图片索引：扫描本地磁盘 {"path":".../data/images/"}
[INFO] 磁盘扫描完成：已补全缺失索引 {"inserted":3}
[INFO] 开始归一化遗留图片路径（如 blog/ → images/blog/）
[INFO] 遗留路径归一化完成：无需调整
[INFO] 开始校验索引与磁盘一致性，清理无文件的孤儿记录
[INFO] 孤儿索引清理完成：未发现孤儿记录
[INFO] 开始修复存量 Content-Type 元数据
[INFO] Content-Type 修复完成：无需修复
[INFO] 图片索引同步结束
```

| 步骤 | 作用 |
| ---- | ---- |
| 扫描 `data/images/` | 磁盘上有、索引里没有 → **补全** `images` 表 |
| 归一化遗留 key | 将 `blog/...` 等旧 key 更新为 `images/blog/...`（文件已在正确路径时） |
| 清理孤儿索引 | 索引里有记录、磁盘无文件 → **删除**幽灵记录（避免图库出现删不掉的项） |
| 修复 Content-Type | 修正错误的 `application/octet-stream` |

CLI 只负责**搬文件**；索引对齐、遗留 key、孤儿记录由启动同步处理。执行 `migrate --apply` 后**重启一次**服务即可。

---

## 推荐升级流程

1. **备份** `data/`（含 `pichost.db` 与各目录）。
2. `docker exec pichost migrate` 预览，检查输出与 `mapping.json`。
3. `docker exec pichost migrate --apply` 执行迁移。
4. 拉取 / 部署 **v1.2.0** 镜像并重启容器。
5. 查看启动日志，确认「图片索引同步结束」无报错。
6. 用 `mapping.json` 批量替换博客、Twikoo 等外链中的旧路径（若需要）。

仅使用对象存储、或图片早已全部在 `data/images/` 下时，**跳过第一步**；第二步仍会在启动时运行，通常几秒内完成且无变更日志。

---

## 外链与直链

| 场景 | 说明 |
| ---- | ---- |
| 旧 key | `blog/TeKJ2fD6cB6j.webp` |
| 新 key | `images/blog/TeKJ2fD6cB6j.webp` |
| 隐藏目录模式 | 若开启「隐藏 images 前缀」，短链可能为 `/TeKJ2fD6cB6j.webp`；服务按文件名反查索引 |
| 替换建议 | 以 `mapping.json` 为准；或重新在图库复制新链接 |

---

## 相关命令

| 命令 | 说明 |
| ---- | ---- |
| `docker exec pichost migrate` | 预览磁盘迁移 |
| `docker exec pichost migrate --apply` | 执行磁盘迁移 |
| `docker exec pichost reset-password` | 重置密码（与迁移无关） |

英文版：[migration-to-v1.2.en.md](migration-to-v1.2.en.md)
