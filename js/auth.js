/* Authentication Logic (Login, Register, Forgot Password) for Dream Travel using Firebase */

// Load Firebase compat SDKs dynamically
const firebaseScripts = [
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js",
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js",
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js",
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics-compat.js"
];

function loadScriptsSequentially(urls) {
    return urls.reduce((promise, url) => {
        return promise.then(() => {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = url;
                script.async = false; // preserve order
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        });
    }, Promise.resolve());
}

let firebaseInitialized = false;

loadScriptsSequentially(firebaseScripts).then(() => {
    const firebaseConfig = {
        apiKey: "AIzaSyAWBEgP3BGkOFMQqe0zF1JtucExZRQ4t90",
        authDomain: "dream-travel-aa812.firebaseapp.com",
        projectId: "dream-travel-aa812",
        storageBucket: "dream-travel-aa812.firebasestorage.app",
        messagingSenderId: "486108903522",
        appId: "1:486108903522:web:f2e6c365557773b90c393b",
        measurementId: "G-8BPDEHKS0F"
    };

    firebase.initializeApp(firebaseConfig);
    firebase.analytics();
    firebaseInitialized = true;

    // Listen for auth state changes to update local storage cache and navbar
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            try {
                // Get user profile from Firestore
                const db = firebase.firestore();
                const userDoc = await db.collection('users').doc(user.uid).get();
                
                if (userDoc.exists) {
                    const userProfile = userDoc.data();
                    
                    // Check if user is banned
                    if (userProfile.status === 'banned') {
                        console.warn('User is banned. Logging out.');
                        // Auto logout banned user
                        firebase.auth().signOut().then(() => {
                            localStorage.removeItem('dream_travel_logged_in');
                            sessionStorage.removeItem('dream_travel_logged_in');
                            localStorage.setItem('auth_error', 'Your account has been banned. Please contact support.');
                            window.location.href = 'login.html';
                        });
                        return;
                    }
                    
                    const userData = {
                        uid: user.uid,
                        name: userProfile.displayName || user.email.split('@')[0],
                        email: user.email,
                        role: userProfile.role || 'user',
                        status: userProfile.status || 'active',
                        photoURL: userProfile.photoURL || null
                    };
                    localStorage.setItem('dream_travel_logged_in', JSON.stringify(userData));
                } else {
                    // Fallback if no Firestore profile exists
                    const userData = {
                        uid: user.uid,
                        name: user.displayName || user.email.split('@')[0],
                        email: user.email,
                        role: 'user',
                        status: 'active',
                        photoURL: user.photoURL || null
                    };
                    localStorage.setItem('dream_travel_logged_in', JSON.stringify(userData));
                }
            } catch (error) {
                console.error('Error fetching user profile:', error);
                // Fallback user data
                const userData = {
                    uid: user.uid,
                    name: user.displayName || user.email.split('@')[0],
                    email: user.email,
                    role: 'user',
                    status: 'active',
                    photoURL: user.photoURL || null
                };
                localStorage.setItem('dream_travel_logged_in', JSON.stringify(userData));
            }
        } else {
            localStorage.removeItem('dream_travel_logged_in');
            sessionStorage.removeItem('dream_travel_logged_in');
        }
        AuthService.updateNavbarAuth();
    });
}).catch(err => {
    console.error("Failed to load Firebase SDKs", err);
});

