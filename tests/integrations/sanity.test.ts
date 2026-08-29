import { describe, it, expect } from 'vitest';
import 'dotenv/config'; // Load env vars
import { sanityClient } from '../../app/sanity.server';

describe('Sanity Client', () => {
  it('should be defined', () => {
    expect(sanityClient).toBeDefined();
  });
});
