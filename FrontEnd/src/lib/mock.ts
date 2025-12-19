import { ProblemItem, MindMapItem, AnalysisSuggestionResponse } from "./definitions";

export const MOCK_PROBLEMS: ProblemItem[] = [
    { problem_id: 1001, chapter_id: 1, chapter_name: "基础排列", difficulty: 1, problem_content: "有 5 本不同的书，如果将它们排成一排，一共有多少种排法？\n\n请列出计算公式。" },
    { problem_id: 1002, chapter_id: 1, chapter_name: "基础组合", difficulty: 1, problem_content: "从 10 名学生中选出 3 名代表参加比赛，不考虑顺序，一共有多少种选法？" },
    { problem_id: 1003, chapter_id: 2, chapter_name: "二项式定理", difficulty: 2, problem_content: "求 $(x + y)^5$ 展开式中，$x^2y^3$ 项的系数是多少？\n\n**提示**：使用二项式系数公式。" },
    { problem_id: 1004, chapter_id: 3, chapter_name: "鸽巢原理", difficulty: 2, problem_content: "一个袋子里有红、黄、蓝三种颜色的球各 10 个。至少要取出多少个球，才能保证其中至少有 4 个球颜色相同？" },
    { problem_id: 1005, chapter_id: 4, chapter_name: "容斥原理", difficulty: 3, problem_content: "在 1 到 100 的整数中，既不能被 2 整除，也不能被 3 整除的数有多少个？\n\n请使用容斥原理进行计算。" },
    { problem_id: 1006, chapter_id: 5, chapter_name: "圆排列", difficulty: 3, problem_content: "5 个人围坐在一张圆桌旁，如果旋转后相对位置相同视为一种坐法，共有多少种不同的坐法？" },
    { problem_id: 1007, chapter_id: 6, chapter_name: "隔板法", difficulty: 4, problem_content: "将 10 个相同的糖果分给 3 个小朋友，每个小朋友至少分到一个，一共有多少种分法？\n\n**要求**：使用插板法（Stars and Bars）解释。" },
    { problem_id: 1008, chapter_id: 7, chapter_name: "错排问题", difficulty: 4, problem_content: "4 个人参加派对，每个人都戴了一顶帽子。离开时每个人随机拿走一顶帽子，求**每个人都拿错**（即没拿到自己帽子）的情况有多少种？" },
    { problem_id: 1009, chapter_id: 8, chapter_name: "生成函数", difficulty: 5, problem_content: "利用生成函数求方程 $x_1 + x_2 + x_3 = 10$ 的非负整数解的个数，其中 $x_1 \\ge 1, x_2 \\ge 0, x_3 \\le 5$。" },
    { problem_id: 1010, chapter_id: 9, chapter_name: "图论计数", difficulty: 5, problem_content: "给定 5 个顶点的完全图 $K_5$，请问该图包含多少个不同的生成树？\n\n(提示：使用 Cayley 公式)" },
];


// 模拟详情数据：Solution (Markdown) + MindMap
export const MOCK_DETAIL_DATA: Record<number | string, { solution: string, mindmap: MindMapItem }> = {
    1001: {
        solution: "### 解析\n\n这是一个全排列问题。\n\n公式为：\n$$ P(n, n) = n! $$\n\n对于5本书，计算如下：\n$$ 5! = 5 \\times 4 \\times 3 \\times 2 \\times 1 = 120 $$\n\n所以一共有 **120** 种排法。",
        mindmap: {
            nodes: [
                { node_id: "root", node_content: "排列问题", node_type: "root" },
                { node_id: "concept", node_content: "定义: 有序", node_type: "child" },
                { node_id: "formula", node_content: "公式: n! $2^3n*3$ 测试 $2^3n*3$ 测试 $2^3n*3$测试 $2^3n*3$测试 $2^3n*3$", node_type: "child" },
                { node_id: "calc", node_content: "计算: 120", node_type: "leaf" }
            ],
            edges: [
                { edge_id: "e1", edge_content: "", source: "root", target: "concept" },
                { edge_id: "e2", edge_content: "", source: "root", target: "formula" },
                { edge_id: "e3", edge_content: "代入n=5", source: "formula", target: "calc" }
            ]
        }
    },
    // 默认回退数据 (用于其他 ID)
    "default": {
        solution: "### 通用解析\n\n1.  **分析问题**：确定这是一个组合数学问题。\n2.  **选择工具**：根据题目类型选择排列、组合或容斥原理。\n3.  **计算**：\n$$ \\sum_{i=0}^{n} \\binom{n}{i} = 2^n $$\n\n详细步骤略。",
        mindmap: {
            nodes: [
                { node_id: "1", node_content: "组合数学", node_type: "main" },
                { node_id: "2", node_content: "计数原理", node_type: "sub" },
                { node_id: "3", node_content: "加法原理", node_type: "leaf" },
                { node_id: "4", node_content: "乘法原理", node_type: "leaf" }
            ],
            edges: [
                { edge_id: "e1", edge_content: "包含", source: "1", target: "2" },
                { edge_id: "e2", edge_content: "分类", source: "2", target: "3" },
                { edge_id: "e3", edge_content: "分步", source: "2", target: "4" }
            ]
        }
    }
};

// 在 MindMapPage 组件外部或内部定义
export const MOCK_SUGGESTION_DATA: AnalysisSuggestionResponse = {
    problem_id: 3,
    mindmap_id: 27,
    suggestion: {
        nodes: [
            {
                node_id: "SUG_N1", // 使用特殊前缀避免 ID 冲突
                node_content: "**核心思路：隔板法**\n\n(Stars and Bars)",
                node_type: "AI_STRATEGY"
            },
            {
                node_id: "SUG_N2",
                node_content: "适用条件：\n1. 元素相同\n2. 盒子不同\n3. 盒子不为空",
                node_type: "AI_CONDITION"
            },
            {
                node_id: "SUG_N3",
                node_content: "公式：\n$$C_{n-1}^{m-1}$$",
                node_type: "AI_FORMULA"
            }
        ],
        edges: [
            {
                edge_id: "SUG_E1",
                edge_content: "依赖",
                source: "SUG_N1",
                target: "SUG_N2"
            },
            {
                edge_id: "SUG_E2",
                edge_content: "推导",
                source: "SUG_N1",
                target: "SUG_N3"
            }
            // 注意：为了演示效果，这里没有连接到原有的图谱节点。
            // 实际场景中，AI 可能会返回一条边，将 source 指向你图中已有的某个 Node ID。
        ]
    },
    suggestion_summary: "### 💡 AI 破题建议\n\n根据题目描述，这是一个经典的**球放盒子**模型。\n\n检测到你正在列举所有可能性，这在数量较大时效率较低。建议尝试 **「隔板法」**：\n\n* 将问题转化为在 $n$ 个元素间的 $n-1$ 个空位中插入 $m-1$ 个隔板。\n* 请查看图谱中高亮的**虚线节点**以获取详细结构。"
};