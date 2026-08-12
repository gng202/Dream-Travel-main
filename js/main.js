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
        // The booking modal is now static HTML in each page.
        // We just expose the openBookingModal function and setup the form.
        window.openBookingModal = function(itemName, price, itemType = 'destination') {
            UI.openBookingModal(itemName, price, itemType);
        };

        // Setup the booking form submission once
        UI.setupBookingForm();
        UI.setupBookingButtons();
        UI.setupFavoriteButtons();
        UI.setupDetailsButtons();
    }
};

MainApp.init();