/*
  locations-api.js
  Fetches travel location data from the backend and renders it in card layout.
  It also handles live currency conversion between USD and VND.
*/

const LocationsAPI = (() => {
    const API_URL = '/api/travel';
    const USD_TO_VND = 25400;
    let currency = localStorage.getItem('dream_travel_currency') || 'USD';

    const state = {
        locations: [],
        isLoading: false,
        error: null
    };

    const currencyFormats = {
        USD: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }),
        VND: new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        })
    };

    const getPriceText = (usdNumber) => {
        if (currency === 'VND') {
            return currencyFormats.VND.format(Math.round(usdNumber * USD_TO_VND));
        }
        return currencyFormats.USD.format(usdNumber);
    };

    const setCurrency = (newCurrency) => {
        currency = newCurrency;
        localStorage.setItem('dream_travel_currency', currency);
        const toggleBtn = document.getElementById('api-currency-toggle-btn');
        if (toggleBtn) {
            toggleBtn.textContent = currency === 'USD' ? 'Switch to VND' : 'Switch to USD';
        }
        renderLocations();
    };

    const renderLocations = () => {
        const listEl = document.getElementById('api-locations-list');
        const loadingEl = document.getElementById('api-locations-loading');
        const errorEl = document.getElementById('api-locations-error');

        if (!listEl || !loadingEl || !errorEl) return;

        if (state.isLoading) {
            listEl.classList.add('d-none');
            loadingEl.classList.remove('d-none');
            errorEl.classList.add('d-none');
            return;
        }

        loadingEl.classList.add('d-none');

        if (state.error) {
            listEl.classList.add('d-none');
            errorEl.textContent = state.error;
            errorEl.classList.remove('d-none');
            return;
        }

        if (state.locations.length === 0) {
            listEl.innerHTML = '';
            const emptyCol = document.createElement('div');
            emptyCol.className = 'col-12';
            const alert = document.createElement('div');
            alert.className = 'alert alert-warning';
            alert.textContent = 'No travel locations available right now.';
            emptyCol.appendChild(alert);
            listEl.appendChild(emptyCol);
            listEl.classList.remove('d-none');
            return;
        }

        listEl.innerHTML = '';
        state.locations.forEach(location => {
            const card = UI.createLocationCard(location, {
                currency,
                formatPrice: getPriceText
            });
            if (card) listEl.appendChild(card);
        });
        listEl.classList.remove('d-none');
        errorEl.classList.add('d-none');
    };

    const fetchLocations = async () => {
        state.isLoading = true;
        state.error = null;
        renderLocations();

        try {
            const response = await fetch(API_URL, {
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Unable to load travel data. Status: ${response.status}`);
            }

            const payload = await response.json();
            state.locations = Array.isArray(payload.data) ? payload.data : [];

            // Ensure specialty price fields exist
            state.locations = state.locations.map(location => ({
                ...location,
                specialties: (location.specialties || []).map(item => ({
                    ...item,
                    price_usd: item.price_usd || 20
                }))
            }));
        } catch (error) {
            console.error('Travel API fetch failed:', error);
            state.error = 'Could not load travel locations. Please try again later.';
        } finally {
            state.isLoading = false;
            renderLocations();
        }
    };

    const attachEvents = () => {
        const toggleBtn = document.getElementById('api-currency-toggle-btn');
        if (!toggleBtn) return;

        toggleBtn.addEventListener('click', () => {
            setCurrency(currency === 'USD' ? 'VND' : 'USD');
        });
    };

    const init = () => {
        document.addEventListener('DOMContentLoaded', () => {
            attachEvents();
            fetchLocations();
        });
    };

    return {
        init,
        getCurrentCurrency: () => currency
    };
})();

LocationsAPI.init();