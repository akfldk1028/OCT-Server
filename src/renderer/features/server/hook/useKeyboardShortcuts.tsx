import { useLayoutEffect, useCallback } from 'react';

// 키보드 단축키 관리 훅
export function useKeyboardShortcuts(
  nodes: any[],
  edges: any[],
  setNodes: any,
  setEdges: any,
  hideContextMenu?: () => void,
) {
  // 선택된 요소 삭제 함수
  const deleteSelectedElements = useCallback(() => {
    // 선택된 노드들과 엣지들 찾기
    const selectedNodes = nodes.filter((node) => node.selected);
    const selectedEdges = edges.filter((edge) => edge.selected);

    if (selectedNodes.length > 0 || selectedEdges.length > 0) {
      // 선택된 노드 ID 수집
      const selectedNodeIds = selectedNodes.map((node) => node.id);

      // 노드 삭제
      setNodes((nodes: any[]) =>
        nodes.filter((node) => !selectedNodeIds.includes(node.id)),
      );

      // 선택된 엣지와 삭제된 노드와 연결된 모든 엣지 삭제
      setEdges((edges: any[]) =>
        edges.filter(
          (edge) =>
            !selectedEdges.some(
              (selectedEdge) => selectedEdge.id === edge.id,
            ) &&
            !selectedNodeIds.includes(edge.source) &&
            !selectedNodeIds.includes(edge.target),
        ),
      );

      // 컨텍스트 메뉴 닫기
      hideContextMenu?.();
    }
  }, [nodes, edges, setNodes, setEdges, hideContextMenu]);

  // 저장 함수 (향후 확장 가능)
  const saveFlow = useCallback(() => {
    console.log('Save flow (Ctrl+S)');
    // TODO: 실제 저장 로직 구현
  }, []);

  // 실행 취소 함수 (향후 확장 가능)
  const undoAction = useCallback(() => {
    console.log('Undo action (Ctrl+Z)');
    // TODO: 실제 실행 취소 로직 구현
  }, []);

  // 키보드 이벤트 핸들러
  useLayoutEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Delete/Backspace 키
      if (event.key === 'Delete' || event.key === 'Backspace') {
        deleteSelectedElements();
        return;
      }

      // Ctrl/Cmd + S (저장)
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        saveFlow();
        return;
      }

      // Ctrl/Cmd + Z (실행 취소)
      if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        event.preventDefault();
        undoAction();
        return;
      }

      // Ctrl/Cmd + A (전체 선택)
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault();
        console.log('Select all (Ctrl+A)');
        // TODO: 전체 선택 로직 구현
        return;
      }

      // ESC (선택 해제 및 메뉴 닫기)
      if (event.key === 'Escape') {
        hideContextMenu?.();
        // TODO: 노드 선택 해제 로직 구현
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [deleteSelectedElements, saveFlow, undoAction, hideContextMenu]);

  return {
    deleteSelectedElements,
    saveFlow,
    undoAction,
  };
}
