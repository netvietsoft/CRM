import { Injectable } from '@nestjs/common';
import { RenderedMessageContent } from './messaging.types';

@Injectable()
export class MessagingRendererService {
  private readonly variablePattern = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;

  render(content: string, variables: Record<string, unknown>): RenderedMessageContent {
    const renderedVariables = new Map<string, string>();
    const unresolvedVariables = new Set<string>();

    const renderedContent = content.replace(this.variablePattern, (_, variableName: string) => {
      const key = variableName.trim();

      if (!Object.prototype.hasOwnProperty.call(variables, key)) {
        unresolvedVariables.add(key);
        return '';
      }

      const value = variables[key];

      if (value === null || value === undefined) {
        unresolvedVariables.add(key);
        return '';
      }

      const stringValue = this.stringifyValue(value);
      renderedVariables.set(key, stringValue);
      return stringValue;
    });

    return {
      content: renderedContent,
      renderedVariables: Object.fromEntries(renderedVariables.entries()),
      unresolvedVariables: Array.from(unresolvedVariables),
    };
  }

  private stringifyValue(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
      return String(value);
    }

    return JSON.stringify(value);
  }
}
