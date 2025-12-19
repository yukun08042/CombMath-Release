// FrontEnd/src/components/MarkdownEdge.tsx
import React from 'react';
import {
  EdgeProps,
  getSmoothStepPath,
  EdgeLabelRenderer,
  BaseEdge,
} from 'reactflow';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const MarkdownEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
}: EdgeProps) => {
  // 获取平滑阶梯线的路径
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetPosition,
    targetX,
    targetY,
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            background: 'white',
            padding: '0 1px',
            borderRadius: '4px',
            fontSize: '8px',
            fontWeight: 400,
            pointerEvents: 'all', // 如果标签需要交互，设为 all
            border: '1px solid #eee',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            maxWidth: '75px',
          }}
          className="nodrag nopan"
        >
          {label && (
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {label as string}
            </ReactMarkdown>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default MarkdownEdge;