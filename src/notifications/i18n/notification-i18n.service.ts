import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Notification } from '../entities/notification.entity';

type NotificationDictionary = Record<
  string,
  {
    title: string;
    body: string;
  }
>;

@Injectable()
export class NotificationI18nService {
  private readonly dictionaries = new Map<string, NotificationDictionary>();

  translateNotification(
    notification: Notification,
    languageHeader?: string,
  ): { title: string; body: string } {
    const language = this.resolveLanguage(languageHeader);
    const dictionary = this.loadDictionary(language);
    const entry =
      dictionary[notification.messageKey ?? ''] ??
      this.loadDictionary('en')[notification.messageKey ?? ''];

    if (!entry) {
      return {
        title: notification.title,
        body: notification.body,
      };
    }

    return {
      title: this.interpolate(entry.title, notification.arguments),
      body: this.interpolate(entry.body, notification.arguments),
    };
  }

  private resolveLanguage(languageHeader?: string): string {
    const normalized = (languageHeader ?? 'en').toLowerCase();

    if (normalized.startsWith('ar')) {
      return 'ar';
    }

    return 'en';
  }

  private loadDictionary(language: string): NotificationDictionary {
    const cached = this.dictionaries.get(language);
    if (cached) {
      return cached;
    }

    const dictionaryPath = join(
      process.cwd(),
      'src',
      'notifications',
      'i18n',
      `${language}.json`,
    );

    const parsed = JSON.parse(readFileSync(dictionaryPath, 'utf8')) as NotificationDictionary;
    this.dictionaries.set(language, parsed);
    return parsed;
  }

  private interpolate(
    template: string,
    values: Record<string, unknown> | null,
  ): string {
    if (!values) {
      return template;
    }

    return template.replace(/\{([^}]+)\}/g, (_match, key: string) => {
      const value = values[key.trim()];
      return value === undefined || value === null ? '' : String(value);
    });
  }
}