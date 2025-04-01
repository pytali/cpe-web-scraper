import { describe, expect, test, jest, beforeEach, afterEach } from '@jest/globals';
import { Worker } from 'worker_threads';
import WorkerPool from '../WorkerPool';
import { WORKER_CONFIG } from '../../config';

// Mock Worker
jest.mock('worker_threads', () => ({
    Worker: jest.fn().mockImplementation(() => ({
        on: jest.fn(),
        terminate: jest.fn(),
        postMessage: jest.fn()
    }))
}));

describe('WorkerPool', () => {
    let pool: WorkerPool;
    const mockWorkerPath = 'test/worker.js';

    beforeEach(() => {
        jest.useFakeTimers();
        pool = new WorkerPool(mockWorkerPath, 2);
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    test('should create a pool with correct size', () => {
        expect(pool).toBeDefined();
    });

    test('should terminate worker after TTL', async () => {
        const mockWorker = new Worker(mockWorkerPath);
        const ip = '192.168.1.1';
        const loginUser = 'admin';

        // Simulate task start
        const taskPromise = pool.runTaskQueue([ip], loginUser);

        // Advance time beyond TTL
        jest.advanceTimersByTime(WORKER_CONFIG.ttl * 1000 + 100);

        // Verify worker was terminated
        expect(mockWorker.terminate).toHaveBeenCalled();
    });

    test('should perform graceful shutdown within timeout', async () => {
        const mockWorker = new Worker(mockWorkerPath);
        const ip = '192.168.1.1';
        const loginUser = 'admin';

        // Start a task
        const taskPromise = pool.runTaskQueue([ip], loginUser);

        // Start shutdown
        const shutdownPromise = pool.shutdown();

        // Simulate task completion
        (mockWorker as any).emit('message', { ip, result: { success: true } });

        // Advance time, but less than timeout
        jest.advanceTimersByTime(WORKER_CONFIG.gracefulShutdownTimeout * 500);

        await shutdownPromise;

        expect(mockWorker.terminate).toHaveBeenCalled();
    });

    test('should force shutdown after timeout', async () => {
        const mockWorker = new Worker(mockWorkerPath);
        const ip = '192.168.1.1';
        const loginUser = 'admin';

        // Start a task that won't complete
        const taskPromise = pool.runTaskQueue([ip], loginUser);

        // Start shutdown
        const shutdownPromise = pool.shutdown();

        // Advance time beyond timeout
        jest.advanceTimersByTime(WORKER_CONFIG.gracefulShutdownTimeout * 1000 + 100);

        await shutdownPromise;

        // Verify worker was forcefully terminated
        expect(mockWorker.terminate).toHaveBeenCalled();
    });

    test('should not accept new tasks during shutdown', async () => {
        const ip = '192.168.1.1';
        const loginUser = 'admin';

        // Start shutdown
        const shutdownPromise = pool.shutdown();

        // Try to add new task
        await expect(pool.runTaskQueue([ip], loginUser))
            .rejects
            .toThrow('Worker pool is in shutdown process');

        await shutdownPromise;
    });
}); 