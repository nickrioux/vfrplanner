<!--
  FloatingWindow.svelte
  A draggable, resizable floating window wrapper component
-->
<script lang="ts">
    import { createEventDispatcher, onMount, onDestroy } from 'svelte';
    import type { FloatingWindowState } from '../types/settings';

    // Props
    export let state: FloatingWindowState;
    export let title: string = 'Window';
    export let minWidth: number = 320;
    export let minHeight: number = 400;

    const dispatch = createEventDispatcher<{
        stateChange: FloatingWindowState;
        close: void;
        modeSwitch: void;
    }>();

    // Internal state
    let isDragging = false;
    let isResizing = false;
    let resizeDirection = '';
    let dragStartX = 0;
    let dragStartY = 0;
    let windowStartX = 0;
    let windowStartY = 0;
    let windowStartWidth = 0;
    let windowStartHeight = 0;
    let windowEl: HTMLElement | null = null;

    // Drag handlers
    function startDrag(e: MouseEvent) {
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        windowStartX = state.x;
        windowStartY = state.y;
        document.addEventListener('mousemove', handleDrag);
        document.addEventListener('mouseup', stopDrag);
        e.preventDefault();
    }

    function handleDrag(e: MouseEvent) {
        if (!isDragging) return;
        const deltaX = e.clientX - dragStartX;
        const deltaY = e.clientY - dragStartY;

        // Calculate new position with bounds checking
        const newX = Math.max(0, Math.min(window.innerWidth - state.width, windowStartX + deltaX));
        const newY = Math.max(0, Math.min(window.innerHeight - 50, windowStartY + deltaY));

        state.x = newX;
        state.y = newY;
    }

    function stopDrag() {
        if (isDragging) {
            isDragging = false;
            document.removeEventListener('mousemove', handleDrag);
            document.removeEventListener('mouseup', stopDrag);
            dispatch('stateChange', { ...state });
        }
    }

    // Resize handlers
    function startResize(e: MouseEvent, direction: string) {
        isResizing = true;
        resizeDirection = direction;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        windowStartX = state.x;
        windowStartY = state.y;
        windowStartWidth = state.width;
        windowStartHeight = state.height;
        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResize);
        e.preventDefault();
        e.stopPropagation();
    }

    function handleResize(e: MouseEvent) {
        if (!isResizing) return;
        const deltaX = e.clientX - dragStartX;
        const deltaY = e.clientY - dragStartY;

        const maxWidth = window.innerWidth - state.x;
        const maxHeight = window.innerHeight - state.y;

        if (resizeDirection.includes('e')) {
            state.width = Math.max(minWidth, Math.min(maxWidth, windowStartWidth + deltaX));
        }
        if (resizeDirection.includes('w')) {
            const newWidth = Math.max(minWidth, windowStartWidth - deltaX);
            const newX = windowStartX + (windowStartWidth - newWidth);
            if (newX >= 0) {
                state.width = newWidth;
                state.x = newX;
            }
        }
        if (resizeDirection.includes('s')) {
            state.height = Math.max(minHeight, Math.min(maxHeight, windowStartHeight + deltaY));
        }
        if (resizeDirection.includes('n')) {
            const newHeight = Math.max(minHeight, windowStartHeight - deltaY);
            const newY = windowStartY + (windowStartHeight - newHeight);
            if (newY >= 0) {
                state.height = newHeight;
                state.y = newY;
            }
        }
    }

    function stopResize() {
        if (isResizing) {
            isResizing = false;
            resizeDirection = '';
            document.removeEventListener('mousemove', handleResize);
            document.removeEventListener('mouseup', stopResize);
            dispatch('stateChange', { ...state });
        }
    }

    // Toggle minimize
    function toggleMinimize() {
        state.minimized = !state.minimized;
        dispatch('stateChange', { ...state });
    }

    // Switch to panel mode
    function handleModeSwitch() {
        dispatch('modeSwitch');
    }

    // Clean up event listeners on destroy
    onDestroy(() => {
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
    });
