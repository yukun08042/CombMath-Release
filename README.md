# ComboLink: AI 引导式组合数学学习平台

**ComboLink** 是一款专为组合数学设计的交互式练习与思维建模平台。它通过将复杂的解题逻辑转化为可视化的**思维导图**，并利用 **AI 启发式引导**，帮助学生在推导过程中理清思路，实现从“题海战术”到“深度思考”的跨越。

## 🌟 核心特性

- **结构化题库**：支持按章节、难度等级筛选组合数学题目。
- **解题可视化**：学生解题过程实时生成思维导图，辅助整理逻辑，防止“漏算、重算”。
- **AI 启发式助手**：基于当前的思维导图，AI 不直接提供答案，而是给出下一步的逻辑提示（Scaffolding），引导学生自主突破难点。
- **标准对比学习**：内置专家级标准思维导图与详细解析，方便学生对比查漏补缺。

---

## 🏗️ 项目结构

```text
ComboLink/
├── BackEnd/                    # 后端仓库（Python）
├── FrontEnd/                   # 前端仓库（Vue/React）
└── credentials.yaml.example    # 配置文件
```

---

## 🚀 使用方法

### 1. 配置文件

复制 `credentials.yaml.example` 为 `credentials.yaml`：

```bash
cp credentials.yaml.example credentials.yaml
```
编辑项目根目录下的 `credentials.yaml` 文件，用于配置 AI 接口。

### 2. 后端部署

1. **进入后端目录**：
   ```bash
   cd BackEnd/
   ```
2. **安装依赖**（建议 python 环境 3.10）：
   ```bash
   pip install -r requirements.txt
   ```
3. **初始化环境**（数据库建表及数据导入）：
   ```bash
   python init_backend.py
   ```
4. **启动服务**：
   ```bash
   python main.py
   ```

### 3. 前端部署

1. **新开一个终端，进入前端目录**：
   ```bash
   cd FrontEnd/
   ```
2. **安装依赖**（仅第一次或依赖更新时执行）：
   ```bash
   yarn install
   ```
3. **启动开发服务器**：
   ```bash
   yarn dev
   ```

---

## 🛠️ 技术栈

- **后端**: Python (FastAPI / SQLModel) + LLM (Chain of Thought 提示词工程)
- **前端**: Node.js + Yarn + 思维导图渲染引擎
- **数据流**: LaTeX 题目 -> JSON 结构化 -> SQLModel 数据库存储 -> 前端可视化

## 💡 设计理念

组合数学的核心难点在于思维的严密性。本系统旨在通过**图形化建模**，将抽象的选择、排列逻辑具象化。AI 的角色是“思维助教”，在学生思维中断处提供启发式建议，而非直接给出答案，从而真正提升学习者的逻辑构建能力。