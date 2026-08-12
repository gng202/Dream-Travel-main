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
        content.innerHTML = '';
        
        const container = document.createElement('div');
        container.className = 'container d-flex justify-content-center align-items-center';
        container.style.height = '100vh';
        
        const card = document.createElement('div');
        card.className = 'glass-card p-5 text-center';
        card.style.maxWidth = '400px';
        
        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-shield-halved fa-3x mb-3';
        icon.style.color = '#e74c3c';
        
        const title = document.createElement('h2');
        title.className = 'font-weight-bold mb-3';
        title.textContent = 'Access Denied';
        
        const desc = document.createElement('p');
        desc.className = 'text-muted mb-4';
        desc.textContent = 'You do not have permission to access the admin dashboard. Only administrators can access this area.';
        
        const homeLink = document.createElement('a');
        homeLink.href = 'index.html';
        homeLink.className = 'btn-premium';
        homeLink.textContent = 'Back to Home';
        
        card.appendChild(icon);
        card.appendChild(title);
        card.appendChild(desc);
        card.appendChild(homeLink);
        container.appendChild(card);
        content.appendChild(container);
    },

    // Show error message
    showError: function(message) {
        UI.showToast(message, 'danger');
    },

    // Show success message
    showSuccess: function(message) {
        UI.showToast(message, 'success');
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
                container.innerHTML = '';
                const p = document.createElement('p');
                p.className = 'text-muted text-center py-4';
                p.textContent = 'Failed to load activity logs';
                container.appendChild(p);
            }
        }
    },

    // Render activity log
    renderActivityLog: function(logs) {
        const container = document.getElementById('recent-activity-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (logs.length === 0) {
            const p = document.createElement('p');
            p.className = 'text-muted text-center py-4';
            p.textContent = 'No recent activity';
            container.appendChild(p);
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
        
        logs.forEach(log => {
            const actionInfo = actionMap[log.action] || { icon: 'fa-gear', color: 'secondary', text: log.action };
            
            const row = document.createElement('div');
            row.className = 'd-flex align-items-center gap-3 p-3 border-bottom';
            row.style.borderColor = 'var(--border-color)';
            
            const iconBox = document.createElement('div');
            iconBox.className = 'icon-container';
            iconBox.style.cssText = 'width: 40px; height: 40px; background: var(--bg-hover); border-radius: 50%; display: flex; align-items: center; justify-content: center;';
            const icon = document.createElement('i');
            icon.className = `fa-solid ${actionInfo.icon}`;
            icon.style.color = 'var(--primary-accent)';
            iconBox.appendChild(icon);
            
            const info = document.createElement('div');
            info.style.cssText = 'flex: 1; min-width: 0;';
            
            const actionText = document.createElement('div');
            actionText.className = 'fw-bold';
            actionText.textContent = actionInfo.text;
            
            const details = document.createElement('div');
            details.className = 'text-muted small';
            details.textContent = `Admin: ${log.adminEmail} → Target: ${log.targetUserEmail}`;
            
            const time = document.createElement('div');
            time.className = 'text-muted small';
            time.textContent = this.formatDate(log.timestamp);
            
            info.appendChild(actionText);
            info.appendChild(details);
            info.appendChild(time);
            
            const badge = document.createElement('span');
            badge.className = `badge bg-${actionInfo.color} rounded-pill`;
            badge.textContent = actionInfo.text;
            
            row.appendChild(iconBox);
            row.appendChild(info);
            row.appendChild(badge);
            container.appendChild(row);
        });
    },

    // Load dashboard stats
    loadDashboardStats: async function() {
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
        
        tbody.innerHTML = '';
        
        if (users.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 6;
            td.className = 'text-center text-muted py-4';
            td.textContent = 'No users found';
            tr.appendChild(td);
            tbody.appendChild(tr);
            return;
        }
        
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.className = 'user-row';
            tr.dataset.userId = user.uid;
            
            // User cell
            const userTd = document.createElement('td');
            const userDiv = document.createElement('div');
            userDiv.className = 'd-flex align-items-center gap-2';
            
            const avatar = document.createElement('div');
            avatar.className = 'avatar-mini';
            avatar.style.cssText = 'width: 32px; height: 32px; border-radius: 50%; background: var(--primary-accent); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.85rem;';
            avatar.textContent = (user.displayName || user.email).substring(0, 1).toUpperCase();
            
            const userInfo = document.createElement('div');
            const nameDiv = document.createElement('div');
            nameDiv.className = 'fw-bold';
            nameDiv.textContent = user.displayName || 'N/A';
            const emailDiv = document.createElement('small');
            emailDiv.className = 'text-muted';
            emailDiv.textContent = user.email;
            userInfo.appendChild(nameDiv);
            userInfo.appendChild(emailDiv);
            
            userDiv.appendChild(avatar);
            userDiv.appendChild(userInfo);
            userTd.appendChild(userDiv);
            tr.appendChild(userTd);
            
            // Role cell
            const roleTd = document.createElement('td');
            const roleBadge = document.createElement('span');
            roleBadge.className = `badge bg-${user.role === 'admin' ? 'info' : 'secondary'} rounded-pill`;
            roleBadge.textContent = user.role.toUpperCase();
            roleTd.appendChild(roleBadge);
            tr.appendChild(roleTd);
            
            // Status cell
            const statusTd = document.createElement('td');
            const statusBadge = document.createElement('span');
            const statusColor = user.status === 'active' ? 'success' : (user.status === 'banned' ? 'danger' : 'warning');
            statusBadge.className = `badge bg-${statusColor} rounded-pill`;
            statusBadge.textContent = user.status.toUpperCase();
            statusTd.appendChild(statusBadge);
            tr.appendChild(statusTd);
            
            // Created cell
            const createdTd = document.createElement('td');
            const createdSmall = document.createElement('small');
            createdSmall.textContent = this.formatDate(user.createdAt);
            createdTd.appendChild(createdSmall);
            tr.appendChild(createdTd);
            
            // Last login cell
            const loginTd = document.createElement('td');
            const loginSmall = document.createElement('small');
            loginSmall.textContent = this.formatDate(user.lastLogin);
            loginTd.appendChild(loginSmall);
            tr.appendChild(loginTd);
            
            // Actions cell
            const actionsTd = document.createElement('td');
            const btnGroup = document.createElement('div');
            btnGroup.className = 'btn-group btn-group-sm';
            btnGroup.setAttribute('role', 'group');
            
            const addActionBtn = (action, icon, color, title) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `btn btn-outline-${color} btn-action`;
                btn.dataset.action = action;
                btn.dataset.userId = user.uid;
                btn.title = title;
                const btnIcon = document.createElement('i');
                btnIcon.className = `fa-solid ${icon}`;
                btn.appendChild(btnIcon);
                btnGroup.appendChild(btn);
            };
            
            addActionBtn('view', 'fa-eye', 'primary', 'View Profile');
            
            if (user.status === 'active') {
                addActionBtn('ban', 'fa-ban', 'danger', 'Ban User');
                addActionBtn('hide', 'fa-eye-slash', 'warning', 'Hide User');
            } else if (user.status === 'banned') {
                addActionBtn('unban', 'fa-check', 'success', 'Unban User');
                addActionBtn('delete', 'fa-trash', 'danger', 'Delete User');
            } else {
                addActionBtn('unhide', 'fa-eye', 'info', 'Unhide User');
                addActionBtn('delete', 'fa-trash', 'danger', 'Delete User');
            }
            
            actionsTd.appendChild(btnGroup);
            tr.appendChild(actionsTd);
            
            tbody.appendChild(tr);
        });
        
        // Attach event listeners
        this.attachActionListeners();
    },

    // Render pagination
    renderPagination: function(currentPage, totalPages, searchQuery = '', filterRole = '', filterStatus = '') {
        const container = document.getElementById('users-pagination');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (totalPages <= 1) return;
        
        const nav = document.createElement('nav');
        const ul = document.createElement('ul');
        ul.className = 'pagination justify-content-center';
        
        const createPageLink = (page, label, isActive = false, isDisabled = false) => {
            const li = document.createElement('li');
            li.className = `page-item${isActive ? ' active' : ''}${isDisabled ? ' disabled' : ''}`;
            const a = document.createElement('a');
            a.className = 'page-link';
            a.href = '#';
            if (!isDisabled && !isActive) {
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    AdminService.loadUsersList(page, searchQuery, filterRole, filterStatus);
                });
            }
            a.innerHTML = label;
            li.appendChild(a);
            ul.appendChild(li);
        };
        
        // Previous button
        if (currentPage > 1) {
            createPageLink(currentPage - 1, '<i class="fa-solid fa-chevron-left"></i>');
        } else {
            createPageLink(1, '<i class="fa-solid fa-chevron-left"></i>', false, true);
        }
        
        // Page buttons
        for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
            createPageLink(i, String(i), i === currentPage);
        }
        
        // Next button
        if (currentPage < totalPages) {
            createPageLink(currentPage + 1, '<i class="fa-solid fa-chevron-right"></i>');
        } else {
            createPageLink(totalPages, '<i class="fa-solid fa-chevron-right"></i>', false, true);
        }
        
        nav.appendChild(ul);
        container.appendChild(nav);
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
        // Remove existing modal if any
        const existing = document.getElementById('user-detail-modal');
        if (existing) existing.remove();
        
        const modal = document.createElement('div');
        modal.className = 'modal fade glass-modal';
        modal.id = 'user-detail-modal';
        modal.tabIndex = '-1';
        
        const dialog = document.createElement('div');
        dialog.className = 'modal-dialog modal-dialog-centered';
        
        const content = document.createElement('div');
        content.className = 'modal-content glass-modal-content';
        
        const header = document.createElement('div');
        header.className = 'modal-header glass-modal-header border-0';
        const title = document.createElement('h5');
        title.className = 'modal-title font-weight-bold';
        title.textContent = 'User Profile';
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'btn-close btn-close-white';
        closeBtn.setAttribute('data-bs-dismiss', 'modal');
        closeBtn.setAttribute('aria-label', 'Close');
        header.appendChild(title);
        header.appendChild(closeBtn);
        content.appendChild(header);
        
        const body = document.createElement('div');
        body.className = 'modal-body p-4';
        
        const addField = (label, value) => {
            const mb = document.createElement('div');
            mb.className = 'mb-3';
            const lbl = document.createElement('label');
            lbl.className = 'form-label text-muted small';
            lbl.textContent = label;
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'form-control glass-input';
            input.value = value;
            input.disabled = true;
            mb.appendChild(lbl);
            mb.appendChild(input);
            body.appendChild(mb);
        };
        
        addField('Display Name', user.displayName || 'N/A');
        addField('Email', user.email);
        
        const row = document.createElement('div');
        row.className = 'row mb-3';
        
        const col1 = document.createElement('div');
        col1.className = 'col-6';
        const roleLbl = document.createElement('label');
        roleLbl.className = 'form-label text-muted small';
        roleLbl.textContent = 'Role';
        const roleInput = document.createElement('input');
        roleInput.type = 'text';
        roleInput.className = 'form-control glass-input';
        roleInput.value = user.role.toUpperCase();
        roleInput.disabled = true;
        col1.appendChild(roleLbl);
        col1.appendChild(roleInput);
        
        const col2 = document.createElement('div');
        col2.className = 'col-6';
        const statusLbl = document.createElement('label');
        statusLbl.className = 'form-label text-muted small';
        statusLbl.textContent = 'Status';
        const statusInput = document.createElement('input');
        statusInput.type = 'text';
        statusInput.className = 'form-control glass-input';
        statusInput.value = user.status.toUpperCase();
        statusInput.disabled = true;
        col2.appendChild(statusLbl);
        col2.appendChild(statusInput);
        
        row.appendChild(col1);
        row.appendChild(col2);
        body.appendChild(row);
        
        const row2 = document.createElement('div');
        row2.className = 'row';
        
        const col3 = document.createElement('div');
        col3.className = 'col-6';
        const createdLbl = document.createElement('label');
        createdLbl.className = 'form-label text-muted small';
        createdLbl.textContent = 'Created';
        const createdInput = document.createElement('input');
        createdInput.type = 'text';
        createdInput.className = 'form-control glass-input';
        createdInput.value = this.formatDate(user.createdAt);
        createdInput.disabled = true;
        col3.appendChild(createdLbl);
        col3.appendChild(createdInput);
        
        const col4 = document.createElement('div');
        col4.className = 'col-6';
        const loginLbl = document.createElement('label');
        loginLbl.className = 'form-label text-muted small';
        loginLbl.textContent = 'Last Login';
        const loginInput = document.createElement('input');
        loginInput.type = 'text';
        loginInput.className = 'form-control glass-input';
        loginInput.value = this.formatDate(user.lastLogin);
        loginInput.disabled = true;
        col4.appendChild(loginLbl);
        col4.appendChild(loginInput);
        
        row2.appendChild(col3);
        row2.appendChild(col4);
        body.appendChild(row2);
        
        content.appendChild(body);
        dialog.appendChild(content);
        modal.appendChild(dialog);
        
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
        
        container.innerHTML = '';
        
        if (logs.length === 0) {
            const p = document.createElement('p');
            p.className = 'text-muted text-center py-4';
            p.textContent = 'No activity recorded';
            container.appendChild(p);
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
        
        const wrapper = document.createElement('div');
        wrapper.className = 'users-table-wrapper';
        
        const table = document.createElement('table');
        table.className = 'users-table';
        
        const thead = document.createElement('thead');
        const headRow = document.createElement('tr');
        ['Action', 'Admin', 'Target User', 'Timestamp'].forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            headRow.appendChild(th);
        });
        thead.appendChild(headRow);
        table.appendChild(thead);
        
        const tbody = document.createElement('tbody');
        logs.forEach(log => {
            const actionInfo = actionMap[log.action] || { icon: 'fa-gear', color: 'secondary', text: log.action };
            
            const tr = document.createElement('tr');
            
            const actionTd = document.createElement('td');
            const badge = document.createElement('span');
            badge.className = `badge bg-${actionInfo.color} rounded-pill`;
            const badgeIcon = document.createElement('i');
            badgeIcon.className = `fa-solid ${actionInfo.icon}`;
            badge.appendChild(badgeIcon);
            badge.appendChild(document.createTextNode(' ' + actionInfo.text));
            actionTd.appendChild(badge);
            
            const adminTd = document.createElement('td');
            adminTd.textContent = log.adminEmail;
            
            const targetTd = document.createElement('td');
            targetTd.textContent = log.targetUserEmail;
            
            const timeTd = document.createElement('td');
            const timeSmall = document.createElement('small');
            timeSmall.textContent = this.formatDate(log.timestamp);
            timeTd.appendChild(timeSmall);
            
            tr.appendChild(actionTd);
            tr.appendChild(adminTd);
            tr.appendChild(targetTd);
            tr.appendChild(timeTd);
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        wrapper.appendChild(table);
        container.appendChild(wrapper);
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