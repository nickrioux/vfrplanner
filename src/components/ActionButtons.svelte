<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    export let isLoadingWeather: boolean = false;
    export let isEditMode: boolean = false;
    export let showExportMenu: boolean = false;
    export let adjustForecastForFlightTime: boolean = true;
    export let hasAlerts: boolean = false;

    const dispatch = createEventDispatcher<{
        readWeather: void;
        reverse: void;
        toggleEdit: void;
        toggleExportMenu: void;
        exportGPX: void;
        exportFPL: void;
        sendToDistancePlanning: void;
        adjustForecastChange: boolean;
    }>();

    function handleExportMenuClick(event: MouseEvent) {
        event.stopPropagation();
        dispatch('toggleExportMenu');
    }

    function closeExportMenu() {
        if (showExportMenu) {
            dispatch('toggleExportMenu');
        }
    }
</script>

<div class="action-buttons">
    <div class="action-row">
        <button
            class="btn-action btn-weather"
            class:has-alerts={hasAlerts}
            on:click={() => dispatch('readWeather')}
            disabled={isLoadingWeather}
            title="Fetch weather for all waypoints"
        >
            {#if isLoadingWeather}
                ⏳ Loading...
            {:else}
                🌤️ Read Wx
            {/if}
        </button>
        <button
            class="btn-action"
            on:click={() => dispatch('reverse')}
            title="Reverse the route order"
        >
            🔄 Reverse
        </button>
        <button
            class="btn-action"
            class:btn-edit-active={isEditMode}
            on:click={() => dispatch('toggleEdit')}
            title={isEditMode ? 'Exit edit mode (Esc)' : 'Edit: add/move waypoints'}
        >
            {isEditMode ? '✏️ Done' : '✏️ Edit'}
        </button>
    </div>
    <div class="action-row action-row-center">
        <div class="export-dropdown">
            <button
                class="btn-action"
                on:click={handleExportMenuClick}
                title="Export flight plan"
            >
                📥 Export {showExportMenu ? '▴' : '▾'}
            </button>
            {#if showExportMenu}
                <div class="export-backdrop" on:click={closeExportMenu}></div>
                <div class="export-menu">
                    <button on:click={() => { dispatch('exportGPX'); closeExportMenu(); }}>
                        📄 GPX file
                    </button>
                    <button on:click={() => { dispatch('exportFPL'); closeExportMenu(); }}>
                        📄 FPL file (ForeFlight)
                    </button>
                    <button on:click={() => { dispatch('sendToDistancePlanning'); closeExportMenu(); }}>
                        🗺️ Windy Distance & Planning
                    </button>
                </div>
            {/if}
        </div>
    </div>
    <div class="weather-options">
        <label class="checkbox-label" title="When enabled, weather at each waypoint is forecast for your estimated arrival time. When disabled, all waypoints show weather for departure time.">
            <input
                type="checkbox"
                bind:checked={adjustForecastForFlightTime}
                on:change={() => dispatch('adjustForecastChange', adjustForecastForFlightTime)}
            />
            Adjust forecast for flight time
        </label>
    </div>
</div>

<style>
    .action-buttons {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 0 10px 10px;
    }

    .action-row {
        display: flex;
        gap: 6px;

        &.action-row-center {
            justify-content: center;
        }
    }

    .weather-options {
        display: flex;
        align-items: center;
        padding: 4px 0;
        font-size: 11px;

        .checkbox-label {
            display: flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            color: rgba(255, 255, 255, 0.7);

            input[type="checkbox"] {
                margin: 0;
                cursor: pointer;
            }

            &:hover {
                color: rgba(255, 255, 255, 0.9);
            }
        }
    }

    .btn-action {
        flex: 1;
        padding: 6px 8px;
        min-height: 36px;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        border-radius: 4px;
        color: rgba(255, 255, 255, 0.9);
        cursor: pointer;
        font-size: 12px;
        transition: all 0.15s ease;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;

        &:hover {
            background: rgba(255, 255, 255, 0.15);
        }

        &:active:not(:disabled) {
            transform: scale(0.98);
        }

        &:focus {
            outline: none;
        }

        &:focus-visible {
            outline: 2px solid rgba(255, 255, 255, 0.3);
            outline-offset: 2px;
        }

        &.active {
            background: #27ae60;
            color: white;
        }

        &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        &.btn-weather.has-alerts {
            background: rgba(243, 156, 18, 0.3);
            border: 1px solid #f39c12;
        }

        &.btn-edit-active {
            background: #27ae60;
            color: white;
            box-shadow: 0 0 8px rgba(39, 174, 96, 0.5);
        }
    }

    /* Export Dropdown */
    .export-dropdown {
        position: relative;
        width: calc(33.33% - 4px);

        > .btn-action {
            width: 100%;
            flex: none;
        }
    }

    .export-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 99;
    }

    .export-menu {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        margin-top: 4px;
        background: #2a2a2a;
        border: 1px solid #444;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        z-index: 100;
        overflow: hidden;

        button {
            display: block;
            width: 100%;
            padding: 10px 12px;
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.9);
            font-size: 13px;
            text-align: left;
            cursor: pointer;
            transition: background 0.15s ease;

            &:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            &:not(:last-child) {
                border-bottom: 1px solid #444;
            }
        }
    }
</style>
