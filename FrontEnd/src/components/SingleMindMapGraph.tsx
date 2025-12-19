// FrontEnd/src/components/SingleMindMapGraph.tsx

import React, { useEffect, useCallback, useMemo, useState } from 'react';
import ReactFlow, {
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    MarkerType,
    Node,
    Edge,
    ConnectionLineType,
    Panel,
    ProOptions
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { MindMapItem } from '@/lib/definitions';
import CustomMindMapNode from './CustomMindMapNode';
// 1. 引入新组件
import SuggestionMindMapNode from './SuggestionMindMapNode';
import { Button, Alert, ActionIcon, Group, Text, Transition } from '@mantine/core';
import { IconLayoutDashboard, IconBulb, IconX } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import MarkdownEdge from './MarkdownEdge'; // 引入新组件

interface MindMapGraphProps {
    data: MindMapItem | null;
    // 2. 新增 Props
    suggestionData?: MindMapItem | null;
    suggestionSummary?: string | null;
    onClearSuggestion?: () => void; // 用于关闭建议的回调
}

const NODE_WIDTH = 350;
const NODE_HEIGHT = 150;

const proOptions: ProOptions = { hideAttribution: true };

const SingleMindMapGraph: React.FC<MindMapGraphProps> = ({
    data,
    suggestionData,
    suggestionSummary,
    onClearSuggestion
}) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // 3. 注册新的节点类型 'suggestion'
    const nodeTypes = useMemo(() => ({
        custom: CustomMindMapNode,
        suggestion: SuggestionMindMapNode,
    }), []);

    // 1. 注册 Edge 类型
    const edgeTypes = useMemo(() => ({
        markdown: MarkdownEdge,
    }), []);

    const getLayoutedElements = useCallback((nodes: Node[], edges: Edge[]) => {
        const g = new dagre.graphlib.Graph();
        g.setGraph({ rankdir: 'LR' });
        g.setDefaultEdgeLabel(() => ({}));

        nodes.forEach((node) => {
            g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
        });

        edges.forEach((edge) => {
            g.setEdge(edge.source, edge.target);
        });

        dagre.layout(g);

        const layoutedNodes = nodes.map((node) => {
            const nodeWithPosition = g.node(node.id);
            return {
                ...node,
                position: {
                    x: nodeWithPosition.x - NODE_WIDTH / 2,
                    y: nodeWithPosition.y - NODE_HEIGHT / 2,
                },
            };
        });

        return { nodes: layoutedNodes, edges };
    }, []);

    useEffect(() => {
        // 基础数据处理
        const rawNodes = data?.nodes || [];
        const rawEdges = data?.edges || [];

        // 4. 将现有节点转换为 ReactFlow 格式
        let initialNodes: Node[] = rawNodes.map((node, index) => ({
            id: node.node_id,
            type: 'custom',
            data: {
                label: node.node_content,
                type: node.node_type
            },
            position: { x: 0, y: 0 },
        }));

        let initialEdges: Edge[] = rawEdges.map((edge) => ({
            id: edge.edge_id,
            source: edge.source,
            target: edge.target,
            label: edge.edge_content,
            type: 'markdown', // 修改这里
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: '#888' },
            focusable: false,
            selectable: false
        }));

        // 5. 如果有建议数据，合并进来
        if (suggestionData) {
            const suggestionNodes: Node[] = suggestionData.nodes.map(node => ({
                id: node.node_id,
                type: 'suggestion', // 使用新类型
                data: {
                    label: node.node_content,
                    type: 'AI Suggestion'
                },
                position: { x: 0, y: 0 },
                zIndex: 10, // 让建议稍微浮起
            }));

            const suggestionEdges: Edge[] = suggestionData.edges.map(edge => ({
                id: edge.edge_id,
                source: edge.source,
                target: edge.target,
                label: edge.edge_content,
                type: 'markdown', // 这里也修改为 markdown
                animated: true,
                markerEnd: { type: MarkerType.ArrowClosed, color: '#fcc419' },
                style: {
                    stroke: '#fcc419',
                    strokeWidth: 2,
                    strokeDasharray: '5,5'
                },
            }));

            initialNodes = [...initialNodes, ...suggestionNodes];
            initialEdges = [...initialEdges, ...suggestionEdges];
        }

        if (initialNodes.length === 0) {
            setNodes([]);
            setEdges([]);
            return;
        }

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            initialNodes,
            initialEdges
        );

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);

    }, [data, suggestionData, getLayoutedElements, setNodes, setEdges]); // 监听 suggestionData 变化

    const onLayout = useCallback(() => {
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            nodes,
            edges
        );
        setNodes([...layoutedNodes]);
        setEdges([...layoutedEdges]);
    }, [nodes, edges, getLayoutedElements, setNodes, setEdges]);

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            style={{ width: '100%', height: '100%' }}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            connectionLineType={ConnectionLineType.SmoothStep}
            fitView
            minZoom={0.1}
            proOptions={proOptions}
            nodesDraggable={true}
            nodesConnectable={false}
            elementsSelectable={true}
            deleteKeyCode={null}
            selectionKeyCode={null}
        >
            <Controls showInteractive={false} />
            <Background color="#f1f3f5" gap={20} />

            <Panel position="top-right">
                <Button
                    leftSection={<IconLayoutDashboard size={16} />}
                    onClick={onLayout}
                    size="xs"
                    variant="white"
                >
                    重置视图
                </Button>
            </Panel>

            {/* 6. 悬浮展示 Suggestion Summary */}
            {suggestionSummary && (
                <Panel position="bottom-center" style={{ width: '80%', maxWidth: '600px', marginBottom: '20px' }}>
                    <Transition mounted={!!suggestionSummary} transition="slide-up" duration={400} timingFunction="ease">
                        {(styles) => (
                            <Alert
                                style={{ ...styles, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                radius="md"
                                color="orange"
                                variant="light"
                                title={
                                    <Group justify="space-between">
                                        <Group gap={8}>
                                            <IconBulb size={18} />
                                            <Text fw={700}>AI 解题思路建议</Text>
                                        </Group>
                                        {onClearSuggestion && (
                                            <ActionIcon variant="subtle" color="orange" onClick={onClearSuggestion} size="sm">
                                                <IconX size={16} />
                                            </ActionIcon>
                                        )}
                                    </Group>
                                }
                            >
                                <Text size="sm" c="dimmed">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
                                    >
                                        {suggestionSummary}
                                    </ReactMarkdown>
                                </Text>
                            </Alert>
                        )}
                    </Transition>
                </Panel>
            )}
        </ReactFlow>
    );
};

export default SingleMindMapGraph;