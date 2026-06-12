const ShuttleNav = {
    MATCH_TYPES: {
        ms: '男单', ws: '女单', os: '无限制单打',
        md: '男双', wd: '女双', xd: '混双', od: '无限制双打',
        fs: '无限制比赛(单打场)', fd: '无限制比赛(双打场)'
    },

    renderNavBar(activePage) {
        const loggedIn = ShuttleAuth.isLoggedIn();
        const user = ShuttleAuth.getUser();

        let links = '';
        if (loggedIn) {
            links = `
                <a href="/pages/myhomepage.html" class="${activePage === 'home' ? 'active' : ''}">我的</a>
                <a href="/pages/matches.html" class="${activePage === 'matches' ? 'active' : ''}">录入</a>
                <a href="/pages/match-query.html" class="${activePage === 'query' ? 'active' : ''}">查询</a>
                <a href="/pages/stats.html" class="${activePage === 'stats' ? 'active' : ''}">统计</a>
                <a href="/pages/profile.html" class="nav-btn">${user ? user.username : '我'}</a>
            `;
        } else {
            links = `
                <a href="/pages/login.html" class="nav-btn-outline">登录</a>
                <a href="/pages/register.html" class="nav-btn">注册</a>
            `;
        }

        document.getElementById('nav-bar').innerHTML = `
            <a href="/" class="nav-brand">Shuttle Score</a>
            <div class="nav-links">${links}</div>
        `;
    },

    renderTabBar(activeTab) {
        const tabs = [
            { id: 'home', label: '我的', href: '/pages/myhomepage.html' },
            { id: 'matches', label: '录入', href: '/pages/matches.html' },
            { id: 'query', label: '查询', href: '/pages/match-query.html' },
            { id: 'stats', label: '统计', href: '/pages/stats.html' },
            { id: 'me', label: '我', href: '/pages/profile.html' }
        ];

        const items = tabs.map(t =>
            `<a href="${t.href}" class="tab-item ${t.id === activeTab ? 'active' : ''}">
                <span>${t.label}</span>
            </a>`
        ).join('');

        document.getElementById('tab-bar').innerHTML = `
            <div class="tab-bar-inner">${items}</div>
        `;
    },

    renderAll(activePage, activeTab) {
        this.renderNavBar(activePage);
        this.renderTabBar(activeTab || activePage);
    },

    showToast(msg, type = 'success') {
        let toast = document.getElementById('shuttle-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'shuttle-toast';
            document.body.appendChild(toast);
        }
        toast.className = `toast toast-${type}`;
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    },

    formatTime(timestamp) {
        if (!timestamp) return '';
        const d = new Date(timestamp * 1000);
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    },

    formatDate(timestamp) {
        if (!timestamp) return '';
        const d = new Date(timestamp * 1000);
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    },

    getMatchTypeLabel(type) {
        return this.MATCH_TYPES[type] || type;
    },

    renderMatchCard(match, showPlayers = true, options = {}) {
        const typeLabel = this.getMatchTypeLabel(match.type);
        const scores = match.scores || [];
        const scoreStr = scores.map(s => `${s.team1_score}:${s.team2_score}`).join(' / ');

        let playersHtml = '';
        if (showPlayers && match.players) {
            const team1 = match.players.filter(p => p.team === 1).map(p => p.player_name).join(' & ');
            const team2 = match.players.filter(p => p.team === 2).map(p => p.player_name).join(' & ');
            playersHtml = `<div class="match-card-players">${team1} vs ${team2}</div>`;

            const winners = match.players.filter(p => p.is_winner === 1);
            if (winners.length > 0) {
                playersHtml += `<div class="match-card-winner"><span>${winners.map(p => p.player_name).join(' & ')} 获胜</span></div>`;
            }
        }

        let actionsHtml = '';
        if (options.showActions) {
            actionsHtml = `
                <div class="match-card-actions">
                    <span class="match-action-btn match-action-edit" onclick="ShuttleMatches.openEditModal(${match.id})" title="编辑">&#9998;</span>
                    <span class="match-action-btn match-action-delete" onclick="ShuttleMatches.confirmDelete(${match.id})" title="删除">&#10005;</span>
                </div>
            `;
        }

        return `
            <div class="match-card">
                <div class="match-card-header">
                    <span class="tag tag-${match.type}">${typeLabel}</span>
                    <span class="match-card-date">${this.formatTime(match.match_time)}</span>
                </div>
                <div class="match-card-score">${scoreStr || '-'}</div>
                ${playersHtml}
                ${actionsHtml}
            </div>
        `;
    }
};
