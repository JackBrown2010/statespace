import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class KlotskiPuzzle {
    constructor() {
        this.boardWidth = 4;
        this.boardHeight = 5;
        this.pieces = [];
        this.nextPieceId = 1;
        this.states = new Set();
        this.stateGraph = new Map();
        
        this.initializeDOM();
        this.initializeThreeJS();
        this.createEmptyBoard();
    }
    
    initializeDOM() {
        this.addPiece1x1Btn = document.getElementById('add-piece-1x1');
        this.addPiece1x2Btn = document.getElementById('add-piece-1x2');
        this.addPiece2x1Btn = document.getElementById('add-piece-2x1');
        this.addPiece2x2Btn = document.getElementById('add-piece-2x2');
        this.clearBoardBtn = document.getElementById('clear-board');
        this.generateSpaceBtn = document.getElementById('generate-space');
        this.autoRotateBtn = document.getElementById('auto-rotate');
        this.nodeSizeSlider = document.getElementById('node-size');
        this.nodeSizeValue = document.getElementById('node-size-value');
        
        this.puzzleBoard = document.getElementById('puzzle-board');
        this.pieceCount = document.getElementById('piece-count');
        this.stateCount = document.getElementById('state-count');
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.addPiece1x1Btn.addEventListener('click', () => this.addPiece(1, 1));
        this.addPiece1x2Btn.addEventListener('click', () => this.addPiece(1, 2));
        this.addPiece2x1Btn.addEventListener('click', () => this.addPiece(2, 1));
        this.addPiece2x2Btn.addEventListener('click', () => this.addPiece(2, 2));
        this.clearBoardBtn.addEventListener('click', () => this.clearBoard());
        this.generateSpaceBtn.addEventListener('click', () => this.generateStateSpace());
        this.autoRotateBtn.addEventListener('click', () => this.toggleAutoRotate());
        
        this.nodeSizeSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            this.nodeSizeValue.textContent = value;
            this.updateNodeSizes(parseFloat(value));
        });
    }
    
    initializeThreeJS() {
        this.threeContainer = document.getElementById('three-container');
        
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.threeContainer.clientWidth / this.threeContainer.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(50, 50, 50);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.threeContainer.clientWidth, this.threeContainer.clientHeight);
        this.threeContainer.appendChild(this.renderer.domElement);
        
        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 25);
        this.scene.add(directionalLight);
        
        // Auto-rotate
        this.autoRotate = false;
        
        // Node materials
        this.nodeMaterial = new THREE.MeshPhongMaterial({ color: 0x4dabf7 });
        this.edgeMaterial = new THREE.LineBasicMaterial({ color: 0x666666 });
        
        // Start render loop
        this.animate();
        
        // Handle resize
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    createEmptyBoard() {
        this.puzzleBoard.innerHTML = '';
        for (let i = 0; i < this.boardWidth * this.boardHeight; i++) {
            const cell = document.createElement('div');
            cell.className = 'board-cell';
            cell.dataset.index = i;
            this.puzzleBoard.appendChild(cell);
        }
    }
    
    addPiece(width, height) {
        // Find first available position
        for (let y = 0; y <= this.boardHeight - height; y++) {
            for (let x = 0; x <= this.boardWidth - width; x++) {
                if (this.canPlacePiece(x, y, width, height)) {
                    const piece = {
                        id: this.nextPieceId++,
                        x, y, width, height
                    };
                    this.pieces.push(piece);
                    this.renderBoard();
                    this.updatePieceCount();
                    return;
                }
            }
        }
        alert('No space for this piece!');
    }
    
    canPlacePiece(x, y, width, height, excludeId = null) {
        if (x < 0 || y < 0 || x + width > this.boardWidth || y + height > this.boardHeight) {
            return false;
        }
        
        for (let py = y; py < y + height; py++) {
            for (let px = x; px < x + width; px++) {
                const occupied = this.pieces.find(p => 
                    p.id !== excludeId &&
                    px >= p.x && px < p.x + p.width &&
                    py >= p.y && py < p.y + p.height
                );
                if (occupied) return false;
            }
        }
        return true;
    }
    
    renderBoard() {
        // Clear board
        const cells = this.puzzleBoard.querySelectorAll('.board-cell');
        cells.forEach(cell => {
            cell.classList.remove('occupied');
            cell.innerHTML = '';
        });
        
        // Render pieces
        this.pieces.forEach(piece => {
            const pieceElement = document.createElement('div');
            pieceElement.className = 'puzzle-piece';
            pieceElement.style.left = `${piece.x * 62}px`;
            pieceElement.style.top = `${piece.y * 62}px`;
            pieceElement.style.width = `${piece.width * 60 + (piece.width - 1) * 2}px`;
            pieceElement.style.height = `${piece.height * 60 + (piece.height - 1) * 2}px`;
            pieceElement.textContent = `${piece.width}x${piece.height}`;
            pieceElement.dataset.pieceId = piece.id;
            
            pieceElement.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removePiece(piece.id);
            });
            
            this.puzzleBoard.appendChild(pieceElement);
            
            // Mark cells as occupied
            for (let py = piece.y; py < piece.y + piece.height; py++) {
                for (let px = piece.x; px < piece.x + piece.width; px++) {
                    const cellIndex = py * this.boardWidth + px;
                    cells[cellIndex].classList.add('occupied');
                }
            }
        });
    }
    
    removePiece(pieceId) {
        this.pieces = this.pieces.filter(p => p.id !== pieceId);
        this.renderBoard();
        this.updatePieceCount();
    }
    
    clearBoard() {
        this.pieces = [];
        this.nextPieceId = 1;
        this.renderBoard();
        this.updatePieceCount();
        this.clearStateSpace();
    }
    
    updatePieceCount() {
        this.pieceCount.textContent = this.pieces.length;
    }
    
    // State space generation
    getStateString() {
        const board = Array(this.boardWidth * this.boardHeight).fill(0);
        this.pieces.forEach((piece, index) => {
            for (let py = piece.y; py < piece.y + piece.height; py++) {
                for (let px = piece.x; px < piece.x + piece.width; px++) {
                    board[py * this.boardWidth + px] = index + 1;
                }
            }
        });
        return board.join(',');
    }
    
    generateStateSpace() {
        if (this.pieces.length === 0) {
            alert('Add some pieces first!');
            return;
        }

        this.states.clear();
        this.stateGraph.clear();
        this.clearStateSpace();
        
        // Bfs to find all reachable states
        const initialState = this.pieces.map(p => ({...p}));
        const queue = [initialState];
        const visited = new Set([this.getStateStringFromPieces(initialState)]);
        
        while (queue.length > 0) {
            const currentState = queue.shift();
            const currentStateString = this.getStateStringFromPieces(currentState);
            
            // Only process if this is a unique state we haven't seen before
            if (!this.states.has(currentStateString)) {
                this.states.add(currentStateString);
                
                // Try moving each piece in all directions
                for (let pieceIndex = 0; pieceIndex < currentState.length; pieceIndex++) {
                    const directions = [
                        { dx: -1, dy: 0 }, // left
                        { dx: 1, dy: 0 },  // right
                        { dx: 0, dy: -1 }, // up
                        { dx: 0, dy: 1 }   // down
                    ];
                    
                    for (const direction of directions) {
                        const newState = currentState.map(p => ({...p}));
                        const piece = newState[pieceIndex];
                        const newX = piece.x + direction.dx;
                        const newY = piece.y + direction.dy;
                        
                        if (this.canPlacePieceInState(newState, pieceIndex, newX, newY)) {
                            piece.x = newX;
                            piece.y = newY;
                            
                            const newStateString = this.getStateStringFromPieces(newState);
                            
                            // Only create node and edge if this is a genuinely new state
                            if (!visited.has(newStateString)) {
                                visited.add(newStateString);
                                queue.push(newState);
                                
                                // Ensure we have unique nodes by checking if state already exists
                                const alreadyExists = Array.from(this.states).some(existingState => 
                                    existingState === newStateString);
                                
                                if (!alreadyExists) {
                                    // Add edge to graph - only connect if we have valid unique transition
                                    if (!this.stateGraph.has(currentStateString)) {
                                        this.stateGraph.set(currentStateString, []);
                                    }
                                    
                                    // Create directed edge between unique states
                                    const edges = this.stateGraph.get(currentStateString);
                                    if (!edges.includes(newStateString)) {
                                        edges.push(newStateString);
                                    }
                                }
                            } else {
                                // State already exists - still create edge but don't add new node
                                if (this.states.has(newStateString)) {
                                    if (!this.stateGraph.has(currentStateString)) {
                                        this.stateGraph.set(currentStateString, []);
                                    }
                                    
                                    const edges = this.stateGraph.get(currentStateString);
                                    if (!edges.includes(newStateString)) {
                                        edges.push(newStateString);
                                    }
                                }
                            }
                            // Skip duplicate states
                            continue;
                        }
                    }
                }
            }
        }
        
        this.render3DStateSpace();
        this.stateCount.textContent = this.states.size;
    }
    
    getStateStringFromPieces(pieces) {
        const board = Array(this.boardWidth * this.boardHeight).fill(0);
        pieces.forEach((piece, index) => {
            for (let py = piece.y; py < piece.y + piece.height; py++) {
                for (let px = piece.x; px < piece.x + piece.width; px++) {
                    board[py * this.boardWidth + px] = index + 1;
                }
            }
        });
        return board.join(',');
    }
    
    canPlacePieceInState(pieces, pieceIndex, x, y) {
        const piece = pieces[pieceIndex];
        if (x < 0 || y < 0 || x + piece.width > this.boardWidth || y + piece.height > this.boardHeight) {
            return false;
        }
        
        for (let py = y; py < y + piece.height; py++) {
            for (let px = x; px < x + piece.width; px++) {
                const occupied = pieces.find((p, index) => 
                    index !== pieceIndex &&
                    px >= p.x && px < p.x + p.width &&
                    py >= p.y && py < p.y + p.height
                );
                if (occupied) return false;
            }
        }
        return true;
    }
    
    render3DStateSpace() {
        this.clearStateSpace();
        
        if (this.states.size === 0) return;
        
        // Create nodes
        const nodeGeometry = new THREE.SphereGeometry(1, 16, 16);
        const stateArray = Array.from(this.states);
        const nodePositions = new Map();
        
        // Store state mappings for click handling
        this.stateToPieces = new Map();
        this.nodeToState = new WeakMap();
        
        // Calculate distance matrix between all states
        const distanceMatrix = this.calculateDistanceMatrix(stateArray);
        
        // Position nodes in 3D space using force-directed layout based on distances
        const positions = this.forceDirectedLayout(stateArray, distanceMatrix);
        
        // Create nodes with positions
        stateArray.forEach((state, index) => {
            const pos = positions.get(state);
            const nodeMesh = new THREE.Mesh(nodeGeometry, this.nodeMaterial);
            nodeMesh.position.set(pos.x, pos.y, pos.z);
            nodeMesh.userData = { state, index };
            
            // Store mapping from state string to pieces
            const pieces = this.getPiecesFromStateString(state);
            this.stateToPieces.set(state, pieces);
            this.nodeToState.set(nodeMesh, state);
            
            // Add click handler
            nodeMesh.callback = () => this.loadStateFromNode(state);
            
            this.scene.add(nodeMesh);
            nodePositions.set(state, { 
                x: pos.x, 
                y: pos.y, 
                z: pos.z, 
                mesh: nodeMesh 
            });
        });
        
        // Create edges
        const edgeGeometry = new THREE.BufferGeometry();
        const edgeVertices = [];
        
        for (const [fromState, toStates] of this.stateGraph.entries()) {
            const fromPos = nodePositions.get(fromState);
            if (!fromPos) continue;
            
            for (const toState of toStates) {
                const toPos = nodePositions.get(toState);
                if (!toPos) continue;
                
                edgeVertices.push(fromPos.x, fromPos.y, fromPos.z);
                edgeVertices.push(toPos.x, toPos.y, toPos.z);
            }
        }
        
        if (edgeVertices.length > 0) {
            edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(edgeVertices, 3));
            const edgeMesh = new THREE.LineSegments(edgeGeometry, this.edgeMaterial);
            this.scene.add(edgeMesh);
        }
        
        // Store node references for size updates
        this.stateNodes = Array.from(nodePositions.values()).map(pos => pos.mesh);
        
        // Add raycaster for node clicking
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.renderer.domElement.addEventListener('click', (e) => this.onNodeClick(e));
    }
    
    calculateDistanceMatrix(states) {
        const matrix = new Map();
        
        for (let i = 0; i < states.length; i++) {
            const stateA = states[i];
            const piecesA = this.getPiecesFromStateString(stateA);
            matrix.set(stateA, new Map());
            
            for (let j = 0; j < states.length; j++) {
                const stateB = states[j];
                const piecesB = this.getPiecesFromStateString(stateB);
                
                // Calculate Manhattan distance between corresponding pieces
                let totalDistance = 0;
                const pieceCount = Math.min(piecesA.length, piecesB.length);
                
                for (let k = 0; k < pieceCount; k++) {
                    const pieceA = piecesA[k];
                    const pieceB = piecesB[k];
                    
                    if (pieceA && pieceB) {
                        const dx = Math.abs(pieceA.x - pieceB.x);
                        const dy = Math.abs(pieceA.y - pieceB.y);
                        totalDistance += dx + dy;
                    }
                }
                
                matrix.get(stateA).set(stateB, totalDistance);
            }
        }
        
        return matrix;
    }
    
    forceDirectedLayout(states, distanceMatrix) {
        const positions = new Map();
        const iterations = 100;
        const repulsionStrength = 5;
        const attractionStrength = 0.1;
        const damping = 0.95;
        
        // Initialize random positions
        states.forEach((state, index) => {
            positions.set(state, {
                x: (Math.random() - 0.5) * 100,
                y: (Math.random() - 0.5) * 100,
                z: (Math.random() - 0.5) * 100
            });
        });
        
        // Force-directed layout
        for (let iter = 0; iter < iterations; iter++) {
            const forces = new Map();
            
            // Initialize forces
            states.forEach(state => {
                forces.set(state, { x: 0, y: 0, z: 0 });
            });
            
            // Calculate repulsion between all nodes
            for (let i = 0; i < states.length; i++) {
                const stateA = states[i];
                const posA = positions.get(stateA);
                
                for (let j = 0; j < states.length; j++) {
                    if (i === j) continue;
                    
                    const stateB = states[j];
                    const posB = positions.get(stateB);
                    
                    const dx = posA.x - posB.x;
                    const dy = posA.y - posB.y;
                    const dz = posA.z - posB.z;
                    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.1;
                    
                    const repulsion = repulsionStrength / (distance * distance);
                    
                    const force = forces.get(stateA);
                    force.x += dx / distance * repulsion;
                    force.y += dy / distance * repulsion;
                    force.z += dz / distance * repulsion;
                    
                    const forceB = forces.get(stateB);
                    forceB.x -= dx / distance * repulsion;
                    forceB.y -= dy / distance * repulsion;
                    forceB.z -= dz / distance * repulsion;
                }
            }
            
            // Calculate attraction based on distance matrix
            for (const [fromState, toStates] of this.stateGraph.entries()) {
                const fromPos = positions.get(fromState);
                const fromForce = forces.get(fromState);
                
                for (const toState of toStates) {
                    const toPos = positions.get(toState);
                    const toForce = forces.get(toState);
                    
                    const expectedDistance = distanceMatrix.get(fromState).get(toState);
                    const actualDistance = Math.sqrt(
                        Math.pow(fromPos.x - toPos.x, 2) +
                        Math.pow(fromPos.y - toPos.y, 2) +
                        Math.pow(fromPos.z - toPos.z, 2)
                    );
                    
                    const springForce = attractionStrength * (actualDistance - expectedDistance);
                    
                    const dx = fromPos.x - toPos.x;
                    const dy = fromPos.y - toPos.y;
                    const dz = fromPos.z - toPos.z;
                    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.1;
                    
                    fromForce.x -= dx / distance * springForce;
                    fromForce.y -= dy / distance * springForce;
                    fromForce.z -= dz / distance * springForce;
                    
                    toForce.x += dx / distance * springForce;
                    toForce.y += dy / distance * springForce;
                    toForce.z += dz / distance * springForce;
                }
            }
            
            // Apply forces with damping
            states.forEach(state => {
                const pos = positions.get(state);
                const force = forces.get(state);
                
                pos.x += force.x * damping;
                pos.y += force.y * damping;
                pos.z += force.z * damping;
            });
        }
        
        return positions;
    }
    
    getPiecesFromStateString(state) {
        const board = state.split(',').map(Number);
        const pieces = [];
        const pieceIds = new Set();
        
        // Extract unique piece IDs
        for (let y = 0; y < this.boardHeight; y++) {
            for (let x = 0; x < this.boardWidth; x++) {
                const id = board[y * this.boardWidth + x];
                if (id > 0) {
                    pieceIds.add(id);
                }
            }
        }
        
        // Reconstruct pieces from IDs
        const idArray = Array.from(pieceIds).sort((a, b) => a - b);
        idArray.forEach(id => {
            // Find the bounding box for this piece
            let minX = this.boardWidth, maxX = 0;
            let minY = this.boardHeight, maxY = 0;
            
            for (let y = 0; y < this.boardHeight; y++) {
                for (let x = 0; x < this.boardWidth; x++) {
                    if (board[y * this.boardWidth + x] === id) {
                        minX = Math.min(minX, x);
                        maxX = Math.max(maxX, x + 1);
                        minY = Math.min(minY, y);
                        maxY = Math.max(maxY, y + 1);
                    }
                }
            }
            
            pieces.push({
                id: id - 1,
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY
            });
        });
        
        return pieces;
    }
    
    loadStateFromNode(state) {
        const pieces = this.stateToPieces.get(state);
        if (!pieces) return;
        
        // Clear current board
        this.pieces = pieces.map(p => ({...p}));
        this.nextPieceId = Math.max(...pieces.map(p => p.id)) + 1;
        
        // Update UI
        this.renderBoard();
        this.updatePieceCount();
    }
    
    onNodeClick(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children);
        
        if (intersects.length > 0) {
            const object = intersects[0].object;
            if (object.callback) {
                object.callback();
            }
        }
    }
    
    clearStateSpace() {
        // Remove all objects except lights
        const objectsToRemove = [];
        this.scene.traverse((object) => {
            if (object.isMesh || object.isLineSegments) {
                if (!object.isLight) {
                    objectsToRemove.push(object);
                }
            }
        });
        
        objectsToRemove.forEach(object => {
            this.scene.remove(object);
            if (object.geometry) object.geometry.dispose();
            if (object.material) object.material.dispose();
        });
        
        this.stateToPieces = null;
        this.nodeToState = null;
        this.stateNodes = [];
    }
    
    updateNodeSizes(size) {
        if (this.stateNodes) {
            this.stateNodes.forEach(node => {
                node.scale.setScalar(size);
            });
        }
    }
    
    toggleAutoRotate() {
        this.autoRotate = !this.autoRotate;
        this.controls.autoRotate = this.autoRotate;
        this.autoRotateBtn.textContent = this.autoRotate ? 'Stop Rotation' : 'Auto Rotate';
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    
    onWindowResize() {
        const width = this.threeContainer.clientWidth;
        const height = this.threeContainer.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new KlotskiPuzzle();
});
