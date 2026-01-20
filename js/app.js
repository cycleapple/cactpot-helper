/**
 * 仙人微彩 (Mini Cactpot) UI 應用程式
 */

class MiniCactpotApp {
    constructor() {
        this.solver = new MiniCactpotSolver();
        this.selectedCell = null;

        this.initElements();
        this.initEventListeners();
        this.render();
    }

    initElements() {
        this.modalEl = document.getElementById('modal');
        this.numberPickerEl = document.getElementById('numberPicker');
        this.hintEl = document.getElementById('hint');
        this.bestChoiceEl = document.getElementById('bestChoice');
        this.bestLineNameEl = document.getElementById('bestLineName');
        this.bestLineEVEl = document.getElementById('bestLineEV');
        this.resetBtn = document.getElementById('resetBtn');
        this.clearCellBtn = document.getElementById('clearCell');
        this.closeModalBtn = document.getElementById('closeModal');
        this.lineBtns = document.querySelectorAll('.line-btn');
        this.cells = document.querySelectorAll('.cell');
    }

    initEventListeners() {
        // Cell click
        this.cells.forEach(cell => {
            cell.addEventListener('click', () => {
                const index = parseInt(cell.dataset.index);
                this.openModal(index);
            });
        });

        this.resetBtn.addEventListener('click', () => this.reset());
        this.closeModalBtn.addEventListener('click', () => this.closeModal());
        this.clearCellBtn.addEventListener('click', () => {
            if (this.selectedCell !== null) {
                this.solver.setCell(this.selectedCell, null);
                this.closeModal();
                this.render();
            }
        });

        this.modalEl.addEventListener('click', (e) => {
            if (e.target === this.modalEl) this.closeModal();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });

        // Line button hover
        this.lineBtns.forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                this.highlightLine(btn.dataset.line);
            });
            btn.addEventListener('mouseleave', () => {
                this.clearLineHighlight();
                if (this.solver.getRevealedCount() >= 4) {
                    const expectations = this.solver.calculateAllExpectations();
                    this.highlightLine(expectations[0].key);
                }
            });
        });
    }

    renderGrid() {
        const count = this.solver.getRevealedCount();
        let suggestedIndices = [];

        if (count < 4) {
            if (count === 0) {
                // 預設推薦中間格子（涵蓋4條線）
                suggestedIndices = [4];
            } else {
                const scores = this.solver.calculateCellScores();
                const unrevealed = scores.filter(s => !s.revealed);
                if (unrevealed.length > 0) {
                    const bestScore = unrevealed[0].score;
                    suggestedIndices = unrevealed
                        .filter(s => s.score === bestScore)
                        .map(s => s.index);
                }
            }
        }

        this.cells.forEach(cell => {
            const i = parseInt(cell.dataset.index);
            const value = this.solver.getCell(i);

            cell.className = 'cell';
            cell.textContent = '';

            if (value !== null) {
                cell.textContent = value;
                cell.classList.add('revealed');
            } else if (suggestedIndices.includes(i)) {
                cell.classList.add('suggested');
            }
        });
    }

    renderNumberPicker() {
        this.numberPickerEl.innerHTML = '';
        const used = this.solver.getUsedNumbers();
        const current = this.solver.getCell(this.selectedCell);

        for (let i = 1; i <= 9; i++) {
            const btn = document.createElement('button');
            btn.className = 'number-btn';
            btn.textContent = i;

            if (used.includes(i) && i !== current) {
                btn.classList.add('used');
            } else {
                btn.addEventListener('click', () => this.selectNumber(i));
            }
            this.numberPickerEl.appendChild(btn);
        }
    }

    renderHint() {
        const count = this.solver.getRevealedCount();
        let step, text;

        if (count === 0) {
            step = 'Step 1';
            text = '建議先揭開中間格子';
        } else if (count < 4) {
            const scores = this.solver.calculateCellScores();
            const unrevealed = scores.filter(s => !s.revealed);
            if (unrevealed.length > 0) {
                const bestScore = unrevealed[0].score;
                const bestCells = unrevealed.filter(s => s.score === bestScore);
                step = 'Step 1';
                if (bestCells.length === 1) {
                    const row = Math.floor(bestCells[0].index / 3) + 1;
                    const col = (bestCells[0].index % 3) + 1;
                    text = `建議揭開閃爍格子 (第${row}列第${col}行)`;
                } else {
                    text = '建議揭開任一閃爍格子';
                }
            } else {
                step = 'Step 1';
                text = `已輸入 ${count}/4`;
            }
        } else {
            step = 'Step 2';
            text = '選擇金色標記的線';
        }

        this.hintEl.innerHTML = `<span class="hint-step">${step}</span><span class="hint-text">${text}</span>`;
    }

    renderLineButtons() {
        const count = this.solver.getRevealedCount();
        const exp = this.solver.calculateAllExpectations();
        const bestKey = exp[0]?.key;

        this.lineBtns.forEach(btn => {
            const key = btn.dataset.line;
            const data = exp.find(e => e.key === key);
            const label = btn.querySelector('.ev-label');

            btn.classList.remove('best');

            // Only show EV after 4 numbers entered
            if (count < 4) {
                label.textContent = '';
            } else if (data) {
                label.textContent = Math.round(data.expectedValue);
                if (key === bestKey) btn.classList.add('best');
            }
        });
    }

    renderBestChoice() {
        if (this.solver.getRevealedCount() < 4) {
            this.bestChoiceEl.classList.add('hidden');
            this.clearLineHighlight();
            return;
        }

        const exp = this.solver.calculateAllExpectations();
        const best = exp[0];

        this.bestChoiceEl.classList.remove('hidden');
        this.bestLineNameEl.textContent = best.name;
        this.bestLineEVEl.textContent = `期望值 ${best.expectedValue.toFixed(1)} MGP`;
        this.highlightLine(best.key);
    }

    render() {
        this.renderGrid();
        this.renderHint();
        this.renderLineButtons();
        this.renderBestChoice();
    }

    openModal(index) {
        this.selectedCell = index;
        this.renderNumberPicker();
        this.modalEl.classList.add('active');
    }

    closeModal() {
        this.modalEl.classList.remove('active');
        this.selectedCell = null;
    }

    selectNumber(num) {
        if (this.selectedCell !== null) {
            this.solver.setCell(this.selectedCell, num);
            this.closeModal();
            this.render();
        }
    }

    highlightLine(key) {
        const line = LINES[key];
        if (!line) return;
        this.clearLineHighlight();
        line.cells.forEach(i => this.cells[i].classList.add('highlighted'));
    }

    clearLineHighlight() {
        this.cells.forEach(c => c.classList.remove('highlighted'));
    }

    reset() {
        this.solver.reset();
        this.render();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new MiniCactpotApp();
});
