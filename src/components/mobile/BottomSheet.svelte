<!--
    BottomSheet - Draggable bottom sheet with three snap points
    collapsed (80px), half (50%), expanded (90%)
-->
<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import type { BottomSheetPosition } from '../../stores/uiStore';

    export let position: BottomSheetPosition = 'collapsed';

    const dispatch = createEventDispatcher<{
        positionChange: BottomSheetPosition;
    }>();

    // Snap point heights as viewport percentages
    const COLLAPSED_HEIGHT = 80; // px
    const HALF_PERCENT = 50;
    const EXPANDED_PERCENT = 90;

    let sheetElement: HTMLDivElement;
    let isDragging = false;
    let startY = 0;
    let startTranslateY = 0;
    let currentTranslateY = 0;
    let viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

    $: collapsedY = viewportHeight - COLLAPSED_HEIGHT;
    $: halfY = viewportHeight * (1 - HALF_PERCENT / 100);
    $: expandedY = viewportHeight * (1 - EXPANDED_PERCENT / 100);

    $: {
        if (position === 'collapsed') currentTranslateY = collapsedY;
        else if (position === 'half') currentTranslateY = halfY;
        else currentTranslateY = expandedY;
    }

    $: scrollable = position === 'expanded' || position === 'half';

    function handleTouchStart(e: TouchEvent) {
        // Only drag from the handle area
        const target = e.target as HTMLElement;
        if (!target.closest('.bottom-sheet__handle-area')) return;

        isDragging = true;
        startY = e.touches[0].clientY;
        startTranslateY = currentTranslateY;
    }

    function handleTouchMove(e: TouchEvent) {
        if (!isDragging) return;
        e.preventDefault();

        const deltaY = e.touches[0].clientY - startY;
        const newY = Math.max(expandedY, Math.min(collapsedY, startTranslateY + deltaY));
        currentTranslateY = newY;
    }

    function handleTouchEnd(e: TouchEvent) {
        if (!isDragging) return;
        isDragging = false;

        // Calculate velocity for momentum
        const velocity = e.changedTouches[0]?.clientY
            ? (e.changedTouches[0].clientY - startY) / 200
            : 0;

        // Snap to nearest point considering velocity
        const snapPoints: [number, BottomSheetPosition][] = [
            [expandedY, 'expanded'],
            [halfY, 'half'],
            [collapsedY, 'collapsed'],
        ];

        // Adjust target based on velocity (flick gestures)
        let targetY = currentTranslateY + velocity * 100;

        let closest = snapPoints[0];
        let minDist = Infinity;
        for (const sp of snapPoints) {
            const dist = Math.abs(targetY - sp[0]);
            if (dist < minDist) {
                minDist = dist;
                closest = sp;
            }
        }

        const newPosition = closest[1];
        currentTranslateY = closest[0];

        if (newPosition !== position) {
            dispatch('positionChange', newPosition);
        }
    }

    function handleHandleTap() {
        // Cycle through positions on tap
        if (position === 'collapsed') {
            dispatch('positionChange', 'half');
        } else if (position === 'half') {
            dispatch('positionChange', 'expanded');
        } else {
            dispatch('positionChange', 'collapsed');
        }
    }

    onMount(() => {
        const updateViewport = () => { viewportHeight = window.innerHeight; };
        window.addEventListener('resize', updateViewport);
        return () => window.removeEventListener('resize', updateViewport);
    });
</script>

<div
    class="bottom-sheet"
    class:dragging={isDragging}
    bind:this={sheetElement}
    style="top: {currentTranslateY}px"
    on:touchstart={handleTouchStart}
    on:touchmove={handleTouchMove}
    on:touchend={handleTouchEnd}
>
    <!-- Drag handle -->
    <div class="bottom-sheet__handle-area" on:click={handleHandleTap}>
        <div class="bottom-sheet__handle"></div>
    </div>

    <!-- Collapsed content (summary bar) -->
    <div class="bottom-sheet__collapsed-content">
        <slot name="collapsed" />
    </div>

    <!-- Scrollable content area -->
    <div class="bottom-sheet__content" class:scrollable>
        <slot name="content" />
    </div>
</div>

<style lang="less">
    .bottom-sheet {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(30, 30, 46, 0.95);
        border-radius: 16px 16px 0 0;
        box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.4);
        will-change: top;
        transition: top 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        z-index: 1000;
        display: flex;
        flex-direction: column;
        pointer-events: auto;

        &.dragging {
            transition: none;
        }
    }

    .bottom-sheet__handle-area {
        display: flex;
        justify-content: center;
        padding: 12px 0 8px;
        cursor: grab;
        touch-action: none;
        flex-shrink: 0;

        &:active {
            cursor: grabbing;
        }
    }

    .bottom-sheet__handle {
        width: 36px;
        height: 4px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 2px;
    }

    .bottom-sheet__collapsed-content {
        padding: 0 16px 8px;
        flex-shrink: 0;
    }

    .bottom-sheet__content {
        flex: 1;
        overflow: hidden;
        min-height: 0;
        padding-bottom: env(safe-area-inset-bottom, 0px);

        &.scrollable {
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        }
    }
</style>
