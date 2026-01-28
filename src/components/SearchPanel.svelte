<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { AirportDBResult, AirportDBNavaid } from '../services/airportdbService';
    import { getAirportDisplayInfo, getNavaidDisplayInfo } from '../services/airportdbService';

    export let showSearchPanel: boolean = false;
    export let searchQuery: string = '';
    export let searchResults: { airports: AirportDBResult[]; navaids: AirportDBNavaid[] } = { airports: [], navaids: [] };
    export let isSearching: boolean = false;
    export let searchError: string | null = null;
    export let isUsingFallback: boolean = false;
    export let coverageDescription: string | null = null;

    const dispatch = createEventDispatcher<{
        toggle: void;
        search: void;
        addAirport: AirportDBResult;
        addNavaid: AirportDBNavaid;
        queryChange: string;
    }>();

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            dispatch('search');
        }
    }
</script>

<div class="search-section">
    <button
        class="btn-search-toggle"
        class:active={showSearchPanel}
        on:click={() => dispatch('toggle')}
        title="Search airports by ICAO code"
    >
        🔍 {showSearchPanel ? 'Hide Search' : 'Search Airports'}
    </button>

    {#if showSearchPanel}
        <div class="search-panel">
            <div class="search-input-row">
                <input
                    type="text"
                    class="search-input"
                    placeholder="Enter ICAO code (e.g., CYQB, KJFK)..."
                    bind:value={searchQuery}
                    on:input={() => dispatch('queryChange', searchQuery)}
                    on:keydown={handleKeydown}
                />
                <button
                    class="btn-search"
                    on:click={() => dispatch('search')}
                    disabled={isSearching}
                    title="Search by ICAO code"
                >
                    {isSearching ? '...' : '🔍'}
                </button>
            </div>
            {#if searchError}
                <div class="search-error">{searchError}</div>
            {/if}
            {#if searchResults.airports.length > 0 || searchResults.navaids.length > 0}
                <div class="search-results">
                    {#each searchResults.airports as airport}
                        {@const info = getAirportDisplayInfo(airport)}
                        <div class="search-result-item" on:click={() => dispatch('addAirport', airport)}>
                            <span class="result-icon">✈️</span>
                            <span class="result-id">{info.identifier}</span>
                            <span class="result-name">{info.name}</span>
                            <span class="result-type">{info.type}</span>
                            <button class="btn-add-result" title="Add to flight plan">+</button>
                        </div>
                    {/each}
                    {#each searchResults.navaids as navaid}
                        {@const info = getNavaidDisplayInfo(navaid)}
                        <div class="search-result-item" on:click={() => dispatch('addNavaid', navaid)}>
                            <span class="result-icon">📡</span>
                            <span class="result-id">{info.identifier}</span>
                            <span class="result-name">{info.name}</span>
                            <span class="result-type">{info.type}{info.frequency ? ` ${info.frequency}` : ''}</span>
                            <button class="btn-add-result" title="Add to flight plan">+</button>
                        </div>
                    {/each}
                </div>
            {/if}
            {#if isUsingFallback}
                <div class="search-hint fallback-indicator" title={coverageDescription || ''}>
                    Using offline airport data ({coverageDescription})
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    .search-section {
        margin: 10px;
    }

    .btn-search-toggle {
        width: 100%;
        padding: 10px 15px;
        min-height: 44px;
        background: rgba(52, 152, 219, 0.2);
        border: 1px solid rgba(52, 152, 219, 0.5);
        border-radius: 6px;
        color: rgba(255, 255, 255, 0.9);
        cursor: pointer;
        font-size: 13px;
        transition: all 0.15s ease;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;

        &:hover,
        &:active {
            background: rgba(52, 152, 219, 0.3);
        }

        &:focus {
            outline: 2px solid rgba(52, 152, 219, 0.5);
            outline-offset: 2px;
        }

        &:focus:not(:focus-visible) {
            outline: none;
        }

        &.active {
            background: rgba(52, 152, 219, 0.4);
            border-color: #3498db;
        }
    }

    .search-panel {
        margin-top: 10px;
        padding: 10px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 6px;
    }

    .search-input-row {
        display: flex;
        gap: 6px;
    }

    .search-input {
        flex: 1;
        padding: 8px 10px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        color: white;
        font-size: 13px;

        &::placeholder {
            color: rgba(255, 255, 255, 0.5);
        }

        &:focus {
            outline: none;
            border-color: #3498db;
        }
    }

    .btn-search {
        padding: 8px 12px;
        background: rgba(52, 152, 219, 0.3);
        border: 1px solid #3498db;
        border-radius: 4px;
        color: white;
        cursor: pointer;
        font-size: 14px;

        &:hover:not(:disabled) {
            background: rgba(52, 152, 219, 0.5);
        }

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    }

    .search-error {
        margin-top: 8px;
        padding: 6px 8px;
        background: rgba(231, 76, 60, 0.2);
        border-radius: 4px;
        color: #e74c3c;
        font-size: 11px;
    }

    .search-hint {
        margin-top: 8px;
        padding: 8px;
        background: rgba(52, 152, 219, 0.1);
        border-radius: 4px;
        color: rgba(255, 255, 255, 0.7);
        font-size: 11px;
        text-align: center;
    }

    .search-results {
        margin-top: 8px;
        max-height: 200px;
        overflow-y: auto;
        border-radius: 4px;
        background: rgba(0, 0, 0, 0.2);
    }

    .search-result-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        min-height: 44px;
        cursor: pointer;
        transition: background 0.15s;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;

        &:hover,
        &:active {
            background: rgba(52, 152, 219, 0.2);
        }

        &:focus {
            outline: 2px solid rgba(52, 152, 219, 0.5);
            outline-offset: -2px;
        }

        &:last-child {
            border-bottom: none;
        }
    }

    .result-icon {
        font-size: 14px;
        flex-shrink: 0;
    }

    .result-id {
        font-weight: 600;
        color: #3498db;
        font-size: 12px;
        min-width: 45px;
    }

    .result-name {
        flex: 1;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.8);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .result-type {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.5);
        flex-shrink: 0;
    }

    .btn-add-result {
        padding: 2px 8px;
        min-height: 44px;
        min-width: 44px;
        background: rgba(39, 174, 96, 0.3);
        border: 1px solid #27ae60;
        border-radius: 3px;
        color: white;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;

        &:hover,
        &:active {
            background: rgba(39, 174, 96, 0.5);
        }

        &:focus {
            outline: 2px solid rgba(39, 174, 96, 0.5);
            outline-offset: 2px;
        }
    }
</style>
