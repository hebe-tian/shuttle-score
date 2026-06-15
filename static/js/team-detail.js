const ShuttleTeamDetail = {
    MATCH_TYPES: {
        ms: { label: '男单', category: 'singles', gender: 'male' },
        ws: { label: '女单', category: 'singles', gender: 'female' },
        os: { label: '无限制单打', category: 'singles', gender: null },
        md: { label: '男双', category: 'doubles', gender: 'male' },
        wd: { label: '女双', category: 'doubles', gender: 'female' },
        xd: { label: '混双', category: 'doubles', gender: null },
        od: { label: '无限制双打', category: 'doubles', gender: null },
        fs: { label: '无限制比赛(单打场)', category: 'singles', gender: null },
        fd: { label: '无限制比赛(双打场)', category: 'doubles', gender: null }
    },

    teamId: null,
    teamData: null,
    teamPlayers: [],
    currentTab: 'players',

    // Match recording state
    step: 1,
    matchType: '',
    selectedPlayers: [],
    scores: [{ team1_score: 0, team2_score: 0 }],
    unlimitedPlayers: { team1: [], team2: [] },
    recordOpen: false,

    // Match query state
    matchPage: 1,

    // Stats state
    statsFilters: {
        teamWinRate: { type: 'all', include_unlimited: true, time_range: 'all' },
        opponentWinRate: { type: 'all', include_unlimited: true, time_range: 'all' },
        partnerWinRate: { type: 'all', include_unlimited: true, time_range: 'all' }
    },
    charts: {
        teamWinRate: null,
        opponentWinRate: null,
        partnerWinRate: null
    },

    isUnlimitedType(type) {
        return type === 'fs' || type === 'fd';
    },

    // ===== Core =====

    async init() {
        this.teamId = new URLSearchParams(window.location.search).get('id');
        if (!this.teamId) {
            ShuttleNav.showToast('缺少团队ID', 'error');
            return;
        }
        await this.loadTeamDetail();
        this.bindEvents();
    },

    async loadTeamDetail() {
        const res = await ShuttleAPI.teams.get(this.teamId);
        if (!res.ok) {
            ShuttleNav.showToast(res.msg || '获取团队信息失败', 'error');
            return;
        }
        this.teamData = res.data;
        this.teamPlayers = res.data.players || [];
        this.renderHeader();
        this.renderPlayers();
    },

    renderHeader() {
        const team = this.teamData;
        const user = ShuttleAuth.getUser();
        const isCreator = user && team.creator_id === user.id;

        const members = team.members || [];
        const memberTags = members.map(m => {
            const isTeamCreator = m.user_id === team.creator_id;
            return `<span class="member-tag ${isTeamCreator ? 'is-creator' : ''}">${m.username || '用户' + m.user_id}${isTeamCreator ? ' (创建者)' : ''}</span>`;
        }).join('');

        const inviteCodeHtml = `
            <div class="invite-code-row">
                <span class="invite-code-label">邀请码</span>
                <div class="invite-code-box">
                    <span class="invite-code-value">${team.invite_code || ''}</span>
                    <span class="invite-code-divider"></span>
                    <button class="invite-code-btn" onclick="ShuttleTeamDetail.copyInviteCode()" title="复制邀请码">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        复制
                    </button>
                    ${isCreator ? `<span class="invite-code-divider"></span><button class="invite-code-btn" onclick="ShuttleTeamDetail.refreshInviteCode()" title="刷新邀请码">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
                        刷新
                    </button>` : ''}
                </div>
            </div>
        `;

        document.getElementById('team-header').innerHTML = `
            <div class="team-name">${team.name}</div>
            ${inviteCodeHtml}
            <div class="invite-code-row">
                <span class="invite-code-label">成员</span>
                <div class="member-list">${memberTags}</div>
            </div>
        `;

        const leaveArea = document.getElementById('leave-team-area');
        if (leaveArea) {
            leaveArea.style.display = isCreator ? 'none' : 'block';
        }
    },

    switchTab(tabName) {
        this.currentTab = tabName;
        document.querySelectorAll('.sub-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        document.querySelectorAll('.tab-content').forEach(el => {
            el.classList.toggle('active', el.id === 'tab-' + tabName);
        });

        if (tabName === 'matches') {
            this.renderMatches();
        } else if (tabName === 'stats') {
            this.renderStats();
        }
    },

    // ===== Players Tab =====

    renderPlayers() {
        const container = document.getElementById('player-list');
        if (!container) return;

        if (this.teamPlayers.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-text">暂无选手</div></div>';
            return;
        }

        container.innerHTML = this.teamPlayers.map(p => {
            const genderLabel = p.gender === 'male' ? '男' : '女';
            const nameClass = p.user_id ? 'player-item-name bound' : 'player-item-name';
            return `
                <div class="player-item">
                    <div class="player-item-info">
                        <span class="${nameClass}">${p.name}</span>
                        <span class="player-item-gender">${genderLabel}</span>
                    </div>
                </div>
            `;
        }).join('');
    },

    openAddPlayerModal() {
        document.getElementById('add-player-modal').classList.add('active');
        document.getElementById('add-player-name').value = '';
        document.getElementById('add-player-gender').value = '';
    },

    closeAddPlayerModal() {
        document.getElementById('add-player-modal').classList.remove('active');
    },

    async submitAddPlayer() {
        const name = document.getElementById('add-player-name').value.trim();
        const gender = document.getElementById('add-player-gender').value;

        if (!name) {
            ShuttleNav.showToast('请输入选手名称', 'error');
            return;
        }
        if (!gender) {
            ShuttleNav.showToast('请选择性别', 'error');
            return;
        }

        const res = await ShuttleAPI.teams.addPlayer(this.teamId, name, gender);
        if (res.ok) {
            ShuttleNav.showToast('选手添加成功');
            this.closeAddPlayerModal();
            await this.loadTeamDetail();
        } else {
            ShuttleNav.showToast(res.msg || '添加失败', 'error');
        }
    },

    // ===== Invite Code =====

    copyInviteCode() {
        const code = this.teamData?.invite_code;
        if (!code) return;
        navigator.clipboard.writeText(code).then(() => {
            ShuttleNav.showToast('邀请码已复制');
        }).catch(() => {
            ShuttleNav.showToast('复制失败', 'error');
        });
    },

    async refreshInviteCode() {
        const res = await ShuttleAPI.teams.refreshInviteCode(this.teamId);
        if (res.ok) {
            this.teamData.invite_code = res.data.invite_code;
            this.renderHeader();
            ShuttleNav.showToast('邀请码已刷新');
        } else {
            ShuttleNav.showToast(res.msg || '刷新失败', 'error');
        }
    },

    // ===== Leave Team =====

    async leaveTeam() {
        if (!confirm('确定要退出该团队吗？')) return;
        const res = await ShuttleAPI.teams.leave(this.teamId);
        if (res.ok) {
            ShuttleNav.showToast('已退出团队');
            setTimeout(() => {
                window.location.href = '/pages/myhomepage.html';
            }, 1500);
        } else {
            ShuttleNav.showToast(res.msg || '退出失败', 'error');
        }
    },

    // ===== Matches Tab =====

    toggleRecordSection() {
        this.recordOpen = !this.recordOpen;
        const body = document.getElementById('record-body');
        const icon = document.getElementById('record-toggle-icon');
        if (this.recordOpen) {
            body.style.display = 'block';
            icon.style.transform = 'rotate(180deg)';
            this.renderRecordStep();
        } else {
            body.style.display = 'none';
            icon.style.transform = 'rotate(0deg)';
        }
    },

    async renderMatches() {
        this.matchPage = 1;
        await this.doMatchQuery();
    },

    async doMatchQuery() {
        const data = {
            page: this.matchPage,
            page_size: 10,
            team_id: parseInt(this.teamId)
        };

        const res = await ShuttleAPI.matches.query(data);
        if (res.ok) {
            this.renderMatchResults(res.data);
        } else {
            ShuttleNav.showToast(res.msg || '查询失败', 'error');
        }
    },

    renderMatchResults(data) {
        const container = document.getElementById('match-list');
        if (!container) return;

        const items = data.items || [];
        if (items.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-text">暂无比赛记录</div></div>';
            document.getElementById('match-pagination').innerHTML = '';
            return;
        }

        container.innerHTML = items.map(m => ShuttleNav.renderMatchCard(m, true, { showActions: true })).join('');
        this.renderMatchPagination(data.total, data.page, data.page_size);
    },

    renderMatchPagination(total, page, pageSize) {
        const container = document.getElementById('match-pagination');
        if (!container) return;

        const totalPages = Math.ceil(total / pageSize);
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = `<button ${page <= 1 ? 'disabled' : ''} onclick="ShuttleTeamDetail.goMatchPage(${page - 1})">上一页</button>`;
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="${i === page ? 'active' : ''}" onclick="ShuttleTeamDetail.goMatchPage(${i})">${i}</button>`;
        }
        html += `<button ${page >= totalPages ? 'disabled' : ''} onclick="ShuttleTeamDetail.goMatchPage(${page + 1})">下一页</button>`;
        container.innerHTML = html;
    },

    goMatchPage(page) {
        this.matchPage = page;
        this.doMatchQuery();
    },

    // ===== Match Recording (inline) =====

    bindEvents() {
        // Add player form
        document.getElementById('add-player-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitAddPlayer();
        });

        // Match recording
        document.querySelectorAll('#record-body .type-option').forEach(el => {
            el.addEventListener('click', () => {
                document.querySelectorAll('#record-body .type-option').forEach(o => o.classList.remove('selected'));
                el.classList.add('selected');
                this.matchType = el.dataset.type;
                this.unlimitedPlayers = { team1: [], team2: [] };
            });
        });

        document.getElementById('step-next')?.addEventListener('click', () => this.nextStep());
        document.getElementById('step-prev')?.addEventListener('click', () => this.prevStep());
        document.getElementById('step-submit')?.addEventListener('click', () => this.submitMatch());
        document.getElementById('add-game-btn')?.addEventListener('click', () => this.addGame());
    },

    nextStep() {
        if (this.step === 1 && !this.matchType) {
            ShuttleNav.showToast('请选择比赛类型', 'error');
            return;
        }
        if (this.step === 2) {
            if (this.isUnlimitedType(this.matchType)) {
                this.collectUnlimitedPlayerIds();
                if (this.unlimitedPlayers.team1.length < 1 || this.unlimitedPlayers.team2.length < 1) {
                    ShuttleNav.showToast('每队至少需要1名选手', 'error');
                    return;
                }
            } else {
                this.collectPlayerIds();
                const info = this.MATCH_TYPES[this.matchType];
                const needed = info.category === 'singles' ? 2 : 4;
                if (this.selectedPlayers.length !== needed) {
                    ShuttleNav.showToast(`该类型需要${needed}名选手`, 'error');
                    return;
                }
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
        this.renderRecordStep();
    },

    prevStep() {
        this.step--;
        this.renderRecordStep();
    },

    renderRecordStep() {
        const body = document.getElementById('record-body');
        body.querySelectorAll('.step-item').forEach((el, i) => {
            el.classList.remove('active', 'done');
            if (i + 1 < this.step) el.classList.add('done');
            if (i + 1 === this.step) el.classList.add('active');
        });

        body.querySelectorAll('.step-content').forEach((el, i) => {
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

        if (this.matchType) {
            const info = this.MATCH_TYPES[this.matchType];
            items.push(`<span class="tag tag-${this.matchType}">${info.label}</span>`);
        }

        if (this.step >= 3 && this.isUnlimitedType(this.matchType)) {
            const playerMap = {};
            this.teamPlayers.forEach(p => playerMap[p.id] = p);
            const team1Names = this.unlimitedPlayers.team1.map(id => playerMap[id]?.name).filter(Boolean).join(' & ');
            const team2Names = this.unlimitedPlayers.team2.map(id => playerMap[id]?.name).filter(Boolean).join(' & ');
            if (team1Names || team2Names) {
                items.push(`<span style="font-size:13px;color:var(--text-secondary);">${team1Names} vs ${team2Names}</span>`);
            }
        } else if (this.step >= 3 && this.selectedPlayers.length > 0) {
            const playerMap = {};
            this.teamPlayers.forEach(p => playerMap[p.id] = p);
            const info = this.MATCH_TYPES[this.matchType];
            const isDoubles = info.category === 'doubles';
            const team1Names = isDoubles
                ? [playerMap[this.selectedPlayers[0]]?.name, playerMap[this.selectedPlayers[1]]?.name].filter(Boolean).join(' & ')
                : playerMap[this.selectedPlayers[0]]?.name || '';
            const team2Names = isDoubles
                ? [playerMap[this.selectedPlayers[2]]?.name, playerMap[this.selectedPlayers[3]]?.name].filter(Boolean).join(' & ')
                : playerMap[this.selectedPlayers[1]]?.name || '';
            items.push(`<span style="font-size:13px;color:var(--text-secondary);">${team1Names} vs ${team2Names}</span>`);
        }

        if (this.step >= 4 && this.scores.length > 0) {
            const scoreStr = this.scores.map(s => `${s.team1_score}:${s.team2_score}`).join(' / ');
            items.push(`<span style="font-family:var(--font-score);font-size:14px;color:var(--text-primary);">${scoreStr}</span>`);
        }

        if (items.length > 0) {
            container.innerHTML = items.join('<span style="margin:0 8px;color:var(--border);">|</span>');
            container.style.display = 'flex';
        } else {
            container.style.display = 'none';
        }
    },

    getFilteredPlayers() {
        const info = this.MATCH_TYPES[this.matchType];
        let filtered = this.teamPlayers;
        if (info.gender) {
            filtered = filtered.filter(p => p.gender === info.gender);
        }
        return filtered;
    },

    // Unlimited player selection
    renderUnlimitedPlayerSelection() {
        const area = document.getElementById('player-select-area');
        if (!area) return;

        this.collectUnlimitedPlayerIds();

        const allPlayers = this.teamPlayers;

        const renderTeam = (teamKey, label) => {
            const playerIds = this.unlimitedPlayers[teamKey];
            let html = `<div><div class="team-label">${label}</div>`;
            playerIds.forEach((pid, idx) => {
                html += `<div class="form-group" style="display:flex;gap:6px;align-items:center;">
                    <select class="form-select unlimited-player-select" data-team="${teamKey}" data-idx="${idx}" style="flex:1;">
                        <option value="">选择选手</option>
                    </select>
                    ${playerIds.length > 1 ? `<button type="button" class="btn btn-sm btn-danger unlimited-remove-btn" data-team="${teamKey}" data-idx="${idx}" style="padding:4px 8px;">✕</button>` : ''}
                </div>`;
            });
            html += `<button type="button" class="btn btn-outline btn-sm unlimited-add-btn" data-team="${teamKey}" style="margin-top:4px;">+ 添加选手</button>`;
            html += '</div>';
            return html;
        };

        area.innerHTML = `<div class="player-select-area">${renderTeam('team1', '队伍1')}${renderTeam('team2', '队伍2')}</div>`;

        area.querySelectorAll('.unlimited-add-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const team = btn.dataset.team;
                this.unlimitedPlayers[team].push(null);
                this.renderUnlimitedPlayerSelection();
            });
        });

        area.querySelectorAll('.unlimited-remove-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const team = btn.dataset.team;
                const idx = parseInt(btn.dataset.idx);
                this.unlimitedPlayers[team].splice(idx, 1);
                this.renderUnlimitedPlayerSelection();
            });
        });

        this.updateUnlimitedPlayerOptions();
    },

    updateUnlimitedPlayerOptions() {
        const allPlayers = this.teamPlayers;
        const selects = document.querySelectorAll('.unlimited-player-select');

        const currentValues = {};
        selects.forEach(sel => {
            const team = sel.dataset.team;
            const idx = parseInt(sel.dataset.idx);
            const storedVal = this.unlimitedPlayers[team]?.[idx];
            currentValues[team + '-' + idx] = (storedVal != null && storedVal !== undefined)
                ? String(storedVal)
                : sel.value;
        });

        const getSelectedIds = (excludeTeam, excludeIdx) => {
            const ids = [];
            selects.forEach(sel => {
                if (sel.dataset.team === excludeTeam && parseInt(sel.dataset.idx) === excludeIdx) return;
                const key = sel.dataset.team + '-' + sel.dataset.idx;
                const val = currentValues[key];
                if (val) ids.push(parseInt(val));
            });
            return ids;
        };

        selects.forEach(sel => {
            const team = sel.dataset.team;
            const idx = parseInt(sel.dataset.idx);
            const currentValue = currentValues[team + '-' + idx] || '';
            const otherSelectedIds = getSelectedIds(team, idx);

            let availablePlayers = allPlayers.filter(p => !otherSelectedIds.includes(p.id));

            let optionsHtml = '<option value="">选择选手</option>';
            availablePlayers.forEach(p => {
                const selected = String(p.id) === currentValue ? ' selected' : '';
                optionsHtml += `<option value="${p.id}"${selected}>${p.name} (${p.gender === 'male' ? '男' : '女'})</option>`;
            });

            sel.innerHTML = optionsHtml;
            sel.addEventListener('change', () => this.updateUnlimitedPlayerOptions());
        });
    },

    collectUnlimitedPlayerIds() {
        const selects = document.querySelectorAll('.unlimited-player-select');
        selects.forEach(sel => {
            const team = sel.dataset.team;
            const idx = parseInt(sel.dataset.idx);
            const val = parseInt(sel.value);
            if (team === 'team1' && idx < this.unlimitedPlayers.team1.length) {
                this.unlimitedPlayers.team1[idx] = val || null;
            } else if (team === 'team2' && idx < this.unlimitedPlayers.team2.length) {
                this.unlimitedPlayers.team2[idx] = val || null;
            }
        });
    },

    // Regular player selection
    renderPlayerSelection() {
        if (this.isUnlimitedType(this.matchType)) {
            this.renderUnlimitedPlayerSelection();
            return;
        }

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
        if (this.isUnlimitedType(this.matchType)) {
            this.collectUnlimitedPlayerIds();
        } else {
            this.collectPlayerIds();
        }

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
                        ${this.scores.length > 1 ? `<button class="btn btn-sm btn-danger" onclick="ShuttleTeamDetail.removeGame(${i})">✕</button>` : ''}
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
        if (this.isUnlimitedType(this.matchType)) {
            this.collectUnlimitedPlayerIds();
        } else {
            this.collectPlayerIds();
        }
        const container = document.getElementById('confirm-area');
        if (!container) return;

        const info = this.MATCH_TYPES[this.matchType];
        const playerMap = {};
        this.teamPlayers.forEach(p => playerMap[p.id] = p);

        let team1Names, team2Names;
        if (this.isUnlimitedType(this.matchType)) {
            team1Names = this.unlimitedPlayers.team1.map(id => playerMap[id]?.name).filter(Boolean).join(' & ');
            team2Names = this.unlimitedPlayers.team2.map(id => playerMap[id]?.name).filter(Boolean).join(' & ');
        } else {
            const isDoubles = info.category === 'doubles';
            team1Names = isDoubles
                ? [playerMap[this.selectedPlayers[0]]?.name, playerMap[this.selectedPlayers[1]]?.name].filter(Boolean).join(' & ')
                : playerMap[this.selectedPlayers[0]]?.name || '';
            team2Names = isDoubles
                ? [playerMap[this.selectedPlayers[2]]?.name, playerMap[this.selectedPlayers[3]]?.name].filter(Boolean).join(' & ')
                : playerMap[this.selectedPlayers[1]]?.name || '';
        }

        const scoreStr = this.scores.map((s, i) => `第${i + 1}局 ${s.team1_score} : ${s.team2_score}`).join('　');

        container.innerHTML = `
            <div class="card-flat">
                <div style="margin-bottom:12px;">
                    <span class="tag tag-${this.matchType}">${info.label}</span>
                </div>
                <div style="text-align:center;margin-bottom:12px;">
                    <div style="font-size:16px;font-weight:bold;color:var(--primary-darkest);">${team1Names} vs ${team2Names}</div>
                </div>
                <div style="text-align:center;margin-bottom:8px;">
                    <span style="font-size:13px;color:var(--text-secondary);">确认比分</span>
                </div>
                <div style="text-align:center;font-family:var(--font-score);font-size:20px;color:var(--text-primary);">
                    ${scoreStr}
                </div>
                ${this.scores.length > 1 ? '<div style="text-align:center;font-size:12px;color:var(--text-muted);margin-top:8px;">每局比分将作为独立比赛记录保存</div>' : ''}
            </div>
        `;
    },

    async submitMatch() {
        let data;
        if (this.isUnlimitedType(this.matchType)) {
            this.collectUnlimitedPlayerIds();
            const players = [];
            this.unlimitedPlayers.team1.forEach(pid => {
                players.push({ player_id: pid, team: 1 });
            });
            this.unlimitedPlayers.team2.forEach(pid => {
                players.push({ player_id: pid, team: 2 });
            });
            data = {
                type: this.matchType,
                players: players,
                scores: this.scores,
                team_id: parseInt(this.teamId)
            };
        } else {
            this.collectPlayerIds();
            data = {
                type: this.matchType,
                player_ids: this.selectedPlayers,
                scores: this.scores,
                team_id: parseInt(this.teamId)
            };
        }

        const res = await ShuttleAPI.matches.create(data);
        if (res.ok) {
            const count = res.data?.count || 1;
            ShuttleNav.showToast(`比赛记录成功！共录入${count}条记录`);
            this.resetRecord();
            this.renderMatches();
        } else {
            ShuttleNav.showToast(res.msg || '记录失败', 'error');
        }
    },

    resetRecord() {
        this.step = 1;
        this.matchType = '';
        this.selectedPlayers = [];
        this.unlimitedPlayers = { team1: [], team2: [] };
        this.scores = [{ team1_score: 0, team2_score: 0 }];
        document.querySelectorAll('#record-body .type-option').forEach(o => o.classList.remove('selected'));
        this.renderRecordStep();
    },

    // ===== Stats Tab =====

    renderStats() {
        this.renderFilterChips();
        this.populatePlayerSelectors();
        this.loadTeamWinRate();
        this.loadOpponentWinRate();
        this.loadPartnerWinRate();
    },

    renderFilterChips() {
        const typeOptions = [
            { value: 'all', label: '所有' },
            { value: 'singles', label: '单打' },
            { value: 'doubles', label: '双打' }
        ];
        const unlimitedOptions = [
            { value: true, label: '全部' },
            { value: false, label: '正式比赛' }
        ];
        const timeOptions = [
            { value: 'all', label: '永久' },
            { value: '30d', label: '近30天' }
        ];

        const renderChips = (options, filterKey, filterField, onChange) => {
            return options.map(opt => {
                const isActive = this.statsFilters[filterKey][filterField] === opt.value;
                return `<button class="chart-filter-chip ${isActive ? 'active' : ''}" data-filter="${filterKey}" data-field="${filterField}" data-value="${opt.value}" onclick="ShuttleTeamDetail.handleFilterClick(this)">${opt.label}</button>`;
            }).join('');
        };

        const infoTip = '<span class="info-tip" tabindex="0">!<span class="info-tooltip">正式比赛：男单、女单、男双、女双、混双（有性别限制）</span></span>';

        ['teamWinRate', 'opponentWinRate', 'partnerWinRate'].forEach(key => {
            const container = document.getElementById(key === 'teamWinRate' ? 'team-winrate-filters' : key === 'opponentWinRate' ? 'opponent-winrate-filters' : 'partner-winrate-filters');
            if (!container) return;

            container.innerHTML = renderChips(typeOptions, key, 'type') +
                '<span style="width:1px;height:20px;background:var(--border);margin:0 4px;"></span>' +
                renderChips(unlimitedOptions, key, 'include_unlimited') + infoTip +
                '<span style="width:1px;height:20px;background:var(--border);margin:0 4px;"></span>' +
                renderChips(timeOptions, key, 'time_range');
        });
    },

    handleFilterClick(btn) {
        const filterKey = btn.dataset.filter;
        const field = btn.dataset.field;
        let value = btn.dataset.value;

        // Convert string to appropriate type
        if (field === 'include_unlimited') {
            value = value === 'true';
        }

        this.statsFilters[filterKey][field] = value;

        // Update active state
        btn.parentElement.querySelectorAll('.chart-filter-chip').forEach(chip => {
            const chipField = chip.dataset.field;
            if (chipField === field) {
                let chipValue = chip.dataset.value;
                if (field === 'include_unlimited') chipValue = chipValue === 'true';
                chip.classList.toggle('active', chipValue === value);
            }
        });

        // Reload corresponding chart
        if (filterKey === 'teamWinRate') this.loadTeamWinRate();
        else if (filterKey === 'opponentWinRate') this.loadOpponentWinRate();
        else if (filterKey === 'partnerWinRate') this.loadPartnerWinRate();
    },

    populatePlayerSelectors() {
        const user = ShuttleAuth.getUser();
        let defaultPlayerId = '';

        // Find the player bound to current user
        if (user) {
            const boundPlayer = this.teamPlayers.find(p => p.user_id === user.id);
            if (boundPlayer) {
                defaultPlayerId = boundPlayer.id;
            }
        }

        const optionsHtml = '<option value="">选择选手</option>' +
            this.teamPlayers.map(p => `<option value="${p.id}" ${p.id == defaultPlayerId ? 'selected' : ''}>${p.name}</option>`).join('');

        const opponentSelect = document.getElementById('opponent-player-select');
        const partnerSelect = document.getElementById('partner-player-select');
        if (opponentSelect) opponentSelect.innerHTML = optionsHtml;
        if (partnerSelect) partnerSelect.innerHTML = optionsHtml;
    },

    async loadTeamWinRate() {
        const filters = this.statsFilters.teamWinRate;
        const res = await ShuttleAPI.stats.teamPlayerWinRate({
            team_id: parseInt(this.teamId),
            type: filters.type,
            include_unlimited: filters.include_unlimited,
            time_range: filters.time_range
        });

        if (res.ok) {
            this.renderWinRateChart('teamWinRate', 'chart-team-winrate', res.data || [], 'player_name');
        }
    },

    async loadOpponentWinRate() {
        const playerId = document.getElementById('opponent-player-select')?.value;
        const filters = this.statsFilters.opponentWinRate;
        const data = {
            team_id: parseInt(this.teamId),
            type: filters.type,
            include_unlimited: filters.include_unlimited,
            time_range: filters.time_range
        };
        if (playerId) data.player_id = parseInt(playerId);

        const res = await ShuttleAPI.stats.opponentWinRate(data);
        if (res.ok) {
            this.renderWinRateChart('opponentWinRate', 'chart-opponent-winrate', res.data || [], 'opponent_name');
        }
    },

    async loadPartnerWinRate() {
        const playerId = document.getElementById('partner-player-select')?.value;
        const filters = this.statsFilters.partnerWinRate;
        const data = {
            team_id: parseInt(this.teamId),
            type: filters.type,
            include_unlimited: filters.include_unlimited,
            time_range: filters.time_range
        };
        if (playerId) data.player_id = parseInt(playerId);

        const res = await ShuttleAPI.stats.partnerWinRate(data);
        if (res.ok) {
            this.renderWinRateChart('partnerWinRate', 'chart-partner-winrate', res.data || [], 'partner_name');
        }
    },

    renderWinRateChart(chartKey, canvasId, data, nameField) {
        if (this.charts[chartKey]) {
            this.charts[chartKey].destroy();
            this.charts[chartKey] = null;
        }

        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const container = canvas.parentElement;

        if (data.length === 0) {
            canvas.style.display = 'none';
            // Show empty state if not already present
            let emptyEl = container.querySelector('.chart-empty-state');
            if (!emptyEl) {
                emptyEl = document.createElement('div');
                emptyEl.className = 'chart-empty-state';
                container.appendChild(emptyEl);
            }
            emptyEl.innerHTML = '<div class="empty-state"><div class="empty-state-text">暂无数据</div></div>';
            return;
        }

        // Hide empty state, show canvas
        canvas.style.display = '';
        const emptyEl = container.querySelector('.chart-empty-state');
        if (emptyEl) emptyEl.remove();

        // Sort by win_rate descending
        data.sort((a, b) => (b.win_rate || 0) - (a.win_rate || 0));

        const labels = data.map(d => d[nameField]);
        const palette = ['#3b82f6', '#60a5fa', '#93c5fd', '#2563eb', '#1d4ed8', '#bfdbfe', '#1e3a5f'];
        const colors = data.map((_, i) => palette[i % palette.length]);

        this.charts[chartKey] = new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: '胜率 (%)',
                    data: data.map(d => d.win_rate),
                    backgroundColor: colors,
                    borderRadius: 6,
                    minBarLength: 2
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            label: (ctx) => {
                                const item = data[ctx.dataIndex];
                                return `胜率: ${ctx.raw}% (${item.win_matches || 0}胜 / ${item.total_matches || 0}场)`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: (v) => v + '%'
                        }
                    }
                }
            }
        });
    }
};
