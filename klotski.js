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
        
        // New state space levels
        this.currentStateLevel = 'normal'; // 'normal', 'sub', 'super', 'micro'
        this.subStates = new Set();
        this.subGraph = new Map();
        this.superStates = new Map(); // Initialize as Map instead of Set
        this.superGraph = new Map();
        this.microStates = new Set(); // New microstate storage
        this.microGraph = new Map();  // New microstate graph
        
        // Superstate configurations for parallel universes
        this.superStateConfigurations = [];
        
        this.showing2DMode = false;
        this.playerPieces = []; // Track player pieces separately
        this.showingPlayerMode = false;

        // Advanced mode toggle and options (optional way to make it way more advanced)
        this.advancedMode = false;
        this.advancedOptions = {
            forceIterationsMultiplier: 3,
            superLayoutsLimit: 20,
            maxForceIterationsCap: 200
        };
        
        // Aggregation toggle: when true, every `aggregateSize` states are averaged into a single rendered node
        this.aggregateNodes = false;
        this.aggregateSize = 10;
        
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
        
        this.toggle2DModeBtn = document.createElement('button');
        this.toggle2DModeBtn.id = 'toggle-2d-mode';
        this.toggle2DModeBtn.className = 'btn';
        this.toggle2DModeBtn.textContent = '2D State Space';
        this.toggle2DModeBtn.addEventListener('click', () => this.toggle2DMode());
        
        this.togglePlayerModeBtn = document.createElement('button');
        this.togglePlayerModeBtn.id = 'toggle-player-mode';
        this.togglePlayerModeBtn.className = 'btn';
        this.togglePlayerModeBtn.textContent = 'Player Mode';
        this.togglePlayerModeBtn.addEventListener('click', () => this.togglePlayerMode());
        
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
        
        // Add state level toggle buttons
        this.toggleSubStatesBtn = document.createElement('button');
        this.toggleSubStatesBtn.id = 'toggle-sub-states';
        this.toggleSubStatesBtn.className = 'btn';
        this.toggleSubStatesBtn.textContent = 'Show Substates';
        this.toggleSubStatesBtn.addEventListener('click', () => this.toggleStateLevel('sub'));
        
        this.toggleSuperStatesBtn = document.createElement('button');
        this.toggleSuperStatesBtn.id = 'toggle-super-states';
        this.toggleSuperStatesBtn.className = 'btn';
        this.toggleSuperStatesBtn.textContent = 'Show Superstates';
        this.toggleSuperStatesBtn.addEventListener('click', () => this.toggleStateLevel('super'));
        
        this.toggleNormalStatesBtn = document.createElement('button');
        this.toggleNormalStatesBtn.id = 'toggle-normal-states';
        this.toggleNormalStatesBtn.className = 'btn';
        this.toggleNormalStatesBtn.textContent = 'Show Normal States';
        this.toggleNormalStatesBtn.addEventListener('click', () => this.toggleStateLevel('normal'));
        
        // Add microstates button
        this.toggleMicroStatesBtn = document.createElement('button');
        this.toggleMicroStatesBtn.id = 'toggle-micro-states';
        this.toggleMicroStatesBtn.className = 'btn';
        this.toggleMicroStatesBtn.textContent = 'Show Microstates';
        this.toggleMicroStatesBtn.addEventListener('click', () => this.toggleStateLevel('micro'));
        
        // Add generate superstate configurations button
        this.generateSuperConfigsBtn = document.createElement('button');
        this.generateSuperConfigsBtn.id = 'generate-super-configs';
        this.generateSuperConfigsBtn.className = 'btn';
        this.generateSuperConfigsBtn.textContent = 'Generate Parallel Universes';
        this.generateSuperConfigsBtn.addEventListener('click', () => this.generateSuperStateConfigurations());

        // Advanced mode toggle
        this.advancedModeBtn = document.createElement('button');
        this.advancedModeBtn.id = 'toggle-advanced-mode';
        this.advancedModeBtn.className = 'btn';
        this.advancedModeBtn.textContent = 'Advanced Mode: Off';
        this.advancedModeBtn.addEventListener('click', () => {
            this.advancedMode = !this.advancedMode;
            this.advancedModeBtn.textContent = `Advanced Mode: ${this.advancedMode ? 'On' : 'Off'}`;
            // provide immediate feedback by re-rendering if a state-space exists
            if (this.currentStates && this.currentStates.size) {
                this.renderCurrentStateLevel();
            }
        });

        // Estimate render time button + status text
        this.estimateBtn = document.createElement('button');
        this.estimateBtn.id = 'estimate-render-time';
        this.estimateBtn.className = 'btn';
        this.estimateBtn.textContent = 'Estimate Render Time';
        this.estimateBtn.addEventListener('click', () => this.estimateRenderTime());
        
        this.estimateStatus = document.createElement('div');
        this.estimateStatus.id = 'estimate-status';
        this.estimateStatus.style.minWidth = '260px';
        this.estimateStatus.style.fontSize = '13px';
        this.estimateStatus.style.color = '#444';
        this.estimateStatus.style.padding = '6px 8px';
        this.estimateStatus.textContent = 'No estimate yet';
        
        // Aggregate nodes toggle (averages every this.aggregateSize states into single node)
        this.toggleAggregateBtn = document.createElement('button');
        this.toggleAggregateBtn.id = 'toggle-aggregate-nodes';
        this.toggleAggregateBtn.className = 'btn';
        this.toggleAggregateBtn.textContent = `Aggregate x${this.aggregateSize}: Off`;
        this.toggleAggregateBtn.addEventListener('click', () => {
            this.aggregateNodes = !this.aggregateNodes;
            this.toggleAggregateBtn.textContent = `Aggregate x${this.aggregateSize}: ${this.aggregateNodes ? 'On' : 'Off'}`;
            if (this.currentStates && this.currentStates.size) {
                this.renderCurrentStateLevel();
            }
        });

        // Add toggle buttons to space controls
        const spaceControls = document.querySelector('.space-controls');
        spaceControls.insertBefore(this.toggle2DModeBtn, spaceControls.firstChild);
        spaceControls.insertBefore(this.togglePlayerModeBtn, this.toggle2DModeBtn.nextSibling);
        
        // Add state level buttons to space controls
        spaceControls.insertBefore(this.toggleSuperStatesBtn, spaceControls.firstChild);
        spaceControls.insertBefore(this.toggleSubStatesBtn, this.toggleSuperStatesBtn.nextSibling);
        spaceControls.insertBefore(this.toggleNormalStatesBtn, this.toggleSubStatesBtn.nextSibling);
        spaceControls.insertBefore(this.toggleMicroStatesBtn, this.toggleNormalStatesBtn.nextSibling);
        spaceControls.insertBefore(this.generateSuperConfigsBtn, this.toggleNormalStatesBtn.nextSibling);
        
        // Insert advanced toggle at the end of the space controls
        spaceControls.appendChild(this.advancedModeBtn);
        // Insert aggregation toggle near the advanced controls
        spaceControls.appendChild(this.toggleAggregateBtn);
        spaceControls.appendChild(this.estimateBtn);
        
        // Place the estimate status under the puzzle info (below "States Found")
        const puzzleInfo = document.querySelector('.puzzle-panel .info');
        if (puzzleInfo) {
            puzzleInfo.appendChild(this.estimateStatus);
        } else {
            // fallback to keeping it in the space controls if puzzle info is not found
            spaceControls.appendChild(this.estimateStatus);
        }
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
            let color;
            if (piece.isPlayer) {
                color = 'hsl(280, 70%, 60%)'; // Purple for player
            } else {
                const hue = (index * 137.5) % 360; // Golden angle for good color distribution
                color = `hsl(${hue}, 70%, 60%)`;
            }
            
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
        
        // Include player pieces in state generation
        const allPieces = [...this.pieces];
        
        // Bfs to find all reachable states
        const initialState = allPieces.map(p => ({...p}));
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
                            
                            // Always create an edge between currentState and newState
                            // if they are distinct layouts (prevents missing connections
                            // when the target state was already discovered).
                            if (!this.stateGraph.has(currentStateString)) {
                                this.stateGraph.set(currentStateString, []);
                            }
                            const edges = this.stateGraph.get(currentStateString);
                            if (newStateString !== currentStateString && !edges.includes(newStateString)) {
                                edges.push(newStateString);
                            }
                            
                            // Enqueue the state if it hasn't been visited yet.
                            if (!visited.has(newStateString)) {
                                visited.add(newStateString);
                                queue.push(newState);
                            }
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
        
        // Initialize nodePositions from computed positions (mesh will be attached only if not aggregating)
        stateArray.forEach((state) => {
            const pos = positions.get(state);
            nodePositions.set(state, { x: pos.x, y: pos.y, z: pos.z, mesh: null });
        });
        
        // Create individual node meshes (unless aggregation is enabled).
        if (!this.aggregateNodes || this.aggregateSize <= 1) {
            stateArray.forEach((state, index) => {
                const pos = positions.get(state);
                const nodeMaterial = this.getNodeMaterialForState(state, index);
                const nodeMesh = new THREE.Mesh(nodeGeometry, nodeMaterial);
                nodeMesh.position.set(pos.x, pos.y, pos.z);
                nodeMesh.userData = { state, index };
                
                // Store mapping from state string to pieces
                const pieces = this.getPiecesFromStateString(state);
                this.stateToPieces.set(state, pieces);
                this.nodeToState.set(nodeMesh, state);
                
                // Add click handler
                nodeMesh.callback = () => this.loadStateFromNode(state);
                
                this.scene.add(nodeMesh);
                const entry = nodePositions.get(state);
                if (entry) entry.mesh = nodeMesh;
                
                // Optional small label for advanced mode
                if (this.advancedMode) {
                    const labelText = `#${index}`;
                    const canvas = document.createElement('canvas');
                    canvas.width = 256;
                    canvas.height = 64;
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0,0,canvas.width,canvas.height);
                    ctx.fillStyle = 'rgba(255,255,255,0.95)';
                    ctx.font = '24px Cal Sans';
                    ctx.textAlign = 'center';
                    ctx.fillText(labelText, canvas.width/2, canvas.height/2 + 8);
                    
                    const tex = new THREE.CanvasTexture(canvas);
                    const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
                    const sprite = new THREE.Sprite(spriteMat);
                    sprite.scale.set(6, 1.5, 1);
                    sprite.position.set(pos.x, pos.y + 2.4, pos.z);
                    sprite.userData = { labelFor: state };
                    nodeMesh.userData._labelSprite = sprite;
                    this.scene.add(sprite);
                }
            });
        }
        
        // AGGREGATION: create averaged nodes for every `aggregateSize` states when toggle is on
        if (this.aggregateNodes && this.aggregateSize > 1) {
            const groups = this.groupStatesIntoChunks(stateArray, this.aggregateSize);
            const aggGeometry = new THREE.SphereGeometry(1.6, 16, 16);
            const aggMaterialBase = new THREE.MeshPhongMaterial({ color: 0xff7043, transparent: true, opacity: 0.95 });
            const aggregatedNodes = [];
            const stateToGroup = new Map();
            
            groups.forEach((group, gi) => {
                let sx = 0, sy = 0, sz = 0, count = 0;
                group.forEach(st => {
                    const p = positions.get(st);
                    if (!p) return;
                    sx += p.x; sy += p.y; sz += p.z; count++;
                    stateToGroup.set(st, gi);
                });
                if (count === 0) return;
                sx /= count; sy /= count; sz /= count;
                
                const mat = aggMaterialBase.clone();
                const nodeMesh = new THREE.Mesh(aggGeometry, mat);
                nodeMesh.position.set(sx, sy, sz);
                nodeMesh.userData = { groupStates: group.slice(), index: gi };
                nodeMesh.callback = () => this.loadStateFromNode(group[0]); // load first state's layout on click
                this.scene.add(nodeMesh);
                aggregatedNodes.push(nodeMesh);
            });
            
            // hide original per-state nodes to declutter view
            this.stateNodes.forEach(n => n.visible = false);
            
            // Build aggregated edges between groups (unique pairs)
            const aggEdgeVerts = [];
            const seenPairs = new Set();
            for (const [fromState, toStates] of this.currentGraph.entries()) {
                const g1 = stateToGroup.get(fromState);
                if (g1 === undefined) continue;
                for (const toState of toStates) {
                    const g2 = stateToGroup.get(toState);
                    if (g2 === undefined || g1 === g2) continue;
                    const key = g1 < g2 ? `${g1}|${g2}` : `${g2}|${g1}`;
                    if (seenPairs.has(key)) continue;
                    seenPairs.add(key);
                    // average positions for each group to draw connecting segment
                    const gp1 = groups[g1].reduce((acc, s) => { const p = positions.get(s); if (p) { acc.x += p.x; acc.y += p.y; acc.z += p.z; acc.c++; } return acc; }, {x:0,y:0,z:0,c:0});
                    const gp2 = groups[g2].reduce((acc, s) => { const p = positions.get(s); if (p) { acc.x += p.x; acc.y += p.y; acc.z += p.z; acc.c++; } return acc; }, {x:0,y:0,z:0,c:0});
                    if (gp1.c === 0 || gp2.c === 0) continue;
                    aggEdgeVerts.push(gp1.x/gp1.c, gp1.y/gp1.c, gp1.z/gp1.c);
                    aggEdgeVerts.push(gp2.x/gp2.c, gp2.y/gp2.c, gp2.z/gp2.c);
                }
            }
            if (aggEdgeVerts.length > 0) {
                const aggGeom = new THREE.BufferGeometry();
                aggGeom.setAttribute('position', new THREE.Float32BufferAttribute(aggEdgeVerts, 3));
                const aggLines = new THREE.LineSegments(aggGeom, this.edgeMaterial);
                aggLines.userData._aggregated = true;
                this.scene.add(aggLines);
            }
            
            // Replace stateNodes reference with aggregated nodes so size slider affects them
            this.stateNodes = aggregatedNodes;
            // Update state count display to number of aggregated nodes
            this.stateCount.textContent = groups.length;
        }
        
        // Create edges
        // Create per-state edges (skip when aggregating; aggregated edges are created inside aggregation block)
        if (!this.aggregateNodes || this.aggregateSize <= 1) {
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
        }
        
        // Store node references for size updates
        if (!this.aggregateNodes || this.aggregateSize <= 1) {
            this.stateNodes = Array.from(nodePositions.values()).map(pos => pos.mesh).filter(Boolean);
        } // when aggregation is enabled, this.stateNodes is set to aggregated nodes inside the aggregation block above
        
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
        const baseIterations = 50; // base iterations
        const iterations = Math.min(baseIterations * (this.advancedMode ? this.advancedOptions.forceIterationsMultiplier : 1), this.advancedOptions.maxForceIterationsCap);
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
            if (object.isMesh || object.isLineSegments || object.isSprite) {
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
    
    // Estimate render time using a quick heuristic then a controlled benchmark
    estimateRenderTime() {
        // Quick heuristic: base on number of states (if available) or pieces
        const stateCount = (this.currentStates && this.currentStates.size) || (this.states && this.states.size) || 0;
        const piecesCount = this.pieces ? this.pieces.length : 0;
        const heuristicSeconds = Math.max(0.05, (stateCount * 0.004) + (piecesCount * 0.02));
        this.estimateStatus.textContent = `Quick estimate: ~${heuristicSeconds.toFixed(2)}s (heuristic) — running short benchmark...`;
        
        // Run a short controlled benchmark (caps time to avoid resource exhaustion)
        const maxBenchmarkMs = this.advancedMode ? 3000 : 1200; // advanced users can allow a bit longer
        this.runBenchmarkWorker(maxBenchmarkMs).then(opsPerMs => {
            if (!opsPerMs || opsPerMs <= 0) {
                this.estimateStatus.textContent = 'Benchmark failed or too quick to measure — using heuristic only.';
                return;
            }
            
            // Convert a hypothetical "work amount" for rendering to ops:
            // we estimate rendering work roughly proportional to number of nodes * 1500 ops/node
            const nodes = Math.max(1, stateCount || Math.max(1, piecesCount * 5));
            const estimatedWorkOps = nodes * 1500;
            const estimatedMs = estimatedWorkOps / opsPerMs;
            const estimatedSeconds = (estimatedMs / 1000);
            
            this.estimateStatus.textContent = `Quick: ~${heuristicSeconds.toFixed(2)}s; Benchmark-based: ~${estimatedSeconds.toFixed(2)}s (nodes=${nodes}, ops/ms=${opsPerMs.toFixed(1)}).`;
        }).catch(err => {
            console.warn('Benchmark error', err);
            this.estimateStatus.textContent = 'Benchmark failed — using heuristic only.';
        });
    }
    
    // Run a short CPU-bound benchmark inside a Web Worker with a strict time cap.
    // Returns Promise<number> => operations per millisecond measured.
    runBenchmarkWorker(maxMs = 1200) {
        return new Promise((resolve, reject) => {
            // If browser doesn't support Worker, fallback to a short main-thread benchmark (safe, short).
            if (typeof Worker === 'undefined') {
                try {
                    const start = performance.now();
                    let ops = 0;
                    // Keep it short to avoid freezing: ~200ms loop
                    const endTime = start + Math.min(200, maxMs / 6);
                    while (performance.now() < endTime) {
                        // cheap arithmetic work
                        ops += (Math.imul(48271, (ops + 1) & 0xffff) >>> 0) & 0xffff;
                    }
                    const elapsed = performance.now() - start || 1;
                    resolve(ops / elapsed);
                } catch (e) {
                    reject(e);
                }
                return;
            }
            
            const blob = this.createBenchmarkWorkerBlob();
            const url = URL.createObjectURL(blob);
            const worker = new Worker(url);
            let opsReported = 0;
            let alive = true;
            
            const timer = setTimeout(() => {
                // terminate after cap
                if (alive) {
                    alive = false;
                    try { worker.terminate(); } catch(e) {}
                    URL.revokeObjectURL(url);
                    // resolve with whatever was reported
                    resolve(Math.max(0.001, opsReported / Math.max(1, Math.min(maxMs, maxMs))));
                }
            }, maxMs);
            
            worker.onmessage = (e) => {
                const data = e.data;
                if (data.type === 'progress') {
                    opsReported = data.ops;
                    // update an optional progress hint (throttle DOM updates)
                    if (this.estimateStatus) {
                        this.estimateStatus.textContent = `Benchmark running... ${Math.round((data.elapsed / maxMs) * 100)}%`;
                    }
                } else if (data.type === 'done') {
                    if (!alive) return;
                    clearTimeout(timer);
                    alive = false;
                    worker.terminate();
                    URL.revokeObjectURL(url);
                    const elapsed = data.elapsed || 1;
                    const ops = data.ops || 1;
                    resolve(ops / elapsed);
                }
            };
            
            // Start benchmark with requested max runtime (worker will attempt to run until told to stop)
            worker.postMessage({ cmd: 'start', maxMs });
        });
    }
    
    // Create a small worker blob that performs a controlled busy loop and reports ops done & elapsed time.
    createBenchmarkWorkerBlob() {
        const workerCode = `
            self.onmessage = function(e) {
                const maxMs = (e.data && e.data.maxMs) || 800;
                const start = performance.now();
                let ops = 0;
                // Do short batches and post progress so main thread can kill if needed.
                while (true) {
                    const innerStart = performance.now();
                    // run a tight batch of operations
                    for (let i = 0; i < 20000; i++) {
                        // inexpensive deterministic work
                        ops += (Math.imul(48271, (ops + i) & 0xffff) >>> 0) & 0xffff;
                    }
                    const now = performance.now();
                    const elapsed = now - start;
                    // send periodic progress
                    self.postMessage({ type: 'progress', ops: ops, elapsed: elapsed });
                    if (elapsed >= maxMs) {
                        // finish
                        self.postMessage({ type: 'done', ops: ops, elapsed: elapsed });
                        return;
                    }
                }
            };
        `;
        return new Blob([workerCode], { type: 'application/javascript' });
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
    
    toggle2DMode() {
        this.showing2DMode = !this.showing2DMode;
        this.toggle2DModeBtn.textContent = this.showing2DMode ? '3D State Space' : '2D State Space';
        
        const threeContainer = document.getElementById('three-container');
        const canvas2D = document.getElementById('canvas-2d');
        
        if (this.showing2DMode) {
            threeContainer.style.display = 'none';
            if (!canvas2D) {
                this.create2DCanvas();
            } else {
                canvas2D.style.display = 'block';
            }
            this.render2DStateSpace();
        } else {
            threeContainer.style.display = 'block';
            if (canvas2D) canvas2D.style.display = 'none';
        }
    }
    
    togglePlayerMode() {
        this.showingPlayerMode = !this.showingPlayerMode;
        this.togglePlayerModeBtn.textContent = this.showingPlayerMode ? 'Normal Mode' : 'Player Mode';
        
        if (this.showingPlayerMode) {
            this.addPlayerPiece();
        } else {
            this.removePlayerPieces();
        }
    }
    
    addPlayerPiece() {
        // Add a small player piece (different color)
        const playerPiece = {
            id: 999,
            x: 0,
            y: 0,
            width: 1,
            height: 1,
            isPlayer: true
        };
        
        // Find available position
        for (let y = 0; y <= this.boardHeight - 1; y++) {
            for (let x = 0; x <= this.boardWidth - 1; x++) {
                if (this.canPlacePiece(x, y, 1, 1)) {
                    playerPiece.x = x;
                    playerPiece.y = y;
                    this.playerPieces.push(playerPiece);
                    this.pieces.push(playerPiece);
                    this.renderBoard();
                    this.updatePieceCount();
                    return;
                }
            }
        }
    }
    
    removePlayerPieces() {
        this.pieces = this.pieces.filter(p => !p.isPlayer);
        this.playerPieces = [];
        this.renderBoard();
        this.updatePieceCount();
    }
    
    create2DCanvas() {
        const canvas = document.createElement('canvas');
        canvas.id = 'canvas-2d';
        canvas.width = 800;
        canvas.height = 600;
        canvas.style.display = 'block';
        canvas.style.margin = '0 auto';
        canvas.style.border = '1px solid #ddd';
        canvas.style.borderRadius = '8px';
        
        const threeContainer = document.getElementById('three-container');
        threeContainer.parentNode.insertBefore(canvas, threeContainer);
        
        this.canvas2D = canvas;
        this.ctx2D = canvas.getContext('2d');
        
        // Add click handler
        canvas.addEventListener('click', (e) => this.on2DCanvasClick(e));
    }
    
    render2DStateSpace() {
        if (!this.canvas2D) return;
        
        const ctx = this.ctx2D;
        const states = Array.from(this.currentStates || this.states);
        
        if (states.length === 0) {
            ctx.clearRect(0, 0, 800, 600);
            ctx.fillStyle = '#666';
            ctx.font = '16px Cal Sans';
            ctx.textAlign = 'center';
            ctx.fillText('Generate state space first', 400, 300);
            return;
        }
        
        // Clear canvas
        ctx.clearRect(0, 0, 800, 600);
        
        // Calculate layout grid
        const cols = Math.ceil(Math.sqrt(states.length));
        const rows = Math.ceil(states.length / cols);
        const cellWidth = 800 / cols;
        const cellHeight = 600 / rows;
        const miniWidth = Math.min(cellWidth, cellHeight) * 0.8;
        
        // Draw each state as a mini puzzle
        states.forEach((state, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;
            const x = col * cellWidth + (cellWidth - miniWidth) / 2;
            const y = row * cellHeight + (cellHeight - miniWidth) / 2;
            
            this.drawMiniState(ctx, state, x, y, miniWidth);
        });
    }
    
    drawMiniState(ctx, stateString, x, y, size) {
        const board = stateString.split(',').map(Number);
        const cellSize = size / Math.max(this.boardWidth, this.boardHeight);
        
        // Draw grid background
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(x, y, this.boardWidth * cellSize, this.boardHeight * cellSize);
        
        // Draw grid lines
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= this.boardWidth; i++) {
            ctx.beginPath();
            ctx.moveTo(x + i * cellSize, y);
            ctx.lineTo(x + i * cellSize, y + this.boardHeight * cellSize);
            ctx.stroke();
        }
        for (let i = 0; i <= this.boardHeight; i++) {
            ctx.beginPath();
            ctx.moveTo(x, y + i * cellSize);
            ctx.lineTo(x + this.boardWidth * cellSize, y + i * cellSize);
            ctx.stroke();
        }
        
        // Draw pieces with colors
        const pieceColors = {};
        const pieces = this.getPiecesFromStateString(stateString);
        
        pieces.forEach((piece, index) => {
            const hue = piece.isPlayer ? 280 : (index * 137.5) % 360;
            const color = `hsl(${hue}, 70%, 60%)`;
            pieceColors[index + 1] = color;
        });
        
        // Fill cells
        for (let py = 0; py < this.boardHeight; py++) {
            for (let px = 0; px < this.boardWidth; px++) {
                const cellIndex = py * this.boardWidth + px;
                const pieceId = board[cellIndex];
                
                if (pieceId > 0) {
                    ctx.fillStyle = pieceColors[pieceId] || '#007bff';
                    ctx.fillRect(
                        x + px * cellSize + 0.5,
                        y + py * cellSize + 0.5,
                        cellSize - 1,
                        cellSize - 1
                    );
                }
            }
        }
    }
    
    on2DCanvasClick(e) {
        const canvas = e.target;
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        const states = Array.from(this.currentStates || this.states);
        const cols = Math.ceil(Math.sqrt(states.length));
        const rows = Math.ceil(states.length / cols);
        const cellWidth = 800 / cols;
        const cellHeight = 600 / rows;
        const miniWidth = Math.min(cellWidth, cellHeight) * 0.8;
        
        // Find clicked state
        for (let i = 0; i < states.length; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            const x = col * cellWidth + (cellWidth - miniWidth) / 2;
            const y = row * cellHeight + (cellHeight - miniWidth) / 2;
            
            if (clickX >= x && clickX <= x + miniWidth &&
                clickY >= y && clickY <= y + miniWidth) {
                this.loadStateFromNode(states[i]);
                break;
            }
        }
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
    
    toggleStateLevel(level) {
        this.currentStateLevel = level;
        
        // Update button states
        this.toggleNormalStatesBtn.textContent = level === 'normal' ? 'Normal States (Active)' : 'Show Normal States';
        this.toggleSubStatesBtn.textContent = level === 'sub' ? 'Substates (Active)' : 'Show Substates';
        this.toggleSuperStatesBtn.textContent = level === 'super' ? 'Superstates (Active)' : 'Show Superstates';
        this.toggleMicroStatesBtn.textContent = level === 'micro' ? 'Microstates (Active)' : 'Show Microstates';
        
        // Update active buttons
        [this.toggleNormalStatesBtn, this.toggleSubStatesBtn, this.toggleSuperStatesBtn, this.toggleMicroStatesBtn].forEach(btn => {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn');
        });
        
        const activeBtn = level === 'normal' ? this.toggleNormalStatesBtn : 
                         level === 'sub' ? this.toggleSubStatesBtn : 
                         level === 'super' ? this.toggleSuperStatesBtn : this.toggleMicroStatesBtn;
        activeBtn.classList.add('btn-primary');
        
        // Render appropriate state space
        this.renderCurrentStateLevel();
    }

    generateSuperStateConfigurations() {
        if (this.pieces.length === 0) {
            alert('Add some pieces first to create similar puzzle layouts!');
            return;
        }

        this.superStateConfigurations = [];
        
        const basePieces = [...this.pieces];
        const originalPieceCount = basePieces.length;
        
        // Find all available spaces for extra pieces
        const availableSpaces = this.findAvailableSpaces(basePieces);
        const maxPossibleLayouts = Math.min(availableSpaces.length, this.advancedMode ? this.advancedOptions.superLayoutsLimit : 8); // increased when advanced
        
        // Generate dynamic number of layouts based on available spaces
        const layoutCount = Math.max(1, maxPossibleLayouts);
        
        for (let layout = 0; layout < layoutCount; layout++) {
            const similarLayout = this.createSimilarLayout(basePieces, layout, availableSpaces);
            const config = {
                id: `layout_${layout}`,
                name: `Similar Layout ${layout + 1}`,
                pieces: similarLayout,
                description: `Contains all original ${originalPieceCount} pieces plus ${similarLayout.length - originalPieceCount} additional pieces`,
                originalPieces: basePieces,
                isSimilar: true
            };
            this.superStateConfigurations.push(config);
        }
        
        // Generate state space for each layout
        this.generateSuperStateSpace();
        alert(`Generated ${this.superStateConfigurations.length} similar puzzle layouts based on available space!`);
    }

    createSimilarLayout(originalPieces, layoutIndex, availableSpaces) {
        let pieces = [...originalPieces];
        
        if (!availableSpaces || availableSpaces.length === 0) {
            return pieces; // Return base configuration if no extra space
        }
        
        // Ensure we don't try to add more pieces than we have spaces for
        const extraCount = Math.min(layoutIndex + 1, availableSpaces.length);
        
        for (let i = 0; i < extraCount; i++) {
            const space = availableSpaces[i];
            let newPiece;
            
            // Prioritize smaller pieces first, then larger ones based on available space
            if (space.width === 1 && space.height === 1) {
                newPiece = {
                    id: this.nextPieceId++,
                    x: space.x,
                    y: space.y,
                    width: 1,
                    height: 1
                };
            } else if (space.width === 1 && space.height === 2) {
                newPiece = {
                    id: this.nextPieceId++,
                    x: space.x,
                    y: space.y,
                    width: 1,
                    height: (layoutIndex % 2 === 0) ? 2 : 1 // Alternate between 1x2 and 1x1 for variety
                };
            } else if (space.width === 2 && space.height === 1) {
                newPiece = {
                    id: this.nextPieceId++,
                    x: space.x,
                    y: space.y,
                    width: (layoutIndex % 2 === 0) ? 2 : 1,
                    height: 1
                };
            } else {
                // For larger spaces, use available dimensions
                newPiece = {
                    id: this.nextPieceId++,
                    x: space.x,
                    y: space.y,
                    width: space.width,
                    height: space.height
                };
            }
            
            pieces.push(newPiece);
        }
        
        return pieces;
    }

    findAvailableSpaces(existingPieces) {
        const spaces = [];
        const occupied = Array(this.boardWidth * this.boardHeight).fill(false);
        
        // Mark occupied positions
        existingPieces.forEach(piece => {
            if (piece.isCustom) {
                piece.cells.forEach(cell => {
                    const x = piece.x + cell.x;
                    const y = piece.y + cell.y;
                    if (x < this.boardWidth && y < this.boardHeight) {
                        occupied[y * this.boardWidth + x] = true;
                    }
                });
            } else {
                for (let y = piece.y; y < piece.y + piece.height && y < this.boardHeight; y++) {
                    for (let x = piece.x; x < piece.x + piece.width && x < this.boardWidth; x++) {
                        occupied[y * this.boardWidth + x] = true;
                    }
                }
            }
        });
        
        // Find empty rectangular spaces
        for (let h = 1; h <= 2; h++) {
            for (let w = 1; w <= 2; w++) {
                for (let y = 0; y <= this.boardHeight - h; y++) {
                    for (let x = 0; x <= this.boardWidth - w; x++) {
                        let canPlace = true;
                        for (let py = y; py < y + h; py++) {
                            for (let px = x; px < x + w; px++) {
                                if (occupied[py * this.boardWidth + px]) {
                                    canPlace = false;
                                    break;
                                }
                            }
                            if (!canPlace) break;
                        }
                        if (canPlace) {
                            spaces.push({x, y, width: w, height: h});
                        }
                    }
                }
            }
        }
        
        return spaces;
    }

    generateSuperStateSpace() {
        if (this.superStateConfigurations.length === 0) {
            alert('Generate similar layouts first!');
            return;
        }
        
        // Reset superStates to be a Map for proper key-value storage
        this.superStates = new Map();
        this.superGraph = new Map();
        
        // Generate state space for each layout
        this.superStateConfigurations.forEach(config => {
            // Temporarily switch to this layout's pieces
            const originalPieces = [...this.pieces];
            this.pieces = config.pieces;
            
            // Generate state space for this layout
            this.generateStateSpaceForConfiguration(config);
            
            // Restore original pieces
            this.pieces = originalPieces;
        });
        
        // Update the display
        this.renderCurrentStateLevel();
    }

    generateStateSpaceForConfiguration(config) {
        const states = new Set();
        const graph = new Map();
        
        // Generate states for this configuration
        const initialState = config.pieces.map(p => ({...p}));
        const queue = [initialState];
        const visited = new Set([this.getStateStringFromPieces(initialState)]);
        
        while (queue.length > 0) {
            const currentState = queue.shift();
            const currentStateString = this.getStateStringFromPieces(currentState);
            
            if (!states.has(currentStateString)) {
                states.add(currentStateString);
                
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
                            
                            // Ensure an edge exists between these two micro-layout nodes
                            // even if the target layout was already discovered.
                            if (!graph.has(currentStateString)) {
                                graph.set(currentStateString, []);
                            }
                            const edges = graph.get(currentStateString);
                            if (newStateString !== currentStateString && !edges.includes(newStateString)) {
                                edges.push(newStateString);
                            }
                            
                            // Enqueue the state if it hasn't been visited yet.
                            if (!visited.has(newStateString)) {
                                visited.add(newStateString);
                                queue.push(newState);
                            }
                        }
                    }
                }
            }
        }
        
        // Store the results in superStates using the config ID as key
        this.superStates.set(config.id, {
            id: config.id,
            name: config.name,
            description: config.description,
            states: states,
            graph: graph,
            pieceCount: config.pieces.length,
            containsOriginal: config.isSimilar || false,
            originalPieces: config.originalPieces || []
        });
    }

    generateMicroStateSpace() {
        if (this.pieces.length === 0) {
            alert('Add some pieces first!');
            return;
        }

        this.microStates.clear();
        this.microGraph.clear();
        
        // Get the current state as a board
        const currentStateString = this.getStateString();
        const board = currentStateString.split(',').map(Number);
        
        // Create micro-pieces (1x1 squares) for each occupied cell
        const microPieces = [];
        let pieceId = 1;
        
        for (let y = 0; y < this.boardHeight; y++) {
            for (let x = 0; x < this.boardWidth; x++) {
                const index = y * this.boardWidth + x;
                if (board[index] > 0) {
                    microPieces.push({
                        id: pieceId++,
                        x: x,
                        y: y,
                        width: 1,
                        height: 1
                    });
                }
            }
        }
        
        if (microPieces.length === 0) {
            alert('No occupied squares found!');
            return;
        }
        
        // Generate state space with micro-pieces
        const states = new Set();
        const graph = new Map();
        
        // BFS to find all reachable states
        const initialState = microPieces.map(p => ({...p}));
        const queue = [initialState];
        const visited = new Set([this.getStateStringFromPieces(initialState)]);
        
        while (queue.length > 0) {
            const currentState = queue.shift();
            const currentStateString = this.getStateStringFromPieces(currentState);
            
            if (!states.has(currentStateString)) {
                states.add(currentStateString);
                
                // Try moving each micro-piece in all directions
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
                            
                            // Always create an edge between currentState and newState
                            // if they are distinct layouts (prevents missing connections
                            // when the target state was already discovered).
                            if (!graph.has(currentStateString)) {
                                graph.set(currentStateString, []);
                            }
                            const edges = graph.get(currentStateString);
                            if (newStateString !== currentStateString && !edges.includes(newStateString)) {
                                edges.push(newStateString);
                            }
                            
                            // Enqueue the state if it hasn't been visited yet.
                            if (!visited.has(newStateString)) {
                                visited.add(newStateString);
                                queue.push(newState);
                            }
                        }
                    }
                }
            }
        }
        
        this.microStates = states;
        this.microGraph = graph;
    }

    renderCurrentStateLevel() {
        // Clear any existing back button
        if (this.backToSuperstatesBtn) {
            this.backToSuperstatesBtn.style.display = 'none';
        }
        
        this.clearStateSpace();
        
        switch (this.currentStateLevel) {
            case 'sub':
                if (this.states.size === 0) {
                    this.generateStateSpace();
                    if (this.states.size === 0) return;
                }
                this.generateSubStateSpace();
                this.currentStates = this.subStates;
                this.currentGraph = this.subGraph;
                this.stateCount.textContent = this.subStates.size;
                break;
                
            case 'super':
                if (this.superStates.size === 0 && this.superStateConfigurations.length > 0) {
                    this.generateSuperStateSpace();
                }
                this.renderSuperStatesAsNodes();
                return;
                
            case 'micro':
                if (this.microStates.size === 0) {
                    this.generateMicroStateSpace();
                }
                this.currentStates = this.microStates;
                this.currentGraph = this.microGraph;
                this.stateCount.textContent = this.microStates.size;
                break;
                
            case 'normal':
            default:
                this.currentStates = this.states;
                this.currentGraph = this.stateGraph;
                this.stateCount.textContent = this.states.size;
                break;
        }
        
        this.render3DStateSpace();
    }

    generateSubStateSpace() {
        // Ensure normal states exist
        if (!this.states || this.states.size === 0) {
            this.generateStateSpace();
            if (!this.states || this.states.size === 0) return;
        }

        // Helper: collapse a full state into a binary/merged representation (occupied=1, empty=0)
        const mergeStateToBinary = (stateString) => {
            return stateString.split(',').map(v => (Number(v) > 0 ? '1' : '0')).join(',');
        };

        this.subStates = new Set();
        this.subGraph = new Map();

        // Map each normal state -> merged state (binary)
        const normalToMerged = new Map();
        for (const normalState of this.states) {
            const merged = mergeStateToBinary(normalState);
            normalToMerged.set(normalState, merged);
            this.subStates.add(merged);
        }

        // Build edges between merged states based on original stateGraph edges
        for (const [fromState, toStates] of this.stateGraph.entries()) {
            const mergedFrom = normalToMerged.get(fromState) || mergeStateToBinary(fromState);
            if (!this.subGraph.has(mergedFrom)) this.subGraph.set(mergedFrom, []);
            const edgeList = this.subGraph.get(mergedFrom);

            for (const toState of toStates) {
                const mergedTo = normalToMerged.get(toState) || mergeStateToBinary(toState);
                if (mergedTo === mergedFrom) continue;
                if (!edgeList.includes(mergedTo)) edgeList.push(mergedTo);
            }
        }

        // Update state count display for substates
        this.stateCount.textContent = this.subStates.size;
    }

    renderSuperStatesAsNodes() {
        if (this.superStates.size === 0) return;
        
        // Create meta-nodes for each layout
        const superNodeGeometry = new THREE.SphereGeometry(2, 32, 32);
        const superNodeMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x9c27b0,
            transparent: true,
            opacity: 0.8
        });
        
        const positions = new Map();
        const angleIncrement = (Math.PI * 2) / this.superStates.size;
        
        let index = 0;
        for (const [key, superState] of this.superStates) {
            const angle = index * angleIncrement;
            const radius = 40;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const z = (index % 2) * 20 - 10;
            
            const nodeMesh = new THREE.Mesh(superNodeGeometry, superNodeMaterial);
            nodeMesh.position.set(x, y, z);
            nodeMesh.userData = { 
                superState,
                name: superState.name,
                description: superState.description
            };
            
            // Click handler now navigates to that layout's normal state space
            nodeMesh.callback = () => {
                this.showLayoutNormalStates(superState);
            };
            
            this.scene.add(nodeMesh);
            positions.set(superState.id, { x, y, z, mesh: nodeMesh });
            index++;
        }
        
        this.stateCount.textContent = this.superStates.size;
    }

    showLayoutNormalStates(superState) {
        // Switch to normal state level and load this layout's states
        this.currentStateLevel = 'normal';
        this.currentStates = superState.states;
        this.currentGraph = superState.graph;
        
        // Update the actual puzzle pieces to match this layout
        this.pieces = superState.originalPieces.map(p => ({...p}));
        
        // Update UI
        this.toggleNormalStatesBtn.textContent = 'Normal States (Active)';
        this.toggleSubStatesBtn.textContent = 'Show Substates';
        this.toggleSuperStatesBtn.textContent = 'Show Superstates';
        
        // Update button styles
        [this.toggleNormalStatesBtn, this.toggleSubStatesBtn, this.toggleSuperStatesBtn, this.toggleMicroStatesBtn].forEach(btn => {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn');
        });
        this.toggleNormalStatesBtn.classList.add('btn-primary');
        
        // Update the puzzle board to show the new layout
        this.renderBoard();
        this.updatePieceCount();
        
        // Render the normal state space for this layout
        this.render3DStateSpace();
        
        // Add a back button to return to superstate view
        this.showLayoutBackButton();
    }

    showLayoutBackButton() {
        // Create or show back button
        if (!this.backToSuperstatesBtn) {
            this.backToSuperstatesBtn = document.createElement('button');
            this.backToSuperstatesBtn.id = 'back-to-superstates';
            this.backToSuperstatesBtn.className = 'btn btn-primary';
            this.backToSuperstatesBtn.textContent = '← Back to Layouts';
            this.backToSuperstatesBtn.addEventListener('click', () => {
                this.toggleStateLevel('super');
            });
            
            const spaceControls = document.querySelector('.space-controls');
            spaceControls.insertBefore(this.backToSuperstatesBtn, spaceControls.firstChild);
        } else {
            this.backToSuperstatesBtn.style.display = 'inline-block';
        }
    }

    // New helper to pick base color per state level and to create per-node materials (small HSL variation by index)
    getNodeColorForLevel() {
        // Return a hex color for each level
        switch (this.currentStateLevel) {
            case 'sub':   return 0xffa726; // orange
            case 'super': return 0x9c27b0; // purple (layouts)
            case 'micro': return 0x66bb6a; // green
            case 'normal':
            default:      return 0x4dabf7; // blue
        }
    }

    getNodeMaterialForState(state, index = 0) {
        const baseHex = this.getNodeColorForLevel();
        const color = new THREE.Color(baseHex);
        // light HSL offset for variety between nodes
        const hOffset = ((index % 12) - 6) * 0.01;
        color.offsetHSL(hOffset, 0.03, 0.02);
        return new THREE.MeshPhongMaterial({ color });
    }

    // Helper to chunk states into groups of chunkSize (simple sequential grouping)
    groupStatesIntoChunks(statesArray, chunkSize) {
        const groups = [];
        for (let i = 0; i < statesArray.length; i += chunkSize) {
            groups.push(statesArray.slice(i, i + chunkSize));
        }
        return groups;
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new KlotskiPuzzle();
});
