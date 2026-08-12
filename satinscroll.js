/**
 * SatinScroll.js v2.0 (Production Bulletproof Edition)
 * Universal Inertia Engine with Dynamic Layout Sync, Internal Scroller Support, 
 * Malformed Anchor Fallbacks, and Zero Memory Leaks.
 */
(function (window, document) {
    'use strict';

    class SatinScroll {
        constructor(options = {}) {
            // Prevent double-initialization conflicts
            if (window.satinScrollInstance) {
                window.satinScrollInstance.destroy();
            }
            window.satinScrollInstance = this;

            this.settings = Object.assign({
                lerp: 0.1,             // Scroll inertia dampening
                wheelMultiplier: 1,    // Wheel speed
                touchMultiplier: 1.5,  // Touch mobile speed
                keyMultiplier: 120,    // Arrow keys distance
                anchorDuration: 2000   // Exactly 2 seconds for anchor/button jumps
            }, options);

            this.scrollPos = window.pageYOffset;
            this.targetScroll = window.pageYOffset;
            this.maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
            
            this.isDraggingTouch = false;
            this.touchStartY = 0;
            this.isAnimatingHash = false;
            this.isInternalScroll = false;
            this.hashStartTime = 0;
            this.hashStartPos = 0;
            this.hashTargetPos = 0;

            // Bind methods explicitly to ensure proper memory cleanup on destroy
            this.boundWheel = this.handleWheel.bind(this);
            this.boundKeydown = this.handleKeydown.bind(this);
            this.boundTouchStart = this.handleTouchStart.bind(this);
            this.boundTouchMove = this.handleTouchMove.bind(this);
            this.boundTouchEnd = this.handleTouchEnd.bind(this);
            this.boundScroll = this.handleScroll.bind(this);
            this.boundResize = this.handleResize.bind(this);
            this.boundClick = this.handleClick.bind(this);
            this.boundThumbMouseDown = this.handleThumbMouseDown.bind(this);
            this.boundMouseMove = this.handleMouseMove.bind(this);
            this.boundMouseUp = this.handleMouseUp.bind(this);

            this.init();
        }

        init() {
            this.injectStyles();
            this.createCustomScrollbar();

            window.addEventListener('resize', this.boundResize);
            window.addEventListener('scroll', this.boundScroll, { passive: true });
            window.addEventListener('wheel', this.boundWheel, { passive: false });
            window.addEventListener('keydown', this.boundKeydown);
            window.addEventListener('touchstart', this.boundTouchStart, { passive: true });
            window.addEventListener('touchmove', this.boundTouchMove, { passive: false });
            window.addEventListener('touchend', this.boundTouchEnd, { passive: true });
            document.addEventListener('click', this.boundClick);

            // Observe dynamic layout height modifications automatically
            if (window.ResizeObserver) {
                this.resizeObserver = new ResizeObserver(() => {
                    this.maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
                    this.updateThumb();
                });
                this.resizeObserver.observe(document.body);
            }

            this.rafId = requestAnimationFrame(this.render.bind(this));
        }

        handleWheel(e) {
            if (this.isAnimatingHash) return;

            // Allow normal scrolling inside internal scrollable containers (modals, dropdowns, code boxes)
            let el = e.target;
            while (el && el !== document.body && el !== document.documentElement) {
                const style = window.getComputedStyle(el);
                const overflowY = style.overflowY;
                if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
                    return; 
                }
                el = el.parentElement;
            }

            e.preventDefault();
            this.targetScroll += e.deltaY * this.settings.wheelMultiplier;
            this.clampTarget();
        }

        handleKeydown(e) {
            if (this.isAnimatingHash) return;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

            let scrollAmount = 0;
            switch (e.key) {
                case 'ArrowDown': scrollAmount = this.settings.keyMultiplier; break;
                case 'ArrowUp': scrollAmount = -this.settings.keyMultiplier; break;
                case 'PageDown': scrollAmount = window.innerHeight * 0.85; break;
                case 'PageUp': scrollAmount = -window.innerHeight * 0.85; break;
                case ' ': scrollAmount = e.shiftKey ? -window.innerHeight * 0.85 : window.innerHeight * 0.85; break;
                default: return;
            }

            e.preventDefault();
            this.targetScroll += scrollAmount;
            this.clampTarget();
        }

        handleTouchStart(e) {
            if (this.isAnimatingHash) return;
            this.isDraggingTouch = true;
            this.touchStartY = e.touches[0].clientY;
        }

        handleTouchMove(e) {
            if (!this.isDraggingTouch || this.isAnimatingHash) return;
            e.preventDefault();
            const deltaY = this.touchStartY - e.touches[0].clientY;
            this.touchStartY = e.touches[0].clientY;
            this.targetScroll += deltaY * this.settings.touchMultiplier;
            this.clampTarget();
        }

        handleTouchEnd() {
            this.isDraggingTouch = false;
        }

        handleScroll() {
            if (this.isInternalScroll || this.isAnimatingHash) return;
            const currentY = window.pageYOffset;
            if (Math.abs(currentY - this.scrollPos) > 2) {
                this.scrollPos = currentY;
                this.targetScroll = currentY;
            }
        }

        handleResize() {
            this.maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
            this.updateThumb();
        }

        handleClick(e) {
            const targetAnchor = e.target.closest('a[href^="#"]');
            if (!targetAnchor) return;

            const hash = targetAnchor.getAttribute('href');
            if (hash === '#' || hash.length <= 1) return;

            let targetElement = null;
            try {
                targetElement = document.querySelector(hash);
            } catch (err) {
                // Safe fallback for malformed selectors (e.g., IDs starting with a number)
                const cleanId = hash.replace(/^#/, '');
                targetElement = document.getElementById(cleanId);
            }

            if (targetElement) {
                e.preventDefault();
                const targetPos = targetElement.getBoundingClientRect().top + window.pageYOffset;
                this.startHashAnimation(targetPos);
                try {
                    window.history.pushState(null, null, hash);
                } catch (err) {}
            }
        }

        injectStyles() {
            if (document.getElementById('satin-scroll-styles')) return;
            const style = document.createElement('style');
            style.id = 'satin-scroll-styles';
            style.innerHTML = `
                ::-webkit-scrollbar { display: none; }
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

            this.trackElement = track;
            this.thumbElement = thumb;

            this.isDraggingThumb = false;
            this.thumbStartY = 0;
            this.startScrollTop = 0;

            thumb.addEventListener('mousedown', this.boundThumbMouseDown);
            window.addEventListener('mousemove', this.boundMouseMove);
            window.addEventListener('mouseup', this.boundMouseUp);
        }

        handleThumbMouseDown(e) {
            this.isDraggingThumb = true;
            this.thumbStartY = e.clientY;
            this.startScrollTop = this.targetScroll;
            document.body.style.userSelect = 'none';
        }

        handleMouseMove(e) {
            if (!this.isDraggingThumb || !this.thumbElement || !this.trackElement) return;
            const deltaY = e.clientY - this.thumbStartY;
            const trackHeight = window.innerHeight - this.thumbElement.clientHeight;
            if (trackHeight <= 0) return;
            const scrollRatio = deltaY / trackHeight;
            this.targetScroll = this.startScrollTop + (scrollRatio * this.maxScroll);
            this.clampTarget();
        }

        handleMouseUp() {
            if (this.isDraggingThumb) {
                this.isDraggingThumb = false;
                document.body.style.userSelect = '';
            }
        }

        updateThumb() {
            if (!this.thumbElement || !this.trackElement) return;

            // Hide scrollbar if content is not scrollable (prevents division by zero / NaN)
            if (this.maxScroll <= 0) {
                this.trackElement.style.display = 'none';
                return;
            } else {
                this.trackElement.style.display = 'block';
            }

            const docHeight = document.documentElement.scrollHeight;
            const winHeight = window.innerHeight;
            const thumbHeight = Math.max((winHeight / docHeight) * winHeight, 30);
            const scrollableDistance = docHeight - winHeight;
            
            if (scrollableDistance <= 0) return;
            
            const thumbTop = (this.scrollPos / scrollableDistance) * (winHeight - thumbHeight);

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
                const progress = Math.min(elapsed / this.settings.anchorDuration, 1);
                
                // Ease-in-out cubic for exact 2-second transition
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
            this.maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
            this.targetScroll = Math.max(0, Math.min(this.targetScroll, this.maxScroll));
        }

        destroy() {
            cancelAnimationFrame(this.rafId);

            window.removeEventListener('resize', this.boundResize);
            window.removeEventListener('scroll', this.boundScroll);
            window.removeEventListener('wheel', this.boundWheel);
            window.removeEventListener('keydown', this.boundKeydown);
            window.removeEventListener('touchstart', this.boundTouchStart);
            window.removeEventListener('touchmove', this.boundTouchMove);
            window.removeEventListener('touchend', this.boundTouchEnd);
            document.removeEventListener('click', this.boundClick);

            if (this.thumbElement) {
                this.thumbElement.removeEventListener('mousedown', this.boundThumbMouseDown);
            }
            window.removeEventListener('mousemove', this.boundMouseMove);
            window.removeEventListener('mouseup', this.boundMouseUp);

            if (this.resizeObserver) {
                this.resizeObserver.disconnect();
            }

            document.getElementById('satin-scrollbar-track')?.remove();
            document.getElementById('satin-scroll-styles')?.remove();

            if (window.satinScrollInstance === this) {
                window.satinScrollInstance = null;
            }
        }
    }

    window.SatinScroll = SatinScroll;

    document.addEventListener('DOMContentLoaded', () => {
        if (!window.satinScrollInstance) {
            window.satinScrollInstance = new SatinScroll();
        }
    });

})(window, document);