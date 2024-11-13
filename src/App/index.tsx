import { useCallback, useRef, useEffect, useState } from 'react';
import ReactFlow, {
  ConnectionLineType,
  NodeOrigin,
  Node,
  OnConnectEnd,
  OnConnectStart,
  useReactFlow,
  useStoreApi,
  Controls,
  Panel,
  Edge,
} from 'reactflow';
import shallow from 'zustand/shallow';
import useStore, { RFState } from './store';
import MindMapNode from './MindMapNode';
import MindMapEdge from './MindMapEdge';
import PocketBase from 'pocketbase';

import 'reactflow/dist/style.css';

const client = new PocketBase('https://mind-map.pockethost.io/');

const selector = (state: RFState) => ({
  nodes: state.nodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  addChildNode: state.addChildNode,
  saveMindMap: state.saveMindMap,
  loadMindMap: state.loadMindMap,
  createNewMindMap: state.createNewMindMap,
});

const nodeTypes = {
  mindmap: MindMapNode as typeof MindMapNode,
};

const edgeTypes = {
  mindmap: MindMapEdge,
};

const nodeOrigin: NodeOrigin = [0.5, 0.5];
const connectionLineStyle = { stroke: '#F6AD55', strokeWidth: 3 };
const defaultEdgeOptions = { style: connectionLineStyle, type: 'mindmap' };

interface RecordModel {
  id: string;
  name?: string;
}

function Flow() {
  const store = useStoreApi();
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    addChildNode,
    saveMindMap,
    loadMindMap,
    createNewMindMap,
  } = useStore(selector, shallow) as { 
    nodes: Node[]; 
    edges: Edge[]; 
    onNodesChange: (changes: any) => void;
    onEdgesChange: (changes: any) => void;
    addChildNode: (parentNode: Node, position: { x: number; y: number }) => void;
    saveMindMap: (name: string) => Promise<void>;
    loadMindMap: (id: string) => Promise<void>;
    createNewMindMap: () => void;
  };

  const { project } = useReactFlow();
  const connectingNodeId = useRef<string | null>(null);

  const [savedMindMaps, setSavedMindMaps] = useState<RecordModel[]>([]);

  useEffect(() => {
    const fetchMindMaps = async () => {
      try {
        const mindMaps = await client.collection('mindmaps').getFullList({
          sort: '-created',
        });
        setSavedMindMaps(mindMaps as RecordModel[]);
      } catch (error) {
        console.error('Error fetching mind maps:', error);
      }
    };

    fetchMindMaps();
  }, []);

  const getChildNodePosition = (event: MouseEvent, parentNode?: Node) => {
    const { domNode } = store.getState();

    if (!domNode || !parentNode?.positionAbsolute || !parentNode?.width || !parentNode?.height) {
      return;
    }

    const { top, left } = domNode.getBoundingClientRect();
    const panePosition = project({
      x: event.clientX - left,
      y: event.clientY - top,
    });

    return {
      x: panePosition.x - parentNode.positionAbsolute.x + parentNode.width / 2,
      y: panePosition.y - parentNode.positionAbsolute.y + parentNode.height / 2,
    };
  };

  const onConnectStart: OnConnectStart = useCallback((_, { nodeId }) => {
    connectingNodeId.current = nodeId;
  }, []);

  const onConnectEnd: OnConnectEnd = useCallback(
    (event) => {
      const { nodeInternals } = store.getState();
      const targetIsPane = (event.target as Element).classList.contains('react-flow__pane');
      const node = (event.target as Element).closest('.react-flow__node');

      if (node) {
        node.querySelector('input')?.focus({ preventScroll: true });
      } else if (targetIsPane && connectingNodeId.current) {
        const parentNode = nodeInternals.get(connectingNodeId.current) as Node;
        const childNodePosition = getChildNodePosition(event, parentNode);

        if (parentNode && childNodePosition) {
          addChildNode(parentNode, childNodePosition);
        }
      }
    },
    [getChildNodePosition, addChildNode]
  );

  const handleSave = async () => {
    try {
      await saveMindMap('My Mind Map');
      alert('Mind map saved successfully!');
    } catch (error) {
      console.error('Error saving mind map:', error);
      alert('Failed to save mind map');
    }
  };

  const handleLoad = async (id: string) => {
    try {
      await loadMindMap(id);
      alert('Mind map loaded successfully!');
    } catch (error) {
      console.error('Error loading mind map:', error);
      alert('Failed to load mind map');
    }
  };

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnectStart={onConnectStart}
      onConnectEnd={onConnectEnd}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodeOrigin={nodeOrigin}
      defaultEdgeOptions={defaultEdgeOptions}
      connectionLineStyle={connectionLineStyle}
      connectionLineType={ConnectionLineType.Straight}
      fitView
    >
      <Controls showInteractive={false} />
      <Panel position="top-left" className="header flex gap-2">
        <div className="font-bold mb-2">Mind Map</div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Save
          </button>
          <button
            onClick={createNewMindMap}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
          >
            New
          </button>
        </div>
      </Panel>
      <Panel position="top-right" className="header flex gap-2">
        <div className="font-bold mb-2">Load Saved Mind Map</div>
        <div className="flex flex-col gap-2">
          {savedMindMaps.map((map) => (
            <button
              key={map.id}
              onClick={() => handleLoad(map.id)}
              className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              {map.name || `Mind Map ${map.id}`}
            </button>
          ))}
        </div>
      </Panel>
    </ReactFlow>
  );
}

export default Flow;
