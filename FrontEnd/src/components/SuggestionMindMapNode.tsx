// FrontEnd/src/components/SuggestionMindMapNode.tsx
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, Text, Box, Group, ThemeIcon, Badge } from '@mantine/core';
import { IconSparkles } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface CustomNodeData {
    label: string;
    type?: string;
}

const SuggestionMindMapNode = ({ data, selected }: NodeProps<CustomNodeData>) => {
    return (
        <>
            <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
            
            <Card
                padding="xs"
                radius="md"
                withBorder
                bg="orange.0" // 浅橙色背景
                style={{
                    width: 280,
                    // 核心样式：虚线边框，表示“建议/未定”状态
                    borderStyle: 'dashed', 
                    borderColor: selected ? '#fcc419' : '#ffd43b',
                    borderWidth: 2,
                    transition: 'all 0.2s ease',
                    opacity: 0.9
                }}
            >
                <Card.Section inheritPadding py={4} withBorder style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
                    <Group justify="space-between">
                        <Group gap={5}>
                            <ThemeIcon size="sm" radius="xl" color="orange" variant="light">
                                <IconSparkles size={12} />
                            </ThemeIcon>
                            <Text size="xs" fw={700} c="orange.8">
                                AI 建议
                            </Text>
                        </Group>
                    </Group>
                </Card.Section>

                <Box mt="xs" style={{ fontSize: '13px', lineHeight: 1.4, color: '#495057' }}>
                    <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                            p: ({ node, ...props }) => <div style={{ margin: 0 }} {...props} />,
                        }}
                    >
                        {data.label}
                    </ReactMarkdown>
                </Box>
            </Card>

            <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
        </>
    );
};

export default memo(SuggestionMindMapNode);