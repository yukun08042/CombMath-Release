import React, { useEffect, useCallback, useMemo } from 'react';
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
import MarkdownEdge from './MarkdownEdge'; // 引入新组件
import { Button } from '@mantine/core';
import { IconLayoutDashboard } from '@tabler/icons-react';

interface MindMapGraphProps {
    data: MindMapItem | null;
}

const NODE_WIDTH = 350;
const NODE_HEIGHT = 150;

// 配置 ReactFlow 隐藏右下角的 attribution (可选)
const proOptions: ProOptions = { hideAttribution: true };

const MindMapGraph: React.FC<MindMapGraphProps> = ({ data }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    const nodeTypes = useMemo(() => ({
        custom: CustomMindMapNode,
    }), []);

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
        if (!data) {
            setNodes([]);
            setEdges([]);
            return;
        }

        const initialNodes: Node[] = data.nodes.map((node, index) => ({
            id: node.node_id,
            type: 'custom',
            data: {
                label: node.node_content,
                type: node.node_type,
            },
            position: { x: 0, y: 0 },
        }));

        const initialEdges: Edge[] = data.edges.map((edge) => ({
            id: edge.edge_id,
            source: edge.source,
            target: edge.target,
            label: edge.edge_content,
            type: 'markdown',
            markerEnd: { type: MarkerType.ArrowClosed },
            animated: true,
            style: { stroke: '#888' },
            // 禁止选中连线
            focusable: false, 
            selectable: false 
        }));

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            initialNodes,
            initialEdges
        );

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);

    }, [data, getLayoutedElements, setNodes, setEdges]);

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
            onNodesChange={onNodesChange} // 保持 change 处理，内部状态需要更新，但通过 draggable 禁止用户拖动
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            connectionLineType={ConnectionLineType.SmoothStep}
            fitView
            minZoom={0.1}
            proOptions={proOptions}
            // --- 关键修改：禁止编辑 ---
            nodesDraggable={true}     // 允许拖拽节点以便查看全图
            nodesConnectable={false}   // 禁止连接节点
            elementsSelectable={true}  // 允许选中（为了高亮效果），但不能移动
            deleteKeyCode={null}       // 禁用删除键
            selectionKeyCode={null}    // 禁用框选键 (可选)
            
            // ------------------------
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
        </ReactFlow>
    );
};

export default MindMapGraph;