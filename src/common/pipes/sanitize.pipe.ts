import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import * as sanitizeHtml from 'sanitize-html';

@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }
    if (Array.isArray(value)) {
      return value.map(item => this.transform(item, { type: 'custom' }));
    }
    if (value && typeof value === 'object') {
      return this.sanitizeObject(value);
    }
    return value;
  }

  private sanitizeString(value: string): string {
    return sanitizeHtml(value, {
      allowedTags: [], // Aucun tag HTML n'est autorisé
      allowedAttributes: {}, // Aucun attribut n'est autorisé
      disallowedTagsMode: 'recursiveEscape'
    });
  }

  private sanitizeObject(obj: any): any {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => this.transform(item, { type: 'custom' }));
      } else if (value && typeof value === 'object') {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
} 