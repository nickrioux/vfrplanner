<!--
    CrosshairOverlay - Fixed crosshair at viewport center for adding waypoints
    Reads map center on confirm and dispatches coordinates
-->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { map } from '@windy/map';
    import { addWaypointFromMapClick } from '../../controllers/routeController';
    import { uiStore } from '../../stores/uiStore';

    const dispatch = createEventDispatcher<{
        confirm: { lat: number; lon: number };
        cancel: void;
    }>();

    async function handleConfirm() {
        const center = map.getCenter();
        await addWaypointFromMapClick(center.lat, center.lng);
        uiStore.setCrosshairMode(false);
    }

    function handleCancel() {
        dispatch('cancel');
    }
</script>

<div class="crosshair-overlay">
    <!-- Instruction banner -->
    <div class="crosshair-banner">
        Pan the map to position the crosshair, then tap "Add Point"
    </div>

    <!-- Crosshair icon -->
    <div class="crosshair-icon">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="8" stroke="white" stroke-width="2" fill="none" />
            <line x1="20" y1="0" x2="20" y2="14" stroke="white" stroke-width="2" />
            <line x1="20" y1="26" x2="20" y2="40" stroke="white" stroke-width="2" />
            <line x1="0" y1="20" x2="14" y2="20" stroke="white" stroke-width="2" />
            <line x1="26" y1="20" x2="40" y2="20" stroke="white" stroke-width="2" />
        </svg>
    </div>

    <!-- Action buttons -->
    <div class="crosshair-actions">
        <button class="crosshair-btn crosshair-btn--cancel" on:click={handleCancel}>
            Cancel
        </button>
        <button class="crosshair-btn crosshair-btn--confirm" on:click={handleConfirm}>
            Add Point
        </button>
    </div>
</div>

<style lang="less">
    .crosshair-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 999;
    }

    .crosshair-banner {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        padding: calc(12px + env(safe-area-inset-top, 0px)) 16px 12px;
        background: rgba(39, 174, 96, 0.9);
        color: white;
        font-size: 14px;
        text-align: center;
        pointer-events: auto;
        z-index: 1;
    }

    .crosshair-icon {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
    }

    .crosshair-actions {
        position: absolute;
        bottom: calc(100px + env(safe-area-inset-bottom, 0px));
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 12px;
        pointer-events: auto;
    }

    .crosshair-btn {
        padding: 14px 28px;
        border: none;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;

        &--confirm {
            background: #27ae60;
            color: white;
            box-shadow: 0 4px 12px rgba(39, 174, 96, 0.4);

            &:active {
                background: #219a52;
            }
        }

        &--cancel {
            background: rgba(255, 255, 255, 0.15);
            color: rgba(255, 255, 255, 0.9);

            &:active {
                background: rgba(255, 255, 255, 0.25);
            }
        }
    }
</style>
