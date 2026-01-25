<!--
  ConditionsModal.svelte
  Modal for editing VFR condition thresholds
-->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { VfrConditionThresholds } from '../types/conditionThresholds';
    import { STANDARD_THRESHOLDS, validateThresholds } from '../types/conditionThresholds';

    export let thresholds: VfrConditionThresholds;
    export let visible: boolean = false;

    const dispatch = createEventDispatcher<{
        save: VfrConditionThresholds;
        cancel: void;
    }>();

    // Local copy for editing
    let editThresholds: VfrConditionThresholds;

    // Reset when modal opens
    $: if (visible) {
        editThresholds = JSON.parse(JSON.stringify(thresholds));
    }

    $: isValid = editThresholds ? validateThresholds(editThresholds) : true;

    // Section collapse state
    let weatherExpanded = true;
    let windExpanded = true;
    let clearanceExpanded = true;

    function handleSave() {
        if (isValid && editThresholds) {
            dispatch('save', editThresholds);
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

    function resetToStandard() {
        editThresholds = JSON.parse(JSON.stringify(STANDARD_THRESHOLDS));
    }

    function toggleSection(section: 'weather' | 'wind' | 'clearance') {
        if (section === 'weather') weatherExpanded = !weatherExpanded;
        else if (section === 'wind') windExpanded = !windExpanded;
        else if (section === 'clearance') clearanceExpanded = !clearanceExpanded;
    }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if visible && editThresholds}
    <div class="modal-backdrop" on:click={handleBackdropClick} role="presentation">
        <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div class="modal-header">
                <h3 id="modal-title">VFR Condition Thresholds</h3>
                <button class="close-btn" on:click={handleCancel} aria-label="Close">&times;</button>
            </div>

            <div class="modal-body">
                {#if !isValid}
                    <div class="error-message">
                        Invalid thresholds: Marginal values must be between Good and Poor thresholds.
                    </div>
                {/if}

                <!-- Weather Conditions Section -->
                <div class="section">
                    <button
                        class="section-header"
                        on:click={() => toggleSection('weather')}
                        aria-expanded={weatherExpanded}
                        aria-controls="weather-content"
                    >
                        <span class="section-icon" aria-hidden="true">{weatherExpanded ? '▼' : '▶'}</span>
                        <span class="section-title">Weather Conditions</span>
                    </button>
                    {#if weatherExpanded}
                        <div class="section-content" id="weather-content">
                            <div class="threshold-grid">
                                <div class="grid-header">
                                    <span></span>
                                    <span class="header-marginal">Marginal</span>
                                    <span class="header-poor">Poor</span>
                                </div>

                                <div class="threshold-row">
                                    <label>Cloud Base (ft AGL)</label>
                                    <input
                                        type="number"
                                        bind:value={editThresholds.cloudBaseAgl.marginal}
                                        min="0"
                                        step="100"
                                        class="input-marginal"
                                    />
                                    <input
                                        type="number"
                                        bind:value={editThresholds.cloudBaseAgl.poor}
                                        min="0"
                                        step="100"
                                        class="input-poor"
                                    />
                                </div>

                                <div class="threshold-row">
                                    <label>Visibility (km)</label>
                                    <input
                                        type="number"
                                        bind:value={editThresholds.visibility.marginal}
                                        min="0"
                                        step="1"
                                        class="input-marginal"
                                    />
                                    <input
                                        type="number"
                                        bind:value={editThresholds.visibility.poor}
                                        min="0"
                                        step="1"
                                        class="input-poor"
                                    />
                                </div>

                                <div class="threshold-row">
                                    <label>Precipitation (mm)</label>
                                    <input
                                        type="number"
                                        bind:value={editThresholds.precipitation.marginal}
                                        min="0"
                                        step="0.5"
                                        class="input-marginal"
                                    />
                                    <input
                                        type="number"
                                        bind:value={editThresholds.precipitation.poor}
                                        min="0"
                                        step="0.5"
                                        class="input-poor"
                                    />
                                </div>
                            </div>
                        </div>
                    {/if}
                </div>

                <!-- Wind Limits Section -->
                <div class="section">
                    <button
                        class="section-header"
                        on:click={() => toggleSection('wind')}
                        aria-expanded={windExpanded}
                        aria-controls="wind-content"
                    >
                        <span class="section-icon" aria-hidden="true">{windExpanded ? '▼' : '▶'}</span>
                        <span class="section-title">Wind Limits (Takeoff/Landing)</span>
                    </button>
                    {#if windExpanded}
                        <div class="section-content" id="wind-content">
                            <div class="threshold-grid">
                                <div class="grid-header">
                                    <span></span>
                                    <span class="header-marginal">Marginal</span>
                                    <span class="header-poor">Poor</span>
                                </div>

                                <div class="threshold-row">
                                    <label>Wind Speed (kt)</label>
                                    <input
                                        type="number"
                                        bind:value={editThresholds.surfaceWindSpeed.marginal}
                                        min="0"
                                        step="1"
                                        class="input-marginal"
                                    />
                                    <input
                                        type="number"
                                        bind:value={editThresholds.surfaceWindSpeed.poor}
                                        min="0"
                                        step="1"
                                        class="input-poor"
                                    />
                                </div>

                                <div class="threshold-row">
                                    <label>Gusts (kt)</label>
                                    <input
                                        type="number"
                                        bind:value={editThresholds.surfaceGusts.marginal}
                                        min="0"
                                        step="1"
                                        class="input-marginal"
                                    />
                                    <input
                                        type="number"
                                        bind:value={editThresholds.surfaceGusts.poor}
                                        min="0"
                                        step="1"
                                        class="input-poor"
                                    />
                                </div>

                                <div class="threshold-row">
                                    <label>Crosswind (kt)</label>
                                    <input
                                        type="number"
                                        bind:value={editThresholds.crosswind.marginal}
                                        min="0"
                                        step="1"
                                        class="input-marginal"
                                    />
                                    <input
                                        type="number"
                                        bind:value={editThresholds.crosswind.poor}
                                        min="0"
                                        step="1"
                                        class="input-poor"
                                    />
                                </div>

                                <div class="threshold-row">
                                    <label>Tailwind (kt)</label>
                                    <input
                                        type="number"
                                        bind:value={editThresholds.tailwind.marginal}
                                        min="0"
                                        step="1"
                                        class="input-marginal"
                                    />
                                    <input
                                        type="number"
                                        bind:value={editThresholds.tailwind.poor}
                                        min="0"
                                        step="1"
                                        class="input-poor"
                                    />
                                </div>
                            </div>
                        </div>
                    {/if}
                </div>

                <!-- Clearances Section -->
                <div class="section">
                    <button
                        class="section-header"
                        on:click={() => toggleSection('clearance')}
                        aria-expanded={clearanceExpanded}
                        aria-controls="clearance-content"
                    >
                        <span class="section-icon" aria-hidden="true">{clearanceExpanded ? '▼' : '▶'}</span>
                        <span class="section-title">Clearances</span>
                    </button>
                    {#if clearanceExpanded}
                        <div class="section-content" id="clearance-content">
                            <div class="threshold-grid">
                                <div class="grid-header">
                                    <span></span>
                                    <span class="header-marginal">Marginal</span>
                                    <span class="header-poor">Poor</span>
                                </div>

                                <div class="threshold-row">
                                    <label>Terrain (ft)</label>
                                    <input
                                        type="number"
                                        bind:value={editThresholds.terrainClearance.marginal}
                                        min="0"
                                        step="100"
                                        class="input-marginal"
                                    />
                                    <input
                                        type="number"
                                        bind:value={editThresholds.terrainClearance.poor}
                                        min="0"
                                        step="100"
                                        class="input-poor"
                                    />
                                </div>

                                <div class="threshold-row">
                                    <label>Cloud (ft)</label>
                                    <input
                                        type="number"
                                        bind:value={editThresholds.cloudClearance.marginal}
                                        min="0"
                                        step="100"
                                        class="input-marginal"
                                    />
                                    <input
                                        type="number"
                                        bind:value={editThresholds.cloudClearance.poor}
                                        min="0"
                                        step="100"
                                        class="input-poor"
                                    />
                                </div>
                            </div>
                        </div>
                    {/if}
                </div>
            </div>

            <div class="modal-footer">
                <button class="btn btn-secondary" on:click={resetToStandard}>
                    Reset to Standard
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
        max-width: 450px;
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
        line-height: 1;

        &:hover {
            color: #e0e0e0;
        }
    }

    .modal-body {
        padding: 16px;
        overflow-y: auto;
        flex: 1;
    }

    .error-message {
        background: rgba(220, 53, 69, 0.2);
        border: 1px solid #dc3545;
        border-radius: 4px;
        padding: 10px 12px;
        margin-bottom: 16px;
        color: #ff6b6b;
        font-size: 13px;
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
        background: #252525;
        border: none;
        color: #e0e0e0;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        text-align: left;

        &:hover {
            background: #2a2a2a;
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

    .threshold-grid {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .grid-header {
        display: grid;
        grid-template-columns: 1fr 80px 80px;
        gap: 8px;
        padding-bottom: 6px;
        border-bottom: 1px solid #333;

        span {
            font-size: 12px;
            color: #888;
            text-align: center;
        }

        span:first-child {
            text-align: left;
        }
    }

    .header-marginal {
        color: #f0ad4e !important;
    }

    .header-poor {
        color: #dc3545 !important;
    }

    .threshold-row {
        display: grid;
        grid-template-columns: 1fr 80px 80px;
        gap: 8px;
        align-items: center;

        label {
            font-size: 13px;
            color: #c0c0c0;
        }

        input {
            width: 100%;
            padding: 6px 8px;
            border: 1px solid #444;
            border-radius: 4px;
            background: #2a2a2a;
            color: #fff;
            font-size: 13px;
            text-align: center;

            &:focus {
                outline: none;
                border-color: #4a90d9;
            }

            &::-webkit-inner-spin-button,
            &::-webkit-outer-spin-button {
                opacity: 1;
            }
        }

        .input-marginal {
            border-color: rgba(240, 173, 78, 0.4);

            &:focus {
                border-color: #f0ad4e;
            }
        }

        .input-poor {
            border-color: rgba(220, 53, 69, 0.4);

            &:focus {
                border-color: #dc3545;
            }
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
        border-radius: 4px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        border: none;
        transition: background 0.2s, opacity 0.2s;

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    }

    .btn-secondary {
        background: #333;
        color: #c0c0c0;

        &:hover:not(:disabled) {
            background: #444;
        }
    }

    .btn-cancel {
        background: #444;
        color: #e0e0e0;

        &:hover:not(:disabled) {
            background: #555;
        }
    }

    .btn-save {
        background: #4a90d9;
        color: #fff;

        &:hover:not(:disabled) {
            background: #5a9ee9;
        }
    }
</style>
