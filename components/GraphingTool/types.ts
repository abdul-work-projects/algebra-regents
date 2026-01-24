export interface GraphPoint {
  x: number;
  y: number;
  isOpen: boolean; // Open vs closed endpoint (for inequalities)
}

export interface GraphLine {
  id: string;
  color: string;
  isDashed: boolean;
  points: GraphPoint[];
  shade?: 'above' | 'below' | null;
}

export interface GraphData {
  lines: GraphLine[];
  gridBounds: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
  };
}

export const DEFAULT_GRAPH_DATA: GraphData = {
  lines: [],
  gridBounds: {
    xMin: -10,
    xMax: 10,
    yMin: -10,
    yMax: 10,
  },
};

export const LINE_COLORS = {
  line1: '#3b82f6', // Blue
  line2: '#ef4444', // Red
};

export type ActiveLine = 'line1' | 'line2';
