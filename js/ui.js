/* Shared UI helpers for Dream Travel - card creation, booking modal, toasts */

const UI = {
    /**
     * Create a destination card element from a template
     */
    createDestinationCard(dest, { isVi = false, isFav = false, showDetailsBtn = true } = {}) {
        const template = document.getElementById('destination-card-template');
        if (!template) return null;

        const card = template.content.firstElementChild.cloneNode(true);
        const name = isVi ? dest.name_vi : dest.name_en;
        const country = isVi ? dest.country_vi : dest.country_en;
        const weather = isVi ? dest.weather_vi : dest.weather;
        const description = isVi ? dest.description_vi : dest.description_en;

        card.dataset.destinationId = dest.id;
        card.querySelector('.destination-image').src = dest.image;
        card.querySelector('.destination-image').alt = name;
        card.querySelector('.destination-country').textContent = country;
        card.querySelector('.destination-rating').textContent = dest.rating;
        card.querySelector('.destination-weather').textContent = weather;
        card.querySelector('.destination-title').textContent = name;
        card.querySelector('.destination-description').textContent = description;
        card.querySelector('.destination-price').textContent = MainApp.formatPrice(dest.price);

        const favBtn = card.querySelector('.favorite-btn');
        if (favBtn) {
            favBtn.dataset.destinationId = dest.id;
            favBtn.querySelector('i').className = isFav ? 'fa-solid fa-heart text-danger' : 'fa-regular fa-heart text-danger';
        }

        const detailsBtn = card.querySelector('.view-details-btn');
        if (detailsBtn) {
            detailsBtn.dataset.destinationId = dest.id;
            if (!showDetailsBtn) detailsBtn.remove();
        }

        const bookBtn = card.querySelector('.book-now-btn');
        if (bookBtn) {
            bookBtn.dataset.itemName = name;
            bookBtn.dataset.itemPrice = dest.price;
            bookBtn.dataset.itemType = 'destination';
        }

        return card;
    },

    /**
     * Create a package card element from a template
     */
    createPackageCard(pkg, { isVi = false } = {}) {
        const template = document.getElementById('package-card-template');
        if (!template) return null;

        const card = template.content.firstElementChild.cloneNode(true);
        const name = isVi ? pkg.name_vi : pkg.name_en;
        const desc = isVi ? pkg.description_vi : pkg.description_en;

        card.querySelector('.package-discount').textContent = `-${pkg.discount_pct}% OFF`;
        card.querySelector('.package-rating').textContent = pkg.rating;
        card.querySelector('.package-title').textContent = name;
        card.querySelector('.package-description').textContent = desc;
        card.querySelector('.package-days').textContent = pkg.days;
        card.querySelector('.package-price').textContent = MainApp.formatPrice(pkg.price);

        const bookBtn = card.querySelector('.book-now-btn');
        if (bookBtn) {
            bookBtn.dataset.itemName = name;
            bookBtn.dataset.itemPrice = pkg.price;
            bookBtn.dataset.itemType = 'package';
        }

        return card;
    },

    /**
     * Create a hotel card element from a template
     */
    createHotelCard(hotel, { isVi = false } = {}) {
        const template = document.getElementById('hotel-card-template');
        if (!template) return null;

        const card = template.content.firstElementChild.cloneNode(true);
        const location = isVi ? hotel.location_vi : hotel.location_en;
        const desc = isVi ? hotel.description_vi : hotel.description_en;

        card.querySelector('.hotel-image').src = hotel.image;
        card.querySelector('.hotel-image').alt = hotel.name;
        card.querySelector('.hotel-location').textContent = location;
        card.querySelector('.hotel-title').textContent = hotel.name;
        card.querySelector('.hotel-description').textContent = desc;
        card.querySelector('.hotel-price').textContent = MainApp.formatPrice(hotel.price);

        // Build star icons
        const starsEl = card.querySelector('.hotel-stars');
        if (starsEl) {
            starsEl.innerHTML = '';
            for (let i = 0; i < hotel.stars; i++) {
                const star = document.createElement('i');
                star.className = 'fa-solid fa-star text-warning';
                starsEl.appendChild(star);
                starsEl.appendChild(document.createTextNode(' '));
            }
        }

        const bookBtn = card.querySelector('.book-now-btn');
        if (bookBtn) {
            bookBtn.dataset.itemName = hotel.name;
            bookBtn.dataset.itemPrice = hotel.price;
            bookBtn.dataset.itemType = 'hotel';
        }

        return card;
    },

    /**
     * Create a testimonial slide element from a template
     */
    createTestimonialCard(test, { isVi = false } = {}) {
        const template = document.getElementById('testimonial-card-template');
        if (!template) return null;

        const card = template.content.firstElementChild.cloneNode(true);
        const role = isVi ? test.role_vi : test.role_en;
        const text = isVi ? test.text_vi : test.text_en;

        // Build stars
        const starsEl = card.querySelector('.testimonial-stars');
        if (starsEl) {
            starsEl.innerHTML = '';
            for (let i = 0; i < test.rating; i++) {
                const star = document.createElement('i');
                star.className = 'fa-solid fa-star text-warning';
                starsEl.appendChild(star);
                starsEl.appendChild(document.createTextNode(' '));
            }
        }

        card.querySelector('.testimonial-text').textContent = `"${text}"`;
        card.querySelector('.testimonial-avatar').src = test.avatar;
        card.querySelector('.testimonial-avatar').alt = test.name;
        card.querySelector('.testimonial-name').textContent = test.name;
        card.querySelector('.testimonial-role').textContent = role;

        return card;
    },

    /**
     * Create a destination swiper slide from a template
     */
    createDestinationSlide(dest, { isVi = false } = {}) {
        const template = document.getElementById('destination-slide-template');
        if (!template) return null;

        const slide = template.content.firstElementChild.cloneNode(true);
        const name = isVi ? dest.name_vi : dest.name_en;
        const country = isVi ? dest.country_vi : dest.country_en;
        const desc = isVi ? dest.description_vi : dest.description_en;

        slide.querySelector('.dest-slide-image').src = dest.image;
        slide.querySelector('.dest-slide-image').alt = name;
        slide.querySelector('.dest-slide-country').textContent = country;
        slide.querySelector('.dest-slide-title').textContent = name;
        slide.querySelector('.dest-slide-rating').textContent = dest.rating;
        slide.querySelector('.dest-slide-price').textContent = MainApp.formatPrice(dest.price);
        slide.querySelector('.dest-slide-desc').textContent = desc;

        const bookBtn = slide.querySelector('.book-now-btn');
        if (bookBtn) {
            bookBtn.dataset.itemName = name;
            bookBtn.dataset.itemPrice = dest.price;
            bookBtn.dataset.itemType = 'destination';
        }

        return slide;
    },

    /**
     * Create a gallery item element from a template
     */
    createGalleryItem(item, index, { isVi = false } = {}) {
        const template = document.getElementById('gallery-item-template');
        if (!template) return null;

        const el = template.content.firstElementChild.cloneNode(true);
        const title = isVi ? item.title_vi : item.title_en;

        el.dataset.galleryIndex = index;
        el.querySelector('.gallery-item-img').src = item.img;
        el.querySelector('.gallery-item-img').alt = title;
        el.querySelector('.gallery-item-category').textContent = item.category;
        el.querySelector('.gallery-item-title').textContent = title;

        return el;
    },

    /**
     * Create a FAQ accordion item from a template
     */
    createFaqItem(faq, index, { isVi = false } = {}) {
        const template = document.getElementById('faq-item-template');
        if (!template) return null;

        const el = template.content.firstElementChild.cloneNode(true);
        const question = isVi ? faq.question_vi : faq.question_en;
        const answer = isVi ? faq.answer_vi : faq.answer_en;

        const button = el.querySelector('.accordion-button');
        button.textContent = question;
        button.setAttribute('data-bs-target', `#collapse-${index}`);
        button.setAttribute('aria-controls', `collapse-${index}`);
        if (index === 0) {
            button.classList.remove('collapsed');
            button.setAttribute('aria-expanded', 'true');
        } else {
            button.classList.add('collapsed');
            button.setAttribute('aria-expanded', 'false');
        }

        const collapse = el.querySelector('.accordion-collapse');
        collapse.id = `collapse-${index}`;
        if (index === 0) collapse.classList.add('show');

        el.querySelector('.accordion-body').textContent = answer;

        return el;
    },

    /**
     * Create a location card from a template (for locations-api)
     */
    createLocationCard(location, { currency = 'USD', formatPrice } = {}) {
        const template = document.getElementById('location-card-template');
        if (!template) return null;

        const card = template.content.firstElementChild.cloneNode(true);
        card.querySelector('.location-card-image').src = location.image_url;
        card.querySelector('.location-card-image').alt = location.name;
        card.querySelector('.location-card-title').textContent = location.name;
        card.querySelector('.location-card-description').textContent = location.description;
        card.querySelector('.location-card-specialty-count').textContent = `${location.specialties.length} specialties`;
        card.querySelector('.location-card-currency').textContent = currency;

        const specialtyList = card.querySelector('.specialty-list');
        if (specialtyList) {
            specialtyList.innerHTML = '';
            location.specialties.forEach(spec => {
                const li = document.createElement('li');
                li.className = 'specialty-item';

                const copy = document.createElement('div');
                copy.className = 'specialty-copy';

                const title = document.createElement('div');
                title.className = 'specialty-title';
                title.textContent = spec.name;

                const desc = document.createElement('div');
                desc.className = 'specialty-description';
                desc.textContent = spec.description;

                copy.appendChild(title);
                copy.appendChild(desc);

                const price = document.createElement('span');
                price.className = 'price-badge';
                price.textContent = formatPrice(spec.price_usd);

                li.appendChild(copy);
                li.appendChild(price);
                specialtyList.appendChild(li);
            });
        }

        return card;
    },

    /**
     * Show a toast notification
     */
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast-notification position-fixed bottom-0 end-0 m-3 p-3 rounded-3 text-white bg-${type}`;
        toast.style.zIndex = '9999';

        const icon = document.createElement('i');
        icon.className = type === 'success' ? 'fa-solid fa-circle-check me-2' : 'fa-solid fa-circle-exclamation me-2';
        toast.appendChild(icon);

        const span = document.createElement('span');
        span.textContent = message;
        toast.appendChild(span);

        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    },

    /**
     * Open the global booking modal with item details
     */
    openBookingModal(itemName, price, itemType = 'destination') {
        const modalEl = document.getElementById('global-booking-modal');
        if (!modalEl) return;

        // Populate fields
        document.getElementById('booking-modal-title').textContent = itemName;
        document.getElementById('book-item-badge').textContent = itemType.toUpperCase();

        const basePrice = price;
        const costEl = document.getElementById('book-estimated-cost');
        const guestsEl = document.getElementById('book-guests');

        const updateCost = () => {
            const guests = parseInt(guestsEl.value) || 1;
            costEl.textContent = MainApp.formatPrice(basePrice * guests);
        };

        // Remove old listener to avoid duplicates
        const newGuestsEl = guestsEl.cloneNode(true);
        guestsEl.parentNode.replaceChild(newGuestsEl, guestsEl);
        newGuestsEl.addEventListener('input', updateCost);
        updateCost();

        // Set current logged in user details if available
        const currentUser = JSON.parse(sessionStorage.getItem('dream_travel_logged_in') || localStorage.getItem('dream_travel_logged_in'));
        if (currentUser) {
            document.getElementById('book-name').value = currentUser.name || '';
            document.getElementById('book-email').value = currentUser.email || '';
        }

        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    },

    /**
     * Setup booking modal form submission
     */
    setupBookingForm() {
        const form = document.getElementById('global-booking-form');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const msg = LanguageEngine.currentLang === 'vi'
                ? 'Đặt phòng thành công! Chúng tôi sẽ liên hệ với bạn qua email sớm nhất.'
                : 'Booking confirmed! We will contact you via email shortly.';
            alert(msg);
            const modalEl = document.getElementById('global-booking-modal');
            if (modalEl) {
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
            }
            form.reset();
        });
    },

    /**
     * Setup event delegation for booking buttons across the page
     */
    setupBookingButtons() {
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.book-now-btn');
            if (!btn) return;
            const name = btn.dataset.itemName;
            const price = parseFloat(btn.dataset.itemPrice);
            const type = btn.dataset.itemType || 'destination';
            if (name && !isNaN(price)) {
                UI.openBookingModal(name, price, type);
            }
        });
    },

    /**
     * Setup event delegation for favorite buttons
     */
    setupFavoriteButtons() {
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.favorite-btn');
            if (!btn) return;
            e.stopPropagation();
            const id = btn.dataset.destinationId;
            if (!id) return;
            const added = toggleFavorite(id);
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = added ? 'fa-solid fa-heart text-danger' : 'fa-regular fa-heart text-danger';
            }
        });
    },

    /**
     * Setup event delegation for view details buttons
     */
    setupDetailsButtons() {
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.view-details-btn');
            if (!btn) return;
            const id = btn.dataset.destinationId;
            if (id && window.openDetailsModal) {
                window.openDetailsModal(id);
            }
        });
    }
};

window.UI = UI;