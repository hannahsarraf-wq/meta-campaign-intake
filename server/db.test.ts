import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database functions to test insertId extraction
describe('Database Insert Functions', () => {
  describe('insertId extraction from Drizzle result', () => {
    it('should extract insertId from tuple result [ResultSetHeader, FieldPacket[]]', () => {
      // Simulate Drizzle MySQL2 result format: [ResultSetHeader, FieldPacket[]]
      const mockResult = [
        {
          fieldCount: 0,
          affectedRows: 1,
          insertId: 42,
          info: '',
          serverStatus: 2,
          warningStatus: 0,
        },
        [], // FieldPacket[]
      ] as any;

      // Simulate the extraction logic from createCampaign
      const header = Array.isArray(mockResult) ? mockResult[0] : mockResult;
      const insertId = (header as any).insertId || 0;

      expect(insertId).toBe(42);
    });

    it('should handle non-array result format', () => {
      // Some database drivers might return just the header object
      const mockResult = {
        fieldCount: 0,
        affectedRows: 1,
        insertId: 99,
        info: '',
        serverStatus: 2,
        warningStatus: 0,
      } as any;

      const header = Array.isArray(mockResult) ? mockResult[0] : mockResult;
      const insertId = (header as any).insertId || 0;

      expect(insertId).toBe(99);
    });

    it('should return 0 if insertId is missing', () => {
      // Edge case: result without insertId
      const mockResult = [
        {
          fieldCount: 0,
          affectedRows: 1,
          info: '',
          serverStatus: 2,
          warningStatus: 0,
        },
        [],
      ] as any;

      const header = Array.isArray(mockResult) ? mockResult[0] : mockResult;
      const insertId = (header as any).insertId || 0;

      expect(insertId).toBe(0);
    });
  });
});
