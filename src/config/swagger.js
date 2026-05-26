import swaggerJsdoc from 'swagger-jsdoc';import env from './env.js';
export const swaggerSpec=swaggerJsdoc({definition:{openapi:'3.0.0',info:{title:'TeacherPoint API',version:'1.0.0'},servers:[{url:`${env.API_BASE_URL}${env.API_PREFIX}`}],components:{securitySchemes:{bearerAuth:{type:'http',scheme:'bearer',bearerFormat:'JWT'}}}},apis:['src/routes/*.js']});
