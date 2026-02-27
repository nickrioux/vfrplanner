import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
    name: 'windy-plugin-vfr-planner',
    version: '1.0.3',
    icon: '✈️',
    title: 'VFR Flight Planner',
    description: 'Your pre-flight weather window assistant. Scan ceilings, visibility, and winds across forecast models.',
    author: 'Nicolas',
    repository: 'https://github.com/nickrioux/vfrplanner',
    desktopUI: 'rhpane',
    mobileUI: 'fullscreen',
    desktopWidth: 400,
    routerPath: '/vfr-planner',
    private: false,
    addToContextmenu: true,
    listenToSingleclick: true,
};

export default config;
