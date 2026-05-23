//Dokumentasi Swagger khusus endpoint AI Express.
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const genericErrorResponse = {
  type: 'object',
  properties: {
    message: { type: 'string', example: 'Provider AI sedang tidak tersedia.' },
  },
};

const validationErrorResponse = {
  type: 'object',
  properties: {
    message: { type: 'string', example: 'Input review CV tidak valid.' },
    details: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string', example: 'cvText' },
          message: { type: 'string', example: 'String must contain at least 50 character(s)' },
        },
      },
    },
  },
};

const aiResultResponse = {
  type: 'object',
  properties: {
    message: { type: 'string', example: 'AI request berhasil dibuat.' },
    cached: { type: 'boolean', example: false },
    aiRequestId: { type: 'integer', example: 1 },
    result: {
      type: 'object',
      additionalProperties: true,
      example: {
        overallScore: 82,
        summary: 'Hasil AI ringkas dan terstruktur.',
      },
    },
  },
};

const idPathParam = (name, description) => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: { type: 'integer', minimum: 1 },
});

const unauthorizedResponses = {
  401: {
    description: 'JWT tidak valid atau tidak dikirim.',
    content: {
      'application/json': {
        schema: genericErrorResponse,
        example: { message: 'Token tidak ditemukan.' },
      },
    },
  },
  403: {
    description: 'Role user tidak memiliki akses.',
    content: {
      'application/json': {
        schema: genericErrorResponse,
        example: { message: 'Akses ditolak.' },
      },
    },
  },
};

const aiSwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: '19MJ AI API',
    version: '1.0.0',
    description: [
      'AI-only API documentation for 19MJ backend testing.',
      '',
      'All endpoints require Bearer JWT from the Express auth login endpoint.',
      'Login manually through the app or call POST /api/auth/login outside this Swagger page, then click Authorize and paste the token.',
      '',
      'Internal STT service docs are available at http://localhost:8001/docs when the FastAPI service is running.',
    ].join('\n'),
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local backend',
    },
  ],
  tags: [
    { name: 'AI Health', description: 'Health check endpoint untuk user terautentikasi.' },
    { name: 'AI CV Review', description: 'Review CV kandidat dengan output terstruktur.' },
    { name: 'AI Career Roadmap', description: 'Roadmap karier kandidat berdasarkan target role dan skill.' },
    { name: 'AI Interview', description: 'Sesi interview, upload media, transkripsi, dan evaluasi.' },
    { name: 'AI Screening', description: 'Screening question, answer, dan evaluasi kandidat untuk company.' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      GenericError: genericErrorResponse,
      ValidationError: validationErrorResponse,
      AiResultResponse: aiResultResponse,
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/api/ai/health': {
      get: {
        tags: ['AI Health'],
        summary: 'Health check AI umum.',
        responses: {
          200: {
            description: 'AI route aktif untuk user terautentikasi.',
            content: {
              'application/json': {
                example: {
                  status: 'ok',
                  user: { id: 1, role: 'candidate' },
                },
              },
            },
          },
          ...unauthorizedResponses,
        },
      },
    },
    '/api/ai/candidate/health': {
      get: {
        tags: ['AI Health'],
        summary: 'Health check AI untuk candidate.',
        responses: {
          200: {
            description: 'Candidate dapat mengakses endpoint AI.',
            content: { 'application/json': { example: { status: 'ok', scope: 'candidate' } } },
          },
          ...unauthorizedResponses,
        },
      },
    },
    '/api/ai/company/health': {
      get: {
        tags: ['AI Health'],
        summary: 'Health check AI untuk company.',
        responses: {
          200: {
            description: 'Company dapat mengakses endpoint AI.',
            content: { 'application/json': { example: { status: 'ok', scope: 'company' } } },
          },
          ...unauthorizedResponses,
        },
      },
    },
    '/api/ai/cv-review': {
      post: {
        tags: ['AI CV Review'],
        summary: 'Buat review CV kandidat.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['cvText'],
                properties: {
                  cvText: { type: 'string', minLength: 50 },
                  targetRole: { type: 'string', example: 'Backend Engineer' },
                },
              },
              example: {
                cvText: 'Saya adalah backend developer dengan pengalaman Node.js, PostgreSQL, JWT auth, REST API, dan deployment aplikasi.',
                targetRole: 'Backend Engineer',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Review CV berhasil dibuat.',
            content: { 'application/json': { schema: aiResultResponse } },
          },
          200: {
            description: 'Review CV diambil dari cache.',
            content: { 'application/json': { schema: aiResultResponse } },
          },
          400: {
            description: 'Input tidak valid.',
            content: { 'application/json': { schema: validationErrorResponse } },
          },
          422: {
            description: 'Output AI tidak valid.',
            content: { 'application/json': { schema: genericErrorResponse } },
          },
          503: {
            description: 'Provider AI tidak tersedia.',
            content: { 'application/json': { schema: genericErrorResponse } },
          },
          ...unauthorizedResponses,
        },
      },
    },
    '/api/ai/cv-review/latest': {
      get: {
        tags: ['AI CV Review'],
        summary: 'Ambil review CV terbaru kandidat.',
        responses: {
          200: {
            description: 'Review CV terbaru ditemukan.',
            content: { 'application/json': { example: { result: { overall_score: 82, result_json: {} } } } },
          },
          404: {
            description: 'Review CV belum tersedia.',
            content: { 'application/json': { example: { message: 'Review CV belum tersedia.' } } },
          },
          ...unauthorizedResponses,
        },
      },
    },
    '/api/ai/cv-review/{id}': {
      get: {
        tags: ['AI CV Review'],
        summary: 'Ambil review CV berdasarkan id.',
        parameters: [idPathParam('id', 'ID review CV.')],
        responses: {
          200: {
            description: 'Review CV ditemukan.',
            content: { 'application/json': { example: { result: { id: 1, result_json: {} } } } },
          },
          400: {
            description: 'ID tidak valid.',
            content: { 'application/json': { schema: genericErrorResponse } },
          },
          404: {
            description: 'Review CV tidak ditemukan.',
            content: { 'application/json': { schema: genericErrorResponse } },
          },
          ...unauthorizedResponses,
        },
      },
    },
    '/api/ai/career-roadmap': {
      post: {
        tags: ['AI Career Roadmap'],
        summary: 'Buat career roadmap kandidat.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['targetRole', 'currentSkills'],
                properties: {
                  targetRole: { type: 'string', example: 'Backend Engineer' },
                  currentSkills: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['JavaScript', 'Node.js', 'PostgreSQL'],
                  },
                  preferredTimelineWeeks: { type: 'integer', minimum: 1, maximum: 52, example: 8 },
                },
              },
              example: {
                targetRole: 'Backend Engineer',
                currentSkills: ['JavaScript', 'Node.js', 'PostgreSQL'],
                preferredTimelineWeeks: 8,
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Career roadmap berhasil dibuat.',
            content: { 'application/json': { schema: aiResultResponse } },
          },
          200: {
            description: 'Career roadmap diambil dari cache.',
            content: { 'application/json': { schema: aiResultResponse } },
          },
          400: {
            description: 'Input tidak valid.',
            content: { 'application/json': { schema: validationErrorResponse } },
          },
          503: {
            description: 'Provider AI tidak tersedia.',
            content: { 'application/json': { schema: genericErrorResponse } },
          },
          ...unauthorizedResponses,
        },
      },
    },
    '/api/ai/career-roadmap/latest': {
      get: {
        tags: ['AI Career Roadmap'],
        summary: 'Ambil career roadmap terbaru.',
        responses: {
          200: {
            description: 'Career roadmap terbaru ditemukan.',
            content: { 'application/json': { example: { result: { readiness_score: 70, result_json: {} } } } },
          },
          404: {
            description: 'Career roadmap belum tersedia.',
            content: { 'application/json': { schema: genericErrorResponse } },
          },
          ...unauthorizedResponses,
        },
      },
    },
    '/api/ai/career-roadmap/{id}': {
      get: {
        tags: ['AI Career Roadmap'],
        summary: 'Ambil career roadmap berdasarkan id.',
        parameters: [idPathParam('id', 'ID career roadmap.')],
        responses: {
          200: {
            description: 'Career roadmap ditemukan.',
            content: { 'application/json': { example: { result: { id: 1, result_json: {} } } } },
          },
          400: {
            description: 'ID tidak valid.',
            content: { 'application/json': { schema: genericErrorResponse } },
          },
          404: {
            description: 'Career roadmap tidak ditemukan.',
            content: { 'application/json': { schema: genericErrorResponse } },
          },
          ...unauthorizedResponses,
        },
      },
    },
    '/api/ai/interviews': {
      post: {
        tags: ['AI Interview'],
        summary: 'Buat sesi interview kandidat.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['questionText'],
                properties: {
                  questionText: { type: 'string', minLength: 10, maxLength: 2000 },
                  transcriptionLanguage: { type: 'string', enum: ['auto', 'id', 'en'], example: 'auto' },
                  transcriptionContext: {
                    type: 'string',
                    minLength: 2,
                    maxLength: 1000,
                    description: 'Konteks domain opsional untuk membantu STT tanpa hardcoded dictionary.',
                  },
                },
              },
              example: {
                questionText: 'Ceritakan pengalaman Anda membangun API yang aman dan mudah dirawat.',
                transcriptionLanguage: 'auto',
                transcriptionContext: 'Konteks jawaban kandidat untuk role yang sedang dilamar, jika tersedia.',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Sesi interview berhasil dibuat.',
            content: { 'application/json': { example: { message: 'Sesi interview berhasil dibuat.', result: { id: 1 } } } },
          },
          400: {
            description: 'Input tidak valid.',
            content: { 'application/json': { schema: validationErrorResponse } },
          },
          ...unauthorizedResponses,
        },
      },
    },
    '/api/ai/interviews/{id}/media': {
      post: {
        tags: ['AI Interview'],
        summary: 'Upload media interview.',
        parameters: [idPathParam('id', 'ID sesi interview.')],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['media'],
                properties: {
                  media: {
                    type: 'string',
                    format: 'binary',
                    description: 'File audio/video. Contoh MIME: audio/mpeg, audio/wav, audio/webm, video/mp4, video/webm.',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Media interview berhasil diupload.',
            content: { 'application/json': { example: { message: 'Media interview berhasil diupload.', result: { id: 1, status: 'media_uploaded' } } } },
          },
          400: {
            description: 'Upload tidak valid.',
            content: { 'application/json': { schema: genericErrorResponse } },
          },
          404: {
            description: 'Sesi interview tidak ditemukan.',
            content: { 'application/json': { schema: genericErrorResponse } },
          },
          ...unauthorizedResponses,
        },
      },
    },
    '/api/ai/interviews/{id}/transcribe': {
      post: {
        tags: ['AI Interview'],
        summary: 'Trigger transkripsi media interview.',
        parameters: [idPathParam('id', 'ID sesi interview.')],
        responses: {
          200: {
            description: 'Transkripsi berhasil diproses.',
            content: { 'application/json': { example: { message: 'Transkripsi interview berhasil diproses.', result: { transcript: { raw_transcript: '...' } } } } },
          },
          400: {
            description: 'Media belum diupload atau ID tidak valid.',
            content: { 'application/json': { schema: genericErrorResponse } },
          },
          503: {
            description: 'Service transkripsi tidak tersedia.',
            content: { 'application/json': { schema: genericErrorResponse } },
          },
          ...unauthorizedResponses,
        },
      },
    },
    '/api/ai/interviews/{id}/transcript': {
      patch: {
        tags: ['AI Interview'],
        summary: 'Update edited transcript interview.',
        parameters: [idPathParam('id', 'ID sesi interview.')],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['editedTranscript'],
                properties: {
                  editedTranscript: { type: 'string', minLength: 1 },
                },
              },
              example: {
                editedTranscript: 'Saya pernah membangun API dengan Express, PostgreSQL, JWT, validasi input, dan logging error.',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Transkrip berhasil diperbarui.',
            content: { 'application/json': { example: { message: 'Transkrip interview berhasil diperbarui.', result: { transcript: {} } } } },
          },
          400: {
            description: 'Transkrip belum tersedia atau input tidak valid.',
            content: { 'application/json': { schema: genericErrorResponse } },
          },
          ...unauthorizedResponses,
        },
      },
    },
    '/api/ai/interviews/{id}/evaluate': {
      post: {
        tags: ['AI Interview'],
        summary: 'Evaluasi transcript interview.',
        parameters: [idPathParam('id', 'ID sesi interview.')],
        responses: {
          201: {
            description: 'Evaluasi interview berhasil dibuat.',
            content: { 'application/json': { schema: aiResultResponse } },
          },
          200: {
            description: 'Evaluasi interview diambil dari cache.',
            content: { 'application/json': { schema: aiResultResponse } },
          },
          400: {
            description: 'Transkrip belum tersedia.',
            content: { 'application/json': { schema: genericErrorResponse } },
          },
          503: {
            description: 'Provider AI tidak tersedia.',
            content: { 'application/json': { schema: genericErrorResponse } },
          },
          ...unauthorizedResponses,
        },
      },
    },
    '/api/ai/interviews/{id}': {
      get: {
        tags: ['AI Interview'],
        summary: 'Ambil sesi interview dan transcript terbaru.',
        parameters: [idPathParam('id', 'ID sesi interview.')],
        responses: {
          200: {
            description: 'Sesi interview ditemukan.',
            content: { 'application/json': { example: { result: { id: 1, status: 'completed', transcript: {} } } } },
          },
          404: {
            description: 'Sesi interview tidak ditemukan.',
            content: { 'application/json': { schema: genericErrorResponse } },
          },
          ...unauthorizedResponses,
        },
      },
    },
    '/api/ai/screening/questions': {
      post: {
        tags: ['AI Screening'],
        summary: 'Buat pertanyaan screening company.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['questionText'],
                properties: {
                  jobId: { type: 'integer', example: 1 },
                  questionText: { type: 'string', minLength: 10, maxLength: 2000 },
                  rubric: { type: 'object', additionalProperties: true },
                },
              },
              example: {
                jobId: 1,
                questionText: 'Jelaskan cara Anda menangani bug production yang berdampak ke banyak user.',
                rubric: {
                  clarity: 'Jawaban jelas dan terstruktur',
                  ownership: 'Menunjukkan tanggung jawab teknis',
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Pertanyaan screening berhasil dibuat.',
            content: { 'application/json': { example: { message: 'Pertanyaan screening berhasil dibuat.', result: { id: 1 } } } },
          },
          400: {
            description: 'Input tidak valid.',
            content: { 'application/json': { schema: validationErrorResponse } },
          },
          ...unauthorizedResponses,
        },
      },
    },
    '/api/ai/screening/answers': {
      post: {
        tags: ['AI Screening'],
        summary: 'Simpan jawaban screening kandidat.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['screeningQuestionId', 'answerText'],
                properties: {
                  screeningQuestionId: { type: 'integer', minimum: 1, example: 1 },
                  answerText: { type: 'string', minLength: 1 },
                },
              },
              example: {
                screeningQuestionId: 1,
                answerText: 'Saya mulai dari mitigasi cepat, cek log dan metrik, komunikasikan dampak, lalu buat root cause analysis setelah service stabil.',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Jawaban screening berhasil disimpan.',
            content: { 'application/json': { example: { message: 'Jawaban screening berhasil disimpan.', result: { id: 1 } } } },
          },
          400: {
            description: 'Input tidak valid.',
            content: { 'application/json': { schema: validationErrorResponse } },
          },
          ...unauthorizedResponses,
        },
      },
    },
    '/api/ai/screening/evaluate': {
      post: {
        tags: ['AI Screening'],
        summary: 'Evaluasi jawaban screening kandidat.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['screeningAnswerId'],
                properties: {
                  screeningAnswerId: { type: 'integer', minimum: 1, example: 1 },
                  jobContext: { type: 'string' },
                },
              },
              example: {
                screeningAnswerId: 1,
                jobContext: 'Backend Engineer yang menangani API Node.js, PostgreSQL, debugging production, dan kolaborasi lintas tim.',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Evaluasi kandidat berhasil dibuat.',
            content: { 'application/json': { schema: aiResultResponse } },
          },
          200: {
            description: 'Evaluasi kandidat diambil dari cache.',
            content: { 'application/json': { schema: aiResultResponse } },
          },
          400: {
            description: 'Input tidak valid.',
            content: { 'application/json': { schema: validationErrorResponse } },
          },
          404: {
            description: 'Jawaban screening tidak ditemukan.',
            content: { 'application/json': { schema: genericErrorResponse } },
          },
          503: {
            description: 'Provider AI tidak tersedia.',
            content: { 'application/json': { schema: genericErrorResponse } },
          },
          ...unauthorizedResponses,
        },
      },
    },
    '/api/ai/screening/candidates/{candidateUserId}/evaluation': {
      get: {
        tags: ['AI Screening'],
        summary: 'Ambil evaluasi kandidat terbaru.',
        parameters: [
          idPathParam('candidateUserId', 'ID user kandidat.'),
          {
            name: 'jobId',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1 },
            description: 'Filter job id jika evaluasi memakai job context.',
          },
        ],
        responses: {
          200: {
            description: 'Evaluasi kandidat ditemukan.',
            content: { 'application/json': { example: { result: { fit_score: 80, result_json: {} } } } },
          },
          400: {
            description: 'ID kandidat atau job tidak valid.',
            content: { 'application/json': { schema: genericErrorResponse } },
          },
          404: {
            description: 'Evaluasi kandidat tidak ditemukan.',
            content: { 'application/json': { schema: genericErrorResponse } },
          },
          ...unauthorizedResponses,
        },
      },
    },
  },
};

const aiSwaggerSpec = swaggerJsdoc({
  definition: aiSwaggerDefinition,
  apis: [],
});

//Swagger aktif lokal dan harus eksplisit jika production.
const shouldEnableAiSwagger = () =>
  process.env.ENABLE_AI_SWAGGER !== 'false' &&
  (process.env.NODE_ENV !== 'production' || process.env.ENABLE_AI_SWAGGER === 'true');

//Mount Swagger AI pada Express app.
const mountAiSwaggerDocs = (app) => {
  if (!shouldEnableAiSwagger()) {
    return;
  }

  app.use('/api/ai/docs', swaggerUi.serve, swaggerUi.setup(aiSwaggerSpec, {
    explorer: true,
    customSiteTitle: '19MJ AI API Docs',
  }));
};

module.exports = {
  aiSwaggerDefinition,
  aiSwaggerSpec,
  mountAiSwaggerDocs,
  shouldEnableAiSwagger,
};
