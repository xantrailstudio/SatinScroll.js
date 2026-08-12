/**
 * SatinScroll.js
 * Universal Inertia Engine with Smooth Keyboard, Touch, Wheel, and Anchor support.
 */
(function (window, document) {
    'use strict';

    class SatinScroll {
        constructor(options = {}) {
            this.settings = Object.assign({
                lerp: 0.1,             // Scroll inertia dampening
                wheelMultiplier: 1,    // Wheel speed
                touchMultiplier: 1.5,  // Touch mobile speed
                keyMultiplier: 120     // Distance moved per arrow key press
            }, options);

            this.scrollPos = window.pageYOffset;
            this.targetScroll = window.pageYOffset;
            this.maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            
            this.isDraggingTouch = false;
            this.touchStartY = 0;
            this.isAnimatingHash = false;
            this.isInternalScroll = false;
            this.hashStartTime = 0;
            this.hashStartPos = 0;
            this.hashTargetPos = 0;
            this.hashDuration = 2000; // Exactly 2 seconds for any button/anchor jump

            this.init();
        }

        init() {
            this.injectStyles();
            this.createCustomScrollbar();

            window.addEventListener('resize', () => {
                this.maxScroll = document.documentElement.scrollHeight - window.innerHeight;
                this.updateThumb();
            });

            // Sync with browser native scrolls (like Ctrl+F text searches)
            window.addEventListener('scroll', () => {
                if (this.isInternalScroll || this.isAnimatingHash) return;
                
                const currentY = window.pageYOffset;
                if (Math.abs(currentY - this.scrollPos) > 2) {
                    this.scrollPos = currentY;
                    this.targetScroll = currentY;
                }
            });

            // 1. Wheel (Mouse & Trackpad)
            window.addEventListener('wheel', (e) => {
                if (this.isAnimatingHash) return;
                e.preventDefault();
                this.targetScroll += e.deltaY * this.settings.wheelMultiplier;
                this.clampTarget();
            }, { passive: false });

            // 2. Keyboard Navigation (Arrows, Page Up/Down, Spacebar)
            window.addEventListener('keydown', (e) => {
                if (this.isAnimatingHash) return;
                
                // Don't interfere if user is typing in an input or textarea
                if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

                let scrollAmount = 0;

                switch (e.key) {
                    case 'ArrowDown':
                        scrollAmount = this.settings.keyMultiplier;
                        break;
                    case 'ArrowUp':
                        scrollAmount = -this.settings.keyMultiplier;
                        break;
                    case 'PageDown':
                        scrollAmount = window.innerHeight * 0.85;
                        break;
                    case 'PageUp':
                        scrollAmount = -window.innerHeight * 0.85;
                        break;
                    case ' ': // Spacebar
                        scrollAmount = e.shiftKey ? -window.innerHeight * 0.85 : window.innerHeight * 0.85;
                        break;
                    default:
                        return; // Exit if it's not a scroll key
                }

                e.preventDefault();
                this.targetScroll += scrollAmount;
                this.clampTarget();
            });

            // 3. Touch Gestures
            window.addEventListener('touchstart', (e) => {
                if (this.isAnimatingHash) return;
                this.isDraggingTouch = true;
                this.touchStartY = e.touches[0].clientY;
            }, { passive: true });

            window.addEventListener('touchmove', (e) => {
                if (!this.isDraggingTouch || this.isAnimatingHash) return;
                e.preventDefault();
                const deltaY = this.touchStartY - e.touches[0].clientY;
                this.touchStartY = e.touches[0].clientY;
                this.targetScroll += deltaY * this.settings.touchMultiplier;
                this.clampTarget();
            }, { passive: false });

            window.addEventListener('touchend', () => {
                this.isDraggingTouch = false;
            }, { passive: true });

            // 4. Buttons & Anchor Links (Forces exact 2-Second Duration)
            document.addEventListener('click', (e) => {
                const targetAnchor = e.target.closest('a[href^="#"]');
                if (!targetAnchor) return;

                const hash = targetAnchor.getAttribute('href');
                if (hash === '#' || hash.length === 1) return;

                const targetElement = document.querySelector(hash);
                if (targetElement) {
                    e.preventDefault();
                    const targetPos = targetElement.getBoundingClientRect().top + window.pageYOffset;
                    this.startHashAnimation(targetPos);
                    window.history.pushState(null, null, hash);
                }
            });

            this.rafId = requestAnimationFrame(this.render.bind(this));
        }

        injectStyles() {
            const style = document.createElement('style');
            style.innerHTML = `
                /* Hide default scrollbar for Chrome, Safari and Opera */
                ::-webkit-scrollbar { display: none; }
                /* Hide default scrollbar for IE, Edge and Firefox */
                html { -ms-overflow-style: none; scrollbar-width: none; }

                #satin-scrollbar-track {
                    position: fixed;
                    top: 0;
                    right: 0;
                    width: 8px;
                    height: 100vh;
                    background: rgba(0, 0, 0, 0.05);
                    z-index: 99999;
                    pointer-events: none;
                }
                #satin-scrollbar-thumb {
                    position: absolute;
                    top: 0;
                    right: 0;
                    width: 8px;
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 4px;
                    pointer-events: auto;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                #satin-scrollbar-thumb:hover {
                    background: rgba(0, 0, 0, 0.5);
                }
            `;
            document.head.appendChild(style);
        }

        createCustomScrollbar() {
            const track = document.createElement('div');
            track.id = 'satin-scrollbar-track';
            const thumb = document.createElement('div');
            thumb.id = 'satin-scrollbar-thumb';
            track.appendChild(thumb);
            document.body.appendChild(track);

            let isDraggingThumb = false;
            let startY = 0;
            let startScrollTop = 0;

            thumb.addEventListener('mousedown', (e) => {
                isDraggingThumb = true;
                startY = e.clientY;
                startScrollTop = this.targetScroll;
                document.body.style.userSelect = 'none';
            });

            window.addEventListener('mousemove', (e) => {
                if (!isDraggingThumb) return;
                const deltaY = e.clientY - startY;
                const trackHeight = window.innerHeight - thumb.clientHeight;
                const scrollRatio = deltaY / trackHeight;
                this.targetScroll = startScrollTop + (scrollRatio * this.maxScroll);
                this.clampTarget();
            });

            window.addEventListener('mouseup', () => {
                isDraggingThumb = false;
                document.body.style.userSelect = '';
            });

            this.thumbElement = thumb;
        }

        updateThumb() {
            if (!this.thumbElement) return;
            const docHeight = document.documentElement.scrollHeight;
            const winHeight = window.innerHeight;
            const thumbHeight = Math.max((winHeight / docHeight) * winHeight, 30);
            const thumbTop = (this.scrollPos / (docHeight - winHeight)) * (winHeight - thumbHeight);

            this.thumbElement.style.height = `${thumbHeight}px`;
            this.thumbElement.style.transform = `translateY(${thumbTop}px)`;
        }

        startHashAnimation(targetPos) {
            this.isAnimatingHash = true;
            this.hashStartTime = performance.now();
            this.hashStartPos = this.scrollPos;
            this.hashTargetPos = Math.max(0, Math.min(targetPos, this.maxScroll));
        }

        render(currentTime) {
            if (this.isAnimatingHash) {
                const elapsed = currentTime - this.hashStartTime;
                const progress = Math.min(elapsed / this.hashDuration, 1);
                
                // Ease-in-out cubic for smooth 2-second transition
                const ease = progress < 0.5 
                    ? 4 * progress * progress * progress 
                    : (progress - 1) * (2 * progress - 2) * (2 * progress - 2) + 1;

                this.scrollPos = this.hashStartPos + (this.hashTargetPos - this.hashStartPos) * ease;
                this.targetScroll = this.scrollPos;

                if (progress === 1) {
                    this.isAnimatingHash = false;
                }
            } else {
                // Standard Lerp for Inertia
                this.scrollPos += (this.targetScroll - this.scrollPos) * this.settings.lerp;
            }

            this.isInternalScroll = true;
            window.scrollTo(0, this.scrollPos);
            this.isInternalScroll = false;

            this.updateThumb();

            this.rafId = requestAnimationFrame(this.render.bind(this));
        }

        clampTarget() {
            this.targetScroll = Math.max(0, Math.min(this.targetScroll, this.maxScroll));
        }

        destroy() {
            cancelAnimationFrame(this.rafId);
            document.getElementById('satin-scrollbar-track')?.remove();
        }
    }

    window.SatinScroll = SatinScroll;

    document.addEventListener('DOMContentLoaded', () => {
        window.satinScrollInstance = new SatinScroll();
    });

})(window, document);