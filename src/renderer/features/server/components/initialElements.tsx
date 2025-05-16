import { type Node } from '@xyflow/react';

export type TextNode = Node<{ text: string }, 'text'>;
export type ResultNode = Node<{}, 'result'>;
export type InputNode = Node<{ text: string; label?: string }, 'input'>;
export type OutputNode = Node<{ label?: string }, 'output'>;
export type DefaultNode = Node<{ label?: string }, 'default'>;

// 모든 노드 타입 포함
export type MyNode = Node<any>;

export function isTextNode(
  node: any,
): node is TextNode | InputNode | undefined {
  return !node ? false : node.type === 'text' || node.type === 'input';
}
