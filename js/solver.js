/**
 * 仙人微彩 (Mini Cactpot) 計算引擎
 */

class MiniCactpotSolver {
    constructor() {
        this.grid = new Array(9).fill(null);
    }

    /**
     * 設定格子的數字
     * @param {number} index - 格子索引 (0-8)
     * @param {number|null} value - 數字 (1-9) 或 null
     */
    setCell(index, value) {
        this.grid[index] = value;
    }

    /**
     * 取得格子的數字
     * @param {number} index - 格子索引 (0-8)
     * @returns {number|null}
     */
    getCell(index) {
        return this.grid[index];
    }

    /**
     * 重置所有格子
     */
    reset() {
        this.grid.fill(null);
    }

    /**
     * 取得已使用的數字
     * @returns {number[]}
     */
    getUsedNumbers() {
        return this.grid.filter(n => n !== null);
    }

    /**
     * 取得可用的數字
     * @returns {number[]}
     */
    getAvailableNumbers() {
        const used = this.getUsedNumbers();
        return ALL_NUMBERS.filter(n => !used.includes(n));
    }

    /**
     * 取得已揭開的格子數量
     * @returns {number}
     */
    getRevealedCount() {
        return this.grid.filter(n => n !== null).length;
    }

    /**
     * 生成所有可能的排列
     * @param {number[]} arr - 要排列的數字陣列
     * @returns {number[][]}
     */
    permutations(arr) {
        if (arr.length <= 1) return [arr];
        const result = [];
        for (let i = 0; i < arr.length; i++) {
            const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
            for (const perm of this.permutations(rest)) {
                result.push([arr[i], ...perm]);
            }
        }
        return result;
    }

    /**
     * 計算一條線的期望值
     * @param {string} lineKey - 線的 key (如 'row0', 'diag1')
     * @returns {object} { expectedValue, knownSum, unknownCount, cellValues }
     */
    calculateLineExpectation(lineKey) {
        const line = LINES[lineKey];
        const cellIndices = line.cells;

        // 取得這條線上的數值
        const values = cellIndices.map(i => this.grid[i]);
        const knownValues = values.filter(v => v !== null);
        const unknownCount = values.filter(v => v === null).length;
        const knownSum = knownValues.reduce((a, b) => a + b, 0);

        // 如果三格都已知，直接計算
        if (unknownCount === 0) {
            const sum = knownSum;
            const mgp = MGP_REWARDS[sum] || 0;
            return {
                expectedValue: mgp,
                knownSum,
                unknownCount,
                cellValues: values,
                isComplete: true
            };
        }

        // 取得可用的數字
        const available = this.getAvailableNumbers();

        // 計算所有可能的總和及其 MGP
        let totalMgp = 0;
        let count = 0;

        if (unknownCount === 1) {
            // 只有一個未知數，直接遍歷
            for (const num of available) {
                const sum = knownSum + num;
                totalMgp += MGP_REWARDS[sum] || 0;
                count++;
            }
        } else if (unknownCount === 2) {
            // 兩個未知數，遍歷所有兩數組合
            for (let i = 0; i < available.length; i++) {
                for (let j = 0; j < available.length; j++) {
                    if (i !== j) {
                        const sum = knownSum + available[i] + available[j];
                        totalMgp += MGP_REWARDS[sum] || 0;
                        count++;
                    }
                }
            }
        } else {
            // 三個未知數，遍歷所有三數排列
            for (let i = 0; i < available.length; i++) {
                for (let j = 0; j < available.length; j++) {
                    if (i === j) continue;
                    for (let k = 0; k < available.length; k++) {
                        if (k === i || k === j) continue;
                        const sum = available[i] + available[j] + available[k];
                        totalMgp += MGP_REWARDS[sum] || 0;
                        count++;
                    }
                }
            }
        }

        const expectedValue = count > 0 ? totalMgp / count : 0;

        return {
            expectedValue,
            knownSum,
            unknownCount,
            cellValues: values,
            isComplete: false
        };
    }

    /**
     * 計算所有線的期望值
     * @returns {object[]} 按期望值排序的線資訊陣列
     */
    calculateAllExpectations() {
        const results = [];

        for (const [key, line] of Object.entries(LINES)) {
            const expectation = this.calculateLineExpectation(key);
            results.push({
                key,
                name: line.name,
                cells: line.cells,
                ...expectation
            });
        }

        // 按期望值降序排序
        results.sort((a, b) => b.expectedValue - a.expectedValue);

        return results;
    }

    /**
     * 計算揭開某格對整體期望值的貢獻度
     * 用於建議下一步揭開哪格
     * @returns {object[]} 各格的評分
     */
    calculateCellScores() {
        const scores = [];
        const available = this.getAvailableNumbers();

        for (let i = 0; i < 9; i++) {
            if (this.grid[i] !== null) {
                scores.push({ index: i, score: -1, revealed: true });
                continue;
            }

            // 計算這格對各線的影響
            let totalImprovement = 0;
            let lineCount = 0;

            // 找出包含這格的所有線
            for (const [key, line] of Object.entries(LINES)) {
                if (!line.cells.includes(i)) continue;
                lineCount++;

                // 模擬揭開這格後的期望值變化
                const currentEV = this.calculateLineExpectation(key).expectedValue;

                // 計算如果揭開這格，平均期望值會是多少
                let sumEV = 0;
                for (const num of available) {
                    this.grid[i] = num;
                    sumEV += this.calculateLineExpectation(key).expectedValue;
                }
                this.grid[i] = null;

                const avgEVAfter = sumEV / available.length;

                // 資訊增益（揭開後期望值的標準差越大，資訊量越高）
                let variance = 0;
                for (const num of available) {
                    this.grid[i] = num;
                    const ev = this.calculateLineExpectation(key).expectedValue;
                    variance += Math.pow(ev - avgEVAfter, 2);
                }
                this.grid[i] = null;

                const stdDev = Math.sqrt(variance / available.length);
                totalImprovement += stdDev;
            }

            scores.push({
                index: i,
                score: totalImprovement / lineCount,
                revealed: false
            });
        }

        // 按分數降序排序
        scores.sort((a, b) => b.score - a.score);

        return scores;
    }

    /**
     * 取得策略建議
     * @returns {string}
     */
    getSuggestion() {
        const revealedCount = this.getRevealedCount();

        if (revealedCount === 0) {
            return '遊戲開始時會揭開一格。點擊格子輸入看到的數字。';
        }

        if (revealedCount < 4) {
            const scores = this.calculateCellScores();
            const bestCell = scores.find(s => !s.revealed);
            if (bestCell) {
                const row = Math.floor(bestCell.index / 3) + 1;
                const col = (bestCell.index % 3) + 1;
                return `建議揭開第 ${row} 列第 ${col} 行的格子，可獲得最多資訊。`;
            }
            return `還可以揭開 ${4 - revealedCount} 格。`;
        }

        const expectations = this.calculateAllExpectations();
        const best = expectations[0];
        return `已揭開 4 格。建議選擇「${best.name}」，期望值 ${best.expectedValue.toFixed(1)} MGP。`;
    }
}
