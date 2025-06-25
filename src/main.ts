import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {AppModule} from './app/app.module';

fetch('./assets/config/runtime-config.json')
  .then((response) => response.json())
  .then((config) => {
    // Make the config available globally
    (window as any)['runtimeConfig'] = config;

    // Bootstrap the app ONLY after the config is loaded
    platformBrowserDynamic()
      .bootstrapModule(AppModule)
      .catch((err) => console.error(err));
  })
  .catch((err) => {
    // Handle cases where the config file itself fails to load
    console.error('Could not load runtime configuration.', err);
  });

// REMOVE the second bootstrap call from here.