import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
    name: 'windy-plugin-vfr-planner',
    version: '0.9.3',
    icon: '✈️',
    title: 'VFR Flight Planner',
    description: 'VFR flight planning with ForeFlight import support',
    author: 'Nicolas',
    repository: 'https://github.com/nickrioux/vfrplanner',
    desktopUI: 'rhpane',
    mobileUI: 'fullscreen',
    desktopWidth: 400,
    routerPath: '/vfr-planner',
    private: true,
    addToContextmenu: true,
    listenToSingleclick: true,
};

export default config;
