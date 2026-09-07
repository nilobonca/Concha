import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { HoveredNodeData } from './GraphNodeTooltip';

export interface RealGraphNodeItem {
  id: string;
  title: string;
  path?: string;
  color?: string;
  connectionsCount?: number;
  isCanvas?: boolean;
}

export interface RealGraphLinkItem {
  sourceId: string;
  targetId: string;
}

export interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  path?: string;
  isCanvas?: boolean;
  connectionsCount: number;
  radius: number;
  color: string;
  glowColor: string;
  pulseOffset: number;
  pulseSpeed: number;
  connections: Set<string>;
}

export interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  source: SimNode;
  target: SimNode;
}

export interface SimSpark {
  sourceId: string;
  targetId: string;
  progress: number;
  speed: number;
  color: string;
}

export interface SimDust {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
}

export interface UseAmbientGraphProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  customNodeTitles?: string[];
  realNodes?: RealGraphNodeItem[];
  realLinks?: RealGraphLinkItem[];
  vaultName?: string;
  onSelectNode?: (pathOrTitle: string, isCanvas?: boolean) => void;
}

export interface UseAmbientGraphReturn {
  resetView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  isPlaying: boolean;
  togglePlayPause: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  hoveredNode: HoveredNodeData | null;
  nodeCount: number;
  linkCount: number;
  resetOrbits: () => void;
}

// Curated celestial / arcane color palette
const LORE_COLOR_PALETTE = [
  '#7F95FF', // soft periwinkle / primary accent
  '#52B1FF', // sky cyan
  '#B4D3F1', // ice blue pastel
  '#1831D7', // royal cobalt
  '#F4F0E6', // warm ivory
  '#C084FC', // purple nebula
];

