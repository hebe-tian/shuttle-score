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

        this.renderStepSummary();

        if (this.step === 2) this.renderPlayerSelection();
        if (this.step === 3) this.renderScoreInput();
        if (this.step === 4) this.renderConfirm();
    },

    renderStepSummary() {
        const container = document.getElementById('step-summary');
        if (!container) return;

        if (this.step === 1) {
            container.style.display = 'none';
            return;
        }

        let items = [];

        // 步骤1：比赛类型
        if (this.matchType) {
            const info = this.MATCH_TYPES[this.matchType];
            items.push(`<span class="tag tag-${this.matchType}">${info.label}</span>`);
        }

        // 步骤2：选手
        if (this.step >= 3 && this.selectedPlayers.length > 0) {
            const playerMap = {};
            this.allPlayers.forEach(p => playerMap[p.id] = p);
            const info = this.MATCH_TYPES[this.matchType];
            const isDoubles = info.category === 'doubles';
            const team1Names = isDoubles
                ? [playerMap[this.selectedPlayers[0]]?.name, playerMap[this.selectedPlayers[1]]?.name].filter(Boolean).join(' & ')
                : playerMap[this.selectedPlayers[0]]?.name || '';
            const team2Names = isDoubles
                ? [playerMap[this.selectedPlayers[2]]?.name, playerMap[this.selectedPlayers[3]]?.name].filter(Boolean).join(' & ')
                : playerMap[this.selectedPlayers[1]]?.name || '';
            items.push(`<span style="font-size:13px;color:var(--primary-darker);">${team1Names} vs ${team2Names}</span>`);
        }

        // 步骤3：比分
        if (this.step >= 4 && this.scores.length > 0) {
            const scoreStr = this.scores.map(s => `${s.team1_score}:${s.team2_score}`).join(' / ');
            items.push(`<span style="font-family:var(--font-score);font-size:14px;color:var(--primary-darker);">${scoreStr}</span>`);
        }

        if (items.length > 0) {
            container.innerHTML = items.join('<span style="margin:0 8px;color:var(--border);">|</span>');
            container.style.display = 'flex';
        } else {
            container.style.display = 'none';
        }
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

        container.innerHTML = items.map(m => ShuttleNav.renderMatchCard(m, true, { showActions: true })).join('');
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
    },

    // 编辑/删除功能
    editMatchData: null,

    async openEditModal(matchId) {
        const res = await ShuttleAPI.matches.get(matchId);
        if (!res.ok) {
            ShuttleNav.showToast(res.msg || '获取比赛详情失败', 'error');
            return;
        }

        this.editMatchData = res.data;
        await this.loadPlayers();

        const match = this.editMatchData;
        const modal = document.getElementById('edit-modal');
        if (!modal) return;

        // 渲染编辑表单
        const typeOptions = Object.entries(this.MATCH_TYPES).map(([key, val]) =>
            `<div class="type-option ${match.type === key ? 'selected' : ''}" data-type="${key}" onclick="ShuttleMatches.editSelectType('${key}')">${val.label}</div>`
        ).join('');

        modal.innerHTML = `
            <div class="modal">
                <div class="modal-title">编辑比赛</div>
                <div class="form-group">
                    <label class="form-label">比赛时间（不可修改）</label>
                    <div style="font-size:14px;color:var(--text-secondary);padding:8px 0;">${ShuttleNav.formatTime(match.match_time)}</div>
                </div>
                <div class="form-group">
                    <label class="form-label">比赛类型</label>
                    <div class="type-grid" id="edit-type-grid">${typeOptions}</div>
                </div>
                <div class="form-group">
                    <label class="form-label">选手</label>
                    <div id="edit-player-area"></div>
                </div>
                <div class="form-group">
                    <label class="form-label">比分</label>
                    <div id="edit-score-area"></div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-outline" onclick="ShuttleMatches.closeEditModal()">取消</button>
                    <button class="btn btn-primary" onclick="ShuttleMatches.submitEdit()">保存</button>
                </div>
            </div>
        `;

        modal.classList.add('active');

        // 初始化编辑状态
        this.editType = match.type;
        this.editScores = (match.scores || []).map(s => ({ team1_score: s.team1_score, team2_score: s.team2_score }));
        if (this.editScores.length === 0) this.editScores = [{ team1_score: 0, team2_score: 0 }];

        this.renderEditPlayers();
        this.renderEditScores();
    },

    editType: '',
    editScores: [],

    editSelectType(type) {
        this.editType = type;
        document.querySelectorAll('#edit-type-grid .type-option').forEach(el => {
            el.classList.toggle('selected', el.dataset.type === type);
        });
        this.renderEditPlayers();
    },

    renderEditPlayers() {
        const area = document.getElementById('edit-player-area');
        if (!area) return;

        const info = this.MATCH_TYPES[this.editType];
        const isDoubles = info.category === 'doubles';
        const isXd = this.editType === 'xd';
        const match = this.editMatchData;

        const currentPlayers = match.players || [];
        const team1Players = currentPlayers.filter(p => p.team === 1);
        const team2Players = currentPlayers.filter(p => p.team === 2);

        const selectIds = isDoubles
            ? ['edit-t1p1', 'edit-t1p2', 'edit-t2p1', 'edit-t2p2']
            : ['edit-t1p1', 'edit-t2p1'];

        const placeholder = (gender) => {
            if (isXd && gender === 'male') return '选择男选手';
            if (isXd && gender === 'female') return '选择女选手';
            return '选择选手';
        };

        const t1p1Gender = isXd ? 'male' : null;
        const t1p2Gender = isXd ? 'female' : null;
        const t2p1Gender = isXd ? 'male' : null;
        const t2p2Gender = isXd ? 'female' : null;

        let html = '<div class="player-select-area">';

        // Team 1
        html += '<div><div class="team-label">队伍1</div>';
        html += `<div class="form-group"><select id="edit-t1p1" class="form-select" data-gender="${t1p1Gender || ''}"><option value="">${placeholder(t1p1Gender)}</option></select></div>`;
        if (isDoubles) {
            html += `<div class="form-group"><select id="edit-t1p2" class="form-select" data-gender="${t1p2Gender || ''}"><option value="">${placeholder(t1p2Gender)}</option></select></div>`;
        }

        // Team 2
        html += '</div><div><div class="team-label">队伍2</div>';
        html += `<div class="form-group"><select id="edit-t2p1" class="form-select" data-gender="${t2p1Gender || ''}"><option value="">${placeholder(t2p1Gender)}</option></select></div>`;
        if (isDoubles) {
            html += `<div class="form-group"><select id="edit-t2p2" class="form-select" data-gender="${t2p2Gender || ''}"><option value="">${placeholder(t2p2Gender)}</option></select></div>`;
        }
        html += '</div></div>';

        area.innerHTML = html;

        // 设置初始值
        const initialValues = {};
        if (team1Players[0]) initialValues['edit-t1p1'] = team1Players[0].player_id;
        if (isDoubles && team1Players[1]) initialValues['edit-t1p2'] = team1Players[1].player_id;
        if (team2Players[0]) initialValues['edit-t2p1'] = team2Players[0].player_id;
        if (isDoubles && team2Players[1]) initialValues['edit-t2p2'] = team2Players[1].player_id;

        // 临时设置值以便 updateEditPlayerOptions 能读取
        selectIds.forEach(id => {
            const sel = document.getElementById(id);
            if (sel && initialValues[id]) sel.value = initialValues[id];
        });

        this.updateEditPlayerOptions(initialValues);

        selectIds.forEach(id => {
            const sel = document.getElementById(id);
            if (sel) {
                sel.addEventListener('change', () => this.updateEditPlayerOptions());
            }
        });
    },

    updateEditPlayerOptions(initialValues) {
        const info = this.MATCH_TYPES[this.editType];
        const isDoubles = info.category === 'doubles';
        const isXd = this.editType === 'xd';

        let filteredPlayers = this.allPlayers;
        if (info.gender) {
            filteredPlayers = filteredPlayers.filter(p => p.gender === info.gender);
        }

        const selectIds = isDoubles
            ? ['edit-t1p1', 'edit-t1p2', 'edit-t2p1', 'edit-t2p2']
            : ['edit-t1p1', 'edit-t2p1'];

        // 读取当前各 select 的值
        const currentValues = {};
        selectIds.forEach(id => {
            const sel = document.getElementById(id);
            if (sel) currentValues[id] = sel.value;
        });

        // 如果是初始化，用 initialValues 覆盖
        if (initialValues) {
            Object.assign(currentValues, initialValues);
        }

        const placeholder = (gender) => {
            if (isXd && gender === 'male') return '选择男选手';
            if (isXd && gender === 'female') return '选择女选手';
            return '选择选手';
        };

        selectIds.forEach(id => {
            const sel = document.getElementById(id);
            if (!sel) return;

            const currentValue = String(currentValues[id] || '');
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

            let optionsHtml = `<option value="">${placeholder(sel.dataset.gender || null)}</option>`;
            availablePlayers.forEach(p => {
                const selected = String(p.id) === currentValue ? ' selected' : '';
                optionsHtml += `<option value="${p.id}"${selected}>${p.name} (${p.gender === 'male' ? '男' : '女'})</option>`;
            });

            sel.innerHTML = optionsHtml;
        });
    },

    renderEditScores() {
        const area = document.getElementById('edit-score-area');
        if (!area) return;

        let html = '';
        this.editScores.forEach((s, i) => {
            html += `
                <div class="game-card">
                    <div class="game-card-label">第${i + 1}局</div>
                    <div class="score-row">
                        <input type="number" class="form-input score-input" id="edit-score-t1-${i}" value="${s.team1_score}" min="0" max="99" data-idx="${i}" data-team="1">
                        <span class="score-separator">:</span>
                        <input type="number" class="form-input score-input" id="edit-score-t2-${i}" value="${s.team2_score}" min="0" max="99" data-idx="${i}" data-team="2">
                    </div>
                </div>
            `;
        });
        area.innerHTML = html;

        area.querySelectorAll('input').forEach(inp => {
            inp.addEventListener('change', () => {
                const idx = parseInt(inp.dataset.idx);
                const team = parseInt(inp.dataset.team);
                const val = Math.max(0, parseInt(inp.value) || 0);
                inp.value = val;
                if (team === 1) this.editScores[idx].team1_score = val;
                else this.editScores[idx].team2_score = val;
            });
        });
    },

    collectEditPlayerIds() {
        const info = this.MATCH_TYPES[this.editType];
        const isDoubles = info.category === 'doubles';
        const ids = [];

        const t1p1 = document.getElementById('edit-t1p1')?.value;
        if (t1p1) ids.push(parseInt(t1p1));
        if (isDoubles) {
            const t1p2 = document.getElementById('edit-t1p2')?.value;
            if (t1p2) ids.push(parseInt(t1p2));
        }
        const t2p1 = document.getElementById('edit-t2p1')?.value;
        if (t2p1) ids.push(parseInt(t2p1));
        if (isDoubles) {
            const t2p2 = document.getElementById('edit-t2p2')?.value;
            if (t2p2) ids.push(parseInt(t2p2));
        }
        return ids;
    },

    async submitEdit() {
        const playerIds = this.collectEditPlayerIds();
        const info = this.MATCH_TYPES[this.editType];
        const needed = info.category === 'singles' ? 2 : 4;

        if (playerIds.length !== needed) {
            ShuttleNav.showToast(`该类型需要${needed}名选手`, 'error');
            return;
        }

        if (this.editScores.some(s => s.team1_score < 0 || s.team2_score < 0)) {
            ShuttleNav.showToast('比分不能为负数', 'error');
            return;
        }

        const data = {
            match_id: this.editMatchData.id,
            type: this.editType,
            player_ids: playerIds,
            scores: this.editScores
        };

        const res = await ShuttleAPI.matches.update(data);
        if (res.ok) {
            ShuttleNav.showToast('比赛已更新');
            this.closeEditModal();
            this.doQuery();
        } else {
            ShuttleNav.showToast(res.msg || '更新失败', 'error');
        }
    },

    closeEditModal() {
        const modal = document.getElementById('edit-modal');
        if (modal) modal.classList.remove('active');
        this.editMatchData = null;
    },

    async confirmDelete(matchId) {
        if (!confirm('确定要删除该比赛记录吗？删除后不可恢复。')) return;

        const res = await ShuttleAPI.matches.delete(matchId);
        if (res.ok) {
            ShuttleNav.showToast('比赛记录已删除');
            this.doQuery();
        } else {
            ShuttleNav.showToast(res.msg || '删除失败', 'error');
        }
    }
};
