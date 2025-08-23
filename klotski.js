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
        this.boardWidthInput = document.getElementById('board-width');
        this.boardHeightInput = document.getElementById('board-height');
        this.applyBoardSizeBtn = document.getElementById('apply-board-size');
        
        this.addPiece1x1Btn = document.getElementById('add-piece-1x1');
        this.addPiece1x2Btn = document.getElementById('add-piece-1x2');
        this.addPiece2x1Btn = document.getElementById('add-piece-2x1');
        this.addPiece2x2Btn = document.getElementById('add-piece-2x2');
        this.drawCustomShapeBtn = document.getElementById('draw-custom-shape');
        this.clearBoardBtn = document.getElementById('clear-board');
        this.generateSpaceBtn = document.getElementById('generate-space');
        this.autoRotateBtn = document.getElementById('auto-rotate');
        this.nodeSizeSlider = document.getElementById('node-size');
        this.nodeSizeValue = document.getElementById('node-size-value');
        
        this.finishShapeBtn = document.getElementById('finish-shape');
        this.cancelShapeBtn = document.getElementById('cancel-shape');
        this.toggleUnreachableBtn = document.getElementById('toggle-unreachable');
        this.toggleAllCombinationsBtn = document.getElementById('toggle-all-combinations');
        
        this.puzzleBoard = document.getElementById('puzzle-board');
        this.drawingCanvas = document.getElementById('drawing-canvas');
        this.drawingControls = document.querySelector('.drawing-controls');
        this.pieceCount = document.getElementById('piece-count');
        this.stateCount = document.getElementById('state-count');
        
        this.setupEventListeners();
        this.setupDrawingCanvas();
    }
    
    setupEventListeners() {
        this.applyBoardSizeBtn.addEventListener('click', () => this.applyBoardSize());
        
        this.addPiece1x1Btn.addEventListener('click', () => this.addPiece(1, 1));
        this.addPiece1x2Btn.addEventListener('click', () => this.addPiece(1, 2));
        this.addPiece2x1Btn.addEventListener('click', () => this.addPiece(2, 1));
        this.addPiece2x2Btn.addEventListener('click', () => this.addPiece(2, 2));
        this.drawCustomShapeBtn.addEventListener('click', () => this.startDrawingCustomShape());
        this.clearBoardBtn.addEventListener('click', () => this.clearBoard());
        this.generateSpaceBtn.addEventListener('click', () => this.generateStateSpace());
        this.autoRotateBtn.addEventListener('click', () => this.toggleAutoRotate());
        
        // Add new button for random custom shape
        this.addRandomCustomShapeBtn = document.createElement('button');
        this.addRandomCustomShapeBtn.id = 'add-random-custom-shape';
        this.addRandomCustomShapeBtn.className = 'btn';
        this.addRandomCustomShapeBtn.textContent = 'Add Random Custom Shape';
        this.addRandomCustomShapeBtn.addEventListener('click', () => this.addRandomCustomShape());
        
        // Insert the button after the draw custom shape button
        const drawCustomShapeBtn = document.getElementById('draw-custom-shape');
        drawCustomShapeBtn.parentNode.insertBefore(this.addRandomCustomShapeBtn, drawCustomShapeBtn.nextSibling);
        
        this.finishShapeBtn.addEventListener('click', () => this.finishCustomShape());
        this.cancelShapeBtn.addEventListener('click', () => this.cancelCustomShape());
        
        this.nodeSizeSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            this.nodeSizeValue.textContent = value;
            this.updateNodeSizes(parseFloat(value));
        });
        
        this.toggleUnreachableBtn.addEventListener('click', () => this.toggleUnreachableStates());
        this.toggleAllCombinationsBtn.addEventListener('click', () => this.toggleAllCombinations());
    }
    
    toggleUnreachableStates() {
        this.showingUnreachableOnly = !this.showingUnreachableOnly;
        this.toggleUnreachableBtn.textContent = this.showingUnreachableOnly ? 'Show All States' : 'Show Unreachable States';
        
        this.render3DStateSpace();
    }
    
    toggleAllCombinations() {
        this.showingAllCombinations = !this.showingAllCombinations;
        this.toggleAllCombinationsBtn.textContent = this.showingAllCombinations 
            ? 'Show Valid States Only' 
            : 'Show All Combinations';
        
        if (this.showingAllCombinations) {
            this.generateAllCombinations();
        } else {
            this.generateStateSpace();
        }
    }

    generateAllCombinations() {
        if (this.pieces.length === 0) {
            alert('Add some pieces first!');
            return;
        }

        this.clearStateSpace();
        
        // Generate all possible position combinations for pieces
        const allStates = new Set();
        const allPieces = this.pieces.map(p => ({...p}));
        
        // Create a mapping to store piece positions
        const generateCombinations = (pieceIndex, currentState) => {
            if (pieceIndex >= allPieces.length) {
                // Valid complete configuration found
                const stateString = this.getStateStringFromPieces(currentState);
                allStates.add(stateString);
                return;
            }
            
            const piece = allPieces[pieceIndex];
            const pieceWidth = piece.isCustom ? Math.max(...piece.cells.map(c => c.x)) + 1 : piece.width;
            const pieceHeight = piece.isCustom ? Math.max(...piece.cells.map(c => c.y)) + 1 : piece.height;
            
            // Try all possible positions for this piece
            for (let y = 0; y <= this.boardHeight - pieceHeight; y++) {
                for (let x = 0; x <= this.boardWidth - pieceWidth; x++) {
                    // Check if this piece can be placed here without overlapping others
                    const newPiece = {...piece, x, y};
                    const newState = [...currentState, newPiece];
                    
                    if (this.isValidPlacement(newState, newPiece)) {
                        generateCombinations(pieceIndex + 1, newState);
                    }
                }
            }
        };
        
        // Start with empty state and build up
        generateCombinations(0, []);
        
        // Create edges based on single-move transitions between any states
        this.allCombinationsGraph = new Map();
        const stateArray = Array.from(allStates);
        
        // Create bidirectional edges for single moves
        for (let i = 0; i < stateArray.length; i++) {
            const stateA = stateArray[i];
            const piecesA = this.getPiecesFromStateString(stateA);
            
            for (let j = 0; j < stateArray.length; j++) {
                if (i === j) continue;
                
                const stateB = stateArray[j];
                const piecesB = this.getPiecesFromStateString(stateB);
                
                // Check if these states differ by exactly one move
                if (this.areStatesSingleMoveApart(piecesA, piecesB)) {
                    if (!this.allCombinationsGraph.has(stateA)) {
                        this.allCombinationsGraph.set(stateA, []);
                    }
                    this.allCombinationsGraph.get(stateA).push(stateB);
                }
            }
        }
        
        // Use the all combinations data
        this.currentStates = allStates;
        this.currentGraph = this.allCombinationsGraph;
        
        this.showingUnreachableOnly = false;
        this.toggleUnreachableBtn.textContent = 'Show Unreachable States';
        
        this.render3DStateSpace();
        this.stateCount.textContent = allStates.size;
    }

    isValidPlacement(state, newPiece) {
        // Check if new piece is within bounds
        if (newPiece.isCustom) {
            for (const cell of newPiece.cells) {
                const px = newPiece.x + cell.x;
                const py = newPiece.y + cell.y;
                if (px < 0 || py < 0 || px >= this.boardWidth || py >= this.boardHeight) {
                    return false;
                }
            }
        } else {
            if (newPiece.x < 0 || newPiece.y < 0 || 
                newPiece.x + newPiece.width > this.boardWidth || 
                newPiece.y + newPiece.height > this.boardHeight) {
                return false;
            }
        }
        
        // Check for overlaps with existing pieces
        for (const existingPiece of state) {
            if (existingPiece === newPiece) continue;
            
            // Check overlap
            if (this.piecesOverlap(existingPiece, newPiece)) {
                return false;
            }
        }
        
        return true;
    }

    piecesOverlap(pieceA, pieceB) {
        // Handle custom pieces
        if (pieceA.isCustom || pieceB.isCustom) {
            const cellsA = pieceA.isCustom ? pieceA.cells : this.getRectangularCells(pieceA);
            const cellsB = pieceB.isCustom ? pieceB.cells : this.getRectangularCells(pieceB);
            
            const baseA = { x: pieceA.x, y: pieceA.y };
            const baseB = { x: pieceB.x, y: pieceB.y };
            
            for (const cellA of cellsA) {
                const ax = baseA.x + cellA.x;
                const ay = baseA.y + cellA.y;
                
                for (const cellB of cellsB) {
                    const bx = baseB.x + cellB.x;
                    const by = baseB.y + cellB.y;
                    
                    if (ax === bx && ay === by) return true;
                }
            }
            return false;
        }
        
        // Both rectangular pieces
        return !(pieceA.x + pieceA.width <= pieceB.x ||
                pieceB.x + pieceB.width <= pieceA.x ||
                pieceA.y + pieceA.height <= pieceB.y ||
                pieceB.y + pieceB.height <= pieceA.y);
    }
    
    // Helper method to get cells for rectangular pieces
    getRectangularCells(piece) {
        const cells = [];
        for (let y = 0; y < piece.height; y++) {
            for (let x = 0; x < piece.width; x++) {
                cells.push({ x, y });
            }
        }
        return cells;
    }
    
    areStatesSingleMoveApart(piecesA, piecesB) {
        // Check if two states differ by exactly one piece moving one space
        if (piecesA.length !== piecesB.length) return false;
        
        let differences = 0;
        let movedPieceIndex = -1;
        
        for (let i = 0; i < piecesA.length; i++) {
            const pieceA = piecesA[i];
            const pieceB = piecesB[i];
            
            if (pieceA.x !== pieceB.x || pieceA.y !== pieceB.y) {
                differences++;
                movedPieceIndex = i;
            }
        }
        
        if (differences !== 1) return false;
        
        // Check if the move is valid (single step)
        const pieceA = piecesA[movedPieceIndex];
        const pieceB = piecesB[movedPieceIndex];
        
        const dx = Math.abs(pieceA.x - pieceB.x);
        const dy = Math.abs(pieceA.y - pieceB.y);
        
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    }

    setupDrawingCanvas() {
        const ctx = this.drawingCanvas.getContext('2d');
        this.drawingContext = ctx;
        
        // Set canvas size to match puzzle board grid
        const resizeCanvas = () => {
            const rect = this.puzzleBoard.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(this.puzzleBoard);
            const gap = parseFloat(computedStyle.gap) || 2;
            const cols = this.boardWidth;
            const rows = this.boardHeight;
            const cellSize = 60; // Match grid cell size
            
            this.drawingCanvas.width = rect.width;
            this.drawingCanvas.height = rect.height;
            this.drawingCanvas.style.width = rect.width + 'px';
            this.drawingCanvas.style.height = rect.height + 'px';
            
            // Calculate actual cell dimensions including gap
            this.cellWidth = cellSize + (gap * (cols - 1)) / cols;
            this.cellHeight = cellSize + (gap * (rows - 1)) / rows;
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        // Drawing variables
        this.isDrawing = false;
        this.drawnCells = new Set();
        
        this.drawingCanvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.drawingCanvas.addEventListener('mousemove', (e) => this.draw(e));
        this.drawingCanvas.addEventListener('mouseup', () => this.stopDrawing());
    }
    
    startDrawingCustomShape() {
        this.drawingMode = true;
        this.drawingCanvas.style.display = 'none'; // Hide overlay canvas
        this.drawingControls.style.display = 'flex';
        this.drawCustomShapeBtn.style.display = 'none';
        
        // Hide regular piece buttons
        this.addPiece1x1Btn.style.display = 'none';
        this.addPiece1x2Btn.style.display = 'none';
        this.addPiece2x1Btn.style.display = 'none';
        this.addPiece2x2Btn.style.display = 'none';
        
        // Add drawing event listeners to the grid cells
        this.setupGridDrawing();
    }
    
    setupGridDrawing() {
        const cells = this.puzzleBoard.querySelectorAll('.board-cell');
        this.drawnCells = new Set();
        
        cells.forEach(cell => {
            cell.addEventListener('mousedown', (e) => this.startGridDrawing(e));
            cell.addEventListener('mouseenter', (e) => this.drawGridCell(e));
            cell.addEventListener('mouseup', () => this.stopGridDrawing());
        });
    }
    
    startGridDrawing(e) {
        if (!this.drawingMode) return;
        
        const cell = e.target;
        const index = parseInt(cell.dataset.index);
        const x = index % this.boardWidth;
        const y = Math.floor(index / this.boardWidth);
        const cellKey = `${x},${y}`;
        
        this.isDrawing = true;
        this.drawnCells.clear();
        
        // Toggle the cell
        if (this.drawnCells.has(cellKey)) {
            this.drawnCells.delete(cellKey);
            cell.style.backgroundColor = '';
            cell.classList.remove('drawing');
        } else {
            this.drawnCells.add(cellKey);
            cell.style.backgroundColor = '#007bff';
            cell.classList.add('drawing');
        }
    }
    
    drawGridCell(e) {
        if (!this.isDrawing || !this.drawingMode) return;
        
        const cell = e.target;
        const index = parseInt(cell.dataset.index);
        const x = index % this.boardWidth;
        const y = Math.floor(index / this.boardWidth);
        const cellKey = `${x},${y}`;
        
        if (!this.drawnCells.has(cellKey)) {
            this.drawnCells.add(cellKey);
            cell.style.backgroundColor = '#007bff';
            cell.classList.add('drawing');
        }
    }
    
    stopGridDrawing() {
        this.isDrawing = false;
    }
    
    startDrawing(e) {
        if (!this.drawingMode) return;
        
        const rect = this.drawingCanvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / this.cellWidth);
        const y = Math.floor((e.clientY - rect.top) / this.cellHeight);
        
        this.isDrawing = true;
        this.drawnCells.clear();
        this.drawingContext.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
    }
    
    draw(e) {
        if (!this.isDrawing || !this.drawingMode) return;
        
        const rect = this.drawingCanvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / this.cellWidth);
        const y = Math.floor((e.clientY - rect.top) / this.cellHeight);
        
        if (x >= 0 && x < this.boardWidth && y >= 0 && y < this.boardHeight) {
            const cellKey = `${x},${y}`;
            if (!this.drawnCells.has(cellKey)) {
                this.drawnCells.add(cellKey);
                
                // Calculate precise cell position accounting for gaps
                const cellX = x * this.cellWidth + 1;
                const cellY = y * this.cellHeight + 1;
                const cellW = this.cellWidth - 2;
                const cellH = this.cellHeight - 2;
                
                // Visual feedback with grid alignment
                this.drawingContext.fillStyle = '#007bff';
                this.drawingContext.fillRect(cellX, cellY, cellW, cellH);
            }
        }
    }
    
    stopDrawing() {
        this.isDrawing = false;
    }
    
    finishCustomShape() {
        if (this.drawnCells.size === 0) {
            alert('Please draw a shape on the grid first!');
            return;
        }
        
        // Convert drawn cells to piece coordinates
        const cells = Array.from(this.drawnCells).map(cell => {
            const [x, y] = cell.split(',').map(Number);
            return { x, y };
        });
        
        // Find bounding box
        const minX = Math.min(...cells.map(c => c.x));
        const maxX = Math.max(...cells.map(c => c.x));
        const minY = Math.min(...cells.map(c => c.y));
        const maxY = Math.max(...cells.map(c => c.y));
        
        const width = maxX - minX + 1;
        const height = maxY - minY + 1;
        
        // Check if we can place this piece
        let canPlace = true;
        for (let py = minY; py <= maxY; py++) {
            for (let px = minX; px <= maxX; px++) {
                const cellKey = `${px},${py}`;
                if (this.drawnCells.has(cellKey)) {
                    const occupied = this.pieces.find(p => 
                        px >= p.x && px < p.x + p.width &&
                        py >= p.y && py < p.y + p.height &&
                        (!p.isCustom || this.isCellInCustomPiece(px - p.x, py - p.y, p))
                    );
                    if (occupied) {
                        canPlace = false;
                        break;
                    }
                }
            }
        }
        
        if (canPlace) {
            const piece = {
                id: this.nextPieceId++,
                x: minX,
                y: minY,
                width: width,
                height: height,
                cells: cells.map(c => ({
                    x: c.x - minX,
                    y: c.y - minY
                })),
                isCustom: true
            };
            
            this.pieces.push(piece);
            this.renderBoard();
            this.updatePieceCount();
        } else {
            alert('Cannot place custom shape — overlaps with existing pieces!');
        }
        
        this.cancelCustomShape();
    }
    
    cancelCustomShape() {
        this.drawingMode = false;
        this.drawingCanvas.style.display = 'none';
        this.drawingControls.style.display = 'none';
        this.drawCustomShapeBtn.style.display = 'inline-block';
        
        // Show regular piece buttons
        this.addPiece1x1Btn.style.display = 'inline-block';
        this.addPiece1x2Btn.style.display = 'inline-block';
        this.addPiece2x1Btn.style.display = 'inline-block';
        this.addPiece2x2Btn.style.display = 'inline-block';
        
        // Clear drawing cells
        const cells = this.puzzleBoard.querySelectorAll('.board-cell');
        cells.forEach(cell => {
            cell.style.backgroundColor = '';
            cell.classList.remove('drawing');
            cell.replaceWith(cell.cloneNode(true)); // Remove event listeners
        });
        
        this.drawnCells = new Set();
    }
    
    addRandomCustomShape() {
        if (this.pieces.length === 0) {
            // No pieces yet, add a simple shape to start
            this.addPiece(1, 1);
            return;
        }

        // Generate random custom shapes until we find one that fits
        const maxAttempts = 50;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // Random shape properties
            const maxWidth = Math.min(4, this.boardWidth);
            const maxHeight = Math.min(4, this.boardHeight);
            const shapeWidth = Math.floor(Math.random() * maxWidth) + 1;
            const shapeHeight = Math.floor(Math.random() * maxHeight) + 1;
            
            // Generate random cells for the shape
            const cells = [];
            const cellCount = Math.floor(Math.random() * (shapeWidth * shapeHeight)) + 1;
            
            // Ensure we don't exceed dimensions
            const actualWidth = Math.min(shapeWidth, this.boardWidth);
            const actualHeight = Math.min(shapeHeight, this.boardHeight);
            
            // Create shape cells
            const usedCells = new Set();
            for (let i = 0; i < cellCount && usedCells.size < actualWidth * actualHeight; i++) {
                let x, y;
                do {
                    x = Math.floor(Math.random() * actualWidth);
                    y = Math.floor(Math.random() * actualHeight);
                } while (usedCells.has(`${x},${y}`));
                
                usedCells.add(`${x},${y}`);
                cells.push({ x, y });
            }
            
            if (cells.length === 0) continue;
            
            // Find a position for this shape
            const maxX = this.boardWidth - actualWidth;
            const maxY = this.boardHeight - actualHeight;
            
            // Try random positions
            const positionAttempts = 20;
            for (let posAttempt = 0; posAttempt < positionAttempts; posAttempt++) {
                const x = Math.floor(Math.random() * (maxX + 1));
                const y = Math.floor(Math.random() * (maxY + 1));
                
                // Check if this position works
                const testPiece = {
                    id: this.nextPieceId,
                    x: x,
                    y: y,
                    width: actualWidth,
                    height: actualHeight,
                    cells: cells,
                    isCustom: true
                };
                
                // Check if we can place this piece
                const testState = [...this.pieces, testPiece];
                let canPlace = true;
                
                for (const cell of cells) {
                    const px = x + cell.x;
                    const py = y + cell.y;
                    
                    // Check bounds
                    if (px < 0 || py < 0 || px >= this.boardWidth || py >= this.boardHeight) {
                        canPlace = false;
                        break;
                    }
                    
                    // Check overlap with existing pieces
                    for (const existingPiece of this.pieces) {
                        if (this.piecesOverlap(existingPiece, testPiece)) {
                            canPlace = false;
                            break;
                        }
                    }
                    
                    if (!canPlace) break;
                }
                
                if (canPlace) {
                    // Found a valid position, add the piece
                    this.pieces.push(testPiece);
                    this.nextPieceId++;
                    this.renderBoard();
                    this.updatePieceCount();
                    return;
                }
            }
        }
        
        alert('No space for a random custom shape!');
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
        this.puzzleBoard.style.gridTemplateColumns = `repeat(${this.boardWidth}, 60px)`;
        this.puzzleBoard.style.gridTemplateRows = `repeat(${this.boardHeight}, 60px)`;
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
        // Handle custom pieces
        const excludePieces = this.pieces.filter(p => p.id === excludeId);
        const customPieces = excludePieces.filter(p => p.isCustom);
        
        // Regular collision detection for non-custom pieces
        if (x < 0 || y < 0 || x + width > this.boardWidth || y + height > this.boardHeight) {
            return false;
        }
        
        for (let py = y; py < y + height; py++) {
            for (let px = x; px < x + width; px++) {
                const occupied = this.pieces.find(p => 
                    p.id !== excludeId &&
                    px >= p.x && px < p.x + p.width &&
                    py >= p.y && py < p.y + p.height &&
                    (!p.isCustom || this.isCellInCustomPiece(px - p.x, py - p.y, p))
                );
                if (occupied) return false;
            }
        }
        return true;
    }
    
    isCellInCustomPiece(x, y, piece) {
        return piece.cells.some(cell => cell.x === x && cell.y === y);
    }
    
    renderBoard() {
        // Clear board
        const cells = this.puzzleBoard.querySelectorAll('.board-cell');
        cells.forEach(cell => {
            cell.classList.remove('occupied', 'drawing');
            cell.style.backgroundColor = '';
            cell.innerHTML = '';
        });
        
        // Render pieces as colored grid cells
        this.pieces.forEach((piece, index) => {
            const hue = (index * 137.5) % 360; // Golden angle for good color distribution
            const color = `hsl(${hue}, 70%, 60%)`;
            
            if (piece.isCustom) {
                // Handle custom pieces
                for (const cell of piece.cells) {
                    const actualX = piece.x + cell.x;
                    const actualY = piece.y + cell.y;
                    const cellIndex = actualY * this.boardWidth + actualX;
                    if (cells[cellIndex]) {
                        cells[cellIndex].classList.add('occupied');
                        cells[cellIndex].style.backgroundColor = color;
                    }
                }
            } else {
                // Handle regular pieces
                for (let py = piece.y; py < piece.y + piece.height; py++) {
                    for (let px = piece.x; px < piece.x + piece.width; px++) {
                        const cellIndex = py * this.boardWidth + px;
                        if (cells[cellIndex]) {
                            cells[cellIndex].classList.add('occupied');
                            cells[cellIndex].style.backgroundColor = color;
                        }
                    }
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
            if (piece.isCustom) {
                // Handle custom pieces
                for (const cell of piece.cells) {
                    const px = piece.x + cell.x;
                    const py = piece.y + cell.y;
                    const cellIndex = py * this.boardWidth + px;
                    if (cellIndex >= 0 && cellIndex < board.length) {
                        board[cellIndex] = index + 1;
                    }
                }
            } else {
                // Handle regular pieces
                for (let py = piece.y; py < piece.y + piece.height; py++) {
                    for (let px = piece.x; px < piece.x + piece.width; px++) {
                        const cellIndex = py * this.boardWidth + px;
                        board[cellIndex] = index + 1;
                    }
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
        
        // Update to use current graph and states
        this.currentStates = this.states;
        this.currentGraph = this.stateGraph;
        
        this.showingUnreachableOnly = false;
        this.toggleUnreachableBtn.textContent = 'Show Unreachable States';
        
        this.render3DStateSpace();
        this.stateCount.textContent = this.states.size;
    }
    
    getStateStringFromPieces(pieces) {
        const board = Array(this.boardWidth * this.boardHeight).fill(0);
        
        pieces.forEach((piece, index) => {
            if (piece.isCustom) {
                // Handle custom pieces
                for (const cell of piece.cells) {
                    const px = piece.x + cell.x;
                    const py = piece.y + cell.y;
                    const cellIndex = py * this.boardWidth + px;
                    if (cellIndex >= 0 && cellIndex < board.length) {
                        board[cellIndex] = index + 1;
                    }
                }
            } else {
                // Handle regular pieces
                for (let py = piece.y; py < piece.y + piece.height; py++) {
                    for (let px = piece.x; px < piece.x + piece.width; px++) {
                        const cellIndex = py * this.boardWidth + px;
                        board[cellIndex] = index + 1;
                    }
                }
            }
        });
        
        return board.join(',');
    }
    
    canPlacePieceInState(pieces, pieceIndex, x, y) {
        const piece = pieces[pieceIndex];
        
        // Handle custom pieces
        if (piece.isCustom) {
            // Check each cell of custom piece
            for (const cell of piece.cells) {
                const px = x + cell.x;
                const py = y + cell.y;
                
                if (px < 0 || py < 0 || px >= this.boardWidth || py >= this.boardHeight) {
                    return false;
                }
                
                const occupied = pieces.find((p, index) => 
                    index !== pieceIndex &&
                    px >= p.x && px < p.x + p.width &&
                    py >= p.y && py < p.y + p.height &&
                    (!p.isCustom || this.isCellInCustomPiece(px - p.x, py - p.y, p))
                );
                if (occupied) return false;
            }
            return true;
        } else {
            // Regular rectangular piece
            if (x < 0 || y < 0 || x + piece.width > this.boardWidth || y + piece.height > this.boardHeight) {
                return false;
            }
            
            for (let py = y; py < y + piece.height; py++) {
                for (let px = x; px < x + piece.width; px++) {
                    const occupied = pieces.find((p, index) => 
                        index !== pieceIndex &&
                        px >= p.x && px < p.x + p.width &&
                        py >= p.y && py < p.y + p.height &&
                        (!p.isCustom || this.isCellInCustomPiece(px - p.x, py - p.y, p))
                    );
                    if (occupied) return false;
                }
            }
            return true;
        }
    }
    
    render3DStateSpace() {
        this.clearStateSpace();
        
        if (this.currentStates.size === 0) return;
        
        const statesToShow = this.showingUnreachableOnly 
            ? this.calculateUnreachableStates() 
            : Array.from(this.currentStates || this.states);
            
        if (statesToShow.length === 0) {
            if (this.showingUnreachableOnly) {
                alert('No unreachable states found!');
            }
            return;
        }
        
        // Create nodes
        const nodeGeometry = new THREE.SphereGeometry(1, 16, 16);
        const stateArray = statesToShow;
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
        
        for (const [fromState, toStates] of this.currentGraph.entries()) {
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
    
    calculateUnreachableStates() {
        const allStates = Array.from(this.states);
        const reachableStates = new Set();
        
        // Start from initial state
        const initialState = this.getStateStringFromPieces(this.pieces.map(p => ({...p})));
        const queue = [initialState];
        const visited = new Set([initialState]);
        
        // BFS to find all reachable states
        while (queue.length > 0) {
            const currentState = queue.shift();
            const edges = this.stateGraph.get(currentState) || [];
            
            for (const nextState of edges) {
                if (!visited.has(nextState)) {
                    visited.add(nextState);
                    queue.push(nextState);
                }
            }
        }
        
        // Find unreachable states
        const unreachable = allStates.filter(state => !visited.has(state));
        return unreachable;
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
                
                // More stable distance calculation
                let totalDistance = 0;
                const maxPieces = Math.max(piecesA.length, piecesB.length);
                
                for (let k = 0; k < maxPieces; k++) {
                    const pieceA = piecesA[k] || { x: -100, y: -100 };
                    const pieceB = piecesB[k] || { x: -100, y: -100 };
                    
                    const dx = Math.abs(pieceA.x - pieceB.x);
                    const dy = Math.abs(pieceA.y - pieceB.y);
                    totalDistance += dx + dy;
                }
                
                // Normalize distance to prevent extreme values
                const normalizedDistance = Math.min(totalDistance / 10, 15);
                matrix.get(stateA).set(stateB, normalizedDistance);
            }
        }
        
        return matrix;
    }
    
    forceDirectedLayout(states, distanceMatrix) {
        const positions = new Map();
        const iterations = 50; // Reduced iterations for faster convergence
        const repulsionStrength = 8; // Increased for better separation
        const attractionStrength = 0.05; // Reduced for smoother movement
        const damping = 0.92; // Slightly more damping
        
        // Initialize positions in a more stable spiral pattern instead of random
        const goldenRatio = (1 + Math.sqrt(5)) / 2;
        const angleIncrement = Math.PI * 2 * goldenRatio;
        
        states.forEach((state, index) => {
            const t = index / Math.max(states.length - 1, 1);
            const radius = 20 + t * 30; // Gradual expansion
            const angle = t * angleIncrement;
            
            positions.set(state, {
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
                z: (t - 0.5) * 10 // Slight z variation
            });
        });
        
        // Force-directed layout with better convergence
        for (let iter = 0; iter < iterations; iter++) {
            const forces = new Map();
            const centerX = 0, centerY = 0, centerZ = 0;
            
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
                    
                    // Smoother repulsion with distance cap
                    const cappedDistance = Math.max(distance, 5);
                    const repulsion = repulsionStrength / (cappedDistance * cappedDistance);
                    
                    const force = forces.get(stateA);
                    force.x += dx / distance * repulsion;
                    force.y += dy / distance * repulsion;
                    force.z += dz / distance * repulsion;
                }
            }
            
            // Calculate attraction based on distance matrix
            for (const [fromState, toStates] of this.currentGraph.entries()) {
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
                    
                    // Smoother spring force
                    const springForce = attractionStrength * (actualDistance - expectedDistance);
                    
                    const dx = fromPos.x - toPos.x;
                    const dy = fromPos.y - toPos.y;
                    const dz = fromPos.z - toPos.z;
                    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.1;
                    
                    const forceMagnitude = springForce;
                    
                    fromForce.x -= dx / distance * forceMagnitude;
                    fromForce.y -= dy / distance * forceMagnitude;
                    fromForce.z -= dz / distance * forceMagnitude;
                    
                    toForce.x += dx / distance * forceMagnitude;
                    toForce.y += dy / distance * forceMagnitude;
                    toForce.z += dz / distance * forceMagnitude;
                }
            }
            
            // Apply forces with center of mass adjustment
            let totalMass = 0;
            let massX = 0, massY = 0, massZ = 0;
            
            states.forEach(state => {
                const pos = positions.get(state);
                massX += pos.x;
                massY += pos.y;
                massZ += pos.z;
                totalMass++;
            });
            
            const centerForceX = massX / totalMass;
            const centerForceY = massY / totalMass;
            const centerForceZ = massZ / totalMass;
            
            // Apply forces with damping and centering
            states.forEach(state => {
                const pos = positions.get(state);
                const force = forces.get(state);
                
                // Add centering force
                force.x -= (pos.x - centerForceX) * 0.01;
                force.y -= (pos.y - centerForceY) * 0.01;
                force.z -= (pos.z - centerForceZ) * 0.01;
                
                // Apply with damping
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
        
        const idArray = Array.from(pieceIds).sort((a, b) => a - b);
        
        idArray.forEach(id => {
            // Collect all cells for this piece
            const cells = [];
            for (let y = 0; y < this.boardHeight; y++) {
                for (let x = 0; x < this.boardWidth; x++) {
                    if (board[y * this.boardWidth + x] === id) {
                        cells.push({ x, y });
                    }
                }
            }
            
            if (cells.length > 0) {
                // Determine if this is a regular rectangle or custom shape
                const minX = Math.min(...cells.map(c => c.x));
                const maxX = Math.max(...cells.map(c => c.x));
                const minY = Math.min(...cells.map(c => c.y));
                const maxY = Math.max(...cells.map(c => c.y));
                
                const width = maxX - minX + 1;
                const height = maxY - minY + 1;
                
                // Check if it forms a complete rectangle
                const expectedCells = width * height;
                const isRectangle = cells.length === expectedCells;
                
                if (isRectangle) {
                    // Regular rectangular piece
                    pieces.push({
                        id: id - 1,
                        x: minX,
                        y: minY,
                        width: width,
                        height: height
                    });
                } else {
                    // Custom shape
                    pieces.push({
                        id: id - 1,
                        x: minX,
                        y: minY,
                        width: width,
                        height: height,
                        cells: cells.map(c => ({
                            x: c.x - minX,
                            y: c.y - minY
                        })),
                        isCustom: true
                    });
                }
            }
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
    
    applyBoardSize() {
        const newWidth = parseInt(this.boardWidthInput.value);
        const newHeight = parseInt(this.boardHeightInput.value);
        
        if (newWidth < 3 || newHeight < 3 || newWidth > 8 || newHeight > 8) {
            alert('Board dimensions must be between 3x3 and 8x8');
            return;
        }
        
        this.boardWidth = newWidth;
        this.boardHeight = newHeight;
        
        // Clear existing puzzle and regenerate
        this.pieces = [];
        this.nextPieceId = 1;
        this.states.clear();
        this.stateGraph.clear();
        this.clearStateSpace();
        
        this.createEmptyBoard();
        this.renderBoard();
        this.updatePieceCount();
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new KlotskiPuzzle();
});
