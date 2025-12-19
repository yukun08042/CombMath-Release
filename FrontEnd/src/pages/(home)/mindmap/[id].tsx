import React, { useEffect, useState, useCallback } from 'react';
import { useHeader } from '@/context/HeaderContext';
import { AnalysisMapResponse, AnalysisSuggestionResponse, MindMapItem } from '@/lib/definitions';
import { MOCK_SUGGESTION_DATA } from '@/lib/mock';

// 引入 Mantine 组件
import {
    Card, Text, Title, Badge, Group,
    Stack, ScrollArea, LoadingOverlay, ThemeIcon, Box,
    Button, ActionIcon, Textarea, Tooltip
} from '@mantine/core';
import { notifications } from '@mantine/notifications';

// 引入图标
import {
    IconBrain, IconFileDescription, IconBulb, IconSitemap,
    IconEdit, IconCheck, IconX, IconHelp, IconAlertTriangle
} from '@tabler/icons-react';

// 引入 Markdown 相关
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// 引入分栏布局库
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';

// 引入图形组件
import SingleMindMapGraph from '@/components/SingleMindMapGraph';
import { queryAnalysis, refreshMindmap, updateMindmap } from '@/lib/api';
import { socketManager } from '@/lib/socket';
import { useParams } from 'react-router-dom';

