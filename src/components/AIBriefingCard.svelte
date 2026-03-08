<!--
    AIBriefingCard - Collapsible card for AI-generated briefings.
    Reused for VFR window briefing and route weather summary.
-->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    export let title: string = 'AI Briefing';
    export let content: string | null = null;
    export let isLoading: boolean = false;
    export let error: string | null = null;
    export let collapsed: boolean = false;

    const dispatch = createEventDispatcher<{
        generate: void;
        refresh: void;
    }>();

    function toggle() {
        collapsed = !collapsed;
    }
</script>

<div class="ai-card">
    <button class="ai-card-header" on:click={toggle}>
        <span class="ai-card-title">✨ {title}</span>
        <span class="ai-card-chevron" class:open={!collapsed}>{collapsed ? '▸' : '▾'}</span>
    </button>

    {#if !collapsed}
        <div class="ai-card-body">
            {#if isLoading}
                <div class="ai-loading">
                    <span class="ai-spinner"></span> Generating...
                </div>
            {:else if error}
                <div class="ai-error">{error}</div>
                <button class="ai-btn" on:click={() => dispatch('generate')}>Retry</button>
            {:else if content}
                <div class="ai-content">{content}</div>
                <button class="ai-btn ai-btn-subtle" on:click={() => dispatch('refresh')}>↻ Refresh</button>
            {:else}
                <button class="ai-btn" on:click={() => dispatch('generate')}>Generate Briefing</button>
            {/if}
        </div>
    {/if}
</div>

<style lang="less">
    .ai-card {
        margin: 8px 10px;
        border: 1px solid rgba(74, 144, 226, 0.3);
        border-radius: 6px;
        overflow: hidden;
        background: rgba(74, 144, 226, 0.05);
    }

    .ai-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 8px 10px;
        background: rgba(74, 144, 226, 0.1);
        border: none;
        color: rgba(255, 255, 255, 0.9);
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.15s ease;

        &:hover {
            background: rgba(74, 144, 226, 0.15);
        }
    }

    .ai-card-title {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .ai-card-chevron {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.5);
        transition: transform 0.15s ease;
    }

    .ai-card-body {
        padding: 10px;
    }

    .ai-loading {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
    }

    .ai-spinner {
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 2px solid rgba(74, 144, 226, 0.3);
        border-top-color: #4a90e2;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    .ai-content {
        font-size: 12px;
        line-height: 1.5;
        color: rgba(255, 255, 255, 0.85);
        white-space: pre-wrap;
    }

    .ai-error {
        font-size: 12px;
        color: #e74c3c;
        margin-bottom: 8px;
    }

    .ai-btn {
        margin-top: 8px;
        padding: 5px 12px;
        background: rgba(74, 144, 226, 0.2);
        border: 1px solid rgba(74, 144, 226, 0.4);
        border-radius: 4px;
        color: #4a90e2;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover {
            background: rgba(74, 144, 226, 0.3);
        }

        &.ai-btn-subtle {
            background: transparent;
            border: none;
            padding: 4px 8px;
            font-size: 10px;
            color: rgba(255, 255, 255, 0.4);

            &:hover {
                color: rgba(255, 255, 255, 0.7);
            }
        }
    }
</style>
