import React, { useEffect, useState, useMemo } from 'react';
import {
    Table, Button, Text, Badge, Card, Group, Modal, Box, Divider,
    Stack, Select, Tabs, LoadingOverlay, Alert, ScrollArea
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconEye, IconBook, IconMathFunction, IconX, IconBulb, IconSitemap } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import { MindMapItem, ProblemItem } from '@/lib/definitions';
import { MOCK_DETAIL_DATA, MOCK_PROBLEMS } from '@/lib/mock';
import MindMapGraph from '@/components/MindMapGraph';
import { useHeader } from '@/context/HeaderContext';
import { getAllProblems, singleProblemDetail, startSolution } from '@/lib/api';
import { showLoading, updateError, updateSuccess } from '@/components/NotificationHandler';
import { useNavigate } from 'react-router-dom';

// ... (API mock 代码保持不变)
interface ProblemDetailResponse {
    code: number;
    problem_solution: string;
    problem_mindmap: MindMapItem;
    message?: string;
}

const mockGetProblemDetail = (id: number): Promise<ProblemDetailResponse> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const data = MOCK_DETAIL_DATA[id] || MOCK_DETAIL_DATA["default"];
            resolve({
                code: 0,
                problem_solution: data.solution,
                problem_mindmap: data.mindmap
            });
        }, 400);
    });
};

