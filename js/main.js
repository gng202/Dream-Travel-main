/* Main script for global site functions and helpers - Dream Travel */

// Currency state: USD or VND
let currentCurrency = localStorage.getItem('dream_travel_currency') || 'USD';
const EXCHANGE_RATE = 25400; // 1 USD = 25,400 VND

const MainApp = {
    init: function() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupNavbarScroll();
            this.setupCustomCursor();
            this.setupBackToTop();
            this.setupLazyLoading();
            this.setupFavorites();
            this.setupCurrencyToggler();
            this.setupRecentlyViewed();
            this.setupBookingHandlers();
            this.setupLoadingScreen();
        });
    },

    setupLoadingScreen: function() {
        const loader = document.getElementById('loading-screen');
        if (loader) {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    loader.style.opacity = '0';
                    loader.style.visibility = 'hidden';
                }, 400); // Small delay to feel smooth
            });
        }
    },

    setupNavbarScroll: function() {
        const nav = document.querySelector('.navbar-custom');
        if (!nav) return;
        
        const checkScroll = () => {
            if (window.scrollY > 40) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
        };
        
        window.addEventListener('scroll', checkScroll);
        checkScroll();
    },

    setupCustomCursor: function() {
        // Only run on desktop
        if (window.matchMedia('(max-width: 767.98px)').matches) return;
        
        const cursor = document.createElement('div');
        cursor.className = 'custom-cursor';
        const cursorDot = document.createElement('div');
        cursorDot.className = 'custom-cursor-dot';
        
        document.body.appendChild(cursor);
        document.body.appendChild(cursorDot);
        
        document.addEventListener('mousemove', (e) => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
            
            cursorDot.style.left = e.clientX + 'px';
            cursorDot.style.top = e.clientY + 'px';
        });

        // Hover expansions
        const hoverables = 'a, button, .btn, input, select, textarea, [role="button"], .user-avatar';
        document.addEventListener('mouseover', (e) => {
            if (e.target.closest(hoverables)) {
                cursor.classList.add('hovered-link');
            }
        });
        document.addEventListener('mouseout', (e) => {
            if (e.target.closest(hoverables)) {
                cursor.classList.remove('hovered-link');
            }
        });
    },

    setupBackToTop: function() {
        const btn = document.getElementById('back-to-top-btn');
        if (!btn) return;
        
        window.addEventListener('scroll', () => {
            if (window.scrollY > 400) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        btn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    },

    setupLazyLoading: function() {
        // Native loading="lazy" is highly supported, but we add custom fade-in on load as well
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            if (!img.getAttribute('loading')) {
                img.setAttribute('loading', 'lazy');
            }
            img.style.transition = 'opacity 0.5s ease-in-out';
            img.addEventListener('load', () => {
                img.style.opacity = '1';
            });
        });
    },

    setupFavorites: function() {
        // Retrieve favorites array
        window.getFavorites = function() {
            return JSON.parse(localStorage.getItem('dream_travel_favs')) || [];
        };

        window.toggleFavorite = function(destId) {
            let favs = getFavorites();
            const index = favs.indexOf(destId);
            if (index === -1) {
                favs.push(destId);
            } else {
                favs.splice(index, 1);
            }
            localStorage.setItem('dream_travel_favs', JSON.stringify(favs));
            
            // Dispatch dynamic event for updates
            document.dispatchEvent(new CustomEvent('favoritesChanged'));
            return index === -1; // returns true if added, false if removed
        };
    },

    formatPrice: function(usdPrice) {
        if (currentCurrency === 'VND') {
            const vndVal = Math.round(usdPrice * EXCHANGE_RATE);
            return new Intl.NumberFormat('vi-VN').format(vndVal) + ' ₫';
        }
        return '$' + usdPrice;
    },

    setupCurrencyToggler: function() {
        const currBtn = document.getElementById('currency-toggle-btn');
        if (!currBtn) return;

        const updateCurrencyText = () => {
            currBtn.innerHTML = currentCurrency === 'USD' ? '<i class="fa-solid fa-dollar-sign"></i> USD' : '<i class="fa-solid fa-dong-sign"></i> VND';
        };

        updateCurrencyText();

        currBtn.addEventListener('click', () => {
            currentCurrency = currentCurrency === 'USD' ? 'VND' : 'USD';
            localStorage.setItem('dream_travel_currency', currentCurrency);
            updateCurrencyText();
            
            // Re-render prices dynamically
            document.dispatchEvent(new CustomEvent('currencyChanged'));
            // Re-scan lang translations if pricing text updates
            if (window.LanguageEngine) {
                window.LanguageEngine.translatePage();
            }
        });
    },

    setupRecentlyViewed: function() {
        window.trackViewedDestination = function(destId) {
            let viewed = JSON.parse(sessionStorage.getItem('dream_travel_recently_viewed')) || [];
            // Remove duplicates
            viewed = viewed.filter(id => id !== destId);
            viewed.unshift(destId);
            if (viewed.length > 5) viewed.pop(); // keep top 5
            sessionStorage.setItem('dream_travel_recently_viewed', JSON.stringify(viewed));
        };
    },

    setupBookingHandlers: function() {
        // Shared Booking Modal Logic
        window.openBookingModal = function(itemName, price, itemType = 'destination') {
            // Find or create booking modal dynamically to ensure compatibility across all pages
            let modalEl = document.getElementById('global-booking-modal');
            if (!modalEl) {
                const modalHTML = `
                    <div class="modal fade glass-modal" id="global-booking-modal" tabindex="-1" aria-hidden="true">
                        <div class="modal-dialog modal-dialog-centered">
                            <div class="modal-content glass-modal-content">
                                <div class="modal-header glass-modal-header border-0">
                                    <h5 class="modal-title font-weight-bold" id="booking-modal-title">Book Vacation</h5>
                                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                                </div>
                                <div class="modal-body p-4">
                                    <form id="global-booking-form">
                                        <div class="mb-3">
                                            <label class="form-label text-muted" data-i18n="contact.name">Full Name</label>
                                            <input type="text" class="form-control glass-input" id="book-name" required>
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label text-muted" data-i18n="contact.email">Email Address</label>
                                            <input type="email" class="form-control glass-input" id="book-email" required>
                                        </div>
                                        <div class="row mb-3">
                                            <div class="col-6">
                                                <label class="form-label text-muted">Travel Date</label>
                                                <input type="date" class="form-control glass-input" id="book-date" required>
                                            </div>
                                            <div class="col-6">
                                                <label class="form-label text-muted" data-i18n="aiplanner.label.people">People</label>
                                                <input type="number" class="form-control glass-input" id="book-guests" min="1" value="1" required>
                                            </div>
                                        </div>
                                        <div class="p-3 mb-4 rounded-3 bg-opacity-10 bg-info border border-info border-opacity-20 d-flex justify-content-between align-items-center">
                                            <div>
                                                <span class="small text-muted d-block">Estimated Total</span>
                                                <strong class="fs-4" id="book-estimated-cost">$0</strong>
                                            </div>
                                            <span class="badge bg-primary px-3 py-2 rounded-pill" id="book-item-badge">Package</span>
                                        </div>
                                        <button type="submit" class="btn btn-premium w-100 py-3 justify-content-center">Confirm Booking</button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                document.body.insertAdjacentHTML('beforeend', modalHTML);
                modalEl = document.getElementById('global-booking-modal');
            }

            // Populate fields
            document.getElementById('booking-modal-title').innerText = itemName;
            document.getElementById('book-item-badge').innerText = itemType.toUpperCase();
            
            const basePrice = price;
            const costEl = document.getElementById('book-estimated-cost');
            const guestsEl = document.getElementById('book-guests');
            
            const updateCost = () => {
                const guests = parseInt(guestsEl.value) || 1;
                costEl.innerText = MainApp.formatPrice(basePrice * guests);
            };
            
            guestsEl.addEventListener('input', updateCost);
            updateCost();

            // Set current logged in user details if available
            const currentUser = JSON.parse(sessionStorage.getItem('dream_travel_logged_in') || localStorage.getItem('dream_travel_logged_in'));
            if (currentUser) {
                document.getElementById('book-name').value = currentUser.name || '';
                document.getElementById('book-email').value = currentUser.email || '';
            }

            const modal = new bootstrap.Modal(modalEl);
            modal.show();

            const form = document.getElementById('global-booking-form');
            form.onsubmit = (e) => {
                e.preventDefault();
                alert(LanguageEngine.currentLang === 'vi' ? 'Đặt phòng thành công! Chúng tôi sẽ liên hệ với bạn qua email sớm nhất.' : 'Booking confirmed! We will contact you via email shortly.');
                modal.hide();
                form.reset();
            };
        };
    }
};

MainApp.init();
