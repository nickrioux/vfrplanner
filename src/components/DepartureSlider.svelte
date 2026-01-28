<!--
    DepartureSlider Component
    Handles departure time selection, Windy sync, and VFR window search
-->
<div class="departure-section">
    <div class="departure-header">
        <span class="departure-label">🕐 Departure</span>
        <span class="departure-time">{formatDepartureTime(departureTime)}</span>
    </div>
    <div class="timeline-slider">
        <input
            type="range"
            min={forecastRange.start}
            max={forecastRange.end}
            step={3600000}
            bind:value={departureTime}
            on:change={handleChange}
            class="slider"
        />
        <div class="timeline-labels">
            <span>{formatShortTime(forecastRange.start)}</span>
            <span>{formatShortTime(forecastRange.end)}</span>
        </div>
    </div>
    <div class="departure-footer">
        {#if totalEte > 0}
            <span class="arrival-info">ETA: {formatDepartureTime(departureTime + totalEte * 60000)}</span>
        {/if}
        <button
            class="btn-sync"
            class:active={syncWithWindy}
            on:click={handleSyncToggle}
            title={syncWithWindy ? 'Synced with Windy timeline' : 'Click to sync with Windy timeline'}
        >
            🔗 {syncWithWindy ? 'Synced' : 'Sync'}
        </button>
    </div>

    <!-- VFR Window Detection -->
    <div class="vfr-window-section">
        <div class="vfr-window-controls">
            <select
                class="condition-select"
                bind:value={windowSearchMinCondition}
                disabled={isSearchingWindows}
            >
                <option value="marginal">Marginal or better</option>
                <option value="good">Good only</option>
            </select>
            <button
                class="btn-find-windows"
                on:click={handleFindWindows}
                disabled={isSearchingWindows || !canSearch}
            >
                {#if isSearchingWindows}
                    Searching... {Math.round(windowSearchProgress * 100)}%
                {:else}
                    🔍 Find VFR Windows
                {/if}
            </button>
        </div>

        {#if isSearchingWindows}
            <div class="search-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: {windowSearchProgress * 100}%"></div>
                </div>
            </div>
        {/if}

        {#if windowSearchError}
            <div class="window-error">{windowSearchError}</div>
        {/if}

        {#if vfrWindows && vfrWindows.length > 0}
            <div class="vfr-windows-list">
                {#each vfrWindows as window}
                    {@const formatted = formatVFRWindow(window)}
                    <div class="vfr-window-item" class:good={window.worstCondition === 'good'} class:marginal={window.worstCondition === 'marginal'}>
                        <div class="window-info">
                            <span class="window-date">{formatted.date}</span>
                            <span class="window-time">{formatted.timeRange}</span>
                            <span class="window-meta">
                                <span class="window-duration">{formatted.duration}</span>
                                <span class="window-confidence" class:high={window.confidence === 'high'} class:medium={window.confidence === 'medium'} class:low={window.confidence === 'low'}>
                                    {window.confidence === 'high' ? '●' : window.confidence === 'medium' ? '◐' : '○'}
                                </span>
                            </span>
                        </div>
                        <button class="btn-use-window" on:click={() => handleUseWindow(window)}>Use</button>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>

<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { ForecastTimeRange } from '../services/weatherService';
    import type { VFRWindow, MinimumConditionLevel } from '../types/vfrWindow';
    import { formatVFRWindow } from '../services/vfrWindowService';

    // Props
    export let departureTime: number;
    export let forecastRange: ForecastTimeRange;
    export let syncWithWindy: boolean;
    export let totalEte: number = 0;
    export let canSearch: boolean = true;
    export let isSearchingWindows: boolean = false;
    export let windowSearchProgress: number = 0;
    export let windowSearchError: string | null = null;
    export let vfrWindows: VFRWindow[] | null = null;
    export let windowSearchMinCondition: MinimumConditionLevel = 'marginal';

    const dispatch = createEventDispatcher<{
        change: number;
        syncToggle: void;
        findWindows: MinimumConditionLevel;
        useWindow: VFRWindow;
    }>();

    function formatDepartureTime(timestamp: number): string {
        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const isTomorrow = date.toDateString() === tomorrow.toDateString();

        const timeStr = date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });

        if (isToday) {
            return `Today ${timeStr}`;
        } else if (isTomorrow) {
            return `Tomorrow ${timeStr}`;
        } else {
            const dayStr = date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });
            return `${dayStr} ${timeStr}`;
        }
    }

    function formatShortTime(timestamp: number): string {
        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();

        if (isToday) {
            return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        }
        return date.toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric', hour12: true });
    }

    function handleChange() {
        dispatch('change', departureTime);
    }

    function handleSyncToggle() {
        dispatch('syncToggle');
    }

    function handleFindWindows() {
        dispatch('findWindows', windowSearchMinCondition);
    }

    function handleUseWindow(window: VFRWindow) {
        dispatch('useWindow', window);
    }
</script>

<style lang="less">
    .departure-section {
        padding: 0 10px 10px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        margin-bottom: 10px;
    }

    .departure-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }

    .departure-label {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
    }

    .departure-time {
        font-size: 13px;
        font-weight: 500;
        color: #fff;
    }

    .timeline-slider {
        margin-bottom: 8px;

        .slider {
            width: 100%;
            height: 6px;
            -webkit-appearance: none;
            appearance: none;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
            outline: none;
            cursor: pointer;

            &::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 16px;
                height: 16px;
                background: #4a90e2;
                border-radius: 50%;
                cursor: pointer;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }

            &::-moz-range-thumb {
                width: 16px;
                height: 16px;
                background: #4a90e2;
                border-radius: 50%;
                cursor: pointer;
                border: none;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }
        }
    }

    .timeline-labels {
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        color: rgba(255, 255, 255, 0.5);
        margin-top: 4px;
    }

    .departure-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 6px;
    }

    .arrival-info {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.6);
    }

    .btn-sync {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: rgba(255, 255, 255, 0.7);
        font-size: 11px;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover {
            background: rgba(255, 255, 255, 0.15);
        }

        &.active {
            background: rgba(74, 144, 226, 0.3);
            color: #4a90e2;
        }
    }

    .vfr-window-section {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .vfr-window-controls {
        display: flex;
        gap: 8px;
        align-items: center;
    }

    .condition-select {
        flex: 0 0 auto;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #fff;
        font-size: 11px;
        padding: 6px 8px;
        border-radius: 4px;
        cursor: pointer;

        option {
            background: #1a1a2e;
            color: #fff;
        }
    }

    .btn-find-windows {
        flex: 1;
        background: rgba(74, 144, 226, 0.2);
        border: 1px solid rgba(74, 144, 226, 0.4);
        color: #4a90e2;
        font-size: 12px;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover:not(:disabled) {
            background: rgba(74, 144, 226, 0.3);
        }

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    }

    .search-progress {
        margin-top: 8px;
    }

    .progress-bar {
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        overflow: hidden;
    }

    .progress-fill {
        height: 100%;
        background: #4a90e2;
        transition: width 0.3s ease;
    }

    .window-error {
        margin-top: 8px;
        padding: 8px;
        background: rgba(231, 76, 60, 0.2);
        border-radius: 4px;
        color: #e74c3c;
        font-size: 11px;
    }

    .vfr-windows-list {
        margin-top: 10px;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .vfr-window-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 10px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        border-left: 3px solid transparent;

        &.good {
            border-left-color: #4caf50;
        }

        &.marginal {
            border-left-color: #ff9800;
        }
    }

    .window-info {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
    }

    .window-date {
        font-size: 11px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.9);
    }

    .window-time {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.7);
    }

    .window-meta {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .window-duration {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.5);
    }

    .window-confidence {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.4);

        &.high {
            color: #4caf50;
        }

        &.medium {
            color: #ff9800;
        }

        &.low {
            color: #f44336;
        }
    }

    .btn-use-window {
        background: rgba(74, 144, 226, 0.2);
        border: none;
        color: #4a90e2;
        font-size: 11px;
        padding: 4px 10px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover {
            background: rgba(74, 144, 226, 0.3);
        }
    }
</style>