const hexToRgba = (hex: string, alpha: number): string => {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgba(127, 149, 255, ${alpha})`;
};

const DEFAULT_LORE_NODES: { title: string; color: string }[] = [
  { title: 'Castelo Ravenloft', color: '#c084fc' },
  { title: 'Strahd von Zarovich', color: '#f87171' },
  { title: 'Vila de Baróvia', color: '#38bdf8' },
  { title: 'Templo de Âmbar', color: '#fbbf24' },
  { title: 'Espada do Sol', color: '#fef08a' },
  { title: 'Madame Eva', color: '#f472b6' },
  { title: 'Moinho Velho', color: '#a78bfa' },
  { title: 'Floresta de Svalich', color: '#34d399' },
  { title: 'Tomo de Strahd', color: '#818cf8' },
];

export const useAmbientGraphSimulation = ({
  canvasRef,
  containerRef,
  customNodeTitles,
  realNodes,
  realLinks,
  vaultName,
  onSelectNode,
}: UseAmbientGraphProps): UseAmbientGraphReturn => {
  // State for controls and HUD
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hoveredNode, setHoveredNode] = useState<HoveredNodeData | null>(null);
  const [nodeCount, setNodeCount] = useState<number>(0);
  const [linkCount, setLinkCount] = useState<number>(0);

  // Simulation and animation refs
  const simulationRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const linksRef = useRef<SimLink[]>([]);
  const sparksRef = useRef<SimSpark[]>([]);
  const dustRef = useRef<SimDust[]>([]);

  // Camera viewport transform: scale, translation (pan)
  const cameraRef = useRef<{ x: number; y: number; scale: number }>({
    x: 0,
    y: 0,
    scale: 1,
  });

  // Interaction tracking refs
  const hoveredNodeIdRef = useRef<string | null>(null);
  const draggedNodeRef = useRef<SimNode | null>(null);
  const isPanningRef = useRef<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number; camX: number; camY: number } | null>(null);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasMovedSignificantlyRef = useRef<boolean>(false);
  const mouseScreenPosRef = useRef<{ x: number; y: number } | null>(null);
  const searchQueryRef = useRef<string>('');
  const animFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Sync searchQueryRef with state
  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

  // Convert screen coordinates to world coordinates considering current camera pan & zoom
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const cam = cameraRef.current;
    return {
      x: (screenX - cam.x) / cam.scale,
      y: (screenY - cam.y) / cam.scale,
    };
  }, []);

  // Convert world coordinates to screen coordinates
  const worldToScreen = useCallback((worldX: number, worldY: number) => {
    const cam = cameraRef.current;
    return {
      x: worldX * cam.scale + cam.x,
      y: worldY * cam.scale + cam.y,
    };
  }, []);

  // Initialize and build graph data with D3 Force Simulation
  const initGraph = useCallback((width: number, height: number) => {
    if (width <= 0 || height <= 0) return;

    // 1. Resolve raw items (não exibir nada se não houver dados reais)
    let sourceItems: RealGraphNodeItem[] = [];

    if (realNodes && realNodes.length > 0) {
      sourceItems = realNodes;
    } else if (customNodeTitles && customNodeTitles.length > 0) {
      sourceItems = customNodeTitles.map((title, idx) => {
        const defaultMatch = DEFAULT_LORE_NODES[idx % DEFAULT_LORE_NODES.length];
        return {
          id: `custom-${idx}`,
          title,
          color: defaultMatch.color,
          connectionsCount: 0,
        };
      });
    } else {
      sourceItems = [];
    }

    // Se não houver nós para exibir, limpa completamente o grafo e encerra a simulação
    if (sourceItems.length === 0) {
      nodesRef.current = [];
      linksRef.current = [];
      sparksRef.current = [];
      dustRef.current = [];
      setNodeCount(0);
      setLinkCount(0);
      setHoveredNode(null);
      hoveredNodeIdRef.current = null;
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
      return;
    }

    // Preserve existing node positions during incremental updates
    const existingPos = new Map<string, { x: number; y: number; vx: number; vy: number }>();
    nodesRef.current.forEach(n => {
      if (n.x !== undefined && n.y !== undefined) {
        existingPos.set(n.id, { x: n.x, y: n.y, vx: n.vx || 0, vy: n.vy || 0 });
      }
    });

    const centerX = width * 0.5;
    const centerY = height * 0.5;

    // 2. Build SimNodes
    const nodes: SimNode[] = sourceItems.map((item, idx) => {
      const connCount = item.connectionsCount ?? 0;
      const baseR = item.isCanvas ? 6.5 : 5.0;
      const radius = Math.min(18, Math.max(4.5, baseR + Math.sqrt(connCount) * 2.2));

      const fallbackColor = LORE_COLOR_PALETTE[idx % LORE_COLOR_PALETTE.length];
      const nodeColor = item.color || (item.isCanvas ? '#818cf8' : fallbackColor);
      const glowColor = hexToRgba(nodeColor, 0.45);

      const cached = existingPos.get(item.id);
      const initX = cached ? cached.x : centerX + (Math.random() - 0.5) * Math.min(width * 0.6, 400);
      const initY = cached ? cached.y : centerY + (Math.random() - 0.5) * Math.min(height * 0.6, 400);

      return {
        id: item.id,
        title: item.title,
        path: item.path,
        isCanvas: item.isCanvas,
        connectionsCount: connCount,
        radius,
        color: nodeColor,
        glowColor,
        pulseOffset: (idx * 0.6) % (Math.PI * 2),
        pulseSpeed: 0.8 + (idx % 4) * 0.2,
        connections: new Set<string>(),
        x: initX,
        y: initY,
        vx: cached ? cached.vx : 0,
        vy: cached ? cached.vy : 0,
      };
    });

    // 3. Map real links or fallback connections
    const nodeMap = new Map<string, SimNode>();
    nodes.forEach(n => {
      nodeMap.set(n.id, n);
      nodeMap.set(n.id.toLowerCase(), n);
      if (n.path) {
        nodeMap.set(n.path, n);
        nodeMap.set(n.path.toLowerCase(), n);
        nodeMap.set(n.path.replace(/\.md$/, ''), n);
        nodeMap.set(n.path.replace(/\.md$/, '').toLowerCase(), n);
      }
      if (n.title) {
        nodeMap.set(n.title, n);
        nodeMap.set(n.title.toLowerCase(), n);
      }
    });

    const links: SimLink[] = [];
    const linkSet = new Set<string>();

    const addLink = (srcId: string, tgtId: string) => {
      const srcNode = nodeMap.get(srcId) || nodeMap.get(srcId.toLowerCase());
      const tgtNode = nodeMap.get(tgtId) || nodeMap.get(tgtId.toLowerCase());
      if (!srcNode || !tgtNode || srcNode.id === tgtNode.id) return;

      const key = srcNode.id < tgtNode.id
        ? `${srcNode.id}->${tgtNode.id}`
        : `${tgtNode.id}->${srcNode.id}`;

      if (linkSet.has(key)) return;
      linkSet.add(key);

      links.push({
        source: srcNode,
        target: tgtNode,
      });

      srcNode.connections.add(tgtNode.id);
      tgtNode.connections.add(srcNode.id);
    };

    if (realNodes && realNodes.length > 0 && realLinks && realLinks.length > 0) {
      realLinks.forEach(rl => {
        addLink(rl.sourceId, rl.targetId);
      });
    }

    // Recalculate true connections count
    nodes.forEach(n => {
      n.connectionsCount = n.connections.size;
    });

    // 4. Traveling arcane sparks along active links
    const sparks: SimSpark[] = [];
    if (links.length > 0) {
      const sparkCount = Math.min(Math.max(links.length, 6), 24);
      for (let i = 0; i < sparkCount; i++) {
        const link = links[Math.floor(Math.random() * links.length)];
        sparks.push({
          sourceId: link.source.id,
          targetId: link.target.id,
          progress: Math.random(),
          speed: 0.12 + Math.random() * 0.22,
          color: link.source.color || '#7F95FF',
        });
      }
    }

    // 5. Ambient cosmic dust
    const dust: SimDust[] = [];
    for (let i = 0; i < 40; i++) {
      dust.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        size: 0.8 + Math.random() * 1.5,
        alpha: 0.15 + Math.random() * 0.45,
        phase: Math.random() * Math.PI * 2,
      });
    }

    nodesRef.current = nodes;
    linksRef.current = links;
    sparksRef.current = sparks;
    dustRef.current = dust;

    setNodeCount(nodes.length);
    setLinkCount(links.length);

    // 6. Setup D3 Force Simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const sim = d3.forceSimulation<SimNode>(nodes)
      .force(
        'link',
        d3.forceLink<SimNode, SimLink>(links)
          .id(d => d.id)
          .distance(d => {
            const hasCanvas = d.source.isCanvas || d.target.isCanvas;
            return hasCanvas ? 130 : 100;
          })
          .strength(0.65)
      )
      .force(
        'charge',
        d3.forceManyBody<SimNode>()
          .strength(d => -220 - Math.min(180, d.connectionsCount * 25))
          .distanceMax(600)
      )
      .force('center', d3.forceCenter(centerX, centerY))
      .force(
        'collide',
        d3.forceCollide<SimNode>()
          .radius(d => d.radius + 16)
          .strength(0.85)
      )
      .alphaDecay(0.022);

    simulationRef.current = sim;
  }, [realNodes, realLinks, customNodeTitles, vaultName]);

  // Main render & animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let isDestroyed = false;

    const handleResize = () => {
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);

      if (width <= 0 || height <= 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      initGraph(width, height);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);
    handleResize();

    const render = (time: number) => {
      if (isDestroyed) return;

      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = time;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;

        ctx.save();
        ctx.scale(dpr, dpr);

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        const nodes = nodesRef.current;
        if (nodes.length === 0) {
          ctx.restore();
          animFrameIdRef.current = requestAnimationFrame(render);
          return;
        }

        const links = linksRef.current;
        const sparks = sparksRef.current;
        const dust = dustRef.current;
        const cam = cameraRef.current;
        const hoveredId = hoveredNodeIdRef.current;
        const query = searchQueryRef.current.trim().toLowerCase();

        // 1. Draw Ambient Cosmic Dust in screen space
        dust.forEach(d => {
          d.x += d.vx;
          d.y += d.vy;
          if (d.x < 0) d.x = width;
          if (d.x > width) d.x = 0;
          if (d.y < 0) d.y = height;
          if (d.y > height) d.y = 0;

          const twinkle = 0.5 + 0.5 * Math.sin(time * 0.002 + d.phase);
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${d.alpha * twinkle * 0.35})`;
          ctx.fill();
        });

        // 2. Apply Camera Viewport Transform (Zoom & Pan)
        ctx.save();
        ctx.translate(cam.x, cam.y);
        ctx.scale(cam.scale, cam.scale);

        // Find hovered node and its neighbors
        const hoveredNode = hoveredId ? nodes.find(n => n.id === hoveredId) : null;
        const neighborIds = hoveredNode ? hoveredNode.connections : null;

        // 3. Render Graph Links
        links.forEach(link => {
          const src = link.source;
          const tgt = link.target;
          if (!src || !tgt || src.x === undefined || src.y === undefined || tgt.x === undefined || tgt.y === undefined) {
            return;
          }

          const isConnectedToHovered = hoveredId
            ? (src.id === hoveredId || tgt.id === hoveredId)
            : false;

          const isHoverActive = hoveredId !== null;

          let strokeStyle = 'rgba(180, 211, 241, 0.22)';
          let lineWidth = 1.2;

          if (isHoverActive) {
            if (isConnectedToHovered) {
              strokeStyle = 'rgba(127, 149, 255, 0.9)';
              lineWidth = 2.2;
            } else {
              strokeStyle = 'rgba(180, 211, 241, 0.05)';
              lineWidth = 0.8;
            }
          }

          ctx.beginPath();
          ctx.moveTo(src.x, src.y);
          ctx.lineTo(tgt.x, tgt.y);
          ctx.strokeStyle = strokeStyle;
          ctx.lineWidth = lineWidth;
          ctx.stroke();
        });

        // 4. Render Traveling Arcane Sparks along Links
        if (links.length > 0) {
          sparks.forEach(spark => {
            spark.progress += spark.speed * dt;
            if (spark.progress > 1) {
              spark.progress = 0;
              const link = links[Math.floor(Math.random() * links.length)];
              spark.sourceId = link.source.id;
              spark.targetId = link.target.id;
              spark.color = link.source.color || '#7F95FF';
            }

            const src = nodes.find(n => n.id === spark.sourceId);
            const tgt = nodes.find(n => n.id === spark.targetId);
            if (!src || !tgt || src.x === undefined || src.y === undefined || tgt.x === undefined || tgt.y === undefined) {
              return;
            }

            const sx = src.x + (tgt.x - src.x) * spark.progress;
            const sy = src.y + (tgt.y - src.y) * spark.progress;

            const isHoverActive = hoveredId !== null;
            const isSparkOnHovered = hoveredId && (src.id === hoveredId || tgt.id === hoveredId);
            const sparkAlpha = isHoverActive ? (isSparkOnHovered ? 1.0 : 0.15) : 0.8;

            ctx.beginPath();
            ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = spark.color;
            ctx.globalAlpha = sparkAlpha;
            ctx.fill();
            ctx.globalAlpha = 1.0;
          });
        }

        // 5. Render Nodes and Labels
        const tSec = time * 0.001;
        nodes.forEach(node => {
          if (node.x === undefined || node.y === undefined) return;

          const isHovered = hoveredId === node.id;
          const isNeighbor = neighborIds ? neighborIds.has(node.id) : false;
          const isHoverActive = hoveredId !== null;

          const matchesQuery = query.length > 0 && (
            node.title.toLowerCase().includes(query) ||
            (node.path && node.path.toLowerCase().includes(query))
          );

          // Calculate opacity based on focus state
          let nodeAlpha = 1.0;
          if (isHoverActive) {
            nodeAlpha = (isHovered || isNeighbor) ? 1.0 : 0.22;
          } else if (query.length > 0) {
            nodeAlpha = matchesQuery ? 1.0 : 0.25;
          }

          ctx.globalAlpha = nodeAlpha;

          const pulse = Math.sin(tSec * node.pulseSpeed + node.pulseOffset);
          const currentRadius = isHovered
            ? node.radius * 1.35
            : isNeighbor
              ? node.radius * 1.15
              : node.radius + pulse * 0.4;

          // Outer Glow
          const glowMultiplier = isHovered ? 4.0 : isNeighbor ? 2.8 : 2.2;
          const glowGrad = ctx.createRadialGradient(
            node.x, node.y, 0,
            node.x, node.y, currentRadius * glowMultiplier
          );
          glowGrad.addColorStop(0, node.glowColor);
          glowGrad.addColorStop(0.5, `${node.color}25`);
          glowGrad.addColorStop(1, 'transparent');

          ctx.beginPath();
          ctx.arc(node.x, node.y, currentRadius * glowMultiplier, 0, Math.PI * 2);
          ctx.fillStyle = glowGrad;
          ctx.fill();

          // Canvas node orbital ring
          if (node.isCanvas) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, currentRadius + 4, 0, Math.PI * 2);
            ctx.strokeStyle = isHovered ? '#ffffff' : `${node.color}90`;
            ctx.lineWidth = 1.2;
            ctx.setLineDash([3, 3]);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Search match spotlight ring
          if (matchesQuery) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, currentRadius + 6, 0, Math.PI * 2);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }

          // Node Circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, currentRadius, 0, Math.PI * 2);
          ctx.fillStyle = isHovered ? '#ffffff' : node.color;
          ctx.fill();

          // Center bright pinpoint
          ctx.beginPath();
          ctx.arc(node.x, node.y, Math.max(1.2, currentRadius * 0.42), 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();

          // Typographic Label
          const labelText = node.title;
          const shouldShowLabel = isHovered || isNeighbor || matchesQuery || cam.scale > 0.8 || node.connectionsCount > 2;

          if (shouldShowLabel) {
            ctx.font = isHovered
              ? '600 11.5px Inter, -apple-system, sans-serif'
              : '500 10.5px Inter, -apple-system, sans-serif';

            const textWidth = ctx.measureText(labelText).width;
            const labelX = node.x;
            const labelY = node.y + currentRadius + 14;

            // Background pill for label contrast
            const padX = 6;
            const padY = 3;
            ctx.fillStyle = isHovered 
              ? 'rgba(19, 21, 36, 0.95)' 
              : isNeighbor 
                ? 'rgba(19, 21, 36, 0.85)' 
                : 'rgba(19, 21, 36, 0.65)';
            ctx.beginPath();
            ctx.roundRect(
              labelX - textWidth / 2 - padX,
              labelY - 10 - padY,
              textWidth + padX * 2,
              14 + padY * 2,
              5
            );
            ctx.fill();

            if (isHovered || isNeighbor) {
              ctx.strokeStyle = isHovered ? node.color : 'rgba(255, 255, 255, 0.15)';
              ctx.lineWidth = 1;
              ctx.stroke();
            }

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = isHovered
              ? '#ffffff'
              : isNeighbor
                ? '#f1f5f9'
                : 'rgba(226, 232, 240, 0.85)';
            ctx.fillText(labelText, labelX, labelY);
          }

          ctx.globalAlpha = 1.0;
        });

        ctx.restore(); // Restore world camera transform
        ctx.restore(); // Restore DPR scale
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animFrameIdRef.current) {
          cancelAnimationFrame(animFrameIdRef.current);
          animFrameIdRef.current = null;
        }
      } else {
        lastTimeRef.current = performance.now();
        animFrameIdRef.current = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      isDestroyed = true;
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [initGraph, canvasRef, containerRef]);

  // Pointer event listeners: Dragging, Zooming, Panning, and Node Selection
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getCanvasCoords = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    // Find node under screen coordinates
    const findNodeAt = (screenX: number, screenY: number): SimNode | null => {
      const world = screenToWorld(screenX, screenY);
      const nodes = nodesRef.current;
      const hitPadding = 14 / cameraRef.current.scale;

      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        if (n.x === undefined || n.y === undefined) continue;
        const dx = n.x - world.x;
        const dy = n.y - world.y;
        const hitRadius = n.radius + hitPadding;
        if (dx * dx + dy * dy < hitRadius * hitRadius) {
          return n;
        }
      }
      return null;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const { x, y } = getCanvasCoords(e);
      mouseScreenPosRef.current = { x, y };

      // 1. Handling Pan
      if (isPanningRef.current && panStartRef.current) {
        const dx = x - panStartRef.current.x;
        const dy = y - panStartRef.current.y;
        if (dx * dx + dy * dy > 9) {
          hasMovedSignificantlyRef.current = true;
        }
        cameraRef.current.x = panStartRef.current.camX + dx;
        cameraRef.current.y = panStartRef.current.camY + dy;
        canvas.style.cursor = 'grabbing';
        return;
      }

      // 2. Handling Node Drag
      if (draggedNodeRef.current) {
        if (dragStartPosRef.current) {
          const dx = x - dragStartPosRef.current.x;
          const dy = y - dragStartPosRef.current.y;
          if (dx * dx + dy * dy > 9) {
            hasMovedSignificantlyRef.current = true;
          }
        }
        const world = screenToWorld(x, y);
        draggedNodeRef.current.fx = world.x;
        draggedNodeRef.current.fy = world.y;
        if (simulationRef.current) {
          simulationRef.current.alphaTarget(0.3).restart();
        }
        canvas.style.cursor = 'grabbing';
        return;
      }

      // 3. Hover Detection
      const hitNode = findNodeAt(x, y);
      if (hitNode) {
        hoveredNodeIdRef.current = hitNode.id;
        canvas.style.cursor = 'pointer';

        if (hitNode.x !== undefined && hitNode.y !== undefined) {
          const screenPos = worldToScreen(hitNode.x, hitNode.y);
          setHoveredNode({
            id: hitNode.id,
            title: hitNode.title,
            isCanvas: hitNode.isCanvas,
            connectionsCount: hitNode.connectionsCount,
            path: hitNode.path,
            color: hitNode.color,
            screenX: screenPos.x,
            screenY: screenPos.y,
          });
        }
      } else {
        hoveredNodeIdRef.current = null;
        setHoveredNode(null);
        canvas.style.cursor = 'default';
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // Left click only
      const { x, y } = getCanvasCoords(e);
      dragStartPosRef.current = { x, y };
      hasMovedSignificantlyRef.current = false;

      const hitNode = findNodeAt(x, y);
      if (hitNode) {
        draggedNodeRef.current = hitNode;
        const world = screenToWorld(x, y);
        hitNode.fx = world.x;
        hitNode.fy = world.y;
        canvas.style.cursor = 'grabbing';
      } else {
        // Pan background
        isPanningRef.current = true;
        panStartRef.current = {
          x,
          y,
          camX: cameraRef.current.x,
          camY: cameraRef.current.y,
        };
        canvas.style.cursor = 'grabbing';
      }
    };

    const handleMouseUp = () => {
      if (draggedNodeRef.current) {
        draggedNodeRef.current.fx = null;
        draggedNodeRef.current.fy = null;
        draggedNodeRef.current = null;
        if (simulationRef.current) {
          simulationRef.current.alphaTarget(0);
        }
      }

      isPanningRef.current = false;
      panStartRef.current = null;
      canvas.style.cursor = hoveredNodeIdRef.current ? 'pointer' : 'default';
    };

    const handleClick = (e: MouseEvent) => {
      if (hasMovedSignificantlyRef.current) {
        hasMovedSignificantlyRef.current = false;
        return;
      }

      const { x, y } = getCanvasCoords(e);
      const hitNode = findNodeAt(x, y);
      if (hitNode && onSelectNode) {
        const target = hitNode.isCanvas
          ? (hitNode.id || hitNode.path || hitNode.title)
          : (hitNode.path || hitNode.title);
        onSelectNode(target, hitNode.isCanvas);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { x, y } = getCanvasCoords(e);
      const cam = cameraRef.current;

      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      const newScale = Math.min(4.0, Math.max(0.18, cam.scale * zoomFactor));

      const worldX = (x - cam.x) / cam.scale;
      const worldY = (y - cam.y) / cam.scale;

      cam.x = x - worldX * newScale;
      cam.y = y - worldY * newScale;
      cam.scale = newScale;

      // Update hovered node position if any
      if (hoveredNodeIdRef.current) {
        const hitNode = nodesRef.current.find(n => n.id === hoveredNodeIdRef.current);
        if (hitNode && hitNode.x !== undefined && hitNode.y !== undefined) {
          const screenPos = worldToScreen(hitNode.x, hitNode.y);
          setHoveredNode(prev => prev ? { ...prev, screenX: screenPos.x, screenY: screenPos.y } : null);
        }
      }
    };

    const handleMouseLeave = () => {
      if (draggedNodeRef.current) {
        draggedNodeRef.current.fx = null;
        draggedNodeRef.current.fy = null;
        draggedNodeRef.current = null;
      }
      isPanningRef.current = false;
      panStartRef.current = null;
      hoveredNodeIdRef.current = null;
      setHoveredNode(null);
      canvas.style.cursor = 'default';
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [canvasRef, onSelectNode, screenToWorld, worldToScreen]);

  // Controls Actions
  const zoomIn = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const cam = cameraRef.current;
    const newScale = Math.min(4.0, cam.scale * 1.25);
    const worldX = (centerX - cam.x) / cam.scale;
    const worldY = (centerY - cam.y) / cam.scale;
    cam.x = centerX - worldX * newScale;
    cam.y = centerY - worldY * newScale;
    cam.scale = newScale;
  }, [canvasRef]);

  const zoomOut = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const cam = cameraRef.current;
    const newScale = Math.max(0.18, cam.scale * 0.8);
    const worldX = (centerX - cam.x) / cam.scale;
    const worldY = (centerY - cam.y) / cam.scale;
    cam.x = centerX - worldX * newScale;
    cam.y = centerY - worldY * newScale;
    cam.scale = newScale;
  }, [canvasRef]);

  const resetView = useCallback(() => {
    cameraRef.current = { x: 0, y: 0, scale: 1 };
    if (simulationRef.current) {
      simulationRef.current.alpha(0.4).restart();
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => {
      const next = !prev;
      if (simulationRef.current) {
        if (next) {
          simulationRef.current.alpha(0.3).restart();
        } else {
          simulationRef.current.stop();
        }
      }
      return next;
    });
  }, []);

  const resetOrbits = useCallback(() => {
    resetView();
  }, [resetView]);

  return {
    resetView,
    zoomIn,
    zoomOut,
    isPlaying,
    togglePlayPause,
    searchQuery,
    setSearchQuery,
    hoveredNode,
    nodeCount,
    linkCount,
    resetOrbits,
  };
};
