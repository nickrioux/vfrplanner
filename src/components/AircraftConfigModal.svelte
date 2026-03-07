<!--
  AircraftConfigModal.svelte
  Modal for editing aircraft performance parameters
-->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { AircraftPerformance } from '../types/settings';
    import { DEFAULT_AIRCRAFT_PERFORMANCE } from '../types/settings';

    export let performance: AircraftPerformance;
    export let visible: boolean = false;

    const dispatch = createEventDispatcher<{
        save: AircraftPerformance;
        cancel: void;
    }>();

    // Local copy for editing
    let editPerf: AircraftPerformance = { ...DEFAULT_AIRCRAFT_PERFORMANCE };

    // Reset when modal opens — track previous visible to avoid reset on every reactive cycle
    let prevVisible = false;
    function checkVisible(v: boolean) {
        if (v && !prevVisible) {
            editPerf = JSON.parse(JSON.stringify(performance ?? DEFAULT_AIRCRAFT_PERFORMANCE));
        }
        prevVisible = v;
    }
    $: checkVisible(visible);

    // Validation
    $: isValid = editPerf
        && editPerf.cruiseTAS >= 50 && editPerf.cruiseTAS <= 300
        && editPerf.cruiseAltitude >= 500 && editPerf.cruiseAltitude <= 25000
        && editPerf.rateOfClimb >= 100 && editPerf.rateOfClimb <= 3000
        && editPerf.rateOfDescent >= 100 && editPerf.rateOfDescent <= 3000
        && editPerf.climbSpeed >= 40 && editPerf.climbSpeed <= 200
        && editPerf.descentSpeed >= 40 && editPerf.descentSpeed <= 200;

    // Section collapse state
    let cruiseExpanded = true;
    let perfExpanded = true;

    function handleSave() {
        if (isValid && editPerf) {
            dispatch('save', editPerf);
        }
    }

    function handleCancel() {
        dispatch('cancel');
    }

    function handleBackdropClick(e: MouseEvent) {
        if (e.target === e.currentTarget) {
            handleCancel();
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            handleCancel();
        }
    }

    function resetToDefaults() {
        editPerf = JSON.parse(JSON.stringify(DEFAULT_AIRCRAFT_PERFORMANCE));
    }

    function toggleSection(section: 'cruise' | 'perf') {
        if (section === 'cruise') cruiseExpanded = !cruiseExpanded;
        else if (section === 'perf') perfExpanded = !perfExpanded;
    }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if visible && editPerf}
    <div class="modal-backdrop" on:click={handleBackdropClick} role="presentation">
        <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div class="modal-header">
                <h3 id="modal-title">Aircraft Performance</h3>
                <button class="close-btn" on:click={handleCancel} aria-label="Close">&times;</button>
            </div>

            <div class="modal-body">
                <!-- Cruise Section -->
                <div class="section">
                    <button
                        class="section-header"
                        on:click={() => toggleSection('cruise')}
                        aria-expanded={cruiseExpanded}
                        aria-controls="cruise-content"
                    >
                        <span class="section-icon" aria-hidden="true">{cruiseExpanded ? '▼' : '▶'}</span>
                        <span class="section-title">Cruise</span>
                    </button>
                    {#if cruiseExpanded}
                        <div class="section-content" id="cruise-content">
                            <div class="param-row">
                                <label>True Airspeed</label>
                                <div class="param-input">
                                    <input
                                        type="number"
                                        bind:value={editPerf.cruiseTAS}
                                        min="50"
                                        max="300"
                                        step="5"
                                    />
                                    <span class="unit">kt</span>
                                </div>
                            </div>
                            <div class="param-row">
                                <label>Cruise Altitude</label>
                                <div class="param-input">
                                    <input
                                        type="number"
                                        bind:value={editPerf.cruiseAltitude}
                                        min="500"
                                        max="25000"
                                        step="500"
                                    />
                                    <span class="unit">ft MSL</span>
                                </div>
                            </div>
                        </div>
                    {/if}
                </div>

                <!-- Performance Section -->
                <div class="section">
                    <button
                        class="section-header"
                        on:click={() => toggleSection('perf')}
                        aria-expanded={perfExpanded}
                        aria-controls="perf-content"
                    >
                        <span class="section-icon" aria-hidden="true">{perfExpanded ? '▼' : '▶'}</span>
                        <span class="section-title">Climb & Descent</span>
                    </button>
                    {#if perfExpanded}
                        <div class="section-content" id="perf-content">
                            <div class="param-row">
                                <label>Rate of Climb</label>
                                <div class="param-input">
                                    <input
                                        type="number"
                                        bind:value={editPerf.rateOfClimb}
                                        min="100"
                                        max="3000"
                                        step="50"
                                    />
                                    <span class="unit">fpm</span>
                                </div>
                            </div>
                            <div class="param-row">
                                <label>Rate of Descent</label>
                                <div class="param-input">
                                    <input
                                        type="number"
                                        bind:value={editPerf.rateOfDescent}
                                        min="100"
                                        max="3000"
                                        step="50"
                                    />
                                    <span class="unit">fpm</span>
                                </div>
                            </div>
                            <div class="param-row">
                                <label>Climb Speed</label>
                                <div class="param-input">
                                    <input
                                        type="number"
                                        bind:value={editPerf.climbSpeed}
                                        min="40"
                                        max="200"
                                        step="5"
                                    />
                                    <span class="unit">KIAS</span>
                                </div>
                            </div>
                            <div class="param-row">
                                <label>Descent Speed</label>
                                <div class="param-input">
                                    <input
                                        type="number"
                                        bind:value={editPerf.descentSpeed}
                                        min="40"
                                        max="200"
                                        step="5"
                                    />
                                    <span class="unit">KIAS</span>
                                </div>
                            </div>
                        </div>
                    {/if}
                </div>
            </div>

            <div class="modal-footer">
                <button class="btn btn-secondary" on:click={resetToDefaults}>
                    Reset to Defaults
                </button>
                <div class="footer-actions">
                    <button class="btn btn-cancel" on:click={handleCancel}>
                        Cancel
                    </button>
                    <button
                        class="btn btn-save"
                        on:click={handleSave}
                        disabled={!isValid}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}

<style lang="less">
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    }

    .modal-content {
        background: #1a1a1a;
        border-radius: 8px;
        border: 1px solid #333;
        max-width: 400px;
        width: 90%;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid #333;
        flex-shrink: 0;

        h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: #e0e0e0;
        }
    }

    .close-btn {
        background: none;
        border: none;
        color: #888;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        min-width: 44px;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;

        &:hover,
        &:active {
            color: #e0e0e0;
        }

        &:focus {
            outline: 2px solid rgba(74, 144, 217, 0.5);
            outline-offset: 2px;
        }
    }

    .modal-body {
        padding: 16px;
        overflow-y: auto;
        flex: 1;
    }

    .section {
        margin-bottom: 12px;
        border: 1px solid #333;
        border-radius: 6px;
        overflow: hidden;
    }

    .section-header {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 10px 12px;
        min-height: 44px;
        background: #252525;
        border: none;
        color: #e0e0e0;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        text-align: left;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;

        &:hover,
        &:active {
            background: #2a2a2a;
        }

        &:focus {
            outline: 2px solid rgba(74, 144, 217, 0.5);
            outline-offset: -2px;
        }
    }

    .section-icon {
        font-size: 10px;
        color: #888;
    }

    .section-title {
        flex: 1;
    }

    .section-content {
        padding: 12px;
        background: #1e1e1e;
    }

    .param-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;

        &:last-child {
            margin-bottom: 0;
        }

        label {
            font-size: 13px;
            color: #c0c0c0;
        }
    }

    .param-input {
        display: flex;
        align-items: center;
        gap: 6px;

        input {
            width: 80px;
            padding: 6px 8px;
            min-height: 44px;
            border: 1px solid #444;
            border-radius: 4px;
            background: #2a2a2a;
            color: #fff;
            font-size: 13px;
            text-align: center;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;

            &:focus {
                outline: none;
                border-color: #4a90d9;
                box-shadow: 0 0 0 2px rgba(74, 144, 217, 0.2);
            }

            &::-webkit-inner-spin-button,
            &::-webkit-outer-spin-button {
                opacity: 1;
            }
        }

        .unit {
            font-size: 12px;
            color: #888;
            min-width: 40px;
        }
    }

    .modal-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-top: 1px solid #333;
        flex-shrink: 0;
    }

    .footer-actions {
        display: flex;
        gap: 8px;
    }

    .btn {
        padding: 8px 16px;
        min-height: 44px;
        border-radius: 4px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        border: none;
        transition: background 0.2s, opacity 0.2s;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    }

    .btn-secondary {
        background: #333;
        color: #c0c0c0;

        &:hover:not(:disabled),
        &:active:not(:disabled) {
            background: #444;
        }

        &:focus {
            outline: 2px solid rgba(74, 144, 217, 0.5);
            outline-offset: 2px;
        }
    }

    .btn-cancel {
        background: #444;
        color: #e0e0e0;

        &:hover:not(:disabled),
        &:active:not(:disabled) {
            background: #555;
        }

        &:focus {
            outline: 2px solid rgba(74, 144, 217, 0.5);
            outline-offset: 2px;
        }
    }

    .btn-save {
        background: #4a90d9;
        color: #fff;

        &:hover:not(:disabled),
        &:active:not(:disabled) {
            background: #5a9ee9;
        }

        &:focus {
            outline: 2px solid rgba(74, 144, 217, 0.7);
            outline-offset: 2px;
        }
    }
</style>
