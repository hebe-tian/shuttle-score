const ShuttleTeams = {
    joinTeamId: null,
    joinInviteCode: null,
    unboundPlayers: [],

    async init() {
        await this.loadTeams();

        document.getElementById('btn-create-team')?.addEventListener('click', () => this.openCreateModal());
        document.getElementById('btn-join-team')?.addEventListener('click', () => this.openJoinModal());

        // 创建团队弹窗
        document.getElementById('close-create-team')?.addEventListener('click', () => this.closeCreateModal());
        document.getElementById('create-team-form')?.addEventListener('submit', (e) => this.submitCreateTeam(e));
        document.getElementById('create-team-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'create-team-modal') this.closeCreateModal();
        });

        // 加入团队弹窗
        document.getElementById('close-join-team')?.addEventListener('click', () => this.closeJoinModal());
        document.getElementById('close-join-team2')?.addEventListener('click', () => this.closeJoinModal());
        document.getElementById('join-team-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'join-team-modal') this.closeJoinModal();
        });
        document.getElementById('join-step1-next')?.addEventListener('click', () => this.submitJoinStep1());
        document.getElementById('join-action-create')?.addEventListener('click', () => this.submitJoinStep2('create'));
        document.getElementById('join-action-bind')?.addEventListener('click', () => this.showBindPlayerArea());
        document.getElementById('join-bind-submit')?.addEventListener('click', () => this.submitJoinStep2('bind'));
    },

    async loadTeams() {
        const res = await ShuttleAPI.teams.list();
        if (res.ok) {
            this.renderTeamList(res.data);
        } else {
            ShuttleNav.showToast(res.msg || '加载团队失败', 'error');
        }
        return res;
    },

    renderTeamList(teams) {
        const container = document.getElementById('team-list');
        if (!container) return;

        if (!teams || teams.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon"></div>
                    <div class="empty-state-text">还没有团队，快去创建或加入吧</div>
                </div>
            `;
            return;
        }

        container.innerHTML = teams.map(t => this.renderTeamCard(t)).join('');
    },

    renderTeamCard(team) {
        const user = ShuttleAuth.getUser();
        const isCreator = user && team.created_by === user.user_id;
        const creatorBadge = isCreator
            ? '<span style="margin-left:8px;font-size:11px;font-weight:500;padding:2px 8px;border-radius:10px;color:#fff;background:var(--primary);">创建者</span>'
            : '';

        const memberCount = team.member_count != null ? team.member_count : 0;
        const playerCount = team.player_count != null ? team.player_count : 0;

        return `
            <a href="/pages/team-detail.html?id=${team.id}" class="card" style="display:block;text-decoration:none;color:inherit;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <div style="font-size:16px;font-weight:600;color:var(--text-primary);">${team.name}${creatorBadge}</div>
                        <div style="font-size:13px;color:var(--text-secondary);margin-top:4px;">
                            成员 ${memberCount} 人 &middot; 选手 ${playerCount} 人
                        </div>
                    </div>
                    <span style="font-size:14px;color:var(--text-muted);">&rsaquo;</span>
                </div>
            </a>
        `;
    },

    // ===== 创建团队 =====

    openCreateModal() {
        document.getElementById('create-team-name').value = '';
        document.getElementById('create-team-error').textContent = '';
        document.getElementById('create-team-modal').classList.add('active');
    },

    closeCreateModal() {
        document.getElementById('create-team-modal').classList.remove('active');
    },

    async submitCreateTeam(e) {
        e.preventDefault();
        const name = document.getElementById('create-team-name').value.trim();
        const errorEl = document.getElementById('create-team-error');

        if (!name) {
            errorEl.textContent = '请输入团队名称';
            return;
        }

        const res = await ShuttleAPI.teams.create(name);
        if (res.ok) {
            ShuttleNav.showToast('团队创建成功');
            this.closeCreateModal();
            this.loadTeams();
        } else {
            errorEl.textContent = res.msg || '创建失败';
        }
    },

    // ===== 加入团队 =====

    openJoinModal() {
        document.getElementById('join-team-name').value = '';
        document.getElementById('join-invite-code').value = '';
        document.getElementById('join-step1-error').textContent = '';
        document.getElementById('join-step2-error').textContent = '';
        document.getElementById('join-step1').style.display = 'block';
        document.getElementById('join-step2').style.display = 'none';
        document.getElementById('bind-player-area').style.display = 'none';
        this.joinTeamId = null;
        this.joinInviteCode = null;
        this.unboundPlayers = [];
        document.getElementById('join-team-modal').classList.add('active');
    },

    closeJoinModal() {
        document.getElementById('join-team-modal').classList.remove('active');
    },

    async submitJoinStep1() {
        const teamName = document.getElementById('join-team-name').value.trim();
        const inviteCode = document.getElementById('join-invite-code').value.trim();
        const errorEl = document.getElementById('join-step1-error');

        if (!teamName) {
            errorEl.textContent = '请输入团队名称';
            return;
        }
        if (!inviteCode) {
            errorEl.textContent = '请输入邀请码';
            return;
        }

        // 通过 resolve 接口验证团队名称和邀请码
        const res = await ShuttleAPI.teams.resolve(teamName, inviteCode);
        if (!res.ok) {
            errorEl.textContent = res.msg || '验证失败';
            return;
        }

        this.joinTeamId = res.data.id;
        this.joinInviteCode = inviteCode;
        this.unboundPlayers = res.data.unbound_players || [];

        // 切换到 step2
        errorEl.textContent = '';
        document.getElementById('join-step1').style.display = 'none';
        document.getElementById('join-step2').style.display = 'block';
        document.getElementById('bind-player-area').style.display = 'none';
    },

    showBindPlayerArea() {
        const area = document.getElementById('bind-player-area');
        const select = document.getElementById('bind-player-select');

        if (this.unboundPlayers.length === 0) {
            ShuttleNav.showToast('该团队没有可绑定的选手', 'error');
            return;
        }

        let optionsHtml = '<option value="">请选择</option>';
        this.unboundPlayers.forEach(p => {
            optionsHtml += `<option value="${p.id}">${p.name} (${p.gender === 'male' ? '男' : '女'})</option>`;
        });
        select.innerHTML = optionsHtml;

        area.style.display = 'block';
    },

    async submitJoinStep2(action) {
        const errorEl = document.getElementById('join-step2-error');
        errorEl.textContent = '';

        if (!this.joinTeamId || !this.joinInviteCode) {
            errorEl.textContent = '参数异常，请重新操作';
            return;
        }

        if (action === 'bind') {
            const bindPlayerId = document.getElementById('bind-player-select').value;
            if (!bindPlayerId) {
                errorEl.textContent = '请选择要绑定的选手';
                return;
            }

            const res = await ShuttleAPI.teams.join(this.joinTeamId, this.joinInviteCode, 'bind', parseInt(bindPlayerId));
            if (res.ok) {
                ShuttleNav.showToast('加入团队成功');
                this.closeJoinModal();
                this.loadTeams();
            } else {
                errorEl.textContent = res.msg || '加入失败';
            }
        } else {
            // create: 创建新选手加入
            const res = await ShuttleAPI.teams.join(this.joinTeamId, this.joinInviteCode, 'create');
            if (res.ok) {
                ShuttleNav.showToast('加入团队成功');
                this.closeJoinModal();
                this.loadTeams();
            } else {
                errorEl.textContent = res.msg || '加入失败';
            }
        }
    }
};
