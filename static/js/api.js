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
        registerStep2(temp_token, username, gender) {
            return ShuttleAPI.post('/api/auth/register', { step: 2, temp_token, username, gender }, { tempToken: null });
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
        }
    },

    stats: {
        winRate(data) {
            return ShuttleAPI.post('/api/stats/win-rate', data);
        },
        score(data) {
            return ShuttleAPI.post('/api/stats/score', data);
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
        }
    }
};
