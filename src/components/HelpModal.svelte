<!-- Help Modal Component -->
<div class="help-overlay" on:click|self={close}>
    <div class="help-modal">
        <div class="help-header">
            <h2>VFR Flight Planner Help</h2>
            <button class="btn-close" on:click={close} title="Close">✕</button>
        </div>

        <div class="help-tabs">
            {#each tabs as tab}
                <button
                    class="tab-btn"
                    class:active={activeTab === tab.id}
                    on:click={() => activeTab = tab.id}
                >
                    {tab.icon} {tab.label}
                </button>
            {/each}
        </div>

        <div class="help-content">
            {#if activeTab === 'start'}
                <section>
                    <h3>Getting Started</h3>

                    <h4>Import a Flight Plan</h4>
                    <p>Drag and drop a <strong>.fpl</strong> (ForeFlight/Garmin) or <strong>.gpx</strong> file onto the drop zone, or click "Browse" to select a file.</p>

                    <h4>Create a New Flight Plan</h4>
                    <p>Click "New Plan" to start with a blank flight plan, then use Edit mode to add waypoints.</p>

                    <h4>Add Waypoints</h4>
                    <ul>
                        <li><strong>Search:</strong> Use "Search Airports" to find airports by ICAO code (e.g., CYUL, KJFK, EGLL)</li>
                        <li><strong>Edit Mode:</strong> Click "Edit" then click on the map to add waypoints</li>
                        <li><strong>Insert:</strong> In Edit mode, click on a route segment to insert a waypoint between existing ones</li>
                    </ul>
                </section>

            {:else if activeTab === 'colors'}
                <section>
                    <h3>Waypoint Colors</h3>
                    <p>Marker colors on the map indicate waypoint type:</p>
                    <div class="color-list">
                        <div class="color-item">
                            <span class="color-swatch" style="background: #e74c3c"></span>
                            <span class="color-label"><strong>Red</strong> - Airport</span>
                        </div>
                        <div class="color-item">
                            <span class="color-swatch" style="background: #3498db"></span>
                            <span class="color-label"><strong>Blue</strong> - VOR (VHF Omnidirectional Range)</span>
                        </div>
                        <div class="color-item">
                            <span class="color-swatch" style="background: #9b59b6"></span>
                            <span class="color-label"><strong>Purple</strong> - NDB (Non-Directional Beacon)</span>
                        </div>
                        <div class="color-item">
                            <span class="color-swatch" style="background: #2ecc71"></span>
                            <span class="color-label"><strong>Green</strong> - INT / VRP (Intersection / Visual Reporting Point)</span>
                        </div>
                        <div class="color-item">
                            <span class="color-swatch" style="background: #f39c12"></span>
                            <span class="color-label"><strong>Orange</strong> - User Waypoint</span>
                        </div>
                    </div>

                    <h3>Route Segment Colors</h3>
                    <p>The lines between waypoints indicate VFR flight conditions:</p>
                    <div class="color-list">
                        <div class="color-item">
                            <span class="color-swatch" style="background: #4caf50"></span>
                            <span class="color-label"><strong>Green</strong> - Good VFR (visibility &gt; 9km, ceiling &gt; 3000ft AGL)</span>
                        </div>
                        <div class="color-item">
                            <span class="color-swatch" style="background: #ff9800"></span>
                            <span class="color-label"><strong>Orange</strong> - Marginal VFR (visibility 5-9km or ceiling 1000-3000ft)</span>
                        </div>
                        <div class="color-item">
                            <span class="color-swatch" style="background: #f44336"></span>
                            <span class="color-label"><strong>Red</strong> - Poor/IFR (visibility &lt; 5km or ceiling &lt; 1000ft)</span>
                        </div>
                        <div class="color-item">
                            <span class="color-swatch" style="background: #757575"></span>
                            <span class="color-label"><strong>Gray</strong> - Unknown (no weather data)</span>
                        </div>
                    </div>
                </section>

            {:else if activeTab === 'weather'}
                <section>
                    <h3>Weather Features</h3>

                    <h4>Read Weather</h4>
                    <p>Click <strong>"Read Wx"</strong> to fetch weather forecasts for all waypoints. Weather data includes:</p>
                    <ul>
                        <li>Wind direction and speed (at cruise altitude)</li>
                        <li>Surface wind and gusts (for departure/arrival)</li>
                        <li>Temperature</li>
                        <li>Cloud base height</li>
                        <li>Visibility</li>
                    </ul>

                    <h4>Forecast Time Adjustment</h4>
                    <p><strong>"Adjust forecast for flight time"</strong> checkbox:</p>
                    <ul>
                        <li><strong>Enabled (default):</strong> Weather at each waypoint is forecast for your estimated arrival time at that point</li>
                        <li><strong>Disabled:</strong> All waypoints show weather for departure time (snapshot mode)</li>
                    </ul>

                    <h4>Sync with Windy</h4>
                    <p>When enabled, the departure time follows Windy's timeline slider, allowing you to see forecasted conditions for future flights.</p>

                    <h4>Weather Alerts</h4>
                    <p>The plugin warns you about:</p>
                    <ul>
                        <li>High winds or gusts at departure/arrival airports</li>
                        <li>Low visibility along the route</li>
                        <li>Low cloud ceilings that may conflict with planned altitude</li>
                    </ul>
                </section>

            {:else if activeTab === 'profile'}
                <section>
                    <h3>Altitude Profile</h3>
                    <p>The Profile tab shows a vertical cross-section of your route:</p>

                    <h4>What's Displayed</h4>
                    <ul>
                        <li><strong>Brown area:</strong> Terrain elevation along your route</li>
                        <li><strong>Blue dashed line:</strong> Cloud base height (ceiling)</li>
                        <li><strong>Colored route line:</strong> Your flight path with VFR condition colors</li>
                        <li><strong>Wind barbs:</strong> Wind direction and speed at each waypoint</li>
                    </ul>

                    <h4>Adjusting the View</h4>
                    <ul>
                        <li><strong>Max Altitude:</strong> Adjust the vertical scale maximum</li>
                        <li><strong>Zoom:</strong> Change horizontal scale for longer routes</li>
                    </ul>

                    <h4>Interaction</h4>
                    <p>Click on a waypoint label in the profile to select it and center the map on that waypoint.</p>
                </section>

            {:else if activeTab === 'vfr'}
                <section>
                    <h3>VFR Window Search</h3>
                    <p>Find the best times to fly your route with acceptable VFR conditions.</p>

                    <h4>How to Use</h4>
                    <ol>
                        <li>Load your flight plan and click "Read Wx"</li>
                        <li>Click <strong>"Find VFR Windows"</strong></li>
                        <li>Select minimum acceptable conditions (Good, Marginal, or Poor)</li>
                        <li>The search scans all available forecast times</li>
                    </ol>

                    <h4>Results</h4>
                    <p>Each window shows:</p>
                    <ul>
                        <li>Start and end time of acceptable conditions</li>
                        <li>Duration of the window</li>
                        <li>Overall condition rating</li>
                    </ul>
                    <p>Click on a window to set it as your departure time.</p>
                </section>

            {:else if activeTab === 'edit'}
                <section>
                    <h3>Edit Mode</h3>
                    <p>Click the <strong>"Edit"</strong> button to enter edit mode.</p>

                    <h4>In Edit Mode</h4>
                    <ul>
                        <li><strong>Click on map:</strong> Add a new waypoint at the end of the route</li>
                        <li><strong>Click on route line:</strong> Insert a waypoint between existing ones</li>
                        <li><strong>Drag markers:</strong> Move waypoints to new positions</li>
                    </ul>

                    <h4>Waypoint Table Actions</h4>
                    <ul>
                        <li><strong>Click waypoint name:</strong> Edit the name</li>
                        <li><strong>Click altitude:</strong> Set cruise altitude for that leg</li>
                        <li><strong>↑↓ arrows:</strong> Reorder waypoints</li>
                        <li><strong>🗑️ button:</strong> Delete a waypoint</li>
                    </ul>

                    <h4>Exit Edit Mode</h4>
                    <p>Click "Done" or press <strong>Escape</strong> to exit edit mode.</p>
                </section>

            {:else if activeTab === 'settings'}
                <section>
                    <h3>Settings</h3>

                    <h4>VFR Condition Thresholds</h4>
                    <p>Choose how strictly to evaluate VFR conditions:</p>
                    <ul>
                        <li><strong>Standard VFR:</strong> Typical VFR minimums (ceiling &gt; 3000ft, visibility &gt; 9km)</li>
                        <li><strong>Conservative:</strong> Higher minimums for extra safety margin</li>
                        <li><strong>Custom:</strong> Define your own ceiling, visibility, wind, and clearance limits</li>
                    </ul>

                    <h4>Default Airspeed (TAS)</h4>
                    <p>True airspeed used for calculating estimated time enroute (ETE) and ground speed when wind data is available. Set this to your typical cruise TAS.</p>

                    <h4>Default Altitude</h4>
                    <p>Default cruise altitude for new waypoints when creating or importing a flight plan.</p>

                    <h4>Auto Terrain Elevation</h4>
                    <p>When enabled, automatically fetches terrain elevation for departure and arrival airports. Useful for accurate altitude profile display.</p>

                    <h4>Show Waypoint Labels</h4>
                    <p>Toggle permanent waypoint name labels on the map. When disabled, labels only appear on hover.</p>

                    <h4>Include Night Hours</h4>
                    <p>Controls whether VFR window search includes nighttime hours:</p>
                    <ul>
                        <li><strong>Enabled:</strong> Search all hours (24/7)</li>
                        <li><strong>Disabled:</strong> Limit to 30 min before sunrise to 30 min after sunset</li>
                    </ul>

                    <h4>Max VFR Windows</h4>
                    <p>Maximum number of VFR windows to find during a search. The search covers up to 10 days of forecast data.</p>

                    <h4>Terrain Sample Interval</h4>
                    <p>Distance between elevation samples along your route. Lower values give more terrain detail but take longer to load. Recommended: 1-3 NM.</p>

                    <h4>Profile Top Height</h4>
                    <p>Maximum altitude displayed on the altitude profile graph. Adjust based on your typical cruise altitude.</p>

                    <h4>AirportDB API Key</h4>
                    <p>Optional API key for enhanced airport data:</p>
                    <ul>
                        <li><strong>Without key:</strong> Offline data for large/medium airports in North America and Europe</li>
                        <li><strong>With key:</strong> Global coverage including small airports and navaids (VOR, NDB)</li>
                    </ul>
                    <p>Get a free API key at airportdb.io</p>
                </section>
            {/if}
        </div>

        <div class="help-footer">
            <span class="version">VFR Flight Planner v0.9.9</span>
        </div>
    </div>
</div>

<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher<{ close: void }>();

    const tabs = [
        { id: 'start', label: 'Getting Started', icon: '🚀' },
        { id: 'colors', label: 'Colors', icon: '🎨' },
        { id: 'weather', label: 'Weather', icon: '🌤️' },
        { id: 'profile', label: 'Profile', icon: '📊' },
        { id: 'vfr', label: 'VFR Windows', icon: '🕐' },
        { id: 'edit', label: 'Edit Mode', icon: '✏️' },
        { id: 'settings', label: 'Settings', icon: '⚙️' },
    ];

    let activeTab = 'start';

    function close() {
        dispatch('close');
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            close();
        }
    }
</script>

<svelte:window on:keydown={handleKeydown} />

<style lang="less">
    .help-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    }

    .help-modal {
        background: #1a1a2e;
        border-radius: 8px;
        width: 90%;
        max-width: 600px;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    }

    .help-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);

        h2 {
            margin: 0;
            font-size: 18px;
            color: #fff;
        }

        .btn-close {
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.7);
            font-size: 20px;
            cursor: pointer;
            padding: 5px 10px;
            border-radius: 4px;

            &:hover {
                background: rgba(255, 255, 255, 0.1);
                color: #fff;
            }
        }
    }

    .help-tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        padding: 10px 15px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(0, 0, 0, 0.2);

        .tab-btn {
            background: rgba(255, 255, 255, 0.05);
            border: none;
            color: rgba(255, 255, 255, 0.7);
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.15s ease;

            &:hover {
                background: rgba(255, 255, 255, 0.1);
                color: #fff;
            }

            &.active {
                background: rgba(74, 144, 226, 0.3);
                color: #fff;
            }
        }
    }

    .help-content {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        color: rgba(255, 255, 255, 0.9);

        section {
            h3 {
                margin: 0 0 15px 0;
                font-size: 16px;
                color: #4a90e2;
            }

            h4 {
                margin: 20px 0 10px 0;
                font-size: 14px;
                color: #fff;
            }

            p {
                margin: 0 0 10px 0;
                font-size: 13px;
                line-height: 1.5;
            }

            ul, ol {
                margin: 0 0 15px 0;
                padding-left: 20px;
                font-size: 13px;
                line-height: 1.6;

                li {
                    margin-bottom: 5px;
                }
            }
        }
    }

    .color-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin: 10px 0 20px 0;
    }

    .color-item {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .color-swatch {
        width: 24px;
        height: 24px;
        border-radius: 4px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        flex-shrink: 0;
    }

    .color-label {
        font-size: 13px;
    }

    .help-footer {
        padding: 10px 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        text-align: center;

        .version {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.4);
        }
    }

    // Mobile adjustments
    @media (max-width: 500px) {
        .help-modal {
            width: 95%;
            max-height: 85vh;
        }

        .help-tabs {
            .tab-btn {
                padding: 6px 8px;
                font-size: 11px;
            }
        }

        .help-content {
            padding: 15px;
        }
    }
</style>