</script>

<section
    class="floating-window"
    class:minimized={state.minimized}
    class:dragging={isDragging}
    class:resizing={isResizing}
    style="left: {state.x}px; top: {state.y}px; width: {state.width}px; height: {state.minimized ? 'auto' : state.height + 'px'};"
    bind:this={windowEl}
>
    <!-- Header with drag handle -->
    <div class="floating-header" on:mousedown={startDrag}>
        <span class="floating-title">{title}</span>
        <div class="floating-controls">
            <button
                class="floating-btn"
                on:click|stopPropagation={toggleMinimize}
                title={state.minimized ? 'Expand' : 'Minimize'}
            >
                {state.minimized ? '▢' : '−'}
            </button>
            <button
                class="floating-btn"
                on:click|stopPropagation={handleModeSwitch}
                title="Switch to panel mode"
            >
                ⊟
            </button>
        </div>
    </div>

    <!-- Content slot (hidden when minimized) -->
    {#if !state.minimized}
        <div class="floating-content">
            <slot />
        </div>

        <!-- Resize handles -->
        <div class="resize-handle resize-n" on:mousedown={(e) => startResize(e, 'n')}></div>
        <div class="resize-handle resize-s" on:mousedown={(e) => startResize(e, 's')}></div>
        <div class="resize-handle resize-e" on:mousedown={(e) => startResize(e, 'e')}></div>
        <div class="resize-handle resize-w" on:mousedown={(e) => startResize(e, 'w')}></div>
        <div class="resize-handle resize-ne" on:mousedown={(e) => startResize(e, 'ne')}></div>
        <div class="resize-handle resize-nw" on:mousedown={(e) => startResize(e, 'nw')}></div>
        <div class="resize-handle resize-se" on:mousedown={(e) => startResize(e, 'se')}></div>
        <div class="resize-handle resize-sw" on:mousedown={(e) => startResize(e, 'sw')}></div>
    {/if}
</section>

<style lang="less">
    .floating-window {
        position: fixed;
        z-index: 10000;
        background: #1e1e2e;
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1);
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }

    .floating-window.minimized {
        height: auto !important;
    }

    .floating-window.dragging {
        opacity: 0.9;
        cursor: grabbing !important;
    }

    .floating-window.resizing {
        user-select: none;
    }

    .floating-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: linear-gradient(180deg, #2d2d44 0%, #252538 100%);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        cursor: grab;
        user-select: none;
        flex-shrink: 0;
    }

    .floating-header:active {
        cursor: grabbing;
    }

    .floating-title {
        font-weight: 600;
        color: #e0e0e0;
        font-size: 14px;
    }

    .floating-controls {
        display: flex;
        gap: 4px;
    }

    .floating-btn {
        width: 24px;
        height: 24px;
        border: none;
        background: rgba(255, 255, 255, 0.1);
        color: #e0e0e0;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        transition: background 0.2s;

        &:hover {
            background: rgba(255, 255, 255, 0.2);
        }
    }

    .floating-content {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        min-height: 0;
    }

    /* Resize handles */
    .resize-handle {
        position: absolute;
        z-index: 10001;
    }

    .resize-n, .resize-s {
        left: 8px;
        right: 8px;
        height: 6px;
        cursor: ns-resize;
    }

    .resize-n { top: 0; }
    .resize-s { bottom: 0; }

    .resize-e, .resize-w {
        top: 8px;
        bottom: 8px;
        width: 6px;
        cursor: ew-resize;
    }

    .resize-e { right: 0; }
    .resize-w { left: 0; }

    .resize-ne, .resize-nw, .resize-se, .resize-sw {
        width: 12px;
        height: 12px;
    }

    .resize-ne { top: 0; right: 0; cursor: nesw-resize; }
    .resize-nw { top: 0; left: 0; cursor: nwse-resize; }
    .resize-se { bottom: 0; right: 0; cursor: nwse-resize; }
    .resize-sw { bottom: 0; left: 0; cursor: nesw-resize; }
</style>
