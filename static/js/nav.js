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
                <a href="/pages/match-query.html" class="${activePage === 'matches' ? 'active' : ''}">比赛</a>
                <a href="/pages/teams.html" class="${activePage === 'teams' ? 'active' : ''}">团队</a>
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
            { id: 'matches', label: '比赛', href: '/pages/match-query.html' },
            { id: 'teams', label: '团队', href: '/pages/teams.html' },
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
        this.renderHelpButton();
    },

    renderHelpButton() {
        if (document.getElementById('help-btn')) return;

        // Create floating button
        const btn = document.createElement('button');
        btn.id = 'help-btn';
        btn.className = 'help-btn';
        btn.textContent = '?';
        btn.addEventListener('click', () => this.openHelpModal());
        document.body.appendChild(btn);

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'help-modal';
        modal.className = 'modal-overlay help-modal';
        modal.innerHTML = `
            <div class="modal" style="position:relative;">
                <button class="help-modal-close" id="help-modal-close">&times;</button>
                <div class="modal-title">使用指南</div>

                <div class="help-accordion">
                    <div class="help-accordion-header" data-accordion="player">
                        选手机制
                        <span class="help-accordion-arrow">&#9660;</span>
                    </div>
                    <div class="help-accordion-body" data-accordion-body="player">
                        <ul>
                            <li>注册时自动创建同名同性别的选手</li>
                            <li>可手动添加其他选手（输入名称+性别）</li>
                            <li>选手与用户绑定后，名称显示下划线，点击可查看绑定信息</li>
                            <li>选手可编辑名称、逻辑删除（已录入成绩不受影响）、解绑</li>
                        </ul>
                    </div>
                </div>

                <div class="help-accordion">
                    <div class="help-accordion-header" data-accordion="invite">
                        邀请机制
                        <span class="help-accordion-arrow">&#9660;</span>
                    </div>
                    <div class="help-accordion-body" data-accordion-body="invite">
                        <ul>
                            <li>方式一：生成邀请链接（24小时有效），新用户通过链接注册后自动绑定该选手</li>
                            <li>方式二：直接输入对方账号建立绑定</li>
                            <li>绑定规则：不能绑定自己、同一用户不可重复绑定</li>
                        </ul>
                    </div>
                </div>

                <div class="help-accordion">
                    <div class="help-accordion-header" data-accordion="team">
                        团队机制
                        <span class="help-accordion-arrow">&#9660;</span>
                    </div>
                    <div class="help-accordion-body" data-accordion-body="team">
                        <ul>
                            <li>创建团队：输入团队名称，创建者自动成为管理员</li>
                            <li>加入团队：输入团队名称 + 邀请码，可选择"创建新选手加入"或"绑定已有选手加入"</li>
                            <li>邀请码：创建团队时自动生成，仅创建者可刷新</li>
                            <li>退出团队：创建者不可退出，其他成员可退出</li>
                        </ul>
                    </div>
                </div>

                <div class="help-accordion">
                    <div class="help-accordion-header" data-accordion="issue">
                        如何提 Issue
                        <span class="help-accordion-arrow">&#9660;</span>
                    </div>
                    <div class="help-accordion-body" data-accordion-body="issue">
                        <p style="margin-bottom:8px;">遇到问题或有建议？通过以下方式反馈：</p>
                        <div class="help-issue-channels" id="help-issue-channels">
                            <span class="help-no-channel">加载中...</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Close handlers
        document.getElementById('help-modal-close').addEventListener('click', () => this.closeHelpModal());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeHelpModal();
        });

        // Accordion handlers
        modal.querySelectorAll('.help-accordion-header').forEach(header => {
            header.addEventListener('click', () => {
                const key = header.getAttribute('data-accordion');
                const body = modal.querySelector(`[data-accordion-body="${key}"]`);
                const isActive = header.classList.contains('active');

                // Close all
                modal.querySelectorAll('.help-accordion-header').forEach(h => h.classList.remove('active'));
                modal.querySelectorAll('.help-accordion-body').forEach(b => b.classList.remove('active'));

                // Toggle current
                if (!isActive) {
                    header.classList.add('active');
                    body.classList.add('active');
                }
            });
        });
    },

    openHelpModal() {
        const modal = document.getElementById('help-modal');
        if (modal) {
            modal.classList.add('active');
            this.loadIssueChannels();
        }
    },

    closeHelpModal() {
        const modal = document.getElementById('help-modal');
        if (modal) modal.classList.remove('active');
    },

    async loadIssueChannels() {
        const container = document.getElementById('help-issue-channels');
        if (!container) return;

        try {
            const res = await ShuttleAPI.settings.get();
            const data = (res.ok && res.data) || {};
            const githubUrl = data.github_issue_url || '';
            const contactEmail = data.contact_email || '';

            let html = '';
            if (githubUrl) {
                html += `<a href="${githubUrl}" target="_blank" rel="noopener" class="help-issue-link">GitHub Issues</a>`;
            }
            if (contactEmail) {
                html += `<a href="mailto:${contactEmail}" class="help-issue-link">联系邮箱：${contactEmail}</a>`;
            }
            if (!html) {
                html = '<span class="help-no-channel">暂未配置反馈渠道</span>';
            }
            container.innerHTML = html;
        } catch {
            container.innerHTML = '<span class="help-no-channel">暂未配置反馈渠道</span>';
        }
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
