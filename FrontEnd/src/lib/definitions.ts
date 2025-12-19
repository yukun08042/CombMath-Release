import exp from 'constants';
import { LoaderFunction } from 'react-router-dom';

export type LoaderData<TLoaderFn extends LoaderFunction> = Awaited<ReturnType<TLoaderFn>> extends Response | infer D
	? D
	: never;

export interface NavItem {
	link: string,
	label: string,
	icon: any
}

export interface CustomNodeData {
	nodeType: string,
	nodeId: string,
	content: string
}

export interface MessageResponse {
	message_id: number;
	message_type: string;
	content: string;
	timestamp: string;
}

export interface PrivacyAnalysisResponse {
	message_id: number;
	original_text: string;
	privacy_analysis: string;
	placeholder: string;
	timestamp: string;
	accepted: boolean;
	read: boolean;
}

export interface nodeItem {
	node_id: string;
	node_content: string;
	node_type: string;
}

export interface edgeItem {
	edge_id: string;
	edge_content: string;
	source: string;
	target: string;
}

export interface MindMapItem {
	nodes: nodeItem[];
	edges: edgeItem[];
}

export interface AnalysisMapResponse {
	problem_id: number;
	mindmap_id: number;
	new_mindmap: MindMapItem;
}

export interface AnalysisSuggestionResponse {
	problem_id: number;
	mindmap_id: number;
	suggestion: MindMapItem;
	suggestion_summary: string;
}

export interface ProblemItem {
	problem_id: number;
	chapter_id: number;
	chapter_name: string;
	difficulty: number; // 1-5 scale
	problem_content: string;
}