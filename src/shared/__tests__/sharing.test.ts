import { describe, it, expect } from 'vitest';
import { serializePicks, deserializePicks } from '../sharing';

describe('Sharing Serializer', () => {
  describe('serializePicks', () => {
    it('should return empty string for empty picks', () => {
      expect(serializePicks({})).toBe('');
    });

    it('should serialize single pick correctly', () => {
      const picks = { '5': 'visited' } as const;
      expect(serializePicks(picks)).toBe('5:visited');
    });

    it('should serialize and sort multiple picks deterministically', () => {
      const picks = {
        '10': 'wantToGo',
        '2': 'visited',
        '25': 'visited',
      } as const;
      // Should sort ranks (alphabetically as object keys, i.e., "10", "2", "25", or sorted alphabetically in the output)
      // Object.entries(picks) will be [["10", "wantToGo"], ["2", "visited"], ["25", "visited"]]
      // Our function sorts them alphabetically: "10:wantToGo", "2:visited", "25:visited" -> "10:wantToGo,2:visited,25:visited"
      const result = serializePicks(picks);
      expect(result).toBe('10:wantToGo,25:visited,2:visited');
    });
  });

  describe('deserializePicks', () => {
    it('should return empty object for null, empty or undefined input', () => {
      expect(deserializePicks(null)).toEqual({});
      expect(deserializePicks('')).toEqual({});
    });

    it('should deserialize valid picks correctly', () => {
      const param = '5:visited,12:wantToGo';
      const expected = {
        '5': 'visited',
        '12': 'wantToGo',
      };
      expect(deserializePicks(param)).toEqual(expected);
    });

    it('should ignore invalid rank ranges (must be 1-100)', () => {
      const param = '0:visited,101:wantToGo,50:visited';
      const expected = {
        '50': 'visited',
      };
      expect(deserializePicks(param)).toEqual(expected);
    });

    it('should ignore non-numeric ranks', () => {
      const param = 'abc:visited,44:wantToGo';
      const expected = {
        '44': 'wantToGo',
      };
      expect(deserializePicks(param)).toEqual(expected);
    });

    it('should ignore unrecognized selection types', () => {
      const param = '10:liked,20:wantToGo';
      const expected = {
        '20': 'wantToGo',
      };
      expect(deserializePicks(param)).toEqual(expected);
    });

    it('should handle malformed segments gracefully', () => {
      const param = '15:visited:extra,30,wantToGo,45:visited';
      const expected = {
        '45': 'visited',
      };
      expect(deserializePicks(param)).toEqual(expected);
    });
  });
});
