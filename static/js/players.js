const ShuttlePlayers = {
    currentGender: '',
    bindUserCache: {},

    async loadPlayers(gender) {
        this.currentGender = gender || '';
        const res = await ShuttleAPI.players.list(this.currentGender);
        if (res.ok) {
            this.renderPlayerList(res.data);
        }
        return res;
    },

    renderPlayerList(players) {
        const container = document.getElementById('player-list');
        if (!container) return;

        if (!players || players.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon"></div>
                    <div class="empty-state-text">还没有选手，快去添加吧</div>
                </div>
            `;
            return;
        }

        container.innerHTML = players.map(p => {
            const isLinked = p.user_id && p.user_id === p.created_by;
            const nameHtml = p.user_id
                ? `<span class="player-name-bound" data-player-id="${p.id}">${p.name}</span>`
                : `<strong>${p.name}</strong>`;
            const genderTag = `<span style="margin-left:8px;font-size:12px;font-weight:500;padding:2px 8px;border-radius:10px;color:#fff;background:${p.gender === 'male' ? 'var(--gender-male)' : 'var(--gender-female)'};">${p.gender === 'male' ? '男' : '女'}</span>`;
            const linkedTag = isLinked ? '<span style="margin-left:6px;font-size:11px;font-weight:500;padding:2px 8px;border-radius:10px;color:#fff;background:var(--primary);">我的</span>' : '';
            const bindBtn = !p.user_id
                ? `<span class="action-link action-link-success" data-action="bind" data-player-id="${p.id}">绑定</span>`
                : '';
            const actions = isLinked ? '' : `
                <div class="player-actions">
                    ${bindBtn}
                    <span class="action-link" data-action="edit" data-player-id="${p.id}">编辑</span>
                    <span class="action-link action-link-danger" data-action="delete" data-player-id="${p.id}">删除</span>
                </div>
            `;
            return `
                <div class="card" style="display:flex;justify-content:space-between;align-items:center;">
                    <div>${nameHtml}${genderTag}${linkedTag}</div>
                    ${actions}
                </div>
            `;
        }).join('');

        this.bindCardEvents();
    },

    bindCardEvents() {
        const container = document.getElementById('player-list');
        if (!container) return;

        container.querySelectorAll('[data-action="bind"]').forEach(el => {
            el.addEventListener('click', () => this.openBindModal(parseInt(el.dataset.playerId)));
        });
        container.querySelectorAll('[data-action="edit"]').forEach(el => {
            el.addEventListener('click', () => this.openEditModal(parseInt(el.dataset.playerId)));
        });
        container.querySelectorAll('[data-action="delete"]').forEach(el => {
            el.addEventListener('click', () => this.openDeleteModal(parseInt(el.dataset.playerId)));
        });
        container.querySelectorAll('.player-name-bound').forEach(el => {
            el.addEventListener('click', () => this.openBindUserInfo(parseInt(el.dataset.playerId)));
        });
    },

    async openBindUserInfo(playerId) {
        const res = await ShuttleAPI.players.getBindUser(playerId);
        if (!res.ok || !res.data) {
            ShuttleNav.showToast('获取绑定用户信息失败', 'error');
            return;
        }
        const modal = document.getElementById('bind-user-info-modal');
        if (!modal) return;
        document.getElementById('bind-user-info-username').textContent = res.data.username;
        document.getElementById('bind-user-info-account').textContent = res.data.account;
        modal.dataset.playerId = playerId;
        modal.classList.add('active');
    },

    closeBindUserInfo() {
        const modal = document.getElementById('bind-user-info-modal');
        if (modal) modal.classList.remove('active');
    },

    async handleUnbind() {
        const modal = document.getElementById('bind-user-info-modal');
        const playerId = parseInt(modal.dataset.playerId);
        const res = await ShuttleAPI.players.unbind(playerId);
        if (res.ok) {
            ShuttleNav.showToast('已解绑');
            this.closeBindUserInfo();
            this.loadPlayers(this.currentGender);
        } else {
            ShuttleNav.showToast(res.msg || '解绑失败', 'error');
        }
    },

    openBindModal(playerId) {
        const modal = document.getElementById('bind-player-modal');
        if (!modal) return;
        modal.dataset.playerId = playerId;
        document.getElementById('bind-user-id-input').value = '';
        document.getElementById('invite-link-area').style.display = 'none';
        document.getElementById('invite-link-text').textContent = '';
        modal.classList.add('active');
    },

    closeBindModal() {
        const modal = document.getElementById('bind-player-modal');
        if (modal) modal.classList.remove('active');
    },

    async handleBindByUserId() {
        const modal = document.getElementById('bind-player-modal');
        const playerId = parseInt(modal.dataset.playerId);
        const account = document.getElementById('bind-user-id-input').value.trim();

        if (!account) {
            ShuttleNav.showToast('请输入账号', 'error');
            return;
        }

        const res = await ShuttleAPI.players.update(playerId, { bind_account: account });
        if (res.ok) {
            ShuttleNav.showToast('绑定成功');
            this.closeBindModal();
            this.loadPlayers(this.currentGender);
        } else {
            ShuttleNav.showToast(res.msg || '绑定失败', 'error');
        }
    },

    async handleInvite() {
        const modal = document.getElementById('bind-player-modal');
        const playerId = parseInt(modal.dataset.playerId);

        const res = await ShuttleAPI.players.invite(playerId);
        if (res.ok) {
            const link = window.location.origin + res.data.invite_link;
            document.getElementById('invite-link-area').style.display = 'block';
            document.getElementById('invite-link-text').textContent = link;
        } else {
            ShuttleNav.showToast(res.msg || '生成邀请链接失败', 'error');
        }
    },

    copyInviteLink() {
        const text = document.getElementById('invite-link-text').textContent;
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            ShuttleNav.showToast('链接已复制');
        }).catch(() => {
            const input = document.createElement('input');
            input.value = text;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            ShuttleNav.showToast('链接已复制');
        });
    },

    openEditModal(playerId) {
        const modal = document.getElementById('edit-player-modal');
        if (!modal) return;
        modal.dataset.playerId = playerId;
        document.getElementById('edit-player-name').value = '';
        document.getElementById('edit-player-user-id').value = '';
        document.getElementById('edit-player-error').textContent = '';
        modal.classList.add('active');
    },

    closeEditModal() {
        const modal = document.getElementById('edit-player-modal');
        if (modal) modal.classList.remove('active');
    },

    async handleEditPlayer(e) {
        e.preventDefault();
        const modal = document.getElementById('edit-player-modal');
        const playerId = parseInt(modal.dataset.playerId);
        const name = document.getElementById('edit-player-name').value.trim();
        const account = document.getElementById('edit-player-user-id').value.trim();
        const errorEl = document.getElementById('edit-player-error');

        const data = {};
        if (name) data.name = name;
        if (account) data.bind_account = account;

        if (!data.name && !data.bind_account) {
            errorEl.textContent = '请至少修改一项';
            return;
        }

        const res = await ShuttleAPI.players.update(playerId, data);
        if (res.ok) {
            ShuttleNav.showToast('修改成功');
            this.closeEditModal();
            this.loadPlayers(this.currentGender);
        } else {
            errorEl.textContent = res.msg || '修改失败';
        }
    },

    openDeleteModal(playerId) {
        const modal = document.getElementById('delete-player-modal');
        if (!modal) return;
        modal.dataset.playerId = playerId;
        modal.classList.add('active');
    },

    closeDeleteModal() {
        const modal = document.getElementById('delete-player-modal');
        if (modal) modal.classList.remove('active');
    },

    async handleDeletePlayer() {
        const modal = document.getElementById('delete-player-modal');
        const playerId = parseInt(modal.dataset.playerId);

        const res = await ShuttleAPI.players.delete(playerId);
        if (res.ok) {
            ShuttleNav.showToast('选手已删除');
            this.closeDeleteModal();
            this.loadPlayers(this.currentGender);
        } else {
            ShuttleNav.showToast(res.msg || '删除失败', 'error');
        }
    },

    initGenderFilter() {
        const chips = document.querySelectorAll('.gender-chip');
        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                chips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                const gender = chip.dataset.gender || '';
                this.loadPlayers(gender);
            });
        });
    },

    async handleAddPlayer(e) {
        e.preventDefault();
        const name = document.getElementById('player-name').value.trim();
        const gender = document.getElementById('player-gender').value;

        if (!name) {
            ShuttleNav.showToast('请输入选手名称', 'error');
            return;
        }
        if (!gender) {
            ShuttleNav.showToast('请选择性别', 'error');
            return;
        }

        const res = await ShuttleAPI.players.add(name, gender);
        if (res.ok) {
            ShuttleNav.showToast('选手添加成功');
            document.getElementById('player-name').value = '';
            document.getElementById('player-gender').value = '';
            this.closeAddModal();
            this.loadPlayers(this.currentGender);
        } else {
            ShuttleNav.showToast(res.msg || '添加失败', 'error');
        }
    },

    openAddModal() {
        document.getElementById('add-player-modal').classList.add('active');
    },

    closeAddModal() {
        document.getElementById('add-player-modal').classList.remove('active');
    },

    init() {
        this.loadPlayers('');
        this.initGenderFilter();

        const addForm = document.getElementById('add-player-form');
        if (addForm) {
            addForm.addEventListener('submit', (e) => this.handleAddPlayer(e));
        }

        const openBtn = document.getElementById('open-add-player');
        if (openBtn) {
            openBtn.addEventListener('click', () => this.openAddModal());
        }

        const closeBtn = document.getElementById('close-add-player');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeAddModal());
        }

        const overlay = document.getElementById('add-player-modal');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this.closeAddModal();
            });
        }

        const editForm = document.getElementById('edit-player-form');
        if (editForm) {
            editForm.addEventListener('submit', (e) => this.handleEditPlayer(e));
        }

        const editClose = document.getElementById('close-edit-player');
        if (editClose) {
            editClose.addEventListener('click', () => this.closeEditModal());
        }

        const editOverlay = document.getElementById('edit-player-modal');
        if (editOverlay) {
            editOverlay.addEventListener('click', (e) => {
                if (e.target === editOverlay) this.closeEditModal();
            });
        }

        const deleteClose = document.getElementById('close-delete-player');
        if (deleteClose) {
            deleteClose.addEventListener('click', () => this.closeDeleteModal());
        }

        const deleteConfirm = document.getElementById('confirm-delete-player');
        if (deleteConfirm) {
            deleteConfirm.addEventListener('click', () => this.handleDeletePlayer());
        }

        const deleteOverlay = document.getElementById('delete-player-modal');
        if (deleteOverlay) {
            deleteOverlay.addEventListener('click', (e) => {
                if (e.target === deleteOverlay) this.closeDeleteModal();
            });
        }

        const bindClose = document.getElementById('close-bind-player');
        if (bindClose) {
            bindClose.addEventListener('click', () => this.closeBindModal());
        }

        const bindOverlay = document.getElementById('bind-player-modal');
        if (bindOverlay) {
            bindOverlay.addEventListener('click', (e) => {
                if (e.target === bindOverlay) this.closeBindModal();
            });
        }

        const bindSubmit = document.getElementById('bind-user-id-submit');
        if (bindSubmit) {
            bindSubmit.addEventListener('click', () => this.handleBindByUserId());
        }

        const inviteBtn = document.getElementById('generate-invite-btn');
        if (inviteBtn) {
            inviteBtn.addEventListener('click', () => this.handleInvite());
        }

        const copyBtn = document.getElementById('copy-invite-link');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyInviteLink());
        }

        const userInfoClose = document.getElementById('close-bind-user-info');
        if (userInfoClose) {
            userInfoClose.addEventListener('click', () => this.closeBindUserInfo());
        }

        const userInfoOverlay = document.getElementById('bind-user-info-modal');
        if (userInfoOverlay) {
            userInfoOverlay.addEventListener('click', (e) => {
                if (e.target === userInfoOverlay) this.closeBindUserInfo();
            });
        }

        const unbindBtn = document.getElementById('unbind-user-btn');
        if (unbindBtn) {
            unbindBtn.addEventListener('click', () => this.handleUnbind());
        }
    }
};