const AuthService = {
    init: function() {
        document.addEventListener('DOMContentLoaded', () => {
            this.updateNavbarAuth();
            this.bindAuthForms();
        });
    },

    getCurrentUser: function() {
        const sessionUser = sessionStorage.getItem('dream_travel_logged_in');
        if (sessionUser) return JSON.parse(sessionUser);
        
        const localUser = localStorage.getItem('dream_travel_logged_in');
        if (localUser) return JSON.parse(localUser);
        
        return null;
    },

    login: function(email, password, remember) {
        if (!firebaseInitialized) {
            alert(LanguageEngine.currentLang === 'vi' ? 'Firebase đang khởi tạo, vui lòng thử lại sau.' : 'Firebase is initializing, please try again.');
            return;
        }
        const persistence = remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION;
        
        firebase.auth().setPersistence(persistence)
            .then(() => {
                return firebase.auth().signInWithEmailAndPassword(email, password);
            })
            .then(async (userCredential) => {
                // Check user status from Firestore
                const db = firebase.firestore();
                const userDoc = await db.collection('users').doc(userCredential.user.uid).get();
                
                if (userDoc.exists) {
                    const userProfile = userDoc.data();
                    if (userProfile.status === 'banned') {
                        // Logout immediately
                        await firebase.auth().signOut();
                        alert(LanguageEngine.currentLang === 'vi' 
                            ? 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ hỗ trợ.' 
                            : 'Your account has been banned. Please contact support.');
                        return;
                    }
                }
                
                alert(LanguageEngine.currentLang === 'vi' ? 'Đăng nhập thành công!' : 'Login successful!');
                window.location.href = 'index.html';
            })
            .catch((error) => {
                console.error(error);
                let msg = error.message;
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    msg = LanguageEngine.currentLang === 'vi' ? 'Email hoặc mật khẩu không chính xác.' : 'Incorrect email or password.';
                }
                alert(msg);
            });
    },

    logout: function() {
        if (!firebaseInitialized) return;
        firebase.auth().signOut().then(() => {
            sessionStorage.removeItem('dream_travel_logged_in');
            localStorage.removeItem('dream_travel_logged_in');
            window.location.reload();
        }).catch(err => {
            console.error("Logout failed", err);
        });
    },

    updateNavbarAuth: function() {
        const authContainer = document.getElementById('navbar-auth-container');
        if (!authContainer) return;

        const user = this.getCurrentUser();
        if (user) {
            const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'U';
            
            // Build menu items
            let menuItems = `
                <a href="destinations.html?favorites=true" class="user-menu-item">
                    <i class="fa-solid fa-heart text-danger"></i> <span data-i18n="nav.favorites">My Favorites</span>
                </a>
            `;
            
            // Add admin link if user is admin
            if (user.role === 'admin') {
                menuItems += `
                    <a href="admin.html" class="user-menu-item border-top border-opacity-10 border-secondary">
                        <i class="fa-solid fa-shield-admin" style="color: var(--primary-accent);"></i> <span>Admin Dashboard</span>
                    </a>
                `;
            }
            
            menuItems += `
                <a href="#" class="user-menu-item" id="logout-btn">
                    <i class="fa-solid fa-right-from-bracket"></i> <span data-i18n="nav.logout">Sign Out</span>
                </a>
            `;
            
            // Show status badge if not active
            let statusBadge = '';
            if (user.status && user.status !== 'active') {
                const statusColor = user.status === 'banned' ? 'danger' : (user.status === 'hidden' ? 'warning' : 'secondary');
                statusBadge = `<span class="badge bg-${statusColor} position-absolute" style="top: -8px; right: -8px; font-size: 0.65rem;">${user.status.toUpperCase()}</span>`;
            }
            
            authContainer.innerHTML = `
                <div class="user-profile-dropdown" id="user-profile-trigger">
                    <div class="user-avatar" role="button" style="position: relative;">${initials}${statusBadge}</div>
                    <div class="user-menu" id="user-profile-menu">
                        <div class="user-menu-header">
                            <div class="user-menu-name">${user.name}</div>
                            <div class="user-menu-email">${user.email}</div>
                        </div>
                        ${menuItems}
                    </div>
                </div>
            `;
            
            // Setup trigger dropdown
            const trigger = document.getElementById('user-profile-trigger');
            const menu = document.getElementById('user-profile-menu');
            
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.classList.toggle('active');
            });
            
            document.addEventListener('click', () => {
                menu.classList.remove('active');
            });
            
            // Logout binding
            document.getElementById('logout-btn').addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });

            // Translate dynamic nav elements
            if (window.LanguageEngine) {
                window.LanguageEngine.translatePage();
            }
        } else {
            authContainer.innerHTML = `
                <a href="login.html" class="btn-premium" data-i18n="nav.login">Login</a>
            `;
            if (window.LanguageEngine) {
                window.LanguageEngine.translatePage();
            }
        }
    },

    bindAuthForms: function() {
        // Register form
        const regForm = document.getElementById('register-form');
        if (regForm) {
            const showPassBtn = document.getElementById('toggle-password');
            const showPassConfBtn = document.getElementById('toggle-password-confirm');
            const passInput = document.getElementById('reg-password');
            const passConfInput = document.getElementById('reg-password-confirm');

            if (showPassBtn && passInput) {
                showPassBtn.addEventListener('click', () => {
                    const isPass = passInput.type === 'password';
                    passInput.type = isPass ? 'text' : 'password';
                    showPassBtn.querySelector('i').className = isPass ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
                });
            }

            if (showPassConfBtn && passConfInput) {
                showPassConfBtn.addEventListener('click', () => {
                    const isPass = passConfInput.type === 'password';
                    passConfInput.type = isPass ? 'text' : 'password';
                    showPassConfBtn.querySelector('i').className = isPass ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
                });
            }

            regForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('reg-name').value;
                const email = document.getElementById('reg-email').value;
                const password = passInput.value;
                const confirmPassword = passConfInput.value;

                // Simple validations
                if (password.length < 6) {
                    alert(LanguageEngine.currentLang === 'vi' ? 'Mật khẩu phải dài ít nhất 6 ký tự.' : 'Password must be at least 6 characters.');
                    return;
                }
                if (password !== confirmPassword) {
                    alert(LanguageEngine.currentLang === 'vi' ? 'Mật khẩu xác nhận không khớp.' : 'Confirm password does not match.');
                    return;
                }

                if (!firebaseInitialized) {
                    alert(LanguageEngine.currentLang === 'vi' ? 'Firebase đang khởi tạo, vui lòng thử lại sau.' : 'Firebase is initializing, please try again.');
                    return;
                }

                firebase.auth().createUserWithEmailAndPassword(email, password)
                    .then((userCredential) => {
                        return userCredential.user.updateProfile({
                            displayName: name
                        }).then(() => userCredential);
                    })
                    .then(async (userCredential) => {
                        // Create user profile in Firestore
                        const db = firebase.firestore();
                        await db.collection('users').doc(userCredential.user.uid).set({
                            uid: userCredential.user.uid,
                            email: email,
                            displayName: name,
                            photoURL: null,
                            role: 'user',
                            status: 'active',
                            createdAt: new Date(),
                            lastLogin: new Date()
                        });
                        
                        return userCredential;
                    })
                    .then(() => {
                        alert(LanguageEngine.currentLang === 'vi' ? 'Đăng ký thành công! Hãy đăng nhập.' : 'Registration successful! Proceed to Login.');
                        window.location.href = 'login.html';
                    })
                    .catch((error) => {
                        console.error(error);
                        let msg = error.message;
                        if (error.code === 'auth/email-already-in-use') {
                            msg = LanguageEngine.currentLang === 'vi' ? 'Email đã tồn tại trên hệ thống.' : 'Email is already registered.';
                        }
                        alert(msg);
                    });
            });
        }

        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            const showPassBtn = document.getElementById('toggle-password');
            const passInput = document.getElementById('login-password');

            if (showPassBtn && passInput) {
                showPassBtn.addEventListener('click', () => {
                    const isPass = passInput.type === 'password';
                    passInput.type = isPass ? 'text' : 'password';
                    showPassBtn.querySelector('i').className = isPass ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
                });
            }

            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = document.getElementById('login-email').value;
                const password = passInput.value;
                const remember = document.getElementById('remember-me').checked;

                this.login(email, password, remember);
            });
        }

        // Forgot password form
        const forgotForm = document.getElementById('forgot-form');
        if (forgotForm) {
            forgotForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = document.getElementById('forgot-email').value;
                const responseBox = document.getElementById('forgot-response');
                
                if (!firebaseInitialized) {
                    alert(LanguageEngine.currentLang === 'vi' ? 'Firebase đang khởi tạo, vui lòng thử lại sau.' : 'Firebase is initializing, please try again.');
                    return;
                }

                firebase.auth().sendPasswordResetEmail(email)
                    .then(() => {
                        responseBox.className = "alert alert-success d-block";
                        if (LanguageEngine.currentLang === 'vi') {
                            responseBox.innerHTML = `Liên kết đặt lại mật khẩu đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư đến!`;
                        } else {
                            responseBox.innerHTML = `Password reset link has been sent to your email. Please check your inbox!`;
                        }
                    })
                    .catch((error) => {
                        console.error(error);
                        responseBox.className = "alert alert-danger d-block";
                        if (error.code === 'auth/user-not-found') {
                            responseBox.innerText = LanguageEngine.currentLang === 'vi' ? 'Email chưa được đăng ký trong hệ thống!' : 'Email is not registered!';
                        } else {
                            responseBox.innerText = error.message;
                        }
                    });
            });
        }
    }
};

AuthService.init();
