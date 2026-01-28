<script lang="ts">
    export let weatherError: string | null = null;
    export let weatherModelWarning: string | null = null;
</script>

{#if weatherError}
    <div class="weather-error">{weatherError}</div>
{/if}
{#if weatherModelWarning}
    <div class="weather-model-warning">{weatherModelWarning}</div>
{/if}

<style>
    .weather-error {
        background: rgba(255, 0, 0, 0.2);
        border: 1px solid rgba(255, 0, 0, 0.4);
        border-radius: 4px;
        padding: 8px 12px;
        margin-bottom: 8px;
        color: #ff6b6b;
        font-size: 12px;
    }

    .weather-model-warning {
        background: rgba(255, 165, 0, 0.15);
        border: 1px solid rgba(255, 165, 0, 0.3);
        border-radius: 4px;
        padding: 6px 10px;
        margin-bottom: 8px;
        color: #ffa500;
        font-size: 11px;
    }
</style>
