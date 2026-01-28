<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    export let activeTab: 'route' | 'profile' | 'settings' | 'about' = 'route';
    export let hasFlightPlan: boolean = false;
    export let canShowProfile: boolean = false;

    const dispatch = createEventDispatcher<{ change: 'route' | 'profile' | 'settings' | 'about' }>();

    function handleTabClick(tab: 'route' | 'profile' | 'settings' | 'about') {
        dispatch('change', tab);
    }
</script>

{#if hasFlightPlan}
    <div class="tabs">
        <button
            class="tab"
            class:active={activeTab === 'route'}
            on:click={() => handleTabClick('route')}
        >Route</button>
        <button
            class="tab"
            class:active={activeTab === 'profile'}
            on:click={() => handleTabClick('profile')}
            disabled={!canShowProfile}
        >Profile</button>
        <button
            class="tab"
            class:active={activeTab === 'settings'}
            on:click={() => handleTabClick('settings')}
        >Settings</button>
        <button
            class="tab"
            class:active={activeTab === 'about'}
            on:click={() => handleTabClick('about')}
        >About</button>
    </div>
{/if}

<style>
    .tabs {
        display: flex;
        gap: 4px;
        margin-bottom: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 8px;
    }

    .tab {
        flex: 1;
        padding: 8px 12px;
        border: none;
        background: rgba(255, 255, 255, 0.05);
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.2s ease;
        font-size: 12px;
    }

    .tab:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.9);
    }

    .tab.active {
        background: rgba(255, 255, 255, 0.15);
        color: white;
    }

    .tab:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
</style>
