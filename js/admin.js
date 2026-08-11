/* Admin Dashboard Logic for Dream Travel - User Management & Activity Logging */

let firebaseReady = false;
let currentUserData = null;
let db = null;

// Wait for Firebase initialization
function waitForFirebase() {
    return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
            if (typeof firebase !== 'undefined' && firebase.auth && firebase.firestore) {
                firebaseReady = true;
                clearInterval(checkInterval);
                db = firebase.firestore();
                resolve();
            }
        }, 100);
        
        setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
        }, 10000);
    });
}

const AdminService = {
    // Initialize admin dashboard
    init: async function() {
        await waitForFirebase();
        
        if (!firebaseReady) {
            this.showError('Firebase not initialized. Please refresh the page.');
            return;
        }
        
        document.addEventListener('DOMContentLoaded', () => {
            this.checkAdminAccess();
        });
    },

    // Check if current user is admin and has access
    checkAdminAccess: async function() {
        try {
            const currentAuth = firebase.auth().currentUser;
            
            if (!currentAuth) {
                window.location.href = 'login.html';
                return;
            }
            
            // Get user profile from Firestore
            const userDoc = await db.collection('users').doc(currentAuth.uid).get();
            
            if (!userDoc.exists || userDoc.data().role !== 'admin') {
                this.showAccessDenied();
                return;
            }
            
            currentUserData = { uid: currentAuth.uid, ...userDoc.data() };
            
            // Setup admin UI
            this.setupAdminUI();
            this.loadDashboardStats();
            this.loadRecentActivity();
            this.loadUsersList();
            this.setupEventListeners();
        } catch (error) {
            console.error('Error checking admin access:', error);
            this.showError('An error occurred. Please try again.');
        }
    },

    // Show access denied message
    showAccessDenied: function() {
        const content = document.querySelector('main') || document.body;
        content.innerHTML = `
            <div class="container d-flex justify-content-center align-items-center" style="height: 100vh;">
                <div class="glass-card p-5 text-center" style="max-width: 400px;">
                    <i class="fa-solid fa-shield-halved fa-3x mb-3" style="color: #e74c3c;"></i>
                    <h2 class="font-weight-bold mb-3">Access Denied</h2>
                    <p class="text-muted mb-4">You do not have permission to access the admin dashboard. Only administrators can access this area.</p>
                    <a href="index.html" class="btn-premium">Back to Home</a>
                </div>
            </div>
        `;
    },

    // Show error message
    showError: function(message) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification position-fixed bottom-0 end-0 m-3 p-3 rounded-3 bg-danger text-white';
        toast.style.zIndex = '9999';
        toast.innerHTML = `
            <i class="fa-solid fa-circle-exclamation me-2"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.remove(), 5000);
    },

    // Show success message
    showSuccess: function(message) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification position-fixed bottom-0 end-0 m-3 p-3 rounded-3 bg-success text-white';
        toast.style.zIndex = '9999';
        toast.innerHTML = `
            <i class="fa-solid fa-circle-check me-2"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.remove(), 5000);
    },

    // Setup admin UI elements
    setupAdminUI: function() {
        const adminNav = document.getElementById('admin-navbar');
        if (adminNav) {
            const username = currentUserData.displayName || currentUserData.email.split('@')[0];
            adminNav.querySelector('[data-admin-name]').textContent = username;
            adminNav.querySelector('[data-admin-email]').textContent = currentUserData.email;
        }
    },

    // Load recent admin activity
    loadRecentActivity: async function() {
        try {
            const logsSnapshot = await db.collection('adminLogs')
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get();
            
            const logs = logsSnapshot.docs.map(doc => doc.data());
            this.renderActivityLog(logs);
        } catch (error) {
            console.error('Error loading activity logs:', error);
            const container = document.getElementById('recent-activity-list');
            if (container) {
                container.innerHTML = '<p class="text-muted text-center py-4">Failed to load activity logs</p>';
            }
        }
    },

    // Render activity log
    renderActivityLog: function(logs) {
        const container = document.getElementById('recent-activity-list');
        if (!container) return;
        
        if (logs.length === 0) {
            container.innerHTML = '<p class="text-muted text-center py-4">No recent activity</p>';
            return;
        }
        
        const html = logs.map(log => {
            const actionMap = {
                'BAN_USER': { icon: 'fa-ban', color: 'danger', text: 'Banned User' },
                'UNBAN_USER': { icon: 'fa-check', color: 'success', text: 'Unbanned User' },
                'HIDE_USER': { icon: 'fa-eye-slash', color: 'warning', text: 'Hidden User' },
                'UNHIDE_USER': { icon: 'fa-eye', color: 'info', text: 'Unhidden User' },
                'DELETE_USER': { icon: 'fa-trash', color: 'danger', text: 'Deleted User' },
                'PROMOTE_TO_ADMIN': { icon: 'fa-shield-halved', color: 'primary', text: 'Promoted to Admin' },
                'CREATE_ADMIN': { icon: 'fa-user-plus', color: 'primary', text: 'Created Admin' }
            };
            
            const actionInfo = actionMap[log.action] || { icon: 'fa-gear', color: 'secondary', text: log.action };
            
            return `
                <div class="d-flex align-items-center gap-3 p-3 border-bottom" style="border-color: var(--border-color);">
                    <div class="icon-container" style="width: 40px; height: 40px; background: var(--bg-hover); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <i class="fa-solid ${actionInfo.icon}" style="color: var(--primary-accent);"></i>
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div class="fw-bold">${actionInfo.text}</div>
                        <div class="text-muted small">
                            Admin: <strong>${log.adminEmail}</strong> → Target: <strong>${log.targetUserEmail}</strong>
                        </div>
                        <div class="text-muted small">${this.formatDate(log.timestamp)}</div>
                    </div>
                    <span class="badge bg-${actionInfo.color} rounded-pill">${actionInfo.text}</span>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
    },
        try {
            const usersSnapshot = await db.collection('users').get();
            const users = usersSnapshot.docs.map(doc => doc.data());
            
            const totalUsers = users.length;
            const activeUsers = users.filter(u => u.status === 'active').length;
            const bannedUsers = users.filter(u => u.status === 'banned').length;
            const hiddenUsers = users.filter(u => u.status === 'hidden').length;
            const admins = users.filter(u => u.role === 'admin').length;
            
            // Get new users from last 7 days
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const newUsers = users.filter(u => {
                const created = u.createdAt && u.createdAt.toDate ? u.createdAt.toDate() : new Date(u.createdAt);
                return created >= sevenDaysAgo;
            }).length;
            
            // Update dashboard cards
            this.updateStatCard('total-users', totalUsers);
            this.updateStatCard('active-users', activeUsers);
            this.updateStatCard('banned-users', bannedUsers);
            this.updateStatCard('hidden-users', hiddenUsers);
            this.updateStatCard('admin-count', admins);
            this.updateStatCard('new-users', newUsers);
            
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            this.showError('Failed to load dashboard statistics.');
        }
    },

    // Update a stat card
    updateStatCard: function(elementId, value) {
        const card = document.getElementById(elementId);
        if (card) {
            const numberEl = card.querySelector('.stat-number');
            if (numberEl) {
                numberEl.textContent = value;
            }
        }
    },

    // Load users list with pagination
    loadUsersList: async function(page = 1, searchQuery = '', filterRole = '', filterStatus = '') {
        try {
            const pageSize = 10;
            let query = db.collection('users');
            
            // Apply filters
            if (filterRole && filterRole !== 'all') {
                query = query.where('role', '==', filterRole);
            }
            if (filterStatus && filterStatus !== 'all') {
                query = query.where('status', '==', filterStatus);
            }
            
            const snapshot = await query.get();
            let users = snapshot.docs.map(doc => doc.data());
            
            // Apply search filter
            if (searchQuery) {
                users = users.filter(u => 
                    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (u.displayName && u.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
                );
            }
            
            // Paginate
            const totalPages = Math.ceil(users.length / pageSize);
            const startIndex = (page - 1) * pageSize;
            const paginatedUsers = users.slice(startIndex, startIndex + pageSize);
            
            this.renderUsersTable(paginatedUsers);
            this.renderPagination(page, totalPages, searchQuery, filterRole, filterStatus);
            
        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('Failed to load users list.');
        }
    },

    // Render users table
    renderUsersTable: function(users) {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;
        
        if (users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">No users found</td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = users.map(user => `
            <tr class="user-row" data-user-id="${user.uid}">
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <div class="avatar-mini" style="width: 32px; height: 32px; border-radius: 50%; background: var(--primary-accent); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.85rem;">
                            ${(user.displayName || user.email).substring(0, 1).toUpperCase()}
                        </div>
                        <div>
                            <div class="fw-bold">${user.displayName || 'N/A'}</div>
                            <small class="text-muted">${user.email}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge bg-${user.role === 'admin' ? 'info' : 'secondary'} rounded-pill">
                        ${user.role.toUpperCase()}
                    </span>
                </td>
                <td>
                    <span class="badge bg-${user.status === 'active' ? 'success' : (user.status === 'banned' ? 'danger' : 'warning')} rounded-pill">
                        ${user.status.toUpperCase()}
                    </span>
                </td>
                <td>
                    <small>${this.formatDate(user.createdAt)}</small>
                </td>
                <td>
                    <small>${this.formatDate(user.lastLogin)}</small>
                </td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button type="button" class="btn btn-outline-primary btn-action" data-action="view" data-user-id="${user.uid}" title="View Profile">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        ${user.status === 'active' ? `
                            <button type="button" class="btn btn-outline-danger btn-action" data-action="ban" data-user-id="${user.uid}" title="Ban User">
                                <i class="fa-solid fa-ban"></i>
                            </button>
                            <button type="button" class="btn btn-outline-warning btn-action" data-action="hide" data-user-id="${user.uid}" title="Hide User">
                                <i class="fa-solid fa-eye-slash"></i>
                            </button>
                        ` : user.status === 'banned' ? `
                            <button type="button" class="btn btn-outline-success btn-action" data-action="unban" data-user-id="${user.uid}" title="Unban User">
                                <i class="fa-solid fa-check"></i>
                            </button>
                            <button type="button" class="btn btn-outline-danger btn-action" data-action="delete" data-user-id="${user.uid}" title="Delete User">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        ` : `
                            <button type="button" class="btn btn-outline-info btn-action" data-action="unhide" data-user-id="${user.uid}" title="Unhide User">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                            <button type="button" class="btn btn-outline-danger btn-action" data-action="delete" data-user-id="${user.uid}" title="Delete User">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        `}
                    </div>
                </td>
            </tr>
        `).join('');
        
        // Attach event listeners
        this.attachActionListeners();
    },

    // Render pagination
    renderPagination: function(currentPage, totalPages, searchQuery = '', filterRole = '', filterStatus = '') {
        const container = document.getElementById('users-pagination');
        if (!container || totalPages <= 1) {
            if (container) container.innerHTML = '';
            return;
        }
        
        let html = '<nav><ul class="pagination justify-content-center">';
        
        // Previous button
        if (currentPage > 1) {
            html += `<li class="page-item"><a class="page-link" href="#" onclick="AdminService.loadUsersList(${currentPage - 1}, '${searchQuery}', '${filterRole}', '${filterStatus}'); return false;"><i class="fa-solid fa-chevron-left"></i></a></li>`;
        } else {
            html += '<li class="page-item disabled"><span class="page-link"><i class="fa-solid fa-chevron-left"></i></span></li>';
        }
        
        // Page buttons
        for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
            if (i === currentPage) {
                html += `<li class="page-item active"><span class="page-link">${i}</span></li>`;
            } else {
                html += `<li class="page-item"><a class="page-link" href="#" onclick="AdminService.loadUsersList(${i}, '${searchQuery}', '${filterRole}', '${filterStatus}'); return false;">${i}</a></li>`;
            }
        }
        
        // Next button
        if (currentPage < totalPages) {
            html += `<li class="page-item"><a class="page-link" href="#" onclick="AdminService.loadUsersList(${currentPage + 1}, '${searchQuery}', '${filterRole}', '${filterStatus}'); return false;"><i class="fa-solid fa-chevron-right"></i></a></li>`;
        } else {
            html += '<li class="page-item disabled"><span class="page-link"><i class="fa-solid fa-chevron-right"></i></span></li>';
        }
        
        html += '</ul></nav>';
        container.innerHTML = html;
    },

    // Attach action button listeners
    attachActionListeners: function() {
        document.querySelectorAll('.btn-action').forEach(btn => {
            btn.removeEventListener('click', this.handleAction);
            btn.addEventListener('click', (e) => this.handleAction(e));
        });
    },

    // Handle user actions
    handleAction: async function(e) {
        e.preventDefault();
        const action = e.currentTarget.dataset.action;
        const userId = e.currentTarget.dataset.userId;
        
        switch(action) {
            case 'view':
                AdminService.viewUser(userId);
                break;
            case 'ban':
                AdminService.banUser(userId);
                break;
            case 'unban':
                AdminService.unbanUser(userId);
                break;
            case 'hide':
                AdminService.hideUser(userId);
                break;
            case 'unhide':
                AdminService.unhideUser(userId);
                break;
            case 'delete':
                AdminService.deleteUser(userId);
                break;
        }
    },

    // View user profile
    viewUser: async function(userId) {
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (!userDoc.exists) {
                this.showError('User not found.');
                return;
            }
            
            const user = userDoc.data();
            this.showUserModal(user);
        } catch (error) {
            console.error('Error viewing user:', error);
            this.showError('Failed to load user profile.');
        }
    },

    // Show user details modal
    showUserModal: function(user) {
        const modal = document.createElement('div');
        modal.className = 'modal fade glass-modal';
        modal.id = 'user-detail-modal';
        modal.tabIndex = '-1';
        modal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content glass-modal-content">
                    <div class="modal-header glass-modal-header border-0">
                        <h5 class="modal-title font-weight-bold">User Profile</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="mb-3">
                            <label class="form-label text-muted small">Display Name</label>
                            <input type="text" class="form-control glass-input" value="${user.displayName || 'N/A'}" disabled>
                        </div>
                        <div class="mb-3">
                            <label class="form-label text-muted small">Email</label>
                            <input type="text" class="form-control glass-input" value="${user.email}" disabled>
                        </div>
                        <div class="row mb-3">
                            <div class="col-6">
                                <label class="form-label text-muted small">Role</label>
                                <input type="text" class="form-control glass-input" value="${user.role.toUpperCase()}" disabled>
                            </div>
                            <div class="col-6">
                                <label class="form-label text-muted small">Status</label>
                                <input type="text" class="form-control glass-input" value="${user.status.toUpperCase()}" disabled>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-6">
                                <label class="form-label text-muted small">Created</label>
                                <input type="text" class="form-control glass-input" value="${this.formatDate(user.createdAt)}" disabled>
                            </div>
                            <div class="col-6">
                                <label class="form-label text-muted small">Last Login</label>
                                <input type="text" class="form-control glass-input" value="${this.formatDate(user.lastLogin)}" disabled>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    },

    // Ban user
    banUser: async function(userId) {
        const user = await db.collection('users').doc(userId).get();
        if (!user.exists) return;
        
        const userData = user.data();
        
        // Prevent admin from banning themselves
        if (userId === currentUserData.uid) {
            this.showError('You cannot ban yourself.');
            return;
        }
        
        // Show confirmation modal
        if (!confirm(`Are you sure you want to ban ${userData.displayName || userData.email}?`)) {
            return;
        }
        
        try {
            await db.collection('users').doc(userId).update({
                status: 'banned',
                bannedAt: new Date(),
                bannedBy: currentUserData.uid
            });
            
            // Log admin action
            await this.logAdminAction('BAN_USER', userId, userData.email);
            
            this.showSuccess(`${userData.displayName || userData.email} has been banned.`);
            this.loadUsersList();
        } catch (error) {
            console.error('Error banning user:', error);
            this.showError('Failed to ban user.');
        }
    },

    // Unban user
    unbanUser: async function(userId) {
        const user = await db.collection('users').doc(userId).get();
        if (!user.exists) return;
        
        const userData = user.data();
        
        try {
            await db.collection('users').doc(userId).update({
                status: 'active',
                bannedAt: null,
                bannedBy: null
            });
            
            // Log admin action
            await this.logAdminAction('UNBAN_USER', userId, userData.email);
            
            this.showSuccess(`${userData.displayName || userData.email} has been unbanned.`);
            this.loadUsersList();
        } catch (error) {
            console.error('Error unbanning user:', error);
            this.showError('Failed to unban user.');
        }
    },

    // Hide user
    hideUser: async function(userId) {
        const user = await db.collection('users').doc(userId).get();
        if (!user.exists) return;
        
        const userData = user.data();
        
        try {
            await db.collection('users').doc(userId).update({
                status: 'hidden',
                hiddenAt: new Date(),
                hiddenBy: currentUserData.uid
            });
            
            // Log admin action
            await this.logAdminAction('HIDE_USER', userId, userData.email);
            
            this.showSuccess(`${userData.displayName || userData.email} has been hidden.`);
            this.loadUsersList();
        } catch (error) {
            console.error('Error hiding user:', error);
            this.showError('Failed to hide user.');
        }
    },

    // Unhide user
    unhideUser: async function(userId) {
        const user = await db.collection('users').doc(userId).get();
        if (!user.exists) return;
        
        const userData = user.data();
        
        try {
            await db.collection('users').doc(userId).update({
                status: 'active',
                hiddenAt: null,
                hiddenBy: null
            });
            
            // Log admin action
            await this.logAdminAction('UNHIDE_USER', userId, userData.email);
            
            this.showSuccess(`${userData.displayName || userData.email} has been unhidden.`);
            this.loadUsersList();
        } catch (error) {
            console.error('Error unhiding user:', error);
            this.showError('Failed to unhide user.');
        }
    },

    // Delete user
    deleteUser: async function(userId) {
        const user = await db.collection('users').doc(userId).get();
        if (!user.exists) return;
        
        const userData = user.data();
        
        // Prevent admin from deleting themselves
        if (userId === currentUserData.uid) {
            this.showError('You cannot delete your own account.');
            return;
        }
        
        if (!confirm(`Are you sure you want to permanently delete ${userData.displayName || userData.email}? This action cannot be undone.`)) {
            return;
        }
        
        try {
            // Delete from Firestore
            await db.collection('users').doc(userId).delete();
            
            // Log admin action
            await this.logAdminAction('DELETE_USER', userId, userData.email);
            
            this.showSuccess(`${userData.displayName || userData.email} has been deleted.`);
            this.loadUsersList();
        } catch (error) {
            console.error('Error deleting user:', error);
            this.showError('Failed to delete user. Note: Firebase Authentication account must be deleted separately.');
        }
    },

    // Log admin activity
    logAdminAction: async function(action, targetUserId, targetUserEmail) {
        try {
            await db.collection('adminLogs').add({
                action: action,
                adminUid: currentUserData.uid,
                adminEmail: currentUserData.email,
                targetUserId: targetUserId,
                targetUserEmail: targetUserEmail,
                timestamp: new Date(),
                details: {
                    ipAddress: 'N/A',
                    userAgent: navigator.userAgent
                }
            });
        } catch (error) {
            console.error('Error logging admin action:', error);
        }
    },

    // Setup event listeners
    setupEventListeners: function() {
        // Search
        const searchInput = document.getElementById('users-search');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    const filterRole = document.getElementById('filter-role')?.value || '';
                    const filterStatus = document.getElementById('filter-status')?.value || '';
                    this.loadUsersList(1, e.target.value, filterRole, filterStatus);
                }, 500);
            });
        }
        
        // Filter by role
        const filterRole = document.getElementById('filter-role');
        if (filterRole) {
            filterRole.addEventListener('change', (e) => {
                const searchQuery = document.getElementById('users-search')?.value || '';
                const filterStatus = document.getElementById('filter-status')?.value || '';
                this.loadUsersList(1, searchQuery, e.target.value, filterStatus);
            });
        }
        
        // Filter by status
        const filterStatus = document.getElementById('filter-status');
        if (filterStatus) {
            filterStatus.addEventListener('change', (e) => {
                const searchQuery = document.getElementById('users-search')?.value || '';
                const filterRole = document.getElementById('filter-role')?.value || '';
                this.loadUsersList(1, searchQuery, filterRole, e.target.value);
            });
        }
        
        // Logout button
        const logoutBtn = document.getElementById('admin-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                firebase.auth().signOut().then(() => {
                    window.location.href = 'index.html';
                });
            });
        }
        
        // Back to Dream Travel button
        const backBtn = document.getElementById('admin-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = 'index.html';
            });
        }
        
        // Activity section - load full logs when clicked
        document.querySelectorAll('[data-section="activity"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.loadFullActivityLog();
            });
        });
    },

    // Load full activity log
    loadFullActivityLog: async function() {
        try {
            const logsSnapshot = await db.collection('adminLogs')
                .orderBy('timestamp', 'desc')
                .limit(100)
                .get();
            
            const logs = logsSnapshot.docs.map(doc => doc.data());
            this.renderFullActivityLog(logs);
        } catch (error) {
            console.error('Error loading full activity logs:', error);
            this.showError('Failed to load activity logs.');
        }
    },

    // Render full activity log
    renderFullActivityLog: function(logs) {
        const container = document.getElementById('activity-log-list');
        if (!container) return;
        
        if (logs.length === 0) {
            container.innerHTML = '<p class="text-muted text-center py-4">No activity recorded</p>';
            return;
        }
        
        const actionMap = {
            'BAN_USER': { icon: 'fa-ban', color: 'danger', text: 'Banned User' },
            'UNBAN_USER': { icon: 'fa-check', color: 'success', text: 'Unbanned User' },
            'HIDE_USER': { icon: 'fa-eye-slash', color: 'warning', text: 'Hidden User' },
            'UNHIDE_USER': { icon: 'fa-eye', color: 'info', text: 'Unhidden User' },
            'DELETE_USER': { icon: 'fa-trash', color: 'danger', text: 'Deleted User' },
            'PROMOTE_TO_ADMIN': { icon: 'fa-shield-halved', color: 'primary', text: 'Promoted to Admin' },
            'CREATE_ADMIN': { icon: 'fa-user-plus', color: 'primary', text: 'Created Admin' }
        };
        
        const html = `
            <div class="users-table-wrapper">
                <table class="users-table">
                    <thead>
                        <tr>
                            <th>Action</th>
                            <th>Admin</th>
                            <th>Target User</th>
                            <th>Timestamp</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${logs.map(log => {
                            const actionInfo = actionMap[log.action] || { icon: 'fa-gear', color: 'secondary', text: log.action };
                            return `
                                <tr>
                                    <td>
                                        <span class="badge bg-${actionInfo.color} rounded-pill">
                                            <i class="fa-solid ${actionInfo.icon}"></i> ${actionInfo.text}
                                        </span>
                                    </td>
                                    <td>${log.adminEmail}</td>
                                    <td>${log.targetUserEmail}</td>
                                    <td><small>${this.formatDate(log.timestamp)}</small></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        container.innerHTML = html;
    },

    // Format date for display
    formatDate: function(date) {
        if (!date) return 'N/A';
        
        let actualDate;
        if (date.toDate && typeof date.toDate === 'function') {
            actualDate = date.toDate();
        } else if (date instanceof Date) {
            actualDate = date;
        } else if (typeof date === 'string') {
            actualDate = new Date(date);
        } else {
            return 'N/A';
        }
        
        return actualDate.toLocaleDateString() + ' ' + actualDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
};

AdminService.init();
