<!--
    FloatingActionButton - "+" FAB for adding waypoints in crosshair mode
    Positioned above collapsed bottom sheet
-->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher<{ click: void }>();
</script>

<button class="fab" on:click={() => dispatch('click')} title="Add waypoint">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <line x1="12" y1="5" x2="12" y2="19" stroke="white" stroke-width="2.5" stroke-linecap="round" />
        <line x1="5" y1="12" x2="19" y2="12" stroke="white" stroke-width="2.5" stroke-linecap="round" />
    </svg>
</button>

<style lang="less">
    .fab {
        position: fixed;
        bottom: calc(100px + env(safe-area-inset-bottom, 0px));
        right: calc(20px + env(safe-area-inset-right, 0px));
        width: 56px;
        height: 56px;
        border-radius: 16px;
        background: #27ae60;
        border: none;
        box-shadow: 0 4px 16px rgba(39, 174, 96, 0.4);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        z-index: 999;
        transition: transform 0.15s ease, box-shadow 0.15s ease;

        &:active {
            transform: scale(0.92);
            box-shadow: 0 2px 8px rgba(39, 174, 96, 0.3);
        }
    }
</style>
