/**
 * UI Store - Layout detection and mobile UI state management
 * Handles responsive layout switching between phone, tablet, and desktop modes
 */

import { writable, derived, get, type Writable, type Readable } from 'svelte/store';

export type LayoutMode = 'phone' | 'tablet' | 'desktop';
export type BottomSheetPosition = 'collapsed' | 'half' | 'expanded';

export interface UIState {
    layoutMode: LayoutMode;
    orientation: 'portrait' | 'landscape';
    bottomSheetPosition: BottomSheetPosition;
    isCrosshairMode: boolean;
    isLandscapeProfileMode: boolean;
}

const initialState: UIState = {
    layoutMode: 'desktop',
    orientation: 'portrait',
    bottomSheetPosition: 'collapsed',
    isCrosshairMode: false,
    isLandscapeProfileMode: false,
};

function detectLayoutMode(): LayoutMode {
    const width = window.innerWidth;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (width < 768) return 'phone';
    if (width <= 1024 && isTouchDevice) return 'tablet';
    return 'desktop';
}

function detectOrientation(): 'portrait' | 'landscape' {
    return window.matchMedia('(orientation: landscape)').matches ? 'landscape' : 'portrait';
}

function createUIStore() {
    const { subscribe, set, update }: Writable<UIState> = writable({
        ...initialState,
        layoutMode: typeof window !== 'undefined' ? detectLayoutMode() : 'desktop',
        orientation: typeof window !== 'undefined' ? detectOrientation() : 'portrait',
    });

    let resizeListener: (() => void) | null = null;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    let orientationMql: MediaQueryList | null = null;
    let orientationListener: ((e: MediaQueryListEvent) => void) | null = null;

    return {
        subscribe,

        /**
         * Initialize listeners for resize and orientation changes.
         * Call this once from onMount in plugin.svelte.
         */
        init: () => {
            // Debounced window resize listener for layout mode
            resizeListener = () => {
                if (resizeTimer) clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    const newMode = detectLayoutMode();
                    update(state => {
                        if (state.layoutMode === newMode) return state;
                        // Reset sheet position when layout mode changes
                        return { ...state, layoutMode: newMode, bottomSheetPosition: 'collapsed' };
                    });
                }, 150);
            };
            window.addEventListener('resize', resizeListener);

            // Orientation listener via matchMedia
            orientationMql = window.matchMedia('(orientation: landscape)');
            orientationListener = (e: MediaQueryListEvent) => {
                const newOrientation = e.matches ? 'landscape' : 'portrait';
                update(state => {
                    if (state.orientation === newOrientation) return state;
                    const isPhone = state.layoutMode === 'phone';
                    return {
                        ...state,
                        orientation: newOrientation,
                        // Auto-enter landscape profile on phone landscape, auto-exit on portrait
                        isLandscapeProfileMode: isPhone && newOrientation === 'landscape',
                    };
                });
            };
            orientationMql.addEventListener('change', orientationListener);
        },

        /**
         * Clean up listeners. Call this from onDestroy.
         */
        destroy: () => {
            if (resizeTimer) {
                clearTimeout(resizeTimer);
                resizeTimer = null;
            }
            if (resizeListener) {
                window.removeEventListener('resize', resizeListener);
                resizeListener = null;
            }
            if (orientationMql && orientationListener) {
                orientationMql.removeEventListener('change', orientationListener);
                orientationMql = null;
                orientationListener = null;
            }
        },

        getState: (): UIState => get({ subscribe }),

        setBottomSheetPosition: (position: BottomSheetPosition) => {
            update(state => ({ ...state, bottomSheetPosition: position }));
        },

        setCrosshairMode: (enabled: boolean) => {
            update(state => ({ ...state, isCrosshairMode: enabled }));
        },

        setLandscapeProfileMode: (enabled: boolean) => {
            update(state => ({ ...state, isLandscapeProfileMode: enabled }));
        },

        reset: () => set({ ...initialState }),
    };
}

export const uiStore = createUIStore();

// Derived stores for convenient access
export const layoutMode: Readable<LayoutMode> = derived(
    uiStore,
    $state => $state.layoutMode
);

export const isCrosshairMode: Readable<boolean> = derived(
    uiStore,
    $state => $state.isCrosshairMode
);

export const isLandscapeProfileMode: Readable<boolean> = derived(
    uiStore,
    $state => $state.isLandscapeProfileMode
);