const List = () => {
    const [problems, setProblems] = useState<ProblemItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
    const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
    const [opened, { open, close }] = useDisclosure(false);
    const [activeTab, setActiveTab] = useState<string | null>('problem');
    const [selectedProblem, setSelectedProblem] = useState<ProblemItem | null>(null);
    const [selectProblemSolution, setSelectProblemSolution] = useState<string | null>(null);
    const [selectedMindMap, setSelectedMindMap] = useState<MindMapItem | null>(null);
    const { setMindmapId, setCurrentProblemId, setCurrentSolution, setCurrentProblemContent, setCurrentMindmap } = useHeader();
    const navigate = useNavigate();

    const getDifficultyColor = (difficulty: number) => {
        if (difficulty <= 1) return 'green';
        if (difficulty === 2) return 'cyan';
        if (difficulty === 3) return 'yellow';
        if (difficulty === 4) return 'orange';
        return 'red';
    };

    const handleStartAnswer = (problem: ProblemItem) => {
        console.log("开始作答题目:", problem);
        const id = showLoading("开始作答...");
        startSolution(problem.problem_id).then(res => {
            if (res.data.code === 0) {
                setMindmapId(res.data.mindmap_id);
                setCurrentProblemId(problem.problem_id);
                setCurrentSolution(res.data.current_solution);
                setCurrentProblemContent(problem.problem_content);
                setCurrentMindmap(res.data.current_mindmap);
                updateSuccess(id, "开始作答成功", `已开始作答题目 ID: ${problem.problem_id}`);
                navigate(`/mindmap/${res.data.mindmap_id}`);
            } else {
                updateError(id, "开始作答失败", res.data.message || "未知错误");
            }
        }).catch(err => {
            console.error('开始作答错误:', err);
            updateError(id, "开始作答失败", err.message || "网络或服务器错误");
        });

        // Mock 版本
        // new Promise<{ code: number; mindmap_id: number; current_solution: string; current_mindmap: MindMapItem; message?: string }>((resolve) => {
        //     setTimeout(() => { resolve({ code: 0, mindmap_id: 27, current_solution: "这是一个模拟的解答过程。", current_mindmap: MOCK_DETAIL_DATA["default"].mindmap }); }, 500);
        // }).then(res => {
        //     if (res.code === 0) {
        //         setMindmapId(res.mindmap_id);
        //         setCurrentProblemId(problem.problem_id);
        //         setCurrentSolution(res.current_solution);
        //         setCurrentProblemContent(problem.problem_content);
        //         setCurrentMindmap(res.current_mindmap);
        //         updateSuccess(id, "开始作答成功", `已开始作答题目 ID: ${problem.problem_id}`);
        //         navigate(`/mindmap/${res.mindmap_id}`);
        //     } else {
        //         updateError(id, "开始作答失败", res.message || "未知错误");
        //     }
        // }).catch(err => {
        //     console.error('开始作答错误:', err);
        //     updateError(id, "开始作答失败", err.message || "网络或服务器错误");
        // });
    };

    useEffect(() => {
        setLoading(true);
        // new Promise<ProblemItem[]>((resolve) => {
        //     setTimeout(() => { resolve(MOCK_PROBLEMS); }, 500);
        // }).then(data => {
        //     setProblems(data);
        //     setLoading(false);
        // });
        getAllProblems().then(res => {
            if (res.data.code === 0) {
                setProblems(res.data.problems);
                setLoading(false);
            } else {
                console.error('获取题目列表失败:', res.data.message);
                setLoading(false);
            }
        }).catch(err => {
            console.error('获取题目列表错误:', err);
            setLoading(false);
        });
    }, []);

    const chapterOptions = useMemo(() => {
        const chapters = Array.from(new Set(problems.map(p => p.chapter_name)));
        return chapters.map(c => ({ value: c, label: c }));
    }, [problems]);

    const difficultyOptions = [
        { value: '1', label: 'Level 1 (基础)' },
        { value: '2', label: 'Level 2 (进阶)' },
        { value: '3', label: 'Level 3 (中等)' },
        { value: '4', label: 'Level 4 (困难)' },
        { value: '5', label: 'Level 5 (专家)' },
    ];

    const filteredProblems = useMemo(() => {
        return problems.filter(item => {
            const matchChapter = selectedChapter ? item.chapter_name === selectedChapter : true;
            const matchDifficulty = selectedDifficulty ? item.difficulty.toString() === selectedDifficulty : true;
            return matchChapter && matchDifficulty;
        });
    }, [problems, selectedChapter, selectedDifficulty]);

    const handleViewDetails = (problem: ProblemItem) => {
        setSelectedProblem(problem);
        setActiveTab('problem');
        setSelectProblemSolution(null);
        setSelectedMindMap(null);
        setDetailsLoading(true);
        open();

        // mockGetProblemDetail(problem.problem_id)
        //     .then(res => {
        //         if (res.code === 0) {
        //             setSelectProblemSolution(res.problem_solution);
        //             setSelectedMindMap(res.problem_mindmap);
        //         }
        //     })
        //     .catch(err => console.error(err))
        //     .finally(() => {
        //         setDetailsLoading(false);
        //     });

        singleProblemDetail(problem.problem_id).then(res => {
            if (res.data.code === 0) {
                setSelectProblemSolution(res.data.problem_solution);
                setSelectedMindMap(res.data.problem_mindmap);
                // 转换 MindMap 数据格式
                // if (res.data.problem_mindmap) {
                //     const { nodes: rfNodes, edges: rfEdges } = transformMindMapData(res.data.problem_mindmap);
                //     setNodes(rfNodes);
                //     setEdges(rfEdges);
                // }
            } else {
                console.error('获取题目详情失败:', res.data.message);
                setSelectProblemSolution(null);
                setSelectedMindMap(null);
            }
        }).catch(err => {
            console.error('获取题目详情错误:', err);
            setSelectProblemSolution(null);
            setSelectedMindMap(null);
        })
        .finally(() => {
            setDetailsLoading(false);
        });
    };

    const clearFilters = () => {
        setSelectedChapter(null);
        setSelectedDifficulty(null);
    };

    // ... (rows 渲染逻辑保持不变)
    const rows = filteredProblems.map((problem) => (
        <Table.Tr key={problem.problem_id}>
            <Table.Td><Text size="sm" fw={500}>#{problem.problem_id}</Text></Table.Td>
            <Table.Td>
                <Group gap="xs">
                    <IconMathFunction size={16} style={{ opacity: 0.5 }} />
                    <Text size="sm">{problem.chapter_name}</Text>
                </Group>
            </Table.Td>
            <Table.Td>
                <Badge color={getDifficultyColor(problem.difficulty)} variant="light">
                    Level {problem.difficulty}
                </Badge>
            </Table.Td>
            <Table.Td style={{ maxWidth: '400px' }}>
                <Text lineClamp={2} size="sm" c="dimmed" component="div">
                    <ReactMarkdown components={{ h1: 'span', h2: 'span', h3: 'span', p: 'span' }} remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{problem.problem_content}</ReactMarkdown>
                </Text>
            </Table.Td>
            <Table.Td>
                <Button variant="subtle" size="xs" rightSection={<IconEye size={14} />} onClick={() => handleViewDetails(problem)}>查看详情</Button>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <>
            <Card shadow="sm" padding="lg" radius="md" withBorder h="100%" style={{ display: 'flex', flexDirection: 'column' }}>
                {/* ... (头部筛选区域保持不变) ... */}
                <Box mb="md">
                    <Group justify="space-between" mb="sm">
                        <Group>
                            <IconBook size={24} />
                            <Text size="xl" fw={700}>组合数学题库</Text>
                        </Group>
                        <Badge variant="outline" size="lg">{filteredProblems.length} 题</Badge>
                    </Group>
                    <Group align="end">
                        <Select label="按章节筛选" placeholder="所有章节" data={chapterOptions} value={selectedChapter} onChange={setSelectedChapter} clearable searchable style={{ width: 200 }} />
                        <Select label="按难度筛选" placeholder="所有难度" data={difficultyOptions} value={selectedDifficulty} onChange={setSelectedDifficulty} clearable style={{ width: 180 }} />
                        {(selectedChapter || selectedDifficulty) && (
                            <Button variant="light" color="gray" onClick={clearFilters} leftSection={<IconX size={14} />}>重置</Button>
                        )}
                    </Group>
                </Box>

                <Divider mb="sm" />

                <Table.ScrollContainer minWidth={800} h={600} type="native">
                    <Table verticalSpacing="sm" highlightOnHover stickyHeader>
                        <Table.Thead bg="white">
                            <Table.Tr>
                                <Table.Th>ID</Table.Th>
                                <Table.Th>章节</Table.Th>
                                <Table.Th>难度</Table.Th>
                                <Table.Th>问题预览</Table.Th>
                                <Table.Th>操作</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {loading ? (
                                <Table.Tr><Table.Td colSpan={5}><Text ta="center" py="xl">加载中...</Text></Table.Td></Table.Tr>
                            ) : rows.length > 0 ? rows : (
                                <Table.Tr><Table.Td colSpan={5}><Text ta="center" py="xl">无匹配题目</Text></Table.Td></Table.Tr>
                            )}
                        </Table.Tbody>
                    </Table>
                </Table.ScrollContainer>
            </Card>

            {/* --- 详情 Modal --- */}
            <Modal
                opened={opened}
                onClose={close}
                title={
                    <Group>
                        <Text fw={700} size="lg">题目详情</Text>
                        {selectedProblem && <Badge variant="outline">ID: {selectedProblem.problem_id}</Badge>}
                    </Group>
                }
                size="80%" // Modal 宽度
                padding="lg"
                centered
                // --- 核心修改：固定高度且禁止 Modal Body 滚动 ---
                scrollAreaComponent={React.Fragment} // 禁用 Mantine 默认的滚动包装器
                styles={{
                    content: { height: '80vh', display: 'flex', flexDirection: 'column' }, // 固定 Modal 内容区高度
                    header: { flexShrink: 0 }, // 头部不收缩
                    body: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' } // Body 占据剩余空间，隐藏全局溢出
                }}
            // ----------------------------------------------
            >
                <Box pos="relative" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <LoadingOverlay visible={detailsLoading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />

                    {selectedProblem && (
                        <Tabs
                            value={activeTab}
                            onChange={setActiveTab}
                            color="blue"
                            radius="md"
                            style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                        >
                            <Tabs.List mb="md" style={{ flexShrink: 0 }}>
                                <Tabs.Tab value="problem" leftSection={<IconBook size={16} />}>题目描述</Tabs.Tab>
                                <Tabs.Tab value="solution" leftSection={<IconBulb size={16} />}>查看解析</Tabs.Tab>
                                <Tabs.Tab value="mindmap" leftSection={<IconSitemap size={16} />}>知识图谱</Tabs.Tab>
                            </Tabs.List>

                            {/* 1. 题目 Tab - 需要 ScrollArea */}
                            <Tabs.Panel value="problem" style={{ flex: 1, overflow: 'hidden' }}>
                                <ScrollArea h="100%" type="auto" offsetScrollbars>
                                    <Stack pb="md" pr="sm"> {/* pr 用于避免滚动条遮挡内容 */}
                                        <Group>
                                            <Badge variant="dot" size="lg">{selectedProblem.chapter_name}</Badge>
                                            <Badge color={getDifficultyColor(selectedProblem.difficulty)}>
                                                Level {selectedProblem.difficulty}
                                            </Badge>
                                        </Group>
                                        <Box p="md" bg="gray.0" style={{ borderRadius: '8px', minHeight: '200px' }}>
                                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                {selectedProblem.problem_content}
                                            </ReactMarkdown>
                                        </Box>
                                    </Stack>
                                </ScrollArea>
                            </Tabs.Panel>

                            {/* 2. 解析 Tab - 需要 ScrollArea */}
                            <Tabs.Panel value="solution" style={{ flex: 1, overflow: 'hidden' }}>
                                <ScrollArea h="100%" type="auto" offsetScrollbars>
                                    {selectProblemSolution ? (
                                        <Box p="md" bg="green.0" style={{ borderRadius: '8px', border: '1px solid #b2f2bb', minHeight: '200px' }}>
                                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                {selectProblemSolution}
                                            </ReactMarkdown>
                                        </Box>
                                    ) : (
                                        <Alert color="gray">暂无解析数据</Alert>
                                    )}
                                </ScrollArea>
                            </Tabs.Panel>

                            {/* 3. MindMap Tab - 不需要 ScrollArea，ReactFlow 自带画布平移 */}
                            <Tabs.Panel value="mindmap" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                                <Box style={{ flex: 1, border: '1px solid #e9ecef', borderRadius: '8px', overflow: 'hidden' }}>
                                    <MindMapGraph data={selectedMindMap} />
                                </Box>
                            </Tabs.Panel>
                        </Tabs>
                    )}
                </Box>

                <Group justify="flex-end" mt="md" style={{ flexShrink: 0 }}>
                    <Button variant="default" onClick={close}>关闭</Button>
                    {selectedProblem && (
                        <Button onClick={() => handleStartAnswer(selectedProblem)}>开始作答</Button>
                    )}
                </Group>
            </Modal>
        </>
    );
};

export default List;