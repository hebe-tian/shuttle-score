const API_BASE = '';

const ShuttleAPI = {
    _getToken() {
        return localStorage.getItem('shuttle_token') || '';
    },

    _getAdminToken() {
        return localStorage.getItem('shuttle_admin_token') || '';
    },

    async request(path, options = {}) {
        const { method = 'GET', data = null, admin = false, tempToken = null } = options;

        const headers = { 'Content-Type': 'application/json' };
        const token = admin ? this._getAdminToken() : (tempToken || this._getToken());
        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }

        const config = { method, headers };
        if (data && method !== 'GET') {
            config.body = JSON.stringify(data);
        }

        try {
            const resp = await fetch(API_BASE + path, config);
            const json = await resp.json();

            if (json.code === 401) {
                if (admin) {
                    localStorage.removeItem('shuttle_admin_token');
                    window.location.href = '/pages/admin/login.html';
                } else {
                    localStorage.removeItem('shuttle_token');
                    window.location.href = '/pages/login.html';
                }
                return { ok: false, data: null, msg: json.msg || '未登录或Token过期' };
            }

            if (json.code === 200) {
                return { ok: true, data: json.data, msg: '' };
            }

            return { ok: false, data: null, msg: json.msg || '请求失败', code: json.code };
        } catch (e) {
            return { ok: false, data: null, msg: '网络错误，请稍后重试' };
        }
    },

    get(path, admin = false) {
        return this.request(path, { method: 'GET', admin });
    },

    post(path, data, options = {}) {
        return this.request(path, { method: 'POST', data, ...options });
    },

    auth: {
        registerStep1(account, password) {
            return ShuttleAPI.post('/api/auth/register', { step: 1, account, password });
        },
        registerStep2(temp_token, username, gender, invite) {
            const data = { step: 2, temp_token, username, gender };
            if (invite) data.invite = invite;
            return ShuttleAPI.post('/api/auth/register', data, { tempToken: null });
        },
        login(account, password) {
            return ShuttleAPI.post('/api/auth/login', { account, password });
        },
        getProfile() {
            return ShuttleAPI.get('/api/auth/profile');
        },
        updateUsername(username) {
            return ShuttleAPI.post('/api/auth/profile', { action: 'update_username', username });
        },
        updatePassword(old_password, new_password) {
            return ShuttleAPI.post('/api/auth/profile', { action: 'update_password', old_password, new_password });
        }
    },

    players: {
        list(gender) {
            const params = gender ? '?gender=' + gender : '';
            return ShuttleAPI.get('/api/players' + params);
        },
        add(name, gender) {
            return ShuttleAPI.post('/api/players', { name, gender });
        },
        update(player_id, data) {
            return ShuttleAPI.post('/api/players/update', { player_id, ...data });
        },
        delete(player_id) {
            return ShuttleAPI.post('/api/players/delete', { player_id });
        },
        unbind(player_id) {
            return ShuttleAPI.post('/api/players/unbind', { player_id });
        },
        invite(player_id) {
            return ShuttleAPI.post('/api/players/invite', { player_id });
        },
        getBindUser(player_id) {
            return ShuttleAPI.get('/api/players/bind-user?id=' + player_id);
        }
    },

    matches: {
        create(data) {
            return ShuttleAPI.post('/api/matches', data);
        },
        query(data) {
            return ShuttleAPI.post('/api/matches/query', data);
        },
        get(id) {
            return ShuttleAPI.get('/api/matches/' + id);
        },
        random() {
            return ShuttleAPI.get('/api/matches/random');
        },
        update(data) {
            return ShuttleAPI.post('/api/matches/update', data);
        },
        delete(matchId) {
            return ShuttleAPI.post('/api/matches/delete', { match_id: matchId });
        }
    },

    settings: {
        get() {
            return ShuttleAPI.get('/api/settings');
        }
    },

    stats: {
        winRate(data) {
            return ShuttleAPI.post('/api/stats/win-rate', data);
        },
        score(data) {
            return ShuttleAPI.post('/api/stats/score', data);
        },
        opponentWinRate(data) {
            return ShuttleAPI.post('/api/stats/opponent-win-rate', data);
        },
        partnerWinRate(data) {
            return ShuttleAPI.post('/api/stats/partner-win-rate', data);
        },
        teamPlayerWinRate(data) {
            return ShuttleAPI.post('/api/stats/team-player-win-rate', data);
        }
    },

    teams: {
        list() {
            return ShuttleAPI.get('/api/teams');
        },
        create(name) {
            return ShuttleAPI.post('/api/teams', { name });
        },
        resolve(name, invite_code) {
            return ShuttleAPI.post('/api/teams/resolve', { name, invite_code });
        },
        get(id) {
            return ShuttleAPI.get('/api/teams/' + id);
        },
        join(id, invite_code, action, bind_player_id) {
            const data = { invite_code, action };
            if (bind_player_id) data.bind_player_id = bind_player_id;
            return ShuttleAPI.post('/api/teams/' + id + '/join', data);
        },
        leave(id) {
            return ShuttleAPI.post('/api/teams/' + id + '/leave', {});
        },
        refreshInviteCode(id) {
            return ShuttleAPI.post('/api/teams/' + id + '/invite-code', {});
        },
        getPlayers(id) {
            return ShuttleAPI.get('/api/teams/' + id + '/players');
        },
        addPlayer(id, name, gender) {
            return ShuttleAPI.post('/api/teams/' + id + '/players', { name, gender });
        }
    },

    admin: {
        login(account, password) {
            return ShuttleAPI.post('/api/admin/auth/login', { account, password }, { admin: true });
        },
        getAdmins() {
            return ShuttleAPI.get('/api/admin/admins', true);
        },
        createAdmin(account, password) {
            return ShuttleAPI.post('/api/admin/admins', { account, password }, { admin: true });
        },
        toggleAdminStatus(admin_id) {
            return ShuttleAPI.post('/api/admin/admins/status', { admin_id }, { admin: true });
        },
        resetAdminPassword(admin_id, new_password) {
            return ShuttleAPI.post('/api/admin/admins/reset-password', { admin_id, new_password }, { admin: true });
        },
        deleteAdmin(admin_id) {
            return ShuttleAPI.post('/api/admin/admins/delete', { admin_id }, { admin: true });
        },
        getUsers(page, page_size) {
            return ShuttleAPI.get(`/api/admin/users?page=${page}&page_size=${page_size}`, true);
        },
        toggleUserStatus(user_id) {
            return ShuttleAPI.post('/api/admin/users/status', { user_id }, { admin: true });
        },
        queryMatches(data) {
            return ShuttleAPI.post('/api/admin/matches/query', data, { admin: true });
        },
        deleteMatch(match_id) {
            return ShuttleAPI.post('/api/admin/matches/delete', { match_id }, { admin: true });
        },
        getPlayers(page, page_size) {
            return ShuttleAPI.get(`/api/admin/players?page=${page}&page_size=${page_size}`, true);
        },
        updatePlayer(player_id, data) {
            return ShuttleAPI.post('/api/admin/players/update', { player_id, ...data }, { admin: true });
        },
        deletePlayer(player_id) {
            return ShuttleAPI.post('/api/admin/players/delete', { player_id }, { admin: true });
        },
        getSettings() {
            return ShuttleAPI.get('/api/admin/settings', true);
        },
        updateSettings(items) {
            return ShuttleAPI.post('/api/admin/settings/update', { items }, { admin: true });
        },
        getTeams(page, page_size, search) {
            let url = `/api/admin/teams?page=${page}&page_size=${page_size}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;
            return ShuttleAPI.get(url, true);
        },
        getTeam(team_id) {
            return ShuttleAPI.get(`/api/admin/teams/${team_id}`, true);
        },
        deleteTeam(team_id) {
            return ShuttleAPI.post('/api/admin/teams/delete', { team_id }, { admin: true });
        },
        getTeamPlayers(team_id) {
            return ShuttleAPI.get(`/api/admin/team-players?team_id=${team_id}`, true);
        },
        deleteTeamPlayer(player_id) {
            return ShuttleAPI.post('/api/admin/team-players/delete', { player_id }, { admin: true });
        }
    }
};
