// Swagger JSDoc 타입 정의
declare module 'swagger-jsdoc' {
  interface SwaggerOptions {
    definition: {
      openapi: string;
      info: {
        title: string;
        version: string;
        description?: string;
        termsOfService?: string;
        contact?: {
          name?: string;
          url?: string;
          email?: string;
        };
        license?: {
          name: string;
          url?: string;
        };
      };
      servers?: Array<{
        url: string;
        description?: string;
        variables?: Record<string, any>;
      }>;
      components?: Record<string, any>;
      security?: Array<Record<string, string[]>>;
      tags?: Array<{
        name: string;
        description?: string;
        externalDocs?: {
          description: string;
          url: string;
        };
      }>;
      externalDocs?: {
        description?: string;
        url: string;
      };
    };
    apis: string | string[];
  }

  function swaggerJsdoc(options: SwaggerOptions): Record<string, any>;
  export = swaggerJsdoc;
}

// Swagger UI Express 타입 정의
declare module 'swagger-ui-express' {
  import { RequestHandler } from 'express';

  export const serve: RequestHandler[];
  export function setup(
    spec: Record<string, any>,
    options?: Record<string, any>,
    customCss?: string,
    customFavIcon?: string,
    swaggerUrl?: string,
    customSiteTitle?: string
  ): RequestHandler;
} 