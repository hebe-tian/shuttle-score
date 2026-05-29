const ShuttlePlayers = {
    currentGender: '',

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

        container.innerHTML = players.map(p => `
            <div class="card" style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <strong>${p.name}</strong>
                    <span class="tag ${p.gender === 'male' ? 'tag-ms' : 'tag-ws'}" style="margin-left:8px;">${p.gender === 'male' ? '男' : '女'}</span>
                </div>
                <span style="font-size:12px;color:var(--text-muted);">${ShuttleNav.formatDate(p.created_at)}</span>
            </div>
        `).join('');
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
    }
};
