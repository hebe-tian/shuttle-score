const ShuttleAuth = {
    TOKEN_KEY: 'shuttle_token',
    USER_KEY: 'shuttle_user',
    ADMIN_TOKEN_KEY: 'shuttle_admin_token',
    ADMIN_KEY: 'shuttle_admin',

    saveToken(token) {
        localStorage.setItem(this.TOKEN_KEY, token);
    },

    getToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    },

    saveUser(user) {
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    },

    getUser() {
        try {
            const data = localStorage.getItem(this.USER_KEY);
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    },

    isLoggedIn() {
        return !!this.getToken();
    },

    logout() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        window.location.href = '/pages/login.html';
    },

    requireLogin() {
        if (!this.isLoggedIn()) {
            sessionStorage.setItem('redirect_after_login', window.location.href);
            sessionStorage.setItem('login_reason', '请先登录后再访问该页面');
            window.location.href = '/pages/login.html';
            return false;
        }
        return true;
    },

    saveAdminToken(token) {
        localStorage.setItem(this.ADMIN_TOKEN_KEY, token);
    },

    getAdminToken() {
        return localStorage.getItem(this.ADMIN_TOKEN_KEY);
    },

    saveAdmin(admin) {
        localStorage.setItem(this.ADMIN_KEY, JSON.stringify(admin));
    },

    getAdmin() {
        try {
            const data = localStorage.getItem(this.ADMIN_KEY);
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    },

    isAdminLoggedIn() {
        return !!this.getAdminToken();
    },

    adminLogout() {
        localStorage.removeItem(this.ADMIN_TOKEN_KEY);
        localStorage.removeItem(this.ADMIN_KEY);
        window.location.href = '/pages/admin/login.html';
    },

    requireAdmin() {
        if (!this.isAdminLoggedIn()) {
            window.location.href = '/pages/admin/login.html';
            return false;
        }
        return true;
    }
};
