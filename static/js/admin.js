const ShuttleAdmin = {
    currentPage: 1,
    pageSize: 20,

    async loadDashboard() {
        const [usersRes, matchesRes, playersRes, adminsRes] = await Promise.all([
            ShuttleAPI.admin.getUsers(1, 1),
            ShuttleAPI.admin.queryMatches({ page: 1, page_size: 1 }),
            ShuttleAPI.admin.getPlayers(1, 1),
            ShuttleAPI.admin.getAdmins()
        ]);

        document.getElementById('stat-users').textContent = usersRes.ok ? usersRes.data.total : 0;
        document.getElementById('stat-matches').textContent = matchesRes.ok ? matchesRes.data.total : 0;
        document.getElementById('stat-players').textContent = playersRes.ok ? playersRes.data.total : 0;

        const adminCount = adminsRes.ok ? adminsRes.data.length : 0;
        document.getElementById('stat-admins').textContent = adminCount;
    },

    async loadAdmins() {
        const res = await ShuttleAPI.admin.getAdmins();
        if (!res.ok) {
            ShuttleNav.showToast(res.msg || '加载失败', 'error');
            return;
        }

        const container = document.getElementById('admin-list');
        if (!container) return;

        const admins = res.data || [];
        if (admins.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"></div><div class="empty-state-text">暂无管理员</div></div>';
            return;
        }

        container.innerHTML = `<table class="data-table">
            <thead><tr><th>ID</th><th>账号</th><th>角色</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>${admins.map(a => `
                <tr>
                    <td>${a.id}</td>
                    <td>${a.account}</td>
                    <td><span class="tag ${a.role === 'super_admin' ? 'tag-role-super' : 'tag-role-admin'}">${a.role === 'super_admin' ? '超级管理员' : '管理员'}</span></td>
                    <td><span class="status-dot ${a.status === 1 ? 'status-active' : 'status-disabled'}">${a.status === 1 ? '正常' : '禁用'}</span></td>
                    <td>${a.role !== 'super_admin' ? `
                        <span class="action-link action-link-success" onclick="ShuttleAdmin.toggleAdminStatus(${a.id})">${a.status === 1 ? '禁用' : '启用'}</span>
                        <span class="action-link" onclick="ShuttleAdmin.resetAdminPwd(${a.id})">重置密码</span>
                        <span class="action-link action-link-danger" onclick="ShuttleAdmin.deleteAdmin(${a.id})">删除</span>
                    ` : '-'}</td>
                </tr>
            `).join('')}</tbody>
        </table>`;
    },

    async createAdmin() {
        const account = document.getElementById('new-admin-account')?.value.trim();
        const password = document.getElementById('new-admin-password')?.value;

        if (!account || !password) {
            ShuttleNav.showToast('请填写账号和密码', 'error');
            return;
        }

        const res = await ShuttleAPI.admin.createAdmin(account, password);
        if (res.ok) {
            ShuttleNav.showToast('管理员创建成功');
            document.getElementById('new-admin-account').value = '';
            document.getElementById('new-admin-password').value = '';
            this.loadAdmins();
        } else {
            ShuttleNav.showToast(res.msg || '创建失败', 'error');
        }
    },

    async toggleAdminStatus(adminId) {
        const res = await ShuttleAPI.admin.toggleAdminStatus(adminId);
        if (res.ok) {
            ShuttleNav.showToast('状态已更新');
            this.loadAdmins();
        } else {
            ShuttleNav.showToast(res.msg || '操作失败', 'error');
        }
    },

    async resetAdminPwd(adminId) {
        const newPwd = prompt('请输入新密码（6-20位）：');
        if (!newPwd) return;
        if (newPwd.length < 6 || newPwd.length > 20) {
            ShuttleNav.showToast('密码长度需为6-20位', 'error');
            return;
        }
        const res = await ShuttleAPI.admin.resetAdminPassword(adminId, newPwd);
        if (res.ok) {
            ShuttleNav.showToast('密码重置成功');
        } else {
            ShuttleNav.showToast(res.msg || '重置失败', 'error');
        }
    },

    async deleteAdmin(adminId) {
        if (!confirm('确定要删除该管理员吗？')) return;
        const res = await ShuttleAPI.admin.deleteAdmin(adminId);
        if (res.ok) {
            ShuttleNav.showToast('管理员已删除');
            this.loadAdmins();
        } else {
            ShuttleNav.showToast(res.msg || '删除失败', 'error');
        }
    },

    async loadUsers(page) {
        this.currentPage = page || 1;
        const res = await ShuttleAPI.admin.getUsers(this.currentPage, this.pageSize);
        if (!res.ok) {
            ShuttleNav.showToast(res.msg || '加载失败', 'error');
            return;
        }

        const data = res.data;
        const container = document.getElementById('user-list');
        if (!container) return;

        const items = data.items || [];
        if (items.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"></div><div class="empty-state-text">暂无用户</div></div>';
            document.getElementById('user-pagination').innerHTML = '';
            return;
        }

        container.innerHTML = `<table class="data-table">
            <thead><tr><th>ID</th><th>账号</th><th>用户名</th><th>状态</th><th>注册时间</th><th>操作</th></tr></thead>
            <tbody>${items.map(u => `
                <tr>
                    <td>${u.id}</td>
                    <td>${u.account}</td>
                    <td>${u.username}</td>
                    <td><span class="status-dot ${u.status === 1 ? 'status-active' : 'status-disabled'}">${u.status === 1 ? '正常' : '禁用'}</span></td>
                    <td>${ShuttleNav.formatDate(u.created_at)}</td>
                    <td><span class="action-link action-link-${u.status === 1 ? 'danger' : 'success'}" onclick="ShuttleAdmin.toggleUserStatus(${u.id})">${u.status === 1 ? '禁用' : '启用'}</span></td>
                </tr>
            `).join('')}</tbody>
        </table>`;

        this.renderPagination('user-pagination', data.total, data.page, data.page_size, 'ShuttleAdmin.loadUsers');
    },

    async toggleUserStatus(userId) {
        const res = await ShuttleAPI.admin.toggleUserStatus(userId);
        if (res.ok) {
            ShuttleNav.showToast('状态已更新');
            this.loadUsers(this.currentPage);
        } else {
            ShuttleNav.showToast(res.msg || '操作失败', 'error');
        }
    },

    async loadMatches(page) {
        this.currentPage = page || 1;
        const data = { page: this.currentPage, page_size: this.pageSize };

        const type = document.getElementById('admin-match-type')?.value;
        if (type) data.type = type;

        const res = await ShuttleAPI.admin.queryMatches(data);
        if (!res.ok) {
            ShuttleNav.showToast(res.msg || '加载失败', 'error');
            return;
        }

        const result = res.data;
        const container = document.getElementById('admin-match-list');
        if (!container) return;

        const items = result.items || [];
        if (items.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"></div><div class="empty-state-text">暂无比赛记录</div></div>';
            document.getElementById('admin-match-pagination').innerHTML = '';
            return;
        }

        container.innerHTML = `<table class="data-table">
            <thead><tr><th>ID</th><th>类型</th><th>比分</th><th>时间</th><th>操作</th></tr></thead>
            <tbody>${items.map(m => {
                const scoreStr = (m.scores || []).map(s => `${s.team1_score}:${s.team2_score}`).join(' / ');
                const players = (m.players || []);
                const team1 = players.filter(p => p.team === 1).map(p => p.player_name).join(' & ');
                const team2 = players.filter(p => p.team === 2).map(p => p.player_name).join(' & ');
                return `<tr>
                    <td>${m.id}</td>
                    <td><span class="tag tag-${m.type}">${ShuttleNav.getMatchTypeLabel(m.type)}</span></td>
                    <td>${team1} ${scoreStr} ${team2}</td>
                    <td>${ShuttleNav.formatTime(m.match_time)}</td>
                    <td><span class="action-link action-link-danger" onclick="ShuttleAdmin.deleteMatch(${m.id})">删除</span></td>
                </tr>`;
            }).join('')}</tbody>
        </table>`;

        this.renderPagination('admin-match-pagination', result.total, result.page, result.page_size, 'ShuttleAdmin.loadMatches');
    },

    async deleteMatch(matchId) {
        if (!confirm('确定要删除该比赛记录吗？')) return;
        const res = await ShuttleAPI.admin.deleteMatch(matchId);
        if (res.ok) {
            ShuttleNav.showToast('比赛记录已删除');
            this.loadMatches(this.currentPage);
        } else {
            ShuttleNav.showToast(res.msg || '删除失败', 'error');
        }
    },

    async loadPlayers(page) {
        this.currentPage = page || 1;
        const res = await ShuttleAPI.admin.getPlayers(this.currentPage, this.pageSize);
        if (!res.ok) {
            ShuttleNav.showToast(res.msg || '加载失败', 'error');
            return;
        }

        const data = res.data;
        const container = document.getElementById('admin-player-list');
        if (!container) return;

        const items = data.items || [];
        if (items.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"></div><div class="empty-state-text">暂无选手</div></div>';
            document.getElementById('admin-player-pagination').innerHTML = '';
            return;
        }

        container.innerHTML = `<table class="data-table">
            <thead><tr><th>ID</th><th>名称</th><th>性别</th><th>创建者</th><th>操作</th></tr></thead>
            <tbody>${items.map(p => `
                <tr>
                    <td>${p.id}</td>
                    <td>${p.name}</td>
                    <td><span class="tag ${p.gender === 'male' ? 'tag-ms' : 'tag-ws'}">${p.gender === 'male' ? '男' : '女'}</span></td>
                    <td>${p.creator_username || p.creator_account || '-'}</td>
                    <td>
                        <span class="action-link action-link-success" onclick="ShuttleAdmin.editPlayer(${p.id}, '${p.name}', '${p.gender}')">编辑</span>
                        <span class="action-link action-link-danger" onclick="ShuttleAdmin.deletePlayer(${p.id})">删除</span>
                    </td>
                </tr>
            `).join('')}</tbody>
        </table>`;

        this.renderPagination('admin-player-pagination', data.total, data.page, data.page_size, 'ShuttleAdmin.loadPlayers');
    },

    async editPlayer(playerId, currentName, currentGender) {
        const name = prompt('选手名称：', currentName);
        if (!name) return;
        const gender = prompt('性别（male/female）：', currentGender);
        if (!gender || !['male', 'female'].includes(gender)) {
            ShuttleNav.showToast('性别需为male或female', 'error');
            return;
        }

        const res = await ShuttleAPI.admin.updatePlayer(playerId, { name, gender });
        if (res.ok) {
            ShuttleNav.showToast('选手信息已更新');
            this.loadPlayers(this.currentPage);
        } else {
            ShuttleNav.showToast(res.msg || '更新失败', 'error');
        }
    },

    async deletePlayer(playerId) {
        if (!confirm('确定要删除该选手吗？')) return;
        const res = await ShuttleAPI.admin.deletePlayer(playerId);
        if (res.ok) {
            ShuttleNav.showToast('选手已删除');
            this.loadPlayers(this.currentPage);
        } else {
            ShuttleNav.showToast(res.msg || '删除失败', 'error');
        }
    },

    renderPagination(containerId, total, page, pageSize, callback) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const totalPages = Math.ceil(total / pageSize);
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = `<button ${page <= 1 ? 'disabled' : ''} onclick="${callback}(${page - 1})">上一页</button>`;
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="${i === page ? 'active' : ''}" onclick="${callback}(${i})">${i}</button>`;
        }
        html += `<button ${page >= totalPages ? 'disabled' : ''} onclick="${callback}(${page + 1})">下一页</button>`;
        container.innerHTML = html;
    },

    async handleAdminLogin(e) {
        e.preventDefault();
        const account = document.getElementById('admin-account').value.trim();
        const password = document.getElementById('admin-password').value;

        if (!account || !password) {
            ShuttleNav.showToast('请输入账号和密码', 'error');
            return;
        }

        const res = await ShuttleAPI.admin.login(account, password);
        if (res.ok) {
            ShuttleAuth.saveAdminToken(res.data.token);
            ShuttleAuth.saveAdmin(res.data.admin);
            window.location.href = '/pages/admin/dashboard.html';
        } else {
            ShuttleNav.showToast(res.msg || '登录失败', 'error');
        }
    },

    adminLogout() {
        ShuttleAuth.adminLogout();
    }
};
