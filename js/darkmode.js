/* Theme Manager (Dark / Light Mode) for Dream Travel */

// Self-invoking function to set theme immediately before page paint
(function() {
    const theme = localStorage.getItem('dream_travel_theme') || 'light';
    if (theme === 'dark') {
        document.documentElement.classList.add('dark-mode');
        // We also apply it to the root class to style components
        document.addEventListener('DOMContentLoaded', () => {
            document.body.classList.add('dark-mode');
            updateThemeIcon(true);
        });
    } else {
        document.documentElement.classList.remove('dark-mode');
        document.addEventListener('DOMContentLoaded', () => {
            document.body.classList.remove('dark-mode');
            updateThemeIcon(false);
        });
    }
})();

// Function to update the theme icon on navbar toggler
function updateThemeIcon(isDark) {
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (!themeBtn) return;
    
    const icon = themeBtn.querySelector('i');
    if (isDark) {
        icon.className = 'fa-solid fa-sun';
    } else {
        icon.className = 'fa-solid fa-moon';
    }
}

// Function to toggle theme dynamically
function toggleTheme() {
    const isDark = document.body.classList.contains('dark-mode');
    if (isDark) {
        document.body.classList.remove('dark-mode');
        document.documentElement.classList.remove('dark-mode');
        localStorage.setItem('dream_travel_theme', 'light');
        updateThemeIcon(false);
    } else {
        document.body.classList.add('dark-mode');
        document.documentElement.classList.add('dark-mode');
        localStorage.setItem('dream_travel_theme', 'dark');
        updateThemeIcon(true);
    }
}

// Initialize theme toggler listener
document.addEventListener('DOMContentLoaded', () => {
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
        themeBtn.addEventListener('click', toggleTheme);
        // Sync icon on DOM load
        const isDark = document.body.classList.contains('dark-mode');
        updateThemeIcon(isDark);
    }
});
