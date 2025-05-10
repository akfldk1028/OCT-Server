import swaggerJsdoc from 'swagger-jsdoc';

// Swagger 정의
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MCP 프록시 API 문서',
      version: '1.0.0',
      description: 'ModelContextProtocol(MCP) 프록시 서버 API 문서화',
      contact: {
        name: 'API 지원팀',
        email: 'support@example.com'
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: '개발 서버'
      },
      {
        url: 'http://localhost:6277',
        description: 'MCP 프록시 포트'
      }
    ],
    components: {
      schemas: {
        TransportType: {
          type: 'string',
          enum: ['stdio', 'sse', 'streamable-http'],
          description: '전송 레이어 유형'
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: '오류 메시지'
            },
            code: {
              type: 'number',
              description: '오류 코드'
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: '상태 메시지'
            }
          }
        }
      }
    },
  },
  apis: ['./src/routes/*.ts'], // 코드에서 jsDoc 주석을 찾을 경로
};

// Swagger 규격 생성
export const swaggerSpec = swaggerJsdoc(swaggerOptions); 