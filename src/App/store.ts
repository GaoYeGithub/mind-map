import PocketBase from 'pocketbase';
import { Node, Edge } from 'reactflow';
import { create } from 'zustand';
import { nanoid } from 'nanoid/non-secure';
import { NodeData } from './MindMapNode';

const client = new PocketBase('https://mind-map.pockethost.io/');

export type MindMapNode = Node<NodeData>;

interface MindMapData {
  id?: string;
  name: string;
  nodes: MindMapNode[];
  edges: Edge[];
}

export type RFState = {
  nodes: MindMapNode[];
  edges: Edge[];
  currentMapId: string | null;
  onNodesChange: (changes: any[]) => void;
  onEdgesChange: (changes: any[]) => void;
  updateNodeLabel: (nodeId: string, label: string) => void;
  addChildNode: (parentNode: Node, position: { x: number; y: number }) => void;
  saveMindMap: (name: string) => Promise<void>;
  loadMindMap: (id: string) => Promise<void>;
  createNewMindMap: () => void;
};

const useStore = create<RFState>((set, get) => ({
  nodes: [
    {
      id: 'root',
      type: 'mindmap',
      data: { label: 'Mind Map' },
      position: { x: 0, y: 0 },
      dragHandle: '.dragHandle',
    },
  ],
  edges: [],
  currentMapId: null,

  onNodesChange: (changes) => {
    set({
      nodes: changes.reduce((nodes, change) => {
        if (change.type === 'remove') {
          return nodes.filter((node) => node.id !== change.id);
        } else if (change.type === 'position' && change.position) {
          return nodes.map((node) =>
            node.id === change.id
              ? { ...node, position: change.position }
              : node
          );
        }
        return nodes;
      }, get().nodes),
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: changes.reduce((edges, change) => {
        if (change.type === 'remove') {
          return edges.filter((edge) => edge.id !== change.id);
        }
        return edges;
      }, get().edges),
    });
  },

  updateNodeLabel: (nodeId: string, label: string) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          node.data = { ...node.data, label };
        }
        return node;
      }),
    });
  },

  addChildNode: (parentNode: Node, position: { x: number; y: number }) => {
    const newNode = {
      id: nanoid(),
      type: 'mindmap',
      data: { label: 'New Node' },
      position,
      dragHandle: '.dragHandle',
      parentNode: parentNode.id,
    };

    const newEdge = {
      id: nanoid(),
      source: parentNode.id,
      target: newNode.id,
      type: 'mindmap',
    };

    set({
      nodes: [...get().nodes, newNode],
      edges: [...get().edges, newEdge],
    });
  },

  saveMindMap: async (name: string) => {
    const { nodes, edges, currentMapId } = get();
    const data: MindMapData = {
      name,
      nodes,
      edges,
    };

    try {
      if (currentMapId) {
        await client.collection('mindmaps').update(currentMapId, data);
      } else {
        const record = await client.collection('mindmaps').create(data);
        set({ currentMapId: record.id });
      }
    } catch (error) {
      console.error('Error saving mind map:', error);
      throw error;
    }
  },

  loadMindMap: async (id: string) => {
    try {
      const record = await client.collection('mindmaps').getOne(id);
      set({
        nodes: record.nodes,
        edges: record.edges,
        currentMapId: record.id,
      });
    } catch (error) {
      console.error('Error loading mind map:', error);
      throw error;
    }
  },

  createNewMindMap: () => {
    set({
      nodes: [
        {
          id: 'root',
          type: 'mindmap',
          data: { label: 'New Mind Map' },
          position: { x: 0, y: 0 },
          dragHandle: '.dragHandle',
        },
      ],
      edges: [],
      currentMapId: null,
    });
  },
}));

export default useStore;
