export type ApiDocMethod = 'GET' | 'POST' | 'DELETE'
export type ApiDocCategory = 'image' | 'extension' | 'system'
export type ApiParamLocation = 'form-data' | 'query' | 'header' | 'body'

export interface ApiDocParam {
  name: string
  type: string
  location: ApiParamLocation
  required: boolean
  descriptionKey: string
}

export interface ApiDocEndpoint {
  id: string
  category: ApiDocCategory
  method: ApiDocMethod
  path: string
  titleKey: string
  descKey: string
  params: ApiDocParam[]
  requiresAuth: boolean
  curl: string
  responseExample: string
}

interface ApiDocsContext {
  baseUrl: string
  authHeader: string
}

function authFlag(authHeader: string) {
  return `-H 'Auth-Token: ${authHeader}'`
}

export function buildApiDocs(ctx: ApiDocsContext): ApiDocEndpoint[] {
  const { baseUrl, authHeader } = ctx
  const auth = authFlag(authHeader)

  return [
    {
      id: 'upload',
      category: 'image',
      method: 'POST',
      path: '/api/images/upload',
      titleKey: 'api.docs.upload.title',
      descKey: 'api.docs.upload.desc',
      requiresAuth: true,
      params: [
        {
          name: 'image',
          type: 'file',
          location: 'form-data',
          required: true,
          descriptionKey: 'api.params.upload.image'
        },
        {
          name: 'file',
          type: 'file',
          location: 'form-data',
          required: false,
          descriptionKey: 'api.params.upload.file'
        },
        {
          name: 'files',
          type: 'file',
          location: 'form-data',
          required: false,
          descriptionKey: 'api.params.upload.files'
        },
        {
          name: 'token',
          type: 'string',
          location: 'form-data',
          required: false,
          descriptionKey: 'api.params.upload.token'
        }
      ],
      curl: `curl -X POST "${baseUrl}/api/images/upload" \\
  ${auth} \\
  -F "image=@./demo.png"`,
      responseExample: `{
  "success": true,
  "items": [
    {
      "key": "images/2026/08/abc123.webp",
      "url": "https://pic.example.com/abc123.webp",
      "originalName": "demo.png",
      "contentType": "image/webp",
      "size": 12345,
      "uploadedAt": "2026-08-01T12:00:00.000Z",
      "markdown": "![demo.png](https://pic.example.com/abc123.webp)",
      "html": "<img src=\\"https://pic.example.com/abc123.webp\\" alt=\\"demo.png\\">"
    }
  ],
  "errors": []
}`
    },
    {
      id: 'list',
      category: 'image',
      method: 'GET',
      path: '/api/images',
      titleKey: 'api.docs.list.title',
      descKey: 'api.docs.list.desc',
      requiresAuth: true,
      params: [
        {
          name: 'limit',
          type: 'number',
          location: 'query',
          required: false,
          descriptionKey: 'api.params.list.limit'
        },
        {
          name: 'page',
          type: 'number',
          location: 'query',
          required: false,
          descriptionKey: 'api.params.list.page'
        },
        {
          name: 'backendId',
          type: 'string',
          location: 'query',
          required: false,
          descriptionKey: 'api.params.backendId'
        }
      ],
      curl: `curl "${baseUrl}/api/images?limit=20&page=1" \\
  ${auth}`,
      responseExample: `{
  "items": [
    {
      "key": "images/2026/08/abc123.webp",
      "url": "https://pic.example.com/abc123.webp",
      "originalName": "demo.png",
      "contentType": "image/webp",
      "size": 12345,
      "uploadedAt": "2026-08-01T12:00:00.000Z",
      "markdown": "![demo.png](https://pic.example.com/abc123.webp)",
      "html": "<img src=\\"https://pic.example.com/abc123.webp\\" alt=\\"demo.png\\">"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1
}`
    },
    {
      id: 'search',
      category: 'image',
      method: 'GET',
      path: '/api/images/search',
      titleKey: 'api.docs.search.title',
      descKey: 'api.docs.search.desc',
      requiresAuth: true,
      params: [
        {
          name: 'q',
          type: 'string',
          location: 'query',
          required: true,
          descriptionKey: 'api.params.search.q'
        },
        {
          name: 'limit',
          type: 'number',
          location: 'query',
          required: false,
          descriptionKey: 'api.params.list.limit'
        },
        {
          name: 'page',
          type: 'number',
          location: 'query',
          required: false,
          descriptionKey: 'api.params.list.page'
        },
        {
          name: 'backendId',
          type: 'string',
          location: 'query',
          required: false,
          descriptionKey: 'api.params.backendId'
        }
      ],
      curl: `curl "${baseUrl}/api/images/search?q=demo&limit=20&page=1" \\
  ${auth}`,
      responseExample: `{
  "items": [],
  "total": 0,
  "page": 1,
  "pageSize": 20,
  "totalPages": 0
}`
    },
    {
      id: 'delete',
      category: 'image',
      method: 'DELETE',
      path: '/api/images',
      titleKey: 'api.docs.delete.title',
      descKey: 'api.docs.delete.desc',
      requiresAuth: true,
      params: [
        {
          name: 'key',
          type: 'string',
          location: 'query',
          required: true,
          descriptionKey: 'api.params.delete.key'
        }
      ],
      curl: `curl -X DELETE "${baseUrl}/api/images?key=images/2026/08/xxxx.webp" \\
  ${auth}`,
      responseExample: `{
  "success": true
}`
    },
    {
      id: 'batchDelete',
      category: 'image',
      method: 'POST',
      path: '/api/images/batch-delete',
      titleKey: 'api.docs.batchDelete.title',
      descKey: 'api.docs.batchDelete.desc',
      requiresAuth: true,
      params: [
        {
          name: 'keys',
          type: 'string[]',
          location: 'body',
          required: true,
          descriptionKey: 'api.params.batchDelete.keys'
        }
      ],
      curl: `curl -X POST "${baseUrl}/api/images/batch-delete" \\
  ${auth} \\
  -H "Content-Type: application/json" \\
  -d '{"keys":["images/2026/08/a.webp","images/2026/08/b.webp"]}'`,
      responseExample: `{
  "success": true,
  "deleted": ["images/2026/08/a.webp"],
  "failed": []
}`
    },
    {
      id: 'twikoo',
      category: 'extension',
      method: 'POST',
      path: '/api/index.php',
      titleKey: 'api.docs.twikoo.title',
      descKey: 'api.docs.twikoo.desc',
      requiresAuth: false,
      params: [
        {
          name: 'image',
          type: 'file',
          location: 'form-data',
          required: true,
          descriptionKey: 'api.params.twikoo.image'
        },
        {
          name: 'token',
          type: 'string',
          location: 'form-data',
          required: true,
          descriptionKey: 'api.params.twikoo.token'
        }
      ],
      curl: `curl -X POST "${baseUrl}/api/index.php" \\
  -F "token=${authHeader}" \\
  -F "image=@./demo.png"`,
      responseExample: `{
  "result": "success",
  "code": 200,
  "url": "https://pic.example.com/abc123.webp"
}`
    },
    {
      id: 'config',
      category: 'system',
      method: 'GET',
      path: '/api/auth/config',
      titleKey: 'api.docs.config.title',
      descKey: 'api.docs.config.desc',
      requiresAuth: false,
      params: [],
      curl: `curl "${baseUrl}/api/auth/config"`,
      responseExample: `{
  "initialized": true,
  "allowRegistration": false,
  "legacyMode": false,
  "adminSecretConfigured": false,
  "apiUploadTokenConfigured": true
}`
    },
    {
      id: 'count',
      category: 'system',
      method: 'GET',
      path: '/api/images/count',
      titleKey: 'api.docs.count.title',
      descKey: 'api.docs.count.desc',
      requiresAuth: true,
      params: [
        {
          name: 'backendId',
          type: 'string',
          location: 'query',
          required: false,
          descriptionKey: 'api.params.backendId'
        }
      ],
      curl: `curl "${baseUrl}/api/images/count" \\
  ${auth}`,
      responseExample: `{
  "total": 42
}`
    }
  ]
}
