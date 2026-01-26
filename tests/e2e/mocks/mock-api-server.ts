/**
 * Mock API server for E2E tests.
 * Runs an Express server that mimics the real API endpoints.
 * Works identically on both Chrome and Firefox.
 */

import type { Server } from 'node:http'
import express from 'express'
import { formDataToAnnotation } from './annotation-data'
import { getVocabulariesByNamespace } from './vocabulary-data'

export interface MockServerConfig {
  port?: number
  /** Custom handler for create annotation - return custom response */
  onCreateAnnotation?: (body: Record<string, unknown>) => unknown
  /** Simulate API error for specific endpoint */
  simulateError?: {
    endpoint: string
    statusCode: number
    message: string
  }
  /** Simulate slow response for specific endpoint */
  simulateDelay?: {
    endpoint: string
    delayMs: number
  }
}

// Store created annotations for verification across tests
let createdAnnotations: Array<Record<string, unknown>> = []

/**
 * Get all annotations created during the test
 */
export function getCreatedAnnotations(): Array<Record<string, unknown>> {
  return [...createdAnnotations]
}

/**
 * Clear created annotations (call before each test)
 */
export function clearCreatedAnnotations(): void {
  createdAnnotations = []
}

/**
 * Sleep helper for simulating delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Start the mock API server
 */
export async function startMockServer(config: MockServerConfig = {}): Promise<Server> {
  const app = express()
  app.use(express.json())

  // Enable CORS for all origins (extension makes cross-origin requests)
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    // Handle preflight requests
    if (_req.method === 'OPTIONS') {
      return res.sendStatus(200)
    }
    next()
  })

  // GET /vocabularies?namespace=...
  app.get('/vocabularies', async (req, res) => {
    // Check for simulated delay
    if (config.simulateDelay?.endpoint === '/vocabularies') {
      await sleep(config.simulateDelay.delayMs)
    }

    // Check for simulated error
    if (config.simulateError?.endpoint === '/vocabularies') {
      return res
        .status(config.simulateError.statusCode)
        .json({ message: config.simulateError.message })
    }

    const namespace = req.query.namespace as string
    const searchTerm = req.query.search as string | undefined

    if (!namespace) {
      return res.status(400).json({ message: 'namespace query parameter is required' })
    }

    const vocabs = getVocabulariesByNamespace(namespace, searchTerm)

    // Return 404 for empty results (matches real API behavior)
    if (vocabs.length === 0) {
      return res.status(404).json({ message: 'No vocabularies found' })
    }

    res.json(vocabs)
  })

  // POST /knowledge-base/annotation - Create annotation
  app.post('/knowledge-base/annotation', async (req, res) => {
    console.debug('[Mock API] POST /knowledge-base/annotation received')
    // Check for simulated delay
    if (config.simulateDelay?.endpoint === '/knowledge-base/annotation') {
      await sleep(config.simulateDelay.delayMs)
    }

    // Check for simulated error
    if (config.simulateError?.endpoint === '/knowledge-base/annotation') {
      return res
        .status(config.simulateError.statusCode)
        .json({ message: config.simulateError.message })
    }

    const body = req.body as Record<string, unknown>

    // Validate required fields
    if (!body.title) {
      return res.status(400).json({ message: 'title is required' })
    }
    if (!body.submitter) {
      return res.status(400).json({ message: 'submitter is required' })
    }

    // Create annotation with generated ID
    const annotation = {
      id: `mock-${Date.now()}`,
      uuid: `mock-uuid-${Date.now()}`,
      ...body,
      dc_date: new Date().toISOString(),
    }

    // Store for verification
    createdAnnotations.push(annotation)

    // Allow custom response handler
    if (config.onCreateAnnotation) {
      return res.status(201).json(config.onCreateAnnotation(body))
    }

    res.status(201).json(annotation)
  })

  // POST /knowledge-base/rda/_search - Search annotations
  app.post('/knowledge-base/rda/_search', async (req, res) => {
    console.debug(`[Mock API] POST /knowledge-base/rda/_search received (${createdAnnotations.length} annotations stored)`)
    if (createdAnnotations.length > 0) {
      const ann = createdAnnotations[0] as Record<string, unknown>
      console.debug('[Mock API] First annotation:', {
        hasAnnotationTarget: 'annotation_target' in ann,
        annotationTarget: (ann.annotation_target as Record<string, unknown> | undefined),
      })
    }
    // Check for simulated delay
    if (config.simulateDelay?.endpoint === '/knowledge-base/rda/_search') {
      await sleep(config.simulateDelay.delayMs)
    }

    // Check for simulated error
    if (config.simulateError?.endpoint === '/knowledge-base/rda/_search') {
      return res
        .status(config.simulateError.statusCode)
        .json({ message: config.simulateError.message })
    }

    // Build response from created annotations
    const annotations = createdAnnotations.map((ann) => {
      const fullAnnotation = formDataToAnnotation(ann)
      return {
        _index: 'rda',
        _id: ann.id || ann.uuid,
        _score: 1.0,
        _source: {
          ...fullAnnotation,
          uuid: ann.uuid || ann.id,
          title: ann.title,
          uri: ann.resource,
          dc_date: ann.dc_date,
          fragment: ann.selectedText,
          resource_source: 'Annotation' as const,
          submitter: ann.submitter,
        },
      }
    })

    res.json({
      took: 5,
      timed_out: false,
      _shards: {
        total: 1,
        successful: 1,
        skipped: 0,
        failed: 0,
      },
      hits: {
        total: {
          value: annotations.length,
          relation: 'eq',
        },
        max_score: annotations.length > 0 ? 1.0 : null,
        hits: annotations,
      },
    })
  })

  // POST /knowledge-base/metric - Installation metrics (always succeeds)
  app.post('/knowledge-base/metric', (_req, res) => {
    res.json({ success: true })
  })

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', annotations: createdAnnotations.length })
  })

  const port = config.port || 3001

  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.debug(`[Mock API] Server running on http://localhost:${port}`)
      resolve(server)
    })

    server.on('error', (err) => {
      console.error('[Mock API] Failed to start server:', err)
      reject(err)
    })
  })
}

/**
 * Stop the mock API server
 */
export function stopMockServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) {
        console.error('[Mock API] Error closing server:', err)
        reject(err)
      }
      else {
        console.debug('[Mock API] Server stopped')
        resolve()
      }
    })
  })
}

/**
 * Create a mock server with error simulation for a specific test
 */
export async function startMockServerWithError(
  endpoint: string,
  statusCode: number,
  message: string,
  port?: number,
): Promise<Server> {
  return startMockServer({
    port,
    simulateError: { endpoint, statusCode, message },
  })
}

/**
 * Create a mock server with delay simulation for testing timeouts
 */
export async function startMockServerWithDelay(
  endpoint: string,
  delayMs: number,
  port?: number,
): Promise<Server> {
  return startMockServer({
    port,
    simulateDelay: { endpoint, delayMs },
  })
}
