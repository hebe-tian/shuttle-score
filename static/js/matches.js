const ShuttleMatches = {
    MATCH_TYPES: {
        ms: { label: '男单', category: 'singles', gender: 'male' },
        ws: { label: '女单', category: 'singles', gender: 'female' },
        os: { label: '无限制单打', category: 'singles', gender: null },
        md: { label: '男双', category: 'doubles', gender: 'male' },
        wd: { label: '女双', category: 'doubles', gender: 'female' },
        xd: { label: '混双', category: 'doubles', gender: null },
        od: { label: '无限制双打', category: 'doubles', gender: null }
    },

    step: 1,
    matchType: '',
    selectedPlayers: [],
    scores: [{ team1_score: 0, team2_score: 0 }],
    allPlayers: [],

    async initRecord() {
        await this.loadPlayers();
        this.bindRecordEvents();
        this.renderStep();
    },

    initQuery() {
        this.bindQueryEvents();
        this.doQuery();
    },

    async loadPlayers() {
        const res = await ShuttleAPI.players.list('');
        if (res.ok) {
            this.allPlayers = res.data || [];
        }
    },

    bindRecordEvents() {
        document.querySelectorAll('.type-option').forEach(el => {
            el.addEventListener('click', () => {
                document.querySelectorAll('.type-option').forEach(o => o.classList.remove('selected'));
                el.classList.add('selected');
                this.matchType = el.dataset.type;
            });
        });

        document.getElementById('step-next')?.addEventListener('click', () => this.nextStep());
        document.getElementById('step-prev')?.addEventListener('click', () => this.prevStep());
        document.getElementById('step-submit')?.addEventListener('click', () => this.submitMatch());
        document.getElementById('add-game-btn')?.addEventListener('click', () => this.addGame());
    },

    bindQueryEvents() {
        document.getElementById('query-form')?.addEventListener('submit', (e) => this.handleQuery(e));
    },

    renderStep() {
        document.querySelectorAll('.step-item').forEach((el, i) => {
            el.classList.remove('active', 'done');
            if (i + 1 < this.step) el.classList.add('done');
            if (i + 1 === this.step) el.classList.add('active');
        });

        document.querySelectorAll('.step-content').forEach((el, i) => {
            el.style.display = (i + 1 === this.step) ? 'block' : 'none';
        });

        const nextBtn = document.getElementById('step-next');
        const prevBtn = document.getElementById('step-prev');
        const submitBtn = document.getElementById('step-submit');

        if (nextBtn) nextBtn.style.display = this.step < 4 ? 'inline-flex' : 'none';
        if (prevBtn) prevBtn.style.display = this.step > 1 ? 'inline-flex' : 'none';
        if (submitBtn) submitBtn.style.display = this.step === 4 ? 'inline-flex' : 'none';

        if (this.step === 2) this.renderPlayerSelection();
        if (this.step === 3) this.renderScoreInput();
        if (this.step === 4) this.renderConfirm();
    },

    nextStep() {
        if (this.step === 1 && !this.matchType) {
            ShuttleNav.showToast('请选择比赛类型', 'error');
            return;
        }
        if (this.step === 2) {
            this.collectPlayerIds();
            const info = this.MATCH_TYPES[this.matchType];
            const needed = info.category === 'singles' ? 2 : 4;
            if (this.selectedPlayers.length !== needed) {
                ShuttleNav.showToast(`该类型需要${needed}名选手`, 'error');
                return;
            }
        }
        if (this.step === 3) {
            let valid = true;
            this.scores.forEach(s => {
                if (s.team1_score < 0 || s.team2_score < 0) valid = false;
            });
            if (!valid) {
                ShuttleNav.showToast('比分不能为负数', 'error');
                return;
            }
        }
        this.step++;
        this.renderStep();
    },

    prevStep() {
        this.step--;
        this.renderStep();
    },

    getFilteredPlayers() {
        const info = this.MATCH_TYPES[this.matchType];
        let filtered = this.allPlayers;
        if (info.gender) {
            filtered = filtered.filter(p => p.gender === info.gender);
        }
        return filtered;
    },

    renderPlayerSelection() {
        const info = this.MATCH_TYPES[this.matchType];
        const isDoubles = info.category === 'doubles';
        const isXd = this.matchType === 'xd';
        const filteredPlayers = this.getFilteredPlayers();

        const team1Label = isDoubles ? '队伍1' : '选手1';
        const team2Label = isDoubles ? '队伍2' : '选手2';

        const selectIds = isDoubles
            ? ['player-t1p1', 'player-t1p2', 'player-t2p1', 'player-t2p2']
            : ['player-t1p1', 'player-t2p1'];

        let html = '';
        if (isXd) {
            html = `
                <div class="player-select-area">
                    <div>
                        <div class="team-label">${team1Label}</div>
                        <div class="form-group">
                            <select id="player-t1p1" class="form-select" data-slot="0" data-gender="male"><option value="">选择男选手</option></select>
                        </div>
                        <div class="form-group">
                            <select id="player-t1p2" class="form-select" data-slot="1" data-gender="female"><option value="">选择女选手</option></select>
                        </div>
                    </div>
                    <div>
                        <div class="team-label">${team2Label}</div>
                        <div class="form-group">
                            <select id="player-t2p1" class="form-select" data-slot="2" data-gender="male"><option value="">选择男选手</option></select>
                        </div>
                        <div class="form-group">
                            <select id="player-t2p2" class="form-select" data-slot="3" data-gender="female"><option value="">选择女选手</option></select>
                        </div>
                    </div>
                </div>
            `;
        } else if (isDoubles) {
            html = `
                <div class="player-select-area">
                    <div>
                        <div class="team-label">${team1Label}</div>
                        <div class="form-group">
                            <select id="player-t1p1" class="form-select" data-slot="0"><option value="">选择选手</option></select>
                        </div>
                        <div class="form-group">
                            <select id="player-t1p2" class="form-select" data-slot="1"><option value="">选择选手</option></select>
                        </div>
                    </div>
                    <div>
                        <div class="team-label">${team2Label}</div>
                        <div class="form-group">
                            <select id="player-t2p1" class="form-select" data-slot="2"><option value="">选择选手</option></select>
                        </div>
                        <div class="form-group">
                            <select id="player-t2p2" class="form-select" data-slot="3"><option value="">选择选手</option></select>
                        </div>
                    </div>
                </div>
            `;
        } else {
            html = `
                <div class="player-select-area">
                    <div>
                        <div class="team-label">${team1Label}</div>
                        <div class="form-group">
                            <select id="player-t1p1" class="form-select" data-slot="0"><option value="">选择选手</option></select>
                        </div>
                    </div>
                    <div>
                        <div class="team-label">${team2Label}</div>
                        <div class="form-group">
                            <select id="player-t2p1" class="form-select" data-slot="1"><option value="">选择选手</option></select>
                        </div>
                    </div>
                </div>
            `;
        }

        document.getElementById('player-select-area').innerHTML = html;

        this.updatePlayerOptions();

        selectIds.forEach(id => {
            const sel = document.getElementById(id);
            if (sel) {
                sel.addEventListener('change', () => this.updatePlayerOptions());
            }
        });
    },

    updatePlayerOptions() {
        const info = this.MATCH_TYPES[this.matchType];
        const isDoubles = info.category === 'doubles';
        const isXd = this.matchType === 'xd';
        const filteredPlayers = this.getFilteredPlayers();
        const selectIds = isDoubles
            ? ['player-t1p1', 'player-t1p2', 'player-t2p1', 'player-t2p2']
            : ['player-t1p1', 'player-t2p1'];

        const currentValues = {};
        selectIds.forEach(id => {
            const sel = document.getElementById(id);
            if (sel) currentValues[id] = sel.value;
        });

        selectIds.forEach(id => {
            const sel = document.getElementById(id);
            if (!sel) return;

            const currentValue = currentValues[id];
            const otherSelectedIds = selectIds
                .filter(otherId => otherId !== id && currentValues[otherId])
                .map(otherId => parseInt(currentValues[otherId]));

            let availablePlayers = filteredPlayers.filter(p => !otherSelectedIds.includes(p.id));

            if (isXd) {
                const slotGender = sel.dataset.gender;
                if (slotGender) {
                    availablePlayers = availablePlayers.filter(p => p.gender === slotGender);
                }
            }

            let optionsHtml = '<option value="">选择选手</option>';
            if (isXd && sel.dataset.gender) {
                optionsHtml = sel.dataset.gender === 'male'
                    ? '<option value="">选择男选手</option>'
                    : '<option value="">选择女选手</option>';
            }
            availablePlayers.forEach(p => {
                const selected = String(p.id) === currentValue ? ' selected' : '';
                optionsHtml += `<option value="${p.id}"${selected}>${p.name} (${p.gender === 'male' ? '男' : '女'})</option>`;
            });

            sel.innerHTML = optionsHtml;
        });
    },

    collectPlayerIds() {
        const info = this.MATCH_TYPES[this.matchType];
        const isDoubles = info.category === 'doubles';
        const ids = [];

        const t1p1 = document.getElementById('player-t1p1')?.value;
        if (t1p1) ids.push(parseInt(t1p1));

        if (isDoubles) {
            const t1p2 = document.getElementById('player-t1p2')?.value;
            if (t1p2) ids.push(parseInt(t1p2));
        }

        const t2p1 = document.getElementById('player-t2p1')?.value;
        if (t2p1) ids.push(parseInt(t2p1));

        if (isDoubles) {
            const t2p2 = document.getElementById('player-t2p2')?.value;
            if (t2p2) ids.push(parseInt(t2p2));
        }

        this.selectedPlayers = ids;
        return ids;
    },

    renderScoreInput() {
        this.collectPlayerIds();

        const container = document.getElementById('score-input-area');
        if (!container) return;

        let html = '';
        this.scores.forEach((s, i) => {
            html += `
                <div class="game-card">
                    <div class="game-card-label">第${i + 1}局</div>
                    <div class="score-row">
                        <input type="number" class="form-input score-input" id="score-t1-${i}" value="${s.team1_score}" min="0" max="99" data-idx="${i}" data-team="1">
                        <span class="score-separator">:</span>
                        <input type="number" class="form-input score-input" id="score-t2-${i}" value="${s.team2_score}" min="0" max="99" data-idx="${i}" data-team="2">
                        ${this.scores.length > 1 ? `<button class="btn btn-sm btn-danger" onclick="ShuttleMatches.removeGame(${i})">✕</button>` : ''}
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;

        container.querySelectorAll('input').forEach(inp => {
            inp.addEventListener('change', () => {
                const idx = parseInt(inp.dataset.idx);
                const team = parseInt(inp.dataset.team);
                const val = Math.max(0, parseInt(inp.value) || 0);
                inp.value = val;
                if (team === 1) this.scores[idx].team1_score = val;
                else this.scores[idx].team2_score = val;
            });
        });
    },

    addGame() {
        this.scores.push({ team1_score: 0, team2_score: 0 });
        this.renderScoreInput();
    },

    removeGame(idx) {
        this.scores.splice(idx, 1);
        this.renderScoreInput();
    },

    renderConfirm() {
        this.collectPlayerIds();
        const container = document.getElementById('confirm-area');
        if (!container) return;

        const info = this.MATCH_TYPES[this.matchType];
        const playerMap = {};
        this.allPlayers.forEach(p => playerMap[p.id] = p);

        const isDoubles = info.category === 'doubles';
        const team1Names = isDoubles
            ? [playerMap[this.selectedPlayers[0]]?.name, playerMap[this.selectedPlayers[1]]?.name].filter(Boolean).join(' & ')
            : playerMap[this.selectedPlayers[0]]?.name || '';
        const team2Names = isDoubles
            ? [playerMap[this.selectedPlayers[2]]?.name, playerMap[this.selectedPlayers[3]]?.name].filter(Boolean).join(' & ')
            : playerMap[this.selectedPlayers[1]]?.name || '';

        const scoreStr = this.scores.map((s, i) => `第${i + 1}局: ${s.team1_score} : ${s.team2_score}`).join('<br>');

        container.innerHTML = `
            <div class="card-flat">
                <div style="margin-bottom:12px;">
                    <span class="tag tag-${this.matchType}">${info.label}</span>
                </div>
                <div style="text-align:center;margin-bottom:12px;">
                    <div style="font-size:16px;font-weight:bold;color:var(--primary-darkest);">${team1Names} vs ${team2Names}</div>
                </div>
                <div style="text-align:center;font-family:var(--font-score);color:var(--primary-darker);">
                    ${scoreStr}
                </div>
                ${this.scores.length > 1 ? '<div style="text-align:center;font-size:12px;color:var(--text-muted);margin-top:8px;">每局比分将作为独立比赛记录保存</div>' : ''}
            </div>
        `;
    },

    async submitMatch() {
        this.collectPlayerIds();

        const data = {
            type: this.matchType,
            player_ids: this.selectedPlayers,
            scores: this.scores
        };

        const res = await ShuttleAPI.matches.create(data);
        if (res.ok) {
            const count = res.data?.count || 1;
            ShuttleNav.showToast(`比赛记录成功！共录入${count}条记录`);
            setTimeout(() => {
                window.location.href = '/pages/match-query.html';
            }, 1500);
        } else {
            ShuttleNav.showToast(res.msg || '记录失败', 'error');
        }
    },

    reset() {
        this.step = 1;
        this.matchType = '';
        this.selectedPlayers = [];
        this.scores = [{ team1_score: 0, team2_score: 0 }];
        document.querySelectorAll('.type-option').forEach(o => o.classList.remove('selected'));
        this.renderStep();
    },

    queryPage: 1,
    queryFilters: {},

    async handleQuery(e) {
        e.preventDefault();
        this.queryPage = 1;
        this.queryFilters = {};

        const type = document.getElementById('query-type')?.value;
        const memberName = document.getElementById('query-member')?.value.trim();
        const startDate = document.getElementById('query-start')?.value;
        const endDate = document.getElementById('query-end')?.value;

        if (type) this.queryFilters.type = type;
        if (memberName) this.queryFilters.member_name = memberName;
        if (startDate) this.queryFilters.start_time = Math.floor(new Date(startDate).getTime() / 1000);
        if (endDate) this.queryFilters.end_time = Math.floor(new Date(endDate + 'T23:59:59').getTime() / 1000);

        await this.doQuery();
    },

    async doQuery() {
        const data = {
            page: this.queryPage,
            page_size: 10,
            ...this.queryFilters
        };

        const res = await ShuttleAPI.matches.query(data);
        if (res.ok) {
            this.renderQueryResults(res.data);
        } else {
            ShuttleNav.showToast(res.msg || '查询失败', 'error');
        }
    },

    renderQueryResults(data) {
        const container = document.getElementById('query-results');
        if (!container) return;

        const items = data.items || [];
        if (items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon"></div>
                    <div class="empty-state-text">没有找到比赛记录</div>
                </div>
            `;
            document.getElementById('query-pagination').innerHTML = '';
            return;
        }

        container.innerHTML = items.map(m => ShuttleNav.renderMatchCard(m)).join('');
        this.renderPagination(data.total, data.page, data.page_size);
    },

    renderPagination(total, page, pageSize) {
        const container = document.getElementById('query-pagination');
        if (!container) return;

        const totalPages = Math.ceil(total / pageSize);
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = `<button ${page <= 1 ? 'disabled' : ''} onclick="ShuttleMatches.goPage(${page - 1})">上一页</button>`;
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="${i === page ? 'active' : ''}" onclick="ShuttleMatches.goPage(${i})">${i}</button>`;
        }
        html += `<button ${page >= totalPages ? 'disabled' : ''} onclick="ShuttleMatches.goPage(${page + 1})">下一页</button>`;
        container.innerHTML = html;
    },

    goPage(page) {
        this.queryPage = page;
        this.doQuery();
    }
};
