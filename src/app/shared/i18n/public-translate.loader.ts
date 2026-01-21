import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { TranslateLoader, TranslationObject } from '@ngx-translate/core';

export class PublicTranslateLoader implements TranslateLoader {
  constructor(
    private readonly http: HttpClient,
    private readonly prefix: string = '/i18n/',
    private readonly suffix: string = '.json'
  ) {}

  getTranslation(lang: string): Observable<TranslationObject> {
    return this.http.get<TranslationObject>(`${this.prefix}${lang}${this.suffix}`);
  }
}
