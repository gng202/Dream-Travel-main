/* Swiper Sliders Initialization for Dream Travel */

const SliderService = {
    init: function () {
        const initialize = () => {
            if (typeof Swiper === 'undefined') {
                window.setTimeout(initialize, 100);
                return;
            }
            this.initDestinationsSlider();
            this.initTestimonialsSlider();
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                window.setTimeout(initialize, 100);
            });
        } else {
            window.addEventListener('load', initialize);
            window.setTimeout(initialize, 250);
        }
    },

    initDestinationsSlider: function () {
        const destSlider = document.getElementById('destinations-swiper');
        if (!destSlider) return;

        const wrapper = destSlider.querySelector('.swiper-wrapper');
        if (!wrapper || !wrapper.querySelector('.swiper-slide')) {
            return;
        }

        if (destSlider.swiperInstance) {
            destSlider.swiperInstance.update();
            return;
        }

        destSlider.swiperInstance = new Swiper(destSlider, {
            slidesPerView: 1,
            spaceBetween: 20,
            loop: true,
            autoplay: {
                delay: 3500,
                disableOnInteraction: false,
            },
            pagination: {
                el: '.swiper-pagination-dest',
                clickable: true,
                dynamicBullets: true
            },
            navigation: {
                nextEl: '.swiper-button-next-dest',
                prevEl: '.swiper-button-prev-dest',
            },
            breakpoints: {
                576: {
                    slidesPerView: 2,
                    spaceBetween: 20,
                },
                768: {
                    slidesPerView: 2,
                    spaceBetween: 30,
                },
                992: {
                    slidesPerView: 3,
                    spaceBetween: 30,
                },
                1200: {
                    slidesPerView: 4,
                    spaceBetween: 30,
                }
            }
        });
    },

    initTestimonialsSlider: function () {
        const testSlider = document.getElementById('testimonials-swiper');
        if (!testSlider) return;

        const wrapper = testSlider.querySelector('.swiper-wrapper');
        if (!wrapper || !wrapper.querySelector('.swiper-slide')) {
            return;
        }

        if (testSlider.swiperInstance) {
            testSlider.swiperInstance.update();
            return;
        }

        testSlider.swiperInstance = new Swiper(testSlider, {
            slidesPerView: 1,
            spaceBetween: 20,
            loop: true,
            autoplay: {
                delay: 4500,
                disableOnInteraction: false,
            },
            pagination: {
                el: '.swiper-pagination-test',
                clickable: true,
            },
            breakpoints: {
                768: {
                    slidesPerView: 2,
                    spaceBetween: 30,
                },
                1024: {
                    slidesPerView: 3,
                    spaceBetween: 30,
                }
            }
        });
    }
};

window.SliderService = SliderService;
window.initializeDreamTravelSliders = function () {
    SliderService.initDestinationsSlider();
    SliderService.initTestimonialsSlider();
};

SliderService.init();