const MindMapPage = () => {
    const {
        mindmap_id,
        setMindmapId,
        current_problem_id,
        setCurrentProblemId,
        current_solution,
        setCurrentSolution,
        current_problem_content,
        setCurrentProblemContent,
        current_mindmap,
        setCurrentMindmap
    } = useHeader();

    const [loading, setLoading] = useState(false);
    const [savingMindmap, setSavingMindmap] = useState(false);

    // --- 新增状态：编辑相关 ---
    const [isEditing, setIsEditing] = useState(false);
    const [tempSolution, setTempSolution] = useState('');

    const [suggestionData, setSuggestionData] = useState<MindMapItem | null>(null);
    const [suggestionSummary, setSuggestionSummary] = useState<string | null>(null);

    // 从 URL 参数获取 mindmap_id
    const params = useParams<{ id: string }>();
    const mindmapIdFromUrl = params.id ? parseInt(params.id) : null;

    // --- 页面加载时自动刷新数据 ---
    useEffect(() => {
        if (!mindmapIdFromUrl) {
            console.error("无法从 URL 获取 mindmap_id");
            return;
        }

        setLoading(true);
        refreshMindmap(mindmapIdFromUrl)
            .then(res => {
                if (res.data.code === 0) {
                    const data = res.data;
                    setMindmapId(data.mindmap_id);
                    setCurrentProblemId(data.problem_id);
                    setCurrentSolution(data.current_solution || "");
                    setCurrentProblemContent(data.problem_content || "");
                    setCurrentMindmap(data.current_mindmap || { nodes: [], edges: [] });
                } else {
                    console.error("刷新数据失败:", res.data);
                }
            })
            .catch(err => {
                console.error("刷新数据失败:", err);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [mindmapIdFromUrl, setMindmapId, setCurrentProblemId, setCurrentSolution, setCurrentProblemContent, setCurrentMindmap]);

    // --- 处理编辑逻辑 ---
    const handleStartEdit = () => {
        setTempSolution(current_solution || '');
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setTempSolution('');
    };

    const handleSaveEdit = () => {
        if (!current_problem_id || !mindmap_id) {
            alert('缺少 problem_id 或 mindmap_id，无法保存图谱');
            return;
        }

        setSavingMindmap(true);
        updateMindmap(current_problem_id, mindmap_id, tempSolution || '')
            .then(res => {
                if (res.data.code === 0) {
                    setCurrentSolution(tempSolution);
                    setIsEditing(false);
                } else {
                    alert(`保存失败: ${res.data.message || '未知错误'}`);
                }
            })
            .catch(err => {
                alert(`保存失败: ${err.message || '网络或服务器错误'}`);
            })
            .finally(() => {
                setSavingMindmap(false);
            });
    };

    // --- 处理提示按钮 ---
    const handleShowHint = async () => {
        if (!current_problem_id || !mindmap_id) {
            notifications.show({
                color: 'red',
                title: '无法获取提示',
                message: '缺少 problem_id 或 mindmap_id',
                icon: <IconAlertTriangle size={18} />
            });
            return;
        }

        try {
            const res = await queryAnalysis(current_problem_id, mindmap_id);
            if (res.data.code === 0) {
                notifications.show({
                    color: 'green',
                    title: '请求已发送',
                    message: 'AI 正在生成提示，请稍候...',
                    icon: <IconCheck size={18} />
                });
            } else {
                notifications.show({
                    color: 'red',
                    title: '获取提示失败',
                    message: res.data.message || '未知错误',
                    icon: <IconAlertTriangle size={18} />
                });
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : '网络或服务器错误';
            notifications.show({
                color: 'red',
                title: '获取提示失败',
                message,
                icon: <IconAlertTriangle size={18} />
            });
        }
    };

    // 处理图谱更新（用户操作或系统全量更新）
    const handleAnalysisMapResponse = useCallback((data: AnalysisMapResponse) => {
        console.log("收到新的分析图数据:", data);
        // 检查是否是当前 mindmap 的数据
        if (data.mindmap_id === mindmap_id) {
            setCurrentMindmap(data.new_mindmap);
            // 如果图谱全量更新了，通常意味着用户接受了建议或进入了新阶段，可以清空旧建议
            setSuggestionData(null);
            setSuggestionSummary(null);
        }
    }, [mindmap_id, setCurrentMindmap]);

    // 处理建议返回（核心修改）
    const handleAnalysisSuggestionResponse = useCallback((data: AnalysisSuggestionResponse) => {
        console.log("收到新的分析建议数据:", data);
        // 检查是否是当前 mindmap 的数据
        if (data.mindmap_id === mindmap_id) {
            // 1. 设置建议的图谱结构（Nodes/Edges）
            setSuggestionData(data.suggestion);
            // 2. 设置建议的总结文本
            setSuggestionSummary(data.suggestion_summary);
        }
    }, [mindmap_id]);

    // 清空建议的处理函数
    const handleClearSuggestion = () => {
        setSuggestionData(null);
        setSuggestionSummary(null);
    };

    useEffect(() => {
        socketManager.onAnalysisMap(handleAnalysisMapResponse);
        socketManager.onAnalysisSuggestion(handleAnalysisSuggestionResponse);

        return () => {
            socketManager.offAnalysisMap(handleAnalysisMapResponse);
            socketManager.offAnalysisSuggestion(handleAnalysisSuggestionResponse);
        };
    }, [handleAnalysisMapResponse, handleAnalysisSuggestionResponse]); // 依赖回调函数

    // 用于测试
    const handleTestSuggestion = () => {
        console.log("手动触发 Mock 建议...");
        // 直接调用你刚才写好的处理函数
        handleAnalysisSuggestionResponse(MOCK_SUGGESTION_DATA);
    };

    return (
        <Box style={{ height: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} bg="gray.1">
            <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />

            {/* --- 顶部标题栏 --- */}
            <Box bg="white" py="sm" px="lg" style={{ borderBottom: '1px solid #e9ecef', flexShrink: 0 }}>
                <Group justify="space-between">
                    <Group>
                        <ThemeIcon size="lg" variant="light" color="blue">
                            <IconBrain size={20} />
                        </ThemeIcon>
                        <Stack gap={0}>
                            <Title order={4}>组合数学智能解题</Title>
                            <Text size="xs" c="dimmed">MindMap ID: {mindmap_id}</Text>
                        </Stack>
                    </Group>

                    <Group>
                        {/* 3. 新增提示按钮 */}
                        <Button
                            leftSection={<IconHelp size={18} />}
                            variant="light"
                            color="orange"
                            radius="md"
                            onClick={handleShowHint}
                        >
                            获取提示
                        </Button>
                        {/* <Button
                            variant="outline"
                            color="red"
                            size="xs"
                            onClick={handleTestSuggestion}
                        >
                            [DEBUG] 模拟AI建议
                        </Button> */}
                        <Badge size="lg" variant="filled" color="blue">
                            PROBLEM #{current_problem_id}
                        </Badge>
                    </Group>
                </Group>
            </Box>

            {/* --- 主内容区域 (使用 Allotment 实现拖拽布局) --- */}
            <Box style={{ flex: 1, position: 'relative' }}>
                <Allotment>
                    {/* 左侧面板：题目 + 解析 */}
                    <Allotment.Pane preferredSize="40%" minSize={300}>
                        <Allotment vertical>

                            {/* 1. 上半部分：题目描述 (只读) */}
                            <Allotment.Pane preferredSize="30%" minSize={150}>
                                <Card shadow="none" padding="md" radius={0} withBorder style={{ height: '100%', display: 'flex', flexDirection: 'column', borderBottom: 'none', borderLeft: 'none', borderTop: 'none' }}>
                                    <Card.Section withBorder inheritPadding py="xs" bg="gray.0">
                                        <Group>
                                            <IconFileDescription size={16} />
                                            <Text fw={600} size="sm">题目描述</Text>
                                        </Group>
                                    </Card.Section>
                                    <ScrollArea style={{ flex: 1 }} type="auto" offsetScrollbars mt="sm">
                                        <Text size="sm" lh={1.6}>
                                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                {current_problem_content}
                                            </ReactMarkdown>
                                        </Text>
                                    </ScrollArea>
                                </Card>
                            </Allotment.Pane>

                            {/* 2. 下半部分：解析区域 (支持编辑/预览切换) */}
                            <Allotment.Pane>
                                <Card shadow="none" padding="md" radius={0} withBorder style={{ height: '100%', display: 'flex', flexDirection: 'column', borderLeft: 'none', borderBottom: 'none' }}>
                                    <Card.Section withBorder inheritPadding py="xs" bg={isEditing ? "blue.0" : "green.0"}>
                                        <Group justify="space-between">
                                            <Group>
                                                <IconBulb size={16} color={isEditing ? "blue" : "green"} />
                                                <Text fw={600} size="sm" c={isEditing ? "blue.9" : "green.9"}>
                                                    {isEditing ? "编辑解析思路" : "当前解析思路"}
                                                </Text>
                                            </Group>

                                            {/* 编辑控制按钮组 */}
                                            <Group gap={5}>
                                                {isEditing ? (
                                                    <>
                                                        <Tooltip label="取消">
                                                            <ActionIcon variant="subtle" color="gray" onClick={handleCancelEdit}>
                                                                <IconX size={18} />
                                                            </ActionIcon>
                                                        </Tooltip>
                                                        <Button
                                                            size="xs"
                                                            leftSection={<IconCheck size={14} />}
                                                            color="blue"
                                                            onClick={handleSaveEdit}
                                                            loading={savingMindmap}
                                                        >
                                                            保存预览
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <Button
                                                        size="xs"
                                                        variant="subtle"
                                                        leftSection={<IconEdit size={14} />}
                                                        color="gray"
                                                        onClick={handleStartEdit}
                                                    >
                                                        编辑
                                                    </Button>
                                                )}
                                            </Group>
                                        </Group>
                                    </Card.Section>

                                    {/* 内容区域：根据状态切换 Textarea 或 Markdown 预览 */}
                                    {/* 内容区域：根据状态切换 Textarea 或 Markdown 预览 */}
                                    <Box style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', marginTop: '10px' }}>
                                        {isEditing ? (
                                            <Textarea
                                                value={tempSolution}
                                                onChange={(event) => setTempSolution(event.currentTarget.value)}
                                                placeholder="在此输入 Markdown 解析..."
                                                variant="filled"
                                                // --- 核心修改开始 ---
                                                // 1. 设置组件根高度为 100%
                                                h="100%"
                                                // 2. 深入样式内部，强制每一层都撑满
                                                styles={{
                                                    root: {
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        height: '100%'
                                                    },
                                                    wrapper: {
                                                        flex: 1,
                                                        display: 'flex',
                                                        flexDirection: 'column'
                                                    },
                                                    input: {
                                                        flex: 1,           // 让 input 元素占据 wrapper 的剩余空间
                                                        height: '100%',    // 强制高度
                                                        resize: 'none',    // 既然在分栏里，就没必要让用户再拖拽文本框右下角了
                                                        fontFamily: 'monospace', // 代码/公式编辑通常用等宽字体
                                                        padding: '1rem'    // 增加一点内边距更舒服
                                                    }
                                                }}
                                            // --- 核心修改结束 ---
                                            />
                                        ) : (
                                            <ScrollArea style={{ flex: 1 }} type="auto" offsetScrollbars>
                                                <Box style={{ fontSize: '14px' }}>
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkMath]}
                                                        rehypePlugins={[rehypeKatex]}
                                                        components={{
                                                            p: ({ ...props }) => <p style={{ marginBottom: '10px' }} {...props} />,
                                                            code: ({ ...props }) => <code style={{ backgroundColor: '#f8f9fa', padding: '2px 4px', borderRadius: '4px' }} {...props} />
                                                        }}
                                                    >
                                                        {current_solution || "点击右上角编辑开始撰写解析..."}
                                                    </ReactMarkdown>
                                                </Box>
                                            </ScrollArea>
                                        )}
                                    </Box>
                                </Card>
                            </Allotment.Pane>
                        </Allotment>
                    </Allotment.Pane>

                    {/* 右侧面板：思维导图 */}
                    <Allotment.Pane>
                        <Card shadow="none" padding={0} radius={0} withBorder style={{ height: '100%', display: 'flex', flexDirection: 'column', borderRight: 'none', borderTop: 'none', borderBottom: 'none' }}>
                            <Card.Section p="xs" withBorder bg="gray.0">
                                <Group justify="space-between">
                                    <Group>
                                        <IconSitemap size={16} />
                                        <Text fw={600} size="sm">知识结构图谱</Text>
                                    </Group>
                                    <Badge variant="dot" size="xs" color="gray">只读模式</Badge>
                                </Group>
                            </Card.Section>

                            <Box style={{ flex: 1, position: 'relative', background: '#f8f9fa', overflow: 'hidden' }}>
                                {current_mindmap ? (
                                    <Box w="100%" h="100%">
                                        <SingleMindMapGraph
                                            data={current_mindmap}
                                            // --- 传递新 Props ---
                                            suggestionData={suggestionData}
                                            suggestionSummary={suggestionSummary}
                                            onClearSuggestion={handleClearSuggestion}
                                        />
                                    </Box>
                                ) : (
                                    // ... loading 态 ...
                                    <Group justify="center" align="center" h="100%" c="dimmed"><Text>图谱数据准备中...</Text></Group>
                                )}
                            </Box>
                        </Card>
                    </Allotment.Pane>
                </Allotment>
            </Box>
        </Box>
    );
};

export default MindMapPage;