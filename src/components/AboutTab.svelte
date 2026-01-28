<!--
    AboutTab Component
    Displays plugin information, disclaimer, credits, and support link
-->
<div class="about-section">
    <div class="about-header">
        <span class="about-icon">✈️</span>
        <h3>VFR Flight Planner</h3>
        <span class="about-version">v{version}</span>
    </div>

    <div class="about-description">
        <p><strong>Your pre-flight weather window assistant.</strong></p>
        <p>Designed by a pilot to automate the scan of ceilings, visibility, and winds across forecast models. Find your window, then verify your briefing.</p>
    </div>

    <div class="about-disclaimer">
        <h4>⚠️ Important Disclaimer</h4>
        <p>
            <strong>This tool is for flight planning purposes only and should NOT be used as a source of official weather information.</strong>
        </p>
        <p>
            Weather data displayed in this plugin is derived from meteorological models and may not reflect actual conditions. For official aviation weather information, always consult:
        </p>
        <ul>
            <li><strong>United States:</strong> FAA-approved sources such as <a href="https://aviationweather.gov" target="_blank" rel="noopener">aviationweather.gov</a> (Aviation Weather Center)</li>
            <li><strong>Canada:</strong> NAV CANADA official sources at <a href="https://flightplanning.navcanada.ca" target="_blank" rel="noopener">flightplanning.navcanada.ca</a></li>
        </ul>
        <p>
            Pilots are responsible for obtaining proper weather briefings from official sources before any flight. This plugin does not provide METARs, TAFs, NOTAMs, PIREPs, AIRMETs, SIGMETs, or other official aviation weather products.
        </p>
    </div>

    <div class="about-credits">
        <h4>Data Sources</h4>
        <ul>
            <li>Weather data: <a href="https://windy.com" target="_blank" rel="noopener">Windy.com</a></li>
            <li>Airport data: <a href="https://ourairports.com" target="_blank" rel="noopener">OurAirports</a> (offline) / <a href="https://airportdb.io" target="_blank" rel="noopener">AirportDB.io</a> (API)</li>
            <li>Elevation data: <a href="https://open-meteo.com" target="_blank" rel="noopener">Open-Meteo</a></li>
        </ul>
    </div>

    <div class="about-support">
        <h4>⛽ Support This Project</h4>
        <p>If you find this plugin useful, consider buying me a gallon of 100LL!</p>
        <a href="https://buymeacoffee.com/wingguideai" target="_blank" rel="noopener" class="coffee-link">
            Buy me a gallon of 100LL
        </a>
    </div>
</div>

<script lang="ts">
    export let version: string;
</script>

<style lang="less">
    .about-section {
        padding: 15px;
        overflow-y: auto;
    }

    .about-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 15px;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);

        .about-icon {
            font-size: 24px;
        }

        h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: white;
            flex: 1;
        }

        .about-version {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.5);
            background: rgba(255, 255, 255, 0.1);
            padding: 3px 8px;
            border-radius: 4px;
        }
    }

    .about-description {
        margin-bottom: 15px;

        p {
            margin: 0;
            font-size: 13px;
            color: rgba(255, 255, 255, 0.7);
            line-height: 1.5;
        }
    }

    .about-disclaimer {
        background: rgba(231, 76, 60, 0.15);
        border: 1px solid rgba(231, 76, 60, 0.3);
        border-radius: 6px;
        padding: 12px;
        margin-bottom: 15px;

        h4 {
            margin: 0 0 10px 0;
            font-size: 13px;
            font-weight: 600;
            color: #e74c3c;
        }

        p {
            margin: 0 0 10px 0;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.8);
            line-height: 1.5;

            &:last-child {
                margin-bottom: 0;
            }
        }

        ul {
            margin: 10px 0;
            padding-left: 20px;

            li {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.8);
                line-height: 1.6;
                margin-bottom: 5px;
            }
        }

        a {
            color: #3498db;
            text-decoration: none;

            &:hover,
            &:active {
                text-decoration: underline;
            }
        }
    }

    .about-credits {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 6px;
        padding: 12px;

        h4 {
            margin: 0 0 8px 0;
            font-size: 12px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.7);
        }

        ul {
            margin: 0;
            padding-left: 20px;

            li {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.6);
                line-height: 1.6;
            }
        }

        a {
            color: #3498db;
            text-decoration: none;

            &:hover,
            &:active {
                text-decoration: underline;
            }
        }
    }

    .about-support {
        margin-top: 15px;
        background: rgba(255, 200, 87, 0.1);
        border-radius: 6px;
        padding: 12px;
        text-align: center;

        h4 {
            margin: 0 0 8px 0;
            font-size: 13px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.85);
        }

        p {
            margin: 0 0 12px 0;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.6);
        }

        .coffee-link {
            display: inline-block;
            padding: 8px 16px;
            background: #ffdd00;
            color: #000;
            font-weight: 600;
            font-size: 13px;
            text-decoration: none;
            border-radius: 5px;
            transition: background 0.2s;

            &:hover,
            &:active {
                background: #e5c700;
                text-decoration: none;
            }
        }
    }
</style>
