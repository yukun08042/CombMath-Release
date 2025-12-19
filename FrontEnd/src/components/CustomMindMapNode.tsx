import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, Text, Badge, Box, Group, ThemeIcon } from '@mantine/core';
import { IconCircleDot } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// 定义节点数据结构，根据你的 Mock 数据调整
interface CustomNodeData {
    label: string; // 核心内容 (Markdown)
    type?: string; // 节点类型，例如 "Root", "Concept", "Formula"
}

const CustomMindMapNode = ({ data, selected }: NodeProps<CustomNodeData>) => {
    return (
        <>
            {/* 左侧输入连接点 */}
            <Handle
                type="target"
                position={Position.Left}
                style={{ background: '#555', width: 8, height: 8 }}
            />

            <Card
                shadow={selected ? 'md' : 'xs'}
                padding="xs"
                radius="md"
                withBorder
                style={{
                    width: 280, // 固定宽度，方便排版
                    borderColor: selected ? '#228be6' : '#e9ecef',
                    borderWidth: selected ? 2 : 1,
                    transition: 'all 0.2s ease',
                    cursor: 'default'
                }}
            >
                <Card.Section withBorder inheritPadding py="xs" bg="gray.0">
                    <Group justify="space-between">
                        <Group gap="xs">
                            <ThemeIcon size="xs" radius="xl" color="blue" variant="light">
                                <IconCircleDot size={10} />
                            </ThemeIcon>
                            <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                                {data.type || 'Knowledge Node'}
                            </Text>
                        </Group>
                    </Group>
                </Card.Section>

                <Box mt="xs" style={{ fontSize: '14px', lineHeight: 1.5 }}>
                    <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                            p: ({ node, ...props }) => <div style={{ margin: 0 }} {...props} />, // 避免 p 标签额外的 margin
                        }}
                    >
                        {data.label}
                    </ReactMarkdown>
                </Box>
            </Card>

            {/* 右侧输出连接点 */}
            <Handle
                type="source"
                position={Position.Right}
                style={{ background: '#555', width: 8, height: 8 }}
            />
        </>
    );
};

export default memo(CustomMindMapNode);