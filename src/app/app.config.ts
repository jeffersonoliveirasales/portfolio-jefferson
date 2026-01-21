import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { HttpClient } from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { PublicTranslateLoader } from './shared/i18n/public-translate.loader';

import { routes } from './app.routes';

export function httpTranslateLoaderFactory(http: HttpClient): TranslateLoader {
  return new PublicTranslateLoader(http);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    importProvidersFrom(
      TranslateModule.forRoot({
        defaultLanguage: 'pt',
        loader: {
          provide: TranslateLoader,
          useFactory: httpTranslateLoaderFactory,
          deps: [HttpClient]
        }
      })
    )
  ]
};
