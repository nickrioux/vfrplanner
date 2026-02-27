<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { FlightPlan } from '../types';

    export let flightPlan: FlightPlan | null = null;
    export let isLoading: boolean = false;
    export let isDragOver: boolean = false;
    export let error: string | null = null;
    export let editingPlanName: boolean = false;

    let fileInput: HTMLInputElement;

    const dispatch = createEventDispatcher<{
        dragover: DragEvent;
        dragleave: void;
        drop: DragEvent;
        fileSelect: Event;
        clear: void;
        createNew: void;
        startEditName: void;
        finishEditName: string;
        cancelEditName: void;
    }>();

    function handleDragOver(event: DragEvent) {
        event.preventDefault();
        dispatch('dragover', event);
    }

    function handleDragLeave() {
        dispatch('dragleave');
    }

    function handleDrop(event: DragEvent) {
        event.preventDefault();
        dispatch('drop', event);
    }

    function handleFileSelect(event: Event) {
        dispatch('fileSelect', event);
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            dispatch('finishEditName', (event.currentTarget as HTMLInputElement).value);
        }
        if (event.key === 'Escape') {
            dispatch('cancelEditName');
        }
    }
</script>

<div class="import-section">
    <div
        class="drop-zone"
        class:drag-over={isDragOver}
        on:dragover={handleDragOver}
        on:dragleave={handleDragLeave}
        on:drop={handleDrop}
    >
        <input
            type="file"
            accept=".fpl,.xml,.gpx,application/xml,text/xml,application/gpx+xml,*/*"
            on:change={handleFileSelect}
            bind:this={fileInput}
            style="display: none"
        />
        {#if isLoading}
            <span class="loading">Loading...</span>
        {:else if !flightPlan}
            <div class="drop-zone-content">
                <span class="drop-icon">✈️</span>
                <span>Drop .fpl/.gpx file or</span>
                <div class="drop-zone-buttons">
                    <button class="btn-browse" on:click={() => fileInput?.click()}>
                        Browse...
                    </button>
                    <button class="btn-new" on:click={() => dispatch('createNew')}>
                        ✈️ New Plan
                    </button>
                </div>
            </div>
        {:else}
            <div class="flight-plan-loaded">
                {#if editingPlanName}
                    <input
                        type="text"
                        class="plan-name-input"
                        value={flightPlan.name}
                        on:blur={(e) => dispatch('finishEditName', e.currentTarget.value)}
                        on:keydown={handleKeydown}
                        on:click|stopPropagation
                        autofocus
                    />
                {:else}
                    <span
                        class="plan-name"
                        on:click|stopPropagation={() => dispatch('startEditName')}
                        title="Click to rename"
                    >{flightPlan.name}</span>
                {/if}
                <button class="btn-clear" on:click={() => dispatch('clear')} title="Clear flight plan">✕</button>
            </div>
        {/if}
    </div>
    {#if error}
        <div class="error-message">{error}</div>
    {/if}
</div>

<style>
    .import-section {
        padding: 10px;
    }

    .drop-zone {
        border: 2px dashed rgba(255, 255, 255, 0.3);
        border-radius: 8px;
        padding: 20px;
        text-align: center;
        transition: all 0.2s ease;
        cursor: pointer;

        &.drag-over {
            border-color: #3498db;
            background: rgba(52, 152, 219, 0.1);
        }

        &:hover,
        &:active {
            border-color: rgba(255, 255, 255, 0.5);
        }

        &:focus {
            outline: 2px solid rgba(52, 152, 219, 0.5);
            outline-offset: 2px;
        }
    }

    .drop-zone-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
    }

    .drop-icon {
        font-size: 32px;
    }

    .drop-zone-buttons {
        display: flex;
        gap: 8px;
        margin-top: 8px;
    }

    .btn-browse {
        padding: 6px 16px;
        min-height: 44px;
        background: #3498db;
        border: none;
        border-radius: 4px;
        color: white;
        cursor: pointer;
        font-size: 13px;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;

        &:hover {
            background: #2980b9;
        }

        &:active {
            transform: scale(0.98);
        }

        &:focus {
            outline: 2px solid rgba(52, 152, 219, 0.5);
            outline-offset: 2px;
        }
    }

    .btn-new {
        padding: 6px 16px;
        min-height: 44px;
        background: #27ae60;
        border: none;
        border-radius: 4px;
        color: white;
        cursor: pointer;
        font-size: 13px;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;

        &:hover {
            background: #219a52;
        }

        &:active {
            transform: scale(0.98);
        }

        &:focus {
            outline: 2px solid rgba(39, 174, 96, 0.5);
            outline-offset: 2px;
        }
    }

    .flight-plan-loaded {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
    }

    .plan-name {
        font-weight: 500;
        color: #3498db;
        cursor: pointer;
        padding: 2px 6px;
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        border-radius: 4px;
        transition: background 0.2s;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;

        &:hover,
        &:active {
            background: rgba(255, 255, 255, 0.1);
        }

        &:focus {
            outline: 2px solid rgba(52, 152, 219, 0.5);
            outline-offset: 2px;
        }
    }

    .plan-name-input {
        flex: 1;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid #3498db;
        border-radius: 4px;
        color: #3498db;
        font-size: 14px;
        font-weight: 500;
        padding: 4px 8px;
        outline: none;
        min-width: 0;
    }

    .btn-clear {
        padding: 4px 8px;
        min-height: 44px;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        border-radius: 4px;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;

        &:hover {
            background: rgba(231, 76, 60, 0.3);
            color: #e74c3c;
        }

        &:active {
            transform: scale(0.98);
        }

        &:focus {
            outline: 2px solid rgba(231, 76, 60, 0.5);
            outline-offset: 2px;
        }
    }

    .loading {
        color: #3498db;
    }

    .error-message {
        margin-top: 10px;
        padding: 8px;
        background: rgba(231, 76, 60, 0.2);
        border-radius: 4px;
        color: #e74c3c;
        font-size: 12px;
    }
</style>
